import { describe, it, expect } from 'vitest';
import {
  atributosDoEmblema,
  atributosDosEmblemas,
  CUSTO_DA_FUSAO,
  emblemasEquipadosDe,
  PONTOS_DE_ATRIBUTO_POR_ESTRELA,
  desequiparEmblema,
  equiparEmblema,
  escolherTipoDaRaridade,
  fundirEmblemas,
  habilidadesDesbloqueadas,
  lerEmblemasPersonagem,
  multiplicadorDoNivel,
  nivelDasHabilidades,
  SLOTS_EMBLEMA,
  type EmblemaItem,
} from '../emblemas';
import { TIPOS_EMBLEMA, tiposDaRaridade } from '@/rules/emblemasCatalogo';
import { calcularFichaEquipamento } from '../equipamento';

const item = (id: string, tipo: string, estrelas = 1): EmblemaItem => ({ id, tipo, estrelas });

describe('Catálogo de emblemas', () => {
  it('são 25 emblemas: 2 Comuns, 3 Raros, 4 Muito raros, 6 Épicos, 5 Lendários e 5 Míticos', () => {
    expect(TIPOS_EMBLEMA).toHaveLength(25);
    const por = (r: Parameters<typeof tiposDaRaridade>[0]) => tiposDaRaridade(r).length;
    expect([por('comum'), por('raro'), por('muitoRaro'), por('epico'), por('lendario'), por('mitico')]).toEqual([2, 3, 4, 6, 5, 5]);
    expect(new Set(TIPOS_EMBLEMA.map((t) => t.id)).size).toBe(25);
    expect(new Set(TIPOS_EMBLEMA.map((t) => t.nome)).size).toBe(25);
  });

  it('todos têm 3 habilidades (uma por estrela) e os Míticos uma quarta, com a ★ vermelha', () => {
    for (const t of TIPOS_EMBLEMA) {
      expect(t.habilidades).toHaveLength(t.estrelasMax);
      expect(t.estrelasMax).toBe(t.raridade === 'mitico' ? 4 : 3);
      for (const h of t.habilidades) {
        expect(h.nome.length).toBeGreaterThan(2);
        expect(h.descricao.length).toBeGreaterThan(10);
      }
    }
  });

  it('textos do Yuri: alguns exemplos conferem', () => {
    const dargan = TIPOS_EMBLEMA.find((t) => t.id === 'dargan')!;
    expect(dargan.nome).toBe('Dargan, o Saqueador Pálido');
    expect(dargan.habilidades[0]).toEqual({ nome: 'Instinto de Carniceiro', descricao: 'Causa 8% de dano adicional contra inimigos com menos de 40% de HP.' });
    const nymeris = TIPOS_EMBLEMA.find((t) => t.id === 'nymeris')!;
    expect(nymeris.habilidades[3].nome).toBe('Devoradora da Existência');
  });
});

describe('Emblemas (regras)', () => {
  it('cada estrela desbloqueia uma habilidade', () => {
    expect(habilidadesDesbloqueadas({ tipo: 'dargan', estrelas: 1 }).map((h) => h.nome)).toEqual(['Instinto de Carniceiro']);
    expect(habilidadesDesbloqueadas({ tipo: 'dargan', estrelas: 3 })).toHaveLength(3);
    expect(habilidadesDesbloqueadas({ tipo: 'lautrec', estrelas: 4 })).toHaveLength(4);
    expect(habilidadesDesbloqueadas({ tipo: 'nao-existe', estrelas: 3 })).toEqual([]);
  });

  it('equipar: 4 espaços, o mesmo emblema não entra duas vezes e o mesmo tipo pode ocupar até 4', () => {
    const itens = [item('a', 'dargan'), item('b', 'dargan'), item('c', 'dargan'), item('d', 'dargan'), item('e', 'vesper')];
    let eq: string[] = [];
    for (const id of ['a', 'b', 'c', 'd']) {
      const r = equiparEmblema(itens, eq, id);
      expect(r.ok).toBe(true);
      if (r.ok) eq = r.equipados;
    }
    expect(eq).toEqual(['a', 'b', 'c', 'd']);
    expect(equiparEmblema(itens, eq, 'e')).toEqual({ ok: false, motivo: 'slotsCheios' });
    expect(equiparEmblema(itens, ['a'], 'a')).toEqual({ ok: false, motivo: 'jaEquipado' });
    expect(equiparEmblema(itens, [], 'zzz')).toEqual({ ok: false, motivo: 'itemNaoEncontrado' });
    expect(equiparEmblema(itens, [], 42)).toEqual({ ok: false, motivo: 'itemNaoEncontrado' });
    expect(desequiparEmblema(eq, 'b')).toEqual({ ok: true, equipados: ['a', 'c', 'd'] });
    expect(desequiparEmblema(eq, 'e')).toEqual({ ok: false, motivo: 'naoEquipado' });
    expect(SLOTS_EMBLEMA).toBe(4);
  });

  it('nível da habilidade: 1 emblema dá nível 1; 4 emblemas iguais equipados dão a habilidade 1 no nível 4', () => {
    const quatro = ['a', 'b', 'c', 'd'].map((id) => item(id, 'dargan'));
    const niveis = nivelDasHabilidades(quatro);
    expect(niveis).toHaveLength(1);
    expect(niveis[0]).toMatchObject({ tipo: 'dargan', indice: 0, nivel: 4 });
    expect(nivelDasHabilidades([item('a', 'dargan')])[0].nivel).toBe(1);
    expect(nivelDasHabilidades([])).toEqual([]);
  });

  it('cada emblema conta pelas habilidades que a própria estrela dele desbloqueia', () => {
    // ★★★ + ★ + ★: habilidade 1 no nível 3, a 2 e a 3 só no nível 1 (só o ★★★ as tem)
    const equipados = [item('a', 'dargan', 3), item('b', 'dargan', 1), item('c', 'dargan', 1)];
    const por = Object.fromEntries(nivelDasHabilidades(equipados).map((n) => [n.indice, n.nivel]));
    expect(por).toEqual({ 0: 3, 1: 1, 2: 1 });
    // tipos diferentes não se misturam
    const misto = nivelDasHabilidades([item('a', 'dargan'), item('b', 'vesper')]);
    expect(misto.map((n) => [n.tipo, n.nivel])).toEqual([['dargan', 1], ['vesper', 1]]);
  });

  it('fusão: 2 de 1★ dão 1 de 2★; 3 de 2★ dão 1 de 3★; o Mítico vai à ★ vermelha; a estrela máxima não funde', () => {
    expect(CUSTO_DA_FUSAO[1]).toBe(2);
    expect(CUSTO_DA_FUSAO[2]).toBe(3);
    const itens = [item('a', 'dargan'), item('b', 'dargan'), item('c', 'dargan'), item('x', 'vesper')];
    const r = fundirEmblemas(itens, [], 'dargan', 1, 'novo');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.consumidos).toEqual(['a', 'b']);
      expect(r.criado).toEqual({ id: 'novo', tipo: 'dargan', estrelas: 2 });
      expect(r.itens.map((i) => i.id).sort()).toEqual(['c', 'novo', 'x']);
    }
    // 3 de 2★
    const duas = fundirEmblemas([item('a', 'dargan', 2), item('b', 'dargan', 2)], [], 'dargan', 2, 'n');
    expect(duas).toEqual({ ok: false, motivo: 'emblemasInsuficientes' });
    const tres = fundirEmblemas([item('a', 'dargan', 2), item('b', 'dargan', 2), item('c', 'dargan', 2)], [], 'dargan', 2, 'n');
    expect(tres.ok && tres.criado.estrelas).toBe(3);
    // 3★ de um emblema comum já é o máximo
    expect(fundirEmblemas([item('a', 'dargan', 3)], [], 'dargan', 3, 'n')).toEqual({ ok: false, motivo: 'estrelaMaxima' });
    // Mítico: 3★ -> ★ vermelha (4ª estrela)
    const mitico = fundirEmblemas([item('a', 'nimb', 3), item('b', 'nimb', 3), item('c', 'nimb', 3)], [], 'nimb', 3, 'n');
    expect(mitico.ok && mitico.criado.estrelas).toBe(4);
    expect(fundirEmblemas([item('a', 'nimb', 4)], [], 'nimb', 4, 'n')).toEqual({ ok: false, motivo: 'estrelaMaxima' });
  });

  it('fusão: os equipados não entram, e tipo ou estrela inválidos são recusados', () => {
    const itens = [item('a', 'dargan'), item('b', 'dargan')];
    expect(fundirEmblemas(itens, ['a'], 'dargan', 1, 'n')).toEqual({ ok: false, motivo: 'emblemasInsuficientes' });
    expect(fundirEmblemas(itens, [], 'x', 1, 'n')).toEqual({ ok: false, motivo: 'tipoInvalido' });
    expect(fundirEmblemas(itens, [], 'dargan', 0, 'n')).toEqual({ ok: false, motivo: 'estrelaInvalida' });
    expect(fundirEmblemas(itens, [], 'dargan', 'x', 'n')).toEqual({ ok: false, motivo: 'estrelaInvalida' });
  });

  it('ler do banco descarta o que é inválido, repetido ou passa dos 4 espaços', () => {
    const lido = lerEmblemasPersonagem(
      [item('a', 'dargan'), item('a', 'vesper'), item('b', 'x'), { id: 'c', tipo: 'dargan', estrelas: 9 }, item('d', 'dargan', 2), null, 'lixo',
       item('e', 'dargan'), item('f', 'dargan'), item('g', 'dargan')],
      ['d', 'a', 'a', 'zzz', 'e', 'f', 'g']
    );
    expect(lido.itens.map((i) => i.id)).toEqual(['a', 'd', 'e', 'f', 'g']);
    expect(lido.equipados).toEqual(['d', 'a', 'e', 'f']);
    expect(lerEmblemasPersonagem(undefined, undefined)).toEqual({ itens: [], equipados: [] });
  });

  it('escolher o tipo dentro da raridade usa o sorteio de 0 a 100', () => {
    expect(escolherTipoDaRaridade('comum', 0).id).toBe('dargan');
    expect(escolherTipoDaRaridade('comum', 99.9).id).toBe('vesper');
    expect(escolherTipoDaRaridade('mitico', 99.9).raridade).toBe('mitico');
    expect(new Set([0, 20, 40, 60, 80].map((v) => escolherTipoDaRaridade('mitico', v).id)).size).toBe(5);
  });
});

describe('Valor da habilidade por nível', () => {
  it('o nível 1 vale o valor do catálogo e os níveis 2, 3 e 4 valem 1,5x, 2x e 2,5x', () => {
    expect([1, 2, 3, 4].map(multiplicadorDoNivel)).toEqual([1, 1.5, 2, 2.5]);
    // fora da faixa, vale o limite
    expect(multiplicadorDoNivel(0)).toBe(1);
    expect(multiplicadorDoNivel(9)).toBe(2.5);
    // ex.: "Aumenta o ATQ em 8%" com 4 emblemas iguais vale 20%
    expect(8 * multiplicadorDoNivel(4)).toBe(20);
  });
});

describe('Atributos dos emblemas', () => {
  it('cada emblema tem 3 atributos diferentes, escolhidos pelo tema', () => {
    for (const t of TIPOS_EMBLEMA) {
      expect(t.atributos).toHaveLength(3);
      expect(new Set(t.atributos).size).toBe(3);
    }
    const por = Object.fromEntries(TIPOS_EMBLEMA.map((t) => [t.id, t.atributos]));
    expect(por.dargan).toEqual(['forca', 'sorte', 'agilidade']); // saqueador agressivo
    expect(por.odrak).toEqual(['vigor', 'vitalidade', 'forca']); // colosso resistente
    expect(por.nimb).toEqual(['agilidade', 'inteligencia', 'sorte']); // tempestade veloz
  });

  it('os pontos crescem com a estrela e com a raridade; só o Mítico tem a 4ª estrela', () => {
    const ordem = ['comum', 'raro', 'muitoRaro', 'epico', 'lendario', 'mitico'] as const;
    for (const r of ordem) {
      const t = PONTOS_DE_ATRIBUTO_POR_ESTRELA[r];
      expect(t).toHaveLength(r === 'mitico' ? 4 : 3);
      for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]);
    }
    for (let e = 0; e < 3; e++) {
      for (let i = 1; i < ordem.length; i++) {
        expect(PONTOS_DE_ATRIBUTO_POR_ESTRELA[ordem[i]][e]).toBeGreaterThanOrEqual(PONTOS_DE_ATRIBUTO_POR_ESTRELA[ordem[i - 1]][e]);
      }
    }
  });

  it('o emblema soma os pontos da estrela nos 3 atributos dele', () => {
    expect(atributosDoEmblema({ tipo: 'dargan', estrelas: 1 })).toMatchObject({ forca: 1, sorte: 1, agilidade: 1, vigor: 0, arcano: 0 });
    expect(atributosDoEmblema({ tipo: 'dargan', estrelas: 3 })).toMatchObject({ forca: 2, sorte: 2, agilidade: 2 });
    expect(atributosDoEmblema({ tipo: 'vharok', estrelas: 3 })).toMatchObject({ inteligencia: 5, arcano: 5, vigor: 5 });
    expect(atributosDoEmblema({ tipo: 'lautrec', estrelas: 4 })).toMatchObject({ forca: 9, vigor: 9, vitalidade: 9 });
    expect(Object.values(atributosDoEmblema({ tipo: 'inventado', estrelas: 3 })).every((v) => v === 0)).toBe(true);
  });

  it('os atributos de vários emblemas equipados se somam', () => {
    const soma = atributosDosEmblemas([item('a', 'dargan', 1), item('b', 'dargan', 1), item('c', 'grimhall', 2)]);
    // Dargan: Força, Sorte, Agilidade (1 cada) x2; Grimhall (Raro, 2★ = 2): Sorte, Agilidade, Vigor
    expect(soma).toMatchObject({ forca: 2, sorte: 4, agilidade: 4, vigor: 2 });
  });

  it('os emblemas equipados entram na ficha de equipamento (mesmo sem arma nem armadura)', () => {
    const ficha = calcularFichaEquipamento(undefined, [], [], [item('a', 'odrak', 3)]);
    expect(ficha.atributos).toMatchObject({ vigor: 6, vitalidade: 6, forca: 6 });
    expect(calcularFichaEquipamento(undefined, [], [], []).atributos.vigor).toBe(0);
  });

  it('emblemasEquipadosDe devolve os itens na ordem dos espaços e ignora ids que não existem', () => {
    const itens = [item('a', 'dargan'), item('b', 'vesper')];
    expect(emblemasEquipadosDe({ emblemasItens: itens, emblemasEquipados: ['b', 'zzz', 'a'] }).map((i) => i.id)).toEqual(['b', 'a']);
    expect(emblemasEquipadosDe({})).toEqual([]);
  });
});
