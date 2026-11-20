import { HORA_MS, type ExpedicaoEmAndamento } from '@/rules/expedicao';

/** Lógica da tela da Expedição (acelerar com Avanços e progresso), sem React. */

/**
 * Quantos Avanços dá para usar de uma vez numa expedição: de 1 hora até o que falta para ela terminar (arredondado para cima,
 * pois cada Avanço tira 1 hora inteira) e nunca mais do que o jogador tem. 0 = não dá (sem Avanços ou já terminou).
 */
export function limiteDoAvanco(faltaMs: number, avancos: number): number {
  if (faltaMs <= 0 || avancos <= 0) return 0;
  return Math.min(Math.ceil(faltaMs / HORA_MS), Math.floor(avancos));
}

/** O que sobra do tempo depois de usar `horas` Avanços (0 = termina na hora). */
export function faltaDepoisDoAvanco(faltaMs: number, horas: number): number {
  return Math.max(0, faltaMs - horas * HORA_MS);
}

/** Mantém a escolha dentro de 1 e do limite (o limite cai conforme o tempo passa). */
export function horasValidas(escolha: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.min(limite, Math.max(1, Math.round(escolha)));
}

/** Quanto da expedição já passou (0 a 1), pelo tempo do servidor. */
export function progressoDaExpedicao(e: Pick<ExpedicaoEmAndamento, 'inicio' | 'fim'>, agoraMs: number): number {
  const inicio = Date.parse(e.inicio);
  const total = Date.parse(e.fim) - inicio;
  if (!(total > 0)) return 1;
  return Math.min(1, Math.max(0, (agoraMs - inicio) / total));
}
