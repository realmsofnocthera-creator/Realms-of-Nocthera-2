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
import imgMatCoracao from './images/forja/materiais/coracao.webp';
import imgMatBolsa from './images/forja/materiais/bolsa.webp';
import imgMatEscama from './images/forja/materiais/escama.webp';
import imgMatNucleo from './images/forja/materiais/nucleo.webp';
import imgMatOlho from './images/forja/materiais/olho.webp';
import imgMatCranio from './images/forja/materiais/cranio.webp';
import imgMatPelo from './images/forja/materiais/pelo.webp';
import imgMatAsa from './images/forja/materiais/asa.webp';
import imgMatCauda from './images/forja/materiais/cauda.webp';
import imgMatGota from './images/forja/materiais/gota.webp';
import imgMatOvo from './images/forja/materiais/ovo.webp';
import imgMatChama from './images/forja/materiais/chama.webp';
import imgMatPo from './images/forja/materiais/po.webp';
import imgMatEspectral from './images/forja/materiais/espectral.webp';
import imgStSangramento from './images/forja/status/sangramento.webp';
import imgStVeneno from './images/forja/status/veneno.webp';
import imgStPodridao from './images/forja/status/podridao.webp';
import imgStCongelamento from './images/forja/status/congelamento.webp';
import imgStSono from './images/forja/status/sono.webp';
import imgStLoucura from './images/forja/status/loucura.webp';
import imgStMaldicao from './images/forja/status/maldicao.webp';
import imgStParalisia from './images/forja/status/paralisia.webp';
import imgStQueimadura from './images/forja/status/queimadura.webp';
import imgIcDanoFisico from './images/forja/icones/danoFisico.webp';
import imgIcDanoMagico from './images/forja/icones/danoMagico.webp';
import imgIcBilhete from './images/forja/icones/bilhete.webp';
import imgIcOrbe from './images/forja/icones/orbe.webp';
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
export type GlifoDeMaterial = 'osso' | 'garra' | 'presa' | 'cristal' | 'raiz' | 'fibra' | 'flor' | 'geodo' | 'chifre' | 'coracao' | 'bolsa' | 'escama' | 'nucleo' | 'olho' | 'cranio' | 'pelo' | 'asa' | 'cauda' | 'gota' | 'ovo' | 'chama' | 'po' | 'espectral';

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
  coracao: srcDaImagem(imgMatCoracao),
  bolsa: srcDaImagem(imgMatBolsa),
  escama: srcDaImagem(imgMatEscama),
  nucleo: srcDaImagem(imgMatNucleo),
  olho: srcDaImagem(imgMatOlho),
  cranio: srcDaImagem(imgMatCranio),
  pelo: srcDaImagem(imgMatPelo),
  asa: srcDaImagem(imgMatAsa),
  cauda: srcDaImagem(imgMatCauda),
  gota: srcDaImagem(imgMatGota),
  ovo: srcDaImagem(imgMatOvo),
  chama: srcDaImagem(imgMatChama),
  po: srcDaImagem(imgMatPo),
  espectral: srcDaImagem(imgMatEspectral),
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

/** O glifo de um material de monstro, pela primeira palavra do nome (proposta, a confirmar com o Yuri). */
const GLIFO_POR_PALAVRA: Readonly<Record<string, GlifoDeMaterial>> = {
  coracao: 'coracao', garra: 'garra',
  glandula: 'bolsa', bolsa: 'bolsa', saco: 'bolsa', orgao: 'bolsa',
  escama: 'escama', placa: 'escama', carapaca: 'escama', casco: 'escama', casca: 'escama', quitina: 'escama',
  nucleo: 'nucleo',
  gema: 'cristal', cristal: 'cristal', perola: 'cristal', ambar: 'cristal', pedra: 'cristal', fragmento: 'cristal',
  presa: 'presa', dente: 'presa', mandibula: 'presa', bico: 'presa', ferrao: 'presa', espinho: 'presa',
  chifre: 'chifre', coroa: 'chifre',
  olho: 'olho',
  cranio: 'cranio', osso: 'osso', medula: 'osso',
  pelo: 'pelo', pele: 'pelo', couro: 'pelo', juba: 'pelo', orelha: 'pelo', pelagem: 'pelo',
  asa: 'asa', pena: 'asa', 'pena-de-vento': 'asa', membrana: 'asa', barbatana: 'asa', tentaculo: 'asa', ventosa: 'asa',
  cauda: 'cauda',
  gordura: 'gota', sangue: 'gota', saliva: 'gota', piche: 'gota',
  raiz: 'raiz', flor: 'flor', esporo: 'flor', fibra: 'fibra', manto: 'fibra', fio: 'fibra',
  ovo: 'ovo', casulo: 'ovo', abdomen: 'ovo',
  magma: 'chama', chama: 'chama', brasa: 'chama', cinza: 'chama', basalto: 'geodo',
  po: 'po',
  essencia: 'espectral', eco: 'espectral', alma: 'espectral', veu: 'espectral', nevoa: 'espectral', folego: 'espectral', sopro: 'espectral', furia: 'espectral',
};

const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function glifoDoMaterial(id: string, nome?: string): string | null {
  const g = GLIFO_DO_MUNDO[id] ?? (nome ? GLIFO_POR_PALAVRA[semAcento(nome.replace(/^Diverso\s+/, '')).split(' ')[0]] : undefined);
  return g ? GLIFO_DE_MATERIAL[g] : null;
}

/** Os ícones de status (cheios, com contorno), pelo nome em tela: Sangramento, Veneno, Podridão Escarlate… */
const ICONE_DE_STATUS: Readonly<Record<string, string>> = {
  sangramento: srcDaImagem(imgStSangramento),
  veneno: srcDaImagem(imgStVeneno),
  podridao: srcDaImagem(imgStPodridao),
  congelamento: srcDaImagem(imgStCongelamento),
  sono: srcDaImagem(imgStSono),
  loucura: srcDaImagem(imgStLoucura),
  maldicao: srcDaImagem(imgStMaldicao),
  paralisia: srcDaImagem(imgStParalisia),
  queimadura: srcDaImagem(imgStQueimadura),
};

export function iconeDeStatus(nome: string): string | null {
  const t = semAcento(nome);
  const chave = Object.keys(ICONE_DE_STATUS).find((k) => t.startsWith(k));
  return chave ? ICONE_DE_STATUS[chave] : null;
}

export const ICONE_DANO_FISICO = srcDaImagem(imgIcDanoFisico);
export const ICONE_DANO_MAGICO = srcDaImagem(imgIcDanoMagico);
export const ICONE_BILHETE = srcDaImagem(imgIcBilhete);
/** O orbe de armadura é um glifo branco: o jogo pinta com a cor da raridade do orbe. */
export const GLIFO_DO_ORBE = srcDaImagem(imgIcOrbe);
