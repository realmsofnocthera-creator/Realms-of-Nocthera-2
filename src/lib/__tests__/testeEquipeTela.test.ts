import { describe, expect, it } from 'vitest';
import { maiorRaridadeDaDificuldade, podeIniciar, segmentosDoFeixe } from '../testeEquipeTela';
import { DIFICULDADES_DO_TESTE, raridadesDaDificuldade } from '@/rules/testeEquipe';

describe('tela do Teste de Equipe', () => {
  it('a raridade mais alta de cada dificuldade: de comuns a míticas', () => {
    const maiores = Array.from({ length: DIFICULDADES_DO_TESTE }, (_, i) => maiorRaridadeDaDificuldade(raridadesDaDificuldade(i + 1)));
    expect(maiores).toEqual([0, 1, 2, 3, 4, 5].map((n, i) => (i === 4 ? 4 : n)));
  });

  it('os feixes acendem entre dois membros prontos', () => {
    expect(segmentosDoFeixe([])).toEqual([false, false]);
    expect(segmentosDoFeixe([{ pronto: true }, { pronto: false }])).toEqual([false, false]);
    expect(segmentosDoFeixe([{ pronto: true }, { pronto: true }])).toEqual([true, false]);
    expect(segmentosDoFeixe([{ pronto: true }, { pronto: true }, { pronto: true }])).toEqual([true, true]);
    expect(segmentosDoFeixe([{ pronto: false }, { pronto: true }, { pronto: true }])).toEqual([false, true]);
  });

  it('só o líder inicia, com 2 ou mais, todos prontos, a dificuldade aberta e a chave (ou o selo)', () => {
    const base = { souLider: true, membros: 2, todosProntos: true, liberada: true, custo: 'chave' as const, chaves: 1, selos: 0 };
    expect(podeIniciar(base)).toBe(true);
    expect(podeIniciar({ ...base, souLider: false })).toBe(false);
    expect(podeIniciar({ ...base, membros: 1 })).toBe(false);
    expect(podeIniciar({ ...base, todosProntos: false })).toBe(false);
    expect(podeIniciar({ ...base, liberada: false })).toBe(false);
    expect(podeIniciar({ ...base, chaves: 0 })).toBe(false);
    expect(podeIniciar({ ...base, custo: 'selo', selos: 0, chaves: 5 })).toBe(false);
    expect(podeIniciar({ ...base, custo: 'selo', selos: 1, chaves: 0 })).toBe(true);
  });
});
