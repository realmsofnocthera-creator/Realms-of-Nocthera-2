import { ATTRIBUTES, AttributeName, Attributes } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { bonusSortePassivaRacial, getRaceById } from '@/rules/races';
import { getClassById } from '@/rules/classes';
import { getAvatarById } from '@/rules/avatars';
import { HabilidadesEquipadas } from '@/rules/habilidadesEquipadas';
import { SUBCLASSES } from '@/rules/subclasses';
import { MONSTERS_MAP } from '@/rules/monsters';
import {
  calcularAgilidadeEfetiva,
  calcularDefesaFisica,
  calcularBonusChanceDrop,
  calcularChanceCritico,
  calcularHpMax,
  calcularPoderTotal,
  calcularSobreescudoMax,
  xpParaProximoNivel,
  validarDistribuicao,
  aplicarDistribuicao,
  calcularReset,
  ZEROS_ATRIBUTOS,
  habilidadesPadraoDaClasse,
  normalizarHabilidadesEquipadas,
  verificarRequisitosDesbloqueio,
  aplicarBonusSubclasse,
  removerBonusSubclasse,
} from '@/game';
import { calcularDanoFisico, Combatente, resolverCombate, ResultadoCombate } from '@/game/combat';
import { registrarLog } from './log';
import {
  chaveDoNome,
  ContextoTransacao,
  RegistroCombate,
  repositorio,
} from './persistencia';

/**
 * Regras de personagem no servidor.
 *
 * Persistência (0.5-C1/C2): o Firestore é a fonte única. Cada operação pública roda em UMA
 * transação (repositorio.executarTransacao): lê o personagem, valida, calcula e grava
 * personagem + transações de moeda juntos. Se qualquer passo falhar, nada é gravado — não
 * existe mais cobrança seguida de estorno manual, nem mutex por instância.
 */

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
  sobreescudoMax: number;
  /** Chance de crítico em % (base + Sorte). Derivado, não é gravado. */
  chanceCritico?: number;
  /** Bônus na chance de drop em % (Sorte). Derivado, não é gravado. */
  bonusChanceDrop?: number;
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

type Moeda = 'ouro' | 'diamantes' | 'fragmentosAlma';

const MENSAGEM_SALDO_INSUFICIENTE: Record<Moeda, string> = {
  ouro: 'Ouro insuficiente',
  diamantes: 'Diamantes insuficientes',
  fragmentosAlma: 'Fragmentos de alma insuficientes',
};

const MENSAGEM_DELTA_INVALIDO: Record<Moeda, string> = {
  ouro: 'Delta de ouro inválido: deve ser um número inteiro diferente de zero.',
  diamantes: 'Delta de diamantes inválido: deve ser um número inteiro diferente de zero.',
  fragmentosAlma:
    'Delta de fragmentos de alma inválido: deve ser um número inteiro diferente de zero.',
};

function novoIdTransacao(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Helper unificado para recálculo dos atributos derivados do personagem.
 */
export function calcularAtributosDerivados(
  atributos: Attributes,
  classeId: string,
  nivel: number,
  subclasse?: { subclasseAtualId?: string | null; subclasseTiers?: Record<string, number> }
): {
  hpMax: number;
  sobreescudoMax: number;
  chanceCritico: number;
  bonusChanceDrop: number;
  defesaFisica: number;
  agilidadeEfetiva: number;
  danoFisicoBase: number;
} {
  return {
    hpMax: calcularHpMax(atributos.vigor, { classeId, nivel }),
    // A passiva da subclasse (Casca de Pedra) entra no Sobreescudo máximo junto com a da classe
    sobreescudoMax: calcularSobreescudoMax(atributos.vitalidade, {
      classeId,
      nivel,
      subclasseAtualId: subclasse?.subclasseAtualId,
      subclasseTiers: subclasse?.subclasseTiers,
    }),
    chanceCritico: calcularChanceCritico(atributos.sorte),
    bonusChanceDrop: calcularBonusChanceDrop(atributos.sorte),
    defesaFisica: calcularDefesaFisica(atributos.vitalidade, { classeId, nivel }),
    agilidadeEfetiva: calcularAgilidadeEfetiva(atributos.agilidade, { classeId, nivel }),
    danoFisicoBase: calcularDanoFisico(atributos.forca, { classeId, nivel }),
  };
}

/**
 * Completa os campos opcionais e recalcula os derivados com src/game/
 * (Resistência Bárbara, Muralha de Ferro, Fluxo Arcano, Passos Rápidos etc.).
 */
function normalizarPersonagem(char: CharacterDocument): CharacterDocument {
  return {
    ...char,
    diamantes: char.diamantes ?? 0,
    fragmentosAlma: char.fragmentosAlma ?? 0,
    subclasseAtualId: char.subclasseAtualId ?? null,
    subclasseTiers: char.subclasseTiers ?? {},
    pontosAlocadosPorNivel: char.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS },
    habilidadesEquipadas: normalizarHabilidadesEquipadas(char.classeId, char.habilidadesEquipadas),
    ...calcularAtributosDerivados(char.atributos, char.classeId, char.nivel, char),
  };
}

/** Mescla atualizações parciais no personagem (mesmas regras de antes da 0.5) e recalcula derivados. */
function mesclarPersonagem(
  current: CharacterDocument,
  updates: Partial<CharacterDocument>
): CharacterDocument {
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
  return {
    ...updated,
    ...calcularAtributosDerivados(updated.atributos, updated.classeId, updated.nivel, updated),
  };
}

// ---------------------------------------------------------------------------
// Operações dentro de uma transação (recebem o contexto; nunca abrem outra transação)
// ---------------------------------------------------------------------------

async function carregarPersonagem(
  ctx: ContextoTransacao,
  uid: string,
  mensagemSeAusente = 'Personagem não encontrado.'
): Promise<CharacterDocument> {
  const raw = await ctx.lerPersonagem(uid);
  if (!raw) {
    throw new Error(mensagemSeAusente);
  }
  return normalizarPersonagem(raw);
}

function salvarPersonagem(
  ctx: ContextoTransacao,
  current: CharacterDocument,
  updates: Partial<CharacterDocument>
): CharacterDocument {
  const updated = mesclarPersonagem(current, updates);
  ctx.gravarPersonagem(updated);
  return updated;
}

/**
 * Altera o saldo de uma moeda em memória e registra a transação no contexto.
 * Lança erro (sem gravar nada) se o delta for inválido ou o saldo ficar negativo.
 */
function alterarSaldoEm(
  ctx: ContextoTransacao,
  char: CharacterDocument,
  moeda: Moeda,
  delta: number,
  motivo: string
): { character: CharacterDocument; transaction: TransactionDocument } {
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    throw new Error(MENSAGEM_DELTA_INVALIDO[moeda]);
  }

  const saldoAtual = (char[moeda] as number | undefined) ?? 0;
  const novoSaldo = saldoAtual + delta;
  if (novoSaldo < 0) {
    throw new Error(MENSAGEM_SALDO_INSUFICIENTE[moeda]);
  }

  const transaction: TransactionDocument = {
    id: novoIdTransacao(),
    uid: char.uid,
    tipo: delta > 0 ? 'ganho' : 'perda',
    quantidade: Math.abs(delta),
    moeda,
    motivo,
    timestamp: new Date().toISOString(),
  };
  ctx.registrarTransacao(transaction);

  return { character: { ...char, [moeda]: novoSaldo }, transaction };
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Busca o personagem pelo UID do usuário e calcula os atributos derivados dinamicamente com src/game/.
 * Falha do banco vira ErroPersistencia (nunca "personagem inexistente").
 */
export async function getCharacterByUid(uid: string): Promise<CharacterDocument | null> {
  const raw = await repositorio.lerPersonagem(uid);
  return raw ? normalizarPersonagem(raw) : null;
}

/**
 * Busca um personagem pelo nome (case-insensitive) e retorna APENAS os dados públicos
 * (nunca retorna ouro, email, uid ou transações). Usa o índice nomes/{chave} (0.5-C3).
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

  const dono = await repositorio.lerDonoDoNome(chaveDoNome(nomeLimpo));
  if (!dono) {
    return null;
  }
  const char = await getCharacterByUid(dono);
  return char ? toPublicCharacterProfile(char) : null;
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

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

/**
 * Cria um personagem para o usuário autenticado seguindo todas as regras do servidor.
 * O nome é reservado em nomes/{chave} na mesma transação (0.5-C3): dois cadastros
 * simultâneos com o mesmo nome não passam juntos.
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

  // Checagem antecipada (mantém a ordem das mensagens); a garantia vem da transação abaixo
  const donoDoNome = await repositorio.lerDonoDoNome(chaveDoNome(nomeLimpo));
  if (donoDoNome && donoDoNome !== uid) {
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
        sorte: 0,
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
    sorte:
      GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte +
      raca.bonusAtributos.sorte +
      bonusSortePassivaRacial(raca) +
      bonusClasse.sorte +
      input.pontos.sorte,
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

  const chaveNome = chaveDoNome(nomeLimpo);
  const criado = await repositorio.executarTransacao('criarPersonagem', async (ctx) => {
    if (await ctx.lerPersonagem(uid)) {
      throw new Error('Usuário já possui um personagem.');
    }
    const dono = await ctx.lerDonoDoNome(chaveNome);
    if (dono && dono !== uid) {
      throw new Error('Esse nome já está em uso.');
    }
    ctx.reservarNome(chaveNome, uid, nomeLimpo);
    ctx.gravarPersonagem(character);
    return character;
  });

  registrarLog('INFO', 'personagem.criado', { uid, racaId: criado.racaId, classeId: criado.classeId });
  return criado;
}

/**
 * Atualiza os dados de um personagem existente (uso interno do servidor e dos testes).
 */
export async function updateCharacter(
  uid: string,
  updates: Partial<CharacterDocument>
): Promise<CharacterDocument> {
  return repositorio.executarTransacao('atualizarPersonagem', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid, 'Personagem não encontrado para atualização.');
    return salvarPersonagem(ctx, current, updates);
  });
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

  return repositorio.executarTransacao('atualizarAvatar', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    return salvarPersonagem(ctx, current, { avatarId: avatarValido.id });
  });
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

  return repositorio.executarTransacao('atualizarSobre', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    return salvarPersonagem(ctx, current, { sobre: sobreNormalizado });
  });
}

async function alterarMoeda(
  uid: string,
  moeda: Moeda,
  delta: number,
  motivo: string
): Promise<CharacterDocument> {
  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    throw new Error(MENSAGEM_DELTA_INVALIDO[moeda]);
  }
  return repositorio.executarTransacao(`alterar:${moeda}`, async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const { character } = alterarSaldoEm(ctx, current, moeda, delta, motivo);
    return salvarPersonagem(ctx, current, { [moeda]: character[moeda] });
  });
}

/**
 * Altera o saldo de diamantes do personagem e registra a transação, atomicamente.
 * - delta deve ser inteiro e diferente de zero.
 * - se o saldo resultante ficar abaixo de 0, lança Error('Diamantes insuficientes')
 *   sem alterar saldo e sem gravar transação.
 * Função exclusiva de servidor.
 */
export async function alterarDiamantes(
  uid: string,
  delta: number,
  motivo: string
): Promise<CharacterDocument> {
  return alterarMoeda(uid, 'diamantes', delta, motivo);
}

/**
 * Altera o saldo de ouro do personagem e registra a transação, atomicamente.
 * Lança Error('Ouro insuficiente') sem gravar nada se o saldo ficaria negativo.
 * Função exclusiva de servidor.
 */
export async function alterarOuro(
  uid: string,
  delta: number,
  motivo: string
): Promise<CharacterDocument> {
  return alterarMoeda(uid, 'ouro', delta, motivo);
}

/**
 * Altera o saldo de fragmentos de alma do personagem e registra a transação, atomicamente.
 * Lança Error('Fragmentos de alma insuficientes') sem gravar nada se o saldo ficaria negativo.
 * Função exclusiva de servidor.
 */
export async function alterarFragmentosAlma(
  uid: string,
  delta: number,
  descricao: string
): Promise<CharacterDocument> {
  return alterarMoeda(uid, 'fragmentosAlma', delta, descricao);
}

/**
 * Distribui pontos de atributo disponíveis nos 7 atributos principais.
 */
export async function distribuirPontos(
  uid: string,
  distribuicao: unknown
): Promise<CharacterDocument> {
  return repositorio.executarTransacao('distribuirPontos', async (ctx) => {
    const character = await carregarPersonagem(ctx, uid);

    const validDist = validarDistribuicao(character.pontosDisponiveis, distribuicao);
    const alocadosAtuais = character.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS };
    const resultado = aplicarDistribuicao(character.atributos, alocadosAtuais, validDist);

    return salvarPersonagem(ctx, character, {
      atributos: resultado.atributos,
      pontosAlocadosPorNivel: resultado.alocados,
      pontosDisponiveis: character.pontosDisponiveis - resultado.gastos,
    });
  });
}

/**
 * Reseta os pontos de atributo alocados após a criação (devolve apenas os pontos ganhos por nível).
 * Custa GAME_CONFIG.CUSTO_RESET_ATRIBUTOS_DIAMANTES diamantes.
 * Se não houver pontos alocados, lança erro sem cobrar.
 * Cobrança e novo estado são gravados juntos: se a gravação falhar, nada é cobrado.
 */
export async function resetarAtributos(uid: string): Promise<CharacterDocument> {
  return repositorio.executarTransacao('resetarAtributos', async (ctx) => {
    const character = await carregarPersonagem(ctx, uid);
    const alocadosAtuais = character.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS };

    // 1. Calcula o reset puro (lança erro se nenhum ponto alocado ou estado inconsistente)
    const resetResult = calcularReset(
      character.atributos,
      alocadosAtuais,
      character.pontosDisponiveis
    );

    // 2. Cobra os diamantes (lança 'Diamantes insuficientes' sem gravar nada)
    const custo = GAME_CONFIG.CUSTO_RESET_ATRIBUTOS_DIAMANTES;
    const cobrado = alterarSaldoEm(ctx, character, 'diamantes', -custo, 'Reset de atributos');

    // 3. Grava o novo estado junto com a cobrança
    return salvarPersonagem(ctx, character, {
      diamantes: cobrado.character.diamantes,
      atributos: resetResult.atributos,
      pontosAlocadosPorNivel: resetResult.alocados,
      pontosDisponiveis: resetResult.pontosDisponiveis,
    });
  });
}

/**
 * Desbloqueia ou troca a subclasse do personagem.
 * - Primeiro desbloqueio: valida requisitos de nível, ouro e fragmentos de alma; cobra ouro e fragmentos.
 * - Troca de subclasse: cobra diamantes; não cobra ouro nem fragmentos.
 * - Cobrança e troca são gravadas na mesma transação.
 */
export async function escolherSubclasse(
  uid: string,
  subclasseId: unknown
): Promise<CharacterDocument> {
  return repositorio.executarTransacao('escolherSubclasse', async (ctx) => {
    let character = await carregarPersonagem(ctx, uid);

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

    const original = character;
    if (!character.subclasseAtualId) {
      // A) Primeiro desbloqueio
      const validacaoReq = verificarRequisitosDesbloqueio({
        nivel: character.nivel,
        ouro: character.ouro,
        fragmentosAlma: character.fragmentosAlma ?? 0,
      });
      if (!validacaoReq.ok) {
        throw new Error(validacaoReq.motivo || 'Requisitos não atendidos');
      }

      character = alterarSaldoEm(
        ctx,
        character,
        'ouro',
        -GAME_CONFIG.SUBCLASSE_CUSTO_OURO,
        'Desbloqueio de subclasse'
      ).character;
      character = alterarSaldoEm(
        ctx,
        character,
        'fragmentosAlma',
        -GAME_CONFIG.SUBCLASSE_CUSTO_FRAGMENTOS_ALMA,
        'Desbloqueio de subclasse'
      ).character;
    } else {
      // B) Troca de subclasse (já tem subclasseAtualId)
      character = alterarSaldoEm(
        ctx,
        character,
        'diamantes',
        -GAME_CONFIG.SUBCLASSE_CUSTO_TROCA_DIAMANTES,
        'Troca de subclasse'
      ).character;
    }

    let atributosBase = character.atributos;
    if (character.bonusSubclasseAplicado) {
      atributosBase = removerBonusSubclasse(atributosBase, character.bonusSubclasseAplicado);
    }
    const novosAtributos = aplicarBonusSubclasse(atributosBase, novaSubclasse.bonusAtributos);

    const atuaisTiers = character.subclasseTiers ?? {};
    const novosTiers: Record<string, number> = {
      ...atuaisTiers,
      [novaSubclasse.id]: atuaisTiers[novaSubclasse.id] ?? 0,
    };

    return salvarPersonagem(ctx, original, {
      ouro: character.ouro,
      fragmentosAlma: character.fragmentosAlma,
      diamantes: character.diamantes,
      atributos: novosAtributos,
      bonusSubclasseAplicado: novaSubclasse.bonusAtributos,
      subclasseAtualId: novaSubclasse.id,
      subclasseTiers: novosTiers,
    });
  });
}

export interface ResultadoPosCombate {
  character: CharacterDocument;
  levelUps: number;
  transaction?: TransactionDocument;
  mensagens: string[];
}

/**
 * Efeitos pós-combate dentro da transação:
 * - Se venceu: adiciona XP, processa level up até 30 com pontos por nível, adiciona ouro e grava transação.
 * - Se perdeu: aplica regra de morte (perde até 50 de ouro sem negativar) e grava transação.
 */
function aplicarResultadoCombateEm(
  ctx: ContextoTransacao,
  current: CharacterDocument,
  resultado: ResultadoCombate,
  monstroNome: string
): ResultadoPosCombate {
  const mensagens: string[] = [...resultado.mensagens];
  let transaction: TransactionDocument | undefined;

  if (resultado.vencedor === 'personagem') {
    // 1. Soma XP e processa Level Up
    let novoXp = current.xpAtual + resultado.xpGanho;
    let novoNivel = current.nivel;
    let pontosDisponiveis = current.pontosDisponiveis;
    let levelUps = 0;

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

    // 2. Soma ouro e registra a transação de ganho
    let novoOuro = current.ouro;
    if (resultado.ouroGanho > 0) {
      const ganho = alterarSaldoEm(
        ctx,
        current,
        'ouro',
        resultado.ouroGanho,
        `Vitória em combate contra ${monstroNome}`
      );
      novoOuro = ganho.character.ouro;
      transaction = ganho.transaction;
    }

    const character = salvarPersonagem(ctx, current, {
      xpAtual: novoXp,
      nivel: novoNivel,
      pontosDisponiveis,
      ouro: novoOuro,
    });
    return { character, levelUps, transaction, mensagens };
  }

  // Derrota do Personagem - Regra de morte
  const ouroPerdido = Math.min(current.ouro, GAME_CONFIG.OURO_PERDIDO_MORTE);
  let novoOuro = current.ouro;
  if (ouroPerdido > 0) {
    const perda = alterarSaldoEm(
      ctx,
      current,
      'ouro',
      -ouroPerdido,
      `Penalidade de morte contra ${monstroNome}`
    );
    novoOuro = perda.character.ouro;
    transaction = perda.transaction;
  }

  const character = salvarPersonagem(ctx, current, { ouro: novoOuro });
  return { character, levelUps: 0, transaction, mensagens };
}

/**
 * Aplica um resultado de combate já resolvido ao personagem (transação própria).
 */
export async function applyCombatResult(
  uid: string,
  resultado: ResultadoCombate,
  monstroNome: string
): Promise<ResultadoPosCombate> {
  return repositorio.executarTransacao('aplicarResultadoCombate', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    return aplicarResultadoCombateEm(ctx, current, resultado, monstroNome);
  });
}

export interface OpcoesCombate {
  /** Semente gerada pelo servidor (0.5-B1). Nunca vem do cliente. */
  seed: number;
  /** Identificador único enviado pelo cliente para tornar reenvios idempotentes (0.5-B3). */
  combateId?: string;
}

export interface RespostaCombate extends ResultadoPosCombate {
  resultado: ResultadoCombate;
  combateId: string;
  repetido: boolean;
}

const FORMATO_COMBATE_ID = /^[A-Za-z0-9-]{8,64}$/;

export function combateIdValido(combateId: unknown): combateId is string {
  return typeof combateId === 'string' && FORMATO_COMBATE_ID.test(combateId);
}

function idDoRegistroCombate(uid: string, combateId: string): string {
  return `${uid}__${combateId}`;
}

/**
 * Resolve um combate no servidor e aplica o resultado, tudo na mesma transação.
 * - A semente vem do servidor e fica gravada em combates/{id} com a entrada do combate (auditoria/replay).
 * - Reenvio com o mesmo combateId devolve o resultado gravado sem aplicar XP/ouro de novo.
 */
export async function executarCombate(
  uid: string,
  monsterId: string,
  opcoes: OpcoesCombate
): Promise<RespostaCombate> {
  const monstro = MONSTERS_MAP[monsterId];
  if (!monstro) {
    throw new Error(`Monstro "${monsterId}" não encontrado.`);
  }

  const combateId = opcoes.combateId ?? `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const idRegistro = idDoRegistroCombate(uid, combateId);

  return repositorio.executarTransacao('combate', async (ctx) => {
    const anterior = await ctx.lerCombate(idRegistro);
    const current = await carregarPersonagem(
      ctx,
      uid,
      'Personagem não encontrado. Crie um personagem antes de batalhar.'
    );

    if (anterior) {
      return {
        ...anterior.resposta,
        resultado: anterior.resposta.resultado as ResultadoCombate,
        character: current,
        combateId,
        repetido: true,
      };
    }

    // Combatente com HP cheio e Sobreescudo calculados
    const combatentePersonagem: Combatente = {
      nome: current.nome,
      racaId: current.racaId,
      classeId: current.classeId,
      linhagem: current.linhagem,
      nivel: current.nivel,
      hp: current.hpMax,
      hpMax: current.hpMax,
      sobreescudo: current.sobreescudoMax,
      atributos: current.atributos,
      habilidadesEquipadas: current.habilidadesEquipadas,
      subclasseAtualId: current.subclasseAtualId,
      subclasseTiers: current.subclasseTiers,
      ouro: current.ouro,
      mitigacao: 0,
    };
    const entrada = structuredClone(combatentePersonagem);

    const resultado = resolverCombate(combatentePersonagem, monstro, opcoes.seed);

    // Se venceu e o personagem possui passiva bonusXpPercentual, aplica por cima do XP base do monstro (arredondado para baixo)
    if (resultado.vencedor === 'personagem') {
      const raca = getRaceById(current.racaId);
      if (raca && raca.passivaRacial.efeito === 'bonusXpPercentual') {
        const xpComBonus = calcularXpComBonusRacial(monstro.xpConcedido, current.racaId);
        resultado.xpGanho = xpComBonus;
        resultado.mensagens.push(
          `Passiva Racial (${raca.passivaRacial.nome}): +${raca.passivaRacial.valor}% de XP aplicado (${monstro.xpConcedido} → ${xpComBonus} XP).`
        );
      }
    }

    const pos = aplicarResultadoCombateEm(ctx, current, resultado, monstro.nome);

    const registro: RegistroCombate = {
      id: idRegistro,
      uid,
      monstroId: monstro.id,
      seed: opcoes.seed,
      vencedor: resultado.vencedor,
      xpGanho: resultado.xpGanho,
      ouroGanho: resultado.ouroGanho,
      criadoEm: new Date().toISOString(),
      entrada: { combatente: entrada, monstroId: monstro.id, seed: opcoes.seed },
      resposta: {
        resultado,
        levelUps: pos.levelUps,
        transaction: pos.transaction,
        mensagens: pos.mensagens,
      },
    };
    ctx.gravarCombate(registro);

    return { ...pos, resultado, combateId, repetido: false };
  });
}
