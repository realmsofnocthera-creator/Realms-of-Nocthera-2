import crypto from 'node:crypto';

/**
 * Semente do combate, gerada SEMPRE no servidor (0.5-B1). O combate é determinístico por
 * semente; se o cliente pudesse escolhê-la, escolheria uma semente vencedora.
 */
export function gerarSemente(): number {
  return crypto.randomInt(1, 2 ** 31 - 1);
}

/** Id de combate aceito do cliente para idempotência de reenvios (0.5-B3). */
export function combatIdValido(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(valor);
}
