/**
 * Repositório em memória usado só pelo Vitest (src/test/setup.ts troca
 * src/server/persistencia por este módulo). Segue o mesmo contrato do Firestore:
 * transações atômicas (gravações pendentes até o fim), isoladas (executadas uma por vez)
 * e sem transação aninhada.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import type { SancaoDocumento } from '@/rules/sancoes';
import { chaveDeBusca, type CampoDoRanking, type CriterioDeRanking, type RankingGuardado, type ResumoDePersonagem } from '@/rules/social';
import type { ConfiguracaoDeSistemas } from '@/rules/sistemas';
import { chaveDoNomeDaGuilda, type GuildaDocumento } from '@/rules/guilda';
import type { EntradaDoChefeSemanal } from '@/rules/chefeSemanal';
import type {
  ConteudoDocumento,
  ContextoTransacao,
  EntradaLogAdmin,
  ResumoConteudo,
  ResumoVersao,
  VersaoConteudo,
  PapelMestreDocumento,
  RegistroCombate,
  Repositorio,
} from '@/server/persistencia/tipos';

export * from '@/server/persistencia/tipos';

interface Estado {
  personagens: Map<string, CharacterDocument>;
  nomes: Map<string, { uid: string; nome: string }>;
  transacoes: TransactionDocument[];
  combates: Map<string, RegistroCombate>;
  revogacoes: Map<string, number>;
  papeisMestre: Map<string, PapelMestreDocumento>;
  logAdmin: EntradaLogAdmin[];
  conteudo: Map<string, ConteudoDocumento>;
  versoes: Map<string, VersaoConteudo[]>;
  sancoes: Map<string, SancaoDocumento>;
  configuracaoDeSistemas: ConfiguracaoDeSistemas | null;
  rankings: Map<string, RankingGuardado>;
  guildas: Map<string, GuildaDocumento>;
  nomesDeGuilda: Map<string, { guildaId: string; nome: string }>;
  chefeSemanal: Map<string, EntradaDoChefeSemanal>;
}

const estado: Estado = {
  personagens: new Map(),
  nomes: new Map(),
  transacoes: [],
  combates: new Map(),
  revogacoes: new Map(),
  papeisMestre: new Map(),
  logAdmin: [],
  conteudo: new Map(),
  versoes: new Map(),
  sancoes: new Map(),
  configuracaoDeSistemas: null,
  rankings: new Map(),
  guildas: new Map(),
  nomesDeGuilda: new Map(),
  chefeSemanal: new Map(),
};

function valorDoCampo(c: CharacterDocument, campo: CampoDoRanking): number {
  switch (campo) {
    case 'nivel':
      return c.nivel;
    case 'torreAndar':
      return c.torreAndar ?? 0;
    case 'vitoriasBatalha':
      return c.batalhaSangrentaVencidas?.length ?? 0;
    case 'vitoriasGuerreiro':
      return c.guerreiroVencidas?.length ?? 0;
  }
}

function resumoPublico(c: CharacterDocument, valor?: number): ResumoDePersonagem {
  return {
    nome: c.nome,
    avatarId: c.avatarId,
    classeId: c.classeId,
    racaId: c.racaId,
    nivel: c.nivel,
    xpAtual: c.xpAtual,
    ...(valor !== undefined ? { valor } : {}),
    ...(c.escondidoNoRanking ? { escondidoNoRanking: true } : {}),
    ...(c.escondidoNaBusca ? { escondidoNaBusca: true } : {}),
  };
}

function resumoDe(doc: ConteudoDocumento): ResumoConteudo {
  const { rascunho: _rascunho, ...resumo } = doc;
  return structuredClone(resumo);
}

function resumoDaVersao(v: VersaoConteudo): ResumoVersao {
  const { dados: _dados, ...resumo } = v;
  return structuredClone(resumo);
}

let falhaNaConfiguracao: (() => void) | null = null;
let falhaNoLogAdmin: ((entrada: EntradaLogAdmin) => void) | null = null;

let falhaAoGravar: ((operacao: string) => void) | null = null;
let fila: Promise<unknown> = Promise.resolve();
const transacaoAtiva = new AsyncLocalStorage<string>();

class ContextoMemoria implements ContextoTransacao {
  personagens = new Map<string, CharacterDocument>();
  nomes = new Map<string, { uid: string; nome: string }>();
  transacoes: TransactionDocument[] = [];
  combates = new Map<string, RegistroCombate>();
  guildas = new Map<string, GuildaDocumento | null>();
  nomesDeGuilda = new Map<string, { guildaId: string; nome: string } | null>();
  chefeSemanal = new Map<string, EntradaDoChefeSemanal>();

  async lerPersonagem(uid: string) {
    const valor = this.personagens.get(uid) ?? estado.personagens.get(uid);
    return valor ? structuredClone(valor) : null;
  }
  gravarPersonagem(personagem: CharacterDocument) {
    this.personagens.set(personagem.uid, structuredClone(personagem));
  }
  async lerDonoDoNome(chaveNome: string) {
    return (this.nomes.get(chaveNome) ?? estado.nomes.get(chaveNome))?.uid ?? null;
  }
  reservarNome(chaveNome: string, uid: string, nome: string) {
    this.nomes.set(chaveNome, { uid, nome });
  }
  registrarTransacao(transacao: TransactionDocument) {
    this.transacoes.push({ ...transacao });
  }
  async lerCombate(id: string) {
    const valor = this.combates.get(id) ?? estado.combates.get(id);
    return valor ? structuredClone(valor) : null;
  }
  gravarCombate(registro: RegistroCombate) {
    if (estado.combates.has(registro.id)) {
      throw Object.assign(new Error(`combates/${registro.id} já existe`), { code: 6 });
    }
    this.combates.set(registro.id, structuredClone(registro));
  }
  async lerGuilda(id: string) {
    const valor = this.guildas.has(id) ? this.guildas.get(id) : estado.guildas.get(id);
    return valor ? structuredClone(valor) : null;
  }
  gravarGuilda(guilda: GuildaDocumento) {
    this.guildas.set(guilda.id, structuredClone({ ...guilda, nomeBusca: chaveDoNomeDaGuilda(guilda.nome), quantidadeMembros: guilda.membros.length }));
  }
  apagarGuilda(id: string) {
    this.guildas.set(id, null);
  }
  async lerDonoDoNomeDeGuilda(chave: string) {
    return (this.nomesDeGuilda.has(chave) ? this.nomesDeGuilda.get(chave) : estado.nomesDeGuilda.get(chave))?.guildaId ?? null;
  }
  reservarNomeDeGuilda(chave: string, guildaId: string, nome: string) {
    this.nomesDeGuilda.set(chave, { guildaId, nome });
  }
  liberarNomeDeGuilda(chave: string) {
    this.nomesDeGuilda.set(chave, null);
  }
  async lerEntradaChefeSemanal(semana: string, guildaId: string) {
    const e = this.chefeSemanal.get(`${semana}/${guildaId}`) ?? estado.chefeSemanal.get(`${semana}/${guildaId}`);
    return e ? structuredClone(e) : null;
  }
  gravarEntradaChefeSemanal(entrada: EntradaDoChefeSemanal) {
    this.chefeSemanal.set(`${entrada.semana}/${entrada.guildaId}`, structuredClone(entrada));
  }
}

export const repositorio: Repositorio = {
  executarTransacao<T>(operacao: string, fn: (ctx: ContextoTransacao) => Promise<T>): Promise<T> {
    const externa = transacaoAtiva.getStore();
    if (externa) {
      return Promise.reject(
        new Error(`Transação "${operacao}" aberta dentro de "${externa}": use o contexto recebido.`)
      );
    }

    const execucao = fila.then(() =>
      transacaoAtiva.run(operacao, async () => {
        const ctx = new ContextoMemoria();
        const valor = await fn(ctx);
        // Ponto em que o Firestore faria o commit: uma falha aqui não aplica nada
        falhaAoGravar?.(operacao);
        for (const [uid, p] of ctx.personagens) estado.personagens.set(uid, p);
        for (const [chave, dono] of ctx.nomes) estado.nomes.set(chave, dono);
        for (const [id, c] of ctx.combates) estado.combates.set(id, c);
        for (const [id, g] of ctx.guildas) (g ? estado.guildas.set(id, g) : estado.guildas.delete(id));
        for (const [k, e] of ctx.chefeSemanal) estado.chefeSemanal.set(k, e);
        for (const [chave, n] of ctx.nomesDeGuilda) (n ? estado.nomesDeGuilda.set(chave, n) : estado.nomesDeGuilda.delete(chave));
        estado.transacoes.push(...ctx.transacoes);
        return valor;
      })
    );
    fila = execucao.catch(() => undefined);
    return execucao;
  },

  async lerPersonagem(uid: string) {
    const valor = estado.personagens.get(uid);
    return valor ? structuredClone(valor) : null;
  },

  async lerDonoDoNome(chaveNome: string) {
    return estado.nomes.get(chaveNome)?.uid ?? null;
  },

  async lerRevogacaoSessoes(uid: string) {
    return estado.revogacoes.get(uid) ?? null;
  },

  async gravarRevogacaoSessoes(uid: string, revogadoEmSegundos: number) {
    estado.revogacoes.set(uid, revogadoEmSegundos);
  },

  async lerPapelMestre(uid: string) {
    const valor = estado.papeisMestre.get(uid);
    return valor ? structuredClone(valor) : null;
  },

  async gravarPapelMestre(papel: PapelMestreDocumento) {
    estado.papeisMestre.set(papel.uid, structuredClone(papel));
  },

  async removerPapelMestre(uid: string) {
    estado.papeisMestre.delete(uid);
  },

  async listarPapeisMestre() {
    return [...estado.papeisMestre.values()].map((p) => structuredClone(p));
  },

  async registrarLogAdmin(entrada: EntradaLogAdmin) {
    falhaNoLogAdmin?.(entrada);
    if (estado.logAdmin.some((e) => e.id === entrada.id)) {
      throw Object.assign(new Error(`logAdmin/${entrada.id} já existe`), { code: 6 });
    }
    estado.logAdmin.push(structuredClone(entrada));
  },

  async listarLogAdmin(limite: number) {
    return estado.logAdmin
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (a.e.criadoEm < b.e.criadoEm ? 1 : a.e.criadoEm > b.e.criadoEm ? -1 : b.i - a.i))
      .slice(0, limite)
      .map(({ e }) => structuredClone(e));
  },

  async lerConteudo(chave: string) {
    const doc = estado.conteudo.get(chave);
    return doc ? structuredClone(doc) : null;
  },

  async listarConteudos(tipo) {
    return [...estado.conteudo.values()].filter((d) => d.tipo === tipo).map(resumoDe);
  },

  async criarConteudo(doc: ConteudoDocumento) {
    if (estado.conteudo.has(doc.chave)) return false;
    falhaAoGravar?.(`criarConteudo:${doc.chave}`);
    estado.conteudo.set(doc.chave, structuredClone(doc));
    return true;
  },

  async salvarRascunhoConteudo(chave, revisaoBase, alteracao) {
    const atual = estado.conteudo.get(chave);
    if (!atual) return 'inexistente';
    if (atual.revisao !== revisaoBase) return 'conflito';
    falhaAoGravar?.(`salvarRascunho:${chave}`);
    const novo: ConteudoDocumento = structuredClone({ ...atual, ...alteracao, revisao: atual.revisao + 1 });
    estado.conteudo.set(chave, novo);
    return structuredClone(novo);
  },

  async publicarVersaoConteudo(chave, condicao, versao) {
    const atual = estado.conteudo.get(chave);
    if (!atual) return 'inexistente';
    if (condicao.revisao !== undefined && atual.revisao !== condicao.revisao) return 'conflito';
    if (condicao.ultimaVersao !== undefined && atual.ultimaVersao !== condicao.ultimaVersao) return 'conflito';
    falhaAoGravar?.(`publicarConteudo:${chave}`);
    const numero = atual.ultimaVersao + 1;
    const nova: VersaoConteudo = structuredClone({ ...versao, versao: numero });
    const conteudo: ConteudoDocumento = { ...atual, versaoPublicada: numero, hashPublicado: nova.hash, ultimaVersao: numero };
    estado.versoes.set(chave, [...(estado.versoes.get(chave) ?? []), nova]);
    estado.conteudo.set(chave, conteudo);
    return { conteudo: structuredClone(conteudo), versao: structuredClone(nova) };
  },

  async listarVersoesConteudo(chave: string, limite: number) {
    return [...(estado.versoes.get(chave) ?? [])].sort((a, b) => b.versao - a.versao).slice(0, limite).map(resumoDaVersao);
  },

  async lerSancao(uid: string) {
    const doc = estado.sancoes.get(uid);
    return doc ? structuredClone(doc) : null;
  },

  async gravarSancao(doc: SancaoDocumento) {
    estado.sancoes.set(doc.uid, structuredClone(doc));
  },

  async listarTransacoes(uid: string, limite: number) {
    return estado.transacoes
      .filter((t) => t.uid === uid)
      .map((t) => ({ ...t }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limite);
  },

  async consultarTopo(campo: CampoDoRanking, limite: number) {
    return [...estado.personagens.values()]
      .map((c) => resumoPublico(c, valorDoCampo(c, campo)))
      .filter((r) => (r.valor ?? 0) > 0)
      .sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0))
      .slice(0, limite);
  },

  async buscarPorPrefixo(prefixo: string, limite: number) {
    return [...estado.personagens.values()]
      .filter((c) => chaveDeBusca(c.nome).startsWith(prefixo))
      .sort((a, b) => chaveDeBusca(a.nome).localeCompare(chaveDeBusca(b.nome)))
      .slice(0, limite)
      .map((c) => resumoPublico(c));
  },

  async lerRanking(criterio: CriterioDeRanking) {
    const r = estado.rankings.get(criterio);
    return r ? structuredClone(r) : null;
  },

  async gravarRanking(ranking: RankingGuardado) {
    estado.rankings.set(ranking.criterio, structuredClone(ranking));
  },

  async lerConfiguracaoDeSistemas() {
    falhaNaConfiguracao?.();
    return estado.configuracaoDeSistemas ? structuredClone(estado.configuracaoDeSistemas) : null;
  },

  async gravarConfiguracaoDeSistemas(config: ConfiguracaoDeSistemas) {
    estado.configuracaoDeSistemas = structuredClone(config);
  },

  async listarCombatesDoJogador(uid: string, limite: number) {
    return [...estado.combates.values()]
      .filter((c) => c.uid === uid)
      .map((c) => structuredClone(c))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, limite);
  },

  async excluirDadosDoJogador(uid: string, chaveNome: string | null) {
    estado.personagens.delete(uid);
    if (chaveNome && estado.nomes.get(chaveNome)?.uid === uid) estado.nomes.delete(chaveNome);
    estado.transacoes = estado.transacoes.filter((t) => t.uid !== uid);
    estado.sancoes.delete(uid);
    estado.revogacoes.delete(uid);
  },

  async lerGuilda(id: string) {
    const g = estado.guildas.get(id);
    return g ? structuredClone(g) : null;
  },

  async listarChefeSemanal(semana: string, limite: number) {
    return [...estado.chefeSemanal.values()].filter((e) => e.semana === semana).sort((a, b) => b.total - a.total).slice(0, limite).map((e) => structuredClone(e));
  },

  async contarGuildasAcimaNoChefeSemanal(semana: string, total: number) {
    return [...estado.chefeSemanal.values()].filter((e) => e.semana === semana && e.total > total).length;
  },

  async lerEntradaChefeSemanal(semana: string, guildaId: string) {
    const e = estado.chefeSemanal.get(`${semana}/${guildaId}`);
    return e ? structuredClone(e) : null;
  },

  async listarGuildas(limite: number) {
    return [...estado.guildas.values()].sort((a, b) => b.membros.length - a.membros.length).slice(0, limite).map((g) => structuredClone(g));
  },

  async buscarGuildasPorPrefixo(prefixo: string, limite: number) {
    return [...estado.guildas.values()]
      .filter((g) => g.nomeBusca.startsWith(prefixo))
      .sort((a, b) => a.nomeBusca.localeCompare(b.nomeBusca))
      .slice(0, limite)
      .map((g) => structuredClone(g));
  },

  async lerVersaoConteudo(chave: string, versao: number) {
    const v = estado.versoes.get(chave)?.find((x) => x.versao === versao);
    return v ? structuredClone(v) : null;
  },
};

/** Simula falha ao gravar no log administrativo: o hook recebe a entrada e, se lançar erro, ela não é gravada. */
export function setTestAdminLogFailHook(hook: ((entrada: EntradaLogAdmin) => void) | null): void {
  falhaNoLogAdmin = hook;
}

/** Limpa todos os dados entre testes. */
export function resetCharacterStore(): void {
  estado.personagens.clear();
  estado.nomes.clear();
  estado.transacoes.length = 0;
  estado.combates.clear();
  estado.revogacoes.clear();
  estado.papeisMestre.clear();
  estado.logAdmin.length = 0;
  estado.conteudo.clear();
  estado.versoes.clear();
  estado.sancoes.clear();
  estado.configuracaoDeSistemas = null;
  estado.rankings.clear();
  estado.guildas.clear();
  estado.nomesDeGuilda.clear();
  estado.chefeSemanal.clear();
  falhaNaConfiguracao = null;
  falhaNoLogAdmin = null;
  falhaAoGravar = null;
}

/** Transações de moeda gravadas para o uid, na ordem em que foram registradas. */
export function getTransactionsByUid(uid: string): TransactionDocument[] {
  return estado.transacoes.filter((t) => t.uid === uid);
}

/**
 * Simula falha no commit das próximas transações: o hook recebe o nome da operação
 * e, se lançar erro, a transação é descartada sem aplicar nenhuma gravação.
 */
export function setTestPersistenceFailHook(hook: ((operacao: string) => void) | null): void {
  falhaAoGravar = hook;
}

export function obterCombateRegistrado(id: string): RegistroCombate | undefined {
  return estado.combates.get(id);
}

/** Só para testes: faz a leitura da configuração de sistemas falhar (ou volta ao normal com null). */
export function setTestSystemsConfigFailHook(hook: (() => void) | null): void {
  falhaNaConfiguracao = hook;
}
