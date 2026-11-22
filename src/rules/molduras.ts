import { CATEGORIAS_DE_CONQUISTA, CONQUISTAS, DEGRAUS, NOME_DA_CATEGORIA, type CategoriaDeConquista } from '@/rules/conquistas';
import { RANQUES } from '@/rules/arenaRanqueada';
import { TITULO_MAP } from '@/rules/titulos';

/**
 * Molduras do avatar no perfil (arte do Yuri, 22 estáticas e 7 animadas). Cada uma é liberada por uma regra que já existe no jogo:
 *  - as 10 do ranque da Arena e as 4 do Campeonato: pelo título correspondente (que chega pelo Correio);
 *  - a do Campeão do Chefe Mundial: pelo título do 1º lugar do dia;
 *  - as 7 de categoria: ao resgatar o 5º degrau de qualquer conquista da categoria (proposta, a confirmar pelo Yuri).
 * A moldura "Padrão" (a redonda do Hub) todo personagem tem e não aparece aqui.
 */
export type GrupoDeMoldura = 'ranque' | 'campeonato' | 'categoria' | 'chefeMundial';

export interface MolduraDefinition {
  id: string;
  nome: string;
  grupo: GrupoDeMoldura;
  /** Como se ganha (para a tela). */
  origem: string;
  /** O título que libera (ranque, campeonato e chefe mundial). */
  titulo?: string;
  /** A categoria de conquista que libera (5º degrau de qualquer conquista dela). */
  categoria?: CategoriaDeConquista;
  /** Tem a versão animada (loop de 48 quadros). */
  animada?: boolean;
}

const ANIMADAS = new Set(['ranque-ascendente', 'ranque-soberano', 'ranque-transcendente', 'ranque-eterno', 'campeonato-4', 'categoria-forja', 'chefe-mundial']);

const DO_RANQUE: MolduraDefinition[] = RANQUES.map((r) => ({
  id: `ranque-${r.id}`,
  nome: `${r.nome} da Arena`,
  grupo: 'ranque',
  origem: `Terminar a semana no ranque ${r.nome} da Arena ranqueada`,
  titulo: r.titulo,
}));

const DO_CAMPEONATO: MolduraDefinition[] = [
  { id: 'campeonato-1', nome: 'Campeão de Nocthera', grupo: 'campeonato', origem: 'Ganhar 1 Campeonato', titulo: 'campeao-de-nocthera' },
  { id: 'campeonato-2', nome: 'Bicampeão de Nocthera', grupo: 'campeonato', origem: 'Ganhar 2 Campeonatos', titulo: 'bicampeao-de-nocthera' },
  { id: 'campeonato-3', nome: 'Tricampeão de Nocthera', grupo: 'campeonato', origem: 'Ganhar 3 Campeonatos', titulo: 'tricampeao-de-nocthera' },
  { id: 'campeonato-4', nome: 'Lenda de Nocthera', grupo: 'campeonato', origem: 'Ganhar 5 Campeonatos', titulo: 'lenda-de-nocthera' },
];

const DA_CATEGORIA: MolduraDefinition[] = CATEGORIAS_DE_CONQUISTA.map((c) => ({
  id: `categoria-${c}`,
  nome: `Conquistas: ${NOME_DA_CATEGORIA[c]}`,
  grupo: 'categoria',
  origem: `Resgatar o 5º degrau de uma conquista de ${NOME_DA_CATEGORIA[c]}`,
  categoria: c,
}));

const DO_CHEFE_MUNDIAL: MolduraDefinition = {
  id: 'chefe-mundial',
  nome: 'Campeão do Chefe Mundial',
  grupo: 'chefeMundial',
  origem: '1º lugar do dia no Chefe Mundial',
  titulo: 'campeao-do-chefe-mundial',
};

/** As 22 molduras, na ordem da tela: ranques, Campeonato, categorias e Chefe Mundial. */
export const MOLDURAS: readonly MolduraDefinition[] = [...DO_RANQUE, ...DO_CAMPEONATO, ...DA_CATEGORIA, DO_CHEFE_MUNDIAL].map((m) => ({ ...m, ...(ANIMADAS.has(m.id) ? { animada: true } : {}) }));

export const MOLDURA_MAP: Readonly<Record<string, MolduraDefinition>> = Object.fromEntries(MOLDURAS.map((m) => [m.id, m]));
export const ehMoldura = (v: unknown): v is string => typeof v === 'string' && !!MOLDURA_MAP[v];

/** Lista que as telas antigas liam (as molduras já têm arte). */
export const MOLDURAS_DISPONIVEIS = MOLDURAS;

interface Ficha {
  titulos?: readonly string[];
  conquistas?: Readonly<Record<string, number>>;
}

/** O personagem tem a moldura? (O título, ou o 5º degrau de uma conquista da categoria.) */
export function molduraLiberada(ficha: Ficha, m: MolduraDefinition): boolean {
  if (m.titulo) return !!ficha.titulos?.includes(m.titulo) && !!TITULO_MAP[m.titulo];
  if (m.categoria) return CONQUISTAS.some((c) => c.categoria === m.categoria && (ficha.conquistas?.[c.id] ?? 0) >= DEGRAUS);
  return false;
}

/** As molduras que o personagem tem, na ordem da tela. */
export const molduraDoPersonagem = (ficha: Ficha): MolduraDefinition[] => MOLDURAS.filter((m) => molduraLiberada(ficha, m));

/** A moldura escolhida, se o personagem ainda a tem (senão vale a Padrão). */
export function molduraEscolhida(ficha: Ficha & { molduraId?: string | null }): MolduraDefinition | null {
  const m = ficha.molduraId ? MOLDURA_MAP[ficha.molduraId] : undefined;
  return m && molduraLiberada(ficha, m) ? m : null;
}
