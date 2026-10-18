import { describe, it, expect } from 'vitest';
import { deveSalvarPosicao, INTERVALO_MAXIMO_ANDANDO_MS, INTERVALO_MINIMO_MS, SILENCIO_PARA_SALVAR_MS, type SituacaoDoSalvamento } from '@/lib/salvamentoCampanha';

const SALVA = { mapaId: 'vila', x: 1, y: 1 };
const base = (parte: Partial<SituacaoDoSalvamento> = {}): SituacaoDoSalvamento => ({
  agora: 1_000_000,
  posicao: { mapaId: 'vila', x: 5, y: 3 },
  salva: SALVA,
  ultimoPassoEm: 1_000_000,
  ultimoSalvamentoEm: 1_000_000 - 60_000, // salvou há 1 minuto
  ...parte,
});

describe('Quando salvar a posição na Campanha (economia de gravações)', () => {
  it('não salva enquanto anda: o último passo foi agora', () => {
    expect(deveSalvarPosicao(base())).toBe(false);
    expect(deveSalvarPosicao(base({ ultimoPassoEm: 1_000_000 - (SILENCIO_PARA_SALVAR_MS - 1) }))).toBe(false);
  });

  it('salva quando parou de andar por um tempo', () => {
    expect(deveSalvarPosicao(base({ ultimoPassoEm: 1_000_000 - SILENCIO_PARA_SALVAR_MS }))).toBe(true);
  });

  it('salva na hora ao sair da tela, sem esperar nem respeitar o intervalo mínimo', () => {
    expect(deveSalvarPosicao(base({ saindo: true }))).toBe(true);
    expect(deveSalvarPosicao(base({ saindo: true, ultimoSalvamentoEm: 1_000_000 - 1_000 }))).toBe(true);
  });

  it('nunca salva duas vezes muito juntas (fora o caso de sair da tela)', () => {
    const recente = base({ ultimoSalvamentoEm: 1_000_000 - (INTERVALO_MINIMO_MS - 1), ultimoPassoEm: 1_000_000 - 60_000 });
    expect(deveSalvarPosicao(recente)).toBe(false);
    expect(deveSalvarPosicao({ ...recente, ultimoSalvamentoEm: 1_000_000 - INTERVALO_MINIMO_MS })).toBe(true);
  });

  it('andando sem parar, salva de vez em quando', () => {
    expect(deveSalvarPosicao(base({ ultimoSalvamentoEm: 1_000_000 - (INTERVALO_MAXIMO_ANDANDO_MS - 1) }))).toBe(false);
    expect(deveSalvarPosicao(base({ ultimoSalvamentoEm: 1_000_000 - INTERVALO_MAXIMO_ANDANDO_MS }))).toBe(true);
  });

  it('não salva se a posição não mudou desde a última confirmada, nem ao sair', () => {
    expect(deveSalvarPosicao(base({ posicao: { ...SALVA }, ultimoPassoEm: 0 }))).toBe(false);
    expect(deveSalvarPosicao(base({ posicao: { ...SALVA }, saindo: true }))).toBe(false);
  });

  it('mudou de mapa: a posição conta como diferente; sem salvamento anterior, salva', () => {
    expect(deveSalvarPosicao(base({ posicao: { mapaId: 'floresta', x: 1, y: 1 }, saindo: true }))).toBe(true);
    expect(deveSalvarPosicao(base({ salva: null, saindo: true }))).toBe(true);
  });

  it('uma sessão típica gasta poucas gravações', () => {
    // 15 minutos jogando: anda 4 min, para 30 s, anda 6 min, para 1 min, sai.
    let salvas = 0;
    let salvaEm = -10 * 60_000;
    let ultimoPasso = 0;
    let posicao = 0;
    let confirmada = -1;
    for (let t = 0; t <= 15 * 60_000; t += 5_000) {
      const andando = t < 4 * 60_000 || (t >= 4.5 * 60_000 && t < 10.5 * 60_000);
      if (andando) {
        ultimoPasso = t;
        posicao = Math.floor(t / 2_000);
      }
      const saindo = t === 15 * 60_000;
      if (deveSalvarPosicao({ agora: t, posicao: { mapaId: 'm', x: posicao, y: 0 }, salva: confirmada < 0 ? null : { mapaId: 'm', x: confirmada, y: 0 }, ultimoPassoEm: ultimoPasso, ultimoSalvamentoEm: salvaEm, saindo })) {
        salvas++;
        salvaEm = t;
        confirmada = posicao;
      }
    }
    expect(salvas).toBeLessThanOrEqual(6);
    expect(salvas).toBeGreaterThanOrEqual(2);
  });
});
