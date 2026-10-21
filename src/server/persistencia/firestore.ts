import { AsyncLocalStorage } from 'node:async_hooks';
import type { DocumentData, Firestore, Transaction } from 'firebase-admin/firestore';
import { AVATARES_DISPONIVEIS, getAvatarById } from '@/rules/avatars';
import { normalizarHabilidadesEquipadas, ZEROS_ATRIBUTOS } from '@/game';
import { lerArmasPersonagem } from '@/game/forja';
import { lerArmadurasPersonagem } from '@/game/armaduraForja';
import { EQUIPAMENTO_VAZIO, lerEquipamentoPersonagem } from '@/game/equipamento';
import { EmblemaItem, lerEmblemasPersonagem } from '@/game/emblemas';
import type { Attributes } from '@/rules/attributes';
import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import { descreverErro, registrarLog } from '@/server/log';
import { ehPapelMestre } from '@/rules/mestre';
import { ehTipoDeConteudo } from '@/rules/conteudo';
import type { ProgressoDaCampanha } from '@/game/campanha';
import { comprimirMapa, descomprimirMapa } from '@/rules/mapaComprimido';
import { configuracaoDoDocumento, type ConfiguracaoDeSistemas } from '@/rules/sistemas';
import { MAXIMO_DE_ADVERTENCIAS, sancaoDocumentoVazio, type Advertencia, type SancaoDocumento } from '@/rules/sancoes';
import {
  ConteudoDocumento,
  ContextoTransacao,
  EntradaLogAdmin,
  ErroPersistencia,
  PapelMestreDocumento,
  RegistroCombate,
  Repositorio,
  ResumoConteudo,
  ResumoVersao,
  VersaoConteudo,
} from './tipos';

const texto = (v: unknown) => (typeof v === 'string' ? v : '');
/** Áreas de monstros descansando: só chaves de texto com tempo numérico; vazio vira "sem descansos". */
function descansosDoDocumento(bruto: unknown): Record<string, number> | undefined {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return undefined;
  const entradas = Object.entries(bruto as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1])).slice(0, 200);
  return entradas.length ? Object.fromEntries(entradas) : undefined;
}
/** O progresso da Campanha lido do banco, com tolerância: dado estranho vira "sem progresso" (volta ao início). */
function campanhaDoDocumento(bruto: unknown): { campanha?: ProgressoDaCampanha } {
  if (typeof bruto !== 'object' || bruto === null) return {};
  const c = bruto as Record<string, unknown>;
  if (typeof c.mapaId !== 'string' || !Number.isInteger(c.x) || !Number.isInteger(c.y)) return {};
  return {
    campanha: {
      mapaId: c.mapaId,
      x: c.x as number,
      y: c.y as number,
      baus: Array.isArray(c.baus) ? (c.baus as unknown[]).filter((b): b is string => typeof b === 'string').slice(0, 1000) : [],
      ...(descansosDoDocumento(c.descansos) ? { descansos: descansosDoDocumento(c.descansos) } : {}),
      ...(Array.isArray(c.cenas) ? { cenas: (c.cenas as unknown[]).filter((b): b is string => typeof b === 'string').slice(0, 500) } : {}),
      atualizadoEm: typeof c.atualizadoEm === 'string' ? c.atualizadoEm : '',
    },
  };
}

function sancaoDoDocumento(uid: string, data: DocumentData | undefined): SancaoDocumento | null {
  if (!data) return null;
  const base = sancaoDocumentoVazio(uid);
  const advertencias: Advertencia[] = Array.isArray(data.advertencias)
    ? data.advertencias
        .filter((a: unknown): a is Record<string, unknown> => typeof a === 'object' && a !== null)
        .map((a) => ({ em: texto(a.em), por: texto(a.por), motivo: texto(a.motivo) }))
        .slice(-MAXIMO_DE_ADVERTENCIAS)
    : [];
  return {
    ...base,
    tipo: data.tipo === 'suspensao' || data.tipo === 'banimento' ? data.tipo : null,
    ate: typeof data.ate === 'string' ? data.ate : null,
    motivo: texto(data.motivo),
    aplicadaPor: texto(data.aplicadaPor),
    aplicadaEm: texto(data.aplicadaEm),
    advertencias,
  };
}

const inteiroOuNulo = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : null);

const CAMPOS_DO_RESUMO = ['tipo', 'id', 'nome', 'revisao', 'hashRascunho', 'editadoEm', 'editadoPor', 'criadoEm', 'criadoPor', 'versaoPublicada', 'hashPublicado', 'ultimaVersao'];
const CAMPOS_DA_VERSAO = ['versao', 'hash', 'publicadoEm', 'publicadoPor', 'motivo', 'origem', 'revertidaDe'];

function resumoConteudoDoDocumento(chave: string, data: DocumentData | undefined): ResumoConteudo | null {
  if (!data || !ehTipoDeConteudo(data.tipo) || typeof data.id !== 'string') return null;
  return {
    chave,
    tipo: data.tipo,
    id: data.id,
    nome: texto(data.nome),
    revisao: inteiroOuNulo(data.revisao) ?? 0,
    hashRascunho: texto(data.hashRascunho),
    editadoEm: texto(data.editadoEm),
    editadoPor: texto(data.editadoPor),
    criadoEm: texto(data.criadoEm),
    criadoPor: texto(data.criadoPor),
    versaoPublicada: inteiroOuNulo(data.versaoPublicada),
    hashPublicado: typeof data.hashPublicado === 'string' ? data.hashPublicado : null,
    ultimaVersao: inteiroOuNulo(data.ultimaVersao) ?? 0,
  };
}

/** Mapas grandes são guardados comprimidos (ver rules/mapaComprimido): descomprime ao ler e comprime ao gravar. */
function dadosDoTipo(tipo: string, dados: unknown): unknown {
  return tipo === 'mapa' ? descomprimirMapa(dados) : dados;
}
function dadosParaGravar(tipo: string, dados: unknown): unknown {
  return tipo === 'mapa' ? comprimirMapa(dados) : dados;
}

function conteudoDoDocumento(chave: string, data: DocumentData | undefined): ConteudoDocumento | null {
  const resumo = resumoConteudoDoDocumento(chave, data);
  return resumo ? { ...resumo, rascunho: dadosDoTipo(resumo.tipo, data?.rascunho ?? null) } : null;
}

function resumoVersaoDoDocumento(data: DocumentData | undefined): ResumoVersao | null {
  const versao = inteiroOuNulo(data?.versao);
  if (!data || versao === null) return null;
  return {
    versao,
    hash: texto(data.hash),
    publicadoEm: texto(data.publicadoEm),
    publicadoPor: texto(data.publicadoPor),
    motivo: texto(data.motivo),
    origem: data.origem === 'reversao' ? 'reversao' : 'publicacao',
    revertidaDe: inteiroOuNulo(data.revertidaDe),
  };
}

function versaoDoDocumento(data: DocumentData | undefined, tipo: string): VersaoConteudo | null {
  const resumo = resumoVersaoDoDocumento(data);
  return resumo ? { ...resumo, dados: dadosDoTipo(tipo, data?.dados ?? null) } : null;
}

function documentoDoConteudo(doc: ConteudoDocumento): DocumentData {
  const { chave: _chave, ...dados } = doc;
  return { ...dados, rascunho: dadosParaGravar(doc.tipo, doc.rascunho) };
}

function papelMestreDoDocumento(uid: string, data: DocumentData | undefined): PapelMestreDocumento | null {
  if (!data || !ehPapelMestre(data.papel)) return null;
  return {
    uid,
    papel: data.papel,
    concedidoPor: typeof data.concedidoPor === 'string' ? data.concedidoPor : '',
    concedidoEm: typeof data.concedidoEm === 'string' ? data.concedidoEm : '',
    motivo: typeof data.motivo === 'string' ? data.motivo : '',
  };
}

function entradaLogDoDocumento(id: string, data: DocumentData): EntradaLogAdmin | null {
  if (!ehPapelMestre(data.papel) || typeof data.acao !== 'string' || typeof data.uid !== 'string') return null;
  return {
    id,
    criadoEm: typeof data.criadoEm === 'string' ? data.criadoEm : '',
    uid: data.uid,
    email: typeof data.email === 'string' ? data.email : '',
    papel: data.papel,
    acao: data.acao,
    ...(typeof data.alvo === 'string' ? { alvo: data.alvo } : {}),
    ...(data.antes !== undefined ? { antes: data.antes } : {}),
    ...(data.depois !== undefined ? { depois: data.depois } : {}),
    ...(typeof data.motivo === 'string' ? { motivo: data.motivo } : {}),
    ...(typeof data.ip === 'string' ? { ip: data.ip } : {}),
  };
}

const TIMEOUT_TRANSACAO_MS = 10_000;
const TIMEOUT_LEITURA_MS = 5_000;
const TENTATIVAS_LEITURA = 3;

// Códigos gRPC transitórios: DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, ABORTED, INTERNAL, UNAVAILABLE
const CODIGOS_TRANSITORIOS = new Set(['4', '8', '10', '13', '14']);

class ErroTimeout extends Error {
  readonly code = 'TIMEOUT';
}

function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promessa,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new ErroTimeout(`Timeout de ${ms}ms no Firestore`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lerAtributos(origem: Record<string, unknown> | undefined, padrao: Attributes): Attributes {
  return {
    vigor: Number(origem?.vigor ?? padrao.vigor),
    // Documentos salvos antes da troca Mente → Sorte ainda guardam o valor em "mente"
    sorte: Number(origem?.sorte ?? origem?.mente ?? padrao.sorte),
    forca: Number(origem?.forca ?? padrao.forca),
    vitalidade: Number(origem?.vitalidade ?? padrao.vitalidade),
    arcano: Number(origem?.arcano ?? padrao.arcano),
    inteligencia: Number(origem?.inteligencia ?? padrao.inteligencia),
    agilidade: Number(origem?.agilidade ?? padrao.agilidade),
  };
}

const ATRIBUTOS_PADRAO_LEGADO: Attributes = {
  vigor: 2,
  sorte: 2,
  forca: 0,
  vitalidade: 0,
  arcano: 0,
  inteligencia: 0,
  agilidade: 0,
};

/** Converte o documento characters/{uid} do Firestore no formato usado pelo servidor. */
/** Os emblemas do documento (descarta o que é inválido); sem emblemas, não devolve os campos. */
function emblemasDoDocumento(data: Record<string, unknown>): { emblemasItens?: EmblemaItem[]; emblemasEquipados?: string[] } {
  const { itens, equipados } = lerEmblemasPersonagem(data.emblemasItens, data.emblemasEquipados);
  return {
    ...(itens.length > 0 ? { emblemasItens: itens } : {}),
    ...(equipados.length > 0 ? { emblemasEquipados: equipados } : {}),
  };
}

export function personagemDoFirestore(uid: string, data: DocumentData): CharacterDocument {
  const classeIdResolvido =
    typeof data.classeId === 'string' && data.classeId ? data.classeId : 'barbaro';
  const avatarExistente =
    typeof data.avatarId === 'string' && getAvatarById(data.avatarId)
      ? data.avatarId
      : (getAvatarById(classeIdResolvido)?.id ?? AVATARES_DISPONIVEIS[0].id);

  const armas = lerArmasPersonagem(data.armas);
  const armaduras = lerArmadurasPersonagem(data.armaduras);

  return {
    uid: data.uid || uid,
    nome: data.nome || '',
    avatarId: avatarExistente,
    sobre: typeof data.sobre === 'string' ? data.sobre : '',
    racaId: typeof data.racaId === 'string' && data.racaId ? data.racaId : 'humano',
    classeId: classeIdResolvido,
    ...(typeof data.linhagem === 'string' && data.linhagem ? { linhagem: data.linhagem } : {}),
    nivel: Number(data.nivel || 1),
    xpAtual: Number(data.xpAtual || 0),
    pontosDisponiveis: Number(data.pontosDisponiveis || 0),
    pontosAlocadosPorNivel: lerAtributos(data.pontosAlocadosPorNivel, ZEROS_ATRIBUTOS),
    habilidadesEquipadas: normalizarHabilidadesEquipadas(
      classeIdResolvido,
      data.habilidadesEquipadas
    ),
    ouro: Number(data.ouro || 0),
    diamantes: Number(data.diamantes || 0),
    fragmentosAlma: Number(data.fragmentosAlma || 0),
    subclasseAtualId: typeof data.subclasseAtualId === 'string' ? data.subclasseAtualId : null,
    subclasseTiers:
      data.subclasseTiers && typeof data.subclasseTiers === 'object'
        ? (data.subclasseTiers as Record<string, number>)
        : {},
    fragmentosSubclasse:
      data.fragmentosSubclasse && typeof data.fragmentosSubclasse === 'object'
        ? (data.fragmentosSubclasse as Record<string, number>)
        : {},
    reforcoHabilidade: Number(data.reforcoHabilidade || 0),
    ascensaoHabilidade: Number(data.ascensaoHabilidade || 0),
    essenciaHabilidade: Number(data.essenciaHabilidade || 0),
    fragmentosAscensao: Number(data.fragmentosAscensao || 0),
    inventario:
      data.inventario && typeof data.inventario === 'object'
        ? (data.inventario as Record<string, number>)
        : {},
    cacadaChavesVencidas: Array.isArray(data.cacadaChavesVencidas)
      ? (data.cacadaChavesVencidas as unknown[]).filter((n): n is number => typeof n === 'number')
      : [],
    ...(data.batalhaSangrenta &&
    typeof data.batalhaSangrenta === 'object' &&
    typeof (data.batalhaSangrenta as Record<string, unknown>).dia === 'string'
      ? {
          batalhaSangrenta: {
            dia: (data.batalhaSangrenta as Record<string, unknown>).dia as string,
            tentativas: Number((data.batalhaSangrenta as Record<string, unknown>).tentativas || 0),
          },
        }
      : {}),
    ...(data.guerreiroTentativas && typeof data.guerreiroTentativas === 'object'
      ? {
          guerreiroTentativas: Object.fromEntries(
            Object.entries(data.guerreiroTentativas as Record<string, unknown>).filter(([, v]) => typeof v === 'string')
          ) as Record<string, string>,
        }
      : {}),
    ...(Array.isArray(data.guerreiroVencidas)
      ? { guerreiroVencidas: (data.guerreiroVencidas as unknown[]).filter((n): n is number => typeof n === 'number') }
      : {}),
    ...emblemasDoDocumento(data),
    ...(typeof data.torreAndar === 'number' && data.torreAndar > 0 ? { torreAndar: Math.floor(data.torreAndar) } : {}),
    ...campanhaDoDocumento(data.campanha),
    ...(Array.isArray(data.batalhaSangrentaVencidas)
      ? { batalhaSangrentaVencidas: (data.batalhaSangrentaVencidas as unknown[]).filter((v): v is string => typeof v === 'string') }
      : {}),
    armas,
    armaduras,
    equipamento: lerEquipamentoPersonagem(data.equipamento, armas, armaduras),
    ...(Array.isArray(data.perfilEquipamentos)
      ? { perfilEquipamentos: (data.perfilEquipamentos as unknown[]).filter((v): v is string => typeof v === 'string').slice(0, 4) }
      : {}),
    ...(data.bonusSubclasseAplicado && typeof data.bonusSubclasseAplicado === 'object'
      ? { bonusSubclasseAplicado: lerAtributos(data.bonusSubclasseAplicado, ZEROS_ATRIBUTOS) }
      : {}),
    hpMax: 0,
    sobreescudoMax: 0,
    criadoEm: data.criadoEm || new Date().toISOString(),
    atributos: lerAtributos(data.atributos, ATRIBUTOS_PADRAO_LEGADO),
  };
}

/** Campos gravados em characters/{uid} (derivados como defesa e dano são recalculados na leitura). */
export function personagemParaFirestore(char: CharacterDocument): DocumentData {
  return {
    uid: char.uid,
    nome: char.nome,
    avatarId: char.avatarId,
    sobre: char.sobre ?? '',
    racaId: char.racaId,
    classeId: char.classeId,
    ...(char.linhagem ? { linhagem: char.linhagem } : {}),
    nivel: char.nivel,
    xpAtual: char.xpAtual,
    pontosDisponiveis: char.pontosDisponiveis,
    pontosAlocadosPorNivel: char.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS },
    ouro: char.ouro,
    diamantes: char.diamantes ?? 0,
    fragmentosAlma: char.fragmentosAlma ?? 0,
    subclasseAtualId: char.subclasseAtualId ?? null,
    subclasseTiers: char.subclasseTiers ?? {},
    fragmentosSubclasse: char.fragmentosSubclasse ?? {},
    ...(char.bonusSubclasseAplicado ? { bonusSubclasseAplicado: char.bonusSubclasseAplicado } : {}),
    reforcoHabilidade: char.reforcoHabilidade ?? 0,
    ascensaoHabilidade: char.ascensaoHabilidade ?? 0,
    essenciaHabilidade: char.essenciaHabilidade ?? 0,
    fragmentosAscensao: char.fragmentosAscensao ?? 0,
    inventario: char.inventario ?? {},
    cacadaChavesVencidas: char.cacadaChavesVencidas ?? [],
    ...(char.batalhaSangrenta ? { batalhaSangrenta: char.batalhaSangrenta } : {}),
    ...(char.batalhaSangrentaVencidas ? { batalhaSangrentaVencidas: char.batalhaSangrentaVencidas } : {}),
    ...(char.torreAndar ? { torreAndar: char.torreAndar } : {}),
    ...(char.campanha ? { campanha: char.campanha } : {}),
    ...(char.guerreiroTentativas ? { guerreiroTentativas: char.guerreiroTentativas } : {}),
    ...(char.guerreiroVencidas ? { guerreiroVencidas: char.guerreiroVencidas } : {}),
    ...(char.emblemasItens && char.emblemasItens.length > 0 ? { emblemasItens: char.emblemasItens } : {}),
    ...(char.emblemasEquipados && char.emblemasEquipados.length > 0 ? { emblemasEquipados: char.emblemasEquipados } : {}),
    armas: char.armas ?? [],
    armaduras: char.armaduras ?? [],
    equipamento: char.equipamento ?? EQUIPAMENTO_VAZIO,
    ...(char.perfilEquipamentos ? { perfilEquipamentos: char.perfilEquipamentos } : {}),
    hpMax: char.hpMax,
    sobreescudoMax: char.sobreescudoMax,
    criadoEm: char.criadoEm,
    atributos: char.atributos,
  };
}

function transacaoParaFirestore(tx: TransactionDocument): DocumentData {
  return {
    uid: tx.uid,
    tipo: tx.tipo,
    quantidade: tx.quantidade,
    moeda: tx.moeda || 'ouro',
    motivo: tx.motivo,
    timestamp: tx.timestamp,
  };
}

/** Remove `undefined` (o Firestore rejeita) mantendo o resto do objeto. */
function semUndefined<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

class ContextoFirestore implements ContextoTransacao {
  private personagens = new Map<string, CharacterDocument>();
  private nomes = new Map<string, { uid: string; nome: string }>();
  private transacoes: TransactionDocument[] = [];
  private combates = new Map<string, RegistroCombate>();

  constructor(
    private readonly db: Firestore,
    private readonly tx: Transaction
  ) {}

  async lerPersonagem(uid: string): Promise<CharacterDocument | null> {
    const pendente = this.personagens.get(uid);
    if (pendente) return structuredClone(pendente);
    const snap = await this.tx.get(this.db.collection('characters').doc(uid));
    const data = snap.exists ? snap.data() : undefined;
    return data ? personagemDoFirestore(uid, data) : null;
  }

  gravarPersonagem(personagem: CharacterDocument): void {
    this.personagens.set(personagem.uid, structuredClone(personagem));
  }

  async lerDonoDoNome(chaveNome: string): Promise<string | null> {
    const pendente = this.nomes.get(chaveNome);
    if (pendente) return pendente.uid;
    const snap = await this.tx.get(this.db.collection('nomes').doc(chaveNome));
    const uid = snap.exists ? snap.data()?.uid : null;
    return typeof uid === 'string' ? uid : null;
  }

  reservarNome(chaveNome: string, uid: string, nome: string): void {
    this.nomes.set(chaveNome, { uid, nome });
  }

  registrarTransacao(transacao: TransactionDocument): void {
    this.transacoes.push({ ...transacao });
  }

  async lerCombate(id: string): Promise<RegistroCombate | null> {
    const pendente = this.combates.get(id);
    if (pendente) return structuredClone(pendente);
    const snap = await this.tx.get(this.db.collection('combates').doc(id));
    return snap.exists ? (snap.data() as RegistroCombate) : null;
  }

  gravarCombate(registro: RegistroCombate): void {
    this.combates.set(registro.id, structuredClone(registro));
  }

  /** Aplica todas as gravações pendentes na transação (depois de todas as leituras). */
  aplicar(): void {
    for (const [uid, personagem] of this.personagens) {
      this.tx.set(this.db.collection('characters').doc(uid), personagemParaFirestore(personagem));
    }
    for (const [chave, dono] of this.nomes) {
      this.tx.set(this.db.collection('nomes').doc(chave), {
        uid: dono.uid,
        nome: dono.nome,
        criadoEm: new Date().toISOString(),
      });
    }
    for (const transacao of this.transacoes) {
      const id = transacao.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      this.tx.create(this.db.collection('transactions').doc(id), transacaoParaFirestore(transacao));
    }
    for (const [id, registro] of this.combates) {
      this.tx.create(this.db.collection('combates').doc(id), semUndefined(registro));
    }
  }
}

export function criarRepositorioFirestore(db: Firestore): Repositorio {
  const transacaoAtiva = new AsyncLocalStorage<string>();

  async function lerComRetry<T>(operacao: string, ler: () => Promise<T>): Promise<T> {
    let ultimoErro: unknown;
    for (let tentativa = 1; tentativa <= TENTATIVAS_LEITURA; tentativa++) {
      try {
        return await comTimeout(ler(), TIMEOUT_LEITURA_MS);
      } catch (error) {
        ultimoErro = error;
        const { codigo, mensagem } = descreverErro(error);
        const transitorio = CODIGOS_TRANSITORIOS.has(codigo) || error instanceof ErroTimeout;
        registrarLog(transitorio && tentativa < TENTATIVAS_LEITURA ? 'WARNING' : 'ERROR', 'firestore.leitura_falhou', {
          operacao,
          tentativa,
          codigo,
          mensagem,
        });
        if (!transitorio) break;
        if (tentativa < TENTATIVAS_LEITURA) await esperar(200 * 2 ** (tentativa - 1));
      }
    }
    throw new ErroPersistencia(operacao, ultimoErro);
  }

  return {
    async executarTransacao<T>(operacao: string, fn: (ctx: ContextoTransacao) => Promise<T>) {
      const externa = transacaoAtiva.getStore();
      if (externa) {
        throw new Error(`Transação "${operacao}" aberta dentro de "${externa}": use o contexto recebido.`);
      }

      const inicio = Date.now();
      try {
        // runTransaction já reexecuta em caso de conflito (ABORTED). Não há retry extra aqui:
        // depois de um timeout a gravação pode ter acontecido, e repetir duplicaria o efeito.
        const resultado = await comTimeout(
          transacaoAtiva.run(operacao, () =>
            db.runTransaction(async (tx) => {
              const ctx = new ContextoFirestore(db, tx);
              const valor = await fn(ctx);
              ctx.aplicar();
              return valor;
            })
          ),
          TIMEOUT_TRANSACAO_MS
        );
        return resultado;
      } catch (error) {
        // Erros de regra do jogo (saldo insuficiente, nome em uso...) sobem como estão
        const { codigo, mensagem } = descreverErro(error);
        const ehErroDoBanco =
          error instanceof ErroTimeout ||
          (typeof (error as { code?: unknown })?.code === 'number');
        if (!ehErroDoBanco) throw error;

        registrarLog('ERROR', 'firestore.transacao_falhou', {
          operacao,
          codigo,
          mensagem,
          duracaoMs: Date.now() - inicio,
        });
        throw new ErroPersistencia(operacao, error);
      }
    },

    async lerPersonagem(uid: string) {
      return lerComRetry(`lerPersonagem:${uid}`, async () => {
        const snap = await db.collection('characters').doc(uid).get();
        const data = snap.exists ? snap.data() : undefined;
        return data ? personagemDoFirestore(uid, data) : null;
      });
    },

    async lerDonoDoNome(chaveNome: string) {
      return lerComRetry(`lerDonoDoNome:${chaveNome}`, async () => {
        const snap = await db.collection('nomes').doc(chaveNome).get();
        const uid = snap.exists ? snap.data()?.uid : null;
        return typeof uid === 'string' ? uid : null;
      });
    },

    async lerRevogacaoSessoes(uid: string) {
      return lerComRetry(`lerRevogacao:${uid}`, async () => {
        const snap = await db.collection('revogacoes').doc(uid).get();
        const valor = snap.exists ? snap.data()?.revogadoEm : null;
        return typeof valor === 'number' ? valor : null;
      });
    },

    async gravarRevogacaoSessoes(uid: string, revogadoEmSegundos: number) {
      try {
        await comTimeout(
          db.collection('revogacoes').doc(uid).set({
            revogadoEm: revogadoEmSegundos,
            atualizadoEm: new Date().toISOString(),
          }),
          TIMEOUT_LEITURA_MS
        );
      } catch (error) {
        const { codigo, mensagem } = descreverErro(error);
        registrarLog('ERROR', 'firestore.gravacao_falhou', {
          operacao: 'gravarRevogacao',
          codigo,
          mensagem,
        });
        throw new ErroPersistencia(`gravarRevogacao:${uid}`, error);
      }
    },

    async lerPapelMestre(uid: string) {
      return lerComRetry(`lerPapelMestre:${uid}`, async () => {
        const snap = await db.collection('mestres').doc(uid).get();
        return snap.exists ? papelMestreDoDocumento(uid, snap.data()) : null;
      });
    },

    async gravarPapelMestre(papel: PapelMestreDocumento) {
      await gravarSimples(`gravarPapelMestre:${papel.uid}`, () =>
        db.collection('mestres').doc(papel.uid).set({
          papel: papel.papel,
          concedidoPor: papel.concedidoPor,
          concedidoEm: papel.concedidoEm,
          motivo: papel.motivo,
        })
      );
    },

    async removerPapelMestre(uid: string) {
      await gravarSimples(`removerPapelMestre:${uid}`, () => db.collection('mestres').doc(uid).delete());
    },

    async listarPapeisMestre() {
      return lerComRetry('listarPapeisMestre', async () => {
        const snap = await db.collection('mestres').get();
        return snap.docs.flatMap((d) => {
          const papel = papelMestreDoDocumento(d.id, d.data());
          return papel ? [papel] : [];
        });
      });
    },

    async registrarLogAdmin(entrada: EntradaLogAdmin) {
      const { id, ...dados } = entrada;
      // create() falha se o documento já existe: o log nunca é sobrescrito
      await gravarSimples(`registrarLogAdmin:${id}`, () => db.collection('logAdmin').doc(id).create(dados));
    },

    async listarLogAdmin(limite: number) {
      return lerComRetry('listarLogAdmin', async () => {
        const snap = await db.collection('logAdmin').orderBy('criadoEm', 'desc').limit(limite).get();
        return snap.docs.flatMap((d) => {
          const entrada = entradaLogDoDocumento(d.id, d.data());
          return entrada ? [entrada] : [];
        });
      });
    },

    async lerConteudo(chave: string) {
      return lerComRetry(`lerConteudo:${chave}`, async () => {
        const snap = await db.collection('conteudo').doc(chave).get();
        return snap.exists ? conteudoDoDocumento(chave, snap.data()) : null;
      });
    },

    async listarConteudos(tipo) {
      return lerComRetry(`listarConteudos:${tipo}`, async () => {
        // select(): a lista não traz o rascunho (que pode ser grande)
        const snap = await db.collection('conteudo').where('tipo', '==', tipo).select(...CAMPOS_DO_RESUMO).get();
        return snap.docs.flatMap((d) => {
          const resumo = resumoConteudoDoDocumento(d.id, d.data());
          return resumo ? [resumo] : [];
        });
      });
    },

    async criarConteudo(doc: ConteudoDocumento) {
      try {
        await comTimeout(db.collection('conteudo').doc(doc.chave).create(documentoDoConteudo(doc)), TIMEOUT_LEITURA_MS);
        return true;
      } catch (error) {
        // ALREADY_EXISTS: a chave já está em uso
        if ((error as { code?: unknown })?.code === 6) return false;
        const { codigo, mensagem } = descreverErro(error);
        registrarLog('ERROR', 'firestore.gravacao_falhou', { operacao: 'criarConteudo', codigo, mensagem });
        throw new ErroPersistencia(`criarConteudo:${doc.chave}`, error);
      }
    },

    async salvarRascunhoConteudo(chave, revisaoBase, alteracao) {
      return transacaoDireta(`salvarRascunho:${chave}`, async (tx) => {
        const ref = db.collection('conteudo').doc(chave);
        const atual = conteudoDoDocumento(chave, (await tx.get(ref)).data());
        if (!atual) return 'inexistente' as const;
        if (atual.revisao !== revisaoBase) return 'conflito' as const;
        const novo: ConteudoDocumento = { ...atual, ...alteracao, revisao: atual.revisao + 1 };
        tx.set(ref, documentoDoConteudo(novo));
        return novo;
      });
    },

    async publicarVersaoConteudo(chave, condicao, versao) {
      return transacaoDireta(`publicarConteudo:${chave}`, async (tx) => {
        const ref = db.collection('conteudo').doc(chave);
        const atual = conteudoDoDocumento(chave, (await tx.get(ref)).data());
        if (!atual) return 'inexistente' as const;
        if (condicao.revisao !== undefined && atual.revisao !== condicao.revisao) return 'conflito' as const;
        if (condicao.ultimaVersao !== undefined && atual.ultimaVersao !== condicao.ultimaVersao) return 'conflito' as const;
        const numero = atual.ultimaVersao + 1;
        const nova: VersaoConteudo = { ...versao, versao: numero };
        const conteudo: ConteudoDocumento = { ...atual, versaoPublicada: numero, hashPublicado: nova.hash, ultimaVersao: numero };
        // create(): uma versão nunca é sobrescrita
        tx.create(ref.collection('versoes').doc(String(numero)), { ...nova, dados: dadosParaGravar(atual.tipo, nova.dados) });
        tx.set(ref, documentoDoConteudo(conteudo));
        return { conteudo, versao: nova };
      });
    },

    async listarVersoesConteudo(chave: string, limite: number) {
      return lerComRetry(`listarVersoes:${chave}`, async () => {
        const snap = await db
          .collection('conteudo')
          .doc(chave)
          .collection('versoes')
          .orderBy('versao', 'desc')
          .limit(limite)
          .select(...CAMPOS_DA_VERSAO)
          .get();
        return snap.docs.flatMap((d) => {
          const v = resumoVersaoDoDocumento(d.data());
          return v ? [v] : [];
        });
      });
    },

    async lerSancao(uid: string) {
      return lerComRetry(`lerSancao:${uid}`, async () => {
        const snap = await db.collection('sancoes').doc(uid).get();
        return snap.exists ? sancaoDoDocumento(uid, snap.data()) : null;
      });
    },

    async gravarSancao(doc: SancaoDocumento) {
      const { uid, ...dados } = doc;
      await gravarSimples(`gravarSancao:${uid}`, () => db.collection('sancoes').doc(uid).set(dados));
    },

    async listarTransacoes(uid: string, limite: number) {
      return lerComRetry(`listarTransacoes:${uid}`, async () => {
        // sem orderBy: ordenar no banco pediria um índice composto; o volume por jogador é pequeno
        const snap = await db.collection('transactions').where('uid', '==', uid).get();
        return snap.docs
          .map((d): TransactionDocument => {
            const t = d.data();
            return {
              id: d.id,
              uid,
              tipo: t.tipo === 'perda' ? 'perda' : 'ganho',
              quantidade: typeof t.quantidade === 'number' ? t.quantidade : 0,
              moeda: typeof t.moeda === 'string' ? (t.moeda as TransactionDocument['moeda']) : 'ouro',
              motivo: texto(t.motivo),
              timestamp: texto(t.timestamp),
            };
          })
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .slice(0, limite);
      });
    },

    async lerConfiguracaoDeSistemas() {
      return lerComRetry('lerConfiguracaoDeSistemas', async () => {
        const snap = await db.collection('configuracao').doc('sistemas').get();
        return snap.exists ? configuracaoDoDocumento(snap.data()) : null;
      });
    },

    async gravarConfiguracaoDeSistemas(config: ConfiguracaoDeSistemas) {
      await gravarSimples('gravarConfiguracaoDeSistemas', () => db.collection('configuracao').doc('sistemas').set(config));
    },

    async listarCombatesDoJogador(uid: string, limite: number) {
      return lerComRetry(`listarCombates:${uid}`, async () => {
        const snap = await db.collection('combates').where('uid', '==', uid).get();
        return snap.docs
          .map((d) => d.data() as RegistroCombate)
          .sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)))
          .slice(0, limite);
      });
    },

    async excluirDadosDoJogador(uid: string, chaveNome: string | null) {
      await gravarSimples(`excluirDadosDoJogador:${uid}`, async () => {
        const refs = [db.collection('characters').doc(uid), db.collection('sancoes').doc(uid), db.collection('revogacoes').doc(uid)];
        if (chaveNome) {
          const nome = await db.collection('nomes').doc(chaveNome).get();
          if (nome.exists && nome.data()?.uid === uid) refs.push(nome.ref);
        }
        const transacoes = await db.collection('transactions').where('uid', '==', uid).get();
        refs.push(...transacoes.docs.map((d) => d.ref));
        // lotes de 400 (o limite do Firestore é 500 por lote)
        for (let i = 0; i < refs.length; i += 400) {
          const lote = db.batch();
          for (const ref of refs.slice(i, i + 400)) lote.delete(ref);
          await lote.commit();
        }
      });
    },

    async lerVersaoConteudo(chave: string, versao: number) {
      return lerComRetry(`lerVersao:${chave}:${versao}`, async () => {
        const snap = await db.collection('conteudo').doc(chave).collection('versoes').doc(String(versao)).get();
        return snap.exists ? versaoDoDocumento(snap.data(), chave.split('__')[0]) : null;
      });
    },
  };

  /** Transação curta fora do contexto do jogo: erro do banco vira ErroPersistencia; o runTransaction já repete em conflito. */
  async function transacaoDireta<T>(operacao: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
    try {
      return await comTimeout(db.runTransaction(fn), TIMEOUT_TRANSACAO_MS);
    } catch (error) {
      const { codigo, mensagem } = descreverErro(error);
      registrarLog('ERROR', 'firestore.transacao_falhou', { operacao, codigo, mensagem });
      throw new ErroPersistencia(operacao, error);
    }
  }

  /** Gravação simples (sem transação): erro do banco vira ErroPersistencia e nunca sucesso silencioso. */
  async function gravarSimples(operacao: string, gravar: () => Promise<unknown>): Promise<void> {
    try {
      await comTimeout(gravar(), TIMEOUT_LEITURA_MS);
    } catch (error) {
      const { codigo, mensagem } = descreverErro(error);
      registrarLog('ERROR', 'firestore.gravacao_falhou', { operacao, codigo, mensagem });
      throw new ErroPersistencia(operacao, error);
    }
  }
}
