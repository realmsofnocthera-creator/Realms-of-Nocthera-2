/** Lógica da tela do Chefe Mundial (textos do chefe, contagem e valores curtos), sem React. */

/** "Solvaris" de "Solvaris, o Arauto do Último Amanhecer". */
export function nomeCurtoDoChefe(nomeCompleto: string): string {
  return nomeCompleto.split(',')[0].trim();
}

/** "o Arauto do Último Amanhecer" do mesmo nome (sem o nome próprio). */
export function subtituloDoChefe(nomeCompleto: string): string {
  const i = nomeCompleto.indexOf(',');
  return i < 0 ? '' : nomeCompleto.slice(i + 1).trim();
}

/** O tempo até o ranking fechar, como HH:MM:SS (00:00:00 se já passou). */
export function tempoAteFechar(fechaEmIso: string, agoraMs: number): string {
  const s = Math.max(0, Math.floor((Date.parse(fechaEmIso) - agoraMs) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(h)}:${dois(m)}:${dois(seg)}`;
}

/** Um valor curto para caber num espaço pequeno: 950, 1,5K, 20K, 2,3M. */
export function valorCompacto(n: number): string {
  if (n < 1000) return String(n);
  const f = (v: number) => (v >= 100 ? Math.floor(v) : Math.floor(v * 10) / 10).toString().replace('.', ',');
  if (n < 1_000_000) return `${f(n / 1000)}K`;
  return `${f(n / 1_000_000)}M`;
}
