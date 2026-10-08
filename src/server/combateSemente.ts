import crypto from 'crypto';

/**
 * Semente do combate (0.5-B1): sempre gerada no servidor com fonte criptográfica.
 * O combate é determinístico por semente, então ela nunca pode vir do cliente.
 */
export function gerarSementeCombate(): number {
  return crypto.randomInt(0, 2 ** 31 - 1);
}
