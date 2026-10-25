import { describe, it, expect } from 'vitest';
import { resolverCombatePvp, type Combatente } from '@/game/combat';
import { quadrosDaArena } from '@/lib/arenaReplay';

const jogador = (nome: string, extra: Partial<Combatente> = {}): Combatente => ({
  nome,
  racaId: 'humano',
  classeId: 'barbaro',
  nivel: 20,
  hp: 3000,
  hpMax: 3000,
  sobreescudo: 400,
  mitigacao: 0,
  atributos: { vigor: 20, sorte: 5, forca: 40, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
  ...extra,
});

describe('Replay da Arena (quadros)', () => {
  it('começa com vida e escudo cheios, segue os golpes e termina na vida final do resultado', () => {
    const r = resolverCombatePvp(jogador('Aldric'), jogador('Borin', { equipamento: { bonusDanoFisicoPercentual: 0, bonusDanoMagicoPercentual: 0, bonusChanceCriticoPontos: 0, bonusChanceEfeitosPontos: 100, statusArma: ['veneno'], elementosArma: [] } }), 4);
    const q = quadrosDaArena(r, { nome: 'Aldric', nivel: 20, hpMax: 3000, sobreescudo: 400 }, { nome: 'Borin', nivel: 20, hpMax: 3000, sobreescudo: 400 });
    expect(q[0].a).toMatchObject({ hp: 3000, escudo: 400 });
    expect(q[0].b).toMatchObject({ hp: 3000, escudo: 400 });
    const ultimo = q[q.length - 1];
    expect(ultimo.a.hp).toBe(r.finalA.hp);
    expect(ultimo.b.hp).toBe(r.finalB.hp);
    expect(q.length).toBeGreaterThan(r.logTurnos.length);
    // o veneno da arma do Borin aparece no Aldric em algum quadro
    expect(q.some((x) => x.a.status.includes('veneno'))).toBe(true);
    expect(ultimo.linhas.at(-1)).toMatch(/venceu|Empate/);
  });
});
