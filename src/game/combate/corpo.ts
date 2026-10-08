import { GAME_CONFIG } from '@/rules/config';
import { CORPOS, CategoriaCorporal, NOMES_TIPO_GOLPE, TipoGolpe } from '@/rules/corposMonstros';

export interface CorpoDoAlvo {
  categoriaCorporal?: CategoriaCorporal;
  /** Aberrante: as fraquezas e resistências próprias da criatura. */
  fraquezasProprias?: readonly TipoGolpe[];
  resistenciasProprias?: readonly TipoGolpe[];
}

export interface ReacaoDoCorpo {
  /** 100 = sem efeito; 125 = fraqueza; 75 = resistência. */
  fatorPercentual: number;
  reacao?: 'fraqueza' | 'resistência';
  tipo?: TipoGolpe;
  nomeTipo?: string;
}

/**
 * Efeito do tipo do golpe sobre o corpo do alvo: +25% de dano se o alvo é fraco a ele, −25% se resiste.
 * Sem tipo (ataque sem arma) ou sem categoria, não há efeito. Se o tipo estiver nas duas listas, elas se anulam.
 */
export function reacaoDoCorpo(alvo: CorpoDoAlvo, tipo: TipoGolpe | undefined): ReacaoDoCorpo {
  if (!tipo || !alvo.categoriaCorporal) {
    return { fatorPercentual: 100 };
  }
  const def = CORPOS[alvo.categoriaCorporal];
  const fraquezas = def.variavel ? alvo.fraquezasProprias ?? [] : def.fraquezas;
  const resistencias = def.variavel ? alvo.resistenciasProprias ?? [] : def.resistencias;
  const bonus = GAME_CONFIG.MODIFICADOR_TIPO_DANO_PERCENTUAL;
  const delta = (fraquezas.includes(tipo) ? bonus : 0) - (resistencias.includes(tipo) ? bonus : 0);
  return {
    fatorPercentual: 100 + delta,
    reacao: delta > 0 ? 'fraqueza' : delta < 0 ? 'resistência' : undefined,
    tipo,
    nomeTipo: NOMES_TIPO_GOLPE[tipo],
  };
}
