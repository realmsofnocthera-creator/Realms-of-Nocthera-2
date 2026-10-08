import { Attributes } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { XP_TABLE } from '@/rules/xpTable';
import { obterModificadoresPassivaSubclasse } from './combate/habilidades/passivas';

export interface ResultadoDano {
  sobreescudo: number;
  hp: number;
}

export interface OpcoesCalculoStatus {
  classeId?: string;
  nivel?: number;
  /** Subclasse ativa e tiers do personagem; só o Sobreescudo máximo usa (Casca de Pedra, 48E). */
  subclasseAtualId?: string | null;
  subclasseTiers?: Record<string, number>;
}

// Bônus de Sobreescudo máximo das passivas de classe, em % do valor base (regra 1.2.2: somam)
export const RESISTENCIA_BARBARA_SOBREESCUDO_PERCENTUAL = 5;
export const MURALHA_DE_FERRO_SOBREESCUDO_PERCENTUAL = 10;

// Bônus permanentes de dano das passivas de classe (nível 12+), em % (somam no grupo de dano, 1.2.2)
export const FLUXO_ARCANO_DANO_PERCENTUAL = 10;
export const PASSOS_RAPIDOS_DANO_PERCENTUAL = 5;
export const DISCIPLINA_DO_GUERREIRO_DANO_PERCENTUAL = 5;

/**
 * Bônus permanente de dano (em %) da passiva de classe, para entrar no grupo de soma do golpe:
 * Fluxo Arcano (Feiticeiro, dano mágico), Passos Rápidos (Bandido) e Disciplina do Guerreiro
 * (Samurai), dano físico. Zero para as demais classes ou antes do nível 12.
 */
export function bonusPassivaPermanenteDanoPercentual(
  classeId: string | undefined,
  nivel: number,
  tipoDano: 'fisico' | 'magico'
): number {
  const classe = classeId?.trim().toLowerCase();
  if (nivel < 12) return 0;
  if (tipoDano === 'magico' && classe === 'feiticeiro') return FLUXO_ARCANO_DANO_PERCENTUAL;
  if (tipoDano === 'fisico' && classe === 'bandido') return PASSOS_RAPIDOS_DANO_PERCENTUAL;
  if (tipoDano === 'fisico' && classe === 'samurai') return DISCIPLINA_DO_GUERREIRO_DANO_PERCENTUAL;
  return 0;
}

/**
 * Passiva II do Bárbaro (Nível 20+) — Resistência Bárbara:
 * Aplica permanentemente +10% ao HP máximo e +5% ao Sobreescudo máximo
 * quando o personagem é da classe Bárbaro e possui nível >= 20.
 */
export function aplicarResistenciaBarbara(
  hpMaxBase: number,
  sobreescudoMaxBase: number,
  nivel: number,
  classeId: string = 'barbaro'
): { hpMax: number; sobreescudoMax: number } {
  const ehBarbaroNivel20 =
    classeId.trim().toLowerCase() === 'barbaro' && nivel >= 20;

  if (!ehBarbaroNivel20) {
    return {
      hpMax: hpMaxBase,
      sobreescudoMax: sobreescudoMaxBase,
    };
  }

  return {
    hpMax: Math.ceil((hpMaxBase * 110) / 100),
    sobreescudoMax: Math.ceil(
      (sobreescudoMaxBase * (100 + RESISTENCIA_BARBARA_SOBREESCUDO_PERCENTUAL)) / 100
    ),
  };
}

/**
 * Passiva I do Cavaleiro (Nível 12+) — Muralha de Ferro:
 * Aplica permanentemente +10% à Defesa Física e +10% ao Sobreescudo máximo
 * quando o personagem é da classe Cavaleiro e possui nível >= 12.
 */
export function aplicarMuralhaDeFerro(
  defesaFisicaBase: number,
  sobreescudoMaxBase: number,
  nivel: number,
  classeId: string = 'cavaleiro'
): { defesaFisica: number; sobreescudoMax: number } {
  const ehCavaleiroNivel12 =
    classeId.trim().toLowerCase() === 'cavaleiro' && nivel >= 12;

  if (!ehCavaleiroNivel12) {
    return {
      defesaFisica: defesaFisicaBase,
      sobreescudoMax: sobreescudoMaxBase,
    };
  }

  return {
    defesaFisica: Math.ceil((defesaFisicaBase * 110) / 100),
    sobreescudoMax: Math.ceil(
      (sobreescudoMaxBase * (100 + MURALHA_DE_FERRO_SOBREESCUDO_PERCENTUAL)) / 100
    ),
  };
}

/**
 * Passiva I do Feiticeiro (Nível 12+) — Fluxo Arcano:
 * Aplica permanentemente +10% ao dano mágico base
 * quando o personagem é da classe Feiticeiro e possui nível >= 12.
 */
export function aplicarFluxoArcano(
  danoMagicoBase: number,
  nivel: number,
  classeId: string = 'feiticeiro'
): { danoMagico: number } {
  const ehFeiticeiroNivel12 =
    classeId.trim().toLowerCase() === 'feiticeiro' && nivel >= 12;

  if (!ehFeiticeiroNivel12) {
    return { danoMagico: danoMagicoBase };
  }

  return {
    danoMagico: Math.ceil((danoMagicoBase * (100 + FLUXO_ARCANO_DANO_PERCENTUAL)) / 100),
  };
}

/**
 * Passiva I do Bandido (Nível 12+) — Passos Rápidos:
 * Aplica permanentemente +2 à Agilidade e +5% ao dano físico no cálculo base
 * quando o personagem é da classe Bandido e possui nível >= 12.
 */
export function aplicarPassosRapidos(
  agilidadeBase: number,
  danoFisicoBase: number,
  nivel: number,
  classeId: string = 'bandido'
): { agilidade: number; danoFisico: number } {
  const ehBandidoNivel12 =
    classeId.trim().toLowerCase() === 'bandido' && nivel >= 12;

  if (!ehBandidoNivel12) {
    return {
      agilidade: agilidadeBase,
      danoFisico: danoFisicoBase,
    };
  }

  return {
    agilidade: agilidadeBase + 2,
    danoFisico: Math.ceil((danoFisicoBase * (100 + PASSOS_RAPIDOS_DANO_PERCENTUAL)) / 100),
  };
}

/**
 * Passiva I do Profeta (Nível 12+) — Graça Divina:
 * Aplica permanentemente +10% ao HP máximo
 * quando o personagem é da classe Profeta e possui nível >= 12.
 */
export function aplicarGracaDivina(
  hpMaxBase: number,
  nivel: number,
  classeId: string = 'profeta'
): { hpMax: number } {
  const ehProfetaNivel12 =
    classeId.trim().toLowerCase() === 'profeta' && nivel >= 12;

  if (!ehProfetaNivel12) {
    return { hpMax: hpMaxBase };
  }

  return { hpMax: Math.ceil((hpMaxBase * 110) / 100) };
}

/**
 * Passiva I do Samurai (Nível 12+) — Disciplina do Guerreiro:
 * Aplica permanentemente +2 à Agilidade e +5% ao dano físico no cálculo base
 * quando o personagem é da classe Samurai e possui nível >= 12.
 */
export function aplicarDisciplinaDoGuerreiro(
  agilidadeBase: number,
  danoFisicoBase: number,
  nivel: number,
  classeId: string = 'samurai'
): { agilidade: number; danoFisico: number } {
  const ehSamuraiNivel12 =
    classeId.trim().toLowerCase() === 'samurai' && nivel >= 12;

  if (!ehSamuraiNivel12) {
    return {
      agilidade: agilidadeBase,
      danoFisico: danoFisicoBase,
    };
  }

  return {
    agilidade: agilidadeBase + 2,
    danoFisico: Math.ceil((danoFisicoBase * (100 + DISCIPLINA_DO_GUERREIRO_DANO_PERCENTUAL)) / 100),
  };
}

/**
 * Calcula a Agilidade efetiva considerando passivas permanentes de classe.
 * - Se for Bandido nível 12+, aplica permanentemente "Passos Rápidos" (+2 Agilidade).
 * - Se for Samurai nível 12+, aplica permanentemente "Disciplina do Guerreiro" (+2 Agilidade).
 */
export function calcularAgilidadeEfetiva(
  agilidade: number,
  opcoes?: OpcoesCalculoStatus
): number {
  const base = Math.max(0, agilidade);
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;
  if (classeNormalizada === 'bandido' && nivel >= 12) {
    return aplicarPassosRapidos(base, 0, nivel, opcoes!.classeId).agilidade;
  }
  if (classeNormalizada === 'samurai' && nivel >= 12) {
    return aplicarDisciplinaDoGuerreiro(base, 0, nivel, opcoes!.classeId).agilidade;
  }
  return base;
}

/**
 * Calcula a Defesa Física baseada nos pontos de Vitalidade.
 * Se for Cavaleiro nível 12+, aplica permanentemente "Muralha de Ferro" (+10% Defesa Física).
 */
export function calcularDefesaFisica(vitalidade: number, opcoes?: OpcoesCalculoStatus): number {
  const base = Math.max(0, vitalidade);
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;
  if (classeNormalizada === 'cavaleiro' && nivel >= 12) {
    return aplicarMuralhaDeFerro(base, 0, nivel, opcoes!.classeId).defesaFisica;
  }
  return base;
}

/**
 * Calcula a vida máxima baseada nos pontos de Vigor.
 * Cada ponto de Vigor concede +5 HP.
 * - Se for Bárbaro nível 20+, aplica permanentemente "Resistência Bárbara" (+10% HP máximo).
 * - Se for Profeta nível 12+, aplica permanentemente "Graça Divina" (+10% HP máximo).
 */
export function calcularHpMax(vigor: number, opcoes?: OpcoesCalculoStatus): number {
  const base = vigor * GAME_CONFIG.HP_POR_PONTO_VIGOR;
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;

  if (classeNormalizada === 'barbaro' && nivel >= 20) {
    return aplicarResistenciaBarbara(base, 0, nivel, opcoes!.classeId).hpMax;
  }
  if (classeNormalizada === 'profeta' && nivel >= 12) {
    return aplicarGracaDivina(base, nivel, opcoes!.classeId).hpMax;
  }
  return base;
}

/**
 * Chance de acerto crítico em %: base fixa + 0,1% por ponto de Sorte.
 * Ex.: Sorte 20 → 2% + 2% = 4%. O crítico dobra o dano depois da defesa.
 */
export function calcularChanceCritico(sorte: number): number {
  const chance =
    GAME_CONFIG.CHANCE_CRITICO_BASE_PERCENTUAL +
    Math.max(0, sorte) * GAME_CONFIG.CHANCE_CRITICO_POR_PONTO_SORTE;
  return Math.min(100, Number(chance.toFixed(4)));
}

/**
 * Bônus na chance de drop em %: +0,1% por ponto de Sorte.
 * Ainda não há sistema de drops; o valor fica pronto para quando houver.
 */
export function calcularBonusChanceDrop(sorte: number): number {
  return Number((Math.max(0, sorte) * GAME_CONFIG.CHANCE_DROP_POR_PONTO_SORTE).toFixed(4));
}

/**
 * Calcula o sobreescudo máximo baseado nos pontos de Vitalidade.
 * Cada ponto de Vitalidade concede +2 Sobreescudo.
 *
 * Os bônus percentuais somam num grupo só (regra 1.2.2): total = base × (100 + soma dos %) / 100,
 * arredondado para cima uma única vez.
 * - Bárbaro nível 20+: "Resistência Bárbara" (+5%).
 * - Cavaleiro nível 12+: "Muralha de Ferro" (+10%).
 * - Subclasse com a passiva ativa (tier 1+): bônus da passiva (Colosso, "Casca de Pedra": +5%).
 * Ex.: Colosso com a passiva ativa e base 100 = 100 × 110 / 100 = 110 (e não 105 × 1,05 = 111).
 */
export function calcularSobreescudoMax(vitalidade: number, opcoes?: OpcoesCalculoStatus): number {
  const base = vitalidade * GAME_CONFIG.SOBREESCUDO_POR_PONTO_VITALIDADE;
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;

  let bonusPercentual = 0;
  if (classeNormalizada === 'barbaro' && nivel >= 20) {
    bonusPercentual += RESISTENCIA_BARBARA_SOBREESCUDO_PERCENTUAL;
  }
  if (classeNormalizada === 'cavaleiro' && nivel >= 12) {
    bonusPercentual += MURALHA_DE_FERRO_SOBREESCUDO_PERCENTUAL;
  }
  bonusPercentual += obterModificadoresPassivaSubclasse({
    subclasseAtualId: opcoes?.subclasseAtualId,
    subclasseTiers: opcoes?.subclasseTiers,
    hp: 0,
    hpMax: 0,
    nivel,
  }).bonusSobreescudoMaxPercentual;

  if (bonusPercentual <= 0) {
    return base;
  }
  return Math.ceil((base * (100 + bonusPercentual)) / 100);
}

/**
 * Calcula o Poder Total do personagem como a soma simples de todos os 7 atributos finais
 * (Vigor + Sorte + Força + Vitalidade + Arcano + Inteligência + Agilidade).
 */
export function calcularPoderTotal(atributosFinais: Attributes): number {
  return (
    atributosFinais.vigor +
    atributosFinais.sorte +
    atributosFinais.forca +
    atributosFinais.vitalidade +
    atributosFinais.arcano +
    atributosFinais.inteligencia +
    atributosFinais.agilidade
  );
}

/**
 * Retorna o XP necessário para avançar do nível informado para o próximo.
 */
export function xpParaProximoNivel(nivel: number): number {
  const xp = XP_TABLE[nivel];
  if (xp === undefined) {
    throw new Error(`Nível ${nivel} fora da tabela de XP (1 a ${GAME_CONFIG.NIVEL_MAXIMO_GRAU_1}).`);
  }
  return xp;
}

/**
 * Aplica dano a um alvo considerando mitigação, sobreescudo e HP.
 * Regras:
 * 1. Primeiro subtrai a mitigação do dano bruto (o resultado nunca fica abaixo do dano mínimo, 1).
 * 2. O dano resultante consome o Sobreescudo primeiro.
 * 3. Qualquer dano excedente consome o HP.
 * Retorna o novo sobreescudo e o novo HP.
 */
export function aplicarDano(
  danoBruto: number,
  mitigacao: number,
  sobreescudo: number,
  hp: number,
  /** Multiplica o dano depois da defesa (crítico = 2). */
  multiplicadorPosDefesa: number = 1
): ResultadoDano {
  const danoAposMitigacao =
    Math.max(GAME_CONFIG.DANO_MINIMO, danoBruto - mitigacao) * multiplicadorPosDefesa;

  if (sobreescudo >= danoAposMitigacao) {
    return {
      sobreescudo: sobreescudo - danoAposMitigacao,
      hp,
    };
  }

  const danoExcedente = danoAposMitigacao - sobreescudo;
  const novoHp = Math.max(0, hp - danoExcedente);

  return {
    sobreescudo: 0,
    hp: novoHp,
  };
}

export {
  validarDistribuicao,
  aplicarDistribuicao,
  calcularReset,
  ZEROS_ATRIBUTOS,
} from './attributePoints';

export {
  idsHabilidadesDaClasse,
  habilidadesPadraoDaClasse,
  normalizarHabilidadesEquipadas,
} from './habilidades';

export {
  subclassesDaClasse,
  obterSubclasse,
  verificarRequisitosDesbloqueio,
  aplicarBonusSubclasse,
  removerBonusSubclasse,
} from './subclasses';

export {
  aplicarBonusContraSobreescudo,
  reduzirDanoPercentual,
} from './combate/efeitos';


