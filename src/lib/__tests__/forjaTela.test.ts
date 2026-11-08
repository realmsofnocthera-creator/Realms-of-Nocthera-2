import { describe, it, expect } from 'vitest';
import { CATEGORIAS_TELA, arvoresDaForja, arvoresVisiveis, detalheDaArma, detalheDaMinhaArma, estadoDoNo, listaDeForja, minhasArmasTela } from '@/lib/forjaTela';
import { ARMAS_BASE } from '@/rules/armasCatalogo';
import { DADOS_CACADA_MAP } from '@/rules/cacada';
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

describe('Minhas armas: reforjar e customizar', () => {
  const comum = arma('ferro-de-cacada', 'espadaGrande', { id: 'c1', atributo: 'forca', pontos: 4, reforjas: 2 });
  const mitica = ARMAS_BASE.find((b) => b.raridade === 'mitico' && b.status.length > 0)!;
  const semStatus = ARMAS_BASE.find((b) => b.raridade === 'mitico' && b.status.length === 0);
  const armaMitica = (extra: Partial<ArmaPersonagem> = {}) => arma(mitica.id, 'espadaGrande', { id: 'm1', atributo: 'forca', pontos: 100, ...extra });

  it('lista da mais rara para a menos rara', () => {
    const lista = minhasArmasTela({ armas: [comum, armaMitica()] });
    expect(lista.map((a) => a.id)).toEqual(['m1', 'c1']);
    expect(lista[0].mitica).toBe(true);
    expect(lista[1].mitica).toBe(false);
    expect(minhasArmasTela({ armas: [arma('base-que-nao-existe')] })).toEqual([]);
  });

  it('o custo da reforja sobe 25% a cada reforja e a tela diz se o personagem paga', () => {
    const pobre = detalheDaMinhaArma('c1', { armas: [comum], inventario: {}, ouro: 0 })!;
    expect(pobre.reforja.percentual).toBe(100); // 50% + 2 × 25%
    expect(pobre.reforja.pode).toBe(false);
    expect(pobre.reforja.ouro.ok).toBe(false);
    const custo = custoDaReceita(ARMAS_BASE.find((a) => a.id === 'ferro-de-cacada')!.receita, 100);
    const rico = detalheDaMinhaArma('c1', { armas: [comum], inventario: { ...custo.itens, ...(custo.diversos ? { [`x`]: 0 } : {}) }, ouro: custo.ouro })!;
    expect(rico.reforja.materiais.every((m) => m.ok)).toBe(true);
    expect(detalheDaMinhaArma('nao-existe', { armas: [comum], inventario: {}, ouro: 0 })).toBeNull();
  });

  it('só a Mítica customiza: pontos, custo por ponto e as três opções', () => {
    expect(detalheDaMinhaArma('c1', { armas: [comum], inventario: {}, ouro: 0 })!.customizacao).toBeNull();
    const d = detalheDaMinhaArma('m1', { armas: [armaMitica({ customizacao: { dano: 3, status: 1 } })], inventario: { 'bilhete-de-melhoria': 1 }, ouro: 20000 })!;
    const c = d.customizacao!;
    expect(d.pontosCustomizacao).toBe(4);
    expect(c.maximo).toBe(20);
    expect(c.pode).toBe(true);
    expect(c.opcoes.map((o) => [o.id, o.pontos, o.disponivel])).toEqual([['dano', 3, true], ['atributo', 0, true], ['status', 1, true]]);
    expect(c.opcoes[0].atual).toBe('+6%');
    expect(d.danoFixo).toBe(Math.floor((d.danoFixoBase * 106) / 100));
  });

  it('sem Bilhete de melhoria, sem ouro ou com 20 pontos não dá para customizar; arma sem status não tem "Mais status"', () => {
    const sem = (inventario: Record<string, number>, ouro: number, extra: Partial<ArmaPersonagem> = {}) =>
      detalheDaMinhaArma('m1', { armas: [armaMitica(extra)], inventario, ouro })!.customizacao!;
    expect(sem({}, 20000).pode).toBe(false);
    expect(sem({ 'bilhete-de-melhoria': 1 }, 19999).pode).toBe(false);
    const cheia = sem({ 'bilhete-de-melhoria': 5 }, 100000, { customizacao: { dano: 20 } });
    expect(cheia.noMaximo).toBe(true);
    expect(cheia.pode).toBe(false);
    if (semStatus) {
      const d = detalheDaMinhaArma('s1', { armas: [arma(semStatus.id, 'espadaGrande', { id: 's1', atributo: 'forca' })], inventario: {}, ouro: 0 })!;
      expect(d.customizacao!.opcoes.find((o) => o.id === 'status')!.disponivel).toBe(false);
    }
  });
});


describe('O que a Forja mostra (regra do Yuri: ★ liberada e monstro descoberto)', () => {
  const base = { inventario: {} as Record<string, number>, ouro: 0, armas: [] as ArmaPersonagem[], nivel: 12, cacadaChavesVencidas: [] as number[], monstrosDerrotados: [] as string[] };
  const ver = (c: object, cat: 'espadaGrande' | 'katana' = 'espadaGrande') => arvoresVisiveis(cat, { ...base, ...c });

  it('sem nenhuma ★ liberada (nível 1) não aparece árvore nenhuma', () => {
    expect(ver({ nivel: 1 })).toEqual([]);
  });

  it('com a 1★ liberada, só as árvores da 1★ aparecem, todas como ??? (sem nome, sem armas, só os espaços da linha principal)', () => {
    const v = ver({});
    expect(v.length).toBeGreaterThan(0);
    expect(v.every((a) => a.estrela === 1)).toBe(true);
    for (const a of v) {
      expect(a.descoberta).toBe(false);
      expect(a.nome).toBe('???');
      expect(a.ramos).toHaveLength(1);
      expect(a.ramos[0]).toMatchObject({ id: 'principal', nos: [], descoberto: false });
      expect(a.ramos[0].quantidade).toBeGreaterThan(0);
    }
    expect(JSON.stringify(v)).not.toContain('Rato da Floresta');
    expect(JSON.stringify(v)).not.toContain('Ferro de Caçada');
  });

  it('o monstro derrotado revela a árvore dele; as subespécies seguem ??? até serem descobertas', () => {
    const rato = ver({ monstrosDerrotados: ['rato-da-floresta'] }).find((a) => a.monstroId === 'rato-da-floresta')!;
    expect(rato.descoberta).toBe(true);
    expect(rato.nome).toBe('Rato da Floresta');
    expect(rato.ramos.map((r) => [r.id, r.descoberto, r.nos.length, r.nome])).toEqual([
      ['principal', true, 2, ''],
      ['rato-das-cinzas', false, 0, '???'],
      ['rato-pestilento', false, 0, '???'],
    ]);
    expect(rato.ramos[1].quantidade).toBe(2);
    // as outras árvores continuam ???
    expect(ver({ monstrosDerrotados: ['rato-da-floresta'] }).filter((a) => a.descoberta)).toHaveLength(1);
  });

  it('ter material do monstro (qualquer drop) também revela, e o da subespécie revela o ramo dela', () => {
    const v = ver({ inventario: { 'pelo-de-rato': 1 } }).find((a) => a.monstroId === 'rato-da-floresta')!;
    expect(v.descoberta).toBe(true);
    expect(v.ramos.find((r) => r.id === 'rato-das-cinzas')!.descoberto).toBe(false);
    // o Pelo de Rato é compartilhado pelos três ratos (não revela subespécie); a Cauda Chamuscada é só do Rato das Cinzas
    expect(DADOS_CACADA_MAP['rato-das-cinzas'].drops).toContain('pelo-de-rato');
    const drop = 'cauda-chamuscada';
    const w = ver({ monstrosDerrotados: ['rato-da-floresta'], inventario: { [drop]: 3 } }).find((a) => a.monstroId === 'rato-da-floresta')!;
    expect(w.ramos.find((r) => r.id === 'rato-das-cinzas')).toMatchObject({ descoberto: true, nome: 'Rato das Cinzas' });
    expect(w.ramos.find((r) => r.id === 'rato-das-cinzas')!.nos).toHaveLength(2);
    expect(w.ramos.find((r) => r.id === 'rato-pestilento')!.descoberto).toBe(false);
  });

  it('material com quantidade zero não conta', () => {
    expect(ver({ inventario: { 'pelo-de-rato': 0 } }).some((a) => a.descoberta)).toBe(false);
  });

  it('quem já forjou uma arma da árvore sempre a vê, mesmo sem material nem vitória registrada', () => {
    const v = ver({ armas: [arma('montante-de-pelo')] }).find((a) => a.monstroId === 'rato-da-floresta')!;
    expect(v.descoberta).toBe(true);
    expect(v.ramos[0].nos).toHaveLength(2);
    const dasCinzas = ver({ armas: [arma('lamina-das-cinzas')] }).find((a) => a.monstroId === 'rato-da-floresta')!;
    expect(dasCinzas.ramos.find((r) => r.id === 'rato-das-cinzas')!.descoberto).toBe(true);
  });

  it('uma ★ nova que o jogador libera passa a aparecer como ???, e a que ainda está bloqueada não aparece', () => {
    const so1 = ver({ nivel: 12 });
    expect(Math.max(...so1.map((a) => a.estrela))).toBe(1);
    const com2 = ver({ nivel: 12, cacadaChavesVencidas: [1] });
    const duas = com2.filter((a) => a.estrela === 2);
    expect(duas.length).toBeGreaterThan(0);
    expect(duas.every((a) => !a.descoberta && a.nome === '???')).toBe(true);
    expect(com2.some((a) => a.estrela === 3)).toBe(false);
  });

  it('a regra vale igual para todas as categorias de arma', () => {
    const a = ver({ monstrosDerrotados: ['rato-da-floresta'] }, 'katana').find((x) => x.monstroId === 'rato-da-floresta')!;
    expect(a.ramos[0].nos[0].nome).toBe('Tachi do Ninho');
  });
});
