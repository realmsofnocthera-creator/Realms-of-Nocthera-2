import { describe, it, expect } from 'vitest';
import { chefeDaSemana, entradaDoDocumento, faixaDaPosicao, fimDaSemana, montarChefeSemanal, participacoesDoDocumento, semanaDe } from '@/rules/chefeSemanal';

describe('Chefe de guildas (regras)', () => {
  it('a semana começa na segunda-feira, 0h de Brasília', () => {
    expect(semanaDe(new Date('2026-10-21T15:00:00Z'))).toBe('2026-10-19'); // quarta
    expect(semanaDe(new Date('2026-10-19T03:00:00Z'))).toBe('2026-10-19'); // segunda 0h em Brasília
    expect(semanaDe(new Date('2026-10-19T02:59:00Z'))).toBe('2026-10-12'); // ainda domingo em Brasília
    expect(semanaDe(new Date('2026-10-25T23:00:00Z'))).toBe('2026-10-19'); // domingo
    expect(fimDaSemana('2026-10-19')).toBe('2026-10-26');
  });

  it('os chefes provisórios se revezam por semana', () => {
    const a = chefeDaSemana('2026-10-19').id;
    const b = chefeDaSemana('2026-10-26').id;
    expect(a).not.toBe(b);
    expect(chefeDaSemana('2026-11-16').id).toBe(a);
    expect(montarChefeSemanal('2026-10-19').hp).toBe(1_000_000_000);
    expect(montarChefeSemanal('2026-10-19').sobreescudoInicial).toBeLessThan(10_000);
  });

  it('faixas do Yuri: 1º 2 baús lendários, 2º 1 lendário, 3º 4 épicos; 101º em diante sem baú', () => {
    expect(faixaDaPosicao(1).baus).toEqual([{ raridade: 'lendario', quantidade: 2 }]);
    expect(faixaDaPosicao(2).baus).toEqual([{ raridade: 'lendario', quantidade: 1 }]);
    expect(faixaDaPosicao(3).baus).toEqual([{ raridade: 'epico', quantidade: 4 }]);
    expect(faixaDaPosicao(10).nome).toBe('4º ao 10º');
    expect(faixaDaPosicao(11).nome).toBe('11º ao 50º');
    expect(faixaDaPosicao(100).nome).toBe('51º ao 100º');
    expect(faixaDaPosicao(5000).baus).toEqual([]);
  });

  it('lê do banco com tolerância e recalcula o total', () => {
    const e = entradaDoDocumento({ semana: '2026-10-19', guildaId: 'g_a1b2c3', nomeDaGuilda: 'X', total: 999, membros: { u1: { nome: 'A', dano: 10 }, u2: { nome: 'B', dano: 'x' } } });
    expect(e).toEqual({ semana: '2026-10-19', guildaId: 'g_a1b2c3', nomeDaGuilda: 'X', total: 10, membros: { u1: { nome: 'A', dano: 10 } } });
    expect(entradaDoDocumento({})).toBeNull();
    expect(participacoesDoDocumento([{ semana: 'a', guildaId: 'g' }, 3, { semana: 'b', guildaId: 'g', resgatada: true }])).toEqual([{ semana: 'a', guildaId: 'g' }, { semana: 'b', guildaId: 'g', resgatada: true }]);
  });
});
