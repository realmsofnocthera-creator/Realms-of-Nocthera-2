import { DEFINICOES_DOS_PASSES } from './passes';
import { PACOTE_DO_INICIANTE, PACOTES_DE_DIAMANTES, PACOTES_MENSAIS, NOME_DA_CADEIA, type CadeiaMensal } from './compras';
import type { EmblemaRaridade } from './emblemas';

/**
 * O catálogo da Loja Premium (a loja de compra com dinheiro real). ESTA FASE É SÓ A VITRINE: os preços e as regras abaixo são os do Yuri
 * (23/11/2026) e os itens antigos vêm das regras que já existem; a compra dos itens novos é ligada na próxima etapa (por isso `aVenda` é falso
 * nos itens novos). Os nomes dos cosméticos são PROVISÓRIOS (o Yuri dá os nomes e as artes). Valores em centavos.
 */

export type SecaoDaLoja = 'diamantes' | 'pacotes' | 'passes' | 'cosmeticos' | 'conjuntos';
export const SECOES_DA_LOJA: readonly { id: SecaoDaLoja; nome: string; subtitulo: string }[] = [
  { id: 'diamantes', nome: 'Diamantes', subtitulo: 'A moeda rara do jogo. A primeira compra vale o dobro.' },
  { id: 'pacotes', nome: 'Pacotes', subtitulo: 'Para começar bem e jogar com mais conforto.' },
  { id: 'passes', nome: 'Passes', subtitulo: 'Vantagens todos os dias, por 30 dias.' },
  { id: 'cosmeticos', nome: 'Cosméticos', subtitulo: 'Só aparência: nenhum item daqui muda o poder de combate.' },
  { id: 'conjuntos', nome: 'Conjuntos', subtitulo: '25% de desconto sobre a soma dos itens.' },
];

export type RaridadeDaLoja = Extract<EmblemaRaridade, 'comum' | 'raro' | 'epico' | 'lendario'>;
export const RARIDADES_DA_LOJA: readonly RaridadeDaLoja[] = ['comum', 'raro', 'epico', 'lendario'];
export const NOME_DA_RARIDADE: Readonly<Record<RaridadeDaLoja, string>> = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };

// ---- Cosméticos ----

export type TipoDeCosmetico = 'moldura' | 'avatar' | 'efeito' | 'aura' | 'skin' | 'decoracao';
export const TIPOS_DE_COSMETICO: readonly TipoDeCosmetico[] = ['moldura', 'avatar', 'efeito', 'aura', 'skin', 'decoracao'];

export const DADOS_DO_TIPO: Readonly<Record<TipoDeCosmetico, { nome: string; plural: string; descricao: string }>> = {
  moldura: { nome: 'Moldura de perfil', plural: 'Molduras de perfil', descricao: 'A moldura em volta do seu rosto no perfil, no Hub e nos rankings.' },
  avatar: { nome: 'Avatar alternativo', plural: 'Avatares alternativos', descricao: 'Um retrato novo para o seu personagem, além dos da sua classe.' },
  efeito: { nome: 'Efeito de entrada em combate', plural: 'Efeitos de entrada em combate', descricao: 'A sua chegada à luta, com uma cena própria antes do primeiro golpe.' },
  aura: { nome: 'Aura de personagem', plural: 'Auras de personagem', descricao: 'Um brilho que envolve o seu herói nas lutas e no perfil.' },
  skin: { nome: 'Skin de personagem', plural: 'Skins de personagem', descricao: 'A aparência completa do seu herói, no lugar da padrão.' },
  decoracao: { nome: 'Decoração de chat e cor de nome', plural: 'Decorações de chat e cores de nome', descricao: 'Seu nome colorido e um enfeite nas suas mensagens do chat.' },
};

/** Preço (em centavos) de cada tipo por raridade. Sem a raridade = não existe. */
export const PRECOS_DOS_COSMETICOS: Readonly<Record<TipoDeCosmetico, Partial<Record<RaridadeDaLoja, number>>>> = {
  moldura: { comum: 599, raro: 1_199, epico: 2_399, lendario: 4_799 },
  avatar: { raro: 999, epico: 1_999, lendario: 3_999 },
  efeito: { raro: 1_599, epico: 2_799, lendario: 5_499 },
  aura: { epico: 3_199, lendario: 5_999 },
  skin: { epico: 5_999, lendario: 9_999 },
  decoracao: { comum: 399, raro: 999 },
};

/** Os temas provisórios de cada raridade (os elementos do jogo): o 1º tema é o do Conjunto da raridade; o 2º só vende avulso. */
export const TEMAS_PROVISORIOS: Readonly<Record<RaridadeDaLoja, readonly [string, string]>> = {
  comum: ['Terra', 'Vento'],
  raro: ['Gelo', 'Relâmpago'],
  epico: ['Sombrio', 'Sagrado'],
  lendario: ['Fogo', 'Vento'],
};

/** O que cada Conjunto leva (a raridade do Conjunto = a de cada item). */
const CONJUNTOS_BASE: Readonly<Record<Exclude<RaridadeDaLoja, 'comum'>, readonly TipoDeCosmetico[]>> = {
  raro: ['moldura', 'avatar', 'efeito'],
  epico: ['moldura', 'avatar', 'efeito', 'aura'],
  lendario: ['moldura', 'avatar', 'efeito', 'aura'],
};

export interface ItemCosmetico {
  id: string;
  tipo: TipoDeCosmetico;
  raridade: RaridadeDaLoja;
  tema: string;
  /** Nome PROVISÓRIO (o Yuri dá o nome final junto com a arte). */
  nome: string;
  precoCentavos: number;
  /** O id do Conjunto a que este item pertence (só o 1º tema de Raro, Épico e Lendário). */
  conjunto?: string;
  aVenda: false;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const ITENS_COSMETICOS: readonly ItemCosmetico[] = TIPOS_DE_COSMETICO.flatMap((tipo) =>
  RARIDADES_DA_LOJA.flatMap((raridade) => {
    const preco = PRECOS_DOS_COSMETICOS[tipo][raridade];
    if (preco === undefined) return [];
    return TEMAS_PROVISORIOS[raridade].map((tema, i): ItemCosmetico => ({
      id: `${tipo}-${raridade}-${semAcento(tema)}`,
      tipo,
      raridade,
      tema,
      nome: `${DADOS_DO_TIPO[tipo].nome} ${NOME_DA_RARIDADE[raridade]} · ${tema}`,
      precoCentavos: preco,
      ...(i === 0 && raridade !== 'comum' && CONJUNTOS_BASE[raridade].includes(tipo) ? { conjunto: `conjunto-${raridade}` } : {}),
      aVenda: false,
    }));
  })
);

// ---- Conjuntos ----

/** Os preços dos Conjuntos (do Yuri): cerca de 25% abaixo da soma dos itens avulsos. */
const PRECO_DOS_CONJUNTOS: Readonly<Record<Exclude<RaridadeDaLoja, 'comum'>, number>> = { raro: 2_899, epico: 7_799, lendario: 14_999 };

export interface Conjunto {
  id: string;
  raridade: Exclude<RaridadeDaLoja, 'comum'>;
  tema: string;
  nome: string;
  itens: readonly ItemCosmetico[];
  precoAvulsoCentavos: number;
  precoCentavos: number;
  economiaCentavos: number;
  aVenda: false;
}

export const CONJUNTOS: readonly Conjunto[] = (['raro', 'epico', 'lendario'] as const).map((raridade): Conjunto => {
  const itens = ITENS_COSMETICOS.filter((i) => i.conjunto === `conjunto-${raridade}`);
  const precoAvulsoCentavos = itens.reduce((t, i) => t + i.precoCentavos, 0);
  const precoCentavos = PRECO_DOS_CONJUNTOS[raridade];
  return {
    id: `conjunto-${raridade}`,
    raridade,
    tema: TEMAS_PROVISORIOS[raridade][0],
    nome: `Conjunto ${NOME_DA_RARIDADE[raridade]} · ${TEMAS_PROVISORIOS[raridade][0]}`,
    itens,
    precoAvulsoCentavos,
    precoCentavos,
    economiaCentavos: precoAvulsoCentavos - precoCentavos,
    aVenda: false,
  };
});

// ---- Pacotes e conveniência (novos) ----

export const PASSE_DO_INICIANTE = {
  id: 'passe-iniciante',
  nome: 'Passe do Iniciante',
  precoCentavos: 1_499,
  /** Só pode ser comprado nos 14 primeiros dias da conta e dura 14 dias. */
  diasParaComprar: 14,
  duracaoEmDias: 14,
  porConta: 1,
  regras: '1 por conta. Só pode ser comprado nos 14 primeiros dias da conta e dura 14 dias.',
  aVenda: false,
} as const;

export const VAGA_EXTRA_DE_EXPEDICAO = {
  id: 'vaga-expedicao-30d',
  nome: 'Vaga Extra de Expedição',
  precoCentavos: 999,
  duracaoEmDias: 30,
  limiteDeVagas: 5,
  regras: '+1 vaga de expedição por 30 dias, sem passar o limite de 5 vagas no total.',
  aVenda: false,
} as const;

/** A Expansão da Mochila: 10 pacotes em ordem crescente de preço, +20 espaços cada (+200 no total). */
export const PRECOS_DA_EXPANSAO_DA_MOCHILA: readonly number[] = [299, 499, 599, 599, 799, 799, 999, 999, 1_199, 1_199];
export const ESPACOS_POR_PACOTE_DA_MOCHILA = 20;

export interface PacoteDaMochila {
  id: string;
  /** 1 a 10: o pacote só pode ser comprado na ordem. */
  ordem: number;
  nome: string;
  espacos: number;
  precoCentavos: number;
  /** Quanto custou toda a expansão até este pacote. */
  acumuladoCentavos: number;
  aVenda: false;
}

export const EXPANSOES_DA_MOCHILA: readonly PacoteDaMochila[] = PRECOS_DA_EXPANSAO_DA_MOCHILA.map((precoCentavos, i): PacoteDaMochila => ({
  id: `mochila-${i + 1}`,
  ordem: i + 1,
  nome: `Expansão da Mochila ${i + 1}º`,
  espacos: ESPACOS_POR_PACOTE_DA_MOCHILA,
  precoCentavos,
  acumuladoCentavos: PRECOS_DA_EXPANSAO_DA_MOCHILA.slice(0, i + 1).reduce((a, b) => a + b, 0),
  aVenda: false,
}));

export const TOTAL_DA_EXPANSAO_DA_MOCHILA_CENTAVOS = PRECOS_DA_EXPANSAO_DA_MOCHILA.reduce((a, b) => a + b, 0);
export const TOTAL_DE_ESPACOS_DA_EXPANSAO = PRECOS_DA_EXPANSAO_DA_MOCHILA.length * ESPACOS_POR_PACOTE_DA_MOCHILA;

// ---- Itens que já existem na compra real (só para a vitrine) ----

export const DIAMANTES_NA_VITRINE = PACOTES_DE_DIAMANTES.map((p) => ({ id: p.id, nome: p.nome, precoCentavos: p.precoCentavos, base: p.base, bonus: p.bonus }));
export const PACOTE_DO_INICIANTE_NA_VITRINE = PACOTE_DO_INICIANTE;
export const PASSES_NA_VITRINE = DEFINICOES_DOS_PASSES.map((p) => ({ id: p.id, produto: p.produto, nome: p.nome, precoCentavos: p.precoCentavos, beneficios: p.beneficios.map((b) => b.texto) }));
export const PACOTES_MENSAIS_NA_VITRINE = (cadeia: CadeiaMensal) => ({ cadeia, nome: NOME_DA_CADEIA[cadeia], pacotes: PACOTES_MENSAIS.filter((p) => p.cadeia === cadeia) });

/** Todos os itens NOVOS desta etapa, com preço (para conferência e para a lista de artes). */
export const TODOS_OS_ITENS_NOVOS: readonly { id: string; nome: string; precoCentavos: number }[] = [
  PASSE_DO_INICIANTE,
  VAGA_EXTRA_DE_EXPEDICAO,
  ...EXPANSOES_DA_MOCHILA,
  ...ITENS_COSMETICOS,
  ...CONJUNTOS,
].map((i) => ({ id: i.id, nome: i.nome, precoCentavos: i.precoCentavos }));
