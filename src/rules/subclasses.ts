import { Attributes } from './attributes';

export interface Subclasse {
  id: string;
  classeId: string;
  nome: string;
  bonusAtributos: Attributes;
}

export const SUBCLASSES: readonly Subclasse[] = [
  {
    id: 'berserker',
    classeId: 'barbaro',
    nome: 'Berserker',
    bonusAtributos: {
      vigor: 12,
      mente: 0,
      forca: 20,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 8,
    },
  },
  {
    id: 'colosso',
    classeId: 'barbaro',
    nome: 'Colosso',
    bonusAtributos: {
      vigor: 18,
      mente: 0,
      forca: 6,
      vitalidade: 16,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    },
  },
  {
    id: 'vanguarda',
    classeId: 'cavaleiro',
    nome: 'Vanguarda',
    bonusAtributos: {
      vigor: 10,
      mente: 0,
      forca: 16,
      vitalidade: 14,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    },
  },
  {
    id: 'bastiao',
    classeId: 'cavaleiro',
    nome: 'Bastião',
    bonusAtributos: {
      vigor: 14,
      mente: 0,
      forca: 0,
      vitalidade: 22,
      arcano: 4,
      inteligencia: 0,
      agilidade: 0,
    },
  },
  {
    id: 'arquimago',
    classeId: 'feiticeiro',
    nome: 'Arquimago',
    bonusAtributos: {
      vigor: 0,
      mente: 12,
      forca: 0,
      vitalidade: 0,
      arcano: 4,
      inteligencia: 24,
      agilidade: 0,
    },
  },
  {
    id: 'sabio_arcano',
    classeId: 'feiticeiro',
    nome: 'Sábio Arcano',
    bonusAtributos: {
      vigor: 0,
      mente: 18,
      forca: 0,
      vitalidade: 0,
      arcano: 12,
      inteligencia: 10,
      agilidade: 0,
    },
  },
  {
    id: 'assassino',
    classeId: 'bandido',
    nome: 'Assassino',
    bonusAtributos: {
      vigor: 4,
      mente: 0,
      forca: 22,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 14,
    },
  },
  {
    id: 'duelista',
    classeId: 'bandido',
    nome: 'Duelista',
    bonusAtributos: {
      vigor: 4,
      mente: 0,
      forca: 14,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 22,
    },
  },
  {
    id: 'sacerdote',
    classeId: 'profeta',
    nome: 'Sacerdote',
    bonusAtributos: {
      vigor: 12,
      mente: 18,
      forca: 0,
      vitalidade: 0,
      arcano: 10,
      inteligencia: 0,
      agilidade: 0,
    },
  },
  {
    id: 'inquisidor',
    classeId: 'profeta',
    nome: 'Inquisidor',
    bonusAtributos: {
      vigor: 6,
      mente: 12,
      forca: 0,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 22,
      agilidade: 0,
    },
  },
  {
    id: 'kensei',
    classeId: 'samurai',
    nome: 'Kensei',
    bonusAtributos: {
      vigor: 6,
      mente: 0,
      forca: 24,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 10,
    },
  },
  {
    id: 'ronin',
    classeId: 'samurai',
    nome: 'Ronin',
    bonusAtributos: {
      vigor: 10,
      mente: 0,
      forca: 12,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 18,
    },
  },
];
