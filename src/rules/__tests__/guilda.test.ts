import { describe, it, expect } from 'vitest';
import { guildaDoDocumento, membrosEmOrdem, podeExpulsar, regrasDeGuildaValidas, sucessorDoLider, validarDescricaoDaGuilda, validarNomeDaGuilda, type MembroDaGuilda } from '@/rules/guilda';
import { configuracaoDoDocumento } from '@/rules/sistemas';

const m = (uid: string, cargo: MembroDaGuilda['cargo'], entrouEm: string): MembroDaGuilda => ({ uid, nome: uid.toUpperCase(), cargo, entrouEm });

describe('regras das guildas', () => {
  it('nome: 3 a 20, letras com acento, números, espaço, hífen e apóstrofo', () => {
    expect(validarNomeDaGuilda('  Ordem   da Névoa ')).toEqual({ ok: true, nome: 'Ordem da Névoa' });
    expect(validarNomeDaGuilda("Filhos d'Aurora-2").ok).toBe(true);
    expect(validarNomeDaGuilda('ab').ok).toBe(false);
    expect(validarNomeDaGuilda('x'.repeat(21)).ok).toBe(false);
    expect(validarNomeDaGuilda('-Lobo').ok).toBe(false);
    expect(validarNomeDaGuilda('Lobo!').ok).toBe(false);
    expect(validarNomeDaGuilda(3).ok).toBe(false);
  });

  it('descrição até 200, vazia vale', () => {
    expect(validarDescricaoDaGuilda(undefined)).toEqual({ ok: true, descricao: '' });
    expect(validarDescricaoDaGuilda('x'.repeat(201)).ok).toBe(false);
  });

  it('quem expulsa quem', () => {
    expect(podeExpulsar('lider', 'oficial')).toBe(true);
    expect(podeExpulsar('oficial', 'membro')).toBe(true);
    expect(podeExpulsar('oficial', 'oficial')).toBe(false);
    expect(podeExpulsar('membro', 'membro')).toBe(false);
    expect(podeExpulsar('lider', 'lider')).toBe(false);
  });

  it('ordem dos membros e sucessor do Líder', () => {
    const lista = [m('c', 'membro', '2026-01-01'), m('b', 'oficial', '2026-03-01'), m('a', 'lider', '2026-05-01'), m('d', 'oficial', '2026-02-01')];
    expect(membrosEmOrdem(lista).map((x) => x.uid)).toEqual(['a', 'd', 'b', 'c']);
    expect(sucessorDoLider(lista)?.uid).toBe('d');
    expect(sucessorDoLider([m('c', 'membro', '1'), m('a', 'lider', '0')])?.uid).toBe('c');
    expect(sucessorDoLider([m('a', 'lider', '0')])).toBeNull();
  });

  it('regras do painel: inteiros dentro dos limites', () => {
    expect(regrasDeGuildaValidas({ nivelMinimo: 10, custoOuro: 5000, maxMembros: 30 })).toEqual({ nivelMinimo: 10, custoOuro: 5000, maxMembros: 30 });
    expect(regrasDeGuildaValidas({ nivelMinimo: 0, custoOuro: 5000, maxMembros: 30 })).toBeNull();
    expect(regrasDeGuildaValidas({ nivelMinimo: 10, custoOuro: 5000, maxMembros: 51 })).toBeNull();
    expect(regrasDeGuildaValidas({ nivelMinimo: 10, custoOuro: 1.5, maxMembros: 30 })).toBeNull();
    expect(configuracaoDoDocumento({}).guildas).toEqual({ nivelMinimo: 10, custoOuro: 5000, maxMembros: 30 });
    expect(configuracaoDoDocumento({ guildas: { nivelMinimo: 5, custoOuro: 0, maxMembros: 10 } }).guildas).toEqual({ nivelMinimo: 5, custoOuro: 0, maxMembros: 10 });
    expect(configuracaoDoDocumento({}).sistemas.guildas.ativo).toBe(true);
  });

  it('lê o documento com tolerância; sem Líder a guilda não vale', () => {
    const g = guildaDoDocumento('g_abc123', {
      nome: 'Folhaviva',
      descricao: 3,
      membros: [m('a', 'lider', '1'), { uid: 'x', nome: 'X', cargo: 'rei' }, 'lixo'],
      convites: [{ uid: 'b', nome: 'B', por: 'A', em: '2' }, { nome: 'sem uid' }],
      pedidos: [{ uid: 'c', nome: 'C', nivel: 'alto' }],
    })!;
    expect(g.descricao).toBe('');
    expect(g.membros.map((x) => x.uid)).toEqual(['a']);
    expect(g.convites.map((x) => x.uid)).toEqual(['b']);
    expect(g.pedidos).toEqual([{ uid: 'c', nome: 'C', nivel: 0, classeId: '', em: '' }]);
    expect(g.nomeBusca).toBe('folhaviva');
    expect(guildaDoDocumento('g_abc123', { nome: 'X', membros: [m('a', 'membro', '1')] })).toBeNull();
    expect(guildaDoDocumento('g_abc123', null)).toBeNull();
  });
});
