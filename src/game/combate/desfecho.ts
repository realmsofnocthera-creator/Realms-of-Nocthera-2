/**
 * 1.11.1 — Desfecho do combate (decisão do Yuri, 09/10/2026):
 * - Empate (os dois caem juntos, ou o limite de rodadas termina com o mesmo HP): no PvP os dois perdem; no PvE o jogador perde.
 * - Passou do limite de rodadas: ganha quem tiver mais HP.
 */
export type ModoCombate = 'pve' | 'pvp';

export interface EntradaDesfecho {
  hpJogador: number;
  hpOponente: number;
  /** O combate parou por ter passado do limite de rodadas (os dois ainda de pé). */
  limiteAtingido: boolean;
  modo: ModoCombate;
}

export interface Desfecho {
  /** 'ninguem' só no PvP: empate em que os dois perdem. */
  vencedor: 'jogador' | 'oponente' | 'ninguem';
  empate: boolean;
  motivo: 'derrota' | 'limite_rodadas';
}

export function decidirDesfecho(e: EntradaDesfecho): Desfecho {
  const motivo = e.limiteAtingido ? 'limite_rodadas' : 'derrota';
  const empate = (vencedor: 'oponente' | 'ninguem'): Desfecho => ({
    vencedor: e.modo === 'pvp' ? 'ninguem' : vencedor,
    empate: true,
    motivo,
  });

  if (e.limiteAtingido) {
    if (e.hpJogador > e.hpOponente) return { vencedor: 'jogador', empate: false, motivo };
    if (e.hpJogador < e.hpOponente) return { vencedor: 'oponente', empate: false, motivo };
    return empate('oponente');
  }
  const jogadorCaiu = e.hpJogador <= 0;
  const oponenteCaiu = e.hpOponente <= 0;
  if (jogadorCaiu && oponenteCaiu) return empate('oponente');
  if (jogadorCaiu) return { vencedor: 'oponente', empate: false, motivo };
  return { vencedor: 'jogador', empate: false, motivo };
}
