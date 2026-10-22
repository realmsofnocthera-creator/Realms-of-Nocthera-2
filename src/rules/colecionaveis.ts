import type { AttributeName } from './attributes';

/**
 * Buscar e Colecionáveis (decididos pelo Yuri em 22/10/2026). O card Buscar do Menu é a roleta: cada busca gasta 10
 * selos de uma qualidade e dá um colecionável inteiro ou fragmentos dele. Os colecionáveis ficam na aba
 * Colecionáveis: ativar (com os fragmentos), reforçar (com Fragmentos de Memória) e subir estrelas (com os fragmentos
 * e Pedras da Recordação). Cada colecionável ativado dá um atributo fixo ao personagem da conta.
 * Os nomes e as categorias são do Yuri; os números marcados "proposta" estão a confirmar.
 */

export const CATEGORIAS_DE_COLECIONAVEL = ['reliquias', 'sonatas', 'memorias', 'ecos'] as const;
export type CategoriaDeColecionavel = (typeof CATEGORIAS_DE_COLECIONAVEL)[number];

export const NOME_DA_CATEGORIA_DE_COLECIONAVEL: Readonly<Record<CategoriaDeColecionavel, string>> = {
  reliquias: 'Relíquias Icônicas',
  sonatas: 'Sonatas',
  memorias: 'Memórias',
  ecos: 'Ecos e Entidades',
};

export const DESCRICAO_DA_CATEGORIA_DE_COLECIONAVEL: Readonly<Record<CategoriaDeColecionavel, string>> = {
  reliquias: 'Artefatos, armas históricas, objetos amaldiçoados e vestígios de civilizações.',
  sonatas: 'Melodias arcanas, composições esquecidas e canções de eras perdidas.',
  memorias: 'Fragmentos da história, lembranças de personagens e acontecimentos esquecidos.',
  ecos: 'Espíritos, manifestações sobrenaturais, criaturas arcanas e fragmentos de forças primordiais.',
};

export const RARIDADES_DE_COLECIONAVEL = ['comum', 'muitoRaro', 'lendario', 'mitico'] as const;
export type RaridadeDeColecionavel = (typeof RARIDADES_DE_COLECIONAVEL)[number];

export const NOME_DA_RARIDADE_DE_COLECIONAVEL: Readonly<Record<RaridadeDeColecionavel, string>> = {
  comum: 'Comum',
  muitoRaro: 'Muito raro',
  lendario: 'Lendário',
  mitico: 'Mítico',
};

/** Prefixo do código (RI-C01, SO-MR03…), como no catálogo do Yuri. */
const PREFIXO: Readonly<Record<CategoriaDeColecionavel, string>> = { reliquias: 'RI', sonatas: 'SO', memorias: 'ME', ecos: 'EE' };
const SUFIXO: Readonly<Record<RaridadeDeColecionavel, string>> = { comum: 'C', muitoRaro: 'MR', lendario: 'L', mitico: 'M' };

/** Os 120 nomes oficiais (Yuri, 22/10/2026), na ordem do catálogo. */
const NOMES: Readonly<Record<CategoriaDeColecionavel, Readonly<Record<RaridadeDeColecionavel, readonly string[]>>>> = {
  reliquias: {
    comum: [
      'Medalhão do Viajante',
      'Adaga Enferrujada',
      'Ampulheta Trincada',
      'Anel de Bronze',
      'Chave Esquecida',
      'Bússola Quebrada',
      'Moeda do Reino Perdido',
      'Frasco de Cinzas',
      'Diário Desgastado',
      'Máscara de Madeira',
      'Broche do Soldado',
      'Dente de Marfim',
      'Sino de Prata',
      'Pingente de Ônix',
      'Relicário Vazio',
    ],
    muitoRaro: [
      'Coroa dos Exilados',
      'Espelho das Verdades Ocultas',
      'Cálice do Sangue Antigo',
      'Rosário das Almas Perdidas',
      'Chave do Santuário Afundado',
      'Máscara do Rei Sem Face',
      'Ampulheta da Última Vigília',
      'Olho de Obsidiana',
      'Medalhão da Lua Morta',
    ],
    lendario: ['Coroa do Primeiro Soberano', 'Lâmina do Eclipse Eterno', 'Relicário das Sete Pragas', 'Coração Petrificado de um Deus'],
    mitico: ['Fragmento da Chama Primordial', 'O Selo de Lautrec'],
  },
  sonatas: {
    comum: [
      'Canção do Peregrino',
      'Valsa da Chuva',
      'Melodia do Crepúsculo',
      'Serenata das Lanternas',
      'Balada do Velho Ferreiro',
      'Dança dos Campos',
      'Cantiga da Colheita',
      'Prelúdio da Aurora',
      'Marcha dos Pequenos Heróis',
      'Réquiem de Uma Flor',
      'Canção das Águas Calmas',
      'Noturno das Corujas',
      'Lamento do Marinheiro',
      'Valsa das Folhas Secas',
      'Hino da Estrada Real',
    ],
    muitoRaro: [
      'Sonata das Mil Estrelas',
      'Elegia dos Reis Caídos',
      'Sinfonia da Floresta Velada',
      'Réquiem das Almas Errantes',
      'Balada da Rosa Negra',
      'Dança das Chamas Azuis',
      'Noturno do Mar Sem Lua',
      'Prelúdio do Último Inverno',
      'Canção dos Sinos Submersos',
    ],
    lendario: ['Sonata do Eclipse Carmesim', 'Sinfonia dos Deuses Silenciados', 'Réquiem do Reino Imortal', 'Melodia da Última Constelação', 'Ópera da Lua Sangrenta'],
    mitico: ['A Canção Antes da Criação'],
  },
  memorias: {
    comum: [
      'A Primeira Viagem',
      'O Último Abraço',
      'Uma Promessa de Infância',
      'O Festival das Lanternas',
      'O Dia da Grande Colheita',
      'Cartas Nunca Enviadas',
      'O Soldado Desconhecido',
      'A Casa à Beira do Rio',
      'O Nome na Árvore',
      'O Juramento dos Irmãos',
      'A Noite da Tempestade',
      'O Retrato Desbotado',
      'A Despedida na Estação',
      'O Último Dia de Verão',
      'As Vozes da Aldeia',
    ],
    muitoRaro: [
      'A Queda da Torre Branca',
      'O Banquete dos Traidores',
      'A Última Vigília do Paladino',
      'O Exílio da Rainha',
      'A Noite em que o Sol Sangrou',
      'O Segredo do Arquimago',
      'A Batalha das Mil Bandeiras',
      'O Sacrifício da Sacerdotisa',
      'A Cidade que Adormeceu',
    ],
    lendario: ['O Primeiro Pecado de Lautrec', 'O Despertar de Lana', 'A Guerra dos Três Sóis', 'O Dia em que Vhaldoria Sangrou'],
    mitico: ['A Primeira Memória do Universo', 'O Instante Antes do Nada'],
  },
  ecos: {
    comum: [
      'Espírito da Vela',
      'Eco do Corvo',
      'Pequeno Guardião de Musgo',
      'Sombra Errante',
      'Fada do Orvalho',
      'Lamento do Poço',
      'Vigia das Ruínas',
      'Mariposa Espectral',
      'Sussurro da Névoa',
      'Espírito da Encruzilhada',
      'Raposa de Cinzas',
      'Eco do Sino Partido',
      'Guardião das Raízes',
      'Fragmento de Luz Pálida',
      'Presença do Bosque',
    ],
    muitoRaro: [
      'Vulto da Catedral Afogada',
      'Devorador de Sussurros',
      'Corça de Prata Lunar',
      'Sentinela do Véu',
      'Viúva das Mil Sombras',
      'Serpente do Sonho Partido',
      'Arauto das Cinzas Frias',
      'Criança do Bosque Oco',
      'Espectro da Coroa Partida',
    ],
    lendario: ['O Vigia do Eclipse', 'Leviatã dos Céus Mortos', 'A Noiva do Abismo', 'O Arauto do Fim', 'Dragão das Raízes Eternas'],
    mitico: ['Nimb, o Caos Primordial'],
  },
};

/**
 * O atributo de cada colecionável. As categorias são do Yuri: Relíquias dão Força ou Vitalidade; Sonatas, Inteligência
 * ou Arcano; Ecos e Entidades, Agilidade ou Vigor; Memórias, Sorte (poucas, para não quebrar o jogo) ou qualquer outro.
 * Qual colecionável dá qual é proposta, a confirmar: alternado nas três primeiras, e nas Memórias 3 de Sorte e o resto
 * em rodízio pelos outros atributos.
 */
const PARES: Readonly<Record<Exclude<CategoriaDeColecionavel, 'memorias'>, readonly [AttributeName, AttributeName]>> = {
  reliquias: ['forca', 'vitalidade'],
  sonatas: ['inteligencia', 'arcano'],
  ecos: ['agilidade', 'vigor'],
};
const MEMORIAS_DE_SORTE = new Set(['ME-C04', 'ME-C09', 'ME-MR09']);
const RODIZIO_DAS_MEMORIAS: readonly AttributeName[] = ['forca', 'vitalidade', 'inteligencia', 'arcano', 'agilidade', 'vigor'];

export interface Colecionavel {
  /** O código do catálogo: RI-C01, SO-MR03, ME-L02, EE-M01… */
  id: string;
  nome: string;
  categoria: CategoriaDeColecionavel;
  raridade: RaridadeDeColecionavel;
  atributo: AttributeName;
}

export const COLECIONAVEIS: readonly Colecionavel[] = (() => {
  const lista: Colecionavel[] = [];
  let rodizio = 0;
  for (const categoria of CATEGORIAS_DE_COLECIONAVEL) {
    for (const raridade of RARIDADES_DE_COLECIONAVEL) {
      NOMES[categoria][raridade].forEach((nome, i) => {
        const id = `${PREFIXO[categoria]}-${SUFIXO[raridade]}${String(i + 1).padStart(2, '0')}`;
        let atributo: AttributeName;
        if (categoria === 'memorias') atributo = MEMORIAS_DE_SORTE.has(id) ? 'sorte' : RODIZIO_DAS_MEMORIAS[rodizio++ % RODIZIO_DAS_MEMORIAS.length];
        else atributo = PARES[categoria][i % 2];
        lista.push({ id, nome, categoria, raridade, atributo });
      });
    }
  }
  return lista;
})();

export const COLECIONAVEL_MAP: Readonly<Record<string, Colecionavel>> = Object.fromEntries(COLECIONAVEIS.map((c) => [c.id, c]));
export const colecionaveisDaRaridade = (r: RaridadeDeColecionavel) => COLECIONAVEIS.filter((c) => c.raridade === r);

// ---------------------------------------------------------------------------------------------------------------
// Selos e a busca
// ---------------------------------------------------------------------------------------------------------------

export const SELOS_DE_BUSCA = ['desgastado', 'encantado', 'eternidade', 'origem'] as const;
export type SeloDeBusca = (typeof SELOS_DE_BUSCA)[number];
export const ehSeloDeBusca = (v: unknown): v is SeloDeBusca => typeof v === 'string' && (SELOS_DE_BUSCA as readonly string[]).includes(v);

export const NOME_DO_SELO: Readonly<Record<SeloDeBusca, string>> = {
  desgastado: 'Selo Desgastado',
  encantado: 'Selo Encantado',
  eternidade: 'Selo da Eternidade',
  origem: 'Selo da Origem',
};

/** A raridade de cada selo (a do inteiro garantido a cada 10 buscas). */
export const RARIDADE_DO_SELO: Readonly<Record<SeloDeBusca, RaridadeDeColecionavel>> = {
  desgastado: 'comum',
  encantado: 'muitoRaro',
  eternidade: 'lendario',
  origem: 'mitico',
};

export const SELOS_POR_BUSCA = 10;
export const BUSCAS_DE_UMA_VEZ = [1, 10] as const;
/** A cada 10 buscas com o mesmo selo, a 10ª dá um colecionável inteiro da raridade do selo (Yuri). */
export const BUSCAS_PARA_GARANTIA = 10;

export interface ResultadoPossivel {
  raridade: RaridadeDeColecionavel;
  inteiro: boolean;
  /** Chance em %. */
  chance: number;
}

/**
 * As chances de cada selo. As raridades de cada selo e as chances dos Lendários e Míticos são do Yuri; as chances
 * das raridades de baixo (Comum e Muito raro no Desgastado, Muito raro e Lendário no Encantado, Lendário na
 * Eternidade) são proposta, a confirmar. Cada linha soma 100%.
 */
export const CHANCES_DO_SELO: Readonly<Record<SeloDeBusca, readonly ResultadoPossivel[]>> = {
  desgastado: [
    { raridade: 'comum', inteiro: false, chance: 55 },
    { raridade: 'comum', inteiro: true, chance: 15 },
    { raridade: 'muitoRaro', inteiro: false, chance: 22 },
    { raridade: 'muitoRaro', inteiro: true, chance: 7 },
    { raridade: 'lendario', inteiro: false, chance: 0.9 },
    { raridade: 'lendario', inteiro: true, chance: 0.1 },
  ],
  encantado: [
    { raridade: 'muitoRaro', inteiro: false, chance: 65 },
    { raridade: 'muitoRaro', inteiro: true, chance: 20 },
    { raridade: 'lendario', inteiro: false, chance: 11 },
    { raridade: 'lendario', inteiro: true, chance: 3 },
    { raridade: 'mitico', inteiro: false, chance: 0.9 },
    { raridade: 'mitico', inteiro: true, chance: 0.1 },
  ],
  eternidade: [
    { raridade: 'lendario', inteiro: false, chance: 74 },
    { raridade: 'lendario', inteiro: true, chance: 20 },
    { raridade: 'mitico', inteiro: false, chance: 5 },
    { raridade: 'mitico', inteiro: true, chance: 1 },
  ],
  origem: [
    { raridade: 'mitico', inteiro: false, chance: 95 },
    { raridade: 'mitico', inteiro: true, chance: 5 },
  ],
};

/** Sorteia o resultado de uma busca pelas chances do selo (sorteio em [0, 1)). */
export function sortearResultado(selo: SeloDeBusca, sorteio: () => number): { raridade: RaridadeDeColecionavel; inteiro: boolean } {
  const linhas = CHANCES_DO_SELO[selo];
  let alvo = sorteio() * linhas.reduce((s, l) => s + l.chance, 0);
  for (const l of linhas) {
    if (alvo < l.chance) return { raridade: l.raridade, inteiro: l.inteiro };
    alvo -= l.chance;
  }
  const ultima = linhas[linhas.length - 1];
  return { raridade: ultima.raridade, inteiro: ultima.inteiro };
}

// ---------------------------------------------------------------------------------------------------------------
// Fragmentos, ativação, reforço e estrelas (proposta, a confirmar)
// ---------------------------------------------------------------------------------------------------------------

/** Fragmentos que um resultado "fragmentos" dá do colecionável sorteado. */
export const FRAGMENTOS_POR_BUSCA: Readonly<Record<RaridadeDeColecionavel, number>> = { comum: 5, muitoRaro: 4, lendario: 3, mitico: 2 };
/** Fragmentos para ativar. Um inteiro de um colecionável já ativo vira essa mesma quantidade de fragmentos dele. */
export const FRAGMENTOS_PARA_ATIVAR: Readonly<Record<RaridadeDeColecionavel, number>> = { comum: 20, muitoRaro: 30, lendario: 50, mitico: 80 };

export const ESTRELAS_MAXIMAS = 5;
/** Limite do nível de reforço: 5 com 0 estrelas e mais 5 a cada estrela, até 30 com 5 estrelas (Yuri). */
export const nivelMaximoDoReforco = (estrelas: number) => 5 * (Math.min(ESTRELAS_MAXIMAS, Math.max(0, estrelas)) + 1);

/** Peso de cada raridade nos custos de reforço e de estrelas. */
const PESO_DA_RARIDADE: Readonly<Record<RaridadeDeColecionavel, number>> = { comum: 1, muitoRaro: 2, lendario: 3, mitico: 5 };

/** Fragmentos de Memória para ir do nível n ao n + 1: 5 × n × peso da raridade. */
export const custoDoReforco = (raridade: RaridadeDeColecionavel, nivelAtual: number) => 5 * nivelAtual * PESO_DA_RARIDADE[raridade];

/** Para a estrela e (1 a 5): fragmentos do próprio colecionável (metade do custo de ativar × e) e Pedras da Recordação (e × peso). */
export function custoDaEstrela(raridade: RaridadeDeColecionavel, estrela: number): { fragmentos: number; pedras: number } {
  return { fragmentos: Math.ceil((FRAGMENTOS_PARA_ATIVAR[raridade] / 2) * estrela), pedras: estrela * PESO_DA_RARIDADE[raridade] };
}

/**
 * O valor do atributo, sempre em pontos inteiros (decisão do Yuri em 22/10/2026: nada de frações). O colecionável dá
 * a base ao ser ativado e ganha +1 ponto ao chegar em certos níveis de reforço e em certas estrelas. Proposta, a confirmar:
 * - Comum: 1; +1 nos níveis 10, 20 e 30; +1 com 5★ (máximo 5).
 * - Muito raro: 2; +1 nos níveis 5, 15 e 25; +1 com 3★ e com 5★ (máximo 7).
 * - Lendário: 3; +1 a cada 5 níveis (5 a 30); +1 com 3★ e com 5★ (máximo 11).
 * - Mítico: 5; +1 a cada 3 níveis (3 a 30); +1 a cada estrela (máximo 20).
 */
export interface ProgressaoDoValor {
  base: number;
  /** Níveis de reforço em que o valor sobe +1. */
  niveis: readonly number[];
  /** Estrelas em que o valor sobe +1. */
  estrelas: readonly number[];
}

export const PROGRESSAO_DO_VALOR: Readonly<Record<RaridadeDeColecionavel, ProgressaoDoValor>> = {
  comum: { base: 1, niveis: [10, 20, 30], estrelas: [5] },
  muitoRaro: { base: 2, niveis: [5, 15, 25], estrelas: [3, 5] },
  lendario: { base: 3, niveis: [5, 10, 15, 20, 25, 30], estrelas: [3, 5] },
  mitico: { base: 5, niveis: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30], estrelas: [1, 2, 3, 4, 5] },
};

/** Os pontos de atributo que o colecionável dá no nível e nas estrelas dele. */
export function valorDoColecionavel(raridade: RaridadeDeColecionavel, nivel: number, estrelas: number): number {
  const p = PROGRESSAO_DO_VALOR[raridade];
  return p.base + p.niveis.filter((n) => nivel >= n).length + p.estrelas.filter((e) => estrelas >= e).length;
}

/** O próximo nível de reforço em que o valor sobe (null se não há mais). */
export const proximoNivelQueSobe = (raridade: RaridadeDeColecionavel, nivel: number) => PROGRESSAO_DO_VALOR[raridade].niveis.find((n) => n > nivel) ?? null;
/** A próxima estrela em que o valor sobe (null se não há mais). */
export const proximaEstrelaQueSobe = (raridade: RaridadeDeColecionavel, estrelas: number) => PROGRESSAO_DO_VALOR[raridade].estrelas.find((e) => e > estrelas) ?? null;

// ---------------------------------------------------------------------------------------------------------------
// O que fica no personagem
// ---------------------------------------------------------------------------------------------------------------

/** O estado de um colecionável do jogador: fragmentos guardados e, se ativado, o nível de reforço (1+) e as estrelas. */
export interface EstadoDoColecionavel {
  fragmentos: number;
  /** 0 ou ausente = ainda não ativado. */
  nivel?: number;
  estrelas?: number;
}

export type ColecionaveisDoJogador = Record<string, EstadoDoColecionavel>;
export type SelosDoJogador = Partial<Record<SeloDeBusca, number>>;

export const estaAtivo = (e: EstadoDoColecionavel | undefined) => !!e && (e.nivel ?? 0) >= 1;

const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : 0);

/** Lê os colecionáveis gravados, descartando o que não existe no catálogo ou está fora dos limites. */
export function colecionaveisDoDocumento(bruto: unknown): ColecionaveisDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: ColecionaveisDoJogador = {};
  for (const [id, valor] of Object.entries(bruto as Record<string, unknown>)) {
    if (!COLECIONAVEL_MAP[id] || !valor || typeof valor !== 'object') continue;
    const o = valor as Record<string, unknown>;
    const estrelas = Math.min(ESTRELAS_MAXIMAS, inteiroPositivo(o.estrelas));
    const nivel = Math.min(nivelMaximoDoReforco(estrelas), inteiroPositivo(o.nivel));
    const fragmentos = inteiroPositivo(o.fragmentos);
    if (!nivel && !fragmentos) continue;
    saida[id] = { fragmentos, ...(nivel ? { nivel, ...(estrelas ? { estrelas } : {}) } : {}) };
  }
  return Object.keys(saida).length ? saida : undefined;
}

/** Lê um contador por selo (os selos do jogador ou o andamento da garantia). */
export function contadorPorSeloDoDocumento(bruto: unknown): SelosDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: SelosDoJogador = {};
  for (const selo of SELOS_DE_BUSCA) {
    const v = inteiroPositivo((bruto as Record<string, unknown>)[selo]);
    if (v) saida[selo] = v;
  }
  return Object.keys(saida).length ? saida : undefined;
}
