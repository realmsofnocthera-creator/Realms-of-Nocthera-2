import { srcDaImagem } from '@/assets/srcDaImagem';
import { ICONE_DA_CATEGORIA } from '@/assets/forjaItens';
import type { CategoriaArma } from '@/rules/armas';
import imgChefes from './images/maestrias/trilha-chefes.webp';
import imgForja from './images/maestrias/trilha-forja.webp';
import imgExpedicao from './images/maestrias/trilha-expedicao.webp';

/** Os ícones das trilhas que não são de arma (pixel art feita para a tela): a coroa, a bigorna e a bússola. */
const ICONES_DAS_TRILHAS_FIXAS: Readonly<Record<string, string>> = {
  chefes: srcDaImagem(imgChefes),
  forja: srcDaImagem(imgForja),
  expedicao: srcDaImagem(imgExpedicao),
};

/**
 * Os ícones das maestrias de monstro (chave = id da trilha, como monstro:necrofagos). Ainda vazio: os 13 ícones entram quando chegarem
 * e as trilhas de monstro seguem sem ícone, bloqueadas, até o bestiário ser classificado.
 */
export const ICONES_DAS_TRILHAS_DE_MONSTRO: Readonly<Record<string, string>> = {};

/** O ícone de uma trilha de maestria: a arte da arma (as de arma), a coroa, a bigorna, a bússola ou o de monstro (se houver). */
export function iconeDaTrilha(trilha: { id: string; grupo: string }): string | null {
  if (trilha.id.startsWith('arma:')) return ICONE_DA_CATEGORIA[trilha.id.slice(5) as CategoriaArma] ?? null;
  return ICONES_DAS_TRILHAS_FIXAS[trilha.id] ?? ICONES_DAS_TRILHAS_DE_MONSTRO[trilha.id] ?? null;
}
