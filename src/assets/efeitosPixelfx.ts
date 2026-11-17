import manifesto from './pixelfxManifesto.json';

/**
 * Os efeitos de combate em pixel art, feitos com o pixelfx (https://github.com/patch-gg/pixelfx, licença MIT; os créditos
 * estão em NOTICE.md). Cada um é uma folha de quadros em `public/images/cacada/pixelfx/<nome>.webp` (os quadros lado a lado,
 * já cortados rente ao desenho, com transparência) e o `pixelfxManifesto.json` guarda quantos quadros, o tamanho de cada um
 * e a velocidade. Os efeitos de elemento são o mesmo efeito com a paleta do elemento. Para gerar de novo: `docs/pixelfx.md`.
 */
export type NomeDoEfeito = keyof typeof manifesto;

export const PASTA_DOS_EFEITOS = '/images/cacada/pixelfx/';

export interface InfoDoEfeito {
  quadros: number;
  largura: number;
  altura: number;
  fps: number;
  laco: boolean;
}

export const EFEITOS: Readonly<Record<NomeDoEfeito, InfoDoEfeito>> = manifesto as Record<NomeDoEfeito, InfoDoEfeito>;

/**
 * Onde o efeito fica no alvo: no centro do corpo, nos pés, em cima da cabeça, no chão (metade dentro, metade fora, para
 * poças) ou no topo das costas (para chamas).
 */
export type AncoraDoEfeito = 'centro' | 'pes' | 'cabeca' | 'chao' | 'topo';

/** Uma cópia do efeito: o deslocamento (em alturas do alvo), a escala e o atraso (ms, negativo = já começa andando). */
export interface CopiaDoEfeito {
  dx: number;
  dy: number;
  escala: number;
  atraso: number;
}

export interface LayoutDoEfeito {
  /** a largura do efeito em alturas do alvo (o efeito cresce com o monstro ou o herói) */
  largura: number;
  ancora: AncoraDoEfeito;
  /** atrás do corpo (poças no chão, relâmpagos em volta) ou na frente dele */
  camada?: 'atras' | 'frente';
  /** várias cópias lado a lado (as chamas da queimadura, os cristais do gelo); sem isso, uma só */
  copias?: readonly CopiaDoEfeito[];
}

export const LAYOUT_DOS_EFEITOS: Readonly<Record<NomeDoEfeito, LayoutDoEfeito>> = {
  bloqueio: { largura: 1.8, ancora: 'centro' },
  cura: { largura: 2.6, ancora: 'pes' },
  // poças: no chão, atrás das pernas, para a criatura parecer estar dentro delas
  'dot-veneno': { largura: 1.7, ancora: 'chao', camada: 'atras' },
  'dot-podridao': { largura: 1.7, ancora: 'chao', camada: 'atras' },
  // gelo: um cristal de cada lado, fora do corpo (e a criatura fica azulada)
  'dot-congelamento': {
    largura: 0.6, ancora: 'chao',
    copias: [{ dx: -0.62, dy: 0, escala: 1, atraso: 0 }, { dx: 0.62, dy: -0.04, escala: 0.85, atraso: -400 }],
  },
  // chamas lambendo as costas: três, em alturas e tempos diferentes
  'dot-queimadura': {
    largura: 0.5, ancora: 'topo',
    copias: [{ dx: -0.34, dy: 0.02, escala: 0.9, atraso: 0 }, { dx: 0.02, dy: -0.06, escala: 1.15, atraso: -250 }, { dx: 0.36, dy: 0.04, escala: 0.85, atraso: -500 }],
  },
  // arcos elétricos em volta, por trás do corpo
  'dot-paralisia': { largura: 2.0, ancora: 'chao', camada: 'atras' },
  'dot-loucura': { largura: 1.0, ancora: 'cabeca' },
  'dot-maldicao': { largura: 1.1, ancora: 'chao', camada: 'atras' },
  'dot-sangramento': { largura: 0.7, ancora: 'pes' },
  'dot-sono': { largura: 0.9, ancora: 'cabeca' },
  'golpe-contusao': { largura: 1.8, ancora: 'centro' },
  'golpe-corte': { largura: 2.5, ancora: 'centro' },
  'golpe-critico': { largura: 3.0, ancora: 'centro' },
  'golpe-garra': { largura: 1.8, ancora: 'centro' },
  'golpe-perfuracao': { largura: 2.8, ancora: 'centro' },
  'golpe-relampago': { largura: 2.5, ancora: 'centro' },
  'golpe-simples': { largura: 2.0, ancora: 'centro' },
  'magia-fogo': { largura: 2.6, ancora: 'centro' },
  'magia-gelo': { largura: 2.6, ancora: 'centro' },
  'magia-sagrado': { largura: 2.6, ancora: 'centro' },
  'magia-sombrio': { largura: 2.6, ancora: 'centro' },
  'magia-terra': { largura: 2.6, ancora: 'centro' },
  'magia-vento': { largura: 2.6, ancora: 'centro' },
  morte: { largura: 2.0, ancora: 'centro' },
};

/** A cor que o corpo ganha sob cada status (um filtro de CSS sobre a arte), para o efeito não parecer colado por cima. */
const TINTA_DO_STATUS: Readonly<Record<string, string>> = {
  congelamento: 'brightness(1.12) saturate(.55) sepia(1) hue-rotate(175deg)',
  veneno: 'sepia(.55) hue-rotate(52deg) saturate(1.5)',
  podridaoEscarlate: 'sepia(.6) hue-rotate(-30deg) saturate(2)',
  queimadura: 'sepia(.35) saturate(1.5) brightness(1.08)',
  paralisia: 'brightness(1.12) sepia(.5) hue-rotate(5deg) saturate(1.4)',
  maldicao: 'brightness(.88) sepia(.5) hue-rotate(235deg) saturate(1.4)',
};

/** O filtro do corpo para os status ativos (o primeiro da lista de cores que valer); sem status com cor, `none`. */
export function tintaDosStatus(status: readonly string[]): string {
  const f = status.map((s) => TINTA_DO_STATUS[s]).filter(Boolean);
  return f.length ? f[0] : 'none';
}

/** O efeito de cada status que castiga com o tempo (os DoTs e controles). */
export const EFEITO_DO_STATUS: Readonly<Record<string, NomeDoEfeito>> = {
  sangramento: 'dot-sangramento',
  veneno: 'dot-veneno',
  podridaoEscarlate: 'dot-podridao',
  congelamento: 'dot-congelamento',
  sono: 'dot-sono',
  loucura: 'dot-loucura',
  maldicao: 'dot-maldicao',
  paralisia: 'dot-paralisia',
  queimadura: 'dot-queimadura',
};
