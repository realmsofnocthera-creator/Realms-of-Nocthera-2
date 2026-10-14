import type { CategoriaCorporal } from './corposMonstros';
import type { Elemento } from './elements';
import type { EfeitoStatus } from './statusEffects';

/**
 * Os 30 chefes únicos da Torre Celestial (lista do Yuri, 14/10/2026): um a cada 10 andares, em ordem crescente de
 * poder. Elemento e status seguem a lista; "Impacto" vira Contusão (sem elemento), Petrificação usa a Podridão
 * Escarlate, Praga da Morte e "Sagrado corrompido" usam a Maldição, e o Frenesi virou Sangramento.
 * Os nomes repetidos com a Caçada foram trocados (Lamenth, Skorvak, Kaelgor e Sanghra), a aprovar pelo Yuri.
 * A categoria corporal é PROPOSTA (a lista não a define); todos usam o perfil normal, para o poder crescer chefe a chefe.
 */
export interface ChefeTorre {
  id: string;
  andar: number;
  nome: string;
  /** Texto curto para a tela: o que o chefe aplica. */
  efeitos: string;
  categoriaCorporal: CategoriaCorporal;
  elementoAtaque?: Elemento;
  efeitosAplicados?: EfeitoStatus[];
}

export const CHEFES_TORRE: readonly ChefeTorre[] = [
  { id: 'rikk-rato-carniceiro', andar: 10, nome: 'Rikk, o Rato Carniceiro', efeitos: 'Sangramento', categoriaCorporal: 'feral', efeitosAplicados: ['sangramento'] },
  { id: 'morvick-esqueleto-errante', andar: 20, nome: 'Morvick, o Esqueleto Errante', efeitos: 'Sombrio', categoriaCorporal: 'sombrio', elementoAtaque: 'sombrio' },
  { id: 'sylra-aranha-venenosa', andar: 30, nome: 'Sylra, a Aranha Venenosa', efeitos: 'Veneno', categoriaCorporal: 'quitinoso', efeitosAplicados: ['veneno'] },
  { id: 'ghorum-goblin-esmagador', andar: 40, nome: 'Ghorum, o Goblin Esmagador', efeitos: 'Contusão', categoriaCorporal: 'blindagemMedia' },
  { id: 'lamenth-espirito-choroso', andar: 50, nome: 'Lamenth, o Espírito Choroso', efeitos: 'Gelo', categoriaCorporal: 'eterio', elementoAtaque: 'gelo' },
  { id: 'varkun-lobo-cinzento', andar: 60, nome: 'Varkun, o Lobo Cinzento', efeitos: 'Sangramento', categoriaCorporal: 'feral', efeitosAplicados: ['sangramento'] },
  { id: 'thessa-bruxa-das-cinzas', andar: 70, nome: 'Thessa, a Bruxa das Cinzas', efeitos: 'Fogo', categoriaCorporal: 'organicoDesprotegido', elementoAtaque: 'fogo' },
  { id: 'drogath-orc-renegado', andar: 80, nome: 'Drogath, o Orc Renegado', efeitos: 'Contusão', categoriaCorporal: 'blindagemMedia' },
  { id: 'velkris-medusa-palida', andar: 90, nome: 'Velkris, a Medusa Pálida', efeitos: 'Podridão Escarlate (Petrificação)', categoriaCorporal: 'escamoso', efeitosAplicados: ['podridaoEscarlate'] },
  { id: 'grulmok-troll-deformado', andar: 100, nome: 'Grulmok, o Troll Deformado', efeitos: 'Veneno', categoriaCorporal: 'organicoDesprotegido', efeitosAplicados: ['veneno'] },
  { id: 'eryndra-fada-corrompida', andar: 110, nome: 'Eryndra, a Fada Corrompida', efeitos: 'Sono', categoriaCorporal: 'eterio', efeitosAplicados: ['sono'] },
  { id: 'kharvek-cavaleiro-decapitado', andar: 120, nome: 'Kharvek, o Cavaleiro Decapitado', efeitos: 'Sombrio', categoriaCorporal: 'blindadoPesado', elementoAtaque: 'sombrio' },
  { id: 'skorvak-escorpiao-abissal', andar: 130, nome: 'Skorvak, o Escorpião Abissal', efeitos: 'Veneno', categoriaCorporal: 'quitinoso', efeitosAplicados: ['veneno'] },
  { id: 'morthessa-sacerdotisa-morta', andar: 140, nome: 'Morthessa, a Sacerdotisa Morta', efeitos: 'Maldição', categoriaCorporal: 'sombrio', efeitosAplicados: ['maldicao'] },
  { id: 'brakkor-minotauro-carmesim', andar: 150, nome: 'Brakkor, o Minotauro Carmesim', efeitos: 'Sangramento', categoriaCorporal: 'feral', efeitosAplicados: ['sangramento'] },
  { id: 'vaelith-serpente-glacial', andar: 160, nome: 'Vaelith, a Serpente Glacial', efeitos: 'Congelamento', categoriaCorporal: 'escamoso', elementoAtaque: 'gelo', efeitosAplicados: ['congelamento'] },
  { id: 'odrakar-golem-runico', andar: 170, nome: 'Odrakar, o Golem Rúnico', efeitos: 'Relâmpago', categoriaCorporal: 'rochoso', elementoAtaque: 'relampago' },
  { id: 'xyrmora-quimera-profana', andar: 180, nome: 'Xyrmora, a Quimera Profana', efeitos: 'Veneno e Queimadura', categoriaCorporal: 'aberrante', efeitosAplicados: ['veneno', 'queimadura'] },
  { id: 'kaelgor-berserker-imortal', andar: 190, nome: 'Kaelgor, o Berserker Imortal', efeitos: 'Sangramento', categoriaCorporal: 'blindagemMedia', efeitosAplicados: ['sangramento'] },
  { id: 'nerezza-dama-do-veu-negro', andar: 200, nome: 'Nerezza, a Dama do Véu Negro', efeitos: 'Sono e Sombrio', categoriaCorporal: 'sombrio', elementoAtaque: 'sombrio', efeitosAplicados: ['sono'] },
  { id: 'kragmor-behemoth-de-ferro', andar: 210, nome: 'Kragmor, o Behemoth de Ferro', efeitos: 'Contusão', categoriaCorporal: 'blindadoPesado' },
  { id: 'azravel-anjo-caido', andar: 220, nome: 'Azravel, o Anjo Caído', efeitos: 'Sagrado e Maldição', categoriaCorporal: 'eterio', elementoAtaque: 'sagrado', efeitosAplicados: ['maldicao'] },
  { id: 'vorthuun-devorador-de-almas', andar: 230, nome: 'Vorthuun, o Devorador de Almas', efeitos: 'Loucura', categoriaCorporal: 'aberrante', efeitosAplicados: ['loucura'] },
  { id: 'sanghra-matriarca-escarlate', andar: 240, nome: 'Sanghra, a Matriarca Escarlate', efeitos: 'Sangramento e Veneno', categoriaCorporal: 'quitinoso', efeitosAplicados: ['sangramento', 'veneno'] },
  { id: 'dreadmourn-lich-eterno', andar: 250, nome: 'Dreadmourn, o Lich Eterno', efeitos: 'Maldição (Praga da Morte)', categoriaCorporal: 'sombrio', elementoAtaque: 'sombrio', efeitosAplicados: ['maldicao'] },
  { id: 'ignivar-dragao-vulcanico', andar: 260, nome: 'Ignivar, o Dragão Vulcânico', efeitos: 'Fogo e Queimadura', categoriaCorporal: 'escamoso', elementoAtaque: 'fogo', efeitosAplicados: ['queimadura'] },
  { id: 'skarveth-dragao-da-tempestade', andar: 270, nome: 'Skarveth, o Dragão da Tempestade', efeitos: 'Relâmpago e Paralisia', categoriaCorporal: 'escamoso', elementoAtaque: 'relampago', efeitosAplicados: ['paralisia'] },
  { id: 'malgrath-tita-do-abismo', andar: 280, nome: 'Malgrath, o Titã do Abismo', efeitos: 'Sombrio e Maldição', categoriaCorporal: 'rochoso', elementoAtaque: 'sombrio', efeitosAplicados: ['maldicao'] },
  { id: 'xaltherion-devorador-de-mundos', andar: 290, nome: 'Xaltherion, o Devorador de Mundos', efeitos: 'Loucura e Maldição (Praga da Morte)', categoriaCorporal: 'aberrante', efeitosAplicados: ['loucura', 'maldicao'] },
  { id: 'nihilzareth-deus-do-eclipse-sangrento', andar: 300, nome: 'Nihilzareth, o Deus do Eclipse Sangrento', efeitos: 'Sombrio, Loucura e Maldição (Praga da Morte)', categoriaCorporal: 'aberrante', elementoAtaque: 'sombrio', efeitosAplicados: ['loucura', 'maldicao'] },
];

export const CHEFES_TORRE_POR_ANDAR: Readonly<Record<number, ChefeTorre>> = Object.fromEntries(CHEFES_TORRE.map((c) => [c.andar, c]));
