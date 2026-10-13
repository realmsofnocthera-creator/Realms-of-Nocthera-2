import { MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { PROVACOES } from '@/rules/provacoes';
import { estrelasLiberadas } from './cacada';

/**
 * Provação de Batalha Sangrenta — regras puras (sem banco). Decididas pelo Yuri em 13/10/2026:
 * 5 lutas seguidas contra monstros da estrela do jogador, a última contra um chefe; o HP não volta entre as
 * lutas; 1 fragmento de alma por onda vencida e mais 3 do chefe; 3 tentativas por dia.
 */
export const BATALHA_SANGRENTA = {
  ondas: 5,
  tentativasPorDia: 3,
  fragmentosAlmaPorOnda: 1,
  fragmentosAlmaDoChefe: 3,
  /** Fragmento da subclasse atual por chefe vencido (o tier 4 da subclasse gasta 5). */
  fragmentosSubclasseDoChefe: 1,
} as const;

/** Nível pedido pela vitrine das Provações (src/rules/provacoes.ts). */
export const NIVEL_BATALHA_SANGRENTA = PROVACOES.find((p) => p.id === 'batalha-sangrenta')?.nivelRequerido ?? 20;

export type MotivoBloqueioBatalha = 'nivelInsuficiente' | 'semTentativas';

export const MENSAGEM_BLOQUEIO_BATALHA: Readonly<Record<MotivoBloqueioBatalha, string>> = {
  nivelInsuficiente: 'Nível insuficiente para a Batalha Sangrenta',
  semTentativas: 'Você já usou as tentativas de hoje da Batalha Sangrenta',
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

export function conferirEntradaBatalha(
  nivel: number,
  estado: EstadoBatalhaSangrenta | undefined,
  agora: Date
): { ok: true } | { ok: false; motivo: MotivoBloqueioBatalha } {
  if (nivel < NIVEL_BATALHA_SANGRENTA) return { ok: false, motivo: 'nivelInsuficiente' };
  if (tentativasRestantes(estado, agora) <= 0) return { ok: false, motivo: 'semTentativas' };
  return { ok: true };
}

/** A estrela das ondas: a mais alta que o jogador já liberou na Caçada (nível e monstros-chave). */
export function estrelaDaBatalha(nivel: number, chavesVencidas: readonly number[] | undefined): number {
  const liberadas = estrelasLiberadas(nivel, chavesVencidas);
  return liberadas.length > 0 ? Math.max(...liberadas) : 1;
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

/**
 * Monta as 5 ondas da estrela: 4 monstros comuns sorteados (sem repetir enquanto houver monstros diferentes) e,
 * por último, o chefe: o monstro-chave da estrela ou, na 9★ (que não tem chave), um dos monstros da estrela.
 */
export function montarOndas(estrela: number, semente: number): OndaBatalha[] {
  const sorteio = geradorDaSemente(semente);
  const da = MONSTROS_CACADA_DADOS.filter((d) => d.estrela === estrela);
  const comuns = da.filter((d) => !d.chave);
  const chaves = da.filter((d) => d.chave);
  const embaralhados = [...comuns];
  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
  }
  const ondasComuns = BATALHA_SANGRENTA.ondas - 1;
  const ondas: OndaBatalha[] = [];
  for (let i = 0; i < ondasComuns; i++) {
    const m = embaralhados[i % embaralhados.length];
    if (m) ondas.push({ monstroId: m.id, chefe: false });
  }
  const candidatosChefe = chaves.length > 0 ? chaves : da;
  const chefe = candidatosChefe[Math.floor(sorteio() * candidatosChefe.length)];
  if (chefe) ondas.push({ monstroId: chefe.id, chefe: true });
  return ondas;
}

export interface RecompensaBatalha {
  fragmentosAlma: number;
  fragmentosSubclasse: number;
}

/**
 * 1 fragmento de alma por onda vencida (o chefe conta como uma) e mais 3 se vencer o chefe: até 8 por tentativa.
 * O fragmento da subclasse atual vem do chefe e só existe se o jogador tiver subclasse.
 */
export function recompensaDaBatalha(ondasVencidas: number, chefeVencido: boolean, temSubclasse: boolean): RecompensaBatalha {
  return {
    fragmentosAlma:
      Math.max(0, Math.min(BATALHA_SANGRENTA.ondas, ondasVencidas)) * BATALHA_SANGRENTA.fragmentosAlmaPorOnda +
      (chefeVencido ? BATALHA_SANGRENTA.fragmentosAlmaDoChefe : 0),
    fragmentosSubclasse: chefeVencido && temSubclasse ? BATALHA_SANGRENTA.fragmentosSubclasseDoChefe : 0,
  };
}

/** Semente de cada onda, derivada da semente da tentativa. */
export function sementeDaOnda(semente: number, indice: number): number {
  return (Math.abs(Math.floor(semente)) + (indice + 1) * 7919) % 2147483647;
}
