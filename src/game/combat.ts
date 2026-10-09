import { Attributes } from '@/rules/attributes';
import { getClassById } from '@/rules/classes';
import { GAME_CONFIG } from '@/rules/config';
import { Elemento, ModificadoresElementais } from '@/rules/elements';
import { MonsterDefinition } from '@/rules/monsters';
import { getRaceById } from '@/rules/races';
import {
  EFEITOS_STATUS,
  EfeitoStatus,
  QUANTIDADE_REMOCAO_BENCAO_DIVINA,
} from '@/rules/statusEffects';
import {
  aplicarMultiplicadorElemental,
  calcularMultiplicadorElemental,
  combinarModificadores,
  obterModificadoresRaciais,
  obterTextoReacaoElemental,
  ReacaoElemental,
} from './elements';
import {
  calcularDanoEfeito,
  EfeitoAtivo,
  EventoEfeito,
  processarTickEfeitos,
  removerEfeitos,
  sorteioStatus,
  tentarAplicarEfeito,
} from './statusEffects';
import {
  aplicarDano,
  aplicarDisciplinaDoGuerreiro,
  aplicarFluxoArcano,
  aplicarGracaDivina,
  aplicarMuralhaDeFerro,
  aplicarPassosRapidos,
  aplicarResistenciaBarbara,
  bonusPassivaPermanenteDanoPercentual,
  calcularAgilidadeEfetiva,
  calcularDefesaFisica,
  calcularHpMax,
  calcularSobreescudoMax,
  calcularChanceCritico,
  OpcoesCalculoStatus,
} from './index';
import {
  aplicarBonusContraSobreescudo,
  calcularDanoComBonusSomados,
  limitarReducaoDanoPercentual,
  calcularMitigacaoFisicaEfetiva,
  calcularMitigacaoMagicaEfetiva,
  reduzirDanoPercentual,
} from './combate/efeitos';
import { calcularInstintoSobrevivencia } from './combate/passivasClasse';
import { LadoCombate, multiplicadorCritico, sorteioCritico } from './combate/critico';
import { reacaoDoCorpo } from './combate/corpo';
import { aplicarBonusElemental } from './combate/bonusElemento';
import { decidirDesfecho } from './combate/desfecho';
import { aplicarEfeitoControle, estaImuneAoStatus, imunidadesDeChefe } from './combate/efeitosControle';
import {
  EstadoDeLuta,
  adicionarMarcas,
  condicoesDoAlvo,
  registrarEstadoDeLuta,
} from './combate/bonusStatusAlvo';
import { obterResistenciasRaciais, reducaoChanceStatusRacial } from './resistenciasRaciais';
import {
  CategoriaCorporal,
  NOMES_TIPO_GOLPE,
  SubtipoFisico,
  TipoGolpe,
  modificadoresElementaisDaCategoria,
} from '@/rules/corposMonstros';
import {
  EfeitoDefensivoAtivo,
  TipoEfeitoDefensivo,
  adicionarEfeitoDefensivo,
  avancarRodadaEfeitosDefensivos,
  calcularDanoRedirecionado,
  consumirAbsorcaoMagica,
  estaImortal,
  gastarEscudoTemporario,
  percentualRedirecionamento,
  reducaoDanoRecebidoPorEfeitos,
} from './combate/efeitosDefensivos';
import {
  CuraContinuaAtiva,
  RessurreicaoParcialEstado,
  TipoEfeitoCura,
  aplicarCuras,
  processarCuraContinua,
  tentarRessurreicaoParcial,
} from './combate/efeitosCura';
import {
  BuffAtivo,
  adicionarBuffs,
  aplicarBuffsAosAtributos,
  avancarBuffs,
  bonusDanoDosBuffs,
  bonusDefesaDosBuffs,
  multiplicadorAgilidadeParaDuplo,
} from './combate/efeitosBuffs';
import {
  AplicacaoDebuff,
  DebuffAtivo,
  agilidadeComExaustao,
  avancarDebuffs,
  adicionarDebuffs,
  bonusDanoDosDebuffs,
  acordarDaParalisia,
  consumirIncapacitacao,
  consumirPontoFraco,
  incapacitacaoAtiva,
  removerLentidaoDeOrigem,
  TipoIncapacitacao,
  fatorCuraPercentual,
  percentualPontoFraco,
  reducaoDefesaDosDebuffs,
  reducaoDefesaPorPressao,
} from './combate/efeitosDebuffs';
import {
  definicaoRacialDeAtaque,
  obterHabilidadeRacial,
  racialDeveDisparar,
} from './combate/racial';
import { HabilidadesEquipadas } from '@/rules/habilidadesEquipadas';
import {
  ContextoHabilidade,
  ResultadoHabilidade,
  separarPassivasDanoDaClasse,
  obterHabilidade,
  obterModificadoresPassivaSubclasse,
  obterSlotAcionado,
  resolverDanoHabilidade,
} from './combate/habilidades';

// Mantém a API pública de combat.ts (a função mora em combate/passivasClasse.ts)
export { calcularInstintoSobrevivencia };

export {
  aplicarDisciplinaDoGuerreiro,
  aplicarFluxoArcano,
  aplicarGracaDivina,
  aplicarMuralhaDeFerro,
  aplicarPassosRapidos,
  aplicarResistenciaBarbara,
  calcularAgilidadeEfetiva,
  calcularDefesaFisica,
  aplicarBonusContraSobreescudo,
  calcularMitigacaoFisicaEfetiva,
  calcularMitigacaoMagicaEfetiva,
  reduzirDanoPercentual,
};

export interface Combatente {
  nome: string;
  hp: number;
  hpMax: number;
  sobreescudo: number;
  atributos: Attributes;
  racaId?: string;
  classeId?: string;
  linhagem?: string;
  nivel?: number;
  ouro?: number;
  mitigacao?: number;
  habilidadesEquipadas?: HabilidadesEquipadas;
  subclasseAtualId?: string | null;
  subclasseTiers?: Record<string, number>;
  modificadoresElementais?: ModificadoresElementais;
  elementoAtaque?: Elemento;
  /** Status a que o combatente é imune (chefes: Sono, Paralisia e Congelamento). */
  imunidadesStatus?: EfeitoStatus[];
  /** Status de dano contínuo ativos (copiado do estado da luta antes de cada ação; base dos bônus por status do alvo). */
  statusAtivos?: EfeitoStatus[];
  /** Sangramento e Maldição: duram até o fim da luta. */
  estadosDeLuta?: EstadoDeLuta[];
  /** Marcas no combatente (+3% de dano por marca para quem as aproveita, até +15%). */
  marcas?: number;
  /** Categoria corporal (monstros): define fraquezas e resistências a tipos de dano (roadmap 1.3). */
  categoriaCorporal?: CategoriaCorporal;
  /** Só Aberrante: fraquezas e resistências próprias da criatura. */
  fraquezasProprias?: TipoGolpe[];
  resistenciasProprias?: TipoGolpe[];
  /** Subtipo do dano físico do atacante (vem da arma; vazio até as armas existirem). */
  tipoDanoFisico?: SubtipoFisico;
  contadorFuriaSelvagem?: number;
  contadorIraBarbaro?: number;
  contadorPosturaGuardiao?: number;
  contadorJuramentoGuardiao?: number;
  posturaGuardiaoAtiva?: boolean;
  juramentoGuardiaoAtivo?: boolean;
  contadorExplosaoArcana?: number;
  contadorAcumuloArcano?: number;
  cargasAcumuloArcano?: number;
  contadorCataclismoArcano?: number;
  contadorRajadaGolpes?: number;
  contadorSedeSangueBandido?: number;
  cargasSedeSangueBandido?: number;
  contadorDancaLaminas?: number;
  contadorBencaoDivina?: number;
  contadorFeInabalavel?: number;
  cargasFeInabalavel?: number;
  contadorMilagreDivino?: number;
  contadorIaijutsu?: number;
  contadorFocoAbsoluto?: number;
  cargasFocoAbsoluto?: number;
  contadorCorteDoVazio?: number;
  /** Efeitos de Mitigação e defesa ativos (só durante a luta; nunca persistidos). */
  efeitosDefensivos?: EfeitoDefensivoAtivo[];
  /** Cura Contínua ativa (só durante a luta). */
  curaContinua?: CuraContinuaAtiva;
  /** Ressurreição Parcial preparada ou já usada nesta luta. */
  ressurreicaoParcial?: RessurreicaoParcialEstado;
  /** Dano Acumulativo: bônus de dano (%) acumulado pelos usos anteriores da habilidade. */
  danoAcumulativoPercentual?: number;
  /** Buffs temporários ativos (aumentos de atributo, Sincronismo, Delírio Controlado). */
  buffs?: BuffAtivo[];
  /** Debuffs ativos (Enfraquecimento, Cicatrização, Ponto Fraco, Pressão, Exaustão, Distração). */
  debuffs?: DebuffAtivo[];
  /** Habilidade racial ativa: ações que faltam para poder disparar de novo (0 = pronta). */
  recargaRacialRestante?: number;
  /** A habilidade racial de ataque (Vampiro, Draconiano) disparou nesta ação e substitui o ataque. */
  racialAtaquePendente?: boolean;
  /** Foco: % de defesa do inimigo que o PRÓXIMO ataque ignora. */
  focoProximoAtaque?: number;
  /** Ímpeto Imprudente ativo: bônus de dano e defesa reduzida pelos próximos ataques de quem o usou. */
  impeto?: { ataquesRestantes: number; bonusDanoPercentual: number; reducaoDefesaPercentual: number };
}

export interface AtaqueLog {
  atacante: string;
  defensor: string;
  danoBruto: number;
  danoEfetivo: number;
  sobreescudoRestante: number;
  hpRestante: number;
  mensagem: string;
  habilidadeAcionada?:
    | 'Golpe Bárbaro'
    | 'Fúria Selvagem'
    | 'Ira do Bárbaro'
    | 'Golpe do Guardião'
    | 'Postura do Guardião'
    | 'Juramento do Guardião'
    | 'Faísca Arcana'
    | 'Explosão Arcana'
    | 'Cataclismo Arcano'
    | 'Golpe Rápido'
    | 'Rajada de Golpes'
    | 'Dança das Lâminas'
    | 'Luz Sagrada'
    | 'Bênção Divina'
    | 'Milagre Divino'
    | 'Corte Preciso'
    | 'Iaijutsu'
    | 'Corte do Vazio'
    | string;
  instintoSobrevivenciaAtivo?: boolean;
  iraAbaixo30Ativo?: boolean;
  ultimoBastiaoAtivo?: boolean;
  posturaDefensivaAplicada?: boolean;
  juramentoDefensivoAplicado?: boolean;
  cargasAcumuloConsumidas?: number;
  cargasAcumuloRestantes?: number;
  bonusSobreescudoCataclismoAtivo?: boolean;
  numeroGolpes?: number;
  danoPorGolpe?: number;
  golpes?: number[];
  cargasSedeSangueBandidoConsumidas?: number;
  cargasSedeSangueBandidoRestantes?: number;
  ignorarDefesaFisicaPercentual?: number;
  curaHp?: number;
  /** Quantos golpes desta ação foram críticos (dano dobrado depois da defesa). */
  golpesCriticos?: number;
  /** Efeitos de Mitigação e defesa que a habilidade colocou no atacante. */
  efeitosDefensivosAplicados?: TipoEfeitoDefensivo[];
  /** O defensor estava com Imortalidade Breve: o golpe não causou dano. */
  imortalidadeBreve?: boolean;
  /** Dano devolvido ao atacante pelo Redirecionamento do defensor. */
  danoRedirecionado?: number;
  /** Bônus de Dano Acumulativo (%) usado neste golpe. */
  danoAcumulativoPercentual?: number;
  /** Habilidade racial que disparou nesta ação (HP abaixo de 50%). */
  racialAcionada?: string;
  /** O atacante estava distraído e perdeu a ação. */
  distraido?: boolean;
  /** O atacante perdeu a ação por Paralisia, Sono, Loucura ou Distração (Bloco C). */
  incapacitado?: TipoIncapacitacao;
  /** Um golpe de fogo encerrou a lentidão do Congelamento, ou a Paralisia acabou com este golpe. */
  statusEncerrado?: 'congelamento' | 'paralisia';
  /** Debuffs que a habilidade colocou no inimigo. */
  debuffsAplicados?: string[];
  /** Status (ex.: Sangramento) aplicados no inimigo sem sorteio; quem processa é o resolverCombate. */
  statusForcadosNoAlvo?: EfeitoStatus[];
  /** Status que a habilidade tenta aplicar no alvo, com sorteio de chance (Bloco C / catálogo). */
  statusComChanceNoAlvo?: { status: EfeitoStatus; chanceExtraPercentual?: number }[];
  /** Ponto Fraco do alvo consumido neste golpe (% a mais de dano). */
  pontoFracoConsumido?: number;
  /** Dano da Inversão de Sorte no alvo (ignora defesa). */
  inversaoDeSorteDano?: number;
  /** Buffs que a habilidade colocou em quem a usou. */
  buffsAplicados?: string[];
  /** Foco: % de defesa ignorada neste ataque por causa do Foco. */
  focoPercentual?: number;
  /** Aceleração: este ataque é a ação extra concedida pela habilidade. */
  acaoExtra?: boolean;
  /** Ímpeto Imprudente estava ativo neste golpe. */
  impetoImprudenteAtivo?: boolean;
  /** Efeitos de Cura e restauração que a habilidade aplicou em quem a usou. */
  efeitosCuraAplicados?: TipoEfeitoCura[];
  /** HP recuperado pelas curas da habilidade. */
  curaHabilidade?: number;
  /** Quantos efeitos negativos a Limpeza pediu para remover (a remoção é feita pelo resolverCombate). */
  efeitosNegativosRemovidos?: number;
  /** O defensor caiu a 0 e voltou pela Ressurreição Parcial. */
  ressurreicaoDefensor?: boolean;
  /** O atacante caiu a 0 (Redirecionamento) e voltou pela Ressurreição Parcial. */
  ressurreicaoAtacante?: boolean;
  atacanteHpRestante?: number;
  cargasFeInabalavelConsumidas?: number;
  cargasFeInabalavelRestantes?: number;
  cargasFocoAbsolutoConsumidas?: number;
  cargasFocoAbsolutoRestantes?: number;
  bonusSobreescudoCorteDoVazioAtivo?: boolean;
  golpeExtraCorteDoVazioAtivo?: boolean;
  danoGolpeExtraCorteDoVazio?: number;
  danoEfetivoGolpeExtraCorteDoVazio?: number;
  elemento?: Elemento;
  multiplicadorElemental?: number;
  reacaoElemental?: ReacaoElemental;
  tipoGolpe?: TipoGolpe;
  multiplicadorTipoDano?: number;
  reacaoTipoDano?: 'fraqueza' | 'resistência';
}

export interface EventoCuraRodada {
  tipo: 'curaContinua' | 'ressurreicao';
  combatente: string;
  /** HP recuperado (Cura Contínua) ou HP com que voltou (Ressurreição). */
  valor: number;
}

export interface TurnoLog {
  numeroTurno: number;
  ataques: AtaqueLog[];
  eventosEfeitos: EventoEfeito[];
  /** Cura Contínua e Ressurreição Parcial no fim da rodada. */
  eventosCura?: EventoCuraRodada[];
}

export interface OpcoesResolverCombate {
  rngStatus?: (rodada: number, indiceAtaque: number) => number;
  /** Sorteio do crítico em [0, 100) (testes). Sem ele, usa sorteioCritico(seed, ...). */
  rngCritico?: (
    rodada: number,
    indiceAtaque: number,
    indiceGolpe: number,
    lado: LadoCombate
  ) => number;
}

export interface ResultadoCombate {
  vencedor: 'personagem' | 'monstro';
  /** O combate terminou em empate (no PvE o jogador perde). */
  empate?: boolean;
  /** Por que acabou: um lado caiu ou passou do limite de rodadas. */
  motivoFim?: 'derrota' | 'limite_rodadas';
  logTurnos: TurnoLog[];
  mensagens: string[];
  xpGanho: number;
  ouroGanho: number;
  ouroPerdido: number;
  personagemFinal: {
    hp: number;
    hpMax: number;
    ouro: number;
  };
}

/**
 * Determina a iniciativa entre dois combatentes.
 * Retorna 'A' se agilidadeA vencer, 'B' se agilidadeB vencer.
 * Em caso de empate, realiza sorteio determinístico baseado na seed fornecida.
 */
export function iniciativa(agilidadeA: number, agilidadeB: number, seed: number = 0): 'A' | 'B' {
  if (agilidadeA > agilidadeB) {
    return 'A';
  }
  if (agilidadeB > agilidadeA) {
    return 'B';
  }
  // Empate: sorteio baseado na seed
  const s = Math.abs(Math.floor(seed));
  return s % 2 === 0 ? 'A' : 'B';
}

/**
 * Calcula o dano físico com base na Força (+1 de dano por ponto).
 * - Se for Bandido nível 12+, aplica permanentemente "Passos Rápidos" (+5% de dano físico no cálculo base).
 * - Se for Samurai nível 12+, aplica permanentemente "Disciplina do Guerreiro" (+5% de dano físico no cálculo base).
 */
export function calcularDanoFisico(forca: number, opcoes?: OpcoesCalculoStatus): number {
  const base = Math.max(0, forca);
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;
  if (classeNormalizada === 'bandido' && nivel >= 12) {
    return aplicarPassosRapidos(0, base, nivel, opcoes!.classeId).danoFisico;
  }
  if (classeNormalizada === 'samurai' && nivel >= 12) {
    return aplicarDisciplinaDoGuerreiro(0, base, nivel, opcoes!.classeId).danoFisico;
  }
  return base;
}

/**
 * Calcula o dano mágico com base na Inteligência (+1 de dano por ponto).
 * Se for Feiticeiro nível 12+, aplica permanentemente "Fluxo Arcano" (+10% dano mágico base).
 */
export function calcularDanoMagico(inteligencia: number, opcoes?: OpcoesCalculoStatus): number {
  const base = Math.max(0, inteligencia);
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;
  if (classeNormalizada === 'feiticeiro' && nivel >= 12) {
    return aplicarFluxoArcano(base, nivel, opcoes!.classeId).danoMagico;
  }
  return base;
}

/**
 * Passiva Racial "Sede de Sangue" (Vampiro):
 * Função pura que aplica cura de 5% do dano físico causado ao HP do próprio atacante,
 * sem nunca ultrapassar o HP máximo.
 */
export function aplicarSedeDeSangue(
  hpAtual: number,
  hpMax: number,
  danoFisicoCausado: number,
  percentualRouboVida: number = 5
): number {
  if (danoFisicoCausado <= 0 || hpAtual <= 0 || percentualRouboVida <= 0) {
    return Math.min(hpAtual, hpMax);
  }
  const cura = (danoFisicoCausado * percentualRouboVida) / 100;
  return Math.min(hpMax, hpAtual + cura);
}

/**
 * Habilidade Especial do Bárbaro (Nível 5+) — Fúria Selvagem:
 * Função pura que gerencia o contador de ataques básicos. No 3º ataque consecutivo
 * (3º, 6º, 9º...), aciona "Fúria Selvagem" com bônus temporário de Força e dano adicional
 * naquele golpe, reiniciando o contador para 0.
 */
export function processarFuriaSelvagem(
  contadorAtual: number,
  nivel: number = 5
): {
  acionada: boolean;
  novoContador: number;
  bonusForcaTemporario: number;
  danoAdicional: number;
} {
  if (nivel < 5) {
    return {
      acionada: false,
      novoContador: 0,
      bonusForcaTemporario: 0,
      danoAdicional: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      acionada: true,
      novoContador: 0,
      bonusForcaTemporario: 3,
      danoAdicional: 2,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    bonusForcaTemporario: 0,
    danoAdicional: 0,
  };
}

/**
 * Ultimate do Bárbaro (Nível 30) — Ira do Bárbaro:
 * Função pura que gerencia o segundo contador de ataques básicos. No 7º ataque
 * (7º, 14º...), aciona "Ira do Bárbaro" com bônus fixo de Força/Vigor/Vitalidade e % de dano,
 * mais bônus extra se o HP estiver abaixo de 30%, reiniciando o contador para 0.
 */
export function processarIraDoBarbaro(
  contadorAtual: number,
  hpAtual: number,
  hpMax: number,
  nivel: number = 30
): {
  acionada: boolean;
  novoContador: number;
  bonusForca: number;
  bonusVigor: number;
  bonusVitalidade: number;
  percentualBonusDano: number;
  bonusExtraAbaixo30Ativo: boolean;
} {
  if (nivel < 30) {
    return {
      acionada: false,
      novoContador: 0,
      bonusForca: 0,
      bonusVigor: 0,
      bonusVitalidade: 0,
      percentualBonusDano: 0,
      bonusExtraAbaixo30Ativo: false,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 7) {
    const abaixoDe30 = hpMax > 0 && hpAtual > 0 && (hpAtual / hpMax) * 100 < 30;
    return {
      acionada: true,
      novoContador: 0,
      bonusForca: abaixoDe30 ? 9 : 5,
      bonusVigor: abaixoDe30 ? 5 : 3,
      bonusVitalidade: abaixoDe30 ? 5 : 3,
      percentualBonusDano: abaixoDe30 ? 50 : 30,
      bonusExtraAbaixo30Ativo: abaixoDe30,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    bonusForca: 0,
    bonusVigor: 0,
    bonusVitalidade: 0,
    percentualBonusDano: 0,
    bonusExtraAbaixo30Ativo: false,
  };
}

/**
 * Calcula um golpe completo do Bárbaro de forma pura, integrando:
 * - Nível 1+: Golpe Bárbaro (ataque físico normal)
 * - Nível 5+: Fúria Selvagem (no 3º, 6º, 9º ataque básico)
 * - Nível 12+: Instinto de Sobrevivência (HP < 50% ou < 25%, sem acumular)
 * - Nível 30: Ira do Bárbaro (no 7º ataque básico, com bônus extra se HP < 30%)
 */
export function calcularGolpeBarbaro(params: {
  forcaBase: number;
  hpAtual: number;
  hpMax: number;
  nivel: number;
  contadorFuria: number;
  contadorIra: number;
  /** Bônus de dano de passivas de subclasse (Frenesi), em %, somado ao Instinto e à Ira. */
  bonusDanoExtraPercentual?: number;
}): {
  habilidadeAcionada: 'Golpe Bárbaro' | 'Fúria Selvagem' | 'Ira do Bárbaro';
  danoBruto: number;
  novoContadorFuria: number;
  novoContadorIra: number;
  instintoAtivo: boolean;
  iraAbaixo30Ativo: boolean;
} {
  const { forcaBase, hpAtual, hpMax, nivel, contadorFuria, contadorIra } = params;
  const bonusDanoExtraPercentual = params.bonusDanoExtraPercentual ?? 0;

  const instinto = calcularInstintoSobrevivencia(hpAtual, hpMax, nivel);
  const furia = processarFuriaSelvagem(contadorFuria, nivel);
  const ira = processarIraDoBarbaro(contadorIra, hpAtual, hpMax, nivel);

  let forcaEfetiva = calcularDanoFisico(forcaBase) + instinto.bonusForca;
  let percentualBonusTotal = instinto.percentualBonusDano + bonusDanoExtraPercentual;
  let danoAdicionalFixo = 0;
  let habilidadeAcionada: 'Golpe Bárbaro' | 'Fúria Selvagem' | 'Ira do Bárbaro' = 'Golpe Bárbaro';

  if (ira.acionada) {
    habilidadeAcionada = 'Ira do Bárbaro';
    forcaEfetiva += ira.bonusForca;
    percentualBonusTotal += ira.percentualBonusDano;
  } else if (furia.acionada) {
    habilidadeAcionada = 'Fúria Selvagem';
    forcaEfetiva += furia.bonusForcaTemporario;
    danoAdicionalFixo += furia.danoAdicional;
  }

  const danoComPercentual = Math.ceil(forcaEfetiva * (1 + percentualBonusTotal / 100));
  const danoTotal = Math.max(GAME_CONFIG.DANO_MINIMO, danoComPercentual + danoAdicionalFixo);

  return {
    habilidadeAcionada,
    danoBruto: danoTotal,
    novoContadorFuria: furia.novoContador,
    novoContadorIra: ira.novoContador,
    instintoAtivo: instinto.ativo,
    iraAbaixo30Ativo: ira.bonusExtraAbaixo30Ativo,
  };
}

/**
 * Habilidade Especial do Cavaleiro (Nível 5+) — Postura do Guardião:
 * Função pura que gerencia o contador de ataques básicos do Cavaleiro.
 * A cada 3 ataques básicos (3º, 6º, 9º...), ativa "Postura do Guardião" para o próximo
 * turno defensivo do Cavaleiro (bônus temporário de Vitalidade e Sobreescudo, redução
 * de dano recebido e redirecionamento adicional de dano para o Sobreescudo antes do HP)
 * e reinicia o contador para 0.
 */
export function processarPosturaDoGuardiao(
  contadorAtual: number,
  nivel: number = 5
): {
  acionada: boolean;
  novoContador: number;
  bonusVitalidadeTemporario: number;
  bonusSobreescudoTemporario: number;
  reducaoDanoPercentual: number;
  absorcaoExtraSobreescudoPercentual: number;
} {
  if (nivel < 5) {
    return {
      acionada: false,
      novoContador: 0,
      bonusVitalidadeTemporario: 0,
      bonusSobreescudoTemporario: 0,
      reducaoDanoPercentual: 0,
      absorcaoExtraSobreescudoPercentual: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      acionada: true,
      novoContador: 0,
      bonusVitalidadeTemporario: 2,
      bonusSobreescudoTemporario: 4,
      reducaoDanoPercentual: 20,
      absorcaoExtraSobreescudoPercentual: 25,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    bonusVitalidadeTemporario: 0,
    bonusSobreescudoTemporario: 0,
    reducaoDanoPercentual: 0,
    absorcaoExtraSobreescudoPercentual: 0,
  };
}

/**
 * Passiva II do Cavaleiro (Nível 20+) — Último Bastião:
 * Função pura que verifica se o HP do Cavaleiro está abaixo de 30% no momento de receber dano,
 * concedendo +15% Defesa Física, +15% Sobreescudo e -10% de dano físico recebido.
 */
export function calcularUltimoBastiao(
  hpAtual: number,
  hpMax: number,
  nivel: number = 20
): {
  ativo: boolean;
  bonusDefesaFisicaPercentual: number;
  bonusSobreescudoPercentual: number;
  reducaoDanoFisicoPercentual: number;
} {
  if (nivel < 20 || hpMax <= 0 || hpAtual <= 0) {
    return {
      ativo: false,
      bonusDefesaFisicaPercentual: 0,
      bonusSobreescudoPercentual: 0,
      reducaoDanoFisicoPercentual: 0,
    };
  }

  const percentualHp = (hpAtual / hpMax) * 100;
  if (percentualHp < 30) {
    return {
      ativo: true,
      bonusDefesaFisicaPercentual: 15,
      bonusSobreescudoPercentual: 15,
      reducaoDanoFisicoPercentual: 10,
    };
  }

  return {
    ativo: false,
    bonusDefesaFisicaPercentual: 0,
    bonusSobreescudoPercentual: 0,
    reducaoDanoFisicoPercentual: 0,
  };
}

/**
 * Ultimate do Cavaleiro (Nível 30) — Juramento do Guardião:
 * Função pura que gerencia o segundo contador de ataques básicos do Cavaleiro.
 * A cada 7 ataques básicos (7º, 14º...), ativa "Juramento do Guardião" para o próximo
 * turno defensivo (+5 Vitalidade, +3 Vigor, +20% Defesa Física, +20% Sobreescudo, -25% dano recebido)
 * e reinicie o contador para 0.
 * (Nota: transferência de dano de aliados aguarda sistema de grupo/aliados — combate atual é 1x1).
 */
export function processarJuramentoDoGuardiao(
  contadorAtual: number,
  nivel: number = 30
): {
  acionada: boolean;
  novoContador: number;
  bonusVitalidade: number;
  bonusVigor: number;
  bonusDefesaFisicaPercentual: number;
  bonusSobreescudoPercentual: number;
  reducaoDanoPercentual: number;
} {
  if (nivel < 30) {
    return {
      acionada: false,
      novoContador: 0,
      bonusVitalidade: 0,
      bonusVigor: 0,
      bonusDefesaFisicaPercentual: 0,
      bonusSobreescudoPercentual: 0,
      reducaoDanoPercentual: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 7) {
    return {
      acionada: true,
      novoContador: 0,
      bonusVitalidade: 5,
      bonusVigor: 3,
      bonusDefesaFisicaPercentual: 20,
      bonusSobreescudoPercentual: 20,
      reducaoDanoPercentual: 25,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    bonusVitalidade: 0,
    bonusVigor: 0,
    bonusDefesaFisicaPercentual: 0,
    bonusSobreescudoPercentual: 0,
    reducaoDanoPercentual: 0,
  };
}

/**
 * Calcula um ataque básico do Cavaleiro e atualiza os contadores de Postura do Guardião (a cada 3)
 * e Juramento do Guardião (a cada 7).
 */
export function calcularAtaqueCavaleiro(params: {
  forcaBase: number;
  nivel: number;
  contadorPostura: number;
  contadorJuramento: number;
}): {
  habilidadeAcionada: 'Golpe do Guardião' | 'Postura do Guardião' | 'Juramento do Guardião';
  danoBruto: number;
  novoContadorPostura: number;
  novoContadorJuramento: number;
  ativouPostura: boolean;
  ativouJuramento: boolean;
} {
  const { forcaBase, nivel, contadorPostura, contadorJuramento } = params;
  const postura = processarPosturaDoGuardiao(contadorPostura, nivel);
  const juramento = processarJuramentoDoGuardiao(contadorJuramento, nivel);

  let habilidadeAcionada: 'Golpe do Guardião' | 'Postura do Guardião' | 'Juramento do Guardião' =
    'Golpe do Guardião';

  if (juramento.acionada) {
    habilidadeAcionada = 'Juramento do Guardião';
  } else if (postura.acionada) {
    habilidadeAcionada = 'Postura do Guardião';
  }

  const danoBruto = Math.max(GAME_CONFIG.DANO_MINIMO, calcularDanoFisico(forcaBase));

  return {
    habilidadeAcionada,
    danoBruto,
    novoContadorPostura: postura.novoContador,
    novoContadorJuramento: juramento.novoContador,
    ativouPostura: postura.acionada,
    ativouJuramento: juramento.acionada,
  };
}

/**
 * Calcula e aplica a defesa do Cavaleiro ao receber dano em um turno defensivo (função pura):
 * - Nível 12+: "Muralha de Ferro" (+10% Defesa Física permanente)
 * - Nível 5+ com Postura do Guardião ativa: bônus temporário de Vitalidade (+2) e Sobreescudo (+4),
 *   redução de 20% do dano recebido e direcionamento adicional de parte do dano ao Sobreescudo antes do HP.
 * - Nível 20+ com HP < 30%: "Último Bastião" (+15% Defesa Física, +15% Sobreescudo, -10% dano físico recebido).
 * - Nível 30 com Juramento do Guardião ativo: +5 Vitalidade, +3 Vigor, +20% Defesa Física, +20% Sobreescudo, -25% dano recebido.
 */
export function aplicarDefesaCavaleiro(params: {
  danoBruto: number;
  mitigacaoBase?: number;
  vitalidadeBase: number;
  sobreescudoAtual: number;
  hpAtual: number;
  hpMax: number;
  nivel: number;
  ehDanoFisico?: boolean;
  posturaAtiva?: boolean;
  juramentoAtivo?: boolean;
  /** Multiplica o dano depois da defesa (crítico = 2). */
  multiplicadorPosDefesa?: number;
  /** Outras reduções de dano recebido (efeitos ativos), somadas às do Cavaleiro antes do teto de 80%. */
  reducaoDanoExtraPercentual?: number;
  /** Ajuste da defesa total em % (100 = sem ajuste; Ímpeto, Foco e Delírio entram aqui). */
  fatorDefesaPercentual?: number;
}): {
  sobreescudo: number;
  hp: number;
  danoEfetivo: number;
  ultimoBastiaoAtivo: boolean;
  posturaAplicada: boolean;
  juramentoAplicado: boolean;
} {
  const {
    danoBruto,
    mitigacaoBase = 0,
    vitalidadeBase,
    sobreescudoAtual,
    hpAtual,
    hpMax,
    nivel,
    ehDanoFisico = true,
    posturaAtiva = false,
    juramentoAtivo = false,
    multiplicadorPosDefesa = 1,
    reducaoDanoExtraPercentual = 0,
    fatorDefesaPercentual = 100,
  } = params;

  const posturaAplicada = nivel >= 5 && posturaAtiva;
  const juramentoAplicado = nivel >= 30 && juramentoAtivo;
  const ultimoBastiao = calcularUltimoBastiao(hpAtual, hpMax, nivel);

  // Vitalidade efetiva temporária do turno defensivo
  let vitalidadeTurn = vitalidadeBase;
  if (posturaAplicada) {
    vitalidadeTurn += 2;
  }
  if (juramentoAplicado) {
    vitalidadeTurn += 5;
  }

  // Defesa Física base (inclui +10% de Muralha de Ferro se nível >= 12)
  let defesaFisica = calcularDefesaFisica(vitalidadeTurn, {
    classeId: 'cavaleiro',
    nivel,
  });

  let bonusDefesaPercentual = 0;
  let bonusSobreescudoPercentual = 0;
  let reducaoDanoPercentual = Math.max(0, reducaoDanoExtraPercentual);
  let bonusSobreescudoFixo = 0;

  if (posturaAplicada) {
    bonusSobreescudoFixo += 4; // +2 Vitalidade temporária = +4 Sobreescudo e absorção extra
    reducaoDanoPercentual += 20;
  }

  if (ultimoBastiao.ativo) {
    bonusDefesaPercentual += ultimoBastiao.bonusDefesaFisicaPercentual;
    bonusSobreescudoPercentual += ultimoBastiao.bonusSobreescudoPercentual;
    if (ehDanoFisico) {
      reducaoDanoPercentual += ultimoBastiao.reducaoDanoFisicoPercentual;
    }
  }

  if (juramentoAplicado) {
    bonusDefesaPercentual += 20;
    bonusSobreescudoPercentual += 20;
    reducaoDanoPercentual += 25;
    bonusSobreescudoFixo += 5 * GAME_CONFIG.SOBREESCUDO_POR_PONTO_VITALIDADE;
  }

  defesaFisica = Math.ceil((defesaFisica * (100 + bonusDefesaPercentual)) / 100);
  const mitigacaoTotal = Math.floor(((mitigacaoBase + defesaFisica) * fatorDefesaPercentual) / 100);

  // Sobreescudo disponível no turno defensivo
  const baseEscudoParaBonus = sobreescudoAtual + bonusSobreescudoFixo;
  const sobreescudoEfetivo = Math.ceil(
    (baseEscudoParaBonus * (100 + bonusSobreescudoPercentual)) / 100
  );

  // Redução percentual do dano recebido
  const danoAposReducaoPercentual = reduzirDanoPercentual(
    danoBruto,
    limitarReducaoDanoPercentual(reducaoDanoPercentual)
  );

  // Aplica dano priorizando Sobreescudo (e direcionando parcela adicional na Postura do Guardião)
  const resultado = aplicarDano(
    danoAposReducaoPercentual,
    mitigacaoTotal,
    sobreescudoEfetivo,
    hpAtual,
    multiplicadorPosDefesa
  );
  const danoEfetivo =
    Math.max(GAME_CONFIG.DANO_MINIMO, danoAposReducaoPercentual - mitigacaoTotal) *
    multiplicadorPosDefesa;

  return {
    sobreescudo: resultado.sobreescudo,
    hp: resultado.hp,
    danoEfetivo,
    ultimoBastiaoAtivo: ultimoBastiao.ativo,
    posturaAplicada,
    juramentoAplicado,
  };
}

/**
 * Habilidade Especial do Feiticeiro (Nível 5+) — Explosão Arcana (Contador A):
 * Função pura que gerencia o contador A de ataques básicos. A cada 3 ataques básicos (3º, 6º, 9º...),
 * o ataque daquele turno vira "Explosão Arcana" (200% do dano mágico normal e ignora 10% da Defesa Mágica do alvo),
 * reiniciando o contador A para 0.
 */
export function processarExplosaoArcana(
  contadorAtual: number,
  nivel: number = 5
): {
  acionada: boolean;
  novoContador: number;
  multiplicadorDanoPercentual: number;
  ignorarDefesaMagicaPercentual: number;
} {
  if (nivel < 5) {
    return {
      acionada: false,
      novoContador: 0,
      multiplicadorDanoPercentual: 100,
      ignorarDefesaMagicaPercentual: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      acionada: true,
      novoContador: 0,
      multiplicadorDanoPercentual: 200,
      ignorarDefesaMagicaPercentual: 10,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    multiplicadorDanoPercentual: 100,
    ignorarDefesaMagicaPercentual: 0,
  };
}

/**
 * Passiva II do Feiticeiro (Nível 20+) — Acúmulo Arcano (Contador B):
 * Função pura que gerencia o contador B de ataques básicos (independente do contador A).
 * A cada 3 ataques básicos, acumula 1 "carga" de Acúmulo Arcano (até 3 cargas).
 * O contador B não reinicia sozinho ao consumir cargas, apenas ao completar o ciclo de 3.
 */
export function processarAcumuloArcano(
  contadorAtual: number,
  cargasAtuais: number,
  nivel: number = 20
): {
  ganhouCarga: boolean;
  novoContador: number;
  novasCargas: number;
  bonusPercentualPorCarga: number;
} {
  if (nivel < 20) {
    return {
      ganhouCarga: false,
      novoContador: 0,
      novasCargas: 0,
      bonusPercentualPorCarga: 0,
    };
  }

  const cargasNormalizadas = Math.min(3, Math.max(0, cargasAtuais));
  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      ganhouCarga: true,
      novoContador: 0,
      novasCargas: Math.min(3, cargasNormalizadas + 1),
      bonusPercentualPorCarga: 10,
    };
  }

  return {
    ganhouCarga: false,
    novoContador: proximo,
    novasCargas: cargasNormalizadas,
    bonusPercentualPorCarga: 10,
  };
}

/**
 * Consome todas as cargas acumuladas de Acúmulo Arcano (até 3 cargas, +10% de dano mágico por carga)
 * em um ataque e zera as cargas restantes.
 */
export function aplicarCargasAcumuloArcano(
  danoMagico: number,
  cargasAtuais: number,
  nivel: number = 20
): {
  danoComCargas: number;
  cargasConsumidas: number;
  cargasRestantes: number;
  percentualBonusAplicado: number;
} {
  if (nivel < 20 || cargasAtuais <= 0) {
    return {
      danoComCargas: danoMagico,
      cargasConsumidas: 0,
      cargasRestantes: 0,
      percentualBonusAplicado: 0,
    };
  }

  const cargasEfetivas = Math.min(3, Math.max(0, cargasAtuais));
  const percentualBonusAplicado = cargasEfetivas * 10;
  const danoComCargas = Math.ceil((danoMagico * (100 + percentualBonusAplicado)) / 100);

  return {
    danoComCargas,
    cargasConsumidas: cargasEfetivas,
    cargasRestantes: 0,
    percentualBonusAplicado,
  };
}

/**
 * Ultimate do Feiticeiro (Nível 30) — Cataclismo Arcano (Contador C):
 * Função pura que gerencia o contador C de ataques básicos (independente dos contadores A e B).
 * A cada 7 ataques básicos, o ataque daquele turno vira "Cataclismo Arcano":
 * 400% do dano mágico normal, ignorando 20% da Defesa Mágica, e causando +25% de dano
 * quando atingir o Sobreescudo do alvo. Reinicia o contador C para 0.
 */
export function processarCataclismoArcano(
  contadorAtual: number,
  nivel: number = 30
): {
  acionada: boolean;
  novoContador: number;
  multiplicadorDanoPercentual: number;
  ignorarDefesaMagicaPercentual: number;
  bonusDanoContraSobreescudoPercentual: number;
} {
  if (nivel < 30) {
    return {
      acionada: false,
      novoContador: 0,
      multiplicadorDanoPercentual: 100,
      ignorarDefesaMagicaPercentual: 0,
      bonusDanoContraSobreescudoPercentual: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 7) {
    return {
      acionada: true,
      novoContador: 0,
      multiplicadorDanoPercentual: 400,
      ignorarDefesaMagicaPercentual: 20,
      bonusDanoContraSobreescudoPercentual: 25,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    multiplicadorDanoPercentual: 100,
    ignorarDefesaMagicaPercentual: 0,
    bonusDanoContraSobreescudoPercentual: 0,
  };
}

/**
 * Calcula um golpe completo do Feiticeiro de forma pura, integrando:
 * - Nível 1+: Faísca Arcana (dano mágico por Inteligência)
 * - Nível 5+: Explosão Arcana no contador A (a cada 3 ataques: 200% dano mágico, ignora 10% Defesa Mágica)
 * - Nível 12+: Fluxo Arcano (+10% dano mágico base permanente)
 * - Nível 20+: Acúmulo Arcano no contador B independente (a cada 3 ataques acumula 1 carga até 3;
 *   cargas acumuladas concedem +10% dano por carga ao próximo ataque e são todas consumidas;
 *   o contador B só reinicia ao completar o ciclo de 3)
 * - Nível 30: Cataclismo Arcano no contador C independente (a cada 7 ataques: 400% dano mágico,
 *   ignora 20% Defesa Mágica e causa +25% de dano quando atingir o Sobreescudo do alvo)
 */
export function calcularGolpeFeiticeiro(params: {
  inteligenciaBase: number;
  nivel: number;
  contadorExplosao: number;
  contadorAcumulo: number;
  cargasAcumulo: number;
  contadorCataclismo: number;
  sobreescudoAlvo?: number;
  mitigacaoMagicaAlvo?: number;
  /** Bônus de dano de buffs (Ímpeto, Delírio), em %, somado no mesmo grupo dos outros bônus. */
  bonusDanoExtraPercentual?: number;
}): {
  habilidadeAcionada: 'Faísca Arcana' | 'Explosão Arcana' | 'Cataclismo Arcano';
  danoMagicoBase: number;
  danoBruto: number;
  mitigacaoEfetiva: number;
  ignorarDefesaMagicaPercentual: number;
  novoContadorExplosao: number;
  novoContadorAcumulo: number;
  novasCargasAcumulo: number;
  cargasConsumidas: number;
  novoContadorCataclismo: number;
  bonusSobreescudoCataclismoAtivo: boolean;
} {
  const {
    inteligenciaBase,
    nivel,
    contadorExplosao,
    contadorAcumulo,
    cargasAcumulo,
    contadorCataclismo,
    sobreescudoAlvo = 0,
    mitigacaoMagicaAlvo = 0,
  } = params;

  // Dano mágico base (já inclui +10% do Fluxo Arcano se nível >= 12)
  const danoMagicoBase = calcularDanoMagico(inteligenciaBase, {
    classeId: 'feiticeiro',
    nivel,
  });

  // Regra 1.2.2: o dano parte do valor SEM passivas; Fluxo Arcano, cargas e bônus contra
  // Sobreescudo entram juntos num único grupo de soma (ver calcularDanoComBonusSomados)
  const danoMagicoBruto = calcularDanoMagico(inteligenciaBase);
  const bonusFluxoArcano = bonusPassivaPermanenteDanoPercentual('feiticeiro', nivel, 'magico');

  // Se houver cargas acumuladas antes deste ataque, consome todas as cargas para amplificar este golpe
  const consumo = aplicarCargasAcumuloArcano(danoMagicoBruto, cargasAcumulo, nivel);

  // Processa os 3 contadores independentes (A: Explosão Arcana, B: Acúmulo Arcano, C: Cataclismo Arcano)
  const explosao = processarExplosaoArcana(contadorExplosao, nivel);
  const acumulo = processarAcumuloArcano(contadorAcumulo, consumo.cargasRestantes, nivel);
  const cataclismo = processarCataclismoArcano(contadorCataclismo, nivel);

  let habilidadeAcionada: 'Faísca Arcana' | 'Explosão Arcana' | 'Cataclismo Arcano' =
    'Faísca Arcana';
  let multiplicadorHabilidade = 100;
  let ignorarDefesaMagicaPercentual = 0;
  let bonusSobreescudoCataclismoAtivo = false;

  if (cataclismo.acionada) {
    habilidadeAcionada = 'Cataclismo Arcano';
    multiplicadorHabilidade = cataclismo.multiplicadorDanoPercentual;
    ignorarDefesaMagicaPercentual = cataclismo.ignorarDefesaMagicaPercentual;
    bonusSobreescudoCataclismoAtivo = sobreescudoAlvo > 0;
  } else if (explosao.acionada) {
    habilidadeAcionada = 'Explosão Arcana';
    multiplicadorHabilidade = explosao.multiplicadorDanoPercentual;
    ignorarDefesaMagicaPercentual = explosao.ignorarDefesaMagicaPercentual;
  }

  const danoCalculado = calcularDanoComBonusSomados(danoMagicoBruto, multiplicadorHabilidade, [
    bonusFluxoArcano,
    params.bonusDanoExtraPercentual ?? 0,
    consumo.percentualBonusAplicado,
    bonusSobreescudoCataclismoAtivo ? cataclismo.bonusDanoContraSobreescudoPercentual : 0,
  ]);

  const danoBruto = Math.max(GAME_CONFIG.DANO_MINIMO, danoCalculado);
  const mitigacaoEfetiva = calcularMitigacaoMagicaEfetiva(
    mitigacaoMagicaAlvo,
    ignorarDefesaMagicaPercentual
  );

  return {
    habilidadeAcionada,
    danoMagicoBase,
    danoBruto,
    mitigacaoEfetiva,
    ignorarDefesaMagicaPercentual,
    novoContadorExplosao: explosao.novoContador,
    novoContadorAcumulo: acumulo.novoContador,
    novasCargasAcumulo: acumulo.novasCargas,
    cargasConsumidas: consumo.cargasConsumidas,
    novoContadorCataclismo: cataclismo.novoContador,
    bonusSobreescudoCataclismoAtivo,
  };
}

/**
 * Habilidade Especial do Bandido (Nível 5+) — Rajada de Golpes (Contador A):
 * Função pura que gerencia o contador A de ataques básicos. A cada 3 ataques básicos (3º, 6º, 9º...),
 * o turno vira "Rajada de Golpes": 2 ataques consecutivos de 80% do dano físico normal cada (160% total),
 * reiniciando o contador A para 0.
 */
export function processarRajadaDeGolpes(
  contadorAtual: number,
  nivel: number = 5
): {
  acionada: boolean;
  novoContador: number;
  numeroGolpes: number;
  multiplicadorPorGolpePercentual: number;
  multiplicadorTotalPercentual: number;
} {
  if (nivel < 5) {
    return {
      acionada: false,
      novoContador: 0,
      numeroGolpes: 1,
      multiplicadorPorGolpePercentual: 100,
      multiplicadorTotalPercentual: 100,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      acionada: true,
      novoContador: 0,
      numeroGolpes: 2,
      multiplicadorPorGolpePercentual: 80,
      multiplicadorTotalPercentual: 160,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    numeroGolpes: 1,
    multiplicadorPorGolpePercentual: 100,
    multiplicadorTotalPercentual: 100,
  };
}

/**
 * Passiva II do Bandido (Nível 20+) — Sede de Sangue (Bandido) (Contador B):
 * Função pura que gerencia o contador B de ataques básicos (independente do contador A).
 * A cada 3 ataques básicos, acumula 1 carga de +5% de dano físico (até 3 cargas).
 * Diferente do Feiticeiro, as cargas NÃO se consomem no próximo ataque comum — só são aplicadas
 * e consumidas quando "Rajada de Golpes" (nível 5) ou "Dança das Lâminas" (nível 30) disparam.
 * (Nota: Distinta da passiva racial "Sede de Sangue" do Vampiro, que cura 5% do dano físico causado).
 */
export function processarSedeDeSangueBandido(
  contadorAtual: number,
  cargasAtuais: number,
  nivel: number = 20
): {
  ganhouCarga: boolean;
  novoContador: number;
  novasCargas: number;
  bonusPercentualPorCarga: number;
} {
  if (nivel < 20) {
    return {
      ganhouCarga: false,
      novoContador: 0,
      novasCargas: 0,
      bonusPercentualPorCarga: 0,
    };
  }

  const cargasNormalizadas = Math.min(3, Math.max(0, cargasAtuais));
  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      ganhouCarga: true,
      novoContador: 0,
      novasCargas: Math.min(3, cargasNormalizadas + 1),
      bonusPercentualPorCarga: 5,
    };
  }

  return {
    ganhouCarga: false,
    novoContador: proximo,
    novasCargas: cargasNormalizadas,
    bonusPercentualPorCarga: 5,
  };
}

/**
 * Aplica e consome as cargas acumuladas de "Sede de Sangue (Bandido)" (+5% de dano físico por carga,
 * até 3 cargas) SOMENTE quando uma habilidade especial ("Rajada de Golpes") ou ultimate ("Dança das Lâminas")
 * dispara. Em ataques comuns ("Golpe Rápido"), NÃO aplica o bônus e NÃO consome as cargas.
 */
export function aplicarCargasSedeDeSangueBandido(
  danoBaseGolpe: number,
  cargasAtuais: number,
  nivel: number = 20,
  ehGolpeEspecialOuUltimate: boolean = false
): {
  danoComCargas: number;
  cargasConsumidas: number;
  cargasRestantes: number;
  percentualBonusAplicado: number;
} {
  const cargasNormalizadas = Math.min(3, Math.max(0, cargasAtuais));
  if (nivel < 20 || cargasNormalizadas <= 0) {
    return {
      danoComCargas: danoBaseGolpe,
      cargasConsumidas: 0,
      cargasRestantes: 0,
      percentualBonusAplicado: 0,
    };
  }

  if (!ehGolpeEspecialOuUltimate) {
    return {
      danoComCargas: danoBaseGolpe,
      cargasConsumidas: 0,
      cargasRestantes: cargasNormalizadas,
      percentualBonusAplicado: 0,
    };
  }

  const percentualBonusAplicado = cargasNormalizadas * 5;
  const danoComCargas = Math.ceil((danoBaseGolpe * (100 + percentualBonusAplicado)) / 100);

  return {
    danoComCargas,
    cargasConsumidas: cargasNormalizadas,
    cargasRestantes: 0,
    percentualBonusAplicado,
  };
}

/**
 * Ultimate do Bandido (Nível 30) — Dança das Lâminas (Contador C):
 * Função pura que gerencia o contador C de ataques básicos (independente dos contadores A e B).
 * A cada 7 ataques básicos, o turno vira "Dança das Lâminas":
 * 5 ataques consecutivos de 75% do dano físico normal cada (375% total),
 * cada um ignorando 5% da Defesa Física do alvo. Reinicia o contador C para 0.
 */
export function processarDancaDasLaminas(
  contadorAtual: number,
  nivel: number = 30
): {
  acionada: boolean;
  novoContador: number;
  numeroGolpes: number;
  multiplicadorPorGolpePercentual: number;
  multiplicadorTotalPercentual: number;
  ignorarDefesaFisicaPercentual: number;
} {
  if (nivel < 30) {
    return {
      acionada: false,
      novoContador: 0,
      numeroGolpes: 1,
      multiplicadorPorGolpePercentual: 100,
      multiplicadorTotalPercentual: 100,
      ignorarDefesaFisicaPercentual: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 7) {
    return {
      acionada: true,
      novoContador: 0,
      numeroGolpes: 5,
      multiplicadorPorGolpePercentual: 75,
      multiplicadorTotalPercentual: 375,
      ignorarDefesaFisicaPercentual: 5,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    numeroGolpes: 1,
    multiplicadorPorGolpePercentual: 100,
    multiplicadorTotalPercentual: 100,
    ignorarDefesaFisicaPercentual: 0,
  };
}

/**
 * Calcula um golpe completo do Bandido de forma pura, integrando:
 * - Nível 1+: Golpe Rápido (dano físico normal por Força)
 * - Nível 5+: Rajada de Golpes no contador A (a cada 3 ataques: 2 golpes de 80% cada = 160% total)
 * - Nível 12+: Passos Rápidos (+5% dano físico no cálculo base permanente)
 * - Nível 20+: Sede de Sangue (Bandido) no contador B independente (a cada 3 ataques acumula 1 carga de +5% até 3;
 *   NÃO consome em ataques comuns, só aplica e consome quando Rajada de Golpes ou Dança das Lâminas disparam)
 * - Nível 30: Dança das Lâminas no contador C independente (a cada 7 ataques: 5 golpes de 75% cada = 375% total,
 *   cada um ignorando 5% da Defesa Física do alvo, e consome cargas pendentes do nível 20)
 */
export function calcularGolpeBandido(params: {
  forcaBase: number;
  nivel: number;
  contadorRajada: number;
  contadorSedeSangue: number;
  cargasSedeSangue: number;
  contadorDanca: number;
  mitigacaoFisicaAlvo?: number;
  /** Bônus de dano de buffs (Ímpeto, Delírio), em %, somado no mesmo grupo dos outros bônus. */
  bonusDanoExtraPercentual?: number;
}): {
  habilidadeAcionada: 'Golpe Rápido' | 'Rajada de Golpes' | 'Dança das Lâminas';
  danoFisicoBase: number;
  numeroGolpes: number;
  multiplicadorPorGolpePercentual: number;
  multiplicadorTotalPercentual: number;
  danoPorGolpe: number;
  golpes: number[];
  danoBruto: number;
  ignorarDefesaFisicaPercentual: number;
  mitigacaoPorGolpeEfetiva: number;
  novoContadorRajada: number;
  novoContadorSedeSangue: number;
  novasCargasSedeSangue: number;
  cargasConsumidas: number;
  novoContadorDanca: number;
} {
  const {
    forcaBase,
    nivel,
    contadorRajada,
    contadorSedeSangue,
    cargasSedeSangue,
    contadorDanca,
    mitigacaoFisicaAlvo = 0,
  } = params;

  // Dano físico base (já inclui +5% de Passos Rápidos se nível >= 12)
  const danoFisicoBase = calcularDanoFisico(forcaBase, {
    classeId: 'bandido',
    nivel,
  });

  // Avalia contadores A (Rajada de Golpes) e C (Dança das Lâminas)
  const rajada = processarRajadaDeGolpes(contadorRajada, nivel);
  const danca = processarDancaDasLaminas(contadorDanca, nivel);

  let habilidadeAcionada: 'Golpe Rápido' | 'Rajada de Golpes' | 'Dança das Lâminas' =
    'Golpe Rápido';
  let numeroGolpes = 1;
  let multiplicadorPorGolpePercentual = 100;
  let multiplicadorTotalPercentual = 100;
  let ignorarDefesaFisicaPercentual = 0;

  if (danca.acionada) {
    habilidadeAcionada = 'Dança das Lâminas';
    numeroGolpes = danca.numeroGolpes;
    multiplicadorPorGolpePercentual = danca.multiplicadorPorGolpePercentual;
    multiplicadorTotalPercentual = danca.multiplicadorTotalPercentual;
    ignorarDefesaFisicaPercentual = danca.ignorarDefesaFisicaPercentual;
  } else if (rajada.acionada) {
    habilidadeAcionada = 'Rajada de Golpes';
    numeroGolpes = rajada.numeroGolpes;
    multiplicadorPorGolpePercentual = rajada.multiplicadorPorGolpePercentual;
    multiplicadorTotalPercentual = rajada.multiplicadorTotalPercentual;
  }

  const ehGolpeEspecialOuUltimate = danca.acionada || rajada.acionada;

  // Regra 1.2.2: o dano parte do valor SEM passivas; Passos Rápidos e as cargas somam num grupo só
  const danoFisicoBruto = calcularDanoFisico(forcaBase);
  const bonusPassosRapidos = bonusPassivaPermanenteDanoPercentual('bandido', nivel, 'fisico');

  // As cargas de Sede de Sangue (Bandido) SÓ são aplicadas e consumidas se Rajada de Golpes ou Dança das Lâminas disparar
  const consumo = aplicarCargasSedeDeSangueBandido(
    danoFisicoBruto,
    cargasSedeSangue,
    nivel,
    ehGolpeEspecialOuUltimate
  );

  // Avança o contador B independente (Sede de Sangue do Bandido) a partir das cargas restantes
  const sedeSangue = processarSedeDeSangueBandido(
    contadorSedeSangue,
    consumo.cargasRestantes,
    nivel
  );

  const danoPorGolpe = Math.max(
    GAME_CONFIG.DANO_MINIMO,
    calcularDanoComBonusSomados(danoFisicoBruto, multiplicadorPorGolpePercentual, [
      bonusPassosRapidos,
      params.bonusDanoExtraPercentual ?? 0,
      consumo.percentualBonusAplicado,
    ])
  );
  const golpes = Array.from({ length: numeroGolpes }, () => danoPorGolpe);
  const danoBruto = danoPorGolpe * numeroGolpes;
  const mitigacaoPorGolpeEfetiva = calcularMitigacaoFisicaEfetiva(
    mitigacaoFisicaAlvo,
    ignorarDefesaFisicaPercentual
  );

  return {
    habilidadeAcionada,
    danoFisicoBase,
    numeroGolpes,
    multiplicadorPorGolpePercentual,
    multiplicadorTotalPercentual,
    danoPorGolpe,
    golpes,
    danoBruto,
    ignorarDefesaFisicaPercentual,
    mitigacaoPorGolpeEfetiva,
    novoContadorRajada: rajada.novoContador,
    novoContadorSedeSangue: sedeSangue.novoContador,
    novasCargasSedeSangue: sedeSangue.novasCargas,
    cargasConsumidas: consumo.cargasConsumidas,
    novoContadorDanca: danca.novoContador,
  };
}

/**
 * Habilidade Especial do Profeta (Nível 5+) — Bênção Divina (Contador A):
 * Função pura que gerencia o contador A de ataques básicos do Profeta.
 * A cada 3 ataques básicos (3º, 6º, 9º...), ao invés de atacar, o Profeta usa "Bênção Divina":
 * recupera 15% do HP máximo (sem ultrapassar o teto), remove 1 efeito negativo ativo e reinicia o contador A.
 */
export function processarBencaoDivina(
  contadorAtual: number,
  nivel: number = 5
): {
  acionada: boolean;
  novoContador: number;
  percentualCuraHp: number;
} {
  if (nivel < 5) {
    return {
      acionada: false,
      novoContador: 0,
      percentualCuraHp: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      acionada: true,
      novoContador: 0,
      percentualCuraHp: 15,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    percentualCuraHp: 0,
  };
}

/**
 * Passiva II do Profeta (Nível 20+) — Fé Inabalável (Contador B):
 * Função pura que gerencia o contador B de ataques básicos (independente do contador A).
 * A cada 3 ataques básicos, acumula 1 carga de +15% de eficácia de cura (até 2 cargas).
 */
export function processarFeInabalavel(
  contadorAtual: number,
  cargasAtuais: number,
  nivel: number = 20
): {
  ganhouCarga: boolean;
  novoContador: number;
  novasCargas: number;
  bonusEficaciaPorCargaPercentual: number;
} {
  if (nivel < 20) {
    return {
      ganhouCarga: false,
      novoContador: 0,
      novasCargas: 0,
      bonusEficaciaPorCargaPercentual: 0,
    };
  }

  const cargasNormalizadas = Math.min(2, Math.max(0, cargasAtuais));
  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      ganhouCarga: true,
      novoContador: 0,
      novasCargas: Math.min(2, cargasNormalizadas + 1),
      bonusEficaciaPorCargaPercentual: 15,
    };
  }

  return {
    ganhouCarga: false,
    novoContador: proximo,
    novasCargas: cargasNormalizadas,
    bonusEficaciaPorCargaPercentual: 15,
  };
}

/**
 * Aplica e consome as cargas acumuladas de "Fé Inabalável" (+15% de eficácia de cura por carga,
 * até 2 cargas = +30%) no próximo efeito de cura/recuperação do Profeta ("Bênção Divina" ou "Milagre Divino").
 * Em ataques comuns ("Luz Sagrada"), NÃO consome as cargas.
 */
export function aplicarCargasFeInabalavel(
  curaHpBase: number,
  cargasAtuais: number,
  nivel: number = 20,
  ehEfeitoCura: boolean = true
): {
  curaHpFinal: number;
  cargasConsumidas: number;
  cargasRestantes: number;
  percentualBonusEficacia: number;
} {
  const cargasNormalizadas = Math.min(2, Math.max(0, cargasAtuais));
  if (nivel < 20 || cargasNormalizadas <= 0) {
    return {
      curaHpFinal: curaHpBase,
      cargasConsumidas: 0,
      cargasRestantes: 0,
      percentualBonusEficacia: 0,
    };
  }

  if (!ehEfeitoCura) {
    return {
      curaHpFinal: curaHpBase,
      cargasConsumidas: 0,
      cargasRestantes: cargasNormalizadas,
      percentualBonusEficacia: 0,
    };
  }

  const percentualBonusEficacia = cargasNormalizadas * 15;
  const curaHpFinal = Number(((curaHpBase * (100 + percentualBonusEficacia)) / 100).toFixed(4));

  return {
    curaHpFinal,
    cargasConsumidas: cargasNormalizadas,
    cargasRestantes: 0,
    percentualBonusEficacia,
  };
}

/**
 * Ultimate do Profeta (Nível 30) — Milagre Divino (Contador C):
 * Função pura que gerencia o contador C de ataques básicos (independente dos contadores A e B).
 * A cada 7 ataques básicos, ativa "Milagre Divino" no lugar de um ataque comum:
 * recupera 30% do HP máximo (sem ultrapassar o teto), remove todos os efeitos negativos ativos
 * e causa 150% do dano mágico normal contra o inimigo no mesmo turno. Reinicia o contador C.
 * // aguardando sistema de efeitos/resistências (bônus temporário de +15% dano/Defesa nos turnos seguintes)
 */
export function processarMilagreDivino(
  contadorAtual: number,
  nivel: number = 30
): {
  acionada: boolean;
  novoContador: number;
  percentualCuraHp: number;
  multiplicadorDanoMagicoPercentual: number;
} {
  if (nivel < 30) {
    return {
      acionada: false,
      novoContador: 0,
      percentualCuraHp: 0,
      multiplicadorDanoMagicoPercentual: 100,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 7) {
    // aguardando sistema de efeitos/resistências (bônus temporário de +15% dano/Defesa nos turnos seguintes)
    return {
      acionada: true,
      novoContador: 0,
      percentualCuraHp: 30,
      multiplicadorDanoMagicoPercentual: 150,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    percentualCuraHp: 0,
    multiplicadorDanoMagicoPercentual: 100,
  };
}

/**
 * Calcula uma ação completa do Profeta de forma pura, integrando:
 * - Nível 1+: Luz Sagrada (ataque básico de dano mágico por Inteligência)
 * - Nível 5+: Bênção Divina no contador A (a cada 3 ataques, ao invés de atacar, recupera 15% HP máx sem ultrapassar o teto)
 * - Nível 12+: Graça Divina (+10% HP máximo permanente no cálculo de status)
 * - Nível 20+: Fé Inabalável no contador B independente (a cada 3 ataques acumula 1 carga de +15% eficácia de cura até 2 cargas;
 *   aplicada e consumida no próximo efeito de cura do Profeta)
 * - Nível 30: Milagre Divino no contador C independente (a cada 7 ataques, recupera 30% HP máx sem ultrapassar o teto
 *   e causa 150% do dano mágico normal no mesmo turno)
 */
export function calcularAcaoProfeta(params: {
  inteligenciaBase: number;
  hpAtual: number;
  hpMax: number;
  nivel: number;
  contadorBencao: number;
  contadorFeInabalavel: number;
  cargasFeInabalavel: number;
  contadorMilagre: number;
}): {
  habilidadeAcionada: 'Luz Sagrada' | 'Bênção Divina' | 'Milagre Divino';
  causaDano: boolean;
  danoMagicoBase: number;
  danoBruto: number;
  curaHp: number;
  novoHp: number;
  novoContadorBencao: number;
  novoContadorFeInabalavel: number;
  novasCargasFeInabalavel: number;
  cargasConsumidas: number;
  novoContadorMilagre: number;
} {
  const {
    inteligenciaBase,
    hpAtual,
    hpMax,
    nivel,
    contadorBencao,
    contadorFeInabalavel,
    cargasFeInabalavel,
    contadorMilagre,
  } = params;

  const danoMagicoBase = calcularDanoMagico(inteligenciaBase, {
    classeId: 'profeta',
    nivel,
  });

  // Avalia contadores A (Bênção Divina) e C (Milagre Divino)
  const bencao = processarBencaoDivina(contadorBencao, nivel);
  const milagre = processarMilagreDivino(contadorMilagre, nivel);

  let habilidadeAcionada: 'Luz Sagrada' | 'Bênção Divina' | 'Milagre Divino' = 'Luz Sagrada';
  let causaDano = true;
  let danoBruto = Math.max(GAME_CONFIG.DANO_MINIMO, danoMagicoBase);
  let curaHpBase = 0;

  if (milagre.acionada) {
    habilidadeAcionada = 'Milagre Divino';
    causaDano = true;
    danoBruto = Math.max(
      GAME_CONFIG.DANO_MINIMO,
      Math.ceil((danoMagicoBase * milagre.multiplicadorDanoMagicoPercentual) / 100)
    );
    curaHpBase = (hpMax * milagre.percentualCuraHp) / 100;
  } else if (bencao.acionada) {
    habilidadeAcionada = 'Bênção Divina';
    causaDano = false;
    danoBruto = 0;
    curaHpBase = (hpMax * bencao.percentualCuraHp) / 100;
  }

  const ehEfeitoCura = milagre.acionada || bencao.acionada;

  // Se este turno tem efeito de cura (Bênção Divina ou Milagre Divino), aplica e consome as cargas acumuladas de Fé Inabalável
  const consumo = aplicarCargasFeInabalavel(
    curaHpBase,
    cargasFeInabalavel,
    nivel,
    ehEfeitoCura
  );

  // Avança o contador B independente (Fé Inabalável) a partir das cargas restantes
  const feInabalavel = processarFeInabalavel(
    contadorFeInabalavel,
    consumo.cargasRestantes,
    nivel
  );

  const novoHp = ehEfeitoCura
    ? Math.min(hpMax, Number((hpAtual + consumo.curaHpFinal).toFixed(4)))
    : Math.min(hpMax, hpAtual);

  return {
    habilidadeAcionada,
    causaDano,
    danoMagicoBase,
    danoBruto,
    curaHp: consumo.curaHpFinal,
    novoHp,
    novoContadorBencao: bencao.novoContador,
    novoContadorFeInabalavel: feInabalavel.novoContador,
    novasCargasFeInabalavel: feInabalavel.novasCargas,
    cargasConsumidas: consumo.cargasConsumidas,
    novoContadorMilagre: milagre.novoContador,
  };
}

/**
 * Habilidade Especial do Samurai (Nível 5+) — Iaijutsu (Contador A):
 * Função pura que gerencia o contador A de ataques básicos do Samurai.
 * A cada 3 ataques básicos (3º, 6º, 9º...), o turno vira "Iaijutsu":
 * 220% do dano físico normal, ignorando 10% da Defesa Física do alvo, e reinicia o contador A para 0.
 */
export function processarIaijutsu(
  contadorAtual: number,
  nivel: number = 5
): {
  acionada: boolean;
  novoContador: number;
  multiplicadorDanoPercentual: number;
  ignorarDefesaFisicaPercentual: number;
} {
  if (nivel < 5) {
    return {
      acionada: false,
      novoContador: 0,
      multiplicadorDanoPercentual: 100,
      ignorarDefesaFisicaPercentual: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 3) {
    return {
      acionada: true,
      novoContador: 0,
      multiplicadorDanoPercentual: 220,
      ignorarDefesaFisicaPercentual: 10,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    multiplicadorDanoPercentual: 100,
    ignorarDefesaFisicaPercentual: 0,
  };
}

/**
 * Passiva II do Samurai (Nível 20+) — Foco Absoluto (Contador B):
 * Função pura que gerencia o contador B de ataques básicos (independente do contador A).
 * A cada 3 ataques básicos, acumula 1 carga de +5% de dano físico (até 3 cargas).
 * As cargas só se aplicam e se consomem quando "Iaijutsu" (nível 5) ou "Corte do Vazio" (nível 30) disparam
 * (mesmo comportamento do Bandido nível 20 — NÃO vaza para ataques comuns).
 */
export function processarFocoAbsoluto(
  contadorAtual: number,
  cargasAtuais: number,
  nivel: number = 20
): {
  ganhouCarga: boolean;
  novoContador: number;
  novasCargas: number;
  bonusPercentualPorCarga: number;
} {
  return processarSedeDeSangueBandido(contadorAtual, cargasAtuais, nivel);
}

/**
 * Aplica e consome as cargas acumuladas de "Foco Absoluto" (+5% de dano físico por carga, até 3 cargas)
 * SOMENTE quando "Iaijutsu" ou "Corte do Vazio" disparam. Em ataques comuns ("Corte Preciso"),
 * NÃO aplica o bônus e NÃO consome as cargas.
 */
export function aplicarCargasFocoAbsoluto(
  danoBaseGolpe: number,
  cargasAtuais: number,
  nivel: number = 20,
  ehGolpeEspecialOuUltimate: boolean = false
): {
  danoComCargas: number;
  cargasConsumidas: number;
  cargasRestantes: number;
  percentualBonusAplicado: number;
} {
  return aplicarCargasSedeDeSangueBandido(
    danoBaseGolpe,
    cargasAtuais,
    nivel,
    ehGolpeEspecialOuUltimate
  );
}

/**
 * Ultimate do Samurai (Nível 30) — Corte do Vazio (Contador C):
 * Função pura que gerencia o contador C de ataques básicos (independente dos contadores A e B).
 * A cada 7 ataques básicos, o turno vira "Corte do Vazio":
 * 450% do dano físico normal, ignorando 25% da Defesa Física, causando +25% de dano quando atingir
 * o Sobreescudo do alvo, e concedendo golpe adicional automático de 100% do dano físico normal
 * se o HP resultante do inimigo ficar em 20% do HP máximo dele ou menos. Reinicia o contador C.
 */
export function processarCorteDoVazio(
  contadorAtual: number,
  nivel: number = 30
): {
  acionada: boolean;
  novoContador: number;
  multiplicadorDanoPercentual: number;
  ignorarDefesaFisicaPercentual: number;
  bonusDanoContraSobreescudoPercentual: number;
  limitePercentualHpGolpeExtra: number;
  multiplicadorGolpeExtraPercentual: number;
} {
  if (nivel < 30) {
    return {
      acionada: false,
      novoContador: 0,
      multiplicadorDanoPercentual: 100,
      ignorarDefesaFisicaPercentual: 0,
      bonusDanoContraSobreescudoPercentual: 0,
      limitePercentualHpGolpeExtra: 0,
      multiplicadorGolpeExtraPercentual: 0,
    };
  }

  const proximo = contadorAtual + 1;
  if (proximo >= 7) {
    return {
      acionada: true,
      novoContador: 0,
      multiplicadorDanoPercentual: 450,
      ignorarDefesaFisicaPercentual: 25,
      bonusDanoContraSobreescudoPercentual: 25,
      limitePercentualHpGolpeExtra: 20,
      multiplicadorGolpeExtraPercentual: 100,
    };
  }

  return {
    acionada: false,
    novoContador: proximo,
    multiplicadorDanoPercentual: 100,
    ignorarDefesaFisicaPercentual: 0,
    bonusDanoContraSobreescudoPercentual: 0,
    limitePercentualHpGolpeExtra: 0,
    multiplicadorGolpeExtraPercentual: 0,
  };
}

/**
 * Calcula um golpe completo do Samurai de forma pura, integrando:
 * - Nível 1+: Corte Preciso (dano físico por Força)
 * - Nível 5+: Iaijutsu no contador A (a cada 3 ataques: 220% dano físico, ignora 10% Defesa Física, consome cargas de Foco Absoluto)
 * - Nível 12+: Disciplina do Guerreiro (+2 Agilidade e +5% dano físico base permanentes)
 * - Nível 20+: Foco Absoluto no contador B independente (a cada 3 ataques acumula 1 carga de +5% até 3;
 *   só se aplica e se consome quando Iaijutsu ou Corte do Vazio disparam, nunca em ataques comuns)
 * - Nível 30: Corte do Vazio no contador C independente (a cada 7 ataques: 450% dano físico, ignora 25% Defesa Física,
 *   +25% de dano quando atingir o Sobreescudo do alvo, consome cargas de Foco Absoluto e prepara golpe extra de 100%
 *   do dano físico normal caso o inimigo fique com <= 20% do HP máximo após o golpe principal)
 */
export function calcularGolpeSamurai(params: {
  forcaBase: number;
  nivel: number;
  contadorIaijutsu: number;
  contadorFocoAbsoluto: number;
  cargasFocoAbsoluto: number;
  contadorCorteDoVazio: number;
  sobreescudoAlvo?: number;
  mitigacaoFisicaAlvo?: number;
  /** Bônus de dano de buffs (Ímpeto, Delírio), em %, somado no mesmo grupo dos outros bônus. */
  bonusDanoExtraPercentual?: number;
}): {
  habilidadeAcionada: 'Corte Preciso' | 'Iaijutsu' | 'Corte do Vazio';
  danoFisicoBase: number;
  danoBrutoPrincipal: number;
  danoGolpeExtraBase: number;
  ignorarDefesaFisicaPercentual: number;
  mitigacaoEfetiva: number;
  bonusSobreescudoCorteDoVazioAtivo: boolean;
  novoContadorIaijutsu: number;
  novoContadorFocoAbsoluto: number;
  novasCargasFocoAbsoluto: number;
  cargasConsumidas: number;
  novoContadorCorteDoVazio: number;
} {
  const {
    forcaBase,
    nivel,
    contadorIaijutsu,
    contadorFocoAbsoluto,
    cargasFocoAbsoluto,
    contadorCorteDoVazio,
    sobreescudoAlvo = 0,
    mitigacaoFisicaAlvo = 0,
  } = params;

  // Dano físico base (já inclui +5% de Disciplina do Guerreiro se nível >= 12)
  const danoFisicoBase = calcularDanoFisico(forcaBase, {
    classeId: 'samurai',
    nivel,
  });

  // Avalia contadores A (Iaijutsu) e C (Corte do Vazio)
  const iaijutsu = processarIaijutsu(contadorIaijutsu, nivel);
  const corteDoVazio = processarCorteDoVazio(contadorCorteDoVazio, nivel);

  let habilidadeAcionada: 'Corte Preciso' | 'Iaijutsu' | 'Corte do Vazio' = 'Corte Preciso';
  let multiplicadorHabilidade = 100;
  let ignorarDefesaFisicaPercentual = 0;
  let bonusSobreescudoCorteDoVazioAtivo = false;

  if (corteDoVazio.acionada) {
    habilidadeAcionada = 'Corte do Vazio';
    multiplicadorHabilidade = corteDoVazio.multiplicadorDanoPercentual;
    ignorarDefesaFisicaPercentual = corteDoVazio.ignorarDefesaFisicaPercentual;
    bonusSobreescudoCorteDoVazioAtivo = sobreescudoAlvo > 0;
  } else if (iaijutsu.acionada) {
    habilidadeAcionada = 'Iaijutsu';
    multiplicadorHabilidade = iaijutsu.multiplicadorDanoPercentual;
    ignorarDefesaFisicaPercentual = iaijutsu.ignorarDefesaFisicaPercentual;
  }

  const ehGolpeEspecialOuUltimate = corteDoVazio.acionada || iaijutsu.acionada;

  // Regra 1.2.2: o dano parte do valor SEM passivas; Disciplina, cargas e bônus contra
  // Sobreescudo somam num grupo só
  const danoFisicoBruto = calcularDanoFisico(forcaBase);
  const bonusDisciplina = bonusPassivaPermanenteDanoPercentual('samurai', nivel, 'fisico');

  // Aplica e consome cargas de Foco Absoluto SOMENTE em Iaijutsu ou Corte do Vazio (nunca em ataques comuns)
  const consumo = aplicarCargasFocoAbsoluto(
    danoFisicoBruto,
    cargasFocoAbsoluto,
    nivel,
    ehGolpeEspecialOuUltimate
  );

  // Avança o contador B independente (Foco Absoluto) a partir das cargas restantes
  const focoAbsoluto = processarFocoAbsoluto(
    contadorFocoAbsoluto,
    consumo.cargasRestantes,
    nivel
  );

  const danoCalculado = calcularDanoComBonusSomados(danoFisicoBruto, multiplicadorHabilidade, [
    bonusDisciplina,
    params.bonusDanoExtraPercentual ?? 0,
    consumo.percentualBonusAplicado,
    bonusSobreescudoCorteDoVazioAtivo ? corteDoVazio.bonusDanoContraSobreescudoPercentual : 0,
  ]);

  const danoBrutoPrincipal = Math.max(GAME_CONFIG.DANO_MINIMO, danoCalculado);
  const danoGolpeExtraBase = Math.max(GAME_CONFIG.DANO_MINIMO, danoFisicoBase);
  const mitigacaoEfetiva = calcularMitigacaoFisicaEfetiva(
    mitigacaoFisicaAlvo,
    ignorarDefesaFisicaPercentual
  );

  return {
    habilidadeAcionada,
    danoFisicoBase,
    danoBrutoPrincipal,
    danoGolpeExtraBase,
    ignorarDefesaFisicaPercentual,
    mitigacaoEfetiva,
    bonusSobreescudoCorteDoVazioAtivo,
    novoContadorIaijutsu: iaijutsu.novoContador,
    novoContadorFocoAbsoluto: focoAbsoluto.novoContador,
    novasCargasFocoAbsoluto: focoAbsoluto.novasCargas,
    cargasConsumidas: consumo.cargasConsumidas,
    novoContadorCorteDoVazio: corteDoVazio.novoContador,
  };
}

/**
 * Executa um turno de combate de um atacante contra um defensor.
 * - Aplica mitigação do defensor (usando aplicarDano de src/game/).
 * - Respeita dano mínimo de 1.
 * - Respeita o máximo de 2 ataques por turno quando a Agilidade do atacante
 *   for o dobro ou mais da do defensor (e agilidade > 0).
 * - Se o atacante for um Vampiro e causar dano físico, aplica a passiva "Sede de Sangue" (5% de roubo de vida).
 * - Se o atacante ou defensor for Bárbaro, Cavaleiro, Feiticeiro, Bandido, Profeta ou Samurai, aplica a progressão automática de classe conforme o nível.
 */
export function turnoDeCombate(
  atacante: Combatente,
  defensor: Combatente,
  numeroTurno: number = 1,
  opcoesTurno?: OpcoesTurno
): ResultadoTurno {
  // Paralisia, Sono, Loucura ou Distração: quem está incapacitado perde a ação (e a rodada conta)
  const incapacitacao = incapacitacaoAtiva(atacante.debuffs);
  if (incapacitacao) {
    atacante.debuffs = consumirIncapacitacao(atacante.debuffs, incapacitacao);
    passarAcaoBuffs(atacante);
    const motivo = {
      distracao: 'está distraído',
      sono: 'está dormindo',
      loucura: 'está em surto de loucura',
      paralisia: 'está paralisado',
    }[incapacitacao];
    return {
      turnoLog: {
        numeroTurno,
        ataques: [
          {
            atacante: atacante.nome,
            defensor: defensor.nome,
            danoBruto: 0,
            danoEfetivo: 0,
            sobreescudoRestante: defensor.sobreescudo,
            hpRestante: defensor.hp,
            mensagem: `${atacante.nome} ${motivo} e perde a ação!`,
            ...(incapacitacao === 'distracao' ? { distraido: true } : {}),
            incapacitado: incapacitacao,
          },
        ],
        eventosEfeitos: [],
      },
      defensorHp: defensor.hp,
      defensorSobreescudo: defensor.sobreescudo,
      atacanteHp: atacante.hp,
    };
  }

  // Habilidade racial ativa: dispara sozinha com HP abaixo de 50% e depois espera a recarga (8 rodadas)
  let racialAcionada: string | undefined;
  if (
    racialDeveDisparar({
      racaId: atacante.racaId,
      hp: atacante.hp,
      hpMax: atacante.hpMax,
      recargaRestante: atacante.recargaRacialRestante,
    })
  ) {
    const racial = obterHabilidadeRacial(atacante.racaId)!;
    if (racial.tipo === 'buff') {
      // Os buffs valem já nesta ação (não esperam a próxima)
      atacante.buffs = [
        ...(atacante.buffs ?? []),
        ...adicionarBuffs([], racial.buffs).map((b) => ({ ...b, recemAplicado: false })),
      ];
      let efeitos = atacante.efeitosDefensivos ?? [];
      for (const a of racial.efeitosDefensivos ?? []) {
        efeitos = adicionarEfeitoDefensivo(efeitos, a, 0).efeitos;
      }
      atacante.efeitosDefensivos = efeitos;
      racialAcionada = racial.nome;
    } else if (atacante.classeId) {
      atacante.racialAtaquePendente = true;
      racialAcionada = racial.nome;
    }
    if (racialAcionada) {
      atacante.recargaRacialRestante = GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS;
    }
  }

  // Atributos com buffs e debuffs (Exaustão) valem durante o turno inteiro; os originais voltam no fim
  const atributosOriginaisAtacante = atacante.atributos;
  const atributosOriginaisDefensor = defensor.atributos;
  atacante.atributos = atributosEfetivos(atributosOriginaisAtacante, atacante);
  defensor.atributos = atributosEfetivos(atributosOriginaisDefensor, defensor);
  try {
    const resultado = turnoDeCombateInterno(atacante, defensor, numeroTurno, opcoesTurno);
    atacante.racialAtaquePendente = false;
    if (racialAcionada && resultado.turnoLog.ataques.length > 0) {
      const primeiro = resultado.turnoLog.ataques[0];
      primeiro.racialAcionada = racialAcionada;
      primeiro.mensagem = `${atacante.nome} aciona ${racialAcionada}! ${primeiro.mensagem}`;
    }
    passarAcaoBuffs(atacante);
    return resultado;
  } finally {
    atacante.atributos = atributosOriginaisAtacante;
    defensor.atributos = atributosOriginaisDefensor;
  }
}

function atributosEfetivos(atributos: Attributes, c: Combatente): Attributes {
  const comBuffs = aplicarBuffsAosAtributos(atributos, c.buffs);
  return { ...comBuffs, agilidade: agilidadeComExaustao(comBuffs.agilidade, c.debuffs) };
}

/**
 * Fim da ação de quem atacou: os buffs recém-aplicados passam a valer e os demais perdem 1 rodada.
 * Os debuffs de duração (Enfraquecimento, Cicatrização, Pressão, Exaustão) também perdem 1 rodada.
 * O Delírio Controlado cobra HP a cada rodada dele; o risco é o desgaste, então nunca mata sozinho
 * (o HP não cai abaixo de 1).
 */
function passarAcaoBuffs(c: Combatente): void {
  if ((c.recargaRacialRestante ?? 0) > 0) {
    c.recargaRacialRestante = (c.recargaRacialRestante ?? 0) - 1;
  }
  if (c.debuffs && c.debuffs.length > 0) {
    c.debuffs = avancarDebuffs(c.debuffs).debuffs;
  }
  if (!c.buffs || c.buffs.length === 0) return;
  const avanco = avancarBuffs(c.buffs);
  c.buffs = avanco.buffs;
  if (avanco.perdaHpPercentual > 0 && c.hp > 0) {
    c.hp = Math.max(1, c.hp - Math.ceil((c.hpMax * avanco.perdaHpPercentual) / 100));
  }
}

export interface OpcoesTurno {
    /**
     * Sorteio do crítico em [0, 100) para cada golpe. Sem ele, não há crítico
     * (resolverCombate sempre passa um, derivado da semente).
     */
    sorteioCritico?: (indiceAtaque: number, indiceGolpe: number) => number;
    aoFinalizarAtaque?: (
      indiceAtaque: number,
      estadoDefensor: { hp: number; sobreescudo: number; hpMax: number }
    ) => { novoHpDefensor: number };
}

export interface ResultadoTurno {
  turnoLog: TurnoLog;
  defensorHp: number;
  defensorSobreescudo: number;
  atacanteHp: number;
}

function turnoDeCombateInterno(
  atacante: Combatente,
  defensor: Combatente,
  numeroTurno: number,
  opcoesTurno?: OpcoesTurno
): ResultadoTurno {
  const nivelAtacante = atacante.nivel ?? 1;
  const nivelDefensor = defensor.nivel ?? 1;

  const agilAtacante = calcularAgilidadeEfetiva(atacante.atributos.agilidade, {
    classeId: atacante.classeId,
    nivel: nivelAtacante,
  });
  const agilDefensor = calcularAgilidadeEfetiva(defensor.atributos.agilidade, {
    classeId: defensor.classeId,
    nivel: nivelDefensor,
  });

  // Sincronismo: com o buff ativo, o ataque duplo exige 1,5x a Agilidade do inimigo em vez de 2x
  const temDobroAgilidade =
    agilAtacante > 0 &&
    agilAtacante >= agilDefensor * multiplicadorAgilidadeParaDuplo(atacante.buffs);
  let maxAtaques = temDobroAgilidade ? GAME_CONFIG.MAXIMO_ATAQUES_POR_TURNO : 1;
  let acaoExtraConcedida = false;

  const classeAtacante = atacante.classeId?.trim().toLowerCase();
  const ehBarbaroAtacante = classeAtacante === 'barbaro';
  const ehCavaleiroAtacante = classeAtacante === 'cavaleiro';
  const ehFeiticeiroAtacante = classeAtacante === 'feiticeiro';
  const ehBandidoAtacante = classeAtacante === 'bandido';
  const ehProfetaAtacante = classeAtacante === 'profeta';
  const ehSamuraiAtacante = classeAtacante === 'samurai';

  // Determina dano do atacante (físico ou mágico, o que for maior; Feiticeiro e Profeta sempre usam dano mágico; Bandido e Samurai sempre usam dano físico)
  const danoFisico = calcularDanoFisico(atacante.atributos.forca, {
    classeId: atacante.classeId,
    nivel: nivelAtacante,
  });
  const danoMagico = calcularDanoMagico(atacante.atributos.inteligencia, {
    classeId: atacante.classeId,
    nivel: nivelAtacante,
  });
  const ehDanoFisicoPadrao =
    ehFeiticeiroAtacante || ehProfetaAtacante
      ? false
      : ehBandidoAtacante || ehSamuraiAtacante
        ? true
        : danoFisico >= danoMagico;
  const danoBasePadrao =
    ehFeiticeiroAtacante || ehProfetaAtacante
      ? danoMagico
      : ehBandidoAtacante || ehSamuraiAtacante
        ? danoFisico
        : Math.max(danoFisico, danoMagico);
  const danoBrutoPadrao = Math.max(GAME_CONFIG.DANO_MINIMO, danoBasePadrao);

  const classeDefensor = defensor.classeId?.trim().toLowerCase();
  const ehCavaleiroDefensor = classeDefensor === 'cavaleiro';

  const racaAtacante = atacante.racaId ? getRaceById(atacante.racaId) : undefined;
  const temSedeDeSangue =
    racaAtacante?.passivaRacial.efeito === 'roubarVidaDanoFisico';

  const mitigacao = defensor.mitigacao ?? 0;
  const ataques: AtaqueLog[] = [];

  let hpAtual = defensor.hp;
  let sobreescudoAtual = defensor.sobreescudo;
  let hpAtacanteAtual = atacante.hp;
  let contadorFuria = atacante.contadorFuriaSelvagem ?? 0;
  let contadorIra = atacante.contadorIraBarbaro ?? 0;
  let contadorPostura = atacante.contadorPosturaGuardiao ?? 0;
  let contadorJuramento = atacante.contadorJuramentoGuardiao ?? 0;
  let posturaAtacanteAtiva = atacante.posturaGuardiaoAtiva ?? false;
  let juramentoAtacanteAtivo = atacante.juramentoGuardiaoAtivo ?? false;
  let contadorExplosao = atacante.contadorExplosaoArcana ?? 0;
  let contadorAcumulo = atacante.contadorAcumuloArcano ?? 0;
  let cargasAcumulo = atacante.cargasAcumuloArcano ?? 0;
  let contadorCataclismo = atacante.contadorCataclismoArcano ?? 0;
  let contadorRajada = atacante.contadorRajadaGolpes ?? 0;
  let contadorSedeSangue = atacante.contadorSedeSangueBandido ?? 0;
  let cargasSedeSangue = atacante.cargasSedeSangueBandido ?? 0;
  let contadorDanca = atacante.contadorDancaLaminas ?? 0;
  let contadorBencao = atacante.contadorBencaoDivina ?? 0;
  let contadorFe = atacante.contadorFeInabalavel ?? 0;
  let cargasFe = atacante.cargasFeInabalavel ?? 0;
  let contadorMilagre = atacante.contadorMilagreDivino ?? 0;
  let contadorIaijutsu = atacante.contadorIaijutsu ?? 0;
  let contadorFoco = atacante.contadorFocoAbsoluto ?? 0;
  let cargasFoco = atacante.cargasFocoAbsoluto ?? 0;
  let contadorCorteVazio = atacante.contadorCorteDoVazio ?? 0;

  const posturaDefensorAtiva = defensor.posturaGuardiaoAtiva ?? false;
  const juramentoDefensorAtivo = defensor.juramentoGuardiaoAtivo ?? false;

  // Acerto crítico (Sorte): 2% + 0,1% por ponto, sorteado em cada golpe
  const chanceCriticoAtacante = calcularChanceCritico(atacante.atributos.sorte);

  for (let i = 0; i < maxAtaques; i++) {
    if (hpAtual <= 0 || hpAtacanteAtual <= 0) break;

    let danoBruto = danoBrutoPadrao;
    let ehDanoFisico = ehDanoFisicoPadrao;
    let mitigacaoParaAtaque = mitigacao;
    let habilidadeAcionada: string | undefined;
    let instintoSobrevivenciaAtivo: boolean | undefined;
    let iraAbaixo30Ativo: boolean | undefined;
    let ultimoBastiaoAtivo: boolean | undefined;
    let posturaDefensivaAplicada: boolean | undefined;
    let juramentoDefensivoAplicado: boolean | undefined;
    let cargasAcumuloConsumidas: number | undefined;
    let cargasAcumuloRestantes: number | undefined;
    let bonusSobreescudoCataclismoAtivo: boolean | undefined;
    let numeroGolpes: number | undefined;
    let danoPorGolpe: number | undefined;
    let golpes: number[] | undefined;
    let cargasSedeSangueBandidoConsumidas: number | undefined;
    let cargasSedeSangueBandidoRestantes: number | undefined;
    let ignorarDefesaFisicaPercentual: number | undefined;
    let curaHp: number | undefined;
    let cargasFeInabalavelConsumidas: number | undefined;
    let cargasFeInabalavelRestantes: number | undefined;
    let cargasFocoAbsolutoConsumidas: number | undefined;
    let cargasFocoAbsolutoRestantes: number | undefined;
    let bonusSobreescudoCorteDoVazioAtivo: boolean | undefined;
    let golpeExtraCorteDoVazioAtivo: boolean | undefined;
    let danoGolpeExtraCorteDoVazio: number | undefined;
    let danoEfetivoGolpeExtraCorteDoVazio: number | undefined;
    let danoGolpeExtraSamuraiPotencial = 0;
    let acaoCausaDano = true;

    // Modificadores de passiva de subclasse do atacante (ex: Frenesi do Berserker).
    // Entram no mesmo grupo de soma dos outros bônus de dano (regra 1.2.2).
    const modsPassivaAtacante = obterModificadoresPassivaSubclasse({
      subclasseAtualId: atacante.subclasseAtualId,
      subclasseTiers: atacante.subclasseTiers,
      hp: hpAtacanteAtual,
      hpMax: atacante.hpMax,
      nivel: nivelAtacante,
    });

    // Bônus de dano de buffs de quem ataca (Ímpeto Imprudente e Delírio Controlado): entram na soma de cada caminho
    const impetoNesteAtaque =
      atacante.impeto && atacante.impeto.ataquesRestantes > 0 ? atacante.impeto : undefined;
    // Debuffs: o Enfraquecimento de quem ataca reduz o dano; o Ponto Fraco do alvo aumenta (e é consumido no golpe)
    const pontoFracoNesteAtaque = percentualPontoFraco(defensor.debuffs);
    // O tipo de dano do golpe padrão: Feiticeiro e Profeta causam dano mágico; as demais classes, o do atributo maior
    const tipoDanoDaClasse: 'fisico' | 'magico' =
      ehFeiticeiroAtacante || ehProfetaAtacante ? 'magico' : ehDanoFisicoPadrao ? 'fisico' : 'magico';
    const bonusDanoBuffsPorTipo = (tipo: 'fisico' | 'magico'): number =>
      (impetoNesteAtaque?.bonusDanoPercentual ?? 0) +
      bonusDanoDosBuffs(atacante.buffs, tipo) +
      bonusDanoDosDebuffs(atacante.debuffs) +
      pontoFracoNesteAtaque;
    const bonusDanoBuffs = bonusDanoBuffsPorTipo(
      ehBarbaroAtacante || ehCavaleiroAtacante || ehBandidoAtacante || ehSamuraiAtacante
        ? 'fisico'
        : tipoDanoDaClasse
    );
    let debuffsNovosNoAlvo: AplicacaoDebuff[] | undefined;
    // Foco: este ataque ignora parte da defesa do inimigo (consumido ao atacar)
    const focoNesteAtaque = atacante.focoProximoAtaque ?? 0;

    if (ehBarbaroAtacante) {
      const golpe = calcularGolpeBarbaro({
        forcaBase: atacante.atributos.forca,
        hpAtual: hpAtacanteAtual,
        hpMax: atacante.hpMax,
        nivel: nivelAtacante,
        contadorFuria,
        contadorIra,
        bonusDanoExtraPercentual: modsPassivaAtacante.bonusDanoFisicoPercentual + bonusDanoBuffs,
      });
      danoBruto = golpe.danoBruto;
      contadorFuria = golpe.novoContadorFuria;
      contadorIra = golpe.novoContadorIra;
      habilidadeAcionada = golpe.habilidadeAcionada;
      instintoSobrevivenciaAtivo = golpe.instintoAtivo;
      iraAbaixo30Ativo = golpe.iraAbaixo30Ativo;
    } else if (ehCavaleiroAtacante) {
      const golpeCavaleiro = calcularAtaqueCavaleiro({
        forcaBase: atacante.atributos.forca,
        nivel: nivelAtacante,
        contadorPostura,
        contadorJuramento,
      });
      danoBruto =
        bonusDanoBuffs !== 0
          ? Math.max(
              GAME_CONFIG.DANO_MINIMO,
              Math.ceil((golpeCavaleiro.danoBruto * Math.max(0, 100 + bonusDanoBuffs)) / 100)
            )
          : golpeCavaleiro.danoBruto;
      contadorPostura = golpeCavaleiro.novoContadorPostura;
      contadorJuramento = golpeCavaleiro.novoContadorJuramento;
      habilidadeAcionada = golpeCavaleiro.habilidadeAcionada;
      if (golpeCavaleiro.ativouPostura) {
        posturaAtacanteAtiva = true;
      }
      if (golpeCavaleiro.ativouJuramento) {
        juramentoAtacanteAtivo = true;
      }
    } else if (ehFeiticeiroAtacante) {
      const golpeFeiticeiro = calcularGolpeFeiticeiro({
        inteligenciaBase: atacante.atributos.inteligencia,
        nivel: nivelAtacante,
        contadorExplosao,
        contadorAcumulo,
        cargasAcumulo,
        contadorCataclismo,
        sobreescudoAlvo: sobreescudoAtual,
        mitigacaoMagicaAlvo: mitigacao,
        bonusDanoExtraPercentual: bonusDanoBuffs,
      });
      danoBruto = golpeFeiticeiro.danoBruto;
      mitigacaoParaAtaque = golpeFeiticeiro.mitigacaoEfetiva;
      contadorExplosao = golpeFeiticeiro.novoContadorExplosao;
      contadorAcumulo = golpeFeiticeiro.novoContadorAcumulo;
      cargasAcumulo = golpeFeiticeiro.novasCargasAcumulo;
      contadorCataclismo = golpeFeiticeiro.novoContadorCataclismo;
      habilidadeAcionada = golpeFeiticeiro.habilidadeAcionada;
      cargasAcumuloConsumidas = golpeFeiticeiro.cargasConsumidas;
      cargasAcumuloRestantes = golpeFeiticeiro.novasCargasAcumulo;
      bonusSobreescudoCataclismoAtivo = golpeFeiticeiro.bonusSobreescudoCataclismoAtivo;
    } else if (ehBandidoAtacante) {
      const golpeBandido = calcularGolpeBandido({
        forcaBase: atacante.atributos.forca,
        nivel: nivelAtacante,
        contadorRajada,
        contadorSedeSangue,
        cargasSedeSangue,
        contadorDanca,
        mitigacaoFisicaAlvo: mitigacao,
        bonusDanoExtraPercentual: bonusDanoBuffs,
      });
      danoBruto = golpeBandido.danoBruto;
      mitigacaoParaAtaque = golpeBandido.mitigacaoPorGolpeEfetiva;
      contadorRajada = golpeBandido.novoContadorRajada;
      contadorSedeSangue = golpeBandido.novoContadorSedeSangue;
      cargasSedeSangue = golpeBandido.novasCargasSedeSangue;
      contadorDanca = golpeBandido.novoContadorDanca;
      habilidadeAcionada = golpeBandido.habilidadeAcionada;
      numeroGolpes = golpeBandido.numeroGolpes;
      danoPorGolpe = golpeBandido.danoPorGolpe;
      golpes = golpeBandido.golpes;
      cargasSedeSangueBandidoConsumidas = golpeBandido.cargasConsumidas;
      cargasSedeSangueBandidoRestantes = golpeBandido.novasCargasSedeSangue;
      ignorarDefesaFisicaPercentual = golpeBandido.ignorarDefesaFisicaPercentual;
    } else if (ehProfetaAtacante) {
      const acaoProfeta = calcularAcaoProfeta({
        inteligenciaBase: atacante.atributos.inteligencia,
        hpAtual: hpAtacanteAtual,
        hpMax: atacante.hpMax,
        nivel: nivelAtacante,
        contadorBencao,
        contadorFeInabalavel: contadorFe,
        cargasFeInabalavel: cargasFe,
        contadorMilagre,
      });
      // Cicatrização reduz a cura do Profeta (Bênção e Milagre)
      const fatorCuraProfeta = fatorCuraPercentual(atacante.debuffs) / 100;
      const curaProfeta = acaoProfeta.curaHp * fatorCuraProfeta;
      danoBruto =
        acaoProfeta.causaDano && bonusDanoBuffs !== 0
          ? Math.max(
              GAME_CONFIG.DANO_MINIMO,
              Math.ceil((acaoProfeta.danoBruto * Math.max(0, 100 + bonusDanoBuffs)) / 100)
            )
          : acaoProfeta.danoBruto;
      acaoCausaDano = acaoProfeta.causaDano;
      hpAtacanteAtual =
        fatorCuraProfeta === 1
          ? acaoProfeta.novoHp
          : Math.min(atacante.hpMax, hpAtacanteAtual + curaProfeta);
      contadorBencao = acaoProfeta.novoContadorBencao;
      contadorFe = acaoProfeta.novoContadorFeInabalavel;
      cargasFe = acaoProfeta.novasCargasFeInabalavel;
      contadorMilagre = acaoProfeta.novoContadorMilagre;
      habilidadeAcionada = acaoProfeta.habilidadeAcionada;
      curaHp = curaProfeta;
      cargasFeInabalavelConsumidas = acaoProfeta.cargasConsumidas;
      cargasFeInabalavelRestantes = acaoProfeta.novasCargasFeInabalavel;
    } else if (ehSamuraiAtacante) {
      const golpeSamurai = calcularGolpeSamurai({
        forcaBase: atacante.atributos.forca,
        nivel: nivelAtacante,
        contadorIaijutsu,
        contadorFocoAbsoluto: contadorFoco,
        cargasFocoAbsoluto: cargasFoco,
        contadorCorteDoVazio: contadorCorteVazio,
        sobreescudoAlvo: sobreescudoAtual,
        mitigacaoFisicaAlvo: mitigacao,
        bonusDanoExtraPercentual: bonusDanoBuffs,
      });
      danoBruto = golpeSamurai.danoBrutoPrincipal;
      danoGolpeExtraSamuraiPotencial = golpeSamurai.danoGolpeExtraBase;
      mitigacaoParaAtaque = golpeSamurai.mitigacaoEfetiva;
      contadorIaijutsu = golpeSamurai.novoContadorIaijutsu;
      contadorFoco = golpeSamurai.novoContadorFocoAbsoluto;
      cargasFoco = golpeSamurai.novasCargasFocoAbsoluto;
      contadorCorteVazio = golpeSamurai.novoContadorCorteDoVazio;
      habilidadeAcionada = golpeSamurai.habilidadeAcionada;
      ignorarDefesaFisicaPercentual = golpeSamurai.ignorarDefesaFisicaPercentual;
      cargasFocoAbsolutoConsumidas = golpeSamurai.cargasConsumidas;
      cargasFocoAbsolutoRestantes = golpeSamurai.novasCargasFocoAbsoluto;
      bonusSobreescudoCorteDoVazioAtivo = golpeSamurai.bonusSobreescudoCorteDoVazioAtivo;
    } else if (bonusDanoBuffs !== 0) {
      // Combatentes sem classe (monstros): os bônus e debuffs de dano (Enfraquecimento, Ponto Fraco...) valem igual
      danoBruto = Math.max(
        GAME_CONFIG.DANO_MINIMO,
        Math.ceil((danoBruto * Math.max(0, 100 + bonusDanoBuffs)) / 100)
      );
    }

    let novoImpeto: Combatente['impeto'];
    let novoFoco: number | undefined;
    let buffsAplicados: string[] | undefined;
    let debuffsAplicados: string[] | undefined;
    let statusForcadosNoAlvo: EfeitoStatus[] | undefined;
    let golpesMarcadores = 0;
    let elementoDaHabilidade: Elemento | undefined;
    let statusComChance: { status: EfeitoStatus; chanceExtraPercentual?: number }[] | undefined;
    let inversaoDeSorte: ResultadoHabilidade['inversaoDeSorte'];
    let ignorarResistenciaElementalDoGolpe = false;
    let danoAcumulativoUsado: number | undefined;

    // Interceptação de Habilidade equipada (subclasse ou customizada)
    let resultadoHabilidadeInterceptada: ResultadoHabilidade | undefined;
    let efeitosDefensivosAplicados: TipoEfeitoDefensivo[] | undefined;
    // Habilidade racial de ataque (Vampiro, Draconiano): no lugar do 1º ataque da ação em que disparou
    const racialDeAtaque =
      i === 0 && atacante.racialAtaquePendente && atacante.racaId
        ? definicaoRacialDeAtaque(atacante.racaId, atacante.linhagem)
        : undefined;
    let elementoRacial: Elemento | undefined;
    if (atacante.classeId && (racialDeAtaque || atacante.habilidadesEquipadas)) {
      const slot = obterSlotAcionado(atacante.classeId, habilidadeAcionada);
      const habId = slot && atacante.habilidadesEquipadas ? atacante.habilidadesEquipadas[slot] : undefined;
      const defHab = racialDeAtaque?.definicao ?? (habId ? obterHabilidade(habId) : undefined);
      if (racialDeAtaque) {
        elementoRacial = racialDeAtaque.elemento;
      }
      if (defHab) {
        const tipoPrevisto = defHab.tipoDano ?? 'fisico';
        const danoBasePlano = tipoPrevisto === 'fisico' ? danoFisico : danoMagico;
        const passivasClasse = separarPassivasDanoDaClasse({
          classeId: atacante.classeId,
          danoBasePlano,
          hp: hpAtacanteAtual,
          hpMax: atacante.hpMax,
          nivel: nivelAtacante,
        });
        const danoBase = passivasClasse.danoBase;
        const ctxHab: ContextoHabilidade = {
          atacante: {
            hp: hpAtacanteAtual,
            hpMax: atacante.hpMax,
            nivel: nivelAtacante,
          },
          alvo: {
            hp: hpAtual,
            hpMax: defensor.hpMax,
            sobreescudo: sobreescudoAtual,
            mitigacaoFisica: mitigacao,
            mitigacaoMagica: mitigacao,
            condicoes: condicoesDoAlvo(defensor),
            marcas: defensor.marcas ?? 0,
            elemento: defensor.elementoAtaque,
          },
          danoBase,
          bonusDanoExtraPercentual:
            passivasClasse.bonusDanoPercentual +
            (tipoPrevisto === 'fisico' ? modsPassivaAtacante.bonusDanoFisicoPercentual : 0),
        };

        const resHab = aplicarBonusElemental(defHab.executar(ctxHab));
        if (resHab.tipoDano !== tipoPrevisto) {
          throw new Error(
            `Tipo de dano retornado (${resHab.tipoDano}) difere do tipo de dano definido na habilidade "${defHab.id}" (${tipoPrevisto}).`
          );
        }

        // Dano ofensivo (catálogo 1.2): bônus acumulado e Ímpeto entram na mesma soma
        const bonusAcumulativo = resHab.acumulativo ? atacante.danoAcumulativoPercentual ?? 0 : 0;
        const ctxResolvido: ContextoHabilidade = {
          ...ctxHab,
          bonusDanoExtraPercentual:
            (ctxHab.bonusDanoExtraPercentual ?? 0) +
            bonusAcumulativo +
            bonusDanoBuffsPorTipo(tipoPrevisto),
        };
        const { danoBruto: novoDanoBruto, mitigacaoEfetiva } = resolverDanoHabilidade(
          resHab,
          ctxResolvido
        );
        if (resHab.acumulativo) {
          danoAcumulativoUsado = bonusAcumulativo;
          atacante.danoAcumulativoPercentual = Math.min(
            resHab.acumulativo.limitePercentual,
            bonusAcumulativo + resHab.acumulativo.percentualPorAtaque
          );
        }
        if (resHab.impeto && resHab.impeto.ataques > 0) {
          novoImpeto = {
            ataquesRestantes: resHab.impeto.ataques,
            bonusDanoPercentual: resHab.impeto.bonusDanoPercentual,
            reducaoDefesaPercentual: resHab.impeto.reducaoDefesaPercentual,
          };
        }
        ignorarResistenciaElementalDoGolpe = resHab.ignorarResistenciaElemental === true;

        // Atributos e buffs (catálogo 1.2): valem a partir da próxima ação
        if (resHab.buffs && resHab.buffs.length > 0) {
          atacante.buffs = adicionarBuffs(atacante.buffs, resHab.buffs);
          buffsAplicados = resHab.buffs.map((b) => (b.tipo === 'atributo' ? `atributo:${b.atributo}` : b.tipo));
        }
        if (resHab.foco && resHab.foco.ignorarDefesaPercentual > 0) {
          novoFoco = Math.min(100, resHab.foco.ignorarDefesaPercentual);
        }
        // Debuffs e controle (catálogo 1.2): valem no inimigo a partir da próxima ação dele
        if (resHab.efeitosNoAlvo && resHab.efeitosNoAlvo.length > 0) {
          debuffsNovosNoAlvo = resHab.efeitosNoAlvo;
          debuffsAplicados = resHab.efeitosNoAlvo.map((d) => d.tipo);
        }
        if (resHab.statusForcadosNoAlvo && resHab.statusForcadosNoAlvo.length > 0) {
          statusForcadosNoAlvo = resHab.statusForcadosNoAlvo;
        }
        inversaoDeSorte = resHab.inversaoDeSorte;
        elementoDaHabilidade = resHab.elemento;
        if (resHab.statusComChanceNoAlvo && resHab.statusComChanceNoAlvo.length > 0) {
          statusComChance = resHab.statusComChanceNoAlvo;
        }
        if (resHab.marcar) {
          golpesMarcadores = Math.max(1, resHab.numeroGolpes ?? 1);
        }
        // Aceleração: +1 ação extra neste round (uma vez por turno)
        if (resHab.acaoExtra && !acaoExtraConcedida) {
          acaoExtraConcedida = true;
          maxAtaques += 1;
        }

        danoBruto = novoDanoBruto;
        habilidadeAcionada = resHab.nome;
        ehDanoFisico = resHab.tipoDano === 'fisico';
        mitigacaoParaAtaque = mitigacaoEfetiva;
        acaoCausaDano = true;
        golpes = undefined;
        numeroGolpes = undefined;
        danoPorGolpe = undefined;
        // Golpe Duplo / Dano Replicado: vários golpes na mesma ação, cada um com o dano da habilidade
        if (resHab.numeroGolpes && resHab.numeroGolpes > 1) {
          numeroGolpes = resHab.numeroGolpes;
          danoPorGolpe = novoDanoBruto;
          golpes = Array.from({ length: resHab.numeroGolpes }, () => novoDanoBruto);
          danoBruto = novoDanoBruto * resHab.numeroGolpes;
        }
        curaHp = undefined;
        instintoSobrevivenciaAtivo = undefined;
        iraAbaixo30Ativo = undefined;
        cargasAcumuloConsumidas = undefined;
        cargasAcumuloRestantes = undefined;
        bonusSobreescudoCataclismoAtivo = undefined;
        cargasSedeSangueBandidoConsumidas = undefined;
        cargasSedeSangueBandidoRestantes = undefined;
        ignorarDefesaFisicaPercentual = resHab.ignorarDefesaPercentual;
        cargasFeInabalavelConsumidas = undefined;
        cargasFeInabalavelRestantes = undefined;
        cargasFocoAbsolutoConsumidas = undefined;
        cargasFocoAbsolutoRestantes = undefined;
        bonusSobreescudoCorteDoVazioAtivo = undefined;
        golpeExtraCorteDoVazioAtivo = undefined;
        danoGolpeExtraCorteDoVazio = undefined;
        danoEfetivoGolpeExtraCorteDoVazio = undefined;
        danoGolpeExtraSamuraiPotencial = 0;

        resultadoHabilidadeInterceptada = resHab;

        // Mitigação e defesa (catálogo 1.2): efeitos que a habilidade coloca em quem a usou
        if (resHab.efeitosNoUsuario && resHab.efeitosNoUsuario.length > 0) {
          const sobreescudoMaxAtacante = calcularSobreescudoMax(atacante.atributos.vitalidade, {
            classeId: atacante.classeId,
            nivel: nivelAtacante,
            subclasseAtualId: atacante.subclasseAtualId,
            subclasseTiers: atacante.subclasseTiers,
          });
          let efeitosAtacante = atacante.efeitosDefensivos ?? [];
          for (const aplicacao of resHab.efeitosNoUsuario) {
            const res = adicionarEfeitoDefensivo(efeitosAtacante, aplicacao, sobreescudoMaxAtacante);
            efeitosAtacante = res.efeitos;
            atacante.sobreescudo =
              Math.max(0, atacante.sobreescudo - res.sobreescudoRemovido) + res.sobreescudoGanho;
          }
          atacante.efeitosDefensivos = efeitosAtacante;
          efeitosDefensivosAplicados = resHab.efeitosNoUsuario.map((a) => a.efeito);
        }
      }
    }

    // Ímpeto Imprudente: este ataque gasta 1 dos N; uma nova aplicação (da habilidade usada agora) vale a partir do próximo
    if (impetoNesteAtaque && atacante.impeto) {
      const restantes = atacante.impeto.ataquesRestantes - 1;
      atacante.impeto = restantes > 0 ? { ...atacante.impeto, ataquesRestantes: restantes } : undefined;
    }
    if (novoImpeto) {
      atacante.impeto = novoImpeto;
    }
    // Foco: o ataque que usou o Foco o consome; um novo Foco vale a partir do próximo
    if (acaoCausaDano && focoNesteAtaque > 0) {
      atacante.focoProximoAtaque = undefined;
    }
    if (novoFoco !== undefined) {
      atacante.focoProximoAtaque = novoFoco;
    }
    // Milagre Divino (ultimate do Profeta): +15% de dano e de defesa nas 2 rodadas seguintes (decisão do Yuri, 09/10/2026)
    if (habilidadeAcionada === 'Milagre Divino') {
      atacante.buffs = adicionarBuffs(atacante.buffs, [
        {
          tipo: 'bonusDanoDefesa',
          id: 'milagreDivino',
          danoPercentual: GAME_CONFIG.MILAGRE_DIVINO_BONUS_PERCENTUAL,
          defesaPercentual: GAME_CONFIG.MILAGRE_DIVINO_BONUS_PERCENTUAL,
          rodadas: GAME_CONFIG.MILAGRE_DIVINO_BONUS_RODADAS,
        },
      ]);
    }
    // Ponto Fraco: o golpe que o aproveitou o consome; um novo Ponto Fraco vale a partir do próximo golpe
    if (acaoCausaDano && pontoFracoNesteAtaque > 0) {
      defensor.debuffs = consumirPontoFraco(defensor.debuffs);
    }
    if (debuffsNovosNoAlvo && acaoCausaDano) {
      defensor.debuffs = adicionarDebuffs(defensor.debuffs, debuffsNovosNoAlvo);
    }
    // Marca: cada golpe da habilidade marcadora coloca 1 marca no alvo
    if (golpesMarcadores > 0 && acaoCausaDano) {
      adicionarMarcas(defensor, golpesMarcadores);
    }

    // Identifica se o golpe atual possui elemento (via habilidade de classe cadastrada ou elementoAtaque do combatente/monstro)
    let elementoGolpe: Elemento | undefined;
    if (acaoCausaDano) {
      // Habilidade de registro com elemento próprio (ex.: subclasses) vale mais que o elemento da classe
      elementoGolpe = elementoDaHabilidade;
      if (elementoGolpe === undefined && atacante.classeId && habilidadeAcionada) {
        const classeDef = getClassById(atacante.classeId);
        if (classeDef) {
          const { ataqueBasico, habilidadeEspecial, ultimate } = classeDef.progressao;
          if (habilidadeAcionada === ataqueBasico.nome) {
            elementoGolpe = ataqueBasico.elemento;
          } else if (habilidadeAcionada === habilidadeEspecial.nome) {
            elementoGolpe = habilidadeEspecial.elemento;
          } else if (habilidadeAcionada === ultimate.nome) {
            elementoGolpe = ultimate.elemento;
          }
        }
      }
      if (elementoGolpe === undefined && elementoRacial !== undefined) {
        elementoGolpe = elementoRacial;
      }
      if (elementoGolpe === undefined && atacante.elementoAtaque !== undefined) {
        elementoGolpe = atacante.elementoAtaque;
      }
    }

    // Cálculo elemental na ordem exigida:
    // (a) dano bruto normal já calculado acima
    // (b) obtém modificadores do alvo (monstro pelo campo dele, ou personagem via obterModificadoresRaciais)
    // (c) calcula o multiplicador com calcularMultiplicadorElemental
    // (d) aplica com aplicarMultiplicadorElemental sobre o dano bruto
    // (e) segue o fluxo já existente: mitigação → Sobreescudo → HP
    let multiplicadorElemental: number | undefined;
    let reacaoElemental: ReacaoElemental | undefined;

    if (acaoCausaDano && elementoGolpe !== undefined) {
      const modsRaciaisDefensor = defensor.racaId
        ? obterModificadoresRaciais(defensor.racaId, defensor.linhagem)
        : {};
      const modificadoresCombinados = combinarModificadores(
        modsRaciaisDefensor,
        defensor.modificadoresElementais ?? {}
      );
      // Dano Elemental Forçado: ignora resistências e imunidades do alvo; fraquezas continuam valendo
      const modificadoresAlvo: ModificadoresElementais = ignorarResistenciaElementalDoGolpe
        ? {
            ...modificadoresCombinados,
            [elementoGolpe]: Math.max(0, modificadoresCombinados[elementoGolpe] ?? 0),
          }
        : modificadoresCombinados;

      multiplicadorElemental = calcularMultiplicadorElemental(elementoGolpe, modificadoresAlvo);
      reacaoElemental = obterTextoReacaoElemental(elementoGolpe, modificadoresAlvo);
      danoBruto = aplicarMultiplicadorElemental(danoBruto, multiplicadorElemental);

      if (golpes && golpes.length > 0) {
        golpes = golpes.map((g) =>
          aplicarMultiplicadorElemental(g, multiplicadorElemental as number)
        );
        danoPorGolpe = golpes[0];
        danoBruto = golpes.reduce((acc, val) => acc + val, 0);
      }
    }

    // Roadmap 1.3: tipo do golpe (Contusão/Corte/Perfuração da arma, ou mágico) contra o corpo do alvo.
    // Multiplicador à parte do elemental (±25%), aplicado antes de defesa e crítico.
    let tipoGolpe: TipoGolpe | undefined;
    let multiplicadorTipoDano: number | undefined;
    let reacaoTipoDano: 'fraqueza' | 'resistência' | undefined;
    if (acaoCausaDano) {
      tipoGolpe = ehDanoFisico ? atacante.tipoDanoFisico : 'magico';
      const corpo = reacaoDoCorpo(defensor, tipoGolpe);
      if (corpo.fatorPercentual !== 100) {
        multiplicadorTipoDano = corpo.fatorPercentual / 100;
        reacaoTipoDano = corpo.reacao;
        const fator = corpo.fatorPercentual;
        const aplicar = (v: number): number => Math.floor((v * fator) / 100);
        danoBruto = aplicar(danoBruto);
        if (golpes && golpes.length > 0) {
          golpes = golpes.map(aplicar);
          danoPorGolpe = golpes[0];
          danoBruto = golpes.reduce((acc, val) => acc + val, 0);
        }
        if (danoGolpeExtraSamuraiPotencial > 0) {
          danoGolpeExtraSamuraiPotencial = aplicar(danoGolpeExtraSamuraiPotencial);
        }
      }
    }

    // Bloco C: o golpe pode encerrar status de controle do defensor
    let statusEncerrado: 'congelamento' | 'paralisia' | undefined;
    if (acaoCausaDano) {
      if (elementoGolpe === 'fogo') {
        // Congelamento: o dano de fogo encerra a lentidão antes do fim
        const semGelo = removerLentidaoDeOrigem(defensor.debuffs, 'congelamento');
        if (semGelo.removeu) {
          defensor.debuffs = semGelo.debuffs;
          statusEncerrado = 'congelamento';
        }
      }
      // Paralisia: ao ser atingido o alvo acorda e perde Agilidade por 2 rodadas
      const lentidaoAoAcordar = EFEITOS_STATUS.paralisia.lentidaoAoAcordar;
      if (lentidaoAoAcordar && danoBruto > 0) {
        const acordou = acordarDaParalisia(defensor.debuffs, lentidaoAoAcordar);
        if (acordou.acordou) {
          defensor.debuffs = acordou.debuffs;
          statusEncerrado = 'paralisia';
        }
      }
    }

    // Modificadores de passiva de subclasse do defensor (ex: Casca de Pedra do Colosso)
    const modsPassivaDefensor = obterModificadoresPassivaSubclasse({
      subclasseAtualId: defensor.subclasseAtualId,
      subclasseTiers: defensor.subclasseTiers,
      hp: hpAtual,
      hpMax: defensor.hpMax,
      nivel: nivelDefensor,
    });
    // Ímpeto Imprudente do defensor: a defesa dele cai enquanto durar (o Cavaleiro calcula a própria defesa à parte)
    const impetoDefensor =
      defensor.impeto && defensor.impeto.ataquesRestantes > 0 ? defensor.impeto : undefined;
    // Ajuste da defesa do defensor: Ímpeto (−), Foco do atacante (−) e Delírio Controlado (+); 100 = sem ajuste
    const fatorDefesaPercentual =
      acaoCausaDano
        ? ((100 - (impetoDefensor?.reducaoDefesaPercentual ?? 0)) *
            (100 - focoNesteAtaque) *
            (100 + bonusDefesaDosBuffs(defensor.buffs)) *
            (100 - reducaoDefesaPorPressao(defensor.debuffs, hpAtual, defensor.hpMax)) *
            (100 - reducaoDefesaDosDebuffs(defensor.debuffs))) /
          100_000_000
        : 100;
    if (fatorDefesaPercentual !== 100 && !ehCavaleiroDefensor) {
      mitigacaoParaAtaque = Math.floor(
        (mitigacaoParaAtaque * Math.max(0, fatorDefesaPercentual)) / 100
      );
    }

    // Efeitos de Mitigação e defesa do defensor (Resistências, Contrapeso, Absorção Mágica, Imortalidade...)
    const efeitosDefensor = defensor.efeitosDefensivos ?? [];
    const defensorImortal = acaoCausaDano && estaImortal(efeitosDefensor);
    // Resistência racial de dano recebido (1.4.1/1.4.2) entra na mesma soma, junto das reduções dos efeitos
    const resistenciaRacialDefensor = acaoCausaDano ? obterResistenciasRaciais(defensor.racaId) : undefined;
    const reducaoPorEfeitos = acaoCausaDano
      ? reducaoDanoRecebidoPorEfeitos(efeitosDefensor, {
          ehDanoFisico,
          hp: hpAtual,
          hpMax: defensor.hpMax,
        }) +
        (ehDanoFisico
          ? resistenciaRacialDefensor?.danoFisicoPercentual ?? 0
          : resistenciaRacialDefensor?.danoMagicoPercentual ?? 0)
      : 0;

    // Regra 1.2.2: as reduções de dano recebido somam, com teto de 80%
    // (no Cavaleiro, a soma é feita dentro de aplicarDefesaCavaleiro, junto das reduções dele)
    const reducaoRecebidaTotal =
      (ehDanoFisico ? modsPassivaDefensor.reducaoDanoFisicoRecebidoPercentual : 0) +
      reducaoPorEfeitos;
    if (!ehCavaleiroDefensor && acaoCausaDano && reducaoRecebidaTotal > 0) {
      const reducaoLimitada = limitarReducaoDanoPercentual(reducaoRecebidaTotal);
      if (golpes && golpes.length > 1) {
        golpes = golpes.map((g) => reduzirDanoPercentual(g, reducaoLimitada));
        danoPorGolpe = golpes[0];
        danoBruto = golpes.reduce((acc, val) => acc + val, 0);
      } else {
        danoBruto = reduzirDanoPercentual(danoBruto, reducaoLimitada);
      }
      if (ehDanoFisico && danoGolpeExtraSamuraiPotencial > 0) {
        danoGolpeExtraSamuraiPotencial = reduzirDanoPercentual(
          danoGolpeExtraSamuraiPotencial,
          reducaoLimitada
        );
      }
    }
    const sobreescudoDefensorAntes = sobreescudoAtual;

    // Crítico: cada golpe sorteia; o dano dobra depois da defesa
    let golpesCriticos = 0;
    const multiplicadorCriticoDoGolpe = (indiceGolpe: number): number => {
      if (!acaoCausaDano || !opcoesTurno?.sorteioCritico) {
        return 1;
      }
      const mult = multiplicadorCritico(
        opcoesTurno.sorteioCritico(i, indiceGolpe),
        chanceCriticoAtacante
      );
      if (mult > 1) {
        golpesCriticos++;
      }
      return mult;
    };

    let danoEfetivo: number;
    if (!acaoCausaDano) {
      danoEfetivo = 0;
    } else if (defensorImortal) {
      // Imortalidade Breve: o golpe não causa dano nenhum
      danoEfetivo = 0;
    } else if (golpes && golpes.length > 1) {
      let totalEfetivoGolpes = 0;
      for (const [indiceGolpe, danoGolpeIndividual] of golpes.entries()) {
        const multCritico = multiplicadorCriticoDoGolpe(indiceGolpe);
        if (ehCavaleiroDefensor) {
          const defRes = aplicarDefesaCavaleiro({
            danoBruto: danoGolpeIndividual,
            mitigacaoBase: mitigacaoParaAtaque,
            vitalidadeBase: defensor.atributos.vitalidade,
            sobreescudoAtual,
            hpAtual,
            hpMax: defensor.hpMax,
            nivel: nivelDefensor,
            ehDanoFisico,
            posturaAtiva: posturaDefensorAtiva,
            juramentoAtivo: juramentoDefensorAtivo,
            multiplicadorPosDefesa: multCritico,
            reducaoDanoExtraPercentual: reducaoPorEfeitos,
            fatorDefesaPercentual,
          });
          sobreescudoAtual = defRes.sobreescudo;
          hpAtual = defRes.hp;
          totalEfetivoGolpes += defRes.danoEfetivo;
          ultimoBastiaoAtivo = defRes.ultimoBastiaoAtivo;
          posturaDefensivaAplicada = defRes.posturaAplicada;
          juramentoDefensivoAplicado = defRes.juramentoAplicado;
        } else {
          const resGolpe = aplicarDano(
            danoGolpeIndividual,
            mitigacaoParaAtaque,
            sobreescudoAtual,
            hpAtual,
            multCritico
          );
          const efetivoGolpe =
            Math.max(GAME_CONFIG.DANO_MINIMO, danoGolpeIndividual - mitigacaoParaAtaque) *
            multCritico;
          totalEfetivoGolpes += efetivoGolpe;
          sobreescudoAtual = resGolpe.sobreescudo;
          hpAtual = resGolpe.hp;
        }
      }
      danoEfetivo = totalEfetivoGolpes;
    } else if (ehCavaleiroDefensor) {
      const defRes = aplicarDefesaCavaleiro({
        danoBruto,
        mitigacaoBase: mitigacaoParaAtaque,
        vitalidadeBase: defensor.atributos.vitalidade,
        sobreescudoAtual,
        hpAtual,
        hpMax: defensor.hpMax,
        nivel: nivelDefensor,
        ehDanoFisico,
        posturaAtiva: posturaDefensorAtiva,
        juramentoAtivo: juramentoDefensorAtivo,
        multiplicadorPosDefesa: multiplicadorCriticoDoGolpe(0),
        reducaoDanoExtraPercentual: reducaoPorEfeitos,
            fatorDefesaPercentual,
      });
      sobreescudoAtual = defRes.sobreescudo;
      hpAtual = defRes.hp;
      danoEfetivo = defRes.danoEfetivo;
      ultimoBastiaoAtivo = defRes.ultimoBastiaoAtivo;
      posturaDefensivaAplicada = defRes.posturaAplicada;
      juramentoDefensivoAplicado = defRes.juramentoAplicado;
    } else {
      const multCritico = multiplicadorCriticoDoGolpe(0);
      const res = aplicarDano(
        danoBruto,
        mitigacaoParaAtaque,
        sobreescudoAtual,
        hpAtual,
        multCritico
      );
      danoEfetivo =
        Math.max(GAME_CONFIG.DANO_MINIMO, danoBruto - mitigacaoParaAtaque) * multCritico;
      sobreescudoAtual = res.sobreescudo;
      hpAtual = res.hp;
    }

    // Golpe adicional automático de "Corte do Vazio" (Samurai Nível 30):
    // Depois de aplicar o dano do Corte do Vazio, verifica o HP resultante do inimigo:
    // se ficou em 20% do HP máximo dele ou menos, aplica automaticamente um golpe adicional
    // de 100% do dano físico normal (dano separado, mesma mitigação).
    if (ehSamuraiAtacante && habilidadeAcionada === 'Corte do Vazio' && !defensorImortal) {
      const ficouEm20PorCentoOuMenos =
        defensor.hpMax > 0 && hpAtual <= (defensor.hpMax * 20) / 100;
      if (ficouEm20PorCentoOuMenos) {
        golpeExtraCorteDoVazioAtivo = true;
        danoGolpeExtraCorteDoVazio = danoGolpeExtraSamuraiPotencial;
        if (ehCavaleiroDefensor) {
          const defResExtra = aplicarDefesaCavaleiro({
            danoBruto: danoGolpeExtraSamuraiPotencial,
            mitigacaoBase: mitigacaoParaAtaque,
            vitalidadeBase: defensor.atributos.vitalidade,
            sobreescudoAtual,
            hpAtual,
            hpMax: defensor.hpMax,
            nivel: nivelDefensor,
            ehDanoFisico,
            posturaAtiva: false,
            juramentoAtivo: false,
            multiplicadorPosDefesa: multiplicadorCriticoDoGolpe(1),
            reducaoDanoExtraPercentual: reducaoPorEfeitos,
            fatorDefesaPercentual,
          });
          sobreescudoAtual = defResExtra.sobreescudo;
          hpAtual = defResExtra.hp;
          danoEfetivoGolpeExtraCorteDoVazio = defResExtra.danoEfetivo;
        } else {
          const multCriticoExtra = multiplicadorCriticoDoGolpe(1);
          const resExtra = aplicarDano(
            danoGolpeExtraSamuraiPotencial,
            mitigacaoParaAtaque,
            sobreescudoAtual,
            hpAtual,
            multCriticoExtra
          );
          danoEfetivoGolpeExtraCorteDoVazio =
            Math.max(
              GAME_CONFIG.DANO_MINIMO,
              danoGolpeExtraSamuraiPotencial - mitigacaoParaAtaque
            ) * multCriticoExtra;
          sobreescudoAtual = resExtra.sobreescudo;
          hpAtual = resExtra.hp;
        }
        danoBruto += danoGolpeExtraCorteDoVazio;
        danoEfetivo += danoEfetivoGolpeExtraCorteDoVazio;
      } else {
        golpeExtraCorteDoVazioAtivo = false;
        danoGolpeExtraCorteDoVazio = 0;
        danoEfetivoGolpeExtraCorteDoVazio = 0;
      }
    }

    // Inversão de Sorte: se a Agilidade do alvo for menor ou igual à de quem usou, o alvo sofre dano direto
    let inversaoDeSorteDano: number | undefined;
    if (inversaoDeSorte && acaoCausaDano && !defensorImortal && agilDefensor <= agilAtacante && hpAtual > 0) {
      inversaoDeSorteDano = Math.ceil((defensor.hpMax * inversaoDeSorte.percentualHpMaxAlvo) / 100);
      hpAtual = Math.max(0, hpAtual - inversaoDeSorteDano);
    }

    // Ressurreição Parcial: se o defensor caiu a 0, volta com X% do HP (uma vez por luta)
    let ressurreicaoDefensor = false;
    if (hpAtual <= 0 && defensor.ressurreicaoParcial) {
      const rev = tentarRessurreicaoParcial(defensor.ressurreicaoParcial, hpAtual, defensor.hpMax);
      if (rev.ressuscitou) {
        hpAtual = rev.hp;
        defensor.ressurreicaoParcial = rev.estado;
        ressurreicaoDefensor = true;
      }
    }

    // O Sobreescudo gasto sai primeiro do Escudo Temporário; a Absorção Mágica vale para um ataque mágico só
    if (acaoCausaDano && efeitosDefensor.length > 0) {
      let efeitosAtualizados = gastarEscudoTemporario(
        efeitosDefensor,
        Math.max(0, sobreescudoDefensorAntes - sobreescudoAtual)
      );
      if (!ehDanoFisico) {
        efeitosAtualizados = consumirAbsorcaoMagica(efeitosAtualizados);
      }
      defensor.efeitosDefensivos = efeitosAtualizados;
    }

    // Redirecionamento (counter): parte do dano recebido volta para o atacante, sem defesa
    const danoRedirecionado = acaoCausaDano
      ? calcularDanoRedirecionado(danoEfetivo, percentualRedirecionamento(efeitosDefensor))
      : 0;
    if (danoRedirecionado > 0) {
      const resRedirecionado = aplicarDano(danoRedirecionado, 0, atacante.sobreescudo, hpAtacanteAtual);
      atacante.sobreescudo = resRedirecionado.sobreescudo;
      hpAtacanteAtual = resRedirecionado.hp;
    }
    let ressurreicaoAtacante = false;
    if (hpAtacanteAtual <= 0 && atacante.ressurreicaoParcial) {
      const rev = tentarRessurreicaoParcial(atacante.ressurreicaoParcial, hpAtacanteAtual, atacante.hpMax);
      if (rev.ressuscitou) {
        hpAtacanteAtual = rev.hp;
        atacante.ressurreicaoParcial = rev.estado;
        ressurreicaoAtacante = true;
      }
    }

    // Cicatrização: as curas de quem a sofre ficam menos eficazes
    const fatorCura = fatorCuraPercentual(atacante.debuffs) / 100;

    if (ehDanoFisico && temSedeDeSangue && racaAtacante) {
      hpAtacanteAtual = aplicarSedeDeSangue(
        hpAtacanteAtual,
        atacante.hpMax,
        danoEfetivo,
        racaAtacante.passivaRacial.valor * fatorCura
      );
    }

    if (acaoCausaDano && resultadoHabilidadeInterceptada) {
      if (resultadoHabilidadeInterceptada.curaPercentualDanoCausado > 0) {
        hpAtacanteAtual = aplicarSedeDeSangue(
          hpAtacanteAtual,
          atacante.hpMax,
          danoEfetivo,
          resultadoHabilidadeInterceptada.curaPercentualDanoCausado * fatorCura
        );
      }
      if (resultadoHabilidadeInterceptada.curaPercentualHpMax > 0) {
        const curaHpMax =
          (atacante.hpMax * resultadoHabilidadeInterceptada.curaPercentualHpMax * fatorCura) / 100;
        hpAtacanteAtual = Math.min(atacante.hpMax, hpAtacanteAtual + curaHpMax);
      }
    }

    // Cura e restauração (catálogo 1.2): curas da habilidade em quem a usou
    let efeitosCuraAplicados: TipoEfeitoCura[] | undefined;
    let curaHabilidade: number | undefined;
    let efeitosNegativosRemovidos: number | undefined;
    const aplicacoesCura = resultadoHabilidadeInterceptada?.efeitosCura;
    if (aplicacoesCura && aplicacoesCura.length > 0 && hpAtacanteAtual > 0) {
      const curas = aplicarCuras({
        hp: hpAtacanteAtual,
        hpMax: atacante.hpMax,
        sobreescudo: atacante.sobreescudo,
        sobreescudoMax: calcularSobreescudoMax(atacante.atributos.vitalidade, {
          classeId: atacante.classeId,
          nivel: nivelAtacante,
          subclasseAtualId: atacante.subclasseAtualId,
          subclasseTiers: atacante.subclasseTiers,
        }),
        eficaciaPercentual: fatorCura * 100,
        curaContinuaAtual: atacante.curaContinua,
        ressurreicaoAtual: atacante.ressurreicaoParcial,
        aplicacoes: aplicacoesCura,
      });
      hpAtacanteAtual = curas.hp;
      atacante.sobreescudo = curas.sobreescudo;
      atacante.curaContinua = curas.curaContinua;
      atacante.ressurreicaoParcial = curas.ressurreicaoParcial;
      efeitosCuraAplicados = curas.aplicados;
      curaHabilidade = curas.curaHp;
      if (curas.efeitosNegativosARemover > 0) {
        efeitosNegativosRemovidos = curas.efeitosNegativosARemover;
      }
    }

    const sufixoDuplo = maxAtaques > 1 ? ` (Ataque ${i + 1}/${maxAtaques} - Agilidade Superior)` : '';
    const sufixoHabilidade =
      habilidadeAcionada &&
      habilidadeAcionada !== 'Golpe Bárbaro' &&
      habilidadeAcionada !== 'Golpe do Guardião' &&
      habilidadeAcionada !== 'Faísca Arcana' &&
      habilidadeAcionada !== 'Golpe Rápido' &&
      habilidadeAcionada !== 'Luz Sagrada' &&
      habilidadeAcionada !== 'Corte Preciso'
        ? ` [${habilidadeAcionada}]`
        : '';
    const sufixoElemental =
      acaoCausaDano && elementoGolpe
        ? reacaoElemental
          ? ` (elemento: ${elementoGolpe} — ${reacaoElemental})`
          : ` (elemento: ${elementoGolpe})`
        : '';
    const sufixoCorpo =
      reacaoTipoDano && tipoGolpe
        ? ` [${NOMES_TIPO_GOLPE[tipoGolpe]}: ${reacaoTipoDano === 'fraqueza' ? 'fraqueza' : 'resistência'} do corpo]`
        : '';
    const sufixoControle =
      statusEncerrado === 'congelamento'
        ? ` O fogo derreteu o gelo de ${defensor.nome}!`
        : statusEncerrado === 'paralisia'
          ? ` ${defensor.nome} acorda da paralisia, mas fica mais lento!`
          : '';
    const sufixoDefesa =
      sufixoControle +
      (defensorImortal ? ` ${defensor.nome} está com Imortalidade Breve!` : '') +
      (danoRedirecionado > 0
        ? ` ${defensor.nome} devolve ${danoRedirecionado} de dano (Redirecionamento)!`
        : '') +
      (ressurreicaoDefensor ? ` ${defensor.nome} volta à luta (Ressurreição Parcial)!` : '') +
      (ressurreicaoAtacante ? ` ${atacante.nome} volta à luta (Ressurreição Parcial)!` : '') +
      (curaHabilidade !== undefined && curaHabilidade > 0
        ? ` ${atacante.nome} recupera ${curaHabilidade} HP!`
        : '');
    const sufixoCritico =
      golpesCriticos === 0
        ? ''
        : golpesCriticos === 1
          ? ' CRÍTICO!'
          : ` ${golpesCriticos} golpes CRÍTICOS!`;
    const mensagem = !acaoCausaDano
      ? `${atacante.nome} canaliza${sufixoHabilidade}${sufixoDuplo} restaurando +${curaHp ?? 0} HP! (${atacante.nome} HP: ${hpAtacanteAtual}/${atacante.hpMax})`
      : `${atacante.nome} ataca ${defensor.nome}${sufixoHabilidade}${sufixoDuplo} causando ${danoEfetivo} de dano${sufixoElemental}${sufixoCorpo}!${sufixoCritico}${sufixoDefesa} (${defensor.nome} HP: ${hpAtual}/${defensor.hpMax})`;

    ataques.push({
      atacante: atacante.nome,
      defensor: defensor.nome,
      danoBruto,
      danoEfetivo,
      sobreescudoRestante: sobreescudoAtual,
      hpRestante: hpAtual,
      mensagem,
      ...(habilidadeAcionada ? { habilidadeAcionada } : {}),
      ...(elementoGolpe !== undefined ? { elemento: elementoGolpe } : {}),
      ...(multiplicadorElemental !== undefined ? { multiplicadorElemental } : {}),
      ...(reacaoElemental !== undefined ? { reacaoElemental } : {}),
      ...(multiplicadorTipoDano !== undefined ? { tipoGolpe, multiplicadorTipoDano, reacaoTipoDano } : {}),
      ...(statusEncerrado ? { statusEncerrado } : {}),
      ...(instintoSobrevivenciaAtivo !== undefined ? { instintoSobrevivenciaAtivo } : {}),
      ...(iraAbaixo30Ativo !== undefined ? { iraAbaixo30Ativo } : {}),
      ...(ultimoBastiaoAtivo !== undefined ? { ultimoBastiaoAtivo } : {}),
      ...(posturaDefensivaAplicada !== undefined ? { posturaDefensivaAplicada } : {}),
      ...(juramentoDefensivoAplicado !== undefined ? { juramentoDefensivoAplicado } : {}),
      ...(cargasAcumuloConsumidas !== undefined ? { cargasAcumuloConsumidas } : {}),
      ...(cargasAcumuloRestantes !== undefined ? { cargasAcumuloRestantes } : {}),
      ...(bonusSobreescudoCataclismoAtivo !== undefined ? { bonusSobreescudoCataclismoAtivo } : {}),
      ...(numeroGolpes !== undefined ? { numeroGolpes } : {}),
      ...(danoPorGolpe !== undefined ? { danoPorGolpe } : {}),
      ...(golpes !== undefined ? { golpes } : {}),
      ...(cargasSedeSangueBandidoConsumidas !== undefined
        ? { cargasSedeSangueBandidoConsumidas }
        : {}),
      ...(cargasSedeSangueBandidoRestantes !== undefined
        ? { cargasSedeSangueBandidoRestantes }
        : {}),
      ...(ignorarDefesaFisicaPercentual !== undefined ? { ignorarDefesaFisicaPercentual } : {}),
      ...(curaHp !== undefined ? { curaHp } : {}),
      ...(golpesCriticos > 0 ? { golpesCriticos } : {}),
      ...(efeitosDefensivosAplicados ? { efeitosDefensivosAplicados } : {}),
      ...(defensorImortal ? { imortalidadeBreve: true } : {}),
      ...(danoRedirecionado > 0 ? { danoRedirecionado } : {}),
      ...(danoAcumulativoUsado !== undefined ? { danoAcumulativoPercentual: danoAcumulativoUsado } : {}),
      ...(impetoNesteAtaque ? { impetoImprudenteAtivo: true } : {}),
      ...(acaoCausaDano && focoNesteAtaque > 0 ? { focoPercentual: focoNesteAtaque } : {}),
      ...(buffsAplicados ? { buffsAplicados } : {}),
      ...(debuffsAplicados ? { debuffsAplicados } : {}),
      ...(statusForcadosNoAlvo ? { statusForcadosNoAlvo } : {}),
      ...(statusComChance ? { statusComChanceNoAlvo: statusComChance } : {}),
      ...(acaoCausaDano && pontoFracoNesteAtaque > 0 ? { pontoFracoConsumido: pontoFracoNesteAtaque } : {}),
      ...(inversaoDeSorteDano ? { inversaoDeSorteDano } : {}),
      ...(acaoExtraConcedida && i === maxAtaques - 1 ? { acaoExtra: true } : {}),
      ...(efeitosCuraAplicados ? { efeitosCuraAplicados } : {}),
      ...(curaHabilidade !== undefined ? { curaHabilidade } : {}),
      ...(efeitosNegativosRemovidos !== undefined ? { efeitosNegativosRemovidos } : {}),
      ...(ressurreicaoDefensor ? { ressurreicaoDefensor: true } : {}),
      ...(ressurreicaoAtacante ? { ressurreicaoAtacante: true } : {}),
      ...(ehProfetaAtacante || efeitosCuraAplicados || (resultadoHabilidadeInterceptada && (resultadoHabilidadeInterceptada.curaPercentualDanoCausado > 0 || resultadoHabilidadeInterceptada.curaPercentualHpMax > 0))
        ? { atacanteHpRestante: hpAtacanteAtual }
        : {}),
      ...(cargasFeInabalavelConsumidas !== undefined ? { cargasFeInabalavelConsumidas } : {}),
      ...(cargasFeInabalavelRestantes !== undefined ? { cargasFeInabalavelRestantes } : {}),
      ...(cargasFocoAbsolutoConsumidas !== undefined ? { cargasFocoAbsolutoConsumidas } : {}),
      ...(cargasFocoAbsolutoRestantes !== undefined ? { cargasFocoAbsolutoRestantes } : {}),
      ...(bonusSobreescudoCorteDoVazioAtivo !== undefined
        ? { bonusSobreescudoCorteDoVazioAtivo }
        : {}),
      ...(golpeExtraCorteDoVazioAtivo !== undefined ? { golpeExtraCorteDoVazioAtivo } : {}),
      ...(danoGolpeExtraCorteDoVazio !== undefined ? { danoGolpeExtraCorteDoVazio } : {}),
      ...(danoEfetivoGolpeExtraCorteDoVazio !== undefined
        ? { danoEfetivoGolpeExtraCorteDoVazio }
        : {}),
    });

    if (opcoesTurno?.aoFinalizarAtaque) {
      const posAtaque = opcoesTurno.aoFinalizarAtaque(i, {
        hp: hpAtual,
        sobreescudo: sobreescudoAtual,
        hpMax: defensor.hpMax,
      });
      hpAtual = posAtaque.novoHpDefensor;
      if (hpAtual <= 0 && defensor.ressurreicaoParcial) {
        const rev = tentarRessurreicaoParcial(defensor.ressurreicaoParcial, hpAtual, defensor.hpMax);
        if (rev.ressuscitou) {
          hpAtual = rev.hp;
          defensor.ressurreicaoParcial = rev.estado;
          ataques[ataques.length - 1].ressurreicaoDefensor = true;
        }
      }
    }
  }

  defensor.hp = hpAtual;
  defensor.sobreescudo = sobreescudoAtual;
  atacante.hp = hpAtacanteAtual;
  if (ehBarbaroAtacante) {
    atacante.contadorFuriaSelvagem = contadorFuria;
    atacante.contadorIraBarbaro = contadorIra;
  }
  if (ehCavaleiroAtacante) {
    atacante.contadorPosturaGuardiao = contadorPostura;
    atacante.contadorJuramentoGuardiao = contadorJuramento;
    atacante.posturaGuardiaoAtiva = posturaAtacanteAtiva;
    atacante.juramentoGuardiaoAtivo = juramentoAtacanteAtivo;
  }
  if (ehFeiticeiroAtacante) {
    atacante.contadorExplosaoArcana = contadorExplosao;
    atacante.contadorAcumuloArcano = contadorAcumulo;
    atacante.cargasAcumuloArcano = cargasAcumulo;
    atacante.contadorCataclismoArcano = contadorCataclismo;
  }
  if (ehBandidoAtacante) {
    atacante.contadorRajadaGolpes = contadorRajada;
    atacante.contadorSedeSangueBandido = contadorSedeSangue;
    atacante.cargasSedeSangueBandido = cargasSedeSangue;
    atacante.contadorDancaLaminas = contadorDanca;
  }
  if (ehProfetaAtacante) {
    atacante.contadorBencaoDivina = contadorBencao;
    atacante.contadorFeInabalavel = contadorFe;
    atacante.cargasFeInabalavel = cargasFe;
    atacante.contadorMilagreDivino = contadorMilagre;
  }
  if (ehSamuraiAtacante) {
    atacante.contadorIaijutsu = contadorIaijutsu;
    atacante.contadorFocoAbsoluto = contadorFoco;
    atacante.cargasFocoAbsoluto = cargasFoco;
    atacante.contadorCorteDoVazio = contadorCorteVazio;
  }
  if (ehCavaleiroDefensor) {
    defensor.posturaGuardiaoAtiva = false;
    defensor.juramentoGuardiaoAtivo = false;
  }

  return {
    turnoLog: {
      numeroTurno,
      ataques,
      eventosEfeitos: [],
    },
    defensorHp: hpAtual,
    defensorSobreescudo: sobreescudoAtual,
    atacanteHp: hpAtacanteAtual,
  };
}

/**
 * Resolve o combate completo turno a turno de forma pura e determinística.
 */
export function resolverCombate(
  personagem: Combatente,
  monstro: MonsterDefinition,
  seed: number = 42,
  opcoes?: OpcoesResolverCombate
): ResultadoCombate {
  // Clona instâncias para manter função 100% pura
  const p: Combatente = {
    nome: personagem.nome,
    hp: personagem.hp,
    hpMax: personagem.hpMax,
    sobreescudo: personagem.sobreescudo,
    atributos: { ...personagem.atributos },
    racaId: personagem.racaId,
    classeId: personagem.classeId,
    linhagem: personagem.linhagem,
    nivel: personagem.nivel,
    ouro: personagem.ouro ?? 0,
    mitigacao: personagem.mitigacao ?? 0,
    habilidadesEquipadas: personagem.habilidadesEquipadas
      ? { ...personagem.habilidadesEquipadas }
      : undefined,
    subclasseAtualId: personagem.subclasseAtualId,
    subclasseTiers: personagem.subclasseTiers
      ? { ...personagem.subclasseTiers }
      : undefined,
    modificadoresElementais: personagem.modificadoresElementais
      ? { ...personagem.modificadoresElementais }
      : undefined,
    elementoAtaque: personagem.elementoAtaque,
    contadorFuriaSelvagem: personagem.contadorFuriaSelvagem ?? 0,
    contadorIraBarbaro: personagem.contadorIraBarbaro ?? 0,
    contadorPosturaGuardiao: personagem.contadorPosturaGuardiao ?? 0,
    contadorJuramentoGuardiao: personagem.contadorJuramentoGuardiao ?? 0,
    posturaGuardiaoAtiva: personagem.posturaGuardiaoAtiva ?? false,
    juramentoGuardiaoAtivo: personagem.juramentoGuardiaoAtivo ?? false,
    contadorExplosaoArcana: personagem.contadorExplosaoArcana ?? 0,
    contadorAcumuloArcano: personagem.contadorAcumuloArcano ?? 0,
    cargasAcumuloArcano: personagem.cargasAcumuloArcano ?? 0,
    contadorCataclismoArcano: personagem.contadorCataclismoArcano ?? 0,
    contadorRajadaGolpes: personagem.contadorRajadaGolpes ?? 0,
    contadorSedeSangueBandido: personagem.contadorSedeSangueBandido ?? 0,
    cargasSedeSangueBandido: personagem.cargasSedeSangueBandido ?? 0,
    contadorDancaLaminas: personagem.contadorDancaLaminas ?? 0,
    contadorBencaoDivina: personagem.contadorBencaoDivina ?? 0,
    contadorFeInabalavel: personagem.contadorFeInabalavel ?? 0,
    cargasFeInabalavel: personagem.cargasFeInabalavel ?? 0,
    contadorMilagreDivino: personagem.contadorMilagreDivino ?? 0,
    contadorIaijutsu: personagem.contadorIaijutsu ?? 0,
    contadorFocoAbsoluto: personagem.contadorFocoAbsoluto ?? 0,
    cargasFocoAbsoluto: personagem.cargasFocoAbsoluto ?? 0,
    contadorCorteDoVazio: personagem.contadorCorteDoVazio ?? 0,
  };

  const m: Combatente = {
    nome: monstro.nome,
    hp: monstro.hp,
    hpMax: monstro.hp,
    sobreescudo: 0,
    atributos: { ...monstro.atributos },
    ouro: 0,
    mitigacao: 0,
    // Categoria corporal dá fraquezas elementais (Sombrio → Sagrado); o que o monstro define explicitamente vale mais
    modificadoresElementais: {
      ...modificadoresElementaisDaCategoria(monstro.categoriaCorporal),
      ...(monstro.modificadoresElementais ?? {}),
    },
    elementoAtaque: monstro.elementoAtaque,
    imunidadesStatus: monstro.chefe ? [...imunidadesDeChefe()] : undefined,
    categoriaCorporal: monstro.categoriaCorporal,
    fraquezasProprias: monstro.fraquezasProprias ? [...monstro.fraquezasProprias] : undefined,
    resistenciasProprias: monstro.resistenciasProprias
      ? [...monstro.resistenciasProprias]
      : undefined,
  };

  // Gerador pseudo-aleatório com seed fixa determinística (LCG)
  let s = Math.abs(Math.floor(seed)) || 1337;
  function nextRng(): number {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  }

  const logTurnos: TurnoLog[] = [];
  const mensagens: string[] = [];

  const agilPersonagemEfetiva = calcularAgilidadeEfetiva(p.atributos.agilidade, {
    classeId: p.classeId,
    nivel: p.nivel ?? 1,
  });
  const primeiroAtacante = iniciativa(
    agilPersonagemEfetiva,
    m.atributos.agilidade,
    Math.floor(nextRng() * 1000)
  );

  mensagens.push(
    `Iniciativa: ${primeiroAtacante === 'A' ? p.nome : m.nome} tem a vantagem e ataca primeiro!`
  );

  let turno = 1;
  const MAX_TURNOS = 100;

  // Estado local de efeitos do personagem apenas durante a luta (nunca persistido)
  let efeitosPersonagem: Map<EfeitoStatus, EfeitoAtivo> = new Map();
  // Status no monstro (só entram por habilidades do jogador, como o Sangramento Forçado)
  let efeitosMonstroStatus: Map<EfeitoStatus, EfeitoAtivo> = new Map();
  const obterSorteioStatus = (rodada: number, indiceAtaque: number): number =>
    opcoes?.rngStatus
      ? opcoes.rngStatus(rodada, indiceAtaque)
      : sorteioStatus(seed, rodada, indiceAtaque);
  const obterSorteioCritico = (
    rodada: number,
    indiceAtaque: number,
    indiceGolpe: number,
    lado: LadoCombate
  ): number =>
    opcoes?.rngCritico
      ? opcoes.rngCritico(rodada, indiceAtaque, indiceGolpe, lado)
      : sorteioCritico(seed, rodada, indiceAtaque, indiceGolpe, lado);

  // Os efeitos de Mitigação e defesa contam os turnos do inimigo: perdem 1 rodada depois que ele age
  const passarRodadaEfeitosDefensivos = (alvoDosAtaques: Combatente) => {
    if (!alvoDosAtaques.efeitosDefensivos || alvoDosAtaques.efeitosDefensivos.length === 0) return;
    const avanco = avancarRodadaEfeitosDefensivos(alvoDosAtaques.efeitosDefensivos);
    alvoDosAtaques.efeitosDefensivos = avanco.efeitos;
    if (avanco.sobreescudoRemovido > 0) {
      alvoDosAtaques.sobreescudo = Math.max(0, alvoDosAtaques.sobreescudo - avanco.sobreescudoRemovido);
    }
  };

  /** Aplica um status no monstro (jogador → monstro): forçado (sorteio 0) ou com chance; trata imunidade de chefes. */
  const aplicarStatusNoMonstro = (
    efeitoId: EfeitoStatus,
    sorteio: number,
    chanceExtraPontos: number,
    eventosEfeitosDoTurno: EventoEfeito[]
  ) => {
    if (estaImuneAoStatus(m, efeitoId)) {
      eventosEfeitosDoTurno.push({ tipo: 'imune', efeito: efeitoId, alvo: m.nome });
      return;
    }
    const tentativa = tentarAplicarEfeito(efeitosMonstroStatus, efeitoId, sorteio, 0, chanceExtraPontos);
    efeitosMonstroStatus = tentativa.efeitos;
    if (tentativa.resultado === 'controle') {
      // Bloco C: dano imediato (se houver) e debuffs de controle no monstro
      const def = EFEITOS_STATUS[efeitoId];
      const danoImediato = def.percentualHpMax > 0 ? calcularDanoEfeito(m.hpMax, def.percentualHpMax) : 0;
      m.hp = Math.max(0, m.hp - danoImediato);
      aplicarEfeitoControle(m, efeitoId);
      eventosEfeitosDoTurno.push({
        tipo: 'controle',
        efeito: efeitoId,
        ...(danoImediato > 0 ? { dano: danoImediato } : {}),
        alvo: m.nome,
      });
    } else if (tentativa.resultado === 'aplicado' || tentativa.resultado === 'renovado') {
      eventosEfeitosDoTurno.push({
        tipo: tentativa.resultado,
        efeito: efeitoId,
        rodadasRestantes: EFEITOS_STATUS[efeitoId].duracaoRodadas,
        alvo: m.nome,
      });
    } else if (tentativa.resultado === 'instantaneo') {
      // Sangramento e Maldição: dano de uma vez, em % do HP máximo do monstro
      const danoInstantaneo = calcularDanoEfeito(m.hpMax, EFEITOS_STATUS[efeitoId].percentualHpMax);
      m.hp = Math.max(0, m.hp - danoInstantaneo);
      registrarEstadoDeLuta(m, efeitoId);
      eventosEfeitosDoTurno.push({
        tipo: 'instantaneo',
        efeito: efeitoId,
        dano: danoInstantaneo,
        alvo: m.nome,
      });
    }
  };

  const executarAcaoPersonagem = (
    rodada: number,
    ataquesDoTurno: AtaqueLog[],
    eventosEfeitosDoTurno: EventoEfeito[]
  ) => {
    m.statusAtivos = [...efeitosMonstroStatus.keys()];
    const tPersonagem = turnoDeCombate(p, m, rodada, {
      sorteioCritico: (idxAtk, idxGolpe) =>
        obterSorteioCritico(rodada, idxAtk, idxGolpe, 'personagem'),
    });
    passarRodadaEfeitosDefensivos(m);
    ataquesDoTurno.push(...tPersonagem.turnoLog.ataques);

    for (const atk of tPersonagem.turnoLog.ataques) {
      // Sangramento Forçado (catálogo 1.2): status aplicado no monstro sem sorteio de chance
      for (const efeitoId of atk.statusForcadosNoAlvo ?? []) {
        aplicarStatusNoMonstro(efeitoId, 0, 0, eventosEfeitosDoTurno);
      }
      // Status com chance (ex.: Paralisia de uma habilidade de Relâmpago, com +5% de chance): sorteia a ativação
      (atk.statusComChanceNoAlvo ?? []).forEach((s, i) => {
        aplicarStatusNoMonstro(
          s.status,
          obterSorteioStatus(rodada, 100 + i),
          s.chanceExtraPercentual ?? 0,
          eventosEfeitosDoTurno
        );
      });
      // Limpeza (catálogo 1.2): remove de 1 a 3 efeitos negativos do personagem
      if (atk.efeitosNegativosRemovidos) {
        const rem = removerEfeitos(efeitosPersonagem, atk.efeitosNegativosRemovidos);
        efeitosPersonagem = rem.efeitos;
        for (const efeitoRemovido of rem.removidos) {
          eventosEfeitosDoTurno.push({ tipo: 'removido', efeito: efeitoRemovido });
        }
      }
      if (atk.habilidadeAcionada === 'Bênção Divina') {
        const rem = removerEfeitos(efeitosPersonagem, QUANTIDADE_REMOCAO_BENCAO_DIVINA);
        efeitosPersonagem = rem.efeitos;
        for (const efeitoRemovido of rem.removidos) {
          eventosEfeitosDoTurno.push({
            tipo: 'removido',
            efeito: efeitoRemovido,
          });
        }
      } else if (atk.habilidadeAcionada === 'Milagre Divino') {
        const rem = removerEfeitos(efeitosPersonagem, 'todos');
        efeitosPersonagem = rem.efeitos;
        for (const efeitoRemovido of rem.removidos) {
          eventosEfeitosDoTurno.push({
            tipo: 'removido',
            efeito: efeitoRemovido,
          });
        }
      }
    }
  };

  const executarAcaoMonstro = (
    rodada: number,
    ataquesDoTurno: AtaqueLog[],
    eventosEfeitosDoTurno: EventoEfeito[]
  ) => {
    p.statusAtivos = [...efeitosPersonagem.keys()];
    const efeitosMonstro = monstro.efeitosAplicados ?? [];
    const tMonstro = turnoDeCombate(m, p, rodada, {
      sorteioCritico: (idxAtk, idxGolpe) => obterSorteioCritico(rodada, idxAtk, idxGolpe, 'monstro'),
      aoFinalizarAtaque: (idxAtk, estadoDefensor) => {
        let hpDefensorAtual = estadoDefensor.hp;

        // Sorteio de efeitos acontece em todo ataque do monstro, mesmo que o Sobreescudo absorva o golpe inteiro
        for (const efeitoId of efeitosMonstro) {
          const valorSorteio = obterSorteioStatus(rodada, idxAtk);
          const tentativa = tentarAplicarEfeito(
            efeitosPersonagem,
            efeitoId,
            valorSorteio,
            reducaoChanceStatusRacial(p.racaId, efeitoId)
          );
          efeitosPersonagem = tentativa.efeitos;
          const definicao = EFEITOS_STATUS[efeitoId];

          if (tentativa.resultado === 'controle') {
            // Bloco C: dano imediato (se houver) e debuffs de controle no personagem
            if (estaImuneAoStatus(p, efeitoId)) {
              eventosEfeitosDoTurno.push({ tipo: 'imune', efeito: efeitoId });
            } else {
              const danoImediato =
                definicao.percentualHpMax > 0
                  ? calcularDanoEfeito(estadoDefensor.hpMax, definicao.percentualHpMax)
                  : 0;
              hpDefensorAtual = Math.max(0, hpDefensorAtual - danoImediato);
              aplicarEfeitoControle(p, efeitoId);
              eventosEfeitosDoTurno.push({
                tipo: 'controle',
                efeito: efeitoId,
                ...(danoImediato > 0 ? { dano: danoImediato } : {}),
              });
            }
          } else if (tentativa.resultado === 'aplicado') {
            eventosEfeitosDoTurno.push({
              tipo: 'aplicado',
              efeito: efeitoId,
              rodadasRestantes: definicao.duracaoRodadas,
            });
          } else if (tentativa.resultado === 'renovado') {
            eventosEfeitosDoTurno.push({
              tipo: 'renovado',
              efeito: efeitoId,
              rodadasRestantes: definicao.duracaoRodadas,
            });
          } else if (tentativa.resultado === 'instantaneo') {
            const danoInstantaneo = calcularDanoEfeito(
              estadoDefensor.hpMax,
              definicao.percentualHpMax
            );
            hpDefensorAtual = Math.max(0, hpDefensorAtual - danoInstantaneo);
            registrarEstadoDeLuta(p, efeitoId);
            eventosEfeitosDoTurno.push({
              tipo: 'instantaneo',
              efeito: efeitoId,
              dano: danoInstantaneo,
            });
          }
        }

        return { novoHpDefensor: hpDefensorAtual };
      },
    });

    ataquesDoTurno.push(...tMonstro.turnoLog.ataques);
    passarRodadaEfeitosDefensivos(p);
  };

  while (p.hp > 0 && m.hp > 0 && turno <= MAX_TURNOS) {
    const ataquesDoTurno: AtaqueLog[] = [];
    const eventosEfeitosDoTurno: EventoEfeito[] = [];

    if (primeiroAtacante === 'A') {
      // Personagem ataca Monstro
      executarAcaoPersonagem(turno, ataquesDoTurno, eventosEfeitosDoTurno);

      if (m.hp > 0) {
        // Monstro contra-ataca se ainda estiver vivo
        executarAcaoMonstro(turno, ataquesDoTurno, eventosEfeitosDoTurno);
      }
    } else {
      // Monstro ataca Personagem
      executarAcaoMonstro(turno, ataquesDoTurno, eventosEfeitosDoTurno);

      if (p.hp > 0) {
        // Personagem contra-ataca se ainda estiver vivo
        executarAcaoPersonagem(turno, ataquesDoTurno, eventosEfeitosDoTurno);
      }
    }

    // No fim de cada rodada (depois que ambos os lados agiram), processa os ticks de DOT
    // Se o personagem já morreu no meio da rodada, não processa ticks
    if (p.hp > 0) {
      const tick = processarTickEfeitos(efeitosPersonagem, p.hpMax);
      efeitosPersonagem = tick.efeitos;
      if (tick.eventos.length > 0) {
        eventosEfeitosDoTurno.push(...tick.eventos);
      }
      if (tick.danoTotal > 0) {
        p.hp = Math.max(0, p.hp - tick.danoTotal);
      }
    }

    // Dano contínuo no monstro (Sangramento Forçado do jogador)
    if (m.hp > 0 && efeitosMonstroStatus.size > 0) {
      const tickMonstro = processarTickEfeitos(efeitosMonstroStatus, m.hpMax);
      efeitosMonstroStatus = tickMonstro.efeitos;
      for (const e of tickMonstro.eventos) {
        eventosEfeitosDoTurno.push({ ...e, alvo: m.nome });
      }
      if (tickMonstro.danoTotal > 0) {
        m.hp = Math.max(0, m.hp - tickMonstro.danoTotal);
      }
    }

    // Cura e restauração no fim da rodada: Ressurreição Parcial (se o dano contínuo derrubou) e Cura Contínua
    const eventosCuraDoTurno: EventoCuraRodada[] = [];
    for (const c of [p, m]) {
      if (c.hp <= 0 && c.ressurreicaoParcial) {
        const rev = tentarRessurreicaoParcial(c.ressurreicaoParcial, c.hp, c.hpMax);
        if (rev.ressuscitou) {
          c.hp = rev.hp;
          c.ressurreicaoParcial = rev.estado;
          eventosCuraDoTurno.push({ tipo: 'ressurreicao', combatente: c.nome, valor: rev.hp });
        }
      }
      if (c.hp > 0 && c.curaContinua) {
        const tickCura = processarCuraContinua(c.curaContinua, c.hp, c.hpMax, fatorCuraPercentual(c.debuffs));
        c.hp = tickCura.hp;
        c.curaContinua = tickCura.estado;
        eventosCuraDoTurno.push({ tipo: 'curaContinua', combatente: c.nome, valor: tickCura.cura });
      }
    }

    logTurnos.push({
      numeroTurno: turno,
      ataques: ataquesDoTurno,
      eventosEfeitos: eventosEfeitosDoTurno,
      ...(eventosCuraDoTurno.length > 0 ? { eventosCura: eventosCuraDoTurno } : {}),
    });

    turno++;
  }

  // 1.11.1: empate e limite de rodadas (PvE: o jogador perde no empate; ganha quem tiver mais HP no limite)
  const desfecho = decidirDesfecho({
    hpJogador: p.hp,
    hpOponente: m.hp,
    limiteAtingido: p.hp > 0 && m.hp > 0,
    modo: 'pve',
  });
  if (desfecho.motivo === 'limite_rodadas') {
    mensagens.push(
      `Limite de ${MAX_TURNOS} rodadas atingido: vence quem tem mais HP (${p.nome} ${p.hp} × ${m.nome} ${m.hp}).`
    );
  }
  if (desfecho.empate) {
    mensagens.push(`Empate! Contra monstros, o jogador perde no empate.`);
  }

  if (desfecho.vencedor === 'jogador') {
    // Vitória do Personagem
    const xpGanho = monstro.xpConcedido;
    const diffOuro = monstro.ouroConcedido.max - monstro.ouroConcedido.min;
    const ouroGanho = Math.floor(nextRng() * (diffOuro + 1)) + monstro.ouroConcedido.min;

    mensagens.push(
      `Vitória gloriosa! ${p.nome} derrotou ${m.nome}! Recompensas: +${xpGanho} XP e +${ouroGanho} Ouro.`
    );

    return {
      vencedor: 'personagem',
      motivoFim: desfecho.motivo,
      logTurnos,
      mensagens,
      xpGanho,
      ouroGanho,
      ouroPerdido: 0,
      personagemFinal: {
        hp: p.hp,
        hpMax: p.hpMax,
        ouro: (p.ouro ?? 0) + ouroGanho,
      },
    };
  } else {
    // Derrota do Personagem - Regra de morte
    const ouroAtual = p.ouro ?? 0;
    const ouroPerdido = Math.min(ouroAtual, GAME_CONFIG.OURO_PERDIDO_MORTE);
    const ouroFinal = Math.max(0, ouroAtual - ouroPerdido);

    const hpMaximo = calcularHpMax(p.atributos.vigor, {
      classeId: p.classeId,
      nivel: p.nivel,
    });

    mensagens.push(
      `${p.nome} sucumbiu perante ${m.nome}... A morte cobra seu preço: -${ouroPerdido} de ouro. A vida foi restaurada ao máximo.`
    );

    return {
      vencedor: 'monstro',
      ...(desfecho.empate ? { empate: true } : {}),
      motivoFim: desfecho.motivo,
      logTurnos,
      mensagens,
      xpGanho: 0,
      ouroGanho: 0,
      ouroPerdido,
      personagemFinal: {
        hp: hpMaximo,
        hpMax: hpMaximo,
        ouro: ouroFinal,
      },
    };
  }
}
