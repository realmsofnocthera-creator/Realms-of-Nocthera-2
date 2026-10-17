/**
 * Origens extras que a política de segurança (CSP) libera para imagens: o armazenamento de arquivos (Cloudflare R2).
 * `*.r2.dev` cobre o endereço de teste mesmo que a variável não exista na hora do build; se R2_PUBLIC_URL apontar
 * para outro endereço (domínio próprio), a origem dele entra também. Sem imports com alias: next.config.ts usa este arquivo.
 */
export function origensDeImagemDoArmazenamento(publico: string | undefined): string[] {
  const origens = ['https://*.r2.dev'];
  if (publico) {
    try {
      const u = new URL(publico);
      if (u.protocol === 'https:' && !origens.includes(u.origin) && !u.hostname.endsWith('.r2.dev')) origens.push(u.origin);
    } catch {
      // endereço inválido: fica só o padrão
    }
  }
  return origens;
}
