import { ATTRIBUTES, AttributeName, Attributes } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { bonusSortePassivaRacial, getRaceById } from '@/rules/races';
import { getClassById } from '@/rules/classes';
import { getAvatarById } from '@/rules/avatars';
import { HabilidadesEquipadas } from '@/rules/habilidadesEquipadas';
import { SUBCLASSES } from '@/rules/subclasses';
import { custoDoTier } from '@/rules/subclasseTiers';
import { MONSTERS_MAP, type MonsterDefinition } from '@/rules/monsters';
import { ErroMonstroIndisponivel, monstroEfetivo } from '@/server/monstros';
import { sincronizarCatalogoDeItens } from '@/server/catalogoItens';
import { exigirSistemaLigado } from '@/server/sistemasLeitura';
import { aberturaDaCampanha, ErroDaCampanha, lerCenaPublicada, lerMapaPublicado, lerMissoesPublicadas, mapaInicialDaCampanha, tilesetsDoMapa, type MapaPublicado, type TilesetPublicado } from '@/server/campanha';
import { CHAVE_DA_ABERTURA, aplicarPosicaoDaAcao, planejarAberturaVista, planejarAcao, planejarBau, planejarLuta, planejarPorta, planejarPosicao, progressoInicial, type ProgressoDaCampanha } from '@/game/campanha';
import { idsDasMissoes, processarMissoes, situacaoDoJogador, valorDoObjetivo, type EventoDeMissao, type MissoesDoJogador, type ResumoDaMissao } from '@/game/missoes';
import { metaDoObjetivo, textoDoObjetivo, type MissaoDados } from '@/rules/missao';
import {
  DropSorteado,
  MENSAGEM_BLOQUEIO_CACADA,
  sortearDrops,
  sortearDropsExtras,
  sorteioDeDrops,
  validarEntradaCacada,
  xpDaCacada,
} from '@/game/cacada';
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
  liberarHabilidadesDeOutraSubclasse,
  equiparHabilidadeNoSlot,
  verificarRequisitosDesbloqueio,
  aplicarBonusSubclasse,
  removerBonusSubclasse,
  aplicarReforcoAtributos,
  bonusReforcoEmAtributos,
  proximoNivelReforco,
  proximaAscensao,
} from '@/game';
import { ASCENSAO_CUSTO_FRAGMENTOS, PASSOS_ASCENSAO, ROTULO_ESPACO_ASCENSAO } from '@/rules/progressaoHabilidade';
import { calcularDanoFisico, Combatente, resolverCombate, ResultadoCombate } from '@/game/combat';
import {
  ArmaPersonagem,
  EstadoForja,
  MENSAGEM_BLOQUEIO_FORJA,
  nomeDoItem,
  planejarCustomizacao,
  planejarFabricacao,
  planejarReforja,
} from '@/game/forja';
import {
  ArmaduraPersonagem,
  EstadoArmaduras,
  MENSAGEM_BLOQUEIO_ARMADURA,
  planejarFabricacaoArmadura,
  planejarReforjaArmadura,
  planejarUsoDeOrbes,
  sortearOrbesDaCacada,
} from '@/game/armaduraForja';
import {
  aplicarEquipamentoAosAtributos,
  calcularFichaEquipamento,
  desequiparArma,
  desequiparEspaco,
  EQUIPAMENTO_VAZIO,
  EquipamentoPersonagem,
  equiparArma,
  equiparPeca,
  lerEquipamentoPersonagem,
  MENSAGEM_BLOQUEIO_EQUIPAR,
  mitigacaoDoEquipamento,
} from '@/game/equipamento';
import { HABILIDADES_ARMADURA_NO_MOTOR, bonusDiversoDeArmadura } from '@/game/combate/habilidadesArmaduraCombate';
import {
  conferirEntradaBatalha,
  EstadoBatalhaSangrenta,
  gastarTentativa,
  MENSAGEM_BLOQUEIO_BATALHA,
  montarOndas,
  recompensaDaBatalha,
  sementeDaOnda,
  tentativasRestantes,
} from '@/game/batalhaSangrenta';
import {
  conferirEntradaGuerreiro,
  MENSAGEM_BLOQUEIO_GUERREIRO,
  montarChefeGuerreiro,
  sortearEmblemas,
} from '@/game/guerreiro';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { emblemasNoCombate } from '@/game/emblemasEfeitos';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { TIPO_EMBLEMA_MAP } from '@/rules/emblemasCatalogo';
import {
  desequiparEmblema,
  EmblemaItem,
  emblemasEquipadosDe,
  equiparEmblema,
  fundirEmblemas,
  MENSAGEM_BLOQUEIO_EMBLEMA,
} from '@/game/emblemas';
import {
  conferirEntradaTorre,
  identidadeDoAndar,
  MENSAGEM_BLOQUEIO_TORRE,
  montarMonstroDaTorre,
  recompensaDoAndar,
  TORRE,
} from '@/game/torreCelestial';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';
import { equipamentosDoPerfil, validarEscolhaDoPerfil, type EquipamentoPerfil } from '@/lib/perfilEquipamentos';
import { randomInt, randomUUID } from 'node:crypto';
import { registrarLog } from './log';
import {
  chaveDoNome,
  ContextoTransacao,
  RegistroCombate,
  ResumoGuerreiroRegistro,
  ResumoTorreRegistro,
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
  /** Fragmentos de cada subclasse (dropam na batalha sangrenta, Etapa 5); o tier 4 gasta 5 da própria subclasse. */
  fragmentosSubclasse?: Record<string, number>;
  bonusSubclasseAplicado?: Attributes;
  /** Reforço de Habilidade (0 a 30, roadmap 2.2.2): +% nos 7 atributos, até +25%. */
  reforcoHabilidade?: number;
  /** Ascensão de Habilidade (A0 a A10, roadmap 2.2.1): nível 2 ou 3 de cada habilidade. */
  ascensaoHabilidade?: number;
  /** Essência de habilidade: paga o Reforço (fonte a definir). */
  essenciaHabilidade?: number;
  /** Fragmentos de ascensão: cada Ascensão gasta 1 (fonte a definir). */
  fragmentosAscensao?: number;
  /** Inventário de materiais: quantidade por id de material (drops da Caçada). */
  inventario?: Record<string, number>;
  /** Caçada: estrelas cujo monstro-chave o personagem já venceu (abre a estrela seguinte). */
  cacadaChavesVencidas?: number[];
  /** Batalha Sangrenta: dia (em Brasília) e quantas tentativas já foram usadas nele. */
  batalhaSangrenta?: EstadoBatalhaSangrenta;
  /** Batalha Sangrenta: dificuldades já vencidas (cada uma abre ao vencer a anterior). */
  batalhaSangrentaVencidas?: string[];
  /** Torre Celestial: o andar mais alto já vencido (o personagem enfrenta o seguinte). */
  torreAndar?: number;
  /** Campanha (5.5): mapa, posição e baús abertos. Sem o campo, o jogador ainda não entrou no mundo. */
  campanha?: ProgressoDaCampanha;
  /** Provação do Guerreiro: o dia (em Brasília) da última tentativa em cada dificuldade (1 tentativa por dia por chefe). */
  guerreiroTentativas?: Record<string, string>;
  /** Provação do Guerreiro: dificuldades cujo chefe já foi vencido (cada uma abre ao vencer a anterior). */
  guerreiroVencidas?: number[];
  /** Emblemas do personagem (itens com tipo e estrelas), vindos da Provação do Guerreiro. */
  emblemasItens?: EmblemaItem[];
  /** Ids dos emblemas equipados (até 4 espaços). */
  emblemasEquipados?: string[];
  /** Armas fabricadas na Forja. */
  armas?: ArmaPersonagem[];
  /** Peças de armadura fabricadas no Ferreiro. */
  armaduras?: ArmaduraPersonagem[];
  /** Equipamento: a arma e as peças de armadura equipadas na ficha. */
  equipamento?: EquipamentoPersonagem;
  /** Ids dos até 4 itens equipados que o jogador mostra no perfil público (sem o campo, a escolha é automática). */
  perfilEquipamentos?: string[];
  /** Privacidade social (7.1): o jogador escolhe não aparecer no Ranking e/ou na Busca (sem o campo, aparece). */
  escondidoNoRanking?: boolean;
  escondidoNaBusca?: boolean;
  /** Guildas (7.3): a guilda do personagem (o cargo fica no documento da guilda) e o nome dela, para o perfil. */
  guildaId?: string;
  guildaNome?: string;
  /** Guildas que convidaram o personagem e que ele pediu para entrar (ids), esperando resposta. */
  convitesDeGuilda?: string[];
  pedidosDeGuilda?: string[];
  /** Quanto o equipamento soma em cada atributo (pontos e % de Agilidade). Derivado, não é gravado. */
  bonusEquipamento?: Attributes;
  /** Mitigação física e mágica das peças de Defesa, com a % de Defesa da arma. Derivado, não é gravado. */
  mitigacaoEquipamento?: number;
  /** Quanto o Reforço soma em cada atributo. Derivado, não é gravado. */
  bonusReforco?: Attributes;
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
  /** Os equipamentos principais que o jogador mostra (até 4). */
  equipamentosPrincipais: EquipamentoPerfil[];
  /** O nome da guilda do personagem, se ele estiver numa (7.3). */
  guilda?: string;
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
  moeda?:
    | 'ouro'
    | 'diamantes'
    | 'fragmentosAlma'
    | 'fragmentosSubclasse'
    | 'essenciaHabilidade'
    | 'fragmentosAscensao';
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

export type Moeda = 'ouro' | 'diamantes' | 'fragmentosAlma' | 'essenciaHabilidade' | 'fragmentosAscensao';

const MENSAGEM_SALDO_INSUFICIENTE: Record<Moeda, string> = {
  ouro: 'Ouro insuficiente',
  diamantes: 'Diamantes insuficientes',
  fragmentosAlma: 'Fragmentos de alma insuficientes',
  essenciaHabilidade: 'Essência de habilidade insuficiente',
  fragmentosAscensao: 'Fragmentos de ascensão insuficientes',
};

const MENSAGEM_DELTA_INVALIDO: Record<Moeda, string> = {
  ouro: 'Delta de ouro inválido: deve ser um número inteiro diferente de zero.',
  diamantes: 'Delta de diamantes inválido: deve ser um número inteiro diferente de zero.',
  fragmentosAlma:
    'Delta de fragmentos de alma inválido: deve ser um número inteiro diferente de zero.',
  essenciaHabilidade:
    'Delta de essência de habilidade inválido: deve ser um número inteiro diferente de zero.',
  fragmentosAscensao:
    'Delta de fragmentos de ascensão inválido: deve ser um número inteiro diferente de zero.',
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
  subclasse?: {
    subclasseAtualId?: string | null;
    subclasseTiers?: Record<string, number>;
    /** Ascensão de Habilidade: nível das passivas (2.2.1). */
    ascensaoHabilidade?: number;
  }
): {
  hpMax: number;
  sobreescudoMax: number;
  chanceCritico: number;
  bonusChanceDrop: number;
  defesaFisica: number;
  agilidadeEfetiva: number;
  danoFisicoBase: number;
} {
  const ascensaoHabilidade = subclasse?.ascensaoHabilidade;
  return {
    hpMax: calcularHpMax(atributos.vigor, { classeId, nivel, ascensaoHabilidade }),
    // A passiva da subclasse (Casca de Pedra) entra no Sobreescudo máximo junto com a da classe
    sobreescudoMax: calcularSobreescudoMax(atributos.vitalidade, {
      classeId,
      nivel,
      subclasseAtualId: subclasse?.subclasseAtualId,
      subclasseTiers: subclasse?.subclasseTiers,
      ascensaoHabilidade,
    }),
    chanceCritico: calcularChanceCritico(atributos.sorte),
    bonusChanceDrop: calcularBonusChanceDrop(atributos.sorte),
    defesaFisica: calcularDefesaFisica(atributos.vitalidade, { classeId, nivel, ascensaoHabilidade }),
    agilidadeEfetiva: calcularAgilidadeEfetiva(atributos.agilidade, { classeId, nivel }),
    danoFisicoBase: calcularDanoFisico(atributos.forca, { classeId, nivel, ascensaoHabilidade }),
  };
}

/**
 * Completa os campos opcionais e recalcula os derivados com src/game/
 * (Resistência Bárbara, Muralha de Ferro, Fluxo Arcano, Passos Rápidos etc.).
 */
function normalizarPersonagem(char: CharacterDocument): CharacterDocument {
  const equipamento = lerEquipamentoPersonagem(char.equipamento, char.armas ?? [], char.armaduras ?? []);
  return {
    ...char,
    diamantes: char.diamantes ?? 0,
    fragmentosAlma: char.fragmentosAlma ?? 0,
    subclasseAtualId: char.subclasseAtualId ?? null,
    subclasseTiers: char.subclasseTiers ?? {},
    fragmentosSubclasse: char.fragmentosSubclasse ?? {},
    reforcoHabilidade: char.reforcoHabilidade ?? 0,
    ascensaoHabilidade: char.ascensaoHabilidade ?? 0,
    essenciaHabilidade: char.essenciaHabilidade ?? 0,
    fragmentosAscensao: char.fragmentosAscensao ?? 0,
    inventario: char.inventario ?? {},
    cacadaChavesVencidas: char.cacadaChavesVencidas ?? [],
    pontosAlocadosPorNivel: char.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS },
    habilidadesEquipadas: normalizarHabilidadesEquipadas(char.classeId, char.habilidadesEquipadas),
    equipamento,
    ...derivadosComReforco({ ...char, equipamento }),
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
    fragmentosSubclasse: updates.fragmentosSubclasse ?? current.fragmentosSubclasse ?? {},
    reforcoHabilidade: updates.reforcoHabilidade ?? current.reforcoHabilidade ?? 0,
    ascensaoHabilidade: updates.ascensaoHabilidade ?? current.ascensaoHabilidade ?? 0,
    essenciaHabilidade: updates.essenciaHabilidade ?? current.essenciaHabilidade ?? 0,
    fragmentosAscensao: updates.fragmentosAscensao ?? current.fragmentosAscensao ?? 0,
    inventario: updates.inventario ?? current.inventario ?? {},
    cacadaChavesVencidas: updates.cacadaChavesVencidas ?? current.cacadaChavesVencidas ?? [],
    ...((updates.batalhaSangrenta ?? current.batalhaSangrenta) ? { batalhaSangrenta: updates.batalhaSangrenta ?? current.batalhaSangrenta } : {}),
    ...((updates.batalhaSangrentaVencidas ?? current.batalhaSangrentaVencidas) ? { batalhaSangrentaVencidas: updates.batalhaSangrentaVencidas ?? current.batalhaSangrentaVencidas } : {}),
    ...((updates.torreAndar ?? current.torreAndar) !== undefined ? { torreAndar: updates.torreAndar ?? current.torreAndar } : {}),
    ...((updates.campanha ?? current.campanha) ? { campanha: updates.campanha ?? current.campanha } : {}),
    ...((updates.guerreiroTentativas ?? current.guerreiroTentativas) ? { guerreiroTentativas: updates.guerreiroTentativas ?? current.guerreiroTentativas } : {}),
    ...((updates.guerreiroVencidas ?? current.guerreiroVencidas) ? { guerreiroVencidas: updates.guerreiroVencidas ?? current.guerreiroVencidas } : {}),
    ...((updates.emblemasItens ?? current.emblemasItens) ? { emblemasItens: updates.emblemasItens ?? current.emblemasItens } : {}),
    ...((updates.emblemasEquipados ?? current.emblemasEquipados) ? { emblemasEquipados: updates.emblemasEquipados ?? current.emblemasEquipados } : {}),
    ...((updates.perfilEquipamentos ?? current.perfilEquipamentos) ? { perfilEquipamentos: updates.perfilEquipamentos ?? current.perfilEquipamentos } : {}),
    armas: updates.armas ?? current.armas ?? [],
    armaduras: updates.armaduras ?? current.armaduras ?? [],
    equipamento: updates.equipamento ?? current.equipamento ?? EQUIPAMENTO_VAZIO,
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
    ...derivadosComReforco(updated),
  };
}

/** Atributos que valem em combate e nos derivados: os gravados, o Reforço de Habilidade e o equipamento equipado. */
export function atributosEfetivos(
  char: Pick<CharacterDocument, 'atributos' | 'reforcoHabilidade'> &
    Partial<Pick<CharacterDocument, 'equipamento' | 'armas' | 'armaduras' | 'emblemasItens' | 'emblemasEquipados'>>
): Attributes {
  const comReforco = aplicarReforcoAtributos(char.atributos, char.reforcoHabilidade);
  const emblemas = emblemasEquipadosDe(char);
  if (!char.equipamento && emblemas.length === 0) return comReforco;
  return aplicarEquipamentoAosAtributos(comReforco, calcularFichaEquipamento(char.equipamento, char.armas, char.armaduras, emblemas));
}

/** Derivados calculados com o Reforço e o equipamento (atributos, HP e defesa) e a Ascensão (nível das passivas). */
function derivadosComReforco(char: CharacterDocument) {
  const ficha = calcularFichaEquipamento(char.equipamento, char.armas, char.armaduras, emblemasEquipadosDe(char));
  const comReforco = aplicarReforcoAtributos(char.atributos, char.reforcoHabilidade);
  const efetivos = aplicarEquipamentoAosAtributos(comReforco, ficha);
  const derivados = calcularAtributosDerivados(efetivos, char.classeId, char.nivel, char);
  const bonusEquipamento = { ...efetivos };
  for (const a of ATTRIBUTES) bonusEquipamento[a] = efetivos[a] - comReforco[a];
  return {
    bonusReforco: bonusReforcoEmAtributos(char.atributos, char.reforcoHabilidade),
    bonusEquipamento,
    mitigacaoEquipamento: mitigacaoDoEquipamento(ficha),
    ...derivados,
    // HP: o Vigor e a Vida das peças; o Reforço de Vida (habilidade de armadura) soma % sobre o total
    hpMax: Math.floor(((derivados.hpMax + ficha.hpExtra) * (100 + ficha.hpPercentual)) / 100),
    chanceCritico: derivados.chanceCritico + ficha.percentuais.chanceCritico,
  };
}

// ---------------------------------------------------------------------------
// Operações dentro de uma transação (recebem o contexto; nunca abrem outra transação)
// ---------------------------------------------------------------------------

export async function carregarPersonagem(
  ctx: ContextoTransacao,
  uid: string,
  mensagemSeAusente = 'Personagem não encontrado.'
): Promise<CharacterDocument> {
  await sincronizarCatalogoDeItens();
  const raw = await ctx.lerPersonagem(uid);
  if (!raw) {
    throw new Error(mensagemSeAusente);
  }
  return normalizarPersonagem(raw);
}

export function salvarPersonagem(
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
export function alterarSaldoEm(
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
  nomeBusca: string,
  solicitanteUid?: string
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
  // quem se escondeu da Busca (7.1) só é visto por si mesmo
  if (char?.escondidoNaBusca && dono !== solicitanteUid) return null;
  return char ? toPublicCharacterProfile(char) : null;
}

function toPublicCharacterProfile(char: CharacterDocument): PublicCharacterProfile {
  const racaDef = getRaceById(char.racaId);
  const classeDef = getClassById(char.classeId);
  const atributosFinais: Attributes = { ...atributosEfetivos(char) };

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
    equipamentosPrincipais: equipamentosDoPerfil(char),
    ...(char.guildaId && char.guildaNome ? { guilda: char.guildaNome } : {}),
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
    fragmentosSubclasse: {},
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

/** Escolhe os até 4 itens equipados que aparecem nos "Equipamentos principais" do perfil público. */
export async function definirEquipamentosDoPerfil(uid: string, itens: unknown): Promise<CharacterDocument> {
  return repositorio.executarTransacao('perfilEquipamentos', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const r = validarEscolhaDoPerfil(current, itens);
    if (!r.ok) throw new Error(r.erro);
    return salvarPersonagem(ctx, current, { perfilEquipamentos: r.ids });
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

/** Ajustes do Painel do Mestre (3.5.4.2): variações (deltas) por campo; cada moeda gera uma transação. */
export interface AjusteDoMestre {
  moedas: Partial<Record<Moeda, number>>;
  /** Só aumenta: dá XP e sobe de nível como no combate. */
  xp?: number;
  /** Variação por material (mochila). Resultado negativo é recusado; zero remove a entrada. */
  materiais?: Record<string, number>;
}

/**
 * Aplica o ajuste do Painel do Mestre numa única transação: moedas (com extrato), XP (com subida de nível) e
 * materiais. Se qualquer parte falhar, nada é gravado. Função exclusiva de servidor.
 */
export async function ajustarPersonagemPorMestre(uid: string, ajuste: AjusteDoMestre, motivo: string): Promise<CharacterDocument> {
  return repositorio.executarTransacao('ajusteDoMestre', async (ctx) => {
    let atual = await carregarPersonagem(ctx, uid);
    const patch: Partial<CharacterDocument> = {};
    for (const [moeda, delta] of Object.entries(ajuste.moedas) as [Moeda, number][]) {
      const r = alterarSaldoEm(ctx, atual, moeda, delta, motivo);
      atual = r.character;
      patch[moeda] = r.character[moeda] as never;
    }
    if (ajuste.xp) {
      let xp = atual.xpAtual + ajuste.xp;
      let nivel = atual.nivel;
      let pontos = atual.pontosDisponiveis;
      while (nivel < GAME_CONFIG.NIVEL_MAXIMO_GRAU_1 && xp >= xpParaProximoNivel(nivel)) {
        xp -= xpParaProximoNivel(nivel);
        nivel += 1;
        pontos += GAME_CONFIG.PONTOS_POR_NIVEL;
      }
      if (nivel >= GAME_CONFIG.NIVEL_MAXIMO_GRAU_1) nivel = GAME_CONFIG.NIVEL_MAXIMO_GRAU_1;
      Object.assign(patch, { xpAtual: xp, nivel, pontosDisponiveis: pontos });
    }
    if (ajuste.materiais) {
      const inventario = { ...(atual.inventario ?? {}) };
      for (const [id, delta] of Object.entries(ajuste.materiais)) {
        const novo = (inventario[id] ?? 0) + delta;
        if (novo < 0) throw new Error(`Material insuficiente: ${id}`);
        if (novo === 0) delete inventario[id];
        else inventario[id] = novo;
      }
      patch.inventario = inventario;
    }
    return salvarPersonagem(ctx, atual, patch);
  });
}

/**
 * Zera a progressão do personagem (Painel do Mestre, 3.5.4.4): volta ao nível 1, sem XP, moedas, mochila,
 * equipamentos, subclasse, reforço e progresso de modos. Mantém a identidade (nome, avatar, sobre, raça, classe,
 * linhagem, criadoEm) e os atributos da criação (tira os pontos de nível e o bônus de subclasse).
 * Registra uma transação de perda para cada moeda que tinha saldo. Função exclusiva de servidor.
 */
export async function zerarProgressaoPorMestre(uid: string, motivo: string): Promise<CharacterDocument> {
  return repositorio.executarTransacao('zerarProgressao', async (ctx) => {
    const atual = await carregarPersonagem(ctx, uid);
    let atributos = { ...atual.atributos };
    const alocados = atual.pontosAlocadosPorNivel ?? { ...ZEROS_ATRIBUTOS };
    for (const a of ATTRIBUTES) atributos[a] = Math.max(0, atributos[a] - (alocados[a] || 0));
    if (atual.bonusSubclasseAplicado) atributos = removerBonusSubclasse(atributos, atual.bonusSubclasseAplicado);

    let corrente = atual;
    const moedas: Moeda[] = ['ouro', 'diamantes', 'fragmentosAlma', 'essenciaHabilidade', 'fragmentosAscensao'];
    for (const moeda of moedas) {
      const saldo = (corrente[moeda] as number | undefined) ?? 0;
      if (saldo > 0) corrente = alterarSaldoEm(ctx, corrente, moeda, -saldo, motivo).character;
    }

    // monta do zero a partir da identidade: nenhum campo de progresso escapa
    const limpo: CharacterDocument = {
      uid: atual.uid,
      nome: atual.nome,
      avatarId: atual.avatarId,
      sobre: atual.sobre ?? '',
      racaId: atual.racaId,
      classeId: atual.classeId,
      ...(atual.linhagem ? { linhagem: atual.linhagem } : {}),
      nivel: 1,
      xpAtual: 0,
      pontosDisponiveis: 0,
      pontosAlocadosPorNivel: { ...ZEROS_ATRIBUTOS },
      habilidadesEquipadas: habilidadesPadraoDaClasse(atual.classeId),
      fragmentosAlma: 0,
      subclasseAtualId: null,
      subclasseTiers: {},
      fragmentosSubclasse: {},
      atributos,
      ouro: 0,
      diamantes: 0,
      hpMax: atual.hpMax,
      sobreescudoMax: atual.sobreescudoMax,
      criadoEm: atual.criadoEm,
    } as CharacterDocument;
    const gravado = mesclarPersonagem(limpo, {});
    ctx.gravarPersonagem(gravado);
    return gravado;
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
 * Escolhe (desbloqueia) a subclasse do personagem. Cada personagem tem uma subclasse só:
 * paga o tier 0 (30 fragmentos de alma e 10.000 de ouro), começa no tier 0 e ganha o bônus de atributos.
 * Quem já tem uma subclasse precisa resetar antes (resetarSubclasse). Cobrança e escolha na mesma transação.
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
    if (character.subclasseAtualId) {
      throw new Error('Você já tem uma subclasse. Resete para escolher outra.');
    }

    const original = character;
    const custoDesbloqueio = custoDoTier(0);
    const validacaoReq = verificarRequisitosDesbloqueio({
      nivel: character.nivel,
      ouro: character.ouro,
      fragmentosAlma: character.fragmentosAlma ?? 0,
    });
    if (!validacaoReq.ok) {
      throw new Error(validacaoReq.motivo || 'Requisitos não atendidos');
    }

    character = alterarSaldoEm(ctx, character, 'ouro', -custoDesbloqueio.ouro, 'Desbloqueio de subclasse').character;
    character = alterarSaldoEm(
      ctx,
      character,
      'fragmentosAlma',
      -custoDesbloqueio.fragmentosAlma,
      'Desbloqueio de subclasse'
    ).character;

    let atributosBase = character.atributos;
    if (character.bonusSubclasseAplicado) {
      atributosBase = removerBonusSubclasse(atributosBase, character.bonusSubclasseAplicado);
    }
    const novosAtributos = aplicarBonusSubclasse(atributosBase, novaSubclasse.bonusAtributos);

    return salvarPersonagem(ctx, original, {
      ouro: character.ouro,
      fragmentosAlma: character.fragmentosAlma,
      atributos: novosAtributos,
      bonusSubclasseAplicado: novaSubclasse.bonusAtributos,
      subclasseAtualId: novaSubclasse.id,
      subclasseTiers: { [novaSubclasse.id]: 0 },
    });
  });
}

/**
 * Reseta a subclasse (100 diamantes): o personagem perde a subclasse e os tiers, o bônus de atributos sai e as
 * habilidades de subclasse voltam para as da classe. Para ter uma subclasse de novo, paga tudo outra vez
 * (tier 0 em diante). Os fragmentos da própria subclasse continuam com o personagem.
 */
export async function resetarSubclasse(uid: string): Promise<CharacterDocument> {
  return repositorio.executarTransacao('resetarSubclasse', async (ctx) => {
    const character = await carregarPersonagem(ctx, uid);
    if (!character.subclasseAtualId) {
      throw new Error('Nenhuma subclasse para resetar');
    }

    const cobrado = alterarSaldoEm(
      ctx,
      character,
      'diamantes',
      -GAME_CONFIG.SUBCLASSE_CUSTO_RESET_DIAMANTES,
      'Reset de subclasse'
    ).character;

    const atributos = character.bonusSubclasseAplicado
      ? removerBonusSubclasse(character.atributos, character.bonusSubclasseAplicado)
      : character.atributos;

    return salvarPersonagem(ctx, character, {
      diamantes: cobrado.diamantes,
      atributos,
      bonusSubclasseAplicado: { ...ZEROS_ATRIBUTOS },
      subclasseAtualId: null,
      subclasseTiers: {},
      habilidadesEquipadas: liberarHabilidadesDeOutraSubclasse(
        character.classeId,
        normalizarHabilidadesEquipadas(character.classeId, character.habilidadesEquipadas),
        null
      ),
    });
  });
}

/**
 * Equipa, num espaço (ataqueBasico, habilidadeEspecial ou ultimate), a habilidade da classe ou a de kit
 * da subclasse ativa com o tier comprado. Não cobra nada.
 */
export async function equiparHabilidade(
  uid: string,
  slot: unknown,
  habilidadeId: unknown
): Promise<CharacterDocument> {
  return repositorio.executarTransacao('equiparHabilidade', async (ctx) => {
    const character = await carregarPersonagem(ctx, uid);
    const res = equiparHabilidadeNoSlot(character, slot, habilidadeId);
    if (!res.ok) {
      throw new Error(res.erro);
    }
    return salvarPersonagem(ctx, character, { habilidadesEquipadas: res.equipadas });
  });
}

/**
 * Sobe a subclasse ao próximo tier (1 a 4), em ordem, pagando ouro e fragmentos de alma.
 * O tier 4 também gasta 5 fragmentos da própria subclasse. Só vale para a subclasse do personagem.
 * Nada é gravado se faltar qualquer recurso.
 */
export async function subirTierSubclasse(
  uid: string,
  subclasseId: unknown
): Promise<CharacterDocument> {
  return repositorio.executarTransacao('subirTierSubclasse', async (ctx) => {
    let character = await carregarPersonagem(ctx, uid);

    if (typeof subclasseId !== 'string' || !subclasseId.trim()) {
      throw new Error('Subclasse inválida');
    }
    const idNormalizado = subclasseId.trim().toLowerCase();
    const subclasse = SUBCLASSES.find((s) => s.id === idNormalizado);
    if (!subclasse || subclasse.classeId !== character.classeId) {
      throw new Error('Subclasse inválida');
    }

    const tiers = character.subclasseTiers ?? {};
    const tierAtual = tiers[subclasse.id];
    if (character.subclasseAtualId !== subclasse.id || tierAtual === undefined) {
      throw new Error('Subclasse não desbloqueada');
    }
    if (tierAtual >= GAME_CONFIG.SUBCLASSE_TIER_MAX) {
      throw new Error('Tier máximo atingido');
    }

    const proximoTier = tierAtual + 1;
    const custo = custoDoTier(proximoTier);
    const original = character;
    const motivo = `Tier ${proximoTier} da subclasse ${subclasse.nome}`;

    character = alterarSaldoEm(ctx, character, 'ouro', -custo.ouro, motivo).character;
    character = alterarSaldoEm(ctx, character, 'fragmentosAlma', -custo.fragmentosAlma, motivo).character;

    let fragmentosSubclasse = character.fragmentosSubclasse ?? {};
    if (custo.fragmentosSubclasse > 0) {
      const saldo = fragmentosSubclasse[subclasse.id] ?? 0;
      if (saldo < custo.fragmentosSubclasse) {
        throw new Error('Fragmentos de subclasse insuficientes');
      }
      fragmentosSubclasse = { ...fragmentosSubclasse, [subclasse.id]: saldo - custo.fragmentosSubclasse };
      ctx.registrarTransacao({
        id: novoIdTransacao(),
        uid: character.uid,
        tipo: 'perda',
        quantidade: custo.fragmentosSubclasse,
        moeda: 'fragmentosSubclasse',
        motivo,
        timestamp: new Date().toISOString(),
      });
    }

    return salvarPersonagem(ctx, original, {
      ouro: character.ouro,
      fragmentosAlma: character.fragmentosAlma,
      fragmentosSubclasse,
      subclasseTiers: { ...tiers, [subclasse.id]: proximoTier },
    });
  });
}

/**
 * Reforço de Habilidade (2.2.2): sobe 1 nível (0 a 30) gastando essência de habilidade.
 * Cada nível soma % nos 7 atributos (até +25% no nível 30).
 */
export async function reforcarHabilidade(uid: string): Promise<CharacterDocument> {
  return repositorio.executarTransacao('reforcarHabilidade', async (ctx) => {
    const character = await carregarPersonagem(ctx, uid);
    const proximo = proximoNivelReforco(character.reforcoHabilidade, character.essenciaHabilidade);
    if (!proximo) {
      throw new Error('Reforço no nível máximo');
    }
    if (proximo.motivo === 'essenciaInsuficiente') {
      throw new Error(MENSAGEM_SALDO_INSUFICIENTE.essenciaHabilidade);
    }
    const pago = alterarSaldoEm(
      ctx,
      character,
      'essenciaHabilidade',
      -proximo.custo,
      `Reforço de Habilidade nível ${proximo.nivel}`
    ).character;
    return salvarPersonagem(ctx, character, {
      essenciaHabilidade: pago.essenciaHabilidade,
      reforcoHabilidade: proximo.nivel,
    });
  });
}

/**
 * Ascensão de Habilidade (2.2.1): sobe do A0 ao A10, 1 fragmento de ascensão por passo.
 * Só libera com o Reforço no nível 30.
 */
export async function ascenderHabilidade(uid: string): Promise<CharacterDocument> {
  return repositorio.executarTransacao('ascenderHabilidade', async (ctx) => {
    const character = await carregarPersonagem(ctx, uid);
    const proxima = proximaAscensao(
      character.ascensaoHabilidade,
      character.reforcoHabilidade,
      character.fragmentosAscensao
    );
    if (!proxima) {
      throw new Error('Ascensão no nível máximo');
    }
    if (proxima.motivo === 'reforcoIncompleto') {
      throw new Error('Ascensão bloqueada: Reforço de Habilidade abaixo do nível 30');
    }
    if (proxima.motivo === 'fragmentosInsuficientes') {
      throw new Error(MENSAGEM_SALDO_INSUFICIENTE.fragmentosAscensao);
    }
    const passo = PASSOS_ASCENSAO[proxima.ascensao - 1];
    const pago = alterarSaldoEm(
      ctx,
      character,
      'fragmentosAscensao',
      -ASCENSAO_CUSTO_FRAGMENTOS,
      `Ascensão A${proxima.ascensao}: ${ROTULO_ESPACO_ASCENSAO[passo.espaco]} nível ${passo.nivelHabilidade}`
    ).character;
    return salvarPersonagem(ctx, character, {
      fragmentosAscensao: pago.fragmentosAscensao,
      ascensaoHabilidade: proxima.ascensao,
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

/** Algum bônus percentual do equipamento ou dos emblemas (dano, crítico, efeitos) que o motor precisa ler. */
function temPercentuais(ficha: ReturnType<typeof calcularFichaEquipamento>): boolean {
  const p = ficha.percentuais;
  return p.danoFisico !== 0 || p.danoMagico !== 0 || p.chanceCritico !== 0 || p.chanceEfeitos !== 0;
}

/** Monta o personagem para o combate: HP cheio, Sobreescudo e atributos com o Reforço de Habilidade e o equipamento. */
function combatenteDoPersonagem(current: CharacterDocument): Combatente {
  // A ficha de combate do equipamento: o motor só lê o que está aqui (arma: dano, tipo, elemento e status)
  const ficha = calcularFichaEquipamento(current.equipamento, current.armas, current.armaduras, emblemasEquipadosDe(current));
  const arma = ficha.arma;
  const emblemasCombate = emblemasNoCombate(ficha.emblemas);
  // Habilidades de armadura que dependem do estado da luta (dano e crítico condicionais, Heroísmo)
  const habilidadesNoMotor = Object.fromEntries(
    Object.entries(ficha.habilidades).filter(([id]) => HABILIDADES_ARMADURA_NO_MOTOR.has(id))
  );
  return {
    nome: current.nome,
    racaId: current.racaId,
    classeId: current.classeId,
    linhagem: current.linhagem,
    nivel: current.nivel,
    hp: current.hpMax,
    hpMax: current.hpMax,
    sobreescudo: current.sobreescudoMax,
    atributos: atributosEfetivos(current),
    habilidadesEquipadas: current.habilidadesEquipadas,
    subclasseAtualId: current.subclasseAtualId,
    subclasseTiers: current.subclasseTiers,
    ascensaoHabilidade: current.ascensaoHabilidade,
    ouro: current.ouro,
    mitigacao: mitigacaoDoEquipamento(ficha),
    // Resistência elemental das habilidades de armadura: modificador negativo = menos dano recebido do elemento
    ...(Object.keys(ficha.resistenciaElemental).length > 0
      ? {
          modificadoresElementais: Object.fromEntries(
            Object.entries(ficha.resistenciaElemental).map(([el, v]) => [el, -(v as number)])
          ),
        }
      : {}),
    ...(arma?.subtipoFisico ? { tipoDanoFisico: arma.subtipoFisico } : {}),
    ...(arma || Object.keys(habilidadesNoMotor).length > 0 || emblemasCombate || temPercentuais(ficha)
      ? {
          equipamento: {
            bonusDanoFisicoPercentual: ficha.percentuais.danoFisico,
            bonusDanoMagicoPercentual: ficha.percentuais.danoMagico,
            bonusChanceCriticoPontos: ficha.percentuais.chanceCritico,
            bonusChanceEfeitosPontos: ficha.percentuais.chanceEfeitos,
            statusArma: arma?.status ?? [],
            elementosArma: arma?.elementos ?? [],
            habilidadesArmadura: habilidadesNoMotor,
            ...(emblemasCombate ? { emblemas: emblemasCombate } : {}),
            sobreescudoMaximo: current.sobreescudoMax,
          },
        }
      : {}),
  };
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
  await exigirSistemaLigado(uid, 'combate');
  const monstro = await monstroEfetivo(monsterId, MONSTERS_MAP[monsterId]);
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
    const combatentePersonagem = combatenteDoPersonagem(current);
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

export interface RespostaCacada extends RespostaCombate {
  cacada: {
    monstroId: string;
    estrela: number;
    drops: DropSorteado[];
    /** XP do monstro antes da trava contra farm. */
    xpBase: number;
    /** XP que entrou de fato (com a trava e a passiva racial). */
    xpGanho: number;
    /** Estrela cujo monstro-chave foi vencido pela primeira vez nesta caçada (abre a seguinte). */
    chaveVencida?: number;
  };
}

/**
 * Provação da Caçada: valida no servidor a estrela (nível e monstro-chave anterior), resolve a luta e aplica
 * XP (com a trava contra farm), ouro, drops no inventário e o progresso, tudo na mesma transação.
 * Derrota: perde até 50 de ouro (regra de morte). Reenvio com o mesmo combateId devolve o resultado gravado.
 */
export async function executarCacada(
  uid: string,
  monstroId: unknown,
  opcoes: OpcoesCombate
): Promise<RespostaCacada> {
  await exigirSistemaLigado(uid, 'cacada');
  const combateId = opcoes.combateId ?? `cac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const idRegistro = idDoRegistroCombate(uid, combateId);

  return repositorio.executarTransacao('cacada', async (ctx) => {
    const anterior = await ctx.lerCombate(idRegistro);
    const current = await carregarPersonagem(
      ctx,
      uid,
      'Personagem não encontrado. Crie um personagem antes de caçar.'
    );

    if (anterior) {
      if (!anterior.resposta.cacada) {
        throw new Error('Identificador de combate já usado fora da Caçada.');
      }
      return {
        ...anterior.resposta,
        resultado: anterior.resposta.resultado as ResultadoCombate,
        character: current,
        combateId,
        repetido: true,
        cacada: anterior.resposta.cacada,
      };
    }

    const entradaCacada = validarEntradaCacada(monstroId, current.nivel, current.cacadaChavesVencidas);
    if (!entradaCacada.ok) {
      throw new Error(MENSAGEM_BLOQUEIO_CACADA[entradaCacada.motivo]);
    }
    const { dados, estrela } = entradaCacada;
    const monstro = (await monstroEfetivo(entradaCacada.monstro.id, entradaCacada.monstro)) ?? entradaCacada.monstro;

    const combatentePersonagem = combatenteDoPersonagem(current);
    const entrada = structuredClone(combatentePersonagem);
    const resultado = resolverCombate(combatentePersonagem, monstro, opcoes.seed);

    const xpBase = monstro.xpConcedido;
    let drops: DropSorteado[] = [];
    let chaveVencida: number | undefined;
    if (resultado.vencedor === 'personagem') {
      // XP curto com a trava contra farm; a passiva racial de XP entra por cima
      resultado.xpGanho = calcularXpComBonusRacial(
        xpDaCacada(xpBase, estrela.nivelMinimo, current.nivel),
        current.racaId
      );
      const sorteio = sorteioDeDrops(opcoes.seed);
      drops = [
        ...sortearDrops(dados.drops, sorteio, current.bonusChanceDrop ?? 0),
        ...sortearDropsExtras(
          dados.drops,
          dados.estrela,
          sorteio,
          bonusDiversoDeArmadura(combatentePersonagem.equipamento?.habilidadesArmadura)
        ),
        ...sortearOrbesDaCacada(dados.drops, sorteio, current.bonusChanceDrop ?? 0),
      ];
      if (dados.chave && !(current.cacadaChavesVencidas ?? []).includes(dados.estrela)) {
        chaveVencida = dados.estrela;
      }
    } else {
      resultado.xpGanho = 0;
    }

    const pos = aplicarResultadoCombateEm(ctx, current, resultado, monstro.nome);
    let character = pos.character;
    const mensagens = [...pos.mensagens];

    if (resultado.vencedor === 'personagem') {
      const inventario = { ...(character.inventario ?? {}) };
      for (const d of drops) inventario[d.materialId] = (inventario[d.materialId] ?? 0) + d.quantidade;
      const chaves = chaveVencida
        ? [...(character.cacadaChavesVencidas ?? []), chaveVencida].sort((a, b) => a - b)
        : character.cacadaChavesVencidas ?? [];
      character = salvarPersonagem(ctx, character, { inventario, cacadaChavesVencidas: chaves });

      mensagens.push(
        `Drops: ${drops.map((d) => `${nomeDoItem(d.materialId)} x${d.quantidade}`).join(', ')}.`
      );
      if (resultado.xpGanho < xpBase) {
        mensagens.push(`XP da Caçada reduzido pelo seu nível (${resultado.xpGanho} de ${xpBase}).`);
      }
      if (chaveVencida) {
        mensagens.push(
          chaveVencida < 9
            ? `Monstro-chave vencido! A estrela ${chaveVencida + 1}★ da Caçada foi liberada (se você tiver o nível).`
            : 'Monstro-chave vencido!'
        );
      }
    }

    const cacada = { monstroId: monstro.id, estrela: dados.estrela, drops, xpBase, xpGanho: resultado.xpGanho, ...(chaveVencida ? { chaveVencida } : {}) };
    const registro: RegistroCombate = {
      id: idRegistro,
      uid,
      monstroId: monstro.id,
      seed: opcoes.seed,
      vencedor: resultado.vencedor,
      xpGanho: resultado.xpGanho,
      ouroGanho: resultado.ouroGanho,
      criadoEm: new Date().toISOString(),
      entrada: { combatente: entrada, monstroId: monstro.id, seed: opcoes.seed, modo: 'cacada' },
      resposta: { resultado, levelUps: pos.levelUps, transaction: pos.transaction, mensagens, cacada },
    };
    ctx.gravarCombate(registro);

    return { ...pos, character, mensagens, resultado, combateId, repetido: false, cacada };
  });
}

export interface RespostaCampanhaLuta extends RespostaCombate {
  campanha: {
    vencedor: 'personagem' | 'monstro';
    monstroNome: string;
    xpGanho: number;
    ouroGanho: number;
    /** O progresso depois da luta: quem vence fica onde está; quem perde volta ao ponto salvo. */
    progresso: ProgressoDaCampanha;
    /** Até quando a área de monstros descansa (ms desde 1970). */
    descansaAte: number;
    /** O que as missões fizeram com esta luta (objetivo andou, missão concluída com recompensa). */
    missoes?: AvisosDeMissoes;
  };
}

/**
 * Luta numa área de monstros da Campanha (5.5-3 e 5.5-10), com as decisões do Yuri de 18/10/2026: a recompensa é só XP
 * e ouro (sem materiais); quem perde NÃO perde nada e volta ao último ponto salvo; e a área descansa um tempo depois
 * de cada luta, vença quem vencer. A área precisa estar no mapa publicado e o jogador dentro dela (a posição enviada
 * vale como checkpoint). A semente é do servidor e o reenvio com o mesmo combateId devolve o resultado gravado.
 */
export async function campanhaLutar(
  uid: string,
  objetoId: unknown,
  opcoes: { seed: number; combateId?: string; posicao?: unknown; agora?: Date }
): Promise<RespostaCampanhaLuta> {
  await exigirSistemaLigado(uid, 'campanha');
  const combateId = opcoes.combateId ?? `camp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const idRegistro = idDoRegistroCombate(uid, combateId);
  const agora = opcoes.agora ?? new Date();

  // o mundo publicado e o monstro são lidos ANTES da transação (leituras com cache); um erro aqui só vale se não for um reenvio
  const previo = await getCharacterByUid(uid);
  if (!previo) throw new Error('Personagem não encontrado.');
  let preparo: { mundo: MundoDoJogador; monstro: MonsterDefinition | null } | { erro: unknown };
  let defsAtivas: Record<string, MissaoDados> = {};
  try {
    const mundo = await mundoDoJogador(previo, agora.toISOString());
    if (!mundo) throw new ErroDaCampanha('A Campanha ainda não começou.');
    const area = typeof objetoId === 'string' ? mundo.mapa.dados.objetos.find((o) => o.id === objetoId && o.tipo === 'cacada') : undefined;
    const base = area?.monstroId;
    const monstro = base ? await monstroEfetivo(base, MONSTERS_MAP[base] ?? MONSTROS_CACADA_MAP[base] ?? CHEFES_ESPECIAIS_MAP[base]) : null;
    preparo = { mundo, monstro };
    defsAtivas = await lerMissoesPublicadas(idsDasMissoes(mundo.progresso.missoes, 'ativa'));
  } catch (erro) {
    preparo = { erro: erro instanceof ErroMonstroIndisponivel ? new ErroDaCampanha(erro.message) : erro };
  }

  return repositorio.executarTransacao('campanhaLuta', async (ctx) => {
    const anterior = await ctx.lerCombate(idRegistro);
    const current = await carregarPersonagem(ctx, uid);

    if (anterior) {
      const c = anterior.resposta.campanha;
      if (!c) throw new Error('Identificador de combate já usado fora da Campanha.');
      return {
        character: current,
        levelUps: anterior.resposta.levelUps,
        transaction: anterior.resposta.transaction,
        mensagens: anterior.resposta.mensagens,
        resultado: anterior.resposta.resultado as ResultadoCombate,
        combateId,
        repetido: true,
        campanha: {
          vencedor: anterior.vencedor as 'personagem' | 'monstro',
          monstroNome: c.monstroNome,
          xpGanho: anterior.xpGanho,
          ouroGanho: anterior.ouroGanho,
          progresso: c.progresso,
          descansaAte: c.descansaAte,
        },
      };
    }

    if ('erro' in preparo) throw preparo.erro;
    const { mundo, monstro } = preparo;
    if (previo.campanha?.mapaId !== current.campanha?.mapaId || previo.campanha?.atualizadoEm !== current.campanha?.atualizadoEm) {
      throw new ErroDaCampanha('Seu progresso mudou enquanto isso. Tente de novo.');
    }
    const r = planejarLuta(mundo.progresso, mundo.mapa.dados, objetoId, opcoes.posicao, agora.toISOString(), agora.getTime(), situacaoDoJogador(current, mundo.progresso));
    if (!r.ok) throw new ErroDaCampanha(r.erro, 'descansaAte' in r ? r.descansaAte : undefined);
    if (!monstro) throw new ErroDaCampanha('O monstro desta área ainda não existe no jogo.');
    const { plano } = r;

    const combatente = combatenteDoPersonagem(current);
    const entrada = structuredClone(combatente);
    const resultado = resolverCombate(combatente, monstro, opcoes.seed);
    const venceu = resultado.vencedor === 'personagem';

    let pos: ResultadoPosCombate;
    if (venceu) {
      // só XP e ouro, sem a trava da Caçada (o descanso da área faz esse papel); a passiva racial de XP entra por cima
      resultado.xpGanho = calcularXpComBonusRacial(monstro.xpConcedido, current.racaId);
      pos = aplicarResultadoCombateEm(ctx, current, resultado, monstro.nome);
    } else {
      // derrota sem penalidade: nada de ouro perdido; a vida volta ao máximo na próxima luta, como sempre
      resultado.xpGanho = 0;
      resultado.ouroGanho = 0;
      resultado.ouroPerdido = 0;
      resultado.personagemFinal.ouro = current.ouro;
      resultado.mensagens = resultado.mensagens.filter((m) => !m.includes('A morte cobra seu preço'));
      resultado.mensagens.push(`${current.nome} sucumbiu perante ${monstro.nome}... Nada foi perdido: você volta ao último ponto salvo.`);
      pos = { character: current, levelUps: 0, mensagens: [...resultado.mensagens] };
    }

    let progresso = venceu ? plano.progressoVitoria : plano.progressoDerrota;
    // a vitória anda os objetivos de "derrotar" das missões em andamento; a que concluir paga a recompensa junto
    let avisos: AvisosDeMissoes = SEM_AVISOS;
    let patchDeMissoes: Partial<CharacterDocument> = {};
    if (venceu) {
      const rm = processarMissoes({ missoes: progresso.missoes, defs: defsAtivas, eventos: [{ tipo: 'derrotar', monstroId: monstro.id }], nivel: pos.character.nivel, inventario: pos.character.inventario ?? {}, agora: agora.toISOString() });
      if (JSON.stringify(rm.missoes) !== JSON.stringify(progresso.missoes ?? {})) progresso = { ...progresso, missoes: rm.missoes };
      const concluidas = rm.concluidas.flatMap((id) => (defsAtivas[id] ? [{ id, def: defsAtivas[id] }] : []));
      if (concluidas.length) {
        const recompensa = aplicarRecompensasDeMissoesEm(ctx, pos.character, concluidas);
        patchDeMissoes = recompensa.patch;
        avisos = { iniciadas: [], concluidas: recompensa.avisos };
      }
    }
    const character = salvarPersonagem(ctx, pos.character, { campanha: progresso, ...patchDeMissoes });
    const campanha = { vencedor: resultado.vencedor, monstroNome: monstro.nome, xpGanho: resultado.xpGanho, ouroGanho: resultado.ouroGanho, progresso, descansaAte: plano.descansaAte, ...(temAvisos(avisos) ? { missoes: avisos } : {}) };
    const registro: RegistroCombate = {
      id: idRegistro,
      uid,
      monstroId: monstro.id,
      seed: opcoes.seed,
      vencedor: resultado.vencedor,
      xpGanho: resultado.xpGanho,
      ouroGanho: resultado.ouroGanho,
      criadoEm: agora.toISOString(),
      entrada: { combatente: entrada, monstroId: monstro.id, seed: opcoes.seed, modo: 'campanha' },
      resposta: {
        resultado,
        levelUps: pos.levelUps,
        transaction: pos.transaction,
        mensagens: pos.mensagens,
        campanha: { objetoId: plano.objetoId, mapaId: progresso.mapaId, monstroNome: monstro.nome, descansaAte: plano.descansaAte, progresso },
      },
    };
    ctx.gravarCombate(registro);

    return { ...pos, character, resultado, combateId, repetido: false, campanha };
  });
}

// ---------------------------------------------------------------------------
// Provação de Batalha Sangrenta
// ---------------------------------------------------------------------------

export interface OpcoesBatalhaSangrenta {
  seed: number;
  combateId?: string;
  /** Só os testes passam o seu; o padrão é o relógio do servidor. */
  agora?: Date;
}

export interface OndaBatalhaResposta {
  monstroId: string;
  nome: string;
  chefe: boolean;
  vencedor: 'personagem' | 'monstro';
  hpInicial: number;
  hpFinal: number;
  turnos: number;
  /** O log da luta; não vem quando a resposta é a repetida (reenvio com o mesmo combateId). */
  resultado?: ResultadoCombate;
}

export interface RespostaBatalhaSangrenta {
  character: CharacterDocument;
  combateId: string;
  repetido: boolean;
  dificuldade: string;
  estrela: number;
  ondas: OndaBatalhaResposta[];
  ondasVencidas: number;
  /** Todos os chefes foram vencidos: a batalha inteira. */
  chefeVencido: boolean;
  fragmentosAlma: number;
  fragmentosSubclasse: { subclasseId: string; quantidade: number } | null;
  /** Vitória: 150; derrota: 50 de consolo. */
  ouro: number;
  /** 10 na primeira vitória em cada dificuldade. */
  diamantes: number;
  tentativasRestantes: number;
  mensagens: string[];
}

/**
 * Batalha Sangrenta: 4 lutas comuns e o(s) chefe(s) Especial(is), com o HP passando de uma luta para a outra, em
 * cinco dificuldades (cada uma abre ao vencer a anterior). Vencer tudo dá fragmentos de alma dentro da faixa da
 * dificuldade, 150 de ouro, 10 Diamantes na primeira vitória em cada dificuldade e, no Inferno, 20% de chance de
 * fragmentos de uma subclasse sorteada; cair dá só 50 de ouro. Não dá XP nem drops. 3 tentativas por dia no total (o dia vale em Brasília), gastas ao começar. Tudo é conferido no
 * servidor. Reenvio com o mesmo combateId devolve o resultado gravado.
 */
export async function executarBatalhaSangrenta(
  uid: string,
  dificuldadeId: unknown,
  opcoes: OpcoesBatalhaSangrenta
): Promise<RespostaBatalhaSangrenta> {
  await exigirSistemaLigado(uid, 'batalhaSangrenta');
  const combateId = opcoes.combateId ?? `bs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const idRegistro = idDoRegistroCombate(uid, combateId);
  const agora = opcoes.agora ?? new Date();

  return repositorio.executarTransacao('batalhaSangrenta', async (ctx) => {
    const anterior = await ctx.lerCombate(idRegistro);
    const current = await carregarPersonagem(ctx, uid, 'Personagem não encontrado. Crie um personagem antes de batalhar.');

    if (anterior) {
      const resumo = anterior.resposta.batalhaSangrenta;
      if (!resumo) throw new Error('Identificador de combate já usado fora da Batalha Sangrenta.');
      return { ...resumo, character: current, combateId, repetido: true, mensagens: anterior.resposta.mensagens };
    }

    const entrada = conferirEntradaBatalha(dificuldadeId, current.nivel, current.batalhaSangrenta, current.batalhaSangrentaVencidas, agora);
    if (!entrada.ok) throw new Error(MENSAGEM_BLOQUEIO_BATALHA[entrada.motivo]);
    const dificuldade = entrada.dificuldade;

    const plano = montarOndas(dificuldade, opcoes.seed);
    const entradaCombatente = structuredClone(combatenteDoPersonagem(current));

    const ondas: OndaBatalhaResposta[] = [];
    let hpAtual = entradaCombatente.hp;
    let ondasVencidas = 0;
    for (const [indice, onda] of plano.entries()) {
      const baseDoCodigo = MONSTROS_CACADA_MAP[onda.monstroId] ?? CHEFES_ESPECIAIS_MAP[onda.monstroId];
      const monstro = (await monstroEfetivo(onda.monstroId, baseDoCodigo)) ?? baseDoCodigo;
      const combatente = combatenteDoPersonagem(current);
      combatente.hp = hpAtual;
      const resultado = resolverCombate(combatente, monstro, sementeDaOnda(opcoes.seed, indice));
      const venceu = resultado.vencedor === 'personagem';
      const hpFinal = venceu ? resultado.personagemFinal.hp : 0;
      ondas.push({
        monstroId: monstro.id,
        nome: monstro.nome,
        chefe: onda.chefe,
        vencedor: resultado.vencedor,
        hpInicial: hpAtual,
        hpFinal,
        turnos: resultado.logTurnos.length,
        resultado,
      });
      if (!venceu) break;
      ondasVencidas++;
      hpAtual = hpFinal;
    }
    const venceuTudo = ondasVencidas === plano.length;

    const primeiraVitoria = venceuTudo && !(current.batalhaSangrentaVencidas ?? []).includes(dificuldade.id);
    const recompensa = recompensaDaBatalha(dificuldade, venceuTudo, opcoes.seed, primeiraVitoria);
    const estadoTentativas: EstadoBatalhaSangrenta = gastarTentativa(current.batalhaSangrenta, agora);
    const restantes = tentativasRestantes(estadoTentativas, agora);
    const motivo = `Batalha Sangrenta (${dificuldade.nome})`;

    let character = current;
    if (recompensa.fragmentosAlma > 0) {
      character = alterarSaldoEm(ctx, character, 'fragmentosAlma', recompensa.fragmentosAlma, motivo).character;
    }
    if (recompensa.ouro > 0) {
      character = alterarSaldoEm(ctx, character, 'ouro', recompensa.ouro, `${motivo}: ${venceuTudo ? 'vitória' : 'derrota'}`).character;
    }
    if (recompensa.diamantes > 0) {
      character = alterarSaldoEm(ctx, character, 'diamantes', recompensa.diamantes, `${motivo}: primeira vitória`).character;
    }
    let fragmentosSubclasse = character.fragmentosSubclasse ?? {};
    if (recompensa.fragmentosSubclasse) {
      const { subclasseId, quantidade } = recompensa.fragmentosSubclasse;
      fragmentosSubclasse = { ...fragmentosSubclasse, [subclasseId]: (fragmentosSubclasse[subclasseId] ?? 0) + quantidade };
      ctx.registrarTransacao({
        id: novoIdTransacao(),
        uid: character.uid,
        tipo: 'ganho',
        quantidade,
        moeda: 'fragmentosSubclasse',
        motivo: `${motivo}: ${SUBCLASSES.find((sc) => sc.id === subclasseId)?.nome ?? subclasseId}`,
        timestamp: new Date().toISOString(),
      });
    }
    const vencidas = primeiraVitoria
      ? [...(character.batalhaSangrentaVencidas ?? []), dificuldade.id]
      : character.batalhaSangrentaVencidas ?? [];
    character = salvarPersonagem(ctx, character, { fragmentosSubclasse, batalhaSangrenta: estadoTentativas, batalhaSangrentaVencidas: vencidas });

    const nomeSubclasse = recompensa.fragmentosSubclasse
      ? SUBCLASSES.find((sc) => sc.id === recompensa.fragmentosSubclasse?.subclasseId)?.nome ?? recompensa.fragmentosSubclasse.subclasseId
      : null;
    const mensagens: string[] = [
      venceuTudo
        ? `Batalha Sangrenta (${dificuldade.nome}) vencida!`
        : `Você caiu na onda ${ondasVencidas + 1} de ${plano.length} (${dificuldade.nome}). Venceu ${ondasVencidas}.`,
      venceuTudo
        ? `Fragmentos de alma: +${recompensa.fragmentosAlma}${recompensa.fragmentosSubclasse ? `; fragmentos de ${nomeSubclasse}: +${recompensa.fragmentosSubclasse.quantidade}` : ''}. Ouro: +${recompensa.ouro}.${recompensa.diamantes > 0 ? ` Primeira vitória: +${recompensa.diamantes} Diamantes!` : ''}`
        : `Ouro de consolo: +${recompensa.ouro}.`,
      `Tentativas restantes hoje: ${restantes}.`,
    ];

    const resumo = {
      dificuldade: dificuldade.id,
      estrela: dificuldade.estrela,
      ondas: ondas.map(({ resultado: _log, ...resto }) => resto),
      ondasVencidas,
      chefeVencido: venceuTudo,
      fragmentosAlma: recompensa.fragmentosAlma,
      fragmentosSubclasse: recompensa.fragmentosSubclasse,
      ouro: recompensa.ouro,
      diamantes: recompensa.diamantes,
      tentativasRestantes: restantes,
    };
    const ultimoChefe = [...plano].reverse().find((o) => o.chefe) ?? plano[plano.length - 1];
    const registro: RegistroCombate = {
      id: idRegistro,
      uid,
      monstroId: ultimoChefe?.monstroId ?? '',
      seed: opcoes.seed,
      vencedor: venceuTudo ? 'personagem' : 'monstro',
      xpGanho: 0,
      ouroGanho: recompensa.ouro,
      criadoEm: new Date().toISOString(),
      entrada: { combatente: entradaCombatente, ondas: plano, dificuldade: dificuldade.id, seed: opcoes.seed, modo: 'batalhaSangrenta' },
      resposta: { resultado: null, levelUps: 0, mensagens, batalhaSangrenta: resumo },
    };
    ctx.gravarCombate(registro);

    return { ...resumo, character, combateId, repetido: false, ondas, mensagens };
  });
}

// ---------------------------------------------------------------------------
// Provação da Torre Celestial
// ---------------------------------------------------------------------------

export interface RespostaTorre {
  character: CharacterDocument;
  combateId: string;
  repetido: boolean;
  resultado: ResultadoCombate;
  levelUps: number;
  transaction?: TransactionDocument;
  mensagens: string[];
  torre: ResumoTorreRegistro;
}

/**
 * Torre Celestial: o personagem enfrenta o andar seguinte ao mais alto que já venceu (sem voltar, sem limite
 * diário). Vida e Sobreescudo voltam ao máximo a cada andar. Vitória: avança o andar e dá o XP fixo (só até o
 * nível 15), a essência de habilidade (andares 1 a 199), 5 Diamantes (a partir do 200) e 1 fragmento de ascensão nos
 * andares de chefe 200 a 300. Derrota: só perde a luta. Tudo é conferido no servidor; reenvio com o mesmo
 * combateId devolve o resultado gravado.
 */
export async function executarTorre(uid: string, opcoes: OpcoesCombate): Promise<RespostaTorre> {
  await exigirSistemaLigado(uid, 'torre');
  const combateId = opcoes.combateId ?? `tor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const idRegistro = idDoRegistroCombate(uid, combateId);

  return repositorio.executarTransacao('torre', async (ctx) => {
    const anterior = await ctx.lerCombate(idRegistro);
    const current = await carregarPersonagem(ctx, uid, 'Personagem não encontrado. Crie um personagem antes de subir a Torre.');

    if (anterior) {
      const resumo = anterior.resposta.torre;
      if (!resumo) throw new Error('Identificador de combate já usado fora da Torre Celestial.');
      return {
        character: current,
        combateId,
        repetido: true,
        resultado: anterior.resposta.resultado as ResultadoCombate,
        levelUps: anterior.resposta.levelUps,
        ...(anterior.resposta.transaction ? { transaction: anterior.resposta.transaction } : {}),
        mensagens: anterior.resposta.mensagens,
        torre: resumo,
      };
    }

    const entrada = conferirEntradaTorre(current.nivel, current.torreAndar);
    if (!entrada.ok) throw new Error(MENSAGEM_BLOQUEIO_TORRE[entrada.motivo]);
    const andar = entrada.andar;
    const identidade = identidadeDoAndar(andar);
    const monstro = montarMonstroDaTorre(andar);

    const combatentePersonagem = combatenteDoPersonagem(current);
    const entradaCombatente = structuredClone(combatentePersonagem);
    const resultado = resolverCombate(combatentePersonagem, monstro, opcoes.seed);
    const venceu = resultado.vencedor === 'personagem';

    const recompensa = recompensaDoAndar(andar, current.nivel);
    // A Torre não dá ouro; o XP é o fixo do andar (com a passiva racial de XP por cima) e a derrota não tem penalidade
    resultado.ouroGanho = 0;
    resultado.xpGanho = venceu && recompensa.xp > 0 ? calcularXpComBonusRacial(recompensa.xp, current.racaId) : 0;

    let character = current;
    let levelUps = 0;
    let transaction: TransactionDocument | undefined;
    const mensagens: string[] = [...resultado.mensagens];
    const motivo = `Torre Celestial (andar ${andar})`;

    if (venceu) {
      const pos = aplicarResultadoCombateEm(ctx, current, resultado, monstro.nome);
      character = pos.character;
      levelUps = pos.levelUps;
      transaction = pos.transaction;
      mensagens.splice(0, mensagens.length, ...pos.mensagens);

      if (recompensa.essenciaHabilidade > 0) {
        character = alterarSaldoEm(ctx, character, 'essenciaHabilidade', recompensa.essenciaHabilidade, motivo).character;
      }
      if (recompensa.diamantes > 0) {
        character = alterarSaldoEm(ctx, character, 'diamantes', recompensa.diamantes, motivo).character;
      }
      if (recompensa.fragmentosAscensao > 0) {
        character = alterarSaldoEm(ctx, character, 'fragmentosAscensao', recompensa.fragmentosAscensao, motivo).character;
      }
      character = salvarPersonagem(ctx, character, { torreAndar: andar });

      mensagens.push(
        `Torre Celestial: andar ${andar} vencido${identidade.chefe ? ` (chefe ${identidade.nome})` : ''}.`
      );
      const ganhos = [
        resultado.xpGanho > 0 ? `XP +${resultado.xpGanho}` : null,
        recompensa.essenciaHabilidade > 0 ? `essência de habilidade +${recompensa.essenciaHabilidade}` : null,
        recompensa.diamantes > 0 ? `Diamantes +${recompensa.diamantes}` : null,
        recompensa.fragmentosAscensao > 0 ? `fragmento de ascensão +${recompensa.fragmentosAscensao}` : null,
      ].filter((g): g is string => g !== null);
      if (ganhos.length > 0) mensagens.push(`Recompensas: ${ganhos.join(', ')}.`);
      if (andar >= TORRE.andares) mensagens.push('Você chegou ao topo da Torre Celestial!');
    } else {
      mensagens.push(`Você caiu no andar ${andar} da Torre Celestial. Pode tentar de novo.`);
    }

    const torre: ResumoTorreRegistro = {
      andar,
      chefe: identidade.chefe,
      monstroId: identidade.monstroId,
      nome: identidade.nome,
      venceu,
      xpGanho: venceu ? resultado.xpGanho : 0,
      essenciaHabilidade: venceu ? recompensa.essenciaHabilidade : 0,
      diamantes: venceu ? recompensa.diamantes : 0,
      fragmentosAscensao: venceu ? recompensa.fragmentosAscensao : 0,
      proximoAndar: venceu ? (andar < TORRE.andares ? andar + 1 : null) : andar,
    };
    const registro: RegistroCombate = {
      id: idRegistro,
      uid,
      monstroId: identidade.monstroId,
      seed: opcoes.seed,
      vencedor: resultado.vencedor,
      xpGanho: torre.xpGanho,
      ouroGanho: 0,
      criadoEm: new Date().toISOString(),
      entrada: { combatente: entradaCombatente, monstroId: identidade.monstroId, andar, seed: opcoes.seed, modo: 'torre' },
      resposta: { resultado, levelUps, ...(transaction ? { transaction } : {}), mensagens, torre },
    };
    ctx.gravarCombate(registro);

    return { character, combateId, repetido: false, resultado, levelUps, ...(transaction ? { transaction } : {}), mensagens, torre };
  });
}

// ---------------------------------------------------------------------------
// Provação do Guerreiro
// ---------------------------------------------------------------------------

export interface OpcoesGuerreiro extends OpcoesCombate {
  /** Só os testes passam o seu; o padrão é o relógio do servidor. */
  agora?: Date;
}

export interface RespostaGuerreiro {
  character: CharacterDocument;
  combateId: string;
  repetido: boolean;
  resultado: ResultadoCombate;
  mensagens: string[];
  guerreiro: ResumoGuerreiroRegistro;
}

/**
 * Provação do Guerreiro: 10 dificuldades, um chefe com mecânica própria em cada, luta única e 1 tentativa por dia
 * por chefe (a tentativa é gasta ao começar, também na derrota). A 1 abre no nível 12 e cada outra abre ao vencer
 * o chefe da anterior. Vencer dá 4 emblemas (a raridade depende da dificuldade); perder não dá nada. Tudo é
 * conferido no servidor; reenvio com o mesmo combateId devolve o resultado gravado.
 */
export async function executarGuerreiro(uid: string, dificuldadeId: unknown, opcoes: OpcoesGuerreiro): Promise<RespostaGuerreiro> {
  await exigirSistemaLigado(uid, 'guerreiro');
  const combateId = opcoes.combateId ?? `gue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const idRegistro = idDoRegistroCombate(uid, combateId);
  const agora = opcoes.agora ?? new Date();

  return repositorio.executarTransacao('guerreiro', async (ctx) => {
    const anterior = await ctx.lerCombate(idRegistro);
    const current = await carregarPersonagem(ctx, uid, 'Personagem não encontrado. Crie um personagem antes de enfrentar o Guerreiro.');

    if (anterior) {
      const resumo = anterior.resposta.guerreiro;
      if (!resumo) throw new Error('Identificador de combate já usado fora da Provação do Guerreiro.');
      return {
        character: current,
        combateId,
        repetido: true,
        resultado: anterior.resposta.resultado as ResultadoCombate,
        mensagens: anterior.resposta.mensagens,
        guerreiro: resumo,
      };
    }

    const entrada = conferirEntradaGuerreiro(dificuldadeId, current.nivel, current.guerreiroTentativas, current.guerreiroVencidas, agora);
    if (!entrada.ok) throw new Error(MENSAGEM_BLOQUEIO_GUERREIRO[entrada.motivo]);
    const { dificuldade, chefe } = entrada;
    const monstro = montarChefeGuerreiro(dificuldade);

    const combatentePersonagem = combatenteDoPersonagem(current);
    const entradaCombatente = structuredClone(combatentePersonagem);
    const resultado = resolverCombate(combatentePersonagem, monstro, opcoes.seed);
    const venceu = resultado.vencedor === 'personagem';
    // A Provação do Guerreiro só dá emblemas: sem XP, sem ouro e sem penalidade de morte
    resultado.xpGanho = 0;
    resultado.ouroGanho = 0;

    const emblemasGanhos = venceu ? sortearEmblemas(dificuldade, sorteioDeDrops(opcoes.seed)) : [];
    const primeiraVitoria = venceu && !(current.guerreiroVencidas ?? []).includes(dificuldade);

    const novosEmblemas: EmblemaItem[] = emblemasGanhos.map((e) => ({ id: randomUUID(), tipo: e.tipoId, estrelas: 1 }));
    const character = salvarPersonagem(ctx, current, {
      guerreiroTentativas: { ...(current.guerreiroTentativas ?? {}), [String(dificuldade)]: diaDeBrasilia(agora) },
      guerreiroVencidas: primeiraVitoria ? [...(current.guerreiroVencidas ?? []), dificuldade].sort((a, b) => a - b) : current.guerreiroVencidas ?? [],
      emblemasItens: [...(current.emblemasItens ?? []), ...novosEmblemas],
    });

    const mensagens: string[] = [
      ...resultado.mensagens,
      venceu
        ? `Provação do Guerreiro: ${chefe.nome} foi derrotado! Emblemas: ${emblemasGanhos.map((e) => `${TIPO_EMBLEMA_MAP[e.tipoId].nome} (${EMBLEMA_RARIDADE_MAP[e.raridade].nome})`).join(', ')}.`
        : `Você caiu diante de ${chefe.nome}. Pode tentar de novo amanhã.`,
    ];
    const guerreiro: ResumoGuerreiroRegistro = {
      dificuldade,
      chefeId: chefe.id,
      nome: chefe.nome,
      mecanicaNome: chefe.mecanicaNome,
      venceu,
      primeiraVitoria,
      emblemas: emblemasGanhos.map((e) => ({ tipoId: e.tipoId, nome: TIPO_EMBLEMA_MAP[e.tipoId].nome, raridade: e.raridade })),
    };
    const registro: RegistroCombate = {
      id: idRegistro,
      uid,
      monstroId: chefe.id,
      seed: opcoes.seed,
      vencedor: resultado.vencedor,
      xpGanho: 0,
      ouroGanho: 0,
      criadoEm: new Date().toISOString(),
      entrada: { combatente: entradaCombatente, monstroId: chefe.id, dificuldade, seed: opcoes.seed, modo: 'guerreiro' },
      resposta: { resultado, levelUps: 0, mensagens, guerreiro },
    };
    ctx.gravarCombate(registro);

    return { character, combateId, repetido: false, resultado, mensagens, guerreiro };
  });
}

// ---------------------------------------------------------------------------
// Emblemas: equipar, desequipar e fundir
// ---------------------------------------------------------------------------

export interface RespostaEmblemas {
  character: CharacterDocument;
  /** Fusão: o emblema criado. */
  criado?: EmblemaItem;
}

/** Equipa um emblema no primeiro espaço livre (4 espaços; o mesmo tipo pode ocupar até 4). */
export function equiparEmblemaDoPersonagem(uid: string, itemId: unknown): Promise<RespostaEmblemas> {
  return repositorio.executarTransacao('equiparEmblema', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const r = equiparEmblema(current.emblemasItens ?? [], current.emblemasEquipados ?? [], itemId);
    if (!r.ok) throw new Error(MENSAGEM_BLOQUEIO_EMBLEMA[r.motivo]);
    return { character: salvarPersonagem(ctx, current, { emblemasEquipados: r.equipados }) };
  });
}

export function desequiparEmblemaDoPersonagem(uid: string, itemId: unknown): Promise<RespostaEmblemas> {
  return repositorio.executarTransacao('desequiparEmblema', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const r = desequiparEmblema(current.emblemasEquipados ?? [], itemId);
    if (!r.ok) throw new Error(MENSAGEM_BLOQUEIO_EMBLEMA[r.motivo]);
    return { character: salvarPersonagem(ctx, current, { emblemasEquipados: r.equipados }) };
  });
}

/** Funde emblemas iguais (mesmo tipo e estrela, fora dos espaços): 2 de 1★ dão 1 de 2★; 3 de 2★ dão 1 de 3★. */
export function fundirEmblemasDoPersonagem(uid: string, tipoId: unknown, estrelas: unknown): Promise<RespostaEmblemas> {
  return repositorio.executarTransacao('fundirEmblemas', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const r = fundirEmblemas(current.emblemasItens ?? [], current.emblemasEquipados ?? [], tipoId, estrelas, randomUUID());
    if (!r.ok) throw new Error(MENSAGEM_BLOQUEIO_EMBLEMA[r.motivo]);
    return { character: salvarPersonagem(ctx, current, { emblemasItens: r.itens }), criado: r.criado };
  });
}

// ---------------------------------------------------------------------------
// Forja: fabricar, evoluir, reforjar e customizar armas
// ---------------------------------------------------------------------------

export interface OpcoesForja {
  /** Gerador em [0, 1); só os testes passam o seu. O padrão usa o crypto do servidor. */
  aleatorio?: () => number;
}

const aleatorioDoServidor = (): number => randomInt(0, 2 ** 32) / 2 ** 32;

export interface RespostaForja {
  character: CharacterDocument;
  arma: ArmaPersonagem;
  transaction: TransactionDocument;
}

function estadoForja(char: CharacterDocument): EstadoForja {
  return { inventario: char.inventario ?? {}, ouro: char.ouro, armas: char.armas ?? [] };
}

/** Grava o resultado da Forja: inventário, armas e o ouro gasto (com a transação de moeda). */
function gravarForja(
  ctx: ContextoTransacao,
  current: CharacterDocument,
  plano: { inventario: Record<string, number>; ouroGasto: number; armas: ArmaPersonagem[]; arma: ArmaPersonagem },
  motivo: string
): RespostaForja {
  const pago = alterarSaldoEm(ctx, current, 'ouro', -plano.ouroGasto, motivo);
  const character = salvarPersonagem(ctx, current, {
    ouro: pago.character.ouro,
    inventario: plano.inventario,
    armas: plano.armas,
  });
  return { character, arma: plano.arma, transaction: pago.transaction };
}

/** Fabrica a primeira arma de uma árvore ou evolui a anterior (consumida). Tudo numa transação. */
export async function fabricarArma(
  uid: string,
  pedido: { baseId: unknown; categoria: unknown; armaAnteriorId?: unknown },
  opcoes: OpcoesForja = {}
): Promise<RespostaForja> {
  await exigirSistemaLigado(uid, 'forja');
  return repositorio.executarTransacao('forjaFabricar', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const plano = planejarFabricacao(estadoForja(current), pedido, {
      aleatorio: opcoes.aleatorio ?? aleatorioDoServidor,
      novoId: randomUUID,
      agora: new Date().toISOString(),
    });
    if (!plano.ok) throw new Error(MENSAGEM_BLOQUEIO_FORJA[plano.motivo]);
    const nome = plano.base.nomes[plano.arma.categoria];
    return gravarForja(ctx, current, plano, `Forja: ${plano.base.consome ? 'evoluir para' : 'fabricar'} ${nome}`);
  });
}

/** Reforjar: sorteia de novo os pontos do atributo da arma, pagando parte da receita. */
export async function reforjarArma(uid: string, armaId: unknown, opcoes: OpcoesForja = {}): Promise<RespostaForja> {
  await exigirSistemaLigado(uid, 'forja');
  return repositorio.executarTransacao('forjaReforjar', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const plano = planejarReforja(estadoForja(current), armaId, { aleatorio: opcoes.aleatorio ?? aleatorioDoServidor });
    if (!plano.ok) throw new Error(MENSAGEM_BLOQUEIO_FORJA[plano.motivo]);
    return gravarForja(ctx, current, plano, `Forja: reforjar (${plano.percentual}% da receita)`);
  });
}

/** Customização (só Mítico): +1 ponto na opção, por ouro e Bilhete de melhoria. */
export async function customizarArma(uid: string, armaId: unknown, opcao: unknown): Promise<RespostaForja> {
  await exigirSistemaLigado(uid, 'forja');
  return repositorio.executarTransacao('forjaCustomizar', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const plano = planejarCustomizacao(estadoForja(current), armaId, opcao);
    if (!plano.ok) throw new Error(MENSAGEM_BLOQUEIO_FORJA[plano.motivo]);
    return gravarForja(ctx, current, plano, `Forja: Customização (${String(opcao)})`);
  });
}

// ---------------------------------------------------------------------------
// Armaduras: fabricar peça, reforjar e usar orbes de armadura
// ---------------------------------------------------------------------------

export interface RespostaArmadura {
  character: CharacterDocument;
  armadura: ArmaduraPersonagem;
  transaction?: TransactionDocument;
}

function estadoArmaduras(char: CharacterDocument): EstadoArmaduras {
  return { inventario: char.inventario ?? {}, ouro: char.ouro, armaduras: char.armaduras ?? [] };
}

/** Fabrica uma peça de armadura: paga a receita e sorteia o atributo. Tudo numa transação. */
export async function fabricarArmadura(uid: string, pecaId: unknown, opcoes: OpcoesForja = {}): Promise<RespostaArmadura> {
  await exigirSistemaLigado(uid, 'forja');
  return repositorio.executarTransacao('armaduraFabricar', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const plano = planejarFabricacaoArmadura(estadoArmaduras(current), pecaId, {
      aleatorio: opcoes.aleatorio ?? aleatorioDoServidor,
      novoId: randomUUID,
      agora: new Date().toISOString(),
    });
    if (!plano.ok) throw new Error(MENSAGEM_BLOQUEIO_ARMADURA[plano.motivo]);
    const pago = alterarSaldoEm(ctx, current, 'ouro', -plano.ouroGasto, `Ferreiro: fabricar ${plano.peca.nome}`);
    const character = salvarPersonagem(ctx, current, { ouro: pago.character.ouro, inventario: plano.inventario, armaduras: plano.armaduras });
    return { character, armadura: plano.armadura, transaction: pago.transaction };
  });
}

/** Reforja uma peça de armadura: sorteia de novo os pontos do atributo, pagando parte da receita. */
export async function reforjarArmadura(uid: string, armaduraId: unknown, opcoes: OpcoesForja = {}): Promise<RespostaArmadura> {
  await exigirSistemaLigado(uid, 'forja');
  return repositorio.executarTransacao('armaduraReforjar', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const plano = planejarReforjaArmadura(estadoArmaduras(current), armaduraId, { aleatorio: opcoes.aleatorio ?? aleatorioDoServidor });
    if (!plano.ok) throw new Error(MENSAGEM_BLOQUEIO_ARMADURA[plano.motivo]);
    const pago = alterarSaldoEm(ctx, current, 'ouro', -plano.ouroGasto, `Ferreiro: reforjar ${plano.peca.nome} (${plano.percentual}% da receita)`);
    const character = salvarPersonagem(ctx, current, { ouro: pago.character.ouro, inventario: plano.inventario, armaduras: plano.armaduras });
    return { character, armadura: plano.armadura, transaction: pago.transaction };
  });
}

/** Usa orbes de armadura numa peça (sobe o nível; o XP acima do nível 30 se perde). */
export async function usarOrbesArmadura(
  uid: string,
  armaduraId: unknown,
  orbes: unknown
): Promise<RespostaArmadura & { xpGanho: number; nivelAntes: number; nivelDepois: number }> {
  await exigirSistemaLigado(uid, 'forja');
  return repositorio.executarTransacao('armaduraOrbes', async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const plano = planejarUsoDeOrbes(estadoArmaduras(current), armaduraId, orbes);
    if (!plano.ok) throw new Error(MENSAGEM_BLOQUEIO_ARMADURA[plano.motivo]);
    const character = salvarPersonagem(ctx, current, { inventario: plano.inventario, armaduras: plano.armaduras });
    return { character, armadura: plano.armadura, xpGanho: plano.xpGanho, nivelAntes: plano.nivelAntes, nivelDepois: plano.nivelDepois };
  });
}


// ---------------------------------------------------------------------------
// Equipamento: equipar e desequipar na ficha do personagem
// ---------------------------------------------------------------------------

export interface RespostaEquipamento {
  character: CharacterDocument;
}

async function gravarEquipamento(
  nome: string,
  uid: string,
  decidir: (current: CharacterDocument) => { ok: true; equipamento: EquipamentoPersonagem } | { ok: false; motivo: keyof typeof MENSAGEM_BLOQUEIO_EQUIPAR }
): Promise<RespostaEquipamento> {
  return repositorio.executarTransacao(nome, async (ctx) => {
    const current = await carregarPersonagem(ctx, uid);
    const r = decidir(current);
    if (!r.ok) throw new Error(MENSAGEM_BLOQUEIO_EQUIPAR[r.motivo]);
    return { character: salvarPersonagem(ctx, current, { equipamento: r.equipamento }) };
  });
}

const equipamentoDe = (c: CharacterDocument): EquipamentoPersonagem => c.equipamento ?? EQUIPAMENTO_VAZIO;

/** Equipa uma arma (uma só por vez; a que estava equipada volta para a lista). */
export function equiparArmaDoPersonagem(uid: string, armaId: unknown): Promise<RespostaEquipamento> {
  return gravarEquipamento('equiparArma', uid, (c) => equiparArma(equipamentoDe(c), c.armas ?? [], armaId));
}

export function desequiparArmaDoPersonagem(uid: string): Promise<RespostaEquipamento> {
  return gravarEquipamento('desequiparArma', uid, (c) => ({ ok: true, equipamento: desequiparArma(equipamentoDe(c)) }));
}

/** Equipa uma peça de armadura no espaço dela. */
export function equiparArmaduraDoPersonagem(uid: string, armaduraId: unknown): Promise<RespostaEquipamento> {
  return gravarEquipamento('equiparArmadura', uid, (c) => equiparPeca(equipamentoDe(c), c.armaduras ?? [], armaduraId));
}

export function desequiparEspacoDoPersonagem(uid: string, espaco: unknown): Promise<RespostaEquipamento> {
  return gravarEquipamento('desequiparEspaco', uid, (c) => desequiparEspaco(equipamentoDe(c), espaco));
}

// ---------------------------------------------------------------------------
// Campanha (5.5-3 e 5.5-8): estado, checkpoints de posição, baús e portas
// ---------------------------------------------------------------------------

export interface EstadoDaCampanha {
  /** Há um mapa inicial publicado: o jogador pode entrar no mundo. */
  iniciada: boolean;
  mensagem?: string;
  progresso?: ProgressoDaCampanha;
  mapa?: MapaPublicado;
  /** Os tilesets publicados do mapa, na ordem de `mapa.dados.tilesets` (null: não publicado). */
  tilesets?: (TilesetPublicado | null)[];
  /** A cena de abertura que este jogador ainda não viu (publicada), para tocar antes do mapa. */
  abertura?: string;
  /** Quem está jogando (nome da ficha), para a fala "Jogador" das cenas. */
  jogador?: { nome: string };
}

interface MundoDoJogador {
  progresso: ProgressoDaCampanha;
  mapa: MapaPublicado;
  /** O jogador ainda não tinha progresso gravado: este é o ponto de partida. */
  novo: boolean;
}

/** O progresso do jogador e o mapa publicado em que ele está; volta ao mapa inicial se o atual deixou de estar publicado. */
async function mundoDoJogador(char: CharacterDocument, agora: string): Promise<MundoDoJogador | null> {
  const inicialId = await mapaInicialDaCampanha();
  if (char.campanha) {
    const atual = await lerMapaPublicado(char.campanha.mapaId);
    if (atual) return { progresso: char.campanha, mapa: atual, novo: false };
  }
  if (!inicialId) return null;
  const inicial = await lerMapaPublicado(inicialId);
  if (!inicial) return null;
  return { progresso: { ...progressoInicial(inicialId, inicial.dados, agora), baus: char.campanha?.baus ?? [] }, mapa: inicial, novo: true };
}

/** Onde o jogador está no mundo e o mapa publicado, sem gravar nada. */
export async function campanhaEstado(uid: string): Promise<EstadoDaCampanha> {
  await exigirSistemaLigado(uid, 'campanha');
  const char = await getCharacterByUid(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const mundo = await mundoDoJogador(char, new Date().toISOString());
  if (!mundo) return { iniciada: false, mensagem: 'A Campanha ainda não começou.' };
  const aberturaId = mundo.progresso.cenas?.includes(CHAVE_DA_ABERTURA) ? '' : await aberturaDaCampanha();
  const abertura = aberturaId && (await lerCenaPublicada(aberturaId)) ? aberturaId : undefined;
  return { iniciada: true, progresso: mundo.progresso, mapa: mundo.mapa, tilesets: await tilesetsDoMapa(mundo.mapa), jogador: { nome: char.nome }, ...(abertura ? { abertura } : {}) };
}

/** Uma cena publicada para tocar na Campanha (diálogo de NPC, ativador ou abertura). Só leitura, sem gravar nada. */
export async function campanhaCena(uid: string, cenaId: unknown) {
  await exigirSistemaLigado(uid, 'campanha');
  const cena = typeof cenaId === 'string' && /^[a-z0-9][a-z0-9-]{1,47}$/.test(cenaId) ? await lerCenaPublicada(cenaId) : null;
  if (!cena) throw new ErroDaCampanha('Esta cena não está disponível.');
  return { id: cena.id, titulo: cena.nome, dados: cena.dados };
}

/** O que as missões fizeram numa ação, para o jogador ver. */
export interface AvisosDeMissoes {
  iniciadas: { id: string; titulo: string }[];
  concluidas: { id: string; titulo: string; mensagens: string[] }[];
  /** Quando o jogador tentou começar uma missão e não pôde. */
  motivoDoNaoComeco?: string;
}
const SEM_AVISOS: AvisosDeMissoes = { iniciadas: [], concluidas: [] };
const temAvisos = (a: AvisosDeMissoes) => a.iniciadas.length > 0 || a.concluidas.length > 0 || Boolean(a.motivoDoNaoComeco);

/**
 * Entrega as recompensas das missões que acabaram de concluir (XP com subida de nível, ouro com extrato e itens na
 * mochila), na mesma gravação da ação que as concluiu. Devolve o que mudar no personagem e as mensagens.
 */
function aplicarRecompensasDeMissoesEm(ctx: ContextoTransacao, char: CharacterDocument, concluidas: { id: string; def: MissaoDados }[]): { patch: Partial<CharacterDocument>; avisos: AvisosDeMissoes['concluidas'] } {
  let atual = char;
  const patch: Partial<CharacterDocument> = {};
  const avisos: AvisosDeMissoes['concluidas'] = [];
  for (const { id, def } of concluidas) {
    const mensagens: string[] = [];
    const r = def.recompensa;
    if (r.xp > 0) {
      let xp = atual.xpAtual + r.xp;
      let nivel = atual.nivel;
      let pontos = atual.pontosDisponiveis;
      while (nivel < GAME_CONFIG.NIVEL_MAXIMO_GRAU_1 && xp >= xpParaProximoNivel(nivel)) {
        xp -= xpParaProximoNivel(nivel);
        nivel += 1;
        pontos += GAME_CONFIG.PONTOS_POR_NIVEL;
        mensagens.push(`★ SUBIU DE NÍVEL! ${atual.nome} alcançou o Nível ${nivel}! (+${GAME_CONFIG.PONTOS_POR_NIVEL} pontos disponíveis)`);
      }
      if (nivel >= GAME_CONFIG.NIVEL_MAXIMO_GRAU_1) nivel = GAME_CONFIG.NIVEL_MAXIMO_GRAU_1;
      Object.assign(patch, { xpAtual: xp, nivel, pontosDisponiveis: pontos });
      atual = { ...atual, xpAtual: xp, nivel, pontosDisponiveis: pontos };
      mensagens.unshift(`+${r.xp} XP`);
    }
    if (r.ouro > 0) {
      const ganho = alterarSaldoEm(ctx, atual, 'ouro', r.ouro, `Missão concluída: ${def.titulo}`);
      atual = ganho.character;
      patch.ouro = ganho.character.ouro;
      mensagens.unshift(`+${r.ouro} de ouro`);
    }
    if (r.itens.length) {
      const inventario = { ...(atual.inventario ?? {}) };
      for (const item of r.itens) {
        inventario[item.id] = (inventario[item.id] ?? 0) + item.qtd;
        mensagens.push(`+${item.qtd} × ${item.id.replace(/-/g, ' ')}`);
      }
      patch.inventario = inventario;
      atual = { ...atual, inventario };
    }
    avisos.push({ id, titulo: def.titulo, mensagens });
  }
  return { patch, avisos };
}

/** A abertura: marca como vista (a cena não toca de novo para este personagem) e anda os objetivos de "ver cena". */
export async function campanhaAberturaVista(uid: string): Promise<EstadoDaCampanha & { missoes?: AvisosDeMissoes }> {
  const aberturaId = await aberturaDaCampanha();
  const r = await agirNaCampanha(
    uid,
    'campanhaAbertura',
    async (m, agora) => planejarAberturaVista(m.progresso, aberturaId, agora),
    undefined,
    () => ({ eventos: aberturaId ? [{ tipo: 'cena', cenaId: aberturaId }] : [] })
  );
  return { iniciada: true, progresso: r.personagem.campanha, ...(temAvisos(r.avisos) ? { missoes: r.avisos } : {}) };
}

export interface RespostaDaAcao {
  /** A cena que deve tocar agora (diálogo do NPC ou cena do ativador). */
  cenaId?: string;
  /** Ativador bloqueado pela condição: o que o jogador lê. */
  bloqueio?: string;
  progresso?: ProgressoDaCampanha;
  missoes?: AvisosDeMissoes;
}

/**
 * Falar com um NPC ou entrar na área de um ativador de cena: o servidor decide se a cena toca (uma vez só por
 * personagem, condição de acesso), anda os objetivos das missões em andamento e começa a missão do objeto. Só grava
 * quando algo muda além da posição, para conversar não gastar gravações.
 */
export async function campanhaAcionar(uid: string, objetoId: unknown, posicao?: unknown): Promise<RespostaDaAcao> {
  const r = await agirNaCampanha(
    uid,
    'campanhaAcionar',
    async (m, agora, previo) => {
      const plano = planejarAcao(m.progresso, m.mapa.dados, objetoId, posicao, situacaoDoJogador(previo, m.progresso), agora);
      return plano.ok ? { ok: true as const, progresso: plano.plano.progresso, acao: plano.plano } : plano;
    },
    undefined,
    (plano) => ({ eventos: plano.acao.eventos, iniciar: plano.acao.iniciar }),
    true
  );
  const acao = r.plano.acao;
  return {
    ...(acao.cenaId ? { cenaId: acao.cenaId } : {}),
    ...(acao.bloqueio ? { bloqueio: acao.bloqueio } : {}),
    progresso: r.personagem.campanha,
    ...(temAvisos(r.avisos) ? { missoes: r.avisos } : {}),
  };
}

/** As missões do personagem para a tela de Missões: as em andamento (com cada objetivo) e as concluídas. */
export async function campanhaMissoes(uid: string): Promise<{ ativas: ResumoDaMissao[]; concluidas: ResumoDaMissao[] }> {
  await exigirSistemaLigado(uid, 'campanha');
  const char = await getCharacterByUid(uid);
  if (!char) throw new Error('Personagem não encontrado.');
  const missoes: MissoesDoJogador = char.campanha?.missoes ?? {};
  const defs = await lerMissoesPublicadas(Object.keys(missoes));
  const inventario = char.inventario ?? {};
  const resumo = (id: string): ResumoDaMissao | null => {
    const def = defs[id];
    const m = missoes[id];
    if (!def || !m) return null;
    return {
      id,
      titulo: def.titulo,
      descricao: def.descricao,
      estado: m.estado,
      objetivos: def.objetivos.map((o) => {
        const atual = valorDoObjetivo(o, m, inventario);
        const meta = metaDoObjetivo(o);
        return { id: o.id, texto: textoDoObjetivo(o), atual, meta, cumprido: atual >= meta };
      }),
      recompensa: def.recompensa,
    };
  };
  const lista = (estado: 'ativa' | 'concluida') => idsDasMissoes(missoes, estado).flatMap((id) => resumo(id) ?? []);
  return { ativas: lista('ativa'), concluidas: lista('concluida') };
}

/**
 * Roda uma ação da Campanha numa transação: lê o mundo publicado ANTES (fora da transação), confere que o jogador
 * continua onde estava quando a transação começa, planeja, grava o progresso (e o que mais a ação mudar).
 */
async function agirNaCampanha<T extends { progresso: ProgressoDaCampanha }>(
  uid: string,
  operacao: string,
  planejar: (mundo: MundoDoJogador, agora: string, personagem: CharacterDocument) => Promise<{ ok: true } & T | { ok: false; erro: string }>,
  extra: (plano: T, atual: CharacterDocument) => Partial<CharacterDocument> = () => ({}),
  missoes?: (plano: T, previo: CharacterDocument) => { eventos: EventoDeMissao[]; iniciar?: string[] },
  soGravaSeMudar = false
): Promise<{ plano: T; personagem: CharacterDocument; avisos: AvisosDeMissoes }> {
  await exigirSistemaLigado(uid, 'campanha');
  const previo = await getCharacterByUid(uid);
  if (!previo) throw new Error('Personagem não encontrado.');
  const agora = new Date().toISOString();
  const mundo = await mundoDoJogador(previo, agora);
  if (!mundo) throw new ErroDaCampanha('A Campanha ainda não começou.');
  const plano = await planejar(mundo, agora, previo);
  if (!plano.ok) throw new ErroDaCampanha(plano.erro);

  // as missões: os acontecimentos da ação andam os objetivos, e a missão pedida pode começar (lê só as missões publicadas envolvidas)
  let planoFinal: T = plano;
  let concluidas: { id: string; def: MissaoDados }[] = [];
  let avisos = SEM_AVISOS;
  if (missoes) {
    const { eventos, iniciar = [] } = missoes(plano, previo);
    const defs = await lerMissoesPublicadas([...idsDasMissoes(plano.progresso.missoes, 'ativa'), ...iniciar]);
    const inventarioDepois = extra(plano, previo).inventario ?? previo.inventario ?? {};
    const r = processarMissoes({ missoes: plano.progresso.missoes, defs, eventos, iniciar, nivel: previo.nivel, inventario: inventarioDepois, agora });
    if (r.iniciadas.length || r.concluidas.length || Object.keys(r.missoes).length !== Object.keys(plano.progresso.missoes ?? {}).length || JSON.stringify(r.missoes) !== JSON.stringify(plano.progresso.missoes ?? {})) {
      planoFinal = { ...plano, progresso: { ...plano.progresso, missoes: r.missoes } };
    }
    concluidas = r.concluidas.flatMap((id) => (defs[id] ? [{ id, def: defs[id] }] : []));
    avisos = {
      iniciadas: r.iniciadas.flatMap((id) => (defs[id] ? [{ id, titulo: defs[id].titulo }] : [])),
      concluidas: concluidas.map(({ id, def }) => ({ id, titulo: def.titulo, mensagens: [] })),
      ...(r.motivoDoNaoComeco ? { motivoDoNaoComeco: r.motivoDoNaoComeco } : {}),
    };
  }

  // acionar um NPC sem novidade nenhuma: nada a gravar (a posição sozinha não vale uma gravação)
  if (soGravaSeMudar && concluidas.length === 0) {
    const semPosicao = (p: ProgressoDaCampanha | undefined) => JSON.stringify({ ...p, x: 0, y: 0, atualizadoEm: '' });
    if (previo.campanha && semPosicao(previo.campanha) === semPosicao(planoFinal.progresso)) return { plano: planoFinal, personagem: { ...previo, campanha: previo.campanha }, avisos };
  }

  return repositorio.executarTransacao(operacao, async (ctx) => {
    const atual = await carregarPersonagem(ctx, uid);
    const posAntes = previo.campanha;
    const posAgora = atual.campanha;
    if (posAntes?.mapaId !== posAgora?.mapaId || posAntes?.atualizadoEm !== posAgora?.atualizadoEm) {
      throw new ErroDaCampanha('Seu progresso mudou enquanto isso. Tente de novo.');
    }
    const mudancas = extra(planoFinal, atual);
    const recompensa = concluidas.length ? aplicarRecompensasDeMissoesEm(ctx, { ...atual, ...mudancas }, concluidas) : null;
    const personagem = salvarPersonagem(ctx, atual, { campanha: planoFinal.progresso, ...mudancas, ...(recompensa?.patch ?? {}) });
    const comMensagens: AvisosDeMissoes = recompensa ? { ...avisos, concluidas: recompensa.avisos } : avisos;
    return { plano: planoFinal, personagem, avisos: comMensagens };
  });
}

/**
 * Checkpoint de posição (ao parar de andar por um tempo e ao sair da tela; o celular decide quando, ver
 * `lib/salvamentoCampanha`). Devolve só o progresso: o celular já tem o mapa, então não gastamos leituras à toa.
 */
export async function campanhaSalvarPosicao(uid: string, pedido: { mapaId: unknown; x: unknown; y: unknown }): Promise<EstadoDaCampanha> {
  const r = await agirNaCampanha(uid, 'campanhaPosicao', async (m, agora) => planejarPosicao(m.progresso, m.mapa.dados, pedido, agora));
  return { iniciada: true, progresso: r.personagem.campanha };
}

/** Abre um baú do mapa em que o jogador está: o item vai para a mochila e o baú não abre de novo. */
export async function campanhaAbrirBau(uid: string, objetoId: unknown, posicao?: unknown): Promise<{ item: { id: string; qtd: number }; character: CharacterDocument; missoes?: AvisosDeMissoes }> {
  const r = await agirNaCampanha(
    uid,
    'campanhaBau',
    async (m, agora, previo) => {
      const ponto = aplicarPosicaoDaAcao(m.progresso, m.mapa.dados, posicao, agora);
      return ponto.ok ? planejarBau(ponto.progresso, m.mapa.dados, objetoId, agora, situacaoDoJogador(previo, ponto.progresso)) : ponto;
    },
    (plano, atual) => ({ inventario: { ...(atual.inventario ?? {}), [plano.item.id]: ((atual.inventario ?? {})[plano.item.id] ?? 0) + plano.item.qtd } }),
    (plano) => ({ eventos: [{ tipo: 'bau', mapa: plano.progresso.mapaId, objeto: String(objetoId) }] })
  );
  return { item: r.plano.item, character: r.personagem, ...(temAvisos(r.avisos) ? { missoes: r.avisos } : {}) };
}

/** Atravessa uma porta: o jogador passa para o mapa de destino (publicado), na posição indicada. */
export async function campanhaAtravessarPorta(uid: string, objetoId: unknown, posicao?: unknown): Promise<EstadoDaCampanha & { missoes?: AvisosDeMissoes }> {
  const r = await agirNaCampanha(
    uid,
    'campanhaPorta',
    async (m, agora, previo) => {
      const porta = typeof objetoId === 'string' ? m.mapa.dados.objetos.find((o) => o.id === objetoId && o.tipo === 'porta') : undefined;
      const destino = porta?.destino ? await lerMapaPublicado(porta.destino.mapa) : null;
      const ponto = aplicarPosicaoDaAcao(m.progresso, m.mapa.dados, posicao, agora);
      return ponto.ok ? planejarPorta(ponto.progresso, m.mapa.dados, objetoId, destino?.dados ?? null, agora, situacaoDoJogador(previo, ponto.progresso)) : ponto;
    },
    undefined,
    (plano) => ({ eventos: [{ tipo: 'chegar', mapa: plano.progresso.mapaId }] })
  );
  const novoMapa = (await lerMapaPublicado(r.personagem.campanha!.mapaId)) ?? undefined;
  return { iniciada: true, progresso: r.personagem.campanha, mapa: novoMapa, tilesets: novoMapa ? await tilesetsDoMapa(novoMapa) : undefined, ...(temAvisos(r.avisos) ? { missoes: r.avisos } : {}) };
}
