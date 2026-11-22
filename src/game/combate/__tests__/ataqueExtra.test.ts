import { describe, it, expect } from 'vitest';
import { chanceDeAtaqueExtraPorAgilidade } from '@/game/combate/ataqueExtra';
import { Combatente, resolverCombatePvp } from '@/game/combat';

describe('Balanceamento 2.2: ataque extra por Agilidade (chance gradual)', () => {
  it('chance = diferença sobre a soma, com teto de 40%: o dobro de Agilidade dá 33%, o triplo ou mais 40%', () => {
    expect(chanceDeAtaqueExtraPorAgilidade(20, 10)).toBeCloseTo(1 / 3, 5);
    expect(chanceDeAtaqueExtraPorAgilidade(30, 10)).toBe(0.4);
    expect(chanceDeAtaqueExtraPorAgilidade(100, 1)).toBe(0.4);
    expect(chanceDeAtaqueExtraPorAgilidade(10, 0)).toBe(0.4);
  });
  it('sem vantagem de Agilidade não há chance; sem Agilidade nenhuma, também não', () => {
    expect(chanceDeAtaqueExtraPorAgilidade(10, 10)).toBe(0);
    expect(chanceDeAtaqueExtraPorAgilidade(5, 20)).toBe(0);
    expect(chanceDeAtaqueExtraPorAgilidade(0, 0)).toBe(0);
    expect(chanceDeAtaqueExtraPorAgilidade(0, 5, true)).toBe(0);
  });
  it('o Sincronismo soma 10 pontos percentuais', () => {
    expect(chanceDeAtaqueExtraPorAgilidade(8, 5, true) - chanceDeAtaqueExtraPorAgilidade(8, 5)).toBeCloseTo(0.1, 5);
  });
  it('o PvP continua determinístico pela semente, com o ataque extra incluído', () => {
    const c = (nome: string, classeId: string, agilidade: number): Combatente => ({ nome, classeId, nivel: 20, hp: 900, hpMax: 900, sobreescudo: 100, atributos: { vigor: 30, sorte: 5, forca: 40, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade } });
    const a = resolverCombatePvp(c('A', 'bandido', 40), c('B', 'cavaleiro', 10), 123);
    const b = resolverCombatePvp(c('A', 'bandido', 40), c('B', 'cavaleiro', 10), 123);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(resolverCombatePvp(c('A', 'bandido', 40), c('B', 'cavaleiro', 10), 124)));
  });
});

describe('Balanceamento 2.4: o ajuste de dano da classe entra no golpe', () => {
  const atacante = (classeId: string): Combatente => ({ nome: 'A', classeId, nivel: 1, hp: 500, hpMax: 500, sobreescudo: 0, atributos: { vigor: 20, sorte: 0, forca: 100, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 } });
  const alvo = (): Combatente => ({ nome: 'Alvo', hp: 5000, hpMax: 5000, sobreescudo: 0, atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 } });
  it('o Bárbaro (+9%) bate mais forte que a mesma ficha sem ajuste, e o Samurai (−23%) mais fraco', async () => {
    const { turnoDeCombate } = await import('@/game/combat');
    const bruto = (c: string) => turnoDeCombate(atacante(c), alvo(), 1).turnoLog.ataques[0].danoBruto;
    expect(bruto('barbaro')).toBeGreaterThan(bruto('sem-ajuste'));
    expect(bruto('samurai')).toBeLessThan(bruto('sem-ajuste'));
  });
});
