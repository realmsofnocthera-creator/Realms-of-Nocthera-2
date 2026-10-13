import { MonsterDefinition, PassivasMonstro } from './monsters';
import { montarMonstroCacada, MonstroCacadaDados } from './cacada';

/**
 * Chefes Especiais da Batalha Sangrenta (lore e kits do Yuri, 13/10/2026). Vida e atributos saem da estrela da
 * dificuldade com a conta do monstro-chave da Caçada (+20% de vida, +8% de Força, nível +1). Ficam fora da Caçada.
 * A recarga/frequência das habilidades (a cada 3 ataques) e as definições marcadas "PROPOSTA" aguardam o Yuri.
 */
interface ChefeEspecialDados {
  dados: MonstroCacadaDados;
  passivas: PassivasMonstro;
  /** Texto da vitrine: o que ele faz. */
  especialidade: string;
}

const CHEFES: readonly ChefeEspecialDados[] = [
  {
    dados: {
      id: 'darius-carrasco-escarlate',
      nome: 'Darius, o Carrasco Escarlate',
      estrela: 5,
      chave: true,
      tipo: 'Humanoide',
      descricao: 'Dano físico e Sangramento.',
      categoriaCorporal: 'blindagemMedia', // PROPOSTA: Humanoide com armadura leve
      efeitosAplicados: ['sangramento'],
      drops: [],
    },
    passivas: { bonusDanoAbaixoMetadePercentual: 10 },
    especialidade: 'Ataques diretos e resistência moderada.',
  },
  {
    dados: {
      id: 'nymeria-noiva-do-lamento',
      nome: 'Nyméria, a Noiva do Lamento',
      estrela: 6,
      chave: true,
      tipo: 'Fantasma',
      descricao: 'Dano sombrio e efeitos debilitantes.',
      categoriaCorporal: 'sombrio', // PROPOSTA: Fantasma sombrio (resiste a corte/perfuração, fraco a Sagrado)
      elementoAtaque: 'sombrio',
      habilidades: [
        {
          aCada: 3,
          acoes: [
            {
              nome: 'Lamento Eterno',
              efeito: {
                elemento: 'sombrio',
                efeitosNoAlvo: [{ tipo: 'enfraquecimento', percentual: 20, rodadas: 2 }], // PROPOSTA: Fraqueza = Enfraquecimento
              },
            },
          ],
        },
      ],
      drops: [],
    },
    passivas: { reducaoDanoFisicoPercentual: 15 },
    especialidade: 'Desgastar adversários.',
  },
  {
    dados: {
      id: 'grizzham-devorador-de-ossos',
      nome: 'Grizzham, o Devorador de Ossos',
      estrela: 7,
      chave: true,
      tipo: 'Besta',
      descricao: 'Dano físico e Sangramento.',
      categoriaCorporal: 'feral',
      efeitosAplicados: ['sangramento'],
      habilidades: [
        {
          aCada: 3,
          acoes: [
            {
              nome: 'Dilacerar',
              efeito: { percentualDano: 130, bonusContraCondicao: { condicao: 'sangramento', percentual: 40 } }, // PROPOSTA: +40% contra Sangramento
            },
          ],
        },
      ],
      drops: [],
    },
    // PROPOSTA: 1 acúmulo de Fúria por rodada que passa
    passivas: { furia: { percentualPorAcumulo: 5, maximoAcumulos: 4 } },
    especialidade: 'Pressão ofensiva crescente.',
  },
  {
    dados: {
      id: 'othrak-relicto-primordial',
      nome: 'Othrak, o Relicto Primordial',
      estrela: 8,
      chave: true,
      tipo: 'Relicto',
      descricao: 'Dano físico e elemental.',
      categoriaCorporal: 'rochoso',
      elementoAtaque: 'terra', // PROPOSTA: elemento não definido pelo Yuri
      perfil: 'blindado',
      habilidades: [
        {
          aCada: 3, // recarga de 3 turnos
          acoes: [{ nome: 'Ruptura Primordial', efeito: { percentualDano: 200, elemento: 'terra' } }], // PROPOSTA: 200% do dano
        },
      ],
      drops: [],
    },
    // PROPOSTA: o Núcleo Ancestral está ativo enquanto o Sobreescudo do chefe estiver de pé
    passivas: { reducaoDanoComNucleoPercentual: 20 },
    especialidade: 'Defesa elevada e combate prolongado.',
  },
  {
    dados: {
      id: 'varkhazar-dragao-da-carnificina',
      nome: 'Varkhazar, o Dragão da Carnificina',
      estrela: 9,
      chave: true,
      tipo: 'Dragão I',
      descricao: 'Dano de fogo e físico.',
      categoriaCorporal: 'escamoso',
      elementoAtaque: 'fogo',
      habilidades: [
        {
          aCada: 3,
          acoes: [
            {
              nome: 'Sopro Carmesim',
              efeito: { percentualDano: 130, elemento: 'fogo', statusComChanceNoAlvo: [{ status: 'queimadura' }] },
            },
          ],
        },
      ],
      drops: [],
    },
    passivas: { bonusDanoACada: { rodadas: 3, percentual: 5, limitePercentual: 25 } },
    especialidade: 'Dano crescente.',
  },
  {
    dados: {
      id: 'noctharion-dragao-do-eclipse-eterno',
      nome: 'Noctharion, o Dragão do Eclipse Eterno',
      estrela: 9,
      chave: true,
      tipo: 'Dragão II',
      descricao: 'Dano sombrio e efeitos negativos.',
      categoriaCorporal: 'escamoso',
      elementoAtaque: 'sombrio',
      perfil: 'blindado',
      habilidades: [
        {
          aCada: 3,
          acoes: [
            {
              nome: 'Eclipse Absoluto',
              efeito: { percentualDano: 130, elemento: 'sombrio', statusComChanceNoAlvo: [{ status: 'maldicao' }] },
            },
          ],
        },
      ],
      drops: [],
    },
    passivas: { reducaoDanoAbaixoMetadePercentual: 10 },
    especialidade: 'Resistência extrema e pressão constante.',
  },
];

export const CHEFES_ESPECIAIS_DADOS: readonly MonstroCacadaDados[] = CHEFES.map((c) => c.dados);

/** Os chefes Especiais prontos para o combate. */
export const CHEFES_ESPECIAIS_MONSTROS: readonly MonsterDefinition[] = CHEFES.map((c) => ({
  ...montarMonstroCacada(c.dados),
  passivas: c.passivas,
}));

export const CHEFES_ESPECIAIS_MAP: Readonly<Record<string, MonsterDefinition>> = Object.fromEntries(
  CHEFES_ESPECIAIS_MONSTROS.map((m) => [m.id, m])
);

export const ESPECIALIDADE_CHEFE_ESPECIAL: Readonly<Record<string, string>> = Object.fromEntries(
  CHEFES.map((c) => [c.dados.id, c.especialidade])
);
