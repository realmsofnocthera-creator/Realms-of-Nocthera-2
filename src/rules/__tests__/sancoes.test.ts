import { describe, it, expect } from 'vitest';
import { ehAcaoDeSancao, mensagemDaSancao, sancaoDocumentoVazio, sancaoEmVigor, type SancaoDocumento } from '@/rules/sancoes';

const doc = (parte: Partial<SancaoDocumento>): SancaoDocumento => ({ ...sancaoDocumentoVazio('u1'), ...parte });
const agora = new Date('2026-10-16T12:00:00Z');

describe('Sanções (regras)', () => {
  it('só as quatro ações existem', () => {
    for (const a of ['advertir', 'suspender', 'banir', 'desbanir']) expect(ehAcaoDeSancao(a)).toBe(true);
    for (const a of ['expulsar', '', null, 3]) expect(ehAcaoDeSancao(a)).toBe(false);
  });

  it('conta sem sanção, ou sem documento, está livre', () => {
    expect(sancaoEmVigor(null, agora)).toBeNull();
    expect(sancaoEmVigor(doc({}), agora)).toBeNull();
  });

  it('a suspensão vale até o prazo e depois some sozinha', () => {
    const s = doc({ tipo: 'suspensao', ate: '2026-10-17T12:00:00Z', motivo: 'ofensas' });
    expect(sancaoEmVigor(s, agora)).toEqual({ tipo: 'suspensao', ate: '2026-10-17T12:00:00Z', motivo: 'ofensas' });
    expect(sancaoEmVigor(s, new Date('2026-10-17T12:00:00Z'))).toBeNull();
    expect(sancaoEmVigor(doc({ tipo: 'suspensao', ate: null }), agora)).toBeNull();
    expect(sancaoEmVigor(doc({ tipo: 'suspensao', ate: 'lixo' }), agora)).toBeNull();
  });

  it('o banimento não tem prazo e não vence', () => {
    expect(sancaoEmVigor(doc({ tipo: 'banimento', ate: '2020-01-01T00:00:00Z', motivo: 'fraude' }), agora)).toEqual({ tipo: 'banimento', ate: null, motivo: 'fraude' });
  });

  it('a mensagem do jogador diz o que houve, até quando e o motivo (horário de Brasília)', () => {
    expect(mensagemDaSancao({ tipo: 'banimento', ate: null, motivo: 'fraude' })).toBe('Sua conta foi banida. Motivo: fraude');
    expect(mensagemDaSancao({ tipo: 'suspensao', ate: '2026-10-17T15:30:00Z', motivo: 'ofensas' })).toMatch(/^Sua conta está suspensa até 17\/10\/2026,? 12:30 \(horário de Brasília\)\. Motivo: ofensas$/);
    expect(mensagemDaSancao({ tipo: 'banimento', ate: null, motivo: '' })).toBe('Sua conta foi banida.');
  });
});
