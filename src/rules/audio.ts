import { SONS_COMBATE, SONS_ELEMENTOS, SONS_INTERFACE, SONS_STINGERS } from '@/rules/audioSons';

/**
 * Regras do áudio (puras, sem navegador): os canais de volume, as prioridades e qual música toca em cada tela.
 * Música: nenhuma toca antes do primeiro toque do jogador (o navegador não deixa) e cada faixa só é baixada quando a tela dela abre.
 */
export const CANAIS = ['musica', 'efeitos', 'interface', 'ambiente'] as const;
export type Canal = (typeof CANAIS)[number];

export const ROTULO_DO_CANAL: Readonly<Record<Canal, string>> = { musica: 'Música', efeitos: 'Efeitos', interface: 'Interface', ambiente: 'Ambiente' };

/** Padrão: música 45%, efeitos 95% (os golpes precisam se ouvir por cima da música), interface 70%; ambiente 60% (ainda não há sons de ambiente). */
export const VOLUMES_PADRAO: Readonly<Record<Canal, number>> = { musica: 0.45, efeitos: 0.95, interface: 0.7, ambiente: 0.6 };

export interface PreferenciasDeAudio {
  volumes: Record<Canal, number>;
  mudo: boolean;
}

export const PREFERENCIAS_PADRAO: PreferenciasDeAudio = { volumes: { ...VOLUMES_PADRAO }, mudo: false };

/** Lê as preferências guardadas (qualquer coisa estranha vira o padrão; volume fica entre 0 e 1). */
export function preferenciasDoTexto(bruto: unknown): PreferenciasDeAudio {
  const o = (bruto && typeof bruto === 'object' ? bruto : {}) as { volumes?: Partial<Record<Canal, unknown>>; mudo?: unknown };
  const volumes = { ...VOLUMES_PADRAO };
  for (const c of CANAIS) {
    const v = o.volumes?.[c];
    if (typeof v === 'number' && Number.isFinite(v)) volumes[c] = Math.min(1, Math.max(0, v));
  }
  return { volumes, mudo: o.mudo === true };
}

export type IdDeSom = (typeof SONS_INTERFACE)[number] | (typeof SONS_COMBATE)[number] | (typeof SONS_ELEMENTOS)[number] | (typeof SONS_STINGERS)[number];

const PASTA: Record<string, string> = {};
for (const id of SONS_INTERFACE) PASTA[id] = 'interface';
for (const id of SONS_COMBATE) PASTA[id] = 'combate';
for (const id of SONS_ELEMENTOS) PASTA[id] = 'elementos';
for (const id of SONS_STINGERS) PASTA[id] = 'stingers';

export const caminhoDoSom = (id: IdDeSom): string => `/audio/${PASTA[id]}/${id}.m4a`;
export const ehSom = (id: string): id is IdDeSom => Object.prototype.hasOwnProperty.call(PASTA, id);

/** O canal de volume de cada som: interface e recompensas na Interface; o resto nos Efeitos. */
export const canalDoSom = (id: IdDeSom): Canal => (PASTA[id] === 'interface' ? 'interface' : 'efeitos');

/** Prioridade (maior vence): alerta crítico > ultimate > habilidades e impactos > interface. */
export function prioridadeDoSom(id: IdDeSom): number {
  if (id === 'stinger_ultimate_pronta') return 90;
  if (id.endsWith('_ultimate')) return 80;
  if (id.startsWith('stinger_')) return 70;
  if (PASTA[id] === 'elementos') return 60;
  if (PASTA[id] === 'combate') return 50;
  return 30;
}

export const MAXIMO_DE_SONS_JUNTOS = 8;
export const INTERVALO_MINIMO_DO_MESMO_SOM_MS = 80;
/** Sons que abaixam a música em 6 dB por 4 s. */
export const SONS_QUE_ABAIXAM_A_MUSICA: readonly IdDeSom[] = ['ui_conquista', 'ui_nivel_acima'];
export const ABAIXAR_MUSICA_DB = 6;
export const ABAIXAR_MUSICA_MS = 4000;

// ---- Música ----

export type IdDeMusica =
  | 'menu_principal' | 'beyond_the_great_divide' | 'iron_wind_over_bone' | 'throne_of_the_unforgiven' | 'finis_mundi'
  | 'sovereign_of_the_permafrost' | 'throne_of_frozen_breath' | 'the_final_parry' | 'beneath_the_blade' | 'silentium_fugit' | 'cla_mo_re_in_te_ne_bris' | 'vis_fati';

export const caminhoDaMusica = (id: IdDeMusica): string => `/audio/musica/musica_${id}.m4a`;

/** Combates comuns: qualquer faixa, menos as do menu e as da Arena (que são só da Arena). */
export const MUSICAS_DE_COMBATE: readonly IdDeMusica[] = [
  'beyond_the_great_divide', 'iron_wind_over_bone', 'throne_of_the_unforgiven', 'finis_mundi', 'sovereign_of_the_permafrost', 'throne_of_frozen_breath', 'silentium_fugit', 'cla_mo_re_in_te_ne_bris', 'vis_fati',
];
export const MUSICAS_DA_ARENA: readonly IdDeMusica[] = ['the_final_parry', 'beneath_the_blade'];

export interface ContextoDeMusica {
  /** as faixas que podem tocar aqui (uma só = sempre ela) */
  faixas: readonly IdDeMusica[];
  /** a pausa entre uma faixa e a próxima (as faixas terminam em silêncio) */
  pausaMs: readonly [number, number];
}

const MENU: ContextoDeMusica = { faixas: ['menu_principal'], pausaMs: [3000, 5000] };
const MAPA: ContextoDeMusica = { faixas: ['beyond_the_great_divide'], pausaMs: [3000, 5000] };
const COMBATE: ContextoDeMusica = { faixas: MUSICAS_DE_COMBATE, pausaMs: [2000, 4000] };
const ARENA: ContextoDeMusica = { faixas: MUSICAS_DA_ARENA, pausaMs: [2000, 4000] };

/** A música de cada tela (pelo endereço). Sem regra própria = o tema do menu (Hub, Mochila, Coleção, Loja...). */
export function musicaDaRota(caminho: string): ContextoDeMusica {
  const p = caminho.split('?')[0].replace(/\/+$/, '') || '/';
  if (p === '/' || p === '/login') return MENU;
  if (p === '/combate') return ARENA;
  if (p === '/campanha' || p === '/expedicao') return MAPA;
  if (p === '/chefe-mundial') return { faixas: ['finis_mundi'], pausaMs: [2000, 4000] };
  if (p === '/torre-celestial') return { faixas: ['throne_of_frozen_breath'], pausaMs: [2000, 4000] };
  if (p === '/provacoes') return { faixas: ['silentium_fugit'], pausaMs: [3000, 5000] };
  if (p === '/cacada' || p === '/batalha-sangrenta' || p === '/teste-equipe') return COMBATE;
  // o Hub, a Mochila e todos os outros menus: o tema do menu
  return MENU;
}

/** Sorteia a próxima faixa do contexto, sem repetir a que acabou de tocar (se houver outra). */
export function proximaFaixa(ctx: ContextoDeMusica, anterior: IdDeMusica | null, sorteio: () => number = Math.random): IdDeMusica {
  const opcoes = ctx.faixas.length > 1 ? ctx.faixas.filter((f) => f !== anterior) : ctx.faixas;
  return opcoes[Math.min(opcoes.length - 1, Math.floor(sorteio() * opcoes.length))];
}
