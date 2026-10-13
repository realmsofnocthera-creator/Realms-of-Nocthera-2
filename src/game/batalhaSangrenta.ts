import { MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { PROVACOES } from '@/rules/provacoes';
import { SUBCLASSES } from '@/rules/subclasses';

/**
 * Provação de Batalha Sangrenta — regras puras (sem banco). Decididas pelo Yuri em 13/10/2026:
 * cinco dificuldades (Fácil, Médio, Difícil, Muito difícil e Inferno), cada uma com monstros de uma estrela, chefes
 * Especiais e uma faixa de fragmentos de alma. O HP passa de uma luta para a outra; 3 tentativas por dia (somando
 * todas as dificuldades); cada dificuldade abre ao vencer a anterior. Toda vitória dá 150 de ouro e a primeira
 * vitória em cada dificuldade dá 10 Diamantes.
 */

export type DificuldadeBatalha = 'facil' | 'medio' | 'dificil' | 'muitoDificil' | 'inferno';

export interface DefinicaoDificuldade {
  id: DificuldadeBatalha;
  nome: string;
  /** Estrela dos monstros das ondas comuns. */
  estrela: number;
  /** Chefes Especiais no fim da batalha. */
  chefes: number;
  /** Fragmentos de alma ao vencer a batalha inteira (sorteado dentro da faixa). */
  fragmentos: { min: number; max: number };
  /** Só o Inferno: chance de ganhar também fragmentos de uma subclasse sorteada entre as 12. */
  fragmentosSubclasse?: { chancePercentual: number; min: number; max: number };
}

export const DIFICULDADES_BATALHA: readonly DefinicaoDificuldade[] = [
  { id: 'facil', nome: 'Fácil', estrela: 5, chefes: 1, fragmentos: { min: 1, max: 3 } },
  { id: 'medio', nome: 'Médio', estrela: 6, chefes: 1, fragmentos: { min: 2, max: 5 } },
  { id: 'dificil', nome: 'Difícil', estrela: 7, chefes: 1, fragmentos: { min: 3, max: 6 } },
  { id: 'muitoDificil', nome: 'Muito difícil', estrela: 8, chefes: 1, fragmentos: { min: 6, max: 8 } },
  { id: 'inferno', nome: 'Inferno', estrela: 9, chefes: 2, fragmentos: { min: 7, max: 12 }, fragmentosSubclasse: { chancePercentual: 20, min: 1, max: 2 } },
];

export const DIFICULDADES_BATALHA_MAP: Readonly<Record<DificuldadeBatalha, DefinicaoDificuldade>> = Object.fromEntries(
  DIFICULDADES_BATALHA.map((d) => [d.id, d])
) as Record<DificuldadeBatalha, DefinicaoDificuldade>;

export const BATALHA_SANGRENTA = {
  /** Monstros comuns antes do(s) chefe(s). */
  ondasComuns: 4,
  tentativasPorDia: 3,
  /** Quem cai no meio da batalha ganha só este ouro (sem fragmentos). */
  ouroDaDerrota: 50,
  /** Toda vitória (batalha inteira) dá este ouro, além dos fragmentos. */
  ouroDaVitoria: 150,
  /** A primeira vitória em cada dificuldade dá estes Diamantes. */
  diamantesDaPrimeiraVitoria: 10,
} as const;

/**
 * Chefes Especiais de cada dificuldade. PROVISÓRIO: por enquanto são os monstros-chave da Caçada; o Yuri vai dizer
 * quem são os chefes Especiais de verdade e esta tabela é o único lugar a mudar. Na 9★ (que não tem monstro-chave)
 * os 2 chefes são sorteados entre os monstros da estrela.
 */
export const CHEFES_ESPECIAIS: Readonly<Record<DificuldadeBatalha, readonly string[]>> = {
  facil: ['nythrakka-matriarca-do-casulo'],
  medio: ['raizark'],
  dificil: ['dromvark'],
  muitoDificil: ['tharvok'],
  inferno: ['oryndrak', 'reydras', 'dravakhar', 'urdumor'],
};

/** Nível pedido pela vitrine das Provações (src/rules/provacoes.ts). */
export const NIVEL_BATALHA_SANGRENTA = PROVACOES.find((p) => p.id === 'batalha-sangrenta')?.nivelRequerido ?? 20;

export type MotivoBloqueioBatalha = 'nivelInsuficiente' | 'semTentativas' | 'dificuldadeInvalida' | 'dificuldadeBloqueada';

export const MENSAGEM_BLOQUEIO_BATALHA: Readonly<Record<MotivoBloqueioBatalha, string>> = {
  nivelInsuficiente: 'Nível insuficiente para a Batalha Sangrenta',
  semTentativas: 'Você já usou as tentativas de hoje da Batalha Sangrenta',
  dificuldadeInvalida: 'Dificuldade da Batalha Sangrenta inválida',
  dificuldadeBloqueada: 'Vença a dificuldade anterior da Batalha Sangrenta para liberar esta',
};

/** Contagem de tentativas do dia (o dia vale em Brasília). */
export interface EstadoBatalhaSangrenta {
  dia: string;
  tentativas: number;
}

/** Dia (AAAA-MM-DD) no fuso de Brasília: o contador zera à meia-noite de lá. */
export function diaDeBrasilia(data: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
}

export function tentativasUsadasHoje(estado: EstadoBatalhaSangrenta | undefined, agora: Date): number {
  return estado && estado.dia === diaDeBrasilia(agora) ? estado.tentativas : 0;
}

export function tentativasRestantes(estado: EstadoBatalhaSangrenta | undefined, agora: Date): number {
  return Math.max(0, BATALHA_SANGRENTA.tentativasPorDia - tentativasUsadasHoje(estado, agora));
}

/** O estado depois de gastar uma tentativa agora. */
export function gastarTentativa(estado: EstadoBatalhaSangrenta | undefined, agora: Date): EstadoBatalhaSangrenta {
  return { dia: diaDeBrasilia(agora), tentativas: tentativasUsadasHoje(estado, agora) + 1 };
}

export function ehDificuldadeBatalha(valor: unknown): valor is DificuldadeBatalha {
  return typeof valor === 'string' && valor in DIFICULDADES_BATALHA_MAP;
}

/** A Fácil está sempre aberta; as outras abrem ao vencer a anterior pelo menos uma vez. */
export function dificuldadeLiberada(id: DificuldadeBatalha, vencidas: readonly string[] | undefined): boolean {
  const indice = DIFICULDADES_BATALHA.findIndex((d) => d.id === id);
  if (indice <= 0) return indice === 0;
  return (vencidas ?? []).includes(DIFICULDADES_BATALHA[indice - 1].id);
}

export function conferirEntradaBatalha(
  dificuldade: unknown,
  nivel: number,
  estado: EstadoBatalhaSangrenta | undefined,
  vencidas: readonly string[] | undefined,
  agora: Date
): { ok: true; dificuldade: DefinicaoDificuldade } | { ok: false; motivo: MotivoBloqueioBatalha } {
  if (!ehDificuldadeBatalha(dificuldade)) return { ok: false, motivo: 'dificuldadeInvalida' };
  if (nivel < NIVEL_BATALHA_SANGRENTA) return { ok: false, motivo: 'nivelInsuficiente' };
  if (!dificuldadeLiberada(dificuldade, vencidas)) return { ok: false, motivo: 'dificuldadeBloqueada' };
  if (tentativasRestantes(estado, agora) <= 0) return { ok: false, motivo: 'semTentativas' };
  return { ok: true, dificuldade: DIFICULDADES_BATALHA_MAP[dificuldade] };
}

export interface OndaBatalha {
  monstroId: string;
  chefe: boolean;
}

/** Gerador simples e determinístico a partir da semente (mulberry32). */
function geradorDaSemente(semente: number): () => number {
  let a = (Math.floor(semente) ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: readonly T[], sorteio: () => number): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/**
 * Monta as ondas: 4 monstros comuns da estrela da dificuldade (sorteados, sem repetir) e, por último, o(s) chefe(s)
 * Especial(is). Na dificuldade com mais de um chefe, eles são sorteados entre os candidatos da tabela.
 */
export function montarOndas(dificuldade: DefinicaoDificuldade, semente: number): OndaBatalha[] {
  const sorteio = geradorDaSemente(semente);
  const chefes = embaralhar(CHEFES_ESPECIAIS[dificuldade.id], sorteio).slice(0, dificuldade.chefes);
  const daEstrela = MONSTROS_CACADA_DADOS.filter((d) => d.estrela === dificuldade.estrela);
  // Comuns: da estrela, sem o monstro-chave e sem os chefes desta batalha; se não sobrar ninguém, usa a estrela toda.
  let comuns = daEstrela.filter((d) => !d.chave && !chefes.includes(d.id));
  if (comuns.length === 0) comuns = daEstrela;
  const embaralhados = embaralhar(comuns, sorteio);
  const ondas: OndaBatalha[] = [];
  for (let i = 0; i < BATALHA_SANGRENTA.ondasComuns; i++) {
    const m = embaralhados[i % embaralhados.length];
    if (m) ondas.push({ monstroId: m.id, chefe: false });
  }
  for (const id of chefes) ondas.push({ monstroId: id, chefe: true });
  return ondas;
}

export interface RecompensaBatalha {
  fragmentosAlma: number;
  /** Só no Inferno, e só com a sorte dos 20%: de qual subclasse e quantos. */
  fragmentosSubclasse: { subclasseId: string; quantidade: number } | null;
  /** Vitória: 150 de ouro; derrota: 50 de ouro de consolo. */
  ouro: number;
  /** 10 Diamantes na primeira vitória em cada dificuldade. */
  diamantes: number;
}

const inteiroEntre = (min: number, max: number, sorteio: () => number) => min + Math.floor(sorteio() * (max - min + 1));

/**
 * Vitória (todos os chefes vencidos): fragmentos de alma sorteados dentro da faixa da dificuldade, 150 de ouro, 10
 * Diamantes se for a primeira vitória nesta dificuldade e, no Inferno, 20% de chance de 1 a 2 fragmentos de uma
 * subclasse sorteada entre as 12. Derrota: só 50 de ouro.
 */
export function recompensaDaBatalha(
  dificuldade: DefinicaoDificuldade,
  venceu: boolean,
  semente: number,
  primeiraVitoria = false
): RecompensaBatalha {
  if (!venceu) return { fragmentosAlma: 0, fragmentosSubclasse: null, ouro: BATALHA_SANGRENTA.ouroDaDerrota, diamantes: 0 };
  const sorteio = geradorDaSemente(semente ^ 0x51ed270b);
  const fragmentosAlma = inteiroEntre(dificuldade.fragmentos.min, dificuldade.fragmentos.max, sorteio);
  let fragmentosSubclasse: RecompensaBatalha['fragmentosSubclasse'] = null;
  const extra = dificuldade.fragmentosSubclasse;
  if (extra) {
    const cai = sorteio() * 100 < extra.chancePercentual;
    const subclasse = SUBCLASSES[Math.floor(sorteio() * SUBCLASSES.length)];
    const quantidade = inteiroEntre(extra.min, extra.max, sorteio);
    if (cai && subclasse) fragmentosSubclasse = { subclasseId: subclasse.id, quantidade };
  }
  return {
    fragmentosAlma,
    fragmentosSubclasse,
    ouro: BATALHA_SANGRENTA.ouroDaVitoria,
    diamantes: primeiraVitoria ? BATALHA_SANGRENTA.diamantesDaPrimeiraVitoria : 0,
  };
}

/** Semente de cada onda, derivada da semente da tentativa. */
export function sementeDaOnda(semente: number, indice: number): number {
  return (Math.abs(Math.floor(semente)) + (indice + 1) * 7919) % 2147483647;
}
