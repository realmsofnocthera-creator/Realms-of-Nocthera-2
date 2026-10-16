import { describe, it, expect } from 'vitest';
import { descreverTransacao, situacaoDaConta } from '@/lib/jogadoresTela';
import { descreverAcao } from '@/lib/mestreTela';

describe('Textos da aba Jogadores', () => {
  it('transação com sinal, quantidade e nome da moeda', () => {
    expect(descreverTransacao({ tipo: 'ganho', quantidade: 12500, moeda: 'ouro' })).toBe('+12.500 ouro');
    expect(descreverTransacao({ tipo: 'perda', quantidade: 3, moeda: 'diamantes' })).toBe('−3 Diamantes');
    expect(descreverTransacao({ tipo: 'ganho', quantidade: 1, moeda: undefined })).toBe('+1 ouro');
    expect(descreverTransacao({ tipo: 'ganho', quantidade: 2, moeda: 'fragmentosAlma' })).toBe('+2 fragmentos de alma');
  });

  it('situação da conta: livre, suspensa com prazo e banida', () => {
    expect(situacaoDaConta(null)).toEqual({ texto: 'Conta livre', tom: 'ok' });
    expect(situacaoDaConta({ tipo: 'banimento', ate: null, motivo: 'x' })).toEqual({ texto: 'Banida', tom: 'perigo' });
    const s = situacaoDaConta({ tipo: 'suspensao', ate: '2026-10-17T15:30:00Z', motivo: 'x' });
    expect(s.tom).toBe('aviso');
    expect(s.texto).toMatch(/^Suspensa até 17\/10\/2026,? 12:30$/);
  });

  it('o log descreve as ações sobre jogadores', () => {
    expect(descreverAcao({ acao: 'jogador.consultar', alvo: 'u1' })).toBe('Consultou a ficha de u1');
    expect(descreverAcao({ acao: 'jogador.suspender', alvo: 'u1', depois: { dias: 3 } })).toBe('Suspendeu u1 por 3 dias');
    expect(descreverAcao({ acao: 'jogador.suspender', alvo: 'u1', depois: { dias: 1 } })).toBe('Suspendeu u1 por 1 dia');
    expect(descreverAcao({ acao: 'jogador.banir', alvo: 'u1' })).toBe('Baniu u1');
    expect(descreverAcao({ acao: 'jogador.desbanir', alvo: 'u1' })).toBe('Levantou a sanção de u1');
    expect(descreverAcao({ acao: 'jogador.advertir.falhou', alvo: 'u1' })).toBe('Falhou: Advertiu u1');
  });
});
