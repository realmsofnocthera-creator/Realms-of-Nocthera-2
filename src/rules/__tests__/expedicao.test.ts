import { describe, it, expect } from 'vitest';
import { expedicoesDoDocumento, NIVEL_DA_EXPEDICAO, TURNOS_DE_EXPEDICAO, VAGAS_DE_EXPEDICAO } from '@/rules/expedicao';

describe('Expedição: regras', () => {
  it('4 turnos de 2, 6, 8 e 12 horas, com o ouro 30% menor que a proposta; 3 vagas; nível 15', () => {
    expect(TURNOS_DE_EXPEDICAO.map((t) => t.horas)).toEqual([2, 6, 8, 12]);
    expect(TURNOS_DE_EXPEDICAO.map((t) => t.custoOuro)).toEqual([300, 1000, 1500, 2500].map((o) => Math.round(o * 0.7)));
    expect(VAGAS_DE_EXPEDICAO).toBe(3);
    expect(NIVEL_DA_EXPEDICAO).toBe(15);
  });

  it('recompensas fixas que crescem com o turno; só o de 12 h dá Selo da Origem', () => {
    const [t2, t6, t8, t12] = TURNOS_DE_EXPEDICAO;
    expect(t2).toMatchObject({ selos: { desgastado: 10 }, fragmentosDeMemoria: 20, pedrasDaRecordacao: 0, materiais: { comum: 2 } });
    expect(t12).toMatchObject({ selos: { desgastado: 60, encantado: 15, eternidade: 5, origem: 1 }, fragmentosDeMemoria: 150, pedrasDaRecordacao: 3, materiais: { comum: 5, raro: 4, muitoRaro: 2, epico: 1 } });
    expect([t2, t6, t8].some((t) => t.selos.origem)).toBe(false);
    expect(t6.fragmentosDeMemoria).toBeLessThan(t8.fragmentosDeMemoria);
  });

  it('a leitura do banco descarta vagas repetidas ou fora do limite, turnos que não existem e datas quebradas', () => {
    const ok = { vaga: 1, horas: 6, inicio: '2026-10-22T10:00:00.000Z', fim: '2026-10-22T15:00:00.000Z', avancos: 1 };
    expect(
      expedicoesDoDocumento([ok, { ...ok, avancos: 0 }, { ...ok, vaga: 5 }, { ...ok, vaga: 0, horas: 5 }, { ...ok, vaga: 2, fim: 'ontem' }, { vaga: 0, horas: 2, inicio: ok.inicio, fim: ok.fim }])
    ).toEqual([{ vaga: 0, horas: 2, inicio: ok.inicio, fim: ok.fim }, ok]);
    expect(expedicoesDoDocumento([])).toBeUndefined();
    expect(expedicoesDoDocumento('x')).toBeUndefined();
  });
});
