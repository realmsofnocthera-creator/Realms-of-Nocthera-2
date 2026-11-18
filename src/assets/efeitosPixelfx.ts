import manifesto from './pixelfxManifesto.json';
import habilidades from './pixelfxHabilidades.json';
import { CLASSES } from '@/rules/classes';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';

/**
 * Os efeitos de combate em pixel art, feitos com o pixelfx (https://github.com/patch-gg/pixelfx, licença MIT; os créditos
 * estão em NOTICE.md). Cada um é uma folha de quadros em `public/images/cacada/pixelfx/<nome>.webp` (os quadros lado a lado,
 * já cortados rente ao desenho, com transparência) e o `pixelfxManifesto.json` guarda quantos quadros, o tamanho de cada um
 * e a velocidade. Os efeitos de elemento são o mesmo efeito com a paleta do elemento. Para gerar de novo: `docs/pixelfx.md`.
 */
/** Os efeitos gerais (golpes, status, cura, morte). */
export type NomeDoEfeitoGeral = keyof typeof manifesto;
/** Os efeitos do ataque básico e da especial de cada classe e subclasse (`hab-<id da habilidade>`, e `-si` quando caem em quem usou). */
export type NomeDoEfeitoDeHabilidade = keyof typeof habilidades;
export type NomeDoEfeito = NomeDoEfeitoGeral | NomeDoEfeitoDeHabilidade;

export const PASTA_DOS_EFEITOS = '/images/cacada/pixelfx/';

export interface InfoDoEfeito {
  quadros: number;
  largura: number;
  altura: number;
  fps: number;
  laco: boolean;
}

export const EFEITOS: Readonly<Record<NomeDoEfeito, InfoDoEfeito>> = { ...manifesto, ...habilidades } as Record<NomeDoEfeito, InfoDoEfeito>;

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

export const LAYOUT_DOS_EFEITOS: Readonly<Record<NomeDoEfeitoGeral, LayoutDoEfeito>> = {
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

/** Os efeitos de habilidade que precisam de outro tamanho ou lugar (os demais usam o padrão de golpe ou de quem usou). */
const LAYOUT_DAS_HABILIDADES: Readonly<Partial<Record<NomeDoEfeitoDeHabilidade, LayoutDoEfeito>>> = {
  'hab-cavaleiro_postura_do_guardiao-si': { largura: 1.25, ancora: 'centro' },
  'hab-bastiao_muralha_inabalavel-si': { largura: 1.25, ancora: 'centro' },
  'hab-profeta_bencao_divina-si': { largura: 0.6, ancora: 'pes' },
  'hab-sacerdote_prece_de_cura-si': { largura: 0.6, ancora: 'pes' },
  'hab-colosso_impacto_sismico': { largura: 3.0, ancora: 'pes' },
  'hab-inquisidor_fogo_sagrado': { largura: 2.4, ancora: 'chao' },
  'hab-arquimago_tempestade_de_raios': { largura: 1.9, ancora: 'pes' },
  'hab-inquisidor_sentenca': { largura: 2.2, ancora: 'pes' },
  'hab-assassino_golpe_nas_sombras': { largura: 2.0, ancora: 'chao' },
  'hab-berserker_golpe_desenfreado': { largura: 1.8, ancora: 'centro' },
};

/** O tamanho e o lugar de qualquer efeito: o do efeito geral, o próprio da habilidade, ou o padrão (golpe no centro do alvo). */
export function layoutDoEfeito(nome: NomeDoEfeito): LayoutDoEfeito {
  return (
    (LAYOUT_DOS_EFEITOS as Record<string, LayoutDoEfeito>)[nome] ??
    LAYOUT_DAS_HABILIDADES[nome as NomeDoEfeitoDeHabilidade] ??
    (nome.endsWith('-si') ? { largura: 1.2, ancora: 'centro' } : { largura: 2.5, ancora: 'centro' })
  );
}

/** O id de cada ataque básico e especial (das classes e das subclasses) pelo nome que aparece na luta. */
const ID_DA_HABILIDADE: Readonly<Record<string, string>> = Object.fromEntries([
  ...CLASSES.flatMap((c) => [c.progressao.ataqueBasico, c.progressao.habilidadeEspecial].map((h) => [h.nome, h.id])),
  ...Object.values(TEXTOS_SUBCLASSE).flatMap((t) => [t.basico, t.especial].map((h) => [h.nome, h.id])),
]);

/** Os efeitos próprios de uma habilidade (pelo nome usado na luta): o que cai no inimigo e o que cai em quem usou. */
export function efeitosDaHabilidade(nomeDaHabilidade: string): { inimigo?: NomeDoEfeito; si?: NomeDoEfeito } | undefined {
  const id = ID_DA_HABILIDADE[nomeDaHabilidade];
  if (!id) return undefined;
  const inimigo = `hab-${id}` as NomeDoEfeito;
  const si = `hab-${id}-si` as NomeDoEfeito;
  const r = { ...(inimigo in EFEITOS ? { inimigo } : {}), ...(si in EFEITOS ? { si } : {}) };
  return r.inimigo || r.si ? r : undefined;
}

/** Os ids de todas as habilidades (básico e especial de cada classe e subclasse) que devem ter efeito próprio. */
export const IDS_COM_EFEITO_DE_HABILIDADE: readonly string[] = Object.values(ID_DA_HABILIDADE);
