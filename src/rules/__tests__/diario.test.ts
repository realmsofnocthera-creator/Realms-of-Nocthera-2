import { describe, it, expect } from 'vitest';
import {
  BAU_DIARIO,
  BAU_SEMANAL,
  baus,
  checkinDoDocumento,
  DIAS_DO_CHECKIN,
  DIAS_ESPECIAIS_DO_CHECKIN,
  diarioDeAgora,
  diarioDoDocumento,
  MISSOES_DIARIAS,
  MISSOES_SEMANAIS,
  proximoDiaDoCheckin,
  quantasCompletas,
  recompensaDoCheckin,
  somarDiario,
} from '@/rules/diario';
import { textoDoPresente } from '@/rules/correio';

const DIA = '2026-10-23'; // sexta-feira
const SEMANA = '2026-10-19'; // a segunda-feira dela

describe('Missões diárias e semanais', () => {
  it('7 diárias e 10 semanais, com ids únicos', () => {
    expect(MISSOES_DIARIAS).toHaveLength(7);
    expect(MISSOES_SEMANAIS).toHaveLength(10);
    expect(new Set([...MISSOES_DIARIAS, ...MISSOES_SEMANAIS].map((m) => m.id)).size).toBe(17);
  });

  it('baús: 2, 5 e 7 missões no diário; 2, 5, 7 e 10 no semanal', () => {
    expect(BAU_DIARIO.map((d) => d.missoes)).toEqual([2, 5, 7]);
    expect(BAU_SEMANAL.map((d) => d.missoes)).toEqual([2, 5, 7, 10]);
  });

  it('o total de Diamantes fecha em cerca de 600 por mês (baús + check-in)', () => {
    const porDia = BAU_DIARIO.reduce((t, d) => t + d.diamantes, 0);
    const porSemana = BAU_SEMANAL.reduce((t, d) => t + d.diamantes, 0);
    const checkin = Object.values(DIAS_ESPECIAIS_DO_CHECKIN).reduce((t, p) => t + (p.diamantes ?? 0), 0);
    expect([porDia, porSemana, checkin]).toEqual([12, 50, 50]);
    const porMes = porDia * 30 + Math.round((porSemana * 30) / 7) + checkin;
    expect(porMes).toBeGreaterThanOrEqual(550);
    expect(porMes).toBeLessThanOrEqual(650);
  });

  it('soma o progresso do dia e da semana, e as diárias concluídas contam na semana', () => {
    let m = somarDiario(undefined, { vitorias: 5, checkin: 1 }, DIA, SEMANA);
    expect(m.hoje).toEqual({ vitorias: 5, checkin: 1 });
    expect(m.estaSemana).toEqual({ vitorias: 5, checkin: 1, diarias: 2 }); // check-in e "Vencer 5 lutas"
    m = somarDiario(m, { vitorias: 10 }, DIA, SEMANA);
    expect(quantasCompletas(MISSOES_DIARIAS, m.hoje)).toBe(3);
    expect(m.estaSemana.diarias).toBe(3);
    // "diarias" não se soma de fora
    expect(somarDiario(m, { diarias: 50 }, DIA, SEMANA).estaSemana.diarias).toBe(3);
  });

  it('o dia novo zera o dia e os baús do dia, mas guarda a semana; a semana nova zera tudo', () => {
    const m = { ...somarDiario(undefined, { vitorias: 30, chefes: 2 }, DIA, SEMANA), bausDiarios: 2, bausSemanais: 1 };
    const amanha = diarioDeAgora(m, '2026-10-24', SEMANA);
    expect(amanha.hoje).toEqual({});
    expect(amanha.bausDiarios).toBe(0);
    expect(amanha.estaSemana.vitorias).toBe(30);
    expect(amanha.bausSemanais).toBe(1);
    const proxima = diarioDeAgora(m, '2026-10-26', '2026-10-26');
    expect(proxima).toMatchObject({ hoje: {}, estaSemana: {}, bausDiarios: 0, bausSemanais: 0 });
  });

  it('baús: abre por quantidade e só entrega o que ainda não foi resgatado', () => {
    expect(baus(BAU_DIARIO, 1, 0)).toEqual({ prontos: [], abertos: 0 });
    expect(baus(BAU_DIARIO, 5, 0).prontos.map((d) => d.diamantes)).toEqual([2, 4]);
    expect(baus(BAU_DIARIO, 5, 1).prontos.map((d) => d.diamantes)).toEqual([4]);
    expect(baus(BAU_DIARIO, 7, 3).prontos).toEqual([]);
    expect(baus(BAU_SEMANAL, 10, 2).prontos.map((d) => d.diamantes)).toEqual([15, 20]);
  });
});

describe('Check-in de 30 dias', () => {
  it('os dias 7, 14, 21 e 30 dão Diamantes; os outros giram entre 6 recompensas', () => {
    expect(Object.keys(DIAS_ESPECIAIS_DO_CHECKIN).map(Number)).toEqual([7, 14, 21, 30]);
    for (let d = 1; d <= DIAS_DO_CHECKIN; d++) expect(Boolean(recompensaDoCheckin(d).diamantes), `dia ${d}`).toBe(d in DIAS_ESPECIAIS_DO_CHECKIN);
    expect(textoDoPresente(recompensaDoCheckin(1))).toEqual(['1.000 de ouro']);
    expect(textoDoPresente(recompensaDoCheckin(2))).toEqual(['5× Selo Desgastado']);
    expect(textoDoPresente(recompensaDoCheckin(6))).toEqual(['2× Selo Encantado']);
    // o dia especial não gasta uma vez do ciclo: o dia 8 volta ao começo dele
    expect(textoDoPresente(recompensaDoCheckin(8))).toEqual(['1.000 de ouro']);
    expect(textoDoPresente(recompensaDoCheckin(30))).toEqual(['25 Diamantes', '1× Selo da Origem']);
  });

  it('o próximo dia do calendário segue de onde parou e volta ao 1 depois do 30', () => {
    expect(proximoDiaDoCheckin(undefined)).toBe(1);
    expect(proximoDiaDoCheckin({ ultimoDia: DIA, feitos: 9 })).toBe(10);
    expect(proximoDiaDoCheckin({ ultimoDia: DIA, feitos: 0 })).toBe(1);
  });
});

describe('Leitura tolerante do banco', () => {
  it('descarta o que está quebrado', () => {
    expect(diarioDoDocumento(null)).toBeUndefined();
    expect(diarioDoDocumento({ dia: 'ontem', semana: SEMANA })).toBeUndefined();
    expect(diarioDoDocumento({ dia: DIA, semana: SEMANA, hoje: { vitorias: 4.7, xyz: 3, torre: -1 }, estaSemana: { diarias: 2 }, bausDiarios: 9, bausSemanais: 2 })).toEqual({
      dia: DIA,
      semana: SEMANA,
      hoje: { vitorias: 4 },
      estaSemana: { diarias: 2 },
      bausDiarios: 3,
      bausSemanais: 2,
    });
    expect(checkinDoDocumento({ ultimoDia: DIA, feitos: 99 })).toEqual({ ultimoDia: DIA, feitos: 29 });
    expect(checkinDoDocumento({ ultimoDia: 'x', feitos: 1 })).toBeUndefined();
  });
});
