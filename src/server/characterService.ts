import { AsyncLocalStorage } from 'node:async_hooks';
import { ATTRIBUTES, AttributeName, Attributes } from '../rules/attributes';
import { GAME_CONFIG } from '../rules/config';
import { getRaceById } from '../rules/races';
import { getClassById } from '../rules/classes';
import { AVATARES_DISPONIVEIS, getAvatarById } from '../rules/avatars';
import { HabilidadesEquipadas } from '../rules/habilidadesEquipadas';
import { SUBCLASSES } from '../rules/subclasses';
import {
  calcularAgilidadeEfetiva,
  calcularDefesaFisica,
  calcularHpMax,
  calcularManaMax,
  calcularPoderTotal,
  calcularSobreescudoMax,
  xpParaProximoNivel,
  validarDistribuicao,
  aplicarDistribuicao,
  calcularReset,
  ZEROS_ATRIBUTOS,
  habilidadesPadraoDaClasse,
  normalizarHabilidadesEquipadas,
  obterSubclasse,
  verificarRequisitosDesbloqueio,
  aplicarBonusSubclasse,
  removerBonusSubclasse,
} from '../game';
import { calcularDanoFisico, ResultadoCombate } from '../game/combat';
import { adminDb } from './firebaseAdmin';

export interface CharacterDocument {
  uid: string;
  nome: string;
  avatarId: string;
  sobre?: string;
  racaId: string;
  classeId: string;
  linhagem?: string;
  nivel: number;
  xpAtual: number;
  pontosDisponiveis: number;
  pontosAlocadosPorNivel?: Attributes;
  habilidadesEquipadas?: HabilidadesEquipadas;
  fragmentosAlma?: number;
  subclasseAtualId?: string | null;
  subclasseTiers?: Record<string, number>;
  bonusSubclasseAplicado?: Attributes;
  atributos: Attributes;
  ouro: number;
  diamantes?: number;
  hpMax: number;
  manaMax: number;
  sobreescudoMax: number;
  defesaFisica?: number;
  agilidadeEfetiva?: number;
  danoFisicoBase?: number;
  criadoEm: string;
}

export interface PublicCharacterProfile {
  nome: string;
  raca: string;
  racaId: string;
  classe: string;
  classeId: string;
  linhagem?: string;
  nivel: number;
  avatarId: string;
  atributosFinais: Attributes;
  poderTotal: number;
  sobre: string;
}

export interface CreateCharacterInput {
  nome: string;
  avatarId?: string;
  racaId?: string;
  classeId?: string;
  linhagem?: string;
  pontos: Record<AttributeName, number>;
}

export interface TransactionDocument {
  id?: string;
  uid: string;
  tipo: 'ganho' | 'perda';
  quantidade: number;
  moeda?: 'ouro' | 'diamantes' | 'fragmentosAlma';
  motivo: string;
  timestamp: string;
}

// Armazenamento em memória do servidor como persistência confiável e cache server-side
const memoryStore = new Map<string, CharacterDocument>();
const transactionsStore: TransactionDocument[] = [];

/**
 * Calcula o XP final de uma vitória aplicando a passiva bonusXpPercentual da raça do personagem
 * em cima do XP base do monstro (arredondando para baixo).
 */
export function calcularXpComBonusRacial(xpBase: number, racaId: string): number {
  const raca = getRaceById(racaId);
  if (raca && raca.passivaRacial.efeito === 'bonusXpPercentual') {
    return Math.floor((xpBase * (100 + raca.passivaRacial.valor)) / 100);
  }
  return xpBase;
}

/**
 * Cria um personagem para o usuário autenticado seguindo todas as regras do servidor.
 */
export async function createCharacter(
  uid: string,
  input: CreateCharacterInput
): Promise<CharacterDocument> {
  const existing = await getCharacterByUid(uid);
  if (existing) {
    throw new Error('Usuário já possui um personagem.');
  }

  if (!input.nome || typeof input.nome !== 'string') {
    throw new Error('Nome do personagem é obrigatório.');
  }
  const nomeLimpo = input.nome.trim();
  if (nomeLimpo.length < 2 || nomeLimpo.length > 32) {
    throw new Error('O nome do personagem deve ter entre 2 e 32 caracteres.');
  }

  if (await isCharacterNameTaken(nomeLimpo)) {
    throw new Error('Esse nome já está em uso.');
  }

  // Validação da raça (se omitido em chamadas legadas internas, assume 'humano'; se informado e inválido, rejeita)
  const racaIdInformado = input.racaId !== undefined ? input.racaId : 'humano';
  const raca = getRaceById(racaIdInformado);
  if (!raca) {
    throw new Error(`Raça inválida: "${String(input.racaId)}".`);
  }

  // Validação da classe (se omitido em chamadas legadas internas das Ordens 2-9, assume 'barbaro' sem alterar testes legados; se informado, valida e soma bônus de classe)
  const classeInformadaExplicitamente = input.classeId !== undefined;
  const classeIdParaBuscar = classeInformadaExplicitamente ? input.classeId! : 'barbaro';
  const classe = getClassById(classeIdParaBuscar);
  if (!classe) {
    throw new Error(`Classe inválida: "${String(input.classeId)}".`);
  }

  // Validação do avatar (valor padrão na criação: o id da classe escolhida pelo jogador)
  const avatarIdInformado =
    input.avatarId !== undefined ? input.avatarId : classe.id;
  const avatarValido = getAvatarById(avatarIdInformado);
  if (!avatarValido) {
    throw new Error(`Avatar inválido: "${String(input.avatarId)}".`);
  }

  const bonusClasse: Attributes = classeInformadaExplicitamente
    ? classe.bonusAtributos
    : {
        vigor: 0,
        mente: 0,
        forca: 0,
        vitalidade: 0,
        arcano: 0,
        inteligencia: 0,
        agilidade: 0,
      };

  // Validação exclusiva de linhagem para Draconiano (e ignorada para outras raças)
  let linhagemValidada: string | undefined;
  if (raca.id === 'draconiano' && raca.linhagens) {
    if (!input.linhagem || typeof input.linhagem !== 'string') {
      throw new Error(
        `A linhagem é obrigatória para a raça Draconiano (${raca.linhagens.join(', ')}).`
      );
    }
    const linhagemNormalizada = input.linhagem.trim().toLowerCase();
    if (!(raca.linhagens as readonly string[]).includes(linhagemNormalizada)) {
      throw new Error(
        `Linhagem inválida "${input.linhagem}". Valores permitidos: ${raca.linhagens.join(', ')}.`
      );
    }
    linhagemValidada = linhagemNormalizada;
  }

  if (!input.pontos || typeof input.pontos !== 'object') {
    throw new Error('Distribuição de pontos inválida.');
  }

  let somaPontos = 0;
  for (const attr of ATTRIBUTES) {
    const valor = input.pontos[attr];
    if (typeof valor !== 'number' || isNaN(valor) || !Number.isInteger(valor)) {
      throw new Error(`Pontos para o atributo "${attr}" devem ser um número inteiro.`);
    }
    if (valor < 0) {
      throw new Error(`O atributo "${attr}" não pode receber pontos negativos.`);
    }
    somaPontos += valor;
  }

  if (somaPontos !== GAME_CONFIG.PONTOS_INICIAIS) {
    throw new Error(
      `A soma dos pontos distribuídos (${somaPontos}) deve ser exatamente igual a ${GAME_CONFIG.PONTOS_INICIAIS}.`
    );
  }

  // Base + Bônus Racial + Bônus de Classe + Pontos do Jogador = Atributos Finais
  const atributosFinais: Attributes = {
    vigor:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor +
      raca.bonusAtributos.vigor +
      bonusClasse.vigor +
      input.pontos.vigor,
    mente:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.mente +
      raca.bonusAtributos.mente +
      bonusClasse.mente +
      input.pontos.mente,
    forca:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.forca +
      raca.bonusAtributos.forca +
      bonusClasse.forca +
      input.pontos.forca,
    vitalidade:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade +
      raca.bonusAtributos.vitalidade +
      bonusClasse.vitalidade +
      input.pontos.vitalidade,
    arcano:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.arcano +
      raca.bonusAtributos.arcano +
      bonusClasse.arcano +
      input.pontos.arcano,
    inteligencia:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.inteligencia +
      raca.bonusAtributos.inteligencia +
      bonusClasse.inteligencia +
      input.pontos.inteligencia,
    agilidade:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.agilidade +
      raca.bonusAtributos.agilidade +
      bonusClasse.agilidade +
      input.pontos.agilidade,
  };

  const derivados = calcularAtributosDerivados(atributosFinais, classe.id, 1);

  const character: CharacterDocument = {
    uid,
    nome: nomeLimpo,
    avatarId: avatarValido.id,
    sobre: '',
    racaId: raca.id,
    classeId: classe.id,
    ...(linhagemValidada ? { linhagem: linhagemValidada } : {}),
    nivel: 1,
    xpAtual: 0,
    pontosDisponiveis: 0,
    pontosAlocadosPorNivel: { ...ZEROS_ATRIBUTOS },
    habilidadesEquipadas: habilidadesPadraoDaClasse(classe.id),
    fragmentosAlma: 0,
    subclasseAtualId: null,
    subclasseTiers: {},
    atributos: atributosFinais,
    ouro: 0,
    diamantes: 0,
    ...derivados,
    criadoEm: new Date().toISOString(),
  };

  memoryStore.set(uid, character);

  // Persiste no Firestore usando Firebase Admin SDK (privilégio de servidor)
  await persistCharacterToFirestore(uid, character);

  return character;
}

/**
 * Helper unificado para recálculo dos atributos derivados do personagem.
 */
export function calcularAtributosDerivados(
  atributos: Attributes,
  classeId: string,
  nivel: number
): {
  hpMax: number;
  manaMax: number;
  sobreescudoMax: number;
  defesaFisica: number;
  agilidadeEfetiva: number;
  danoFisicoBase: number;
} {
  return {
    hpMax: calcularHpMax(atributos.vigor, { classeId, nivel }),
    manaMax: calcularManaMax(atributos.mente, { classeId, nivel }),
    sobreescudoMax: calcularSobreescudoMax(atributos.vitalidade, { classeId, nivel }),
    defesaFisica: calcularDefesaFisica(atributos.vitalidade, { classeId, nivel }),
    agilidadeEfetiva: calcularAgilidadeEfetiva(atributos.agilidade, { classeId, nivel }),
    danoFisicoBase: calcularDanoFisico(atributos.forca, { classeId, nivel }),
  };
}

/**
 * Busca o personagem pelo UID do usuário e calcula os atributos derivados dinamicamente com src/game/.
 */
export async function getCharacterByUid(uid: string): Promise<CharacterDocument | null> {
  // 1. Tenta buscar via Firebase Admin SDK
  try {
    const fromFirestore = await fetchCharacterFromFirestore(uid);
    if (fromFirestore) {
      const derivados = calcularAtributosDerivados(
        fromFirestore.atributos,
        fromFirestore.classeId,
        fromFirestore.nivel
      );
      Object.assign(fromFirestore, derivados);
      fromFirestore.habilidadesEquipadas = normalizarHabilidadesEquipadas(
        fromFirestore.classeId,
        fromFirestore.habilidadesEquipadas
      );
      fromFirestore.diamantes = fromFirestore.diamantes ?? 0;
      fromFirestore.fragmentosAlma = fromFirestore.fragmentosAlma ?? 0;
      fromFirestore.subclasseAtualId = fromFirestore.subclasseAtualId ?? null;
      fromFirestore.subclasseTiers = fromFirestore.subclasseTiers ?? {};
      memoryStore.set(uid, fromFirestore);
      return fromFirestore;
    }
  } catch {
    // Continua para o memoryStore
  }

  const char = memoryStore.get(uid);
  if (!char) {
    return null;
  }

  const derivados = calcularAtributosDerivados(char.atributos, char.classeId, char.nivel);
  return {
    ...char,
    diamantes: char.diamantes ?? 0,
    fragmentosAlma: char.fragmentosAlma ?? 0,
    subclasseAtualId: char.subclasseAtualId ?? null,
    subclasseTiers: char.subclasseTiers ?? {},
    bonusSubclasseAplicado: char.bonusSubclasseAplicado,
    pontosAlocadosPorNivel: char.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS },
    habilidadesEquipadas: normalizarHabilidadesEquipadas(
      char.classeId,
      char.habilidadesEquipadas
    ),
    ...derivados,
  };
}

// Hook para simulação de falha de persistência em testes (apenas ativo em NODE_ENV === 'test')
let testPersistenceFailHook: (() => void) | null = null;

export function setTestPersistenceFailHook(hook: (() => void) | null) {
  if (process.env.NODE_ENV === 'test') {
    testPersistenceFailHook = hook;
  }
}

/**
 * Atualiza os dados de um personagem existente no servidor e Firestore via Firebase Admin SDK.
 */
export async function updateCharacter(
  uid: string,
  updates: Partial<CharacterDocument>
): Promise<CharacterDocument> {
  if (process.env.NODE_ENV === 'test' && testPersistenceFailHook) {
    testPersistenceFailHook();
  }

  const current = await getCharacterByUid(uid);
  if (!current) {
    throw new Error('Personagem não encontrado para atualização.');
  }

  const updated: CharacterDocument = {
    ...current,
    ...updates,
    fragmentosAlma: updates.fragmentosAlma ?? current.fragmentosAlma ?? 0,
    subclasseAtualId:
      updates.subclasseAtualId !== undefined
        ? updates.subclasseAtualId
        : (current.subclasseAtualId ?? null),
    subclasseTiers: updates.subclasseTiers ?? current.subclasseTiers ?? {},
    bonusSubclasseAplicado:
      updates.bonusSubclasseAplicado !== undefined
        ? updates.bonusSubclasseAplicado
        : current.bonusSubclasseAplicado,
    atributos: updates.atributos ? { ...updates.atributos } : current.atributos,
    pontosAlocadosPorNivel: updates.pontosAlocadosPorNivel
      ? { ...updates.pontosAlocadosPorNivel }
      : current.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS },
    habilidadesEquipadas: normalizarHabilidadesEquipadas(
      updates.classeId ?? current.classeId,
      updates.habilidadesEquipadas ?? current.habilidadesEquipadas
    ),
  };

  // Recalcula derivados usando src/game/ (incluindo Resistência Bárbara no nível 20+, Muralha de Ferro, Fluxo Arcano e Passos Rápidos no nível 12+)
  const derivados = calcularAtributosDerivados(
    updated.atributos,
    updated.classeId,
    updated.nivel
  );
  Object.assign(updated, derivados);

  memoryStore.set(uid, updated);

  // Grava via Firebase Admin SDK
  await persistCharacterToFirestore(uid, updated);

  return updated;
}

/**
 * Atualiza exclusivamente o campo avatarId do personagem do usuário autenticado,
 * sem alterar nenhum outro dado do personagem.
 */
export async function updateCharacterAvatar(
  uid: string,
  avatarId: string
): Promise<CharacterDocument> {
  if (!avatarId || typeof avatarId !== 'string') {
    throw new Error('Avatar inválido.');
  }

  const avatarValido = getAvatarById(avatarId);
  if (!avatarValido) {
    throw new Error(`Avatar inválido: "${String(avatarId)}".`);
  }

  const current = await getCharacterByUid(uid);
  if (!current) {
    throw new Error('Personagem não encontrado.');
  }

  const updated: CharacterDocument = {
    ...current,
    avatarId: avatarValido.id,
  };

  memoryStore.set(uid, updated);

  if (!isTestEnv()) {
    try {
      await adminDb.collection('characters').doc(uid).set(
        {
          avatarId: avatarValido.id,
        },
        { merge: true }
      );
    } catch (error: unknown) {
      const err = error as { code?: number | string; message?: string };
      console.error(
        `[Firebase Admin SDK] Falha ao atualizar avatarId em characters/${uid}: Código ${err.code || 'N/A'} - ${err.message || String(error)}`
      );
    }
  }

  return updated;
}

/**
 * Atualiza exclusivamente o campo "sobre" (até 150 caracteres) do próprio personagem.
 */
export async function updateCharacterSobre(
  uid: string,
  sobre: string
): Promise<CharacterDocument> {
  if (typeof sobre !== 'string') {
    throw new Error('O campo "Sobre" deve ser um texto válido.');
  }

  const sobreNormalizado = sobre.trim();
  if (sobreNormalizado.length > 150) {
    throw new Error('O campo "Sobre" deve ter no máximo 150 caracteres.');
  }

  const current = await getCharacterByUid(uid);
  if (!current) {
    throw new Error('Personagem não encontrado.');
  }

  const updated: CharacterDocument = {
    ...current,
    sobre: sobreNormalizado,
  };

  memoryStore.set(uid, updated);

  if (!isTestEnv()) {
    try {
      await adminDb.collection('characters').doc(uid).set(
        {
          sobre: sobreNormalizado,
        },
        { merge: true }
      );
    } catch (error: unknown) {
      const err = error as { code?: number | string; message?: string };
      console.error(
        `[Firebase Admin SDK] Falha ao atualizar sobre em characters/${uid}: Código ${err.code || 'N/A'} - ${err.message || String(error)}`
      );
    }
  }

  return updated;
}

function toPublicCharacterProfile(char: CharacterDocument): PublicCharacterProfile {
  const racaDef = getRaceById(char.racaId);
  const classeDef = getClassById(char.classeId);
  const atributosFinais: Attributes = { ...char.atributos };

  return {
    nome: char.nome,
    raca: racaDef?.nome || char.racaId,
    racaId: char.racaId,
    classe: classeDef?.nome || char.classeId,
    classeId: char.classeId,
    ...(char.linhagem ? { linhagem: char.linhagem } : {}),
    nivel: char.nivel,
    avatarId: char.avatarId,
    atributosFinais,
    poderTotal: calcularPoderTotal(atributosFinais),
    sobre: typeof char.sobre === 'string' ? char.sobre : '',
  };
}

/**
 * Busca um personagem pelo nome (case-insensitive) e retorna APENAS os dados públicos
 * (nunca retorna ouro, email, uid ou transações).
 */
export async function getPublicCharacterByName(
  nomeBusca: string
): Promise<PublicCharacterProfile | null> {
  if (!nomeBusca || typeof nomeBusca !== 'string') {
    return null;
  }

  const nomeLimpo = nomeBusca.trim();
  if (!nomeLimpo) {
    return null;
  }
  const nomeNormalizado = nomeLimpo.toLowerCase();

  for (const char of memoryStore.values()) {
    if (char.nome.trim().toLowerCase() === nomeNormalizado) {
      return toPublicCharacterProfile(char);
    }
  }

  if (isTestEnv()) {
    return null;
  }

  try {
    const exactSnap = await adminDb
      .collection('characters')
      .where('nome', '==', nomeLimpo)
      .limit(1)
      .get();

    if (!exactSnap.empty) {
      const docSnap = exactSnap.docs[0];
      const loaded = await getCharacterByUid(docSnap.id);
      if (loaded) {
        return toPublicCharacterProfile(loaded);
      }
    }

    const allSnap = await adminDb.collection('characters').select('nome').get();
    for (const docSnap of allSnap.docs) {
      const data = docSnap.data();
      if (
        typeof data?.nome === 'string' &&
        data.nome.trim().toLowerCase() === nomeNormalizado
      ) {
        const loaded = await getCharacterByUid(docSnap.id);
        if (loaded) {
          return toPublicCharacterProfile(loaded);
        }
      }
    }
  } catch (error: unknown) {
    const err = error as { code?: number | string; message?: string };
    console.error(
      `[Firebase Admin SDK] Erro ao buscar perfil público "${nomeLimpo}": Código ${err.code || 'N/A'} - ${err.message || String(error)}`
    );
  }

  return null;
}

/**
 * Registra uma transação de alteração de ouro na coleção transactions/ via Firebase Admin SDK.
 */
export async function recordTransaction(
  tx: Omit<TransactionDocument, 'id'>
): Promise<TransactionDocument> {
  const transaction: TransactionDocument = {
    ...tx,
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  transactionsStore.push(transaction);

  // Grava via Firebase Admin SDK
  await persistTransactionToFirestore(transaction);

  return transaction;
}

/**
 * Retorna as transações de ouro e diamantes do usuário.
 */
export function getTransactionsByUid(uid: string): TransactionDocument[] {
  return transactionsStore.filter((t) => t.uid === uid);
}

/**
 * Altera o saldo de diamantes do personagem e registra a transação.
 * Regras:
 * - delta deve ser inteiro e diferente de zero.
 * - se o saldo resultante ficar abaixo de 0, lança Error('Diamantes insuficientes')
 *   sem alterar saldo e sem gravar transação.
 * - caso contrário atualiza o personagem e grava transação { tipo, quantidade, moeda: 'diamantes', motivo }.
 * Função exclusiva de servidor.
 */
export async function alterarDiamantes(
  uid: string,
  delta: number,
  motivo: string
): Promise<CharacterDocument> {
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    throw new Error('Delta de diamantes inválido: deve ser um número inteiro diferente de zero.');
  }

  const current = await getCharacterByUid(uid);
  if (!current) {
    throw new Error('Personagem não encontrado.');
  }

  const saldoAtual = current.diamantes ?? 0;
  const novoSaldo = saldoAtual + delta;

  if (novoSaldo < 0) {
    throw new Error('Diamantes insuficientes');
  }

  // Grava transação com a mesma função do ouro
  await recordTransaction({
    uid,
    tipo: delta > 0 ? 'ganho' : 'perda',
    quantidade: Math.abs(delta),
    moeda: 'diamantes',
    motivo,
    timestamp: new Date().toISOString(),
  });

  // Atualiza o personagem
  const updated = await updateCharacter(uid, {
    diamantes: novoSaldo,
  });

  return updated;
}

/**
 * Altera o saldo de ouro do personagem e registra a transação.
 * Regras:
 * - delta deve ser inteiro e diferente de zero.
 * - se o saldo resultante ficar abaixo de 0, lança Error('Ouro insuficiente')
 *   sem alterar saldo e sem gravar transação.
 * - caso contrário atualiza o personagem e grava transação { tipo, quantidade, moeda: 'ouro', motivo }.
 * Função exclusiva de servidor.
 */
export async function alterarOuro(
  uid: string,
  delta: number,
  motivo: string
): Promise<CharacterDocument> {
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    throw new Error('Delta de ouro inválido: deve ser um número inteiro diferente de zero.');
  }

  const current = await getCharacterByUid(uid);
  if (!current) {
    throw new Error('Personagem não encontrado.');
  }

  const saldoAtual = current.ouro ?? 0;
  const novoSaldo = saldoAtual + delta;

  if (novoSaldo < 0) {
    throw new Error('Ouro insuficiente');
  }

  await recordTransaction({
    uid,
    tipo: delta > 0 ? 'ganho' : 'perda',
    quantidade: Math.abs(delta),
    moeda: 'ouro',
    motivo,
    timestamp: new Date().toISOString(),
  });

  const updated = await updateCharacter(uid, {
    ouro: novoSaldo,
  });

  return updated;
}

/**
 * Altera o saldo de fragmentos de alma do personagem e registra a transação.
 * Regras:
 * - delta deve ser inteiro e diferente de zero.
 * - se o saldo resultante ficar abaixo de 0, lança Error('Fragmentos de alma insuficientes')
 *   sem alterar saldo e sem gravar transação.
 * - caso contrário atualiza o personagem e grava transação { tipo, quantidade, moeda: 'fragmentosAlma', motivo: descricao }.
 * Função exclusiva de servidor.
 */
export async function alterarFragmentosAlma(
  uid: string,
  delta: number,
  descricao: string
): Promise<CharacterDocument> {
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    throw new Error(
      'Delta de fragmentos de alma inválido: deve ser um número inteiro diferente de zero.'
    );
  }

  const current = await getCharacterByUid(uid);
  if (!current) {
    throw new Error('Personagem não encontrado.');
  }

  const saldoAtual = current.fragmentosAlma ?? 0;
  const novoSaldo = saldoAtual + delta;

  if (novoSaldo < 0) {
    throw new Error('Fragmentos de alma insuficientes');
  }

  await recordTransaction({
    uid,
    tipo: delta > 0 ? 'ganho' : 'perda',
    quantidade: Math.abs(delta),
    moeda: 'fragmentosAlma',
    motivo: descricao,
    timestamp: new Date().toISOString(),
  });

  const updated = await updateCharacter(uid, {
    fragmentosAlma: novoSaldo,
  });

  return updated;
}

// Mutex por UID para serializar operações de combate, distribuição e reset do mesmo personagem
const userMutexMap = new Map<string, Promise<unknown>>();
const activeUserMutexStorage = new AsyncLocalStorage<Set<string>>();

export async function runWithUserMutex<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  const activeUids = activeUserMutexStorage.getStore();
  if (activeUids && activeUids.has(uid)) {
    return await fn();
  }

  const previousPromise = userMutexMap.get(uid) ?? Promise.resolve();
  let resolveCurrent!: () => void;
  const currentPromise = new Promise<void>((resolve) => {
    resolveCurrent = resolve;
  });
  userMutexMap.set(uid, currentPromise);

  try {
    await previousPromise;
    const newSet = new Set(activeUids || []);
    newSet.add(uid);
    return await activeUserMutexStorage.run(newSet, fn);
  } finally {
    resolveCurrent();
    if (userMutexMap.get(uid) === currentPromise) {
      userMutexMap.delete(uid);
    }
  }
}

/**
 * Distribui pontos de atributo disponíveis nos 7 atributos principais.
 * Serializado por mutex por UID.
 */
export async function distribuirPontos(
  uid: string,
  distribuicao: unknown
): Promise<CharacterDocument> {
  return runWithUserMutex(uid, async () => {
    const character = await getCharacterByUid(uid);
    if (!character) {
      throw new Error('Personagem não encontrado.');
    }

    const validDist = validarDistribuicao(character.pontosDisponiveis, distribuicao);
    const alocadosAtuais = character.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS };

    const resultado = aplicarDistribuicao(character.atributos, alocadosAtuais, validDist);

    const updated = await updateCharacter(uid, {
      atributos: resultado.atributos,
      pontosAlocadosPorNivel: resultado.alocados,
      pontosDisponiveis: character.pontosDisponiveis - resultado.gastos,
    });

    return updated;
  });
}

/**
 * Reseta os pontos de atributo alocados após a criação (devolve apenas os pontos ganhos por nível).
 * Custa GAME_CONFIG.CUSTO_RESET_ATRIBUTOS_DIAMANTES diamantes.
 * Se não houver pontos alocados, lança erro sem cobrar.
 * Se a gravação falhar após a cobrança, realiza estorno dos diamantes.
 * Serializado por mutex por UID.
 */
export async function resetarAtributos(uid: string): Promise<CharacterDocument> {
  return runWithUserMutex(uid, async () => {
    const character = await getCharacterByUid(uid);
    if (!character) {
      throw new Error('Personagem não encontrado.');
    }

    const alocadosAtuais = character.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS };

    // 1. Calcula o reset puro (lança erro se nenhum ponto alocado ou estado inconsistente)
    const resetResult = calcularReset(
      character.atributos,
      alocadosAtuais,
      character.pontosDisponiveis
    );

    // 2. Confere saldo de diamantes
    const custo = GAME_CONFIG.CUSTO_RESET_ATRIBUTOS_DIAMANTES;
    if ((character.diamantes ?? 0) < custo) {
      throw new Error('Diamantes insuficientes');
    }

    // 3. Cobra os diamantes
    await alterarDiamantes(uid, -custo, 'Reset de atributos');

    // 4. Grava o novo estado
    try {
      const updated = await updateCharacter(uid, {
        atributos: resetResult.atributos,
        pontosAlocadosPorNivel: resetResult.alocados,
        pontosDisponiveis: resetResult.pontosDisponiveis,
      });
      return updated;
    } catch (error) {
      // 5. Se a gravação falhar DEPOIS da cobrança, estorna os diamantes
      try {
        await alterarDiamantes(uid, custo, 'Estorno: reset de atributos');
      } catch (estornoError) {
        const estornoMsg =
          estornoError instanceof Error ? estornoError.message : String(estornoError);
        console.error(
          `[characterService] Falha no estorno de ${custo} diamantes para o uid "${uid}": ${estornoMsg}`
        );
      }
      throw error;
    }
  });
}

/**
 * Desbloqueia ou troca a subclasse do personagem.
 * - Primeiro desbloqueio: valida requisitos de nível, ouro e fragmentos de alma; cobra ouro e fragmentos.
 * - Troca de subclasse: cobra diamantes; não cobra ouro nem fragmentos.
 * - Serializado por mutex por UID.
 */
export async function escolherSubclasse(
  uid: string,
  subclasseId: unknown
): Promise<CharacterDocument> {
  return runWithUserMutex(uid, async () => {
    const character = await getCharacterByUid(uid);
    if (!character) {
      throw new Error('Personagem não encontrado.');
    }

    if (typeof subclasseId !== 'string' || !subclasseId.trim()) {
      throw new Error('Subclasse inválida');
    }

    const idNormalizado = subclasseId.trim().toLowerCase();
    const novaSubclasse = SUBCLASSES.find((s) => s.id === idNormalizado);
    if (!novaSubclasse || novaSubclasse.classeId !== character.classeId) {
      throw new Error('Subclasse inválida');
    }

    if (character.subclasseAtualId === novaSubclasse.id) {
      throw new Error('Subclasse já ativa');
    }

    const ehPrimeiroDesbloqueio = !character.subclasseAtualId;

    if (ehPrimeiroDesbloqueio) {
      const validacaoReq = verificarRequisitosDesbloqueio({
        nivel: character.nivel,
        ouro: character.ouro,
        fragmentosAlma: character.fragmentosAlma ?? 0,
      });

      if (!validacaoReq.ok) {
        throw new Error(validacaoReq.motivo || 'Requisitos não atendidos');
      }

      const custoOuro = GAME_CONFIG.SUBCLASSE_CUSTO_OURO;
      const custoFragmentos = GAME_CONFIG.SUBCLASSE_CUSTO_FRAGMENTOS_ALMA;

      // 1. Cobra ouro
      await alterarOuro(uid, -custoOuro, 'Desbloqueio de subclasse');

      // 2. Cobra fragmentos de alma (se falhar, estorna o ouro)
      try {
        await alterarFragmentosAlma(uid, -custoFragmentos, 'Desbloqueio de subclasse');
      } catch (fragmentosError) {
        try {
          await alterarOuro(uid, custoOuro, 'Estorno: desbloqueio de subclasse');
        } catch (estornoOuroError) {
          const estornoMsg =
            estornoOuroError instanceof Error ? estornoOuroError.message : String(estornoOuroError);
          console.error(
            `[characterService] Falha no estorno de ${custoOuro} ouro para o uid "${uid}": ${estornoMsg}`
          );
        }
        throw fragmentosError;
      }

      // 3. Prepara atributos e tiers
      const charAposCobranca = (await getCharacterByUid(uid)) ?? character;
      let atributosBase = charAposCobranca.atributos;
      if (charAposCobranca.bonusSubclasseAplicado) {
        atributosBase = removerBonusSubclasse(
          atributosBase,
          charAposCobranca.bonusSubclasseAplicado
        );
      }
      const novosAtributos = aplicarBonusSubclasse(
        atributosBase,
        novaSubclasse.bonusAtributos
      );

      const atuaisTiers = charAposCobranca.subclasseTiers ?? {};
      const novosTiers: Record<string, number> = {
        ...atuaisTiers,
        [novaSubclasse.id]: atuaisTiers[novaSubclasse.id] ?? 0,
      };

      // 4. Grava no banco via updateCharacter
      try {
        const updated = await updateCharacter(uid, {
          atributos: novosAtributos,
          bonusSubclasseAplicado: novaSubclasse.bonusAtributos,
          subclasseAtualId: novaSubclasse.id,
          subclasseTiers: novosTiers,
        });
        return updated;
      } catch (gravacaoError) {
        // Estorno completo: ouro e fragmentos
        try {
          await alterarOuro(uid, custoOuro, 'Estorno: desbloqueio de subclasse');
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(
            `[characterService] Falha no estorno de ouro para o uid "${uid}": ${msg}`
          );
        }
        try {
          await alterarFragmentosAlma(
            uid,
            custoFragmentos,
            'Estorno: desbloqueio de subclasse'
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(
            `[characterService] Falha no estorno de fragmentos para o uid "${uid}": ${msg}`
          );
        }
        throw gravacaoError;
      }
    } else {
      // B) Troca de subclasse (já tem subclasseAtualId)
      const custoDiamantes = GAME_CONFIG.SUBCLASSE_CUSTO_TROCA_DIAMANTES;
      if ((character.diamantes ?? 0) < custoDiamantes) {
        throw new Error('Diamantes insuficientes');
      }

      // 1. Cobra diamantes
      await alterarDiamantes(uid, -custoDiamantes, 'Troca de subclasse');

      // 2. Prepara atributos e tiers
      const charAposCobranca = (await getCharacterByUid(uid)) ?? character;
      let atributosBase = charAposCobranca.atributos;
      if (charAposCobranca.bonusSubclasseAplicado) {
        atributosBase = removerBonusSubclasse(
          atributosBase,
          charAposCobranca.bonusSubclasseAplicado
        );
      }
      const novosAtributos = aplicarBonusSubclasse(
        atributosBase,
        novaSubclasse.bonusAtributos
      );

      const atuaisTiers = charAposCobranca.subclasseTiers ?? {};
      const novosTiers: Record<string, number> = {
        ...atuaisTiers,
        [novaSubclasse.id]: atuaisTiers[novaSubclasse.id] ?? 0,
      };

      // 3. Grava no banco via updateCharacter
      try {
        const updated = await updateCharacter(uid, {
          atributos: novosAtributos,
          bonusSubclasseAplicado: novaSubclasse.bonusAtributos,
          subclasseAtualId: novaSubclasse.id,
          subclasseTiers: novosTiers,
        });
        return updated;
      } catch (gravacaoError) {
        // Estorno de diamantes
        try {
          await alterarDiamantes(uid, custoDiamantes, 'Estorno: troca de subclasse');
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(
            `[characterService] Falha no estorno de diamantes para o uid "${uid}": ${msg}`
          );
        }
        throw gravacaoError;
      }
    }
  });
}

/**
 * Aplica os efeitos pós-combate no personagem:
 * - Se venceu: adiciona XP, processa level up até 30 com pontos por nível, adiciona ouro e grava transação.
 * - Se perdeu: aplica regra de morte (perde até 50 de ouro sem negativar, restaura HP/Mana) e grava transação.
 */
export async function applyCombatResult(
  uid: string,
  resultado: ResultadoCombate,
  monstroNome: string
): Promise<{
  character: CharacterDocument;
  levelUps: number;
  transaction?: TransactionDocument;
  mensagens: string[];
}> {
  return runWithUserMutex(uid, async () => {
    const current = await getCharacterByUid(uid);
    if (!current) {
      throw new Error('Personagem não encontrado.');
    }

    const mensagens: string[] = [...resultado.mensagens];
    let transaction: TransactionDocument | undefined;
    let levelUps = 0;

    if (resultado.vencedor === 'personagem') {
      // 1. Soma XP e processa Level Up
      let novoXp = current.xpAtual + resultado.xpGanho;
      let novoNivel = current.nivel;
      let pontosDisponiveis = current.pontosDisponiveis;

      while (novoNivel < GAME_CONFIG.NIVEL_MAXIMO_GRAU_1) {
        const xpNecessario = xpParaProximoNivel(novoNivel);
        if (novoXp >= xpNecessario) {
          novoXp -= xpNecessario;
          novoNivel += 1;
          pontosDisponiveis += GAME_CONFIG.PONTOS_POR_NIVEL;
          levelUps += 1;
          mensagens.push(
            `★ SUBIU DE NÍVEL! ${current.nome} alcançou o Nível ${novoNivel}! (+${GAME_CONFIG.PONTOS_POR_NIVEL} pontos disponíveis)`
          );
        } else {
          break;
        }
      }

      if (novoNivel >= GAME_CONFIG.NIVEL_MAXIMO_GRAU_1) {
        novoNivel = GAME_CONFIG.NIVEL_MAXIMO_GRAU_1;
      }

      // 2. Soma ouro
      const novoOuro = current.ouro + resultado.ouroGanho;

      // 3. Grava transação de ganho se ouro > 0 via Firebase Admin SDK
      if (resultado.ouroGanho > 0) {
        transaction = await recordTransaction({
          uid,
          tipo: 'ganho',
          quantidade: resultado.ouroGanho,
          motivo: `Vitória em combate contra ${monstroNome}`,
          timestamp: new Date().toISOString(),
        });
      }

      const updated = await updateCharacter(uid, {
        xpAtual: novoXp,
        nivel: novoNivel,
        pontosDisponiveis,
        ouro: novoOuro,
      });

      return {
        character: updated,
        levelUps,
        transaction,
        mensagens,
      };
    } else {
      // Derrota do Personagem - Regra de morte
      const ouroAtual = current.ouro;
      const ouroPerdido = Math.min(ouroAtual, GAME_CONFIG.OURO_PERDIDO_MORTE);
      const novoOuro = Math.max(0, ouroAtual - ouroPerdido);

      if (ouroPerdido > 0) {
        transaction = await recordTransaction({
          uid,
          tipo: 'perda',
          quantidade: ouroPerdido,
          motivo: `Penalidade de morte contra ${monstroNome}`,
          timestamp: new Date().toISOString(),
        });
      }

      const updated = await updateCharacter(uid, {
        ouro: novoOuro,
      });

      return {
        character: updated,
        levelUps: 0,
        transaction,
        mensagens,
      };
    }
  });
}

function isTestEnv(): boolean {
  return Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
}

function withFirestoreTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de ${ms}ms na operação com Firestore`)), ms)
    ),
  ]);
}

/**
 * Verifica se já existe qualquer personagem (de qualquer conta) usando o mesmo nome.
 * Comparação normalizada com trim() e case-insensitive (ex.: "Yuri" e "yuri" contam como iguais).
 */
async function isCharacterNameTaken(nomeLimpo: string): Promise<boolean> {
  const nomeNormalizado = nomeLimpo.trim().toLowerCase();

  for (const char of memoryStore.values()) {
    if (char.nome.trim().toLowerCase() === nomeNormalizado) {
      return true;
    }
  }

  if (isTestEnv()) {
    return false;
  }

  try {
    const exactSnap = await withFirestoreTimeout(
      adminDb
        .collection('characters')
        .where('nome', '==', nomeLimpo)
        .limit(1)
        .get()
    );

    if (!exactSnap.empty) {
      return true;
    }

    const allNamesSnap = await withFirestoreTimeout(
      adminDb.collection('characters').select('nome').get()
    );
    for (const docSnap of allNamesSnap.docs) {
      const data = docSnap.data();
      if (
        typeof data?.nome === 'string' &&
        data.nome.trim().toLowerCase() === nomeNormalizado
      ) {
        return true;
      }
    }
  } catch (error: unknown) {
    const err = error as { code?: number | string; message?: string };
    console.error(
      `[Firebase Admin SDK] Erro ao verificar unicidade do nome "${nomeLimpo}": Código ${err.code || 'N/A'} - ${err.message || String(error)}`
    );
  }

  return false;
}

/**
 * Persistência no Firestore usando Firebase Admin SDK com privilégio de servidor
 */
async function persistCharacterToFirestore(
  uid: string,
  char: CharacterDocument
) {
  if (isTestEnv()) {
    return;
  }

  try {
    await withFirestoreTimeout(
      adminDb.collection('characters').doc(uid).set({
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
      })
    );
  } catch (error: unknown) {
    const err = error as { code?: number | string; message?: string; details?: string };
    console.error(
      `[Firebase Admin SDK] Falha ao persistir characters/${uid}: Código ${err.code || 'N/A'} - ${err.message || String(error)}`
    );
  }
}

/**
 * Persistência de transações no Firestore usando Firebase Admin SDK
 */
async function persistTransactionToFirestore(
  tx: TransactionDocument
) {
  if (isTestEnv()) {
    return;
  }

  const docId = tx.id || `tx_${Date.now()}`;
  try {
    await adminDb.collection('transactions').doc(docId).set({
      uid: tx.uid,
      tipo: tx.tipo,
      quantidade: tx.quantidade,
      moeda: tx.moeda || 'ouro',
      motivo: tx.motivo,
      timestamp: tx.timestamp,
    });
  } catch (error: unknown) {
    const err = error as { code?: number | string; message?: string; details?: string };
    console.error(
      `[Firebase Admin SDK] Falha ao persistir transactions/${docId}: Código ${err.code || 'N/A'} - ${err.message || String(error)}`
    );
  }
}

/**
 * Leitura de personagem no Firestore usando Firebase Admin SDK
 */
async function fetchCharacterFromFirestore(uid: string): Promise<CharacterDocument | null> {
  if (isTestEnv()) {
    return null;
  }

  try {
    const docSnap = await withFirestoreTimeout(
      adminDb.collection('characters').doc(uid).get()
    );
    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    if (!data) return null;

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
        data.habilidadesEquipadas
      ),
      ouro: Number(data.ouro || 0),
      diamantes: Number(data.diamantes || 0),
      fragmentosAlma: Number(data.fragmentosAlma || 0),
      subclasseAtualId:
        typeof data.subclasseAtualId === 'string' ? data.subclasseAtualId : null,
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
  } catch (error: unknown) {
    const err = error as { code?: number | string; message?: string };
    console.error(
      `[Firebase Admin SDK] Erro ao consultar characters/${uid}: Código ${err.code || 'N/A'} - ${err.message || String(error)}`
    );
    return null;
  }
}

export function resetCharacterStore() {
  memoryStore.clear();
  transactionsStore.length = 0;
  testPersistenceFailHook = null;
}
