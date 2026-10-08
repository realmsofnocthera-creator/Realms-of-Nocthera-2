import { Attributes } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { XP_TABLE } from '@/rules/xpTable';

export interface ResultadoDano {
  sobreescudo: number;
  hp: number;
}

export interface OpcoesCalculoStatus {
  classeId?: string;
  nivel?: number;
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
    sobreescudoMax: Math.ceil((sobreescudoMaxBase * 105) / 100),
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
    sobreescudoMax: Math.ceil((sobreescudoMaxBase * 110) / 100),
  };
}

/**
 * Passiva I do Feiticeiro (Nível 12+) — Fluxo Arcano:
 * Aplica permanentemente +10% à Mana máxima e +10% ao dano mágico base
 * quando o personagem é da classe Feiticeiro e possui nível >= 12.
 */
export function aplicarFluxoArcano(
  manaMaxBase: number,
  danoMagicoBase: number,
  nivel: number,
  classeId: string = 'feiticeiro'
): { manaMax: number; danoMagico: number } {
  const ehFeiticeiroNivel12 =
    classeId.trim().toLowerCase() === 'feiticeiro' && nivel >= 12;

  if (!ehFeiticeiroNivel12) {
    return {
      manaMax: manaMaxBase,
      danoMagico: danoMagicoBase,
    };
  }

  return {
    manaMax: Math.ceil((manaMaxBase * 110) / 100),
    danoMagico: Math.ceil((danoMagicoBase * 110) / 100),
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
    danoFisico: Math.ceil((danoFisicoBase * 105) / 100),
  };
}

/**
 * Passiva I do Profeta (Nível 12+) — Graça Divina:
 * Aplica permanentemente +10% ao HP máximo e +10% ao MP (Mana) máximo
 * quando o personagem é da classe Profeta e possui nível >= 12.
 */
export function aplicarGracaDivina(
  hpMaxBase: number,
  manaMaxBase: number,
  nivel: number,
  classeId: string = 'profeta'
): { hpMax: number; manaMax: number } {
  const ehProfetaNivel12 =
    classeId.trim().toLowerCase() === 'profeta' && nivel >= 12;

  if (!ehProfetaNivel12) {
    return {
      hpMax: hpMaxBase,
      manaMax: manaMaxBase,
    };
  }

  return {
    hpMax: Math.ceil((hpMaxBase * 110) / 100),
    manaMax: Math.ceil((manaMaxBase * 110) / 100),
  };
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
    danoFisico: Math.ceil((danoFisicoBase * 105) / 100),
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
    return aplicarGracaDivina(base, 0, nivel, opcoes!.classeId).hpMax;
  }
  return base;
}

/**
 * Calcula a mana máxima baseada nos pontos de Mente.
 * Cada ponto de Mente concede +5 Mana.
 * - Se for Feiticeiro nível 12+, aplica permanentemente "Fluxo Arcano" (+10% Mana máxima).
 * - Se for Profeta nível 12+, aplica permanentemente "Graça Divina" (+10% Mana máxima).
 */
export function calcularManaMax(mente: number, opcoes?: OpcoesCalculoStatus): number {
  const base = mente * GAME_CONFIG.MANA_POR_PONTO_MENTE;
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;

  if (classeNormalizada === 'feiticeiro' && nivel >= 12) {
    return aplicarFluxoArcano(base, 0, nivel, opcoes!.classeId).manaMax;
  }
  if (classeNormalizada === 'profeta' && nivel >= 12) {
    return aplicarGracaDivina(0, base, nivel, opcoes!.classeId).manaMax;
  }
  return base;
}

/**
 * Calcula o sobreescudo máximo baseado nos pontos de Vitalidade.
 * Cada ponto de Vitalidade concede +2 Sobreescudo.
 * - Se for Bárbaro nível 20+, aplica permanentemente "Resistência Bárbara" (+5% Sobreescudo máximo).
 * - Se for Cavaleiro nível 12+, aplica permanentemente "Muralha de Ferro" (+10% Sobreescudo máximo).
 */
export function calcularSobreescudoMax(vitalidade: number, opcoes?: OpcoesCalculoStatus): number {
  const base = vitalidade * GAME_CONFIG.SOBREESCUDO_POR_PONTO_VITALIDADE;
  const classeNormalizada = opcoes?.classeId?.trim().toLowerCase();
  const nivel = opcoes?.nivel ?? 1;

  if (classeNormalizada === 'barbaro' && nivel >= 20) {
    return aplicarResistenciaBarbara(0, base, nivel, opcoes!.classeId).sobreescudoMax;
  }
  if (classeNormalizada === 'cavaleiro' && nivel >= 12) {
    return aplicarMuralhaDeFerro(0, base, nivel, opcoes!.classeId).sobreescudoMax;
  }
  return base;
}

/**
 * Calcula o Poder Total do personagem como a soma simples de todos os 7 atributos finais
 * (Vigor + Mente + Força + Vitalidade + Arcano + Inteligência + Agilidade).
 */
export function calcularPoderTotal(atributosFinais: Attributes): number {
  return (
    atributosFinais.vigor +
    atributosFinais.mente +
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
  hp: number
): ResultadoDano {
  const danoAposMitigacao = Math.max(GAME_CONFIG.DANO_MINIMO, danoBruto - mitigacao);

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


