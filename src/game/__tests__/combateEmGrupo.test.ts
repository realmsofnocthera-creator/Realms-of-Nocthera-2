import { describe, it, expect } from 'vitest';
import { resolverCombate, resolverCombateEmGrupo, type Combatente } from '@/game/combat';
import { montarChefeDoTeste } from '@/rules/testeEquipe';
import type { MonsterDefinition } from '@/rules/monsters';

const aliado = (nome: string, forca: number, vigor = 300): Combatente => ({
  nome,
  hp: vigor * 10,
  hpMax: vigor * 10,
  sobreescudo: 0,
  atributos: { vigor, sorte: 0, forca, vitalidade: 50, arcano: 0, inteligencia: 0, agilidade: 30 },
  racaId: 'humano',
  classeId: 'cavaleiro',
  nivel: 30,
  ouro: 0,
});

const chefe = (hp: number, forca = 60): MonsterDefinition => ({
  id: 'chefe-teste',
  nome: 'Chefe de Teste',
  nivel: 30,
  hp,
  chefe: true,
  categoriaCorporal: 'feral',
  atributos: { vigor: 20, sorte: 0, forca, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
  xpConcedido: 0,
  ouroConcedido: { min: 0, max: 0 },
});

describe('Luta em grupo (Teste de Equipe)', () => {
  it('o motor por rodadas dá o mesmo resultado da luta de sempre (1x1)', () => {
    const r1 = resolverCombate(aliado('A', 120), chefe(5000), 77);
    const r2 = resolverCombate(aliado('A', 120), chefe(5000), 77);
    expect(r1).toEqual(r2);
  });

  it('três aliados derrubam juntos um chefe que um sozinho não derruba', () => {
    const vida = 12000;
    const sozinho = resolverCombate(aliado('A', 60, 120), chefe(vida, 120), 5);
    expect(sozinho.vencedor).toBe('monstro');
    const grupo = resolverCombateEmGrupo([aliado('A', 60, 120), aliado('B', 60, 120), aliado('C', 60, 120)], chefe(vida, 120), 5);
    expect(grupo.vencedor).toBe('grupo');
    expect(grupo.chefeFinal.hp).toBe(0);
    const total = grupo.aliados.reduce((s, a) => s + a.dano, 0);
    expect(total).toBeGreaterThanOrEqual(vida);
    for (const a of grupo.aliados) expect(a.dano).toBeGreaterThan(0);
  });

  it('todos caem: derrota, com a rodada de cada queda', () => {
    const r = resolverCombateEmGrupo([aliado('A', 5, 10), aliado('B', 5, 10)], { ...chefe(1_000_000), atributos: { vigor: 50, sorte: 0, forca: 400, vitalidade: 50, arcano: 0, inteligencia: 0, agilidade: 50 } }, 9);
    expect(r.vencedor).toBe('monstro');
    expect(r.aliados.every((a) => a.caiuNaRodada !== null)).toBe(true);
  });

  it('é determinística pela semente', () => {
    const a = resolverCombateEmGrupo([aliado('A', 80), aliado('B', 70)], chefe(20000), 3);
    const b = resolverCombateEmGrupo([aliado('A', 80), aliado('B', 70)], chefe(20000), 3);
    expect(a).toEqual(b);
  });

  it('o chefe do Teste tem mais vida com party maior', () => {
    expect(montarChefeDoTeste(1, 3).hp).toBe(montarChefeDoTeste(1, 1).hp * 3);
    expect(montarChefeDoTeste(10, 2).hp).toBeGreaterThan(montarChefeDoTeste(1, 2).hp);
  });
});
