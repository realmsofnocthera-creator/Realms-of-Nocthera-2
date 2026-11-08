import { srcDaImagem } from '@/assets/srcDaImagem';
import imgMatOsso from './images/forja/materiais/osso.webp';
import imgMatGarra from './images/forja/materiais/garra.webp';
import imgMatPresa from './images/forja/materiais/presa.webp';
import imgMatCristal from './images/forja/materiais/cristal.webp';
import imgMatRaiz from './images/forja/materiais/raiz.webp';
import imgMatFibra from './images/forja/materiais/fibra.webp';
import imgMatFlor from './images/forja/materiais/flor.webp';
import imgMatGeodo from './images/forja/materiais/geodo.webp';
import imgMatChifre from './images/forja/materiais/chifre.webp';
import imgArmaEspadaGrande from './images/forja/armas/espadaGrande.webp';
import imgArmaKatana from './images/forja/armas/katana.webp';
import imgArmaLanca from './images/forja/armas/lanca.webp';
import imgArmaEspadaEscudo from './images/forja/armas/espadaEscudo.webp';
import imgArmaGrimorio from './images/forja/armas/grimorio.webp';
import imgArmaCajado from './images/forja/armas/cajado.webp';
import type { CategoriaArma } from '@/rules/armas';

/** A arte de cada categoria de arma (espada grande, katana, lança, espada e escudo, grimório e cajado). */
export const ICONE_DA_CATEGORIA: Readonly<Record<CategoriaArma, string>> = {
  espadaGrande: srcDaImagem(imgArmaEspadaGrande),
  katana: srcDaImagem(imgArmaKatana),
  lanca: srcDaImagem(imgArmaLanca),
  espadaEscudo: srcDaImagem(imgArmaEspadaEscudo),
  grimorio: srcDaImagem(imgArmaGrimorio),
  cajado: srcDaImagem(imgArmaCajado),
};

/**
 * Os 9 glifos brancos dos materiais: o jogo pinta cada um com a cor da raridade (máscara + cor de fundo).
 * Os mesmos glifos servirão aos materiais dos monstros (osso, garra, presa, cristal, raiz, fibra, flor, geodo, chifre).
 */
export type GlifoDeMaterial = 'osso' | 'garra' | 'presa' | 'cristal' | 'raiz' | 'fibra' | 'flor' | 'geodo' | 'chifre';

export const GLIFO_DE_MATERIAL: Readonly<Record<GlifoDeMaterial, string>> = {
  osso: srcDaImagem(imgMatOsso),
  garra: srcDaImagem(imgMatGarra),
  presa: srcDaImagem(imgMatPresa),
  cristal: srcDaImagem(imgMatCristal),
  raiz: srcDaImagem(imgMatRaiz),
  fibra: srcDaImagem(imgMatFibra),
  flor: srcDaImagem(imgMatFlor),
  geodo: srcDaImagem(imgMatGeodo),
  chifre: srcDaImagem(imgMatChifre),
};

/** Qual glifo cada material de mundo usa (proposta, a confirmar com o Yuri). */
const GLIFO_DO_MUNDO: Readonly<Record<string, GlifoDeMaterial>> = {
  'mundo-osso-bruto': 'osso', 'mundo-osso-reforcado': 'osso', 'mundo-osso-ancestral': 'osso', 'mundo-osso-de-colosso': 'osso', 'mundo-osso-de-dragao-anciao': 'osso',
  'mundo-presa-gasta': 'presa', 'mundo-presa-dentada': 'presa', 'mundo-presa-draconica': 'presa',
  'mundo-chifre-de-dragao': 'chifre', 'mundo-chifre-do-soberano': 'chifre',
  'mundo-minerio-de-ferro-bruto': 'geodo', 'mundo-minerio-de-cobre': 'geodo', 'mundo-minerio-de-prata': 'geodo', 'mundo-minerio-de-sangue': 'geodo',
  'mundo-minerio-de-mithril': 'geodo', 'mundo-minerio-estelar': 'geodo', 'mundo-geodo-primordial': 'geodo',
  'mundo-cristal-bruto': 'cristal', 'mundo-cristal-arcano': 'cristal', 'mundo-cristal-do-vazio': 'cristal',
  'mundo-fibra-silvestre': 'fibra', 'mundo-couro-grosseiro': 'fibra',
  'mundo-raiz-medicinal': 'raiz', 'mundo-raiz-ancestral': 'raiz', 'mundo-raiz-da-arvore-mundial': 'raiz',
  'mundo-flor-celestial': 'flor',
  'mundo-garra-rachada': 'garra', 'mundo-escama-resistente': 'garra',
  'mundo-glandula-venenosa': 'cristal', 'mundo-coracao-de-serpe': 'cristal', 'mundo-nucleo-elemental': 'cristal', 'mundo-coracao-de-dragao': 'cristal',
  'mundo-gema-de-monstro': 'cristal', 'mundo-gema-de-dragao': 'cristal', 'mundo-essencia-primordial': 'cristal',
};

export function glifoDoMaterial(id: string): string | null {
  const g = GLIFO_DO_MUNDO[id];
  return g ? GLIFO_DE_MATERIAL[g] : null;
}
