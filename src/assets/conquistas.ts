import type { CategoriaDeConquista, RaridadeDeConquista } from '@/rules/conquistas';
import mesaImg from './images/conquistas/mesa.webp';
import trofeuBronzeImg from './images/conquistas/trofeu-bronze.webp';
import trofeuPrataImg from './images/conquistas/trofeu-prata.webp';
import trofeuOuroImg from './images/conquistas/trofeu-ouro.webp';
import trofeuDiamanteImg from './images/conquistas/trofeu-diamante.webp';
import catPersonagemImg from './images/conquistas/cat-personagem.webp';
import catMonstrosImg from './images/conquistas/cat-monstros.webp';
import catForjaImg from './images/conquistas/cat-forja.webp';
import catMundoImg from './images/conquistas/cat-mundo.webp';
import catComunidadeImg from './images/conquistas/cat-comunidade.webp';
import catProvacoesImg from './images/conquistas/cat-provacoes.webp';
import catPvpImg from './images/conquistas/cat-pvp.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

/** A mesa (1027×1532) onde cada objeto é uma categoria. */
export const MESA_DAS_CONQUISTAS = srcDaImagem(mesaImg);
export const PROPORCAO_DA_MESA = 1027 / 1532;

/** Troféu de cada raridade (a fileira de cima da folha do Yuri). */
export const TROFEUS: Readonly<Record<RaridadeDeConquista, string>> = {
  bronze: srcDaImagem(trofeuBronzeImg),
  prata: srcDaImagem(trofeuPrataImg),
  ouro: srcDaImagem(trofeuOuroImg),
  diamante: srcDaImagem(trofeuDiamanteImg),
};

/** Miniatura de cada categoria: o objeto da mesa, recortado. */
export const ICONES_DAS_CATEGORIAS: Readonly<Record<CategoriaDeConquista, string>> = {
  personagem: srcDaImagem(catPersonagemImg),
  monstros: srcDaImagem(catMonstrosImg),
  forja: srcDaImagem(catForjaImg),
  mundo: srcDaImagem(catMundoImg),
  comunidade: srcDaImagem(catComunidadeImg),
  provacoes: srcDaImagem(catProvacoesImg),
  pvp: srcDaImagem(catPvpImg),
};

/** Onde fica cada objeto na mesa, em pixels da imagem original (x, y, largura, altura). */
const OBJETOS_DA_MESA: Readonly<Record<CategoriaDeConquista, readonly [number, number, number, number]>> = {
  personagem: [405, 450, 290, 380], // a roupa no manequim
  monstros: [610, 760, 180, 185], // o ovo
  forja: [735, 605, 285, 195], // a bigorna
  mundo: [400, 1120, 430, 180], // o mapa
  comunidade: [755, 130, 265, 470], // o banner de gato
  provacoes: [235, 780, 310, 340], // a escultura do dragão
  pvp: [810, 880, 200, 185], // a cabana
};

/** A área clicável de cada objeto, em % da mesa. */
export const AREAS_DA_MESA: Readonly<Record<CategoriaDeConquista, { left: string; top: string; width: string; height: string }>> = Object.fromEntries(
  (Object.entries(OBJETOS_DA_MESA) as [CategoriaDeConquista, readonly [number, number, number, number]][]).map(([k, [x, y, l, a]]) => [
    k,
    { left: `${(x / 1027) * 100}%`, top: `${(y / 1532) * 100}%`, width: `${(l / 1027) * 100}%`, height: `${(a / 1532) * 100}%` },
  ]),
) as Record<CategoriaDeConquista, { left: string; top: string; width: string; height: string }>;
