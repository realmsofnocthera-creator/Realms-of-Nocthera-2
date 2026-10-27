import { ESPACOS_EXTRAS_DA_MOCHILA } from './vip';
import type { AttributeName } from './attributes';
import type { EmblemaRaridade } from './emblemas';

/**
 * Sistema de Alma (7.8, decidido pelo Yuri em 22/10/2026): cartas equipadas na aba Alma da ficha, liberada no nível 25.
 * São 9 espaços: 3 de Alma, 3 de Corpo e 3 de Mente. Cada carta tem 1 efeito FIXO (por tipo de carta) e de 1 a 3
 * efeitos ALEATÓRIOS (por raridade). Lendárias e míticas podem ser despertadas (I, II, III) com cópias e poeira de
 * alma. Cacos de alma refinam (sorteiam de novo) um efeito aleatório por vez e vêm de destruir cartas.
 * O catálogo tem 54 cartas (3 por categoria em cada uma das 6 raridades); os nomes são do Yuri e o visual e os textos
 * ainda vêm. Os valores abaixo são PROPOSTA, a confirmar.
 */

export type CategoriaDeCarta = 'alma' | 'corpo' | 'mente';
export const CATEGORIAS_DE_CARTA: readonly CategoriaDeCarta[] = ['alma', 'corpo', 'mente'];
export const NOME_DA_CATEGORIA: Readonly<Record<CategoriaDeCarta, string>> = { alma: 'Alma', corpo: 'Corpo', mente: 'Mente' };
export const ESPACOS_POR_CATEGORIA = 3;
export const NIVEL_DA_ALMA = 25;
/** Cartas guardadas no máximo; passando disso, a carta nova vira cacos de alma na hora. */
export const CARTAS_MAXIMAS = 300;

export const RARIDADES_DE_CARTA: readonly EmblemaRaridade[] = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario', 'mitico'];
const indiceDaRaridade = (r: EmblemaRaridade) => RARIDADES_DE_CARTA.indexOf(r);

/** Os efeitos que uma carta pode dar (todos passivos, em % ou em pontos). */
export type EfeitoDeCarta =
  | 'atqFisico'
  | 'atqMagico'
  | 'defesa'
  | 'hp'
  | 'agilidade'
  | 'chanceCritico'
  | 'chanceEfeitos'
  | AttributeName;

export const EFEITOS_PERCENTUAIS: readonly EfeitoDeCarta[] = ['atqFisico', 'atqMagico', 'defesa', 'hp', 'agilidade', 'chanceCritico', 'chanceEfeitos'];
/** Os atributos que as cartas dão em pontos (a Agilidade entra só como % de iniciativa). */
export const EFEITOS_DE_ATRIBUTO: readonly AttributeName[] = ['vigor', 'sorte', 'forca', 'vitalidade', 'arcano', 'inteligencia'];
/** O sorteio dos efeitos aleatórios escolhe entre todos estes (os 7 percentuais e os 7 atributos). */
export const POOL_DE_EFEITOS: readonly EfeitoDeCarta[] = [...EFEITOS_PERCENTUAIS, ...EFEITOS_DE_ATRIBUTO];

export interface DefinicaoDoEfeito {
  nome: string;
  /** Texto do valor: "+8%" ou "+3 pontos". */
  unidade: '%' | 'pontos de atributo' | 'pontos %';
}

export const DEFINICAO_DO_EFEITO: Readonly<Record<string, DefinicaoDoEfeito>> = {
  atqFisico: { nome: 'ATQ físico', unidade: '%' },
  atqMagico: { nome: 'ATQ mágico', unidade: '%' },
  defesa: { nome: 'Defesa', unidade: '%' },
  hp: { nome: 'HP', unidade: '%' },
  agilidade: { nome: 'Agilidade (iniciativa)', unidade: '%' },
  chanceCritico: { nome: 'Chance de crítico', unidade: 'pontos %' },
  chanceEfeitos: { nome: 'Chance de efeitos', unidade: 'pontos %' },
  vigor: { nome: 'Vigor', unidade: 'pontos de atributo' },
  sorte: { nome: 'Sorte', unidade: 'pontos de atributo' },
  forca: { nome: 'Força', unidade: 'pontos de atributo' },
  vitalidade: { nome: 'Vitalidade', unidade: 'pontos de atributo' },
  arcano: { nome: 'Arcano', unidade: 'pontos de atributo' },
  inteligencia: { nome: 'Inteligência', unidade: 'pontos de atributo' },
};

/** O valor FIXO de cada carta por raridade [comum ... mítico]: +4% a +14% (crítico e efeitos, em pontos %: metade). */
const FIXO_PERCENTUAL = [4, 6, 8, 10, 12, 14] as const;
const FIXO_EM_PONTOS = [2, 3, 4, 5, 6, 7] as const;
/** Os efeitos aleatórios: faixa [min, max] por raridade, por tipo de valor. */
const ALEATORIO_PERCENTUAL: readonly (readonly [number, number])[] = [[1, 2], [2, 3], [3, 4], [4, 6], [5, 8], [7, 10]];
const ALEATORIO_EM_PONTOS: readonly (readonly [number, number])[] = [[1, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 6]];
const ALEATORIO_ATRIBUTO: readonly (readonly [number, number])[] = [[1, 2], [2, 3], [3, 4], [4, 6], [6, 8], [8, 10]];

export const ehEfeitoEmPontos = (e: EfeitoDeCarta) => e === 'chanceCritico' || e === 'chanceEfeitos';
export const ehEfeitoDeAtributo = (e: EfeitoDeCarta) => (EFEITOS_DE_ATRIBUTO as readonly string[]).includes(e);

/** Quantos efeitos aleatórios a raridade dá: 1 (comum e raro), 2 (muito raro e épico), 3 (lendário e mítico). */
export const EFEITOS_ALEATORIOS_POR_RARIDADE: Readonly<Record<EmblemaRaridade, number>> = { comum: 1, raro: 1, muitoRaro: 2, epico: 2, lendario: 3, mitico: 3 };

export function valorFixoDaRaridade(efeito: EfeitoDeCarta, raridade: EmblemaRaridade): number {
  const i = indiceDaRaridade(raridade);
  return (ehEfeitoEmPontos(efeito) ? FIXO_EM_PONTOS : FIXO_PERCENTUAL)[i];
}

export function faixaDoAleatorio(efeito: EfeitoDeCarta, raridade: EmblemaRaridade): readonly [number, number] {
  const i = indiceDaRaridade(raridade);
  if (ehEfeitoDeAtributo(efeito)) return ALEATORIO_ATRIBUTO[i];
  return (ehEfeitoEmPontos(efeito) ? ALEATORIO_EM_PONTOS : ALEATORIO_PERCENTUAL)[i];
}

/** Despertar I, II e III (só lendárias e míticas): +25%, +50% e +100% sobre o efeito fixo; custo em cópias e poeira de alma. */
export const NIVEL_MAXIMO_DO_DESPERTAR = 3;
export const BONUS_DO_DESPERTAR_PERCENTUAL: readonly number[] = [0, 25, 50, 100];
export const CUSTO_DO_DESPERTAR: readonly { copias: number; poeira: number }[] = [
  { copias: 2, poeira: 20 },
  { copias: 3, poeira: 50 },
  { copias: 4, poeira: 100 },
];
export const podeDespertar = (raridade: EmblemaRaridade) => raridade === 'lendario' || raridade === 'mitico';

/** Cacos de alma: o que destruir uma carta dá e o que refinar um efeito aleatório custa, por raridade. */
export const CACOS_AO_DESTRUIR: Readonly<Record<EmblemaRaridade, number>> = { comum: 3, raro: 6, muitoRaro: 12, epico: 25, lendario: 50, mitico: 100 };
export const CACOS_PARA_REFINAR: Readonly<Record<EmblemaRaridade, number>> = { comum: 5, raro: 10, muitoRaro: 20, epico: 40, lendario: 80, mitico: 150 };

/** Bônus de coleção: completar o conjunto de uma raridade (as 9 cartas descobertas) dá +X% de ATQ, DEF e HP. */
export const BONUS_DO_CONJUNTO_PERCENTUAL: Readonly<Record<EmblemaRaridade, number>> = { comum: 1, raro: 1, muitoRaro: 2, epico: 3, lendario: 4, mitico: 5 };

export interface TipoDeCarta {
  id: string;
  nome: string;
  categoria: CategoriaDeCarta;
  raridade: EmblemaRaridade;
  /** O efeito fixo da carta (o valor vem da raridade e do despertar). */
  fixo: EfeitoDeCarta;
}

/** O efeito fixo das 3 cartas de cada categoria em cada raridade (PROPOSTA: a confirmar). */
const FIXOS_POR_CATEGORIA: Readonly<Record<CategoriaDeCarta, readonly EfeitoDeCarta[]>> = {
  alma: ['atqMagico', 'chanceEfeitos', 'chanceCritico'],
  corpo: ['hp', 'defesa', 'atqFisico'],
  mente: ['agilidade', 'chanceCritico', 'chanceEfeitos'],
};
/**
 * Os 54 nomes das cartas, do Yuri (22/10/2026): por categoria, as 3 cartas (I, II, III) e, em cada uma, a raridade na
 * ordem comum, raro, muito raro, épico, lendário e mítico. Os textos e o visual ainda vêm depois.
 */
const NOMES_DAS_CARTAS: Readonly<Record<CategoriaDeCarta, readonly (readonly string[])[]>> = {
  alma: [
    ['Centelha Arcana', 'Essência Arcana', 'Núcleo Feérico', 'Coração do Éter', 'Alma do Arcanista', 'Origem da Magia'],
    ['Sussurro Oculto', 'Elo do Abismo', 'Marca do Ocultista', 'Pacto do Inefável', 'Vontade do Abismo', 'Domínio do Caos'],
    ['Instinto Letal', 'Presságio Mortal', 'Olhar do Carrasco', 'Marca da Ruína', 'Decreto da Morte', 'Destino Inevitável'],
  ],
  corpo: [
    ['Pulso Vital', 'Coração Vital', 'Sangue Ancestral', 'Essência do Colosso', 'Coração Imortal', 'Fonte da Vida'],
    ['Pele Resistente', 'Couraça Ancestral', 'Escamas de Titã', 'Bastião Eterno', 'Fortaleza dos Antigos', 'Muralha Inquebrável'],
    ['Força Primitiva', 'Fúria Bestial', 'Instinto de Guerra', 'Poder do Destruidor', 'Ira dos Titãs', 'Força Primordial'],
  ],
  mente: [
    ['Reflexos Aguçados', 'Instinto Predatório', 'Percepção Sobrenatural', 'Pensamento Relâmpago', 'Consciência Temporal', 'Domínio do Instante'],
    ['Mira Precisa', 'Visão do Carrasco', 'Olhos da Predação', 'Foco Absoluto', 'Visão do Destino', 'Perfeição Fatal'],
    ['Vontade Firme', 'Vontade Corrupta', 'Mente Profanada', 'Domínio Psíquico', 'Soberania Mental', 'Consciência Absoluta'],
  ],
};

/** As 54 cartas (3 por categoria em cada raridade). */
export const TIPOS_DE_CARTA: readonly TipoDeCarta[] = RARIDADES_DE_CARTA.flatMap((raridade, r) =>
  CATEGORIAS_DE_CARTA.flatMap((categoria) =>
    FIXOS_POR_CATEGORIA[categoria].map((fixo, i) => ({
      id: `${categoria}-${raridade}-${i + 1}`,
      nome: NOMES_DAS_CARTAS[categoria][i][r],
      categoria,
      raridade,
      fixo,
    }))
  )
);

export const TIPO_DE_CARTA_MAP: Readonly<Record<string, TipoDeCarta>> = Object.fromEntries(TIPOS_DE_CARTA.map((t) => [t.id, t]));
export const tiposDaRaridadeDeCarta = (raridade: EmblemaRaridade) => TIPOS_DE_CARTA.filter((t) => t.raridade === raridade);

export interface EfeitoSorteado {
  efeito: EfeitoDeCarta;
  valor: number;
}

/** Uma carta do jogador: o tipo, os efeitos aleatórios que saíram e o nível de despertar (0 a 3). */
export interface CartaItem {
  id: string;
  tipo: string;
  efeitos: EfeitoSorteado[];
  despertar: number;
}

/** Sorteia 1 efeito aleatório da raridade. `sorteio` devolve números em [0, 1). */
export function sortearEfeito(raridade: EmblemaRaridade, sorteio: () => number): EfeitoSorteado {
  const efeito = POOL_DE_EFEITOS[Math.min(POOL_DE_EFEITOS.length - 1, Math.floor(sorteio() * POOL_DE_EFEITOS.length))];
  const [min, max] = faixaDoAleatorio(efeito, raridade);
  return { efeito, valor: min + Math.min(max - min, Math.floor(sorteio() * (max - min + 1))) };
}

/** Cria uma carta nova do tipo, com os efeitos aleatórios da raridade. */
export function criarCarta(id: string, tipoId: string, sorteio: () => number): CartaItem {
  const tipo = TIPO_DE_CARTA_MAP[tipoId];
  if (!tipo) throw new Error(`Carta desconhecida: ${tipoId}`);
  const efeitos = Array.from({ length: EFEITOS_ALEATORIOS_POR_RARIDADE[tipo.raridade] }, () => sortearEfeito(tipo.raridade, sorteio));
  return { id, tipo: tipoId, efeitos, despertar: 0 };
}

/** O valor do efeito fixo da carta com o despertar já aplicado (arredondado para cima em décimos). */
export function valorFixoDaCarta(carta: Pick<CartaItem, 'tipo' | 'despertar'>): number {
  const tipo = TIPO_DE_CARTA_MAP[carta.tipo];
  if (!tipo) return 0;
  const base = valorFixoDaRaridade(tipo.fixo, tipo.raridade);
  const bonus = BONUS_DO_DESPERTAR_PERCENTUAL[Math.min(NIVEL_MAXIMO_DO_DESPERTAR, Math.max(0, carta.despertar))] ?? 0;
  return Math.round(base * (100 + bonus)) / 100;
}

/** Texto curto de um efeito: "+8% ATQ físico", "+3 Força", "+4 pontos % de chance de crítico". */
export function textoDoEfeito(efeito: EfeitoDeCarta, valor: number): string {
  const def = DEFINICAO_DO_EFEITO[efeito];
  const v = Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',');
  if (!def) return `+${v}`;
  if (def.unidade === '%') return `+${v}% de ${def.nome}`;
  if (def.unidade === 'pontos %') return `+${v}% de ${def.nome.toLowerCase()}`;
  return `+${v} de ${def.nome}`;
}

/** Lê as cartas do banco com tolerância (tipo que não existe, efeito fora do pool e valor fora da faixa são descartados). */
export function lerCartasPersonagem(itensBrutos: unknown, equipadasBrutas: unknown, descobertasBrutas: unknown): { itens: CartaItem[]; equipadas: string[]; descobertas: string[] } {
  const itens: CartaItem[] = [];
  const vistos = new Set<string>();
  if (Array.isArray(itensBrutos)) {
    for (const bruto of itensBrutos.slice(0, CARTAS_MAXIMAS + ESPACOS_EXTRAS_DA_MOCHILA)) {
      if (!bruto || typeof bruto !== 'object') continue;
      const { id, tipo, efeitos, despertar } = bruto as Record<string, unknown>;
      if (typeof id !== 'string' || !id || vistos.has(id) || typeof tipo !== 'string') continue;
      const def = TIPO_DE_CARTA_MAP[tipo];
      if (!def) continue;
      const lista = (Array.isArray(efeitos) ? efeitos : []).flatMap((e) => {
        const o = e as Record<string, unknown> | null;
        if (!o || typeof o.efeito !== 'string' || !(POOL_DE_EFEITOS as readonly string[]).includes(o.efeito) || typeof o.valor !== 'number' || !Number.isFinite(o.valor)) return [];
        const [min, max] = faixaDoAleatorio(o.efeito as EfeitoDeCarta, def.raridade);
        return o.valor >= min && o.valor <= max ? [{ efeito: o.efeito as EfeitoDeCarta, valor: o.valor }] : [];
      });
      const esperados = EFEITOS_ALEATORIOS_POR_RARIDADE[def.raridade];
      if (lista.length !== esperados) continue;
      const d = typeof despertar === 'number' && Number.isInteger(despertar) && despertar >= 0 ? Math.min(podeDespertar(def.raridade) ? NIVEL_MAXIMO_DO_DESPERTAR : 0, despertar) : 0;
      vistos.add(id);
      itens.push({ id, tipo, efeitos: lista, despertar: d });
    }
  }
  const equipadas: string[] = [];
  const tiposEquipados = new Set<string>();
  const porCategoria: Record<string, number> = {};
  if (Array.isArray(equipadasBrutas)) {
    for (const id of equipadasBrutas) {
      const item = typeof id === 'string' ? itens.find((i) => i.id === id) : undefined;
      if (!item || equipadas.includes(item.id) || tiposEquipados.has(item.tipo)) continue;
      const categoria = TIPO_DE_CARTA_MAP[item.tipo].categoria;
      if ((porCategoria[categoria] ?? 0) >= ESPACOS_POR_CATEGORIA) continue;
      porCategoria[categoria] = (porCategoria[categoria] ?? 0) + 1;
      tiposEquipados.add(item.tipo);
      equipadas.push(item.id);
    }
  }
  const descobertas = Array.isArray(descobertasBrutas) ? [...new Set(descobertasBrutas.filter((t): t is string => typeof t === 'string' && !!TIPO_DE_CARTA_MAP[t]))] : [];
  // Quem tem a carta já a descobriu
  for (const i of itens) if (!descobertas.includes(i.tipo)) descobertas.push(i.tipo);
  return { itens, equipadas, descobertas };
}

/**
 * Origem das cartas (decidida pelo Yuri em 22/10/2026: Teste de Equipe, Chefe de guildas e Incursões). As raridades
 * do Teste de Equipe estão em `testeEquipe.ts`; as chances e as raridades das outras fontes são PROPOSTA, a confirmar.
 */

/** Sorteia a raridade pelos pesos (na ordem comum a mítico). */
export function sortearRaridadePorPesos(pesos: readonly number[], sorteio: () => number): EmblemaRaridade {
  const total = pesos.reduce((s, p) => s + p, 0);
  let alvo = sorteio() * total;
  for (const [i, p] of pesos.entries()) {
    if (alvo < p) return RARIDADES_DE_CARTA[i];
    alvo -= p;
  }
  return RARIDADES_DE_CARTA[pesos.findLastIndex((p) => p > 0)] ?? 'comum';
}

/** Incursões: a carta de cada participante quando o chefe cai (50% de chance); a raridade sobe com a dificuldade (0 a 9). */
export const CHANCE_DE_CARTA_DA_INCURSAO = 0.5;
export const RARIDADE_DA_CARTA_DA_INCURSAO: readonly EmblemaRaridade[] = ['comum', 'comum', 'raro', 'raro', 'muitoRaro', 'muitoRaro', 'epico', 'epico', 'lendario', 'lendario'];
