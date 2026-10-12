import type { RaridadeMaterial } from './raridades';

/**
 * Materiais de mundo das armas (aprovados pelo Yuri em 12/10/2026): 35, 7 por raridade.
 * Ossos, minérios e plantas só passam a ser coletados quando o Modo História existir.
 * Os materiais dos monstros e das subespécies ficam em `materiais.ts`.
 */
export type TipoMaterialMundo = 'osso' | 'minerio' | 'planta' | 'diverso';

export interface MaterialMundo {
  id: string;
  nome: string;
  raridade: RaridadeMaterial;
  tipo: TipoMaterialMundo;
}

/** Ossos, minérios e plantas vêm do mundo; os diversos caem de qualquer monstro da raridade (1% por vitória, um dos dois). */
export const MATERIAIS_MUNDO: readonly MaterialMundo[] = [
  { id: 'mundo-osso-bruto', nome: 'Osso Bruto', raridade: 'comum', tipo: 'osso' },
  { id: 'mundo-presa-gasta', nome: 'Presa Gasta', raridade: 'comum', tipo: 'osso' },
  { id: 'mundo-minerio-de-ferro-bruto', nome: 'Minério de Ferro Bruto', raridade: 'comum', tipo: 'minerio' },
  { id: 'mundo-minerio-de-cobre', nome: 'Minério de Cobre', raridade: 'comum', tipo: 'minerio' },
  { id: 'mundo-fibra-silvestre', nome: 'Fibra Silvestre', raridade: 'comum', tipo: 'planta' },
  { id: 'mundo-couro-grosseiro', nome: 'Couro Grosseiro', raridade: 'comum', tipo: 'diverso' },
  { id: 'mundo-garra-rachada', nome: 'Garra Rachada', raridade: 'comum', tipo: 'diverso' },
  { id: 'mundo-osso-reforcado', nome: 'Osso Reforçado', raridade: 'raro', tipo: 'osso' },
  { id: 'mundo-presa-dentada', nome: 'Presa Dentada', raridade: 'raro', tipo: 'osso' },
  { id: 'mundo-minerio-de-prata', nome: 'Minério de Prata', raridade: 'raro', tipo: 'minerio' },
  { id: 'mundo-cristal-bruto', nome: 'Cristal Bruto', raridade: 'raro', tipo: 'minerio' },
  { id: 'mundo-raiz-medicinal', nome: 'Raiz Medicinal', raridade: 'raro', tipo: 'planta' },
  { id: 'mundo-glandula-venenosa', nome: 'Glândula Venenosa', raridade: 'raro', tipo: 'diverso' },
  { id: 'mundo-escama-resistente', nome: 'Escama Resistente', raridade: 'raro', tipo: 'diverso' },
  { id: 'mundo-osso-ancestral', nome: 'Osso Ancestral', raridade: 'muitoRaro', tipo: 'osso' },
  { id: 'mundo-presa-draconica', nome: 'Presa Dracônica', raridade: 'muitoRaro', tipo: 'osso' },
  { id: 'mundo-minerio-de-sangue', nome: 'Minério de Sangue', raridade: 'muitoRaro', tipo: 'minerio' },
  { id: 'mundo-cristal-arcano', nome: 'Cristal Arcano', raridade: 'muitoRaro', tipo: 'minerio' },
  { id: 'mundo-raiz-ancestral', nome: 'Raiz Ancestral', raridade: 'muitoRaro', tipo: 'planta' },
  { id: 'mundo-coracao-de-serpe', nome: 'Coração de Serpe', raridade: 'muitoRaro', tipo: 'diverso' },
  { id: 'mundo-nucleo-elemental', nome: 'Núcleo Elemental', raridade: 'muitoRaro', tipo: 'diverso' },
  { id: 'mundo-osso-de-colosso', nome: 'Osso de Colosso', raridade: 'epico', tipo: 'osso' },
  { id: 'mundo-chifre-de-dragao', nome: 'Chifre de Dragão', raridade: 'epico', tipo: 'osso' },
  { id: 'mundo-minerio-de-mithril', nome: 'Minério de Mithril', raridade: 'epico', tipo: 'minerio' },
  { id: 'mundo-geodo-primordial', nome: 'Geodo Primordial', raridade: 'epico', tipo: 'minerio' },
  { id: 'mundo-flor-celestial', nome: 'Flor Celestial', raridade: 'epico', tipo: 'planta' },
  { id: 'mundo-coracao-de-dragao', nome: 'Coração de Dragão', raridade: 'epico', tipo: 'diverso' },
  { id: 'mundo-gema-de-monstro', nome: 'Gema de Monstro', raridade: 'epico', tipo: 'diverso' },
  { id: 'mundo-osso-de-dragao-anciao', nome: 'Osso de Dragão Ancião', raridade: 'lendario', tipo: 'osso' },
  { id: 'mundo-chifre-do-soberano', nome: 'Chifre do Soberano', raridade: 'lendario', tipo: 'osso' },
  { id: 'mundo-minerio-estelar', nome: 'Minério Estelar', raridade: 'lendario', tipo: 'minerio' },
  { id: 'mundo-cristal-do-vazio', nome: 'Cristal do Vazio', raridade: 'lendario', tipo: 'minerio' },
  { id: 'mundo-raiz-da-arvore-mundial', nome: 'Raiz da Árvore Mundial', raridade: 'lendario', tipo: 'planta' },
  { id: 'mundo-gema-de-dragao', nome: 'Gema de Dragão', raridade: 'lendario', tipo: 'diverso' },
  { id: 'mundo-essencia-primordial', nome: 'Essência Primordial', raridade: 'lendario', tipo: 'diverso' },
];

export const MATERIAIS_MUNDO_MAP: Readonly<Record<string, MaterialMundo>> = Object.fromEntries(
  MATERIAIS_MUNDO.map((m) => [m.id, m])
);
