import { describe, it, expect } from 'vitest';
import { CATEGORIAS_TELA, arvoresDaForja, detalheDaArma, estadoDoNo, listaDeForja } from '@/lib/forjaTela';
import { ARMAS_BASE } from '@/rules/armasCatalogo';
import { custoDaReceita, ArmaPersonagem } from '@/game/forja';

/** Tela da Forja: árvore por monstro, estados, lista de forja e detalhe da arma. */

const arma = (baseId: string, categoria: ArmaPersonagem['categoria'] = 'espadaGrande', extra: Partial<ArmaPersonagem> = {}): ArmaPersonagem => ({
  id: `id-${baseId}`, baseId, categoria, atributo: 'sorte', pontos: 5, reforjas: 0, criadaEm: '', ...extra,
});

function inventarioPara(...baseIds: string[]): Record<string, number> {
  const inv: Record<string, number> = {};
  for (const id of baseIds) {
    const custo = custoDaReceita(ARMAS_BASE.find((a) => a.id === id)!.receita);
    for (const [item, q] of Object.entries(custo.itens)) inv[item] = (inv[item] ?? 0) + q;
  }
  return inv;
}

const vazio = { inventario: {}, ouro: 0, armas: [] };

describe('Árvores da Forja', () => {
  it('6 categorias e 35 árvores em ordem de estrela, com os ramos das subespécies', () => {
    expect(CATEGORIAS_TELA.map((c) => c.nome)).toEqual(['Espada grande', 'Katana', 'Lança', 'Espada e escudo', 'Grimório', 'Cajado']);
    const a = arvoresDaForja('katana', vazio);
    expect(a).toHaveLength(35);
    expect(a.map((x) => x.estrela)).toEqual([...a.map((x) => x.estrela)].sort((x, y) => x - y));
    const rato = a.find((x) => x.monstroId === 'rato-da-floresta')!;
    expect(rato.ramos.map((r) => [r.id, r.nos.length])).toEqual([['principal', 2], ['rato-das-cinzas', 2], ['rato-pestilento', 2]]);
    expect(rato.ramos[0].nos[0].nome).toBe('Tachi do Ninho');
    expect(a.flatMap((x) => x.ramos.flatMap((r) => r.nos))).toHaveLength(164);
  });

  it('os nomes mudam com a categoria', () => {
    const nome = (c: 'espadaGrande' | 'cajado') => arvoresDaForja(c, vazio)[0].ramos[0].nos[0].nome;
    expect(nome('espadaGrande')).toBe('Ferro de Caçada');
    expect(nome('cajado')).toBe('Cajado de Raiz Torta');
  });
});

describe('Estado de cada arma', () => {
  it('a primeira arma depende só de material e ouro; as seguintes, da arma anterior', () => {
    expect(estadoDoNo('ferro-de-cacada', 'espadaGrande', vazio)).toBe('faltaMaterial');
    const pronto = { inventario: inventarioPara('ferro-de-cacada'), ouro: 100, armas: [] };
    expect(estadoDoNo('ferro-de-cacada', 'espadaGrande', pronto)).toBe('disponivel');
    expect(estadoDoNo('montante-de-pelo', 'espadaGrande', pronto)).toBe('bloqueada');
  });

  it('com a arma anterior na mochila, a próxima pode ficar disponível', () => {
    const c = { inventario: inventarioPara('montante-de-pelo'), ouro: 1000, armas: [arma('ferro-de-cacada')] };
    expect(estadoDoNo('ferro-de-cacada', 'espadaGrande', c)).toBe('tenho');
    expect(estadoDoNo('montante-de-pelo', 'espadaGrande', c)).toBe('disponivel');
  });

  it('a arma já evoluída fica superada; a de outra categoria não conta', () => {
    const c = { inventario: {}, ouro: 0, armas: [arma('montante-de-pelo')] };
    expect(estadoDoNo('ferro-de-cacada', 'espadaGrande', c)).toBe('superada');
    expect(estadoDoNo('montante-de-pelo', 'espadaGrande', c)).toBe('tenho');
    expect(estadoDoNo('montante-de-pelo', 'katana', c)).toBe('bloqueada');
  });

  it('lista de forja: só o que dá para fabricar agora', () => {
    expect(listaDeForja('espadaGrande', vazio)).toEqual([]);
    const c = { inventario: inventarioPara('ferro-de-cacada', 'espadao-da-alcateia'), ouro: 500, armas: [] };
    const lista = listaDeForja('espadaGrande', c);
    expect(lista.map((i) => i.baseId).sort()).toEqual(['espadao-da-alcateia', 'ferro-de-cacada']);
  });
});

describe('Detalhe da arma', () => {
  it('mostra dano, bônus, atributo, receita com o que falta e o ouro', () => {
    const c = { inventario: { 'pelo-de-rato': 4 }, ouro: 30, armas: [] };
    const d = detalheDaArma('ferro-de-cacada', 'espadaGrande', c);
    expect(d).toMatchObject({
      nome: 'Ferro de Caçada', raridadeNome: 'Comum', tipoDano: 'Dano físico', subtipo: 'Corte', danoFixo: 20,
      bonus: '+10% dano físico', penalidade: '−10% agilidade', acao: 'Fabricar', estado: 'faltaMaterial', consome: null,
    });
    expect(d.atributoSorteado).toBe('Sorteado entre Vigor, Sorte, Vitalidade, Arcano, Inteligência, Agilidade: 1 a 9 pontos');
    expect(d.materiais.find((m) => m.id === 'pelo-de-rato')).toMatchObject({ precisa: 6, tem: 4, ok: false });
    expect(d.ouro).toEqual({ precisa: 100, tem: 30, ok: false });
  });

  it('evoluir: pede a arma anterior e guarda o tipo do atributo definido', () => {
    const c = { inventario: inventarioPara('montante-de-pelo'), ouro: 500, armas: [arma('ferro-de-cacada', 'katana', { atributo: 'agilidade' })] };
    const d = detalheDaArma('montante-de-pelo', 'katana', c);
    expect(d).toMatchObject({ acao: 'Evoluir', estado: 'disponivel', armaAnteriorId: 'id-ferro-de-cacada', bonus: '+5% chance de crítico', penalidade: '−5% defesa' });
    expect(d.consome).toEqual({ nome: 'Tachi do Ninho', tenho: true });
    expect(d.atributoSorteado).toContain('Agilidade (já definido na árvore): 1 a 9 pontos');
  });

  it('arma que o personagem já tem mostra o atributo sorteado; diversos aceitam qualquer um dos dois', () => {
    const c = { inventario: {}, ouro: 0, armas: [arma('ferro-de-cacada', 'espadaGrande', { pontos: 7, reforjas: 2 })] };
    expect(detalheDaArma('ferro-de-cacada', 'espadaGrande', c).minha).toEqual({ atributo: 'Sorte', pontos: 7, reforjas: 2 });
    const comDiverso = ARMAS_BASE.find((a) => a.receita.diversos)!;
    const d = detalheDaArma(comDiverso.id, 'espadaGrande', vazio);
    expect(d.diversos?.nome).toMatch(/^Diverso .+ \(.+ ou .+\)$/);
    expect(d.diversos?.ok).toBe(false);
  });
});
