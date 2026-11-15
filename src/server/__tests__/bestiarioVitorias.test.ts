import { describe, expect, it } from 'vitest';
import { progressoDasVitorias } from '../characterService';

const base = { maestrias: undefined, equipamento: undefined, armas: [], estatisticas: undefined, diario: undefined } as Record<string, unknown>;
const detalhe = (monstroId?: string) => ({ ...(monstroId ? { monstroId } : {}), elementos: [], contadores: {} }) as never;

describe('Bestiário: cada vitória soma na mesma gravação', () => {
  it('soma 1 XP por criatura vencida e guarda as já existentes', () => {
    const r = progressoDasVitorias({ ...base, bestiario: { 'rato-da-floresta': 2 } } as never, [false, false], new Date('2026-01-01T12:00:00Z'), [detalhe('rato-da-floresta'), detalhe('lobo-cinzento')]);
    expect(r.bestiario).toEqual({ 'rato-da-floresta': 3, 'lobo-cinzento': 1 });
  });
  it('sem criatura identificada, não mexe no Bestiário', () => {
    const r = progressoDasVitorias(base as never, [false], new Date('2026-01-01T12:00:00Z'), [detalhe()]);
    expect(r.bestiario).toBeUndefined();
  });
});
