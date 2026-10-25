import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombatePvp } from '@/game/combat';
import { EquipamentoCombate } from '@/game/combate/equipamentoCombate';
import { efeitosVazios, GatilhoNoCombate } from '@/game/emblemasEfeitos';

/** Luta entre dois jogadores (Arena, 7.5): os dois lados usam status da arma, armadura e emblemas. */

const SEM_BONUS: EquipamentoCombate = {
  bonusDanoFisicoPercentual: 0,
  bonusDanoMagicoPercentual: 0,
  bonusChanceCriticoPontos: 0,
  bonusChanceEfeitosPontos: 0,
  statusArma: [],
  elementosArma: [],
};

function jogador(nome: string, extra: Partial<Combatente> = {}): Combatente {
  return {
    nome,
    racaId: 'humano',
    classeId: 'barbaro',
    nivel: 20,
    hp: 3000,
    hpMax: 3000,
    sobreescudo: 0,
    mitigacao: 0,
    atributos: { vigor: 20, sorte: 5, forca: 40, vitalidade: 20, arcano: 0, inteligencia: 0, agilidade: 10 },
    ...extra,
  };
}

const gatilho = (g: Omit<GatilhoNoCombate, 'id' | 'nome'>): GatilhoNoCombate => ({ id: 'teste:0', nome: 'Teste', ...g });

describe('Combate PvP (7.5)', () => {
  it('é determinístico e não mexe nas fichas recebidas', () => {
    const a = jogador('Aldric');
    const b = jogador('Borin', { classeId: 'cavaleiro' });
    const copiaA = structuredClone(a);
    const r1 = resolverCombatePvp(a, b, 77);
    const r2 = resolverCombatePvp(a, b, 77);
    expect(r2).toEqual(r1);
    expect(a).toEqual(copiaA);
    expect(['a', 'b', 'ninguem']).toContain(r1.vencedor);
    // os dois lados atacam
    const atacantes = new Set(r1.logTurnos.flatMap((t) => t.ataques.map((x) => x.atacante)));
    expect(atacantes).toEqual(new Set(['Aldric', 'Borin']));
  });

  it('o status da arma de quem defende pega em quem atacou (com o nome do alvo no evento)', () => {
    const a = jogador('Aldric');
    const b = jogador('Borin', { equipamento: { ...SEM_BONUS, statusArma: ['veneno'], bonusChanceEfeitosPontos: 100 } });
    const eventos = resolverCombatePvp(a, b, 5).logTurnos.flatMap((t) => t.eventosEfeitos);
    expect(eventos.some((e) => e.efeito === 'veneno' && e.alvo === 'Aldric')).toBe(true);
    expect(eventos.some((e) => e.efeito === 'veneno' && e.alvo === 'Borin')).toBe(false);
  });

  it('os emblemas dos dois lados disparam', () => {
    const curaAoSerAtacado = gatilho({ quando: { evento: 'atacadoPorInimigo' }, resultado: { cura: 2 } });
    const comEmblema = (nome: string) =>
      jogador(nome, { equipamento: { ...SEM_BONUS, emblemas: { ...efeitosVazios(), gatilhos: [{ ...curaAoSerAtacado, nome: `Emblema de ${nome}` }] } } });
    const r = resolverCombatePvp(comEmblema('Aldric'), comEmblema('Borin'), 9);
    const msgs = r.logTurnos.flatMap((t) => t.eventosMecanica ?? []);
    expect(msgs.some((m) => m.includes('Emblema de Aldric'))).toBe(true);
    expect(msgs.some((m) => m.includes('Emblema de Borin'))).toBe(true);
  });

  it('no limite de rodadas vence quem tem mais vida em %; empate faz os dois perderem', () => {
    // quase sem dano dos dois lados: chega ao limite
    const tanque = (nome: string, hp: number, hpMax: number) =>
      jogador(nome, { hp, hpMax, atributos: { vigor: 1, sorte: 0, forca: 0, vitalidade: 1, arcano: 0, inteligencia: 0, agilidade: 1 } });
    const r = resolverCombatePvp(tanque('Aldric', 900_000, 1_000_000), tanque('Borin', 2_000_000, 2_000_000), 3);
    expect(r.motivoFim).toBe('limite_rodadas');
    expect(r.vencedor).toBe('b');
    expect(r.logTurnos).toHaveLength(100);
    const empate = resolverCombatePvp(tanque('Aldric', 1_000_000, 1_000_000), tanque('Borin', 1_000_000, 1_000_000), 3);
    expect(empate.motivoFim).toBe('limite_rodadas');
    if (empate.finalA.hp / empate.finalA.hpMax === empate.finalB.hp / empate.finalB.hpMax) expect(empate.vencedor).toBe('ninguem');
  });

  it('nomes iguais viram nomes diferentes', () => {
    const r = resolverCombatePvp(jogador('Aldric'), jogador('Aldric'), 1);
    expect(r.finalB.nome).toBe('Aldric (defensor)');
    expect(new Set(r.logTurnos.flatMap((t) => t.ataques.map((x) => x.atacante))).size).toBe(2);
  });

  it('duas cópias iguais: nenhum lado leva vantagem desproporcional', () => {
    let vitoriasA = 0;
    for (let seed = 1; seed <= 200; seed++) if (resolverCombatePvp(jogador('Aldric'), jogador('Borin'), seed).vencedor === 'a') vitoriasA++;
    expect(vitoriasA).toBeGreaterThan(50);
    expect(vitoriasA).toBeLessThan(150);
  });
});
