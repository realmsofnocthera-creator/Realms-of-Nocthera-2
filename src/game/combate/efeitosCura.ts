/**
 * Catálogo 1.2 — Cura e restauração (1.2.4).
 * Efeitos que uma habilidade aplica em quem a usa. Os valores são % do HP máximo
 * (Cura em Excesso também dá % do Sobreescudo máximo). Toda cura arredonda para cima
 * e nunca passa do HP máximo.
 */
export type AplicacaoCura =
  | { efeito: 'curaDireta'; percentualHpMax: number }
  | { efeito: 'curaEmExcesso'; percentualHpMax: number; percentualSobreescudo: number }
  | { efeito: 'curaContinua'; percentualHpMax: number; duracaoRodadas: number }
  /** Só cura se quem usa estiver abaixo de 30% do HP. */
  | { efeito: 'curaCritica'; percentualHpMax: number }
  /** Remove de 1 a 3 efeitos negativos (Veneno, Sangramento...) e cura. */
  | { efeito: 'limpeza'; quantidadeEfeitos: number; percentualHpMax: number }
  /** Prepara a volta com X% do HP se cair a 0. Uma vez por luta, sem a penalidade de morte. */
  | { efeito: 'ressurreicaoParcial'; percentualHpMax: number };

export type TipoEfeitoCura = AplicacaoCura['efeito'];

export interface CuraContinuaAtiva {
  percentualHpMax: number;
  rodadasRestantes: number;
}

export interface RessurreicaoParcialEstado {
  percentualHpMax: number;
  /** Já foi usada nesta luta (não pode ser preparada de novo). */
  usada: boolean;
}

export const LIMITE_HP_CURA_CRITICA_PERCENTUAL = 30;
export const LIMPEZA_MINIMO_EFEITOS = 1;
export const LIMPEZA_MAXIMO_EFEITOS = 3;

export function calcularCura(hpMax: number, percentual: number): number {
  if (hpMax <= 0 || percentual <= 0) return 0;
  return Math.ceil((hpMax * percentual) / 100);
}

export interface ResultadoCuras {
  hp: number;
  sobreescudo: number;
  /** HP recuperado de fato (sem contar o que passaria do máximo). */
  curaHp: number;
  sobreescudoGanho: number;
  curaContinua?: CuraContinuaAtiva;
  /** Quantos efeitos negativos a Limpeza remove (0 se não houver Limpeza). */
  efeitosNegativosARemover: number;
  ressurreicaoParcial?: RessurreicaoParcialEstado;
  aplicados: TipoEfeitoCura[];
}

/** Aplica de uma vez as curas de uma habilidade. */
export function aplicarCuras(params: {
  hp: number;
  hpMax: number;
  sobreescudo: number;
  sobreescudoMax: number;
  curaContinuaAtual?: CuraContinuaAtiva;
  ressurreicaoAtual?: RessurreicaoParcialEstado;
  /** Eficácia das curas em % (100 = normal; a Cicatrização do inimigo reduz). */
  eficaciaPercentual?: number;
  aplicacoes: readonly AplicacaoCura[];
}): ResultadoCuras {
  const { hpMax, sobreescudoMax, aplicacoes } = params;
  const hpInicial = params.hp;
  // Cura Crítica olha o HP de quem usa antes das curas desta mesma habilidade
  const abaixoDe30 = hpMax > 0 && (hpInicial * 100) / hpMax < LIMITE_HP_CURA_CRITICA_PERCENTUAL;

  let curaBruta = 0;
  let sobreescudoGanho = 0;
  let curaContinua = params.curaContinuaAtual;
  let ressurreicaoParcial = params.ressurreicaoAtual;
  let efeitosNegativosARemover = 0;
  const aplicados: TipoEfeitoCura[] = [];

  for (const a of aplicacoes) {
    switch (a.efeito) {
      case 'curaDireta':
        curaBruta += calcularCura(hpMax, a.percentualHpMax);
        break;
      case 'curaEmExcesso':
        curaBruta += calcularCura(hpMax, a.percentualHpMax);
        sobreescudoGanho += calcularCura(sobreescudoMax, a.percentualSobreescudo);
        break;
      case 'curaContinua':
        if (a.duracaoRodadas <= 0) continue;
        // Renovar substitui a anterior (vale o novo valor e a nova duração)
        curaContinua = { percentualHpMax: a.percentualHpMax, rodadasRestantes: a.duracaoRodadas };
        break;
      case 'curaCritica':
        if (!abaixoDe30) continue;
        curaBruta += calcularCura(hpMax, a.percentualHpMax);
        break;
      case 'limpeza':
        efeitosNegativosARemover = Math.max(
          efeitosNegativosARemover,
          Math.min(LIMPEZA_MAXIMO_EFEITOS, Math.max(LIMPEZA_MINIMO_EFEITOS, Math.floor(a.quantidadeEfeitos)))
        );
        curaBruta += calcularCura(hpMax, a.percentualHpMax);
        break;
      case 'ressurreicaoParcial':
        if (ressurreicaoParcial?.usada) continue; // uma vez por luta
        ressurreicaoParcial = { percentualHpMax: a.percentualHpMax, usada: false };
        break;
    }
    aplicados.push(a.efeito);
  }

  const curaFinal = Math.floor((curaBruta * Math.max(0, params.eficaciaPercentual ?? 100)) / 100);
  const hp = Math.min(hpMax, hpInicial + curaFinal);
  return {
    hp,
    sobreescudo: params.sobreescudo + sobreescudoGanho,
    curaHp: Math.max(0, hp - hpInicial),
    sobreescudoGanho,
    curaContinua,
    efeitosNegativosARemover,
    ressurreicaoParcial,
    aplicados,
  };
}

/** Fim da rodada: a Cura Contínua cura e perde 1 rodada. */
export function processarCuraContinua(
  estado: CuraContinuaAtiva | undefined,
  hp: number,
  hpMax: number,
  eficaciaPercentual: number = 100
): { hp: number; cura: number; estado?: CuraContinuaAtiva } {
  if (!estado || estado.rodadasRestantes <= 0 || hp <= 0) {
    return { hp, cura: 0, estado: undefined };
  }
  const cura = Math.floor((calcularCura(hpMax, estado.percentualHpMax) * Math.max(0, eficaciaPercentual)) / 100);
  const novoHp = Math.min(hpMax, hp + cura);
  const rodadasRestantes = estado.rodadasRestantes - 1;
  return {
    hp: novoHp,
    cura: novoHp - hp,
    estado: rodadasRestantes > 0 ? { ...estado, rodadasRestantes } : undefined,
  };
}

/** Se o HP chegou a 0 e há Ressurreição Parcial preparada, volta com X% do HP (uma vez por luta). */
export function tentarRessurreicaoParcial(
  estado: RessurreicaoParcialEstado | undefined,
  hp: number,
  hpMax: number
): { hp: number; ressuscitou: boolean; estado?: RessurreicaoParcialEstado } {
  if (hp > 0 || !estado || estado.usada) {
    return { hp, ressuscitou: false, estado };
  }
  const novoHp = Math.max(1, Math.min(hpMax, calcularCura(hpMax, estado.percentualHpMax)));
  return { hp: novoHp, ressuscitou: true, estado: { ...estado, usada: true } };
}
