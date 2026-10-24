import type { SancaoEmVigor } from '@/rules/sancoes';
import type { TransactionDocument } from '@/server/characterService';

/** Textos da aba Jogadores do Painel do Mestre (sem React). */

const NOME_DA_MOEDA: Readonly<Record<string, string>> = {
  ouro: 'ouro',
  diamantes: 'Diamantes',
  fragmentosAlma: 'fragmentos de alma',
  fragmentosSubclasse: 'fragmentos de subclasse',
  essenciaHabilidade: 'essência de habilidade',
  fragmentosAscensao: 'fragmentos de ascensão',
  essenciaDeSoberano: 'Essência de Soberano',
  cartas: 'cartas da Alma',
  emblemas: 'emblemas',
};

/** "+250 ouro" ou "−3 Diamantes". */
export function descreverTransacao(t: Pick<TransactionDocument, 'tipo' | 'quantidade' | 'moeda'>): string {
  const sinal = t.tipo === 'ganho' ? '+' : '−';
  return `${sinal}${t.quantidade.toLocaleString('pt-BR')} ${NOME_DA_MOEDA[t.moeda ?? 'ouro'] ?? t.moeda}`;
}

/** "saldo 1.250 → 1.500" (só nas linhas que guardam o saldo, 6.5-3). */
export function saldoDaTransacao(t: Pick<TransactionDocument, 'saldoAntes' | 'saldoDepois'>): string | null {
  if (typeof t.saldoAntes !== 'number' || typeof t.saldoDepois !== 'number') return null;
  return `saldo ${t.saldoAntes.toLocaleString('pt-BR')} → ${t.saldoDepois.toLocaleString('pt-BR')}`;
}

/** A situação da conta numa frase curta, com a cor de aviso: livre, suspensa (com o prazo) ou banida. */
export function situacaoDaConta(s: SancaoEmVigor | null): { texto: string; tom: 'ok' | 'aviso' | 'perigo' } {
  if (!s) return { texto: 'Conta livre', tom: 'ok' };
  if (s.tipo === 'banimento') return { texto: 'Banida', tom: 'perigo' };
  const ate = s.ate ? new Date(s.ate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '';
  return { texto: `Suspensa até ${ate}`, tom: 'aviso' };
}
