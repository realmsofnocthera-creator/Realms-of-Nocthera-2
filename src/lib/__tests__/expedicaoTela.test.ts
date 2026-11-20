import { describe, expect, it } from 'vitest';
import { faltaDepoisDoAvanco, horasValidas, limiteDoAvanco, progressoDaExpedicao } from '../expedicaoTela';
import { HORA_MS } from '@/rules/expedicao';

describe('Expedição: acelerar com Avanços', () => {
  it('o limite vai de 1 hora até o que falta (para cima) e nunca passa dos Avanços do jogador', () => {
    expect(limiteDoAvanco(4.2 * HORA_MS, 7)).toBe(5);
    expect(limiteDoAvanco(12 * HORA_MS, 3)).toBe(3);
    expect(limiteDoAvanco(HORA_MS, 9)).toBe(1);
    expect(limiteDoAvanco(1_000, 9)).toBe(1);
    expect(limiteDoAvanco(2 * HORA_MS, 2)).toBe(2);
  });

  it('sem Avanços ou com a expedição pronta, não dá para usar', () => {
    expect(limiteDoAvanco(5 * HORA_MS, 0)).toBe(0);
    expect(limiteDoAvanco(0, 5)).toBe(0);
    expect(limiteDoAvanco(-10, 5)).toBe(0);
  });

  it('a escolha fica entre 1 e o limite (que cai com o tempo)', () => {
    expect(horasValidas(0, 5)).toBe(1);
    expect(horasValidas(3, 5)).toBe(3);
    expect(horasValidas(9, 5)).toBe(5);
    expect(horasValidas(4, 2)).toBe(2);
    expect(horasValidas(3, 0)).toBe(0);
  });

  it('o que sobra do tempo depois de usar: 0 quando termina na hora', () => {
    expect(faltaDepoisDoAvanco(4.2 * HORA_MS, 3)).toBeCloseTo(1.2 * HORA_MS);
    expect(faltaDepoisDoAvanco(4.2 * HORA_MS, 5)).toBe(0);
  });

  it('o progresso da expedição vai de 0 a 1', () => {
    const e = { inicio: new Date(0).toISOString(), fim: new Date(4 * HORA_MS).toISOString() };
    expect(progressoDaExpedicao(e, 0)).toBe(0);
    expect(progressoDaExpedicao(e, HORA_MS)).toBeCloseTo(0.25);
    expect(progressoDaExpedicao(e, 9 * HORA_MS)).toBe(1);
  });
});
