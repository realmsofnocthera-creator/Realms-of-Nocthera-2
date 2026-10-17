import type { AnuncioDados } from '@/rules/anuncio';

/** Textos e conversões de data dos anúncios (sem React). */

const DATA = { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' } as const;

/** ISO (UTC) → valor de <input type="datetime-local"> no horário do aparelho ("" se vazio). */
export function paraCampoDeData(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Valor de <input type="datetime-local"> (horário do aparelho) → ISO (UTC), ou null se vazio ou inválido. */
export function deCampoDeData(valor: string): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "De 20/10/2026 10:00 até 25/10/2026 18:00 (Brasília)", "A partir de ...", "Até ..." ou "Sem data marcada". */
export function descreverJanela(a: Pick<AnuncioDados, 'inicio' | 'fim'>): string {
  const f = (iso: string) => new Date(iso).toLocaleString('pt-BR', DATA);
  if (a.inicio && a.fim) return `De ${f(a.inicio)} até ${f(a.fim)} (Brasília)`;
  if (a.inicio) return `A partir de ${f(a.inicio)} (Brasília)`;
  if (a.fim) return `Até ${f(a.fim)} (Brasília)`;
  return 'Sem data marcada';
}
