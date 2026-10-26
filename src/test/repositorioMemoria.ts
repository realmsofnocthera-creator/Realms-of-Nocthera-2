/**
 * Repositório em memória usado só pelo Vitest (src/test/setup.ts troca
 * src/server/persistencia por este módulo). Segue o mesmo contrato do Firestore:
 * transações atômicas (gravações pendentes até o fim), isoladas (executadas uma por vez)
 * e sem transação aninhada.
 */
import type { CanalDocumento } from '@/rules/chat';
import type { CampeonatoDoDia } from '@/rules/campeonato';
import type { EntradaDaArena, ModoDaArena, ReplayDaArena } from '@/rules/arena';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import { fecharExtrato, tratarDivergencias } from '@/server/extrato';
import { observarJogadores, type CadastrosDaRede } from '@/server/integridade';
import type { EntradaDeRevisao } from '@/rules/integridade';
import type { AnuncioDoMercado } from '@/rules/mercado';
import type { LeilaoDoDia } from '@/rules/leilao';
import type { SancaoDocumento } from '@/rules/sancoes';
import { chaveDeBusca, type CampoDoRanking, type CriterioDeRanking, type RankingGuardado, type ResumoDePersonagem } from '@/rules/social';
import type { ConfiguracaoDeSistemas } from '@/rules/sistemas';
import { chaveDoNomeDaGuilda, type GuildaDocumento } from '@/rules/guilda';
import type { EntradaDoChefeSemanal } from '@/rules/chefeSemanal';
import type { EntradaDoChefeMundial } from '@/rules/chefeMundial';
import type { MensagemGeral } from '@/rules/correio';
import type { PartyDocumento } from '@/rules/testeEquipe';
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
  partys: Map<string, PartyDocumento>;
  chefeMundial: Map<string, EntradaDoChefeMundial>;
  correioGeral: Map<string, MensagemGeral>;
  revisoes: Map<string, EntradaDeRevisao>;
  cadastrosDaRede: Map<string, CadastrosDaRede>;
  anuncios: Map<string, AnuncioDoMercado>;
  precosDoMercado: Map<string, number[]>;
  leiloes: Map<string, LeilaoDoDia>;
  arena: Map<string, EntradaDaArena>;
  replaysDaArena: Map<string, ReplayDaArena>;
  campeonatos: Map<string, CampeonatoDoDia>;
  canaisDoChat: Map<string, CanalDocumento>;
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
  partys: new Map(),
  chefeMundial: new Map(),
  correioGeral: new Map(),
  revisoes: new Map(),
  cadastrosDaRede: new Map(),
  anuncios: new Map(),
  precosDoMercado: new Map(),
  leiloes: new Map(),
  arena: new Map(),
  replaysDaArena: new Map(),
  campeonatos: new Map(),
  canaisDoChat: new Map(),
};

/** Arena: como arena/{semana}/jogadores (ou ocultos)/{uid}. */
const chaveDaArena = (semana: string, uid: string, oculto: boolean, modo: ModoDaArena = 'arena') => `${modo}/${semana}/${uid}${oculto ? '/oculto' : ''}`;
const doModo = (e: EntradaDaArena, modo: ModoDaArena) => (e.modo ?? 'arena') === modo;

/** Chefe Mundial: a entrada de quem está com limite silencioso fica à parte (como chefeMundial/{dia}/ocultos). */
const chaveMundial = (dia: string, uid: string, oculto: boolean) => `${dia}/${uid}${oculto ? '/oculto' : ''}`;

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
  /** Como cada personagem estava no banco antes desta transação (para fechar o extrato). */
  lidos = new Map<string, CharacterDocument | null>();
  nomes = new Map<string, { uid: string; nome: string }>();
  transacoes: TransactionDocument[] = [];
  combates = new Map<string, RegistroCombate>();
  guildas = new Map<string, GuildaDocumento | null>();
  nomesDeGuilda = new Map<string, { guildaId: string; nome: string } | null>();
  chefeSemanal = new Map<string, EntradaDoChefeSemanal>();
  partys = new Map<string, PartyDocumento | null>();
  chefeMundial = new Map<string, EntradaDoChefeMundial>();

  async lerPersonagem(uid: string) {
    if (!this.lidos.has(uid)) {
      const doBanco = estado.personagens.get(uid);
      this.lidos.set(uid, doBanco ? structuredClone(doBanco) : null);
    }
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
  async lerParty(id: string) {
    const v = this.partys.has(id) ? this.partys.get(id) : estado.partys.get(id);
    return v ? structuredClone(v) : null;
  }
  gravarParty(party: PartyDocumento) {
    this.partys.set(party.id, structuredClone(party));
  }
  apagarParty(id: string) {
    this.partys.set(id, null);
  }
  async lerEntradaChefeSemanal(semana: string, guildaId: string) {
    const e = this.chefeSemanal.get(`${semana}/${guildaId}`) ?? estado.chefeSemanal.get(`${semana}/${guildaId}`);
    return e ? structuredClone(e) : null;
  }
  gravarEntradaChefeSemanal(entrada: EntradaDoChefeSemanal) {
    this.chefeSemanal.set(`${entrada.semana}/${entrada.guildaId}`, structuredClone(entrada));
  }
  async lerEntradaChefeMundial(dia: string, uid: string, oculto = false) {
    const k = chaveMundial(dia, uid, oculto);
    const e = this.chefeMundial.get(k) ?? estado.chefeMundial.get(k);
    return e ? structuredClone(e) : null;
  }
  gravarEntradaChefeMundial(entrada: EntradaDoChefeMundial) {
    this.chefeMundial.set(chaveMundial(entrada.dia, entrada.uid, entrada.oculto === true), structuredClone(entrada));
  }
  async lerMensagemGeral(id: string) {
    const m = estado.correioGeral.get(id);
    return m ? structuredClone(m) : null;
  }
  cadastrosDaRede = new Map<string, CadastrosDaRede>();
  async lerCadastrosDaRede(marca: string) {
    const c = this.cadastrosDaRede.get(marca) ?? estado.cadastrosDaRede.get(marca);
    return c ? structuredClone(c) : null;
  }
  gravarCadastrosDaRede(c: CadastrosDaRede) {
    this.cadastrosDaRede.set(c.marca, structuredClone(c));
  }
  /** null = apagar. */
  anuncios = new Map<string, AnuncioDoMercado | null>();
  precos = new Map<string, number[]>();
  async lerAnuncioDoMercado(id: string) {
    if (this.anuncios.has(id)) return structuredClone(this.anuncios.get(id) ?? null);
    const a = estado.anuncios.get(id);
    return a ? structuredClone(a) : null;
  }
  gravarAnuncioDoMercado(a: AnuncioDoMercado) {
    this.anuncios.set(a.id, structuredClone(a));
  }
  apagarAnuncioDoMercado(id: string) {
    this.anuncios.set(id, null);
  }
  async lerPrecosDoMercado(chave: string) {
    return [...(this.precos.get(chave) ?? estado.precosDoMercado.get(chave) ?? [])];
  }
  gravarPrecosDoMercado(chave: string, precos: number[]) {
    this.precos.set(chave, [...precos]);
  }
  leiloes = new Map<string, LeilaoDoDia>();
  async lerLeilao(dia: string) {
    const l = this.leiloes.get(dia) ?? estado.leiloes.get(dia);
    return l ? structuredClone(l) : null;
  }
  gravarLeilao(l: LeilaoDoDia) {
    this.leiloes.set(l.dia, structuredClone(l));
  }
  arena = new Map<string, EntradaDaArena>();
  replaysDaArena = new Map<string, ReplayDaArena>();
  async lerEntradaDaArena(semana: string, uid: string, oculto = false, modo: ModoDaArena = 'arena') {
    const k = chaveDaArena(semana, uid, oculto, modo);
    const e = this.arena.get(k) ?? estado.arena.get(k);
    return e ? structuredClone(e) : null;
  }
  gravarEntradaDaArena(entrada: EntradaDaArena) {
    this.arena.set(chaveDaArena(entrada.semana, entrada.uid, entrada.oculto === true, entrada.modo ?? 'arena'), structuredClone(entrada));
  }
  gravarReplayDaArena(replay: ReplayDaArena) {
    this.replaysDaArena.set(replay.id, structuredClone(replay));
  }
  campeonatos = new Map<string, CampeonatoDoDia>();
  async lerCampeonato(dia: string) {
    const c = this.campeonatos.get(dia) ?? estado.campeonatos.get(dia);
    return c ? structuredClone(c) : null;
  }
  gravarCampeonato(c: CampeonatoDoDia) {
    this.campeonatos.set(c.dia, structuredClone(c));
  }
  canaisDoChat = new Map<string, CanalDocumento>();
  async lerCanalDoChat(id: string) {
    const c = this.canaisDoChat.get(id) ?? estado.canaisDoChat.get(id);
    return c ? structuredClone(c) : null;
  }
  gravarCanalDoChat(c: CanalDocumento) {
    this.canaisDoChat.set(c.id, structuredClone(c));
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
        const extrato = fecharExtrato(operacao, ctx.lidos, ctx.personagens, ctx.transacoes);
        tratarDivergencias(operacao, extrato.divergencias);
        const revisoes = observarJogadores(operacao, ctx.lidos, ctx.personagens, extrato.transacoes, extrato.divergencias);
        // Ponto em que o Firestore faria o commit: uma falha aqui não aplica nada
        falhaAoGravar?.(operacao);
        for (const [uid, p] of ctx.personagens) estado.personagens.set(uid, p);
        for (const [chave, dono] of ctx.nomes) estado.nomes.set(chave, dono);
        for (const [id, c] of ctx.combates) estado.combates.set(id, c);
        for (const [id, g] of ctx.guildas) (g ? estado.guildas.set(id, g) : estado.guildas.delete(id));
        for (const [k, e] of ctx.chefeSemanal) estado.chefeSemanal.set(k, e);
        for (const [k, e] of ctx.chefeMundial) estado.chefeMundial.set(k, e);
        for (const [id, pt] of ctx.partys) (pt ? estado.partys.set(id, pt) : estado.partys.delete(id));
        for (const [chave, n] of ctx.nomesDeGuilda) (n ? estado.nomesDeGuilda.set(chave, n) : estado.nomesDeGuilda.delete(chave));
        estado.transacoes.push(...extrato.transacoes);
        for (const r of revisoes) estado.revisoes.set(r.id, structuredClone(r));
        for (const [marca, c] of ctx.cadastrosDaRede) estado.cadastrosDaRede.set(marca, c);
        for (const [id, a] of ctx.anuncios) (a ? estado.anuncios.set(id, a) : estado.anuncios.delete(id));
        for (const [chave, p] of ctx.precos) estado.precosDoMercado.set(chave, p);
        for (const [dia, l] of ctx.leiloes) estado.leiloes.set(dia, l);
        for (const [k, e] of ctx.arena) estado.arena.set(k, e);
        for (const [id, r] of ctx.replaysDaArena) estado.replaysDaArena.set(id, r);
        for (const [dia, c] of ctx.campeonatos) estado.campeonatos.set(dia, c);
        for (const [id, c] of ctx.canaisDoChat) estado.canaisDoChat.set(id, c);
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

  async listarComLimiteSilencioso() {
    return [...estado.sancoes.values()].filter((d) => d.limiteSilencioso).map((d) => d.uid);
  },

  async gravarSancao(doc: SancaoDocumento) {
    estado.sancoes.set(doc.uid, structuredClone(doc));
  },

  async listarTransacoes(uid: string, limite: number) {
    return estado.transacoes
      .filter((t) => t.uid === uid)
      .map((t) => ({ ...t }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || (b.ordem ?? 0) - (a.ordem ?? 0))
      .slice(0, limite);
  },

  async consultarTopo(campo: CampoDoRanking, limite: number) {
    return [...estado.personagens.values()]
      .map((c) => ({ ...resumoPublico(c, valorDoCampo(c, campo)), uid: c.uid }))
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
    for (const [k, e] of estado.chefeMundial) if (e.uid === uid) estado.chefeMundial.delete(k);
    for (const [id, a] of estado.anuncios) if (a.vendedorUid === uid) estado.anuncios.delete(id);
    for (const [k, e] of estado.arena) if (e.uid === uid) estado.arena.delete(k);
    for (const id of estado.replaysDaArena.keys()) if (id.startsWith(`${uid}_`)) estado.replaysDaArena.delete(id);
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

  async listarChefeMundial(dia: string, limite: number) {
    return [...estado.chefeMundial.values()].filter((e) => e.dia === dia && !e.oculto).sort((a, b) => b.dano - a.dano).slice(0, limite).map((e) => structuredClone(e));
  },

  async contarAcimaNoChefeMundial(dia: string, dano: number) {
    return [...estado.chefeMundial.values()].filter((e) => e.dia === dia && !e.oculto && e.dano > dano).length;
  },

  async lerEntradaChefeMundial(dia: string, uid: string, oculto = false) {
    const e = estado.chefeMundial.get(chaveMundial(dia, uid, oculto));
    return e ? structuredClone(e) : null;
  },

  async listarMensagensGerais(desde: string, limite: number) {
    return [...estado.correioGeral.values()].filter((m) => m.criadaEm >= desde).sort((a, b) => b.criadaEm.localeCompare(a.criadaEm)).slice(0, limite).map((m) => structuredClone(m));
  },

  async gravarMensagemGeral(mensagem: MensagemGeral) {
    estado.correioGeral.set(mensagem.id, structuredClone(mensagem));
  },

  async listarRevisoesPendentes(limite: number) {
    return [...estado.revisoes.values()]
      .filter((r) => !r.revisada)
      .map((r) => structuredClone(r))
      .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))
      .slice(0, limite);
  },

  async listarAnunciosDoMercado() {
    return [...estado.anuncios.values()].map((a) => structuredClone(a));
  },

  async lerAnuncioDoMercado(id: string) {
    const a = estado.anuncios.get(id);
    return a ? structuredClone(a) : null;
  },

  async lerEntradaDaArena(semana: string, uid: string, oculto = false, modo: ModoDaArena = 'arena') {
    const e = estado.arena.get(chaveDaArena(semana, uid, oculto, modo));
    return e ? structuredClone(e) : null;
  },
  async listarArenaPerto(semana: string, pontos: number, acima: boolean, limite: number, modo: ModoDaArena = 'arena') {
    const daSemana = [...estado.arena.values()].filter((e) => e.semana === semana && !e.oculto && doModo(e, modo));
    const lista = acima ? daSemana.filter((e) => e.pontos >= pontos).sort((a, b) => a.pontos - b.pontos) : daSemana.filter((e) => e.pontos < pontos).sort((a, b) => b.pontos - a.pontos);
    return lista.slice(0, limite).map((e) => structuredClone(e));
  },
  async listarArenaTopo(semana: string, limite: number, modo: ModoDaArena = 'arena') {
    return [...estado.arena.values()].filter((e) => e.semana === semana && !e.oculto && doModo(e, modo)).sort((a, b) => b.pontos - a.pontos).slice(0, limite).map((e) => structuredClone(e));
  },
  async contarAcimaNaArena(semana: string, pontos: number, modo: ModoDaArena = 'arena') {
    return [...estado.arena.values()].filter((e) => e.semana === semana && !e.oculto && doModo(e, modo) && e.pontos > pontos).length;
  },
  async lerCanalDoChat(id: string) {
    const c = estado.canaisDoChat.get(id);
    return c ? structuredClone(c) : null;
  },
  async lerCampeonato(dia: string) {
    const c = estado.campeonatos.get(dia);
    return c ? structuredClone(c) : null;
  },
  async lerReplayDaArena(id: string) {
    const r = estado.replaysDaArena.get(id);
    return r ? structuredClone(r) : null;
  },
  async lerLeilao(dia: string) {
    const l = estado.leiloes.get(dia);
    return l ? structuredClone(l) : null;
  },

  async gravarRevisao(entrada: EntradaDeRevisao) {
    estado.revisoes.set(entrada.id, structuredClone(entrada));
  },

  async marcarRevisoes(ids: readonly string[], por: string, em: string) {
    let n = 0;
    for (const id of ids) {
      const r = estado.revisoes.get(id);
      if (!r) continue;
      estado.revisoes.set(id, { ...r, revisada: true, revisadaPor: por, revisadaEm: em });
      n++;
    }
    return n;
  },

  async listarPartys(limite: number) {
    return [...estado.partys.values()].sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)).slice(0, limite).map((p) => structuredClone(p));
  },
  async lerParty(id: string) {
    const v = estado.partys.get(id);
    return v ? structuredClone(v) : null;
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
  estado.partys.clear();
  estado.chefeMundial.clear();
  estado.correioGeral.clear();
  estado.revisoes.clear();
  estado.cadastrosDaRede.clear();
  estado.anuncios.clear();
  estado.precosDoMercado.clear();
  estado.leiloes.clear();
  estado.arena.clear();
  estado.replaysDaArena.clear();
  estado.campeonatos.clear();
  estado.canaisDoChat.clear();
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
