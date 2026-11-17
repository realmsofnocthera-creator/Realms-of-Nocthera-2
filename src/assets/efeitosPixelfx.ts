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

/** Onde o efeito fica no alvo: no centro do corpo, nos pés ou em cima da cabeça. */
export type AncoraDoEfeito = 'centro' | 'pes' | 'cabeca';

/** A largura do efeito em alturas do alvo (o efeito cresce com o monstro ou o herói) e onde ele ancora. */
export const LAYOUT_DOS_EFEITOS: Readonly<Record<NomeDoEfeito, { largura: number; ancora: AncoraDoEfeito }>> = {
  bloqueio: { largura: 1.8, ancora: 'centro' },
  cura: { largura: 2.6, ancora: 'pes' },
  'dot-congelamento': { largura: 1.0, ancora: 'pes' },
  'dot-loucura': { largura: 1.0, ancora: 'cabeca' },
  'dot-maldicao': { largura: 1.1, ancora: 'pes' },
  'dot-paralisia': { largura: 1.3, ancora: 'centro' },
  'dot-podridao': { largura: 1.6, ancora: 'pes' },
  'dot-queimadura': { largura: 1.0, ancora: 'pes' },
  'dot-sangramento': { largura: 0.7, ancora: 'pes' },
  'dot-sono': { largura: 0.9, ancora: 'cabeca' },
  'dot-veneno': { largura: 1.6, ancora: 'pes' },
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
