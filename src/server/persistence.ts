import crypto from 'node:crypto';
import { AVATARES_DISPONIVEIS, getAvatarById } from '../rules/avatars';
import { normalizarHabilidadesEquipadas, ZEROS_ATRIBUTOS } from '../game';
import type { CharacterDocument, TransactionDocument } from './characterTypes';
import { adminDb } from './firebaseAdmin';
import { descreverErro, logEvento } from './logger';

/**
 * Camada de persistência do servidor (0.5-C1, C2, C3, C4).
 *
 * - Produção: Firestore é a fonte única da verdade. Qualquer falha de leitura ou
 *   gravação vira erro para quem chamou; nunca há "sucesso silencioso".
 * - Testes (VITEST / NODE_ENV=test): implementação em memória com a mesma interface.
 *
 * Toda alteração de personagem passa por `mutarPersonagem`, que lê, aplica e grava
 * (personagem + transações + registro de idempotência) em uma única transação.
 */

export class PersistenciaIndisponivelError extends Error {
  readonly detalhe: string;

  constructor(operacao: string, causa: unknown) {
    // Mensagem segura para o cliente; o detalhe técnico vai só para o log.
    super('Serviço temporariamente indisponível. Tente novamente em instantes.');
    this.name = 'PersistenciaIndisponivelError';
    this.detalhe = `${operacao}: ${descreverErro(causa).mensagem}`;
  }
}

export class NomeEmUsoError extends Error {
  constructor() {
    super('Esse nome já está em uso.');
    this.name = 'NomeEmUsoError';
  }
}

export class PersonagemJaExisteError extends Error {
  constructor() {
    super('Usuário já possui um personagem.');
    this.name = 'PersonagemJaExisteError';
  }
}

export interface ResultadoMutacao<T> {
  /** Documento final do personagem a gravar. */
  proximo: CharacterDocument;
  /** Transações (ouro/diamantes/fragmentos) gravadas na mesma operação atômica. */
  transacoes?: TransactionDocument[];
  /** Valor devolvido a quem chamou. */
  resultado: T;
}

export interface OpcoesMutacao {
  /**
   * Chave de idempotência. Se já existir um registro com essa chave, a mutação NÃO é
   * reaplicada e o `resposta` gravado na primeira vez é devolvido (0.5-B3).
   */
  idempotencia?: {
    id: string;
    /** Dados extras auditáveis gravados junto (ex.: semente, monstro). */
    auditoria: Record<string, unknown>;
  };
}

export interface MutacaoExecutada<T> {
  repetida: boolean;
  resultado: T;
}

export interface Persistence {
  lerPersonagem(uid: string): Promise<CharacterDocument | null>;
  /** Cria personagem + índice de nome de forma atômica. */
  criarPersonagem(personagem: CharacterDocument): Promise<void>;
  mutarPersonagem<T>(
    uid: string,
    fn: (atual: CharacterDocument | null) => ResultadoMutacao<T>,
    opcoes?: OpcoesMutacao
  ): Promise<MutacaoExecutada<T>>;
  buscarUidPorNome(nome: string): Promise<string | null>;
  registrarTransacao(tx: TransactionDocument): Promise<void>;
  /** Exclusão mútua entre instâncias do servidor para fluxos compostos. */
  comTrava<T>(uid: string, fn: () => Promise<T>): Promise<T>;
}

export function normalizarNome(nome: string): string {
  return nome.trim().toLowerCase();
}

export function isTestEnv(): boolean {
  return Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
}

// ---------------------------------------------------------------------------
// Serialização
// ---------------------------------------------------------------------------

export function personagemParaFirestore(char: CharacterDocument): Record<string, unknown> {
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
    ...(char.bonusSubclasseAplicado ? { bonusSubclasseAplicado: char.bonusSubclasseAplicado } : {}),
    hpMax: char.hpMax,
    manaMax: char.manaMax,
    sobreescudoMax: char.sobreescudoMax,
    criadoEm: char.criadoEm,
    atributos: char.atributos,
  };
}

export function personagemDoFirestore(
  uid: string,
  data: FirebaseFirestore.DocumentData
): CharacterDocument {
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
    pontosAlocadosPorNivel: {
      vigor: Number(data.pontosAlocadosPorNivel?.vigor || 0),
      mente: Number(data.pontosAlocadosPorNivel?.mente || 0),
      forca: Number(data.pontosAlocadosPorNivel?.forca || 0),
      vitalidade: Number(data.pontosAlocadosPorNivel?.vitalidade || 0),
      arcano: Number(data.pontosAlocadosPorNivel?.arcano || 0),
      inteligencia: Number(data.pontosAlocadosPorNivel?.inteligencia || 0),
      agilidade: Number(data.pontosAlocadosPorNivel?.agilidade || 0),
    },
    habilidadesEquipadas: normalizarHabilidadesEquipadas(
      classeIdResolvido,
      data.habilidadesEquipadas ?? undefined
    ),
    ouro: Number(data.ouro || 0),
    diamantes: Number(data.diamantes || 0),
    fragmentosAlma: Number(data.fragmentosAlma || 0),
    subclasseAtualId: typeof data.subclasseAtualId === 'string' ? data.subclasseAtualId : null,
    subclasseTiers:
      data.subclasseTiers && typeof data.subclasseTiers === 'object'
        ? (data.subclasseTiers as Record<string, number>)
        : {},
    ...(data.bonusSubclasseAplicado && typeof data.bonusSubclasseAplicado === 'object'
      ? {
          bonusSubclasseAplicado: {
            vigor: Number(data.bonusSubclasseAplicado.vigor || 0),
            mente: Number(data.bonusSubclasseAplicado.mente || 0),
            forca: Number(data.bonusSubclasseAplicado.forca || 0),
            vitalidade: Number(data.bonusSubclasseAplicado.vitalidade || 0),
            arcano: Number(data.bonusSubclasseAplicado.arcano || 0),
            inteligencia: Number(data.bonusSubclasseAplicado.inteligencia || 0),
            agilidade: Number(data.bonusSubclasseAplicado.agilidade || 0),
          },
        }
      : {}),
    hpMax: 0,
    manaMax: 0,
    sobreescudoMax: 0,
    criadoEm: data.criadoEm || new Date().toISOString(),
    atributos: {
      vigor: Number(data.atributos?.vigor || 2),
      mente: Number(data.atributos?.mente || 2),
      forca: Number(data.atributos?.forca || 0),
      vitalidade: Number(data.atributos?.vitalidade || 0),
      arcano: Number(data.atributos?.arcano || 0),
      inteligencia: Number(data.atributos?.inteligencia || 0),
      agilidade: Number(data.atributos?.agilidade || 0),
    },
  };
}

function transacaoParaFirestore(tx: TransactionDocument): Record<string, unknown> {
  return {
    uid: tx.uid,
    tipo: tx.tipo,
    quantidade: tx.quantidade,
    moeda: tx.moeda || 'ouro',
    motivo: tx.motivo,
    timestamp: tx.timestamp,
  };
}

// ---------------------------------------------------------------------------
// Timeout e retry (0.5-C4)
// ---------------------------------------------------------------------------

const TIMEOUT_PADRAO_MS = 8000;

function comTimeout<T>(promessa: Promise<T>, ms: number, operacao: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timeout de ${ms}ms em ${operacao}`)),
      ms
    );
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry só para operações idempotentes (leituras). */
async function comRetryLeitura<T>(operacao: string, fn: () => Promise<T>): Promise<T> {
  const tentativas = 3;
  let ultimoErro: unknown;
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await comTimeout(fn(), TIMEOUT_PADRAO_MS, operacao);
    } catch (error) {
      ultimoErro = error;
      logEvento('warn', 'firestore.leitura_falhou', {
        operacao,
        tentativa: i,
        ...descreverErro(error),
      });
      if (i < tentativas) await esperar(150 * i);
    }
  }
  throw new PersistenciaIndisponivelError(operacao, ultimoErro);
}

// ---------------------------------------------------------------------------
// Implementação Firestore (produção)
// ---------------------------------------------------------------------------

const TRAVA_VALIDADE_MS = 30_000;
const TRAVA_ESPERA_MAX_MS = 8_000;

export class FirestorePersistence implements Persistence {
  async lerPersonagem(uid: string): Promise<CharacterDocument | null> {
    const snap = await comRetryLeitura(`ler characters/${uid}`, () =>
      adminDb.collection('characters').doc(uid).get()
    );
    const data = snap.exists ? snap.data() : undefined;
    return data ? personagemDoFirestore(uid, data) : null;
  }

  async criarPersonagem(personagem: CharacterDocument): Promise<void> {
    const charRef = adminDb.collection('characters').doc(personagem.uid);
    const nomeRef = adminDb.collection('nomes').doc(normalizarNome(personagem.nome));
    try {
      await comTimeout(
        adminDb.runTransaction(async (t) => {
          const [charSnap, nomeSnap] = await Promise.all([t.get(charRef), t.get(nomeRef)]);
          if (charSnap.exists) throw new PersonagemJaExisteError();
          if (nomeSnap.exists && nomeSnap.data()?.uid !== personagem.uid) {
            throw new NomeEmUsoError();
          }
          t.set(charRef, personagemParaFirestore(personagem));
          t.set(nomeRef, { uid: personagem.uid, nome: personagem.nome });
        }),
        TIMEOUT_PADRAO_MS,
        `criar characters/${personagem.uid}`
      );
    } catch (error) {
      if (error instanceof NomeEmUsoError || error instanceof PersonagemJaExisteError) throw error;
      logEvento('error', 'firestore.criar_personagem_falhou', {
        uid: personagem.uid,
        ...descreverErro(error),
      });
      throw new PersistenciaIndisponivelError('criar personagem', error);
    }
  }

  async mutarPersonagem<T>(
    uid: string,
    fn: (atual: CharacterDocument | null) => ResultadoMutacao<T>,
    opcoes?: OpcoesMutacao
  ): Promise<MutacaoExecutada<T>> {
    const charRef = adminDb.collection('characters').doc(uid);
    const idemRef = opcoes?.idempotencia
      ? adminDb.collection('combates').doc(`${uid}_${opcoes.idempotencia.id}`)
      : null;

    try {
      return await comTimeout(
        adminDb.runTransaction(async (t): Promise<MutacaoExecutada<T>> => {
          const [charSnap, idemSnap] = await Promise.all([
            t.get(charRef),
            idemRef ? t.get(idemRef) : Promise.resolve(null),
          ]);

          if (idemSnap && idemSnap.exists) {
            return { repetida: true, resultado: idemSnap.data()?.resposta as T };
          }

          const data = charSnap.exists ? charSnap.data() : undefined;
          const atual = data ? personagemDoFirestore(uid, data) : null;
          const saida = fn(atual);

          t.set(charRef, personagemParaFirestore(saida.proximo));
          for (const tx of saida.transacoes ?? []) {
            t.set(adminDb.collection('transactions').doc(tx.id as string), transacaoParaFirestore(tx));
          }
          if (idemRef && opcoes?.idempotencia) {
            t.set(idemRef, {
              uid,
              criadoEm: new Date().toISOString(),
              ...opcoes.idempotencia.auditoria,
              resposta: JSON.parse(JSON.stringify(saida.resultado)),
            });
          }
          return { repetida: false, resultado: saida.resultado };
        }),
        TIMEOUT_PADRAO_MS + 4000,
        `mutar characters/${uid}`
      );
    } catch (error) {
      // Erros de regra de negócio lançados por `fn` passam intactos.
      if (!(error instanceof PersistenciaIndisponivelError) && isErroDeNegocio(error)) throw error;
      logEvento('error', 'firestore.mutacao_falhou', { uid, ...descreverErro(error) });
      throw new PersistenciaIndisponivelError(`gravar characters/${uid}`, error);
    }
  }

  async buscarUidPorNome(nome: string): Promise<string | null> {
    const nomeLimpo = nome.trim();
    const indice = await comRetryLeitura(`ler nomes/${normalizarNome(nome)}`, () =>
      adminDb.collection('nomes').doc(normalizarNome(nome)).get()
    );
    if (indice.exists) {
      const uid = indice.data()?.uid;
      return typeof uid === 'string' ? uid : null;
    }
    // Contas anteriores ao índice: consulta exata indexada (nunca varre a coleção).
    const legado = await comRetryLeitura(`consultar characters por nome "${nomeLimpo}"`, () =>
      adminDb.collection('characters').where('nome', '==', nomeLimpo).limit(1).get()
    );
    return legado.empty ? null : legado.docs[0].id;
  }

  async registrarTransacao(tx: TransactionDocument): Promise<void> {
    try {
      await comTimeout(
        adminDb.collection('transactions').doc(tx.id as string).set(transacaoParaFirestore(tx)),
        TIMEOUT_PADRAO_MS,
        `gravar transactions/${tx.id}`
      );
    } catch (error) {
      logEvento('error', 'firestore.transacao_falhou', { id: tx.id, ...descreverErro(error) });
      throw new PersistenciaIndisponivelError('gravar transação', error);
    }
  }

  async comTrava<T>(uid: string, fn: () => Promise<T>): Promise<T> {
    const dono = crypto.randomUUID();
    const ref = adminDb.collection('locks').doc(uid);
    const limite = Date.now() + TRAVA_ESPERA_MAX_MS;

    for (;;) {
      let adquirida: boolean;
      try {
        adquirida = await comTimeout(
          adminDb.runTransaction(async (t) => {
            const snap = await t.get(ref);
            const agora = Date.now();
            if (snap.exists && Number(snap.data()?.ate) > agora) return false;
            t.set(ref, { dono, ate: agora + TRAVA_VALIDADE_MS });
            return true;
          }),
          TIMEOUT_PADRAO_MS,
          `travar locks/${uid}`
        );
      } catch (error) {
        throw new PersistenciaIndisponivelError('adquirir trava', error);
      }
      if (adquirida) break;
      if (Date.now() > limite) {
        throw new Error('Há outra operação em andamento para este personagem. Tente novamente.');
      }
      await esperar(80 + Math.floor(Math.random() * 120));
    }

    try {
      return await fn();
    } finally {
      try {
        await adminDb.runTransaction(async (t) => {
          const snap = await t.get(ref);
          if (snap.exists && snap.data()?.dono === dono) t.delete(ref);
        });
      } catch (error) {
        // A trava expira sozinha em TRAVA_VALIDADE_MS.
        logEvento('warn', 'firestore.liberar_trava_falhou', { uid, ...descreverErro(error) });
      }
    }
  }
}

/**
 * Erros lançados de dentro de `fn` (regras de negócio) são `Error` comuns sem código de
 * infraestrutura. Os do Firestore/gRPC carregam `code` numérico ou string ('aborted' etc.).
 */
function isErroDeNegocio(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  if (code !== undefined) return false;
  return !error.message.startsWith('Timeout de ');
}

// ---------------------------------------------------------------------------
// Implementação em memória (somente testes)
// ---------------------------------------------------------------------------

export class MemoryPersistence implements Persistence {
  readonly personagens = new Map<string, CharacterDocument>();
  readonly transacoes: TransactionDocument[] = [];
  readonly idempotencia = new Map<string, unknown>();
  readonly registrosCombate = new Map<string, Record<string, unknown>>();

  async lerPersonagem(uid: string): Promise<CharacterDocument | null> {
    return this.personagens.get(uid) ?? null;
  }

  async criarPersonagem(personagem: CharacterDocument): Promise<void> {
    if (this.personagens.has(personagem.uid)) throw new PersonagemJaExisteError();
    const alvo = normalizarNome(personagem.nome);
    for (const c of this.personagens.values()) {
      if (normalizarNome(c.nome) === alvo) throw new NomeEmUsoError();
    }
    this.personagens.set(personagem.uid, personagem);
  }

  async mutarPersonagem<T>(
    uid: string,
    fn: (atual: CharacterDocument | null) => ResultadoMutacao<T>,
    opcoes?: OpcoesMutacao
  ): Promise<MutacaoExecutada<T>> {
    const chave = opcoes?.idempotencia ? `${uid}_${opcoes.idempotencia.id}` : null;
    if (chave && this.idempotencia.has(chave)) {
      return { repetida: true, resultado: this.idempotencia.get(chave) as T };
    }
    // `fn` é síncrona: a operação inteira é atômica no event loop.
    const saida = fn(this.personagens.get(uid) ?? null);
    this.personagens.set(uid, saida.proximo);
    this.transacoes.push(...(saida.transacoes ?? []));
    if (chave && opcoes?.idempotencia) {
      this.idempotencia.set(chave, saida.resultado);
      this.registrosCombate.set(chave, { uid, ...opcoes.idempotencia.auditoria });
    }
    return { repetida: false, resultado: saida.resultado };
  }

  async buscarUidPorNome(nome: string): Promise<string | null> {
    const alvo = normalizarNome(nome);
    for (const c of this.personagens.values()) {
      if (normalizarNome(c.nome) === alvo) return c.uid;
    }
    return null;
  }

  async registrarTransacao(tx: TransactionDocument): Promise<void> {
    this.transacoes.push(tx);
  }

  async comTrava<T>(_uid: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }

  limpar(): void {
    this.personagens.clear();
    this.transacoes.length = 0;
    this.idempotencia.clear();
    this.registrosCombate.clear();
  }
}

// ---------------------------------------------------------------------------
// Seleção da implementação
// ---------------------------------------------------------------------------

export const memoriaDeTeste = new MemoryPersistence();
let firestore: FirestorePersistence | null = null;

export function persistencia(): Persistence {
  if (isTestEnv()) return memoriaDeTeste;
  if (!firestore) firestore = new FirestorePersistence();
  return firestore;
}
