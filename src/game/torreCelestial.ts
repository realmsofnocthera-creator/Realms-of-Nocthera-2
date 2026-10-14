import { ESTRELAS_CACADA, MONSTROS_CACADA_DADOS, MULT_CHAVE, PERFIS, pontosDeReferencia } from '@/rules/cacada';
import type { MonstroCacadaDados } from '@/rules/cacada';
import { MODIFICADOR_FRAQUEZA, ModificadoresElementais } from '@/rules/elements';
import { MODIFICADOR_RESISTENCIA_CACADA } from '@/rules/cacada';
import type { Attributes } from '@/rules/attributes';
import type { MonsterDefinition } from '@/rules/monsters';
import { PROVACOES } from '@/rules/provacoes';
import { CHEFES_TORRE_POR_ANDAR, ChefeTorre } from '@/rules/torreChefes';

/**
 * Provação da Torre Celestial — regras puras (sem banco). Decididas pelo Yuri em 14/10/2026:
 * 300 andares, uma luta por andar, sem voltar e sem limite diário; Vida e Sobreescudo voltam ao máximo a cada
 * andar; derrota só perde a luta. Um chefe único a cada 10 andares. Cada recompensa vem uma única vez.
 */
export const TORRE = {
  andares: 300,
  /** XP fixo por andar, só enquanto o personagem estiver abaixo do nível máximo de XP da Torre. */
  xpPorAndar: 27,
  /** A Torre só dá XP até o personagem chegar a este nível. */
  nivelMaximoDeXp: 15,
  /** Do andar 1 ao 199 o andar dá essência de habilidade (piso de 3,4 × andar). */
  essenciaPorAndarMultiplicador: 3.4,
  /** A partir deste andar a essência é trocada por Diamantes. */
  andarInicialDosDiamantes: 200,
  diamantesPorAndar: 5,
  /** Andares de chefe a partir deste dão 1 fragmento de ascensão garantido. */
  andarInicialDosFragmentosDeAscensao: 200,
  fragmentosDeAscensaoPorChefe: 1,
  andaresPorChefe: 10,
} as const;

/** Nível pedido pela vitrine das Provações (src/rules/provacoes.ts). */
export const NIVEL_TORRE = PROVACOES.find((p) => p.id === 'torre-celestial')?.nivelRequerido ?? 5;

export type MotivoBloqueioTorre = 'nivelInsuficiente' | 'torreCompleta';

export const MENSAGEM_BLOQUEIO_TORRE: Readonly<Record<MotivoBloqueioTorre, string>> = {
  nivelInsuficiente: 'Nível insuficiente para a Torre Celestial',
  torreCompleta: 'Você já completou a Torre Celestial',
};

export function ehAndarDeChefe(andar: number): boolean {
  return andar > 0 && andar % TORRE.andaresPorChefe === 0;
}

/** O andar que o personagem enfrenta agora: o seguinte ao mais alto que ele já venceu. */
export function andarAtual(andarVencido: number | undefined): number {
  return Math.max(0, Math.floor(andarVencido ?? 0)) + 1;
}

export function conferirEntradaTorre(nivel: number, andarVencido: number | undefined): { ok: true; andar: number } | { ok: false; motivo: MotivoBloqueioTorre } {
  if (nivel < NIVEL_TORRE) return { ok: false, motivo: 'nivelInsuficiente' };
  const andar = andarAtual(andarVencido);
  if (andar > TORRE.andares) return { ok: false, motivo: 'torreCompleta' };
  return { ok: true, andar };
}

export interface RecompensaTorre {
  essenciaHabilidade: number;
  diamantes: number;
  fragmentosAscensao: number;
  xp: number;
}

/** Essência do andar: cresce com a altura até o 199; a partir do 200 a essência vira Diamantes. */
export function essenciaDoAndar(andar: number): number {
  if (andar < 1 || andar >= TORRE.andarInicialDosDiamantes) return 0;
  return Math.floor(TORRE.essenciaPorAndarMultiplicador * andar);
}

export function diamantesDoAndar(andar: number): number {
  return andar >= TORRE.andarInicialDosDiamantes && andar <= TORRE.andares ? TORRE.diamantesPorAndar : 0;
}

export function fragmentosDeAscensaoDoAndar(andar: number): number {
  return ehAndarDeChefe(andar) && andar >= TORRE.andarInicialDosFragmentosDeAscensao && andar <= TORRE.andares
    ? TORRE.fragmentosDeAscensaoPorChefe
    : 0;
}

/** XP fixo do andar, só enquanto o personagem está abaixo do nível 15. */
export function xpDoAndar(nivelDoPersonagem: number): number {
  return nivelDoPersonagem < TORRE.nivelMaximoDeXp ? TORRE.xpPorAndar : 0;
}

export function recompensaDoAndar(andar: number, nivelDoPersonagem: number): RecompensaTorre {
  return {
    essenciaHabilidade: essenciaDoAndar(andar),
    diamantes: diamantesDoAndar(andar),
    fragmentosAscensao: fragmentosDeAscensaoDoAndar(andar),
    xp: xpDoAndar(nivelDoPersonagem),
  };
}

/** Nível de referência do andar (contínuo): do 2 no andar 1 ao 30 no andar 300; cada andar é um pouco mais difícil. */
export function nivelDeReferenciaDoAndar(andar: number): number {
  const a = Math.min(TORRE.andares, Math.max(1, andar));
  return 2 + ((a - 1) * 28) / (TORRE.andares - 1);
}

/** A estrela da Caçada cujos monstros servem de base ao andar (a maior cujo nível mínimo cabe no nível de referência). */
export function estrelaDoAndar(andar: number): number {
  const ref = nivelDeReferenciaDoAndar(andar);
  let estrela = 1;
  for (const e of ESTRELAS_CACADA) if (e.nivelMinimo <= ref) estrela = e.estrela;
  return estrela;
}

/** O monstro comum do andar (sempre o mesmo para todo mundo): sorteio fixo pelo número do andar entre os da estrela. */
export function monstroBaseDoAndar(andar: number): MonstroCacadaDados {
  const estrela = estrelaDoAndar(andar);
  const pool = MONSTROS_CACADA_DADOS.filter((d) => d.estrela === estrela && !d.chave);
  const lista = pool.length > 0 ? pool : MONSTROS_CACADA_DADOS.filter((d) => d.estrela === estrela);
  return lista[(andar * 7 + Math.floor(andar / 10)) % lista.length];
}

export interface IdentidadeAndar {
  andar: number;
  chefe: boolean;
  monstroId: string;
  nome: string;
  /** Texto curto do que o chefe aplica (só nos andares de chefe). */
  efeitos?: string;
}

export function identidadeDoAndar(andar: number): IdentidadeAndar {
  const chefe = CHEFES_TORRE_POR_ANDAR[andar];
  if (chefe) return { andar, chefe: true, monstroId: chefe.id, nome: chefe.nome, efeitos: chefe.efeitos };
  const base = monstroBaseDoAndar(andar);
  return { andar, chefe: false, monstroId: base.id, nome: base.nome };
}

/** Próximo andar de chefe a partir de um andar (inclusive); null depois do 300. */
export function proximoChefe(andar: number): ChefeTorre | null {
  for (let a = Math.max(1, andar); a <= TORRE.andares; a++) {
    if (ehAndarDeChefe(a)) return CHEFES_TORRE_POR_ANDAR[a] ?? null;
  }
  return null;
}

/**
 * Monta o monstro do andar: atributos e vida pela mesma conta da Caçada, com o nível de referência contínuo do
 * andar. Chefes usam as multiplicações dos monstros-chave (+20% de vida, +8% de Força), são Enfurecidos e imunes
 * a Sono, Paralisia e Congelamento. A Torre não dá ouro nem o XP do monstro (o servidor aplica o XP fixo do andar).
 */
export function montarMonstroDaTorre(andar: number): MonsterDefinition {
  const ref = nivelDeReferenciaDoAndar(andar);
  const p = pontosDeReferencia(ref);
  const chefeDados = CHEFES_TORRE_POR_ANDAR[andar];
  const base = chefeDados ? undefined : monstroBaseDoAndar(andar);
  const perfil = PERFIS[chefeDados ? 'normal' : base?.perfil ?? 'normal'];
  const mult = chefeDados ? MULT_CHAVE : { hp: 1, forca: 1 };
  const atributos: Attributes = {
    vigor: Math.round(p * 0.2),
    sorte: 0,
    forca: Math.max(1, Math.round(p * perfil.forca * mult.forca * (1 + (base?.forcaPercentual ?? 0) / 100))),
    vitalidade: Math.round(p * perfil.vitalidade * (1 + (base?.vitalidadePercentual ?? 0) / 100)),
    arcano: 0,
    inteligencia: 0,
    agilidade: Math.max(1, Math.round(p * perfil.agilidade)),
  };
  const modificadoresElementais: ModificadoresElementais = {};
  for (const e of base?.fracoA ?? []) modificadoresElementais[e] = MODIFICADOR_FRAQUEZA;
  for (const e of base?.resisteA ?? []) modificadoresElementais[e] = MODIFICADOR_RESISTENCIA_CACADA;
  const elementoAtaque = chefeDados?.elementoAtaque ?? base?.elementoAtaque;
  const efeitosAplicados = chefeDados?.efeitosAplicados ?? base?.efeitosAplicados;
  return {
    id: chefeDados?.id ?? base!.id,
    nome: chefeDados?.nome ?? base!.nome,
    nivel: Math.min(30, Math.max(1, Math.round(ref))),
    hp: Math.round(p * perfil.hp * mult.hp),
    chefe: chefeDados !== undefined,
    categoriaCorporal: chefeDados?.categoriaCorporal ?? base!.categoriaCorporal,
    ...(base?.fraquezasProprias ? { fraquezasProprias: base.fraquezasProprias } : {}),
    ...(base?.resistenciasProprias ? { resistenciasProprias: base.resistenciasProprias } : {}),
    atributos,
    xpConcedido: 0,
    ouroConcedido: { min: 0, max: 0 },
    modificadoresElementais,
    ...(elementoAtaque ? { elementoAtaque } : {}),
    ...(efeitosAplicados ? { efeitosAplicados } : {}),
    ...(base?.habilidades ? { habilidades: base.habilidades } : {}),
    ...(chefeDados || base?.enfurecido ? { enfurecido: true } : {}),
    ...(base?.imunidadesStatus ? { imunidadesStatus: base.imunidadesStatus } : {}),
  };
}
