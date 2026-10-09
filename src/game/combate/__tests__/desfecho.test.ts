import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { decidirDesfecho } from '@/game/combate/desfecho';
import { MonsterDefinition } from '@/rules/monsters';

/** 1.11.1 — empate e limite de rodadas (decisão do Yuri, 09/10/2026). */

describe('1.11.1 — decidirDesfecho', () => {
  it('um lado cai: o outro vence', () => {
    expect(decidirDesfecho({ hpJogador: 10, hpOponente: 0, limiteAtingido: false, modo: 'pve' })).toEqual({ vencedor: 'jogador', empate: false, motivo: 'derrota' });
    expect(decidirDesfecho({ hpJogador: 0, hpOponente: 10, limiteAtingido: false, modo: 'pve' })).toEqual({ vencedor: 'oponente', empate: false, motivo: 'derrota' });
  });

  it('os dois caem juntos: no PvE o jogador perde; no PvP os dois perdem', () => {
    expect(decidirDesfecho({ hpJogador: 0, hpOponente: 0, limiteAtingido: false, modo: 'pve' })).toEqual({ vencedor: 'oponente', empate: true, motivo: 'derrota' });
    expect(decidirDesfecho({ hpJogador: 0, hpOponente: 0, limiteAtingido: false, modo: 'pvp' })).toEqual({ vencedor: 'ninguem', empate: true, motivo: 'derrota' });
  });

  it('limite de rodadas: vence quem tem mais HP', () => {
    expect(decidirDesfecho({ hpJogador: 50, hpOponente: 40, limiteAtingido: true, modo: 'pve' }).vencedor).toBe('jogador');
    expect(decidirDesfecho({ hpJogador: 40, hpOponente: 50, limiteAtingido: true, modo: 'pve' }).vencedor).toBe('oponente');
    expect(decidirDesfecho({ hpJogador: 40, hpOponente: 50, limiteAtingido: true, modo: 'pvp' }).vencedor).toBe('oponente');
  });

  it('limite de rodadas com o mesmo HP é empate (PvE: jogador perde; PvP: ninguém vence)', () => {
    expect(decidirDesfecho({ hpJogador: 40, hpOponente: 40, limiteAtingido: true, modo: 'pve' })).toEqual({ vencedor: 'oponente', empate: true, motivo: 'limite_rodadas' });
    expect(decidirDesfecho({ hpJogador: 40, hpOponente: 40, limiteAtingido: true, modo: 'pvp' })).toEqual({ vencedor: 'ninguem', empate: true, motivo: 'limite_rodadas' });
  });
});

describe('1.11.1 — no combate (resolverCombate)', () => {
  const atributos = { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 };
  const monstro = (hp: number): MonsterDefinition => ({
    id: 'maratona', nome: 'Maratonista', nivel: 1, hp, categoriaCorporal: 'feral', atributos,
    xpConcedido: 10, ouroConcedido: { min: 1, max: 1 },
  });
  const heroi = (hp: number): Combatente => ({ nome: 'Heroi', hp, hpMax: hp, sobreescudo: 0, mitigacao: 0, atributos });

  it('passou de 100 rodadas e o jogador tem mais HP: o jogador vence', () => {
    const r = resolverCombate(heroi(2_000_000), monstro(1_000_000), 5);
    expect(r.motivoFim).toBe('limite_rodadas');
    expect(r.vencedor).toBe('personagem');
    expect(r.mensagens.join(' ')).toContain('Limite de 100 rodadas');
  });

  it('passou de 100 rodadas e o monstro tem mais HP: o monstro vence (antes o jogador vencia só por estar de pé)', () => {
    const r = resolverCombate(heroi(1_000_000), monstro(2_000_000), 5);
    expect(r.motivoFim).toBe('limite_rodadas');
    expect(r.vencedor).toBe('monstro');
    expect(r.empate).toBeUndefined();
  });

  it('luta normal: motivo é derrota e não há empate', () => {
    const r = resolverCombate(heroi(1000), monstro(5), 5);
    expect(r.motivoFim).toBe('derrota');
    expect(r.vencedor).toBe('personagem');
    expect(r.empate).toBeUndefined();
  });
});
