import { describe, it, expect } from 'vitest';
import { dataDoLog, descreverAcao } from '@/lib/mestreTela';

describe('Textos do painel do Mestre', () => {
  it('descreve a concessão de papel com o antes e o depois', () => {
    expect(descreverAcao({ acao: 'papel.conceder', alvo: 'u1', antes: { papel: null }, depois: { papel: 'mestre' } })).toBe('Papel de u1: nenhum → Mestre');
    expect(descreverAcao({ acao: 'papel.conceder', alvo: 'u1', antes: { papel: 'suporte' }, depois: { papel: 'moderador' } })).toBe('Papel de u1: Suporte → Moderador');
  });

  it('descreve a remoção e marca o que falhou', () => {
    expect(descreverAcao({ acao: 'papel.revogar', alvo: 'u2', antes: { papel: 'mestre' }, depois: { papel: null } })).toBe('Papel de u2 removido (era Mestre)');
    expect(descreverAcao({ acao: 'papel.conceder.falhou', alvo: 'u1', antes: { papel: null }, depois: { papel: 'mestre' } })).toBe('Falhou: Papel de u1: nenhum → Mestre');
  });

  it('uma ação desconhecida aparece com o nome e o alvo, sem quebrar', () => {
    expect(descreverAcao({ acao: 'mapa.publicar', alvo: 'm1' })).toBe('mapa.publicar em m1');
    expect(descreverAcao({ acao: 'qualquer.coisa' })).toBe('qualquer.coisa');
    expect(descreverAcao({ acao: 'papel.conceder', alvo: 'u1', antes: 'lixo', depois: { papel: 'x' } })).toContain('u1');
  });

  it('formata a data no fuso de Brasília e devolve o texto original se for inválida', () => {
    expect(dataDoLog('2026-10-15T15:30:00.000Z')).toMatch(/15\/10\/2026.*12:30/);
    expect(dataDoLog('ontem')).toBe('ontem');
  });
});
