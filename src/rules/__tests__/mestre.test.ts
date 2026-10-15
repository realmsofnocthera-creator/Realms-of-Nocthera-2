import { describe, it, expect } from 'vitest';
import { PAPEIS_MESTRE, PERMISSOES_MESTRE, ehPapelMestre, papelTem, permissoesDoPapel } from '@/rules/mestre';

describe('Papéis do Painel do Mestre', () => {
  it('são quatro: Dono, Mestre, Moderador e Suporte', () => {
    expect([...PAPEIS_MESTRE]).toEqual(['dono', 'mestre', 'moderador', 'suporte']);
    expect(ehPapelMestre('mestre')).toBe(true);
    for (const ruim of ['admin', '', null, undefined, 3, 'Dono']) expect(ehPapelMestre(ruim)).toBe(false);
  });

  it('o Dono tem todas as permissões', () => {
    expect(permissoesDoPapel('dono')).toEqual(PERMISSOES_MESTRE);
  });

  it('todo papel pode entrar no painel e ler o log', () => {
    for (const p of PAPEIS_MESTRE) {
      expect(papelTem(p, 'painel.entrar'), p).toBe(true);
      expect(papelTem(p, 'log.ler'), p).toBe(true);
    }
  });

  it('só o Dono gere papéis e ajusta jogadores', () => {
    for (const p of PAPEIS_MESTRE.filter((x) => x !== 'dono')) {
      expect(papelTem(p, 'papeis.gerir'), p).toBe(false);
      expect(papelTem(p, 'jogadores.ajustar'), p).toBe(false);
    }
  });

  it('o Mestre edita e publica conteúdo e mapas, mas não sanciona', () => {
    expect(papelTem('mestre', 'conteudo.editar')).toBe(true);
    expect(papelTem('mestre', 'conteudo.publicar')).toBe(true);
    expect(papelTem('mestre', 'mapas.editar')).toBe(true);
    expect(papelTem('mestre', 'jogadores.sancionar')).toBe(false);
  });

  it('o Moderador sanciona mas não edita conteúdo; o Suporte só lê', () => {
    expect(papelTem('moderador', 'jogadores.sancionar')).toBe(true);
    expect(papelTem('moderador', 'conteudo.editar')).toBe(false);
    const escrita = ['conteudo.editar', 'conteudo.publicar', 'mapas.editar', 'jogadores.ajustar', 'jogadores.sancionar', 'papeis.gerir'] as const;
    for (const perm of escrita) expect(papelTem('suporte', perm), perm).toBe(false);
    expect(papelTem('suporte', 'jogadores.ler')).toBe(true);
    expect(papelTem('suporte', 'conteudo.ler')).toBe(true);
  });
});
