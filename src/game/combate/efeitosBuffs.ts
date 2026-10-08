import { Attributes, ATTRIBUTES, AttributeName } from '@/rules/attributes';

/**
 * Catálogo 1.2 — Atributos e buffs (1.2.4).
 * Buffs temporários que uma habilidade coloca em quem a usa. A duração conta as AÇÕES de quem tem o buff
 * (uma "rodada" dele): o buff vale a partir da próxima ação e perde 1 depois de cada ação seguinte.
 */
export type AplicacaoBuff =
  /** Aumento de Força / Sorte / Agilidade (+N em um atributo) ou Aumento Geral (+N em todos). */
  | { tipo: 'atributo'; atributo: AttributeName | 'todos'; valor: number; rodadas: number }
  /** Sincronismo: o ataque duplo por Agilidade passa a exigir 1,5x a Agilidade do inimigo em vez de 2x. */
  | { tipo: 'sincronismo'; rodadas: number }
  /** Delírio Controlado: +% de dano e +% de defesa, com risco de perder % do HP máximo a cada rodada. */
  | {
      tipo: 'delirio';
      bonusDanoPercentual: number;
      bonusDefesaPercentual: number;
      perdaHpPercentualPorRodada: number;
      rodadas: number;
    };

export type TipoBuff = 'aumentoAtributo' | 'sincronismo' | 'delirioControlado';

export interface BuffAtivo {
  tipo: TipoBuff;
  /** Para 'aumentoAtributo': qual atributo ('todos' = os 7). */
  atributo?: AttributeName | 'todos';
  valor?: number;
  bonusDanoPercentual?: number;
  bonusDefesaPercentual?: number;
  perdaHpPercentualPorRodada?: number;
  rodadasRestantes: number;
  /** Aplicado na ação atual: só começa a valer (e a contar) na próxima. */
  recemAplicado: boolean;
}

export const MULTIPLICADOR_AGILIDADE_DUPLO_PADRAO = 2;
export const MULTIPLICADOR_AGILIDADE_DUPLO_SINCRONISMO = 1.5;

function ativos(buffs: readonly BuffAtivo[] | undefined): BuffAtivo[] {
  return (buffs ?? []).filter((b) => b.rodadasRestantes > 0 && !b.recemAplicado);
}

/** Coloca os buffs. Rebuffar o mesmo tipo (e o mesmo atributo) renova: vale o novo valor e a nova duração. */
export function adicionarBuffs(
  lista: readonly BuffAtivo[] | undefined,
  aplicacoes: readonly AplicacaoBuff[]
): BuffAtivo[] {
  let resultado = [...(lista ?? [])];
  for (const a of aplicacoes) {
    if (a.rodadas <= 0) continue;
    let novo: BuffAtivo;
    if (a.tipo === 'atributo') {
      novo = {
        tipo: 'aumentoAtributo',
        atributo: a.atributo,
        valor: a.valor,
        rodadasRestantes: a.rodadas,
        recemAplicado: true,
      };
      resultado = resultado.filter((b) => !(b.tipo === 'aumentoAtributo' && b.atributo === a.atributo));
    } else if (a.tipo === 'sincronismo') {
      novo = { tipo: 'sincronismo', rodadasRestantes: a.rodadas, recemAplicado: true };
      resultado = resultado.filter((b) => b.tipo !== 'sincronismo');
    } else {
      novo = {
        tipo: 'delirioControlado',
        bonusDanoPercentual: a.bonusDanoPercentual,
        bonusDefesaPercentual: a.bonusDefesaPercentual,
        perdaHpPercentualPorRodada: a.perdaHpPercentualPorRodada,
        rodadasRestantes: a.rodadas,
        recemAplicado: true,
      };
      resultado = resultado.filter((b) => b.tipo !== 'delirioControlado');
    }
    resultado.push(novo);
  }
  return resultado;
}

/** Atributos com os buffs somados (não muta os originais). */
export function aplicarBuffsAosAtributos(
  atributos: Attributes,
  buffs: readonly BuffAtivo[] | undefined
): Attributes {
  const efetivos: Attributes = { ...atributos };
  for (const b of ativos(buffs)) {
    if (b.tipo !== 'aumentoAtributo' || !b.valor) continue;
    const alvos: readonly AttributeName[] =
      b.atributo === 'todos' ? ATTRIBUTES : b.atributo ? [b.atributo] : [];
    for (const nome of alvos) {
      efetivos[nome] += b.valor;
    }
  }
  return efetivos;
}

export function multiplicadorAgilidadeParaDuplo(buffs: readonly BuffAtivo[] | undefined): number {
  return ativos(buffs).some((b) => b.tipo === 'sincronismo')
    ? MULTIPLICADOR_AGILIDADE_DUPLO_SINCRONISMO
    : MULTIPLICADOR_AGILIDADE_DUPLO_PADRAO;
}

export function bonusDanoDosBuffs(buffs: readonly BuffAtivo[] | undefined): number {
  return ativos(buffs)
    .filter((b) => b.tipo === 'delirioControlado')
    .reduce((soma, b) => soma + (b.bonusDanoPercentual ?? 0), 0);
}

export function bonusDefesaDosBuffs(buffs: readonly BuffAtivo[] | undefined): number {
  return ativos(buffs)
    .filter((b) => b.tipo === 'delirioControlado')
    .reduce((soma, b) => soma + (b.bonusDefesaPercentual ?? 0), 0);
}

/** Fim da ação de quem tem os buffs: os recém-aplicados passam a valer; os demais perdem 1 rodada. */
export function avancarBuffs(lista: readonly BuffAtivo[] | undefined): {
  buffs: BuffAtivo[];
  expirados: TipoBuff[];
  /** Perda de HP (em % do máximo) dos Delírios que estavam ativos nesta ação. */
  perdaHpPercentual: number;
} {
  const buffs: BuffAtivo[] = [];
  const expirados: TipoBuff[] = [];
  let perdaHpPercentual = 0;
  for (const b of lista ?? []) {
    if (b.recemAplicado) {
      buffs.push({ ...b, recemAplicado: false });
      continue;
    }
    if (b.tipo === 'delirioControlado') {
      perdaHpPercentual += b.perdaHpPercentualPorRodada ?? 0;
    }
    const rodadasRestantes = b.rodadasRestantes - 1;
    if (rodadasRestantes > 0) {
      buffs.push({ ...b, rodadasRestantes });
    } else {
      expirados.push(b.tipo);
    }
  }
  return { buffs, expirados, perdaHpPercentual };
}
