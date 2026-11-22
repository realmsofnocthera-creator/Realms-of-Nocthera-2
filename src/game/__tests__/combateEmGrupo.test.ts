import { describe, it, expect, vi } from 'vitest';
import { resolverCombate, resolverCombateEmGrupo, type Combatente } from '@/game/combat';
import { montarChefeDoTeste } from '@/rules/testeEquipe';
import type { MonsterDefinition } from '@/rules/monsters';

// Estes testes conferem a mecânica com números exatos: o ajuste de dano por classe (Balanceamento 2.4) fica desligado aqui e tem testes próprios.
vi.mock('@/rules/ajusteDeClasses', async (original) => ({ ...(await original<typeof import('@/rules/ajusteDeClasses')>()), fatorDeDanoDaClasse: () => 100 }));


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
    const vida = 8000;
    const sozinho = resolverCombate(aliado('A', 60, 120), chefe(vida, 120), 5);
    expect(sozinho.vencedor).toBe('monstro');
    const grupo = resolverCombateEmGrupo([aliado('A', 60, 140), aliado('B', 60, 140), aliado('C', 60, 140)], chefe(vida, 120), 5);
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
    expect(montarChefeDoTeste('alma', 1, 3).hp).toBe(montarChefeDoTeste('alma', 1, 1).hp * 3);
    expect(montarChefeDoTeste('corpo', 6, 2).hp).toBeGreaterThan(montarChefeDoTeste('corpo', 1, 2).hp);
  });

  it('o replay traz os turnos de cada aliado, na ordem das rodadas, com o chefe compartilhado', () => {
    const r = resolverCombateEmGrupo([aliado('A', 60, 140), aliado('B', 60, 140), aliado('C', 60, 140)], chefe(8000, 120), 5);
    expect(r.replay).toHaveLength(3);
    for (const turnos of r.replay) {
      expect(turnos.length).toBeGreaterThan(0);
      const rodadas = turnos.map((t) => t.rodada);
      expect(rodadas).toEqual([...rodadas].sort((a, b) => a - b));
      expect(turnos[0].turno.ataques.length).toBeGreaterThan(0);
    }
    // a vida do chefe nos golpes só desce (é a mesma para todos) e termina em zero na vitória
    const golpes = r.replay.flatMap((turnos, i) => turnos.flatMap((t) => t.turno.ataques.filter((a) => a.defensor === 'Chefe de Teste').map((a) => ({ rodada: t.rodada, i, hp: a.hpRestante }))));
    golpes.sort((a, b) => a.rodada - b.rodada || a.i - b.i);
    for (let k = 1; k < golpes.length; k++) expect(golpes[k].hp).toBeLessThanOrEqual(golpes[k - 1].hp);
    expect(golpes[golpes.length - 1].hp).toBe(0);
  });

  it('nomes repetidos viram "Nome (2)", para o replay saber quem agiu', () => {
    const r = resolverCombateEmGrupo([aliado('Igual', 60, 120), aliado('Igual', 60, 120), aliado('Outro', 60, 120)], chefe(8000, 80), 5);
    expect(r.aliados.map((a) => a.nome)).toEqual(['Igual', 'Igual (2)', 'Outro']);
  });
});
