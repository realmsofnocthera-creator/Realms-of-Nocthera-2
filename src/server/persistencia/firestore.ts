import { AsyncLocalStorage } from 'node:async_hooks';
import type { DocumentData, Firestore, Transaction } from 'firebase-admin/firestore';
import { AVATARES_DISPONIVEIS, getAvatarById } from '@/rules/avatars';
import { normalizarHabilidadesEquipadas, ZEROS_ATRIBUTOS } from '@/game';
import type { Attributes } from '@/rules/attributes';
import type { CharacterDocument, TransactionDocument } from '@/server/characterService';
import { descreverErro, registrarLog } from '@/server/log';
import {
  ContextoTransacao,
  ErroPersistencia,
  RegistroCombate,
  Repositorio,
} from './tipos';

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
export function personagemDoFirestore(uid: string, data: DocumentData): CharacterDocument {
  const classeIdResolvido =
    typeof data.classeId === 'string' && data.classeId ? data.classeId : 'barbaro';
  const avatarExistente =
    typeof data.avatarId === 'string' && getAvatarById(data.avatarId)
      ? data.avatarId
      : (getAvatarById(classeIdResolvido)?.id ?? AVATARES_DISPONIVEIS[0].id);

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
  };
}
