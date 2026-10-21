import { describe, it, expect } from 'vitest';
import { guildaDoDocumento, membrosEmOrdem, nivelDaGuilda, REGRAS_PADRAO_DE_GUILDA, podeExpulsar, regrasDeGuildaValidas, sucessorDoLider, validarDescricaoDaGuilda, validarNomeDaGuilda, type MembroDaGuilda } from '@/rules/guilda';
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

  it('regras do painel: inteiros dentro dos limites, 7 de XP e 8 de membros sem diminuir', () => {
    const boas = { nivelMinimo: 10, custoOuro: 5000, xpPorNivel: [2500, 5000, 8000, 12000, 16000, 21000, 26000], membrosPorNivel: [8, 10, 15, 20, 25, 30, 40, 50] };
    expect(regrasDeGuildaValidas(boas)).toEqual(boas);
    expect(regrasDeGuildaValidas({ ...boas, nivelMinimo: 0 })).toBeNull();
    expect(regrasDeGuildaValidas({ ...boas, xpPorNivel: [1, 2, 3] })).toBeNull();
    expect(regrasDeGuildaValidas({ ...boas, membrosPorNivel: [8, 10, 15, 20, 25, 30, 40, 51] })).toBeNull();
    expect(regrasDeGuildaValidas({ ...boas, membrosPorNivel: [8, 10, 9, 20, 25, 30, 40, 50] })).toBeNull();
    expect(regrasDeGuildaValidas({ ...boas, custoOuro: 1.5 })).toBeNull();
    expect(configuracaoDoDocumento({}).guildas).toEqual(REGRAS_PADRAO_DE_GUILDA);
    expect(configuracaoDoDocumento({ guildas: { maxMembros: 10 } }).guildas).toEqual(REGRAS_PADRAO_DE_GUILDA);
    expect(configuracaoDoDocumento({}).sistemas.guildas.ativo).toBe(true);
  });

  it('nível a partir do XP (Emergente a Lendária, 90.500 no total)', () => {
    const r = REGRAS_PADRAO_DE_GUILDA;
    expect(nivelDaGuilda(0, r)).toEqual({ nivel: 1, nome: 'Emergente', maxMembros: 8, xpNoNivel: 0, xpDoNivel: 2500 });
    expect(nivelDaGuilda(2499, r).nivel).toBe(1);
    expect(nivelDaGuilda(2500, r)).toMatchObject({ nivel: 2, nome: 'Reconhecida', maxMembros: 10, xpNoNivel: 0, xpDoNivel: 5000 });
    expect(nivelDaGuilda(7600, r)).toMatchObject({ nivel: 3, nome: 'Respeitada', xpNoNivel: 100 });
    expect(nivelDaGuilda(90_499, r).nome).toBe('Grandiosa');
    expect(nivelDaGuilda(90_500, r)).toMatchObject({ nivel: 8, nome: 'Lendária', maxMembros: 50, xpDoNivel: null });
    expect(nivelDaGuilda(1e9, r).nivel).toBe(8);
    expect(r.xpPorNivel.reduce((a, b) => a + b, 0)).toBe(90_500);
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
