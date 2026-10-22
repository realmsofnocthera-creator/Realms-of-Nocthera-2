import { describe, it, expect } from 'vitest';
import { chefeDoDia, CHEFES_MUNDIAIS, diaSeguinte, faixaDoChefeMundial, FAIXAS_DO_CHEFE_MUNDIAL, NIVEL_DO_CHEFE_MUNDIAL, participacoesMundiaisDoDocumento, presenteDaFaixa } from '@/rules/chefeMundial';
import { FAIXAS_DO_CHEFE_SEMANAL } from '@/rules/chefeSemanal';
import { mensagensDoDocumento, presenteDoDocumento, presenteVazio, textoDoPresente } from '@/rules/correio';

describe('Correio: regras', () => {
  it('o presente descarta valores inválidos e materiais que não existem', () => {
    expect(presenteDoDocumento({ ouro: 100, diamantes: -3, essenciaDeSoberano: 2.5, selos: { origem: 2, falso: 9 }, materiais: { 'mundo-osso-bruto': 3, 'nao-existe': 1 } })).toEqual({
      ouro: 100,
      selos: { origem: 2 },
      materiais: { 'mundo-osso-bruto': 3 },
    });
    expect(presenteDoDocumento({ ouro: 0 })).toBeUndefined();
    expect(presenteVazio({})).toBe(true);
  });

  it('lê as mensagens e descarta as quebradas', () => {
    const ok = { id: 'm_1', titulo: 'Oi', texto: 'Texto', de: 'Mestre', criadaEm: '2026-10-22T10:00:00.000Z', expiraEm: '2026-11-21T10:00:00.000Z', presente: { ouro: 5 }, resgatada: true };
    expect(mensagensDoDocumento([ok, { ...ok, id: '' }, { ...ok, expiraEm: 'nunca' }, 'x'])).toEqual([ok]);
    expect(mensagensDoDocumento([])).toBeUndefined();
  });

  it('o presente em texto', () => {
    expect(textoDoPresente({ ouro: 1500, essenciaDeSoberano: 5, selos: { desgastado: 30 }, materiais: { 'mundo-osso-bruto': 2 } })).toEqual([
      '1.500 de ouro',
      '5 de Essência de Soberano',
      '30× Selo Desgastado',
      '2× Osso Bruto',
    ]);
  });
});

describe('Chefe Mundial: regras', () => {
  it('nível 18, um chefe provisório por dia da semana', () => {
    expect(NIVEL_DO_CHEFE_MUNDIAL).toBe(18);
    expect(CHEFES_MUNDIAIS).toHaveLength(7);
    // 2026-10-25 é domingo; 2026-10-26, segunda
    expect(chefeDoDia('2026-10-25').id).toBe('chefe-mundial-1');
    expect(chefeDoDia('2026-10-26').id).toBe('chefe-mundial-2');
    expect(chefeDoDia('2026-11-01').id).toBe('chefe-mundial-1');
    expect(diaSeguinte('2026-10-31')).toBe('2026-11-01');
  });

  it('faixas iguais às do Chefe de guildas, com ouro, Diamantes, selos e Essência de Soberano', () => {
    expect(FAIXAS_DO_CHEFE_MUNDIAL.map((f) => [f.de, f.ate])).toEqual(FAIXAS_DO_CHEFE_SEMANAL.map((f) => [f.de, f.ate]));
    expect(faixaDoChefeMundial(1).nome).toBe('1º lugar');
    expect(faixaDoChefeMundial(7).nome).toBe('4º ao 10º');
    expect(faixaDoChefeMundial(5000).nome).toBe('101º em diante');
    for (const f of FAIXAS_DO_CHEFE_MUNDIAL) expect(f.ouro > 0 && f.diamantes > 0 && f.essenciaDeSoberano > 0 && Object.keys(f.selos).length > 0).toBe(true);
    expect(presenteDaFaixa(FAIXAS_DO_CHEFE_MUNDIAL[0])).toEqual({ ouro: 20000, diamantes: 100, selos: { origem: 10, eternidade: 20 }, essenciaDeSoberano: 100 });
  });

  it('lê as participações e guarda só os 30 últimos dias', () => {
    const lista = Array.from({ length: 35 }, (_, i) => ({ dia: `2026-09-${String(i + 1).padStart(2, '0')}` }));
    expect(participacoesMundiaisDoDocumento(lista)).toHaveLength(30);
    expect(participacoesMundiaisDoDocumento([{ dia: '2026-10-01', enviada: true }, { dia: 'ontem' }])).toEqual([{ dia: '2026-10-01', enviada: true }]);
  });
});
