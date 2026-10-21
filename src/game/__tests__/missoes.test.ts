import { describe, it, expect } from 'vitest';
import { bloqueioDoObjeto, chaveDaCenaVista, idsDasMissoes, MAXIMO_DE_MISSOES_GUARDADAS, missaoCumprida, motivoDeNaoPoderComecar, objetivoCumprido, processarMissoes, situacaoDoJogador, valorDoObjetivo, type MissoesDoJogador } from '@/game/missoes';
import type { MissaoDados } from '@/rules/missao';

const AGORA = '2026-10-22T12:00:00.000Z';
const def = (parte: Partial<MissaoDados> = {}): MissaoDados => ({
  formato: 1,
  titulo: 'Primeiros passos',
  descricao: '',
  objetivos: [
    { id: 'falar', tipo: 'falar', mapa: 'vila', objeto: 'npc-1' },
    { id: 'rato', tipo: 'derrotar', monstroId: 'rato-da-floresta', quantidade: 2 },
  ],
  requisitos: { missoes: [], nivelMinimo: 0 },
  recompensa: { xp: 10, ouro: 5, itens: [] },
  ...parte,
});
const rodar = (missoes: MissoesDoJogador | undefined, defs: Record<string, MissaoDados>, eventos: Parameters<typeof processarMissoes>[0]['eventos'], extra: Partial<Parameters<typeof processarMissoes>[0]> = {}) =>
  processarMissoes({ missoes, defs, eventos, nivel: 1, inventario: {}, agora: AGORA, ...extra });

describe('Missões: regras do progresso (5.5-5)', () => {
  it('começa a missão pedida; não recomeça nem duplica; missão não publicada é ignorada', () => {
    const r = rodar(undefined, { primeira: def() }, [], { iniciar: ['primeira', 'nao-publicada'] });
    expect(r.iniciadas).toEqual(['primeira']);
    expect(r.missoes).toEqual({ primeira: { estado: 'ativa', progresso: {}, iniciadaEm: AGORA } });
    const de_novo = rodar(r.missoes, { primeira: def() }, [], { iniciar: ['primeira'] });
    expect(de_novo.iniciadas).toEqual([]);
    expect(de_novo.missoes).toEqual(r.missoes);
  });

  it('requisitos: nível e missões concluídas, com o motivo', () => {
    const exigente = def({ requisitos: { missoes: ['antes'], nivelMinimo: 3 } });
    expect(motivoDeNaoPoderComecar(exigente, {}, 2)).toMatch(/nível 3/);
    expect(motivoDeNaoPoderComecar(exigente, {}, 3)).toMatch(/missões anteriores/);
    expect(motivoDeNaoPoderComecar(exigente, { antes: { estado: 'ativa', progresso: {}, iniciadaEm: '' } }, 3)).toMatch(/missões anteriores/);
    expect(motivoDeNaoPoderComecar(exigente, { antes: { estado: 'concluida', progresso: {}, iniciadaEm: '' } }, 3)).toBeNull();
    const r = rodar(undefined, { x: exigente }, [], { iniciar: ['x'], nivel: 1 });
    expect(r.iniciadas).toEqual([]);
    expect(r.motivoDoNaoComeco).toMatch(/nível 3/);
  });

  it('cada acontecimento anda só os objetivos certos; contagem vai até a meta; a missão conclui no último', () => {
    const defs = { primeira: def() };
    let m = rodar(undefined, defs, [], { iniciar: ['primeira'] }).missoes;
    // outro NPC e outro monstro não contam
    expect(rodar(m, defs, [{ tipo: 'falar', mapa: 'vila', objeto: 'npc-2' }, { tipo: 'derrotar', monstroId: 'lobo' }]).missoes).toEqual(m);
    let r = rodar(m, defs, [{ tipo: 'derrotar', monstroId: 'rato-da-floresta' }]);
    expect(r.missoes.primeira.progresso).toEqual({ rato: 1 });
    expect(r.concluidas).toEqual([]);
    r = rodar(r.missoes, defs, [{ tipo: 'falar', mapa: 'vila', objeto: 'npc-1' }, { tipo: 'derrotar', monstroId: 'rato-da-floresta' }, { tipo: 'derrotar', monstroId: 'rato-da-floresta' }]);
    expect(r.missoes.primeira).toMatchObject({ estado: 'concluida', concluidaEm: AGORA, progresso: { falar: 1, rato: 2 } }); // passou da meta e fica na meta
    expect(r.concluidas).toEqual(['primeira']);
    // concluída não anda mais
    expect(rodar(r.missoes, defs, [{ tipo: 'derrotar', monstroId: 'rato-da-floresta' }]).missoes).toEqual(r.missoes);
  });

  it('os seis tipos: baú, cena e chegar; o objetivo de item conta a mochila na hora', () => {
    const d = def({
      objetivos: [
        { id: 'bau', tipo: 'bau', mapa: 'vila', objeto: 'bau-1' },
        { id: 'cena', tipo: 'cena', cenaId: 'chegada' },
        { id: 'chegar', tipo: 'chegar', mapa: 'floresta' },
        { id: 'item', tipo: 'item', itemId: 'pelo-de-rato', quantidade: 2 },
      ],
    });
    let r = rodar(undefined, { m: d }, [], { iniciar: ['m'], inventario: { 'pelo-de-rato': 1 } });
    r = rodar(r.missoes, { m: d }, [{ tipo: 'bau', mapa: 'vila', objeto: 'bau-1' }, { tipo: 'cena', cenaId: 'chegada' }, { tipo: 'chegar', mapa: 'floresta' }], { inventario: { 'pelo-de-rato': 1 } });
    expect(r.concluidas).toEqual([]); // falta o segundo pelo
    expect(valorDoObjetivo(d.objetivos[3], r.missoes.m, { 'pelo-de-rato': 1 })).toBe(1);
    expect(objetivoCumprido(d.objetivos[3], r.missoes.m, { 'pelo-de-rato': 5 })).toBe(true);
    expect(missaoCumprida(d, r.missoes.m, { 'pelo-de-rato': 2 })).toBe(true);
    const fim = rodar(r.missoes, { m: d }, [], { inventario: { 'pelo-de-rato': 2 } });
    expect(fim.concluidas).toEqual(['m']);
  });

  it('missão que começa já cumprida (item na mochila) conclui na hora; missão cujo texto saiu do ar fica parada', () => {
    const d = def({ objetivos: [{ id: 'item', tipo: 'item', itemId: 'pelo-de-rato', quantidade: 1 }] });
    const r = rodar(undefined, { m: d }, [], { iniciar: ['m'], inventario: { 'pelo-de-rato': 1 } });
    expect(r.iniciadas).toEqual(['m']);
    expect(r.concluidas).toEqual(['m']);
    const parada = rodar({ sumiu: { estado: 'ativa', progresso: { falar: 1 }, iniciadaEm: AGORA } }, {}, [{ tipo: 'falar', mapa: 'vila', objeto: 'npc-1' }]);
    expect(parada.missoes.sumiu).toEqual({ estado: 'ativa', progresso: { falar: 1 }, iniciadaEm: AGORA });
  });

  it('para de aceitar missões novas no teto', () => {
    const cheio: MissoesDoJogador = Object.fromEntries(Array.from({ length: MAXIMO_DE_MISSOES_GUARDADAS }, (_, i) => [`m${i}`, { estado: 'concluida' as const, progresso: {}, iniciadaEm: '' }]));
    const r = rodar(cheio, { nova: def() }, [], { iniciar: ['nova'] });
    expect(r.iniciadas).toEqual([]);
    expect(r.motivoDoNaoComeco).toMatch(/Não foi possível registrar/);
  });

  it('situação do jogador e bloqueio de objetos', () => {
    const missoes: MissoesDoJogador = { a: { estado: 'ativa', progresso: {}, iniciadaEm: '' }, b: { estado: 'concluida', progresso: {}, iniciadaEm: '' } };
    const s = situacaoDoJogador({ nivel: 4, inventario: { 'pelo-de-rato': 1 } }, { missoes, cenas: ['abertura', 'vila:cena-1', chaveDaCenaVista('chegada')] });
    expect(s).toEqual({ nivel: 4, inventario: { 'pelo-de-rato': 1 }, missoesAtivas: ['a'], missoesConcluidas: ['b'], cenasVistas: ['chegada'] });
    expect(idsDasMissoes(missoes, 'ativa')).toEqual(['a']);
    expect(bloqueioDoObjeto(undefined, s)).toBeNull();
    expect(bloqueioDoObjeto({ missaoConcluida: 'b', cenaVista: 'chegada', nivelMinimo: 4, item: { id: 'pelo-de-rato', qtd: 1 } }, s)).toBeNull();
    expect(bloqueioDoObjeto({ missaoConcluida: 'a', mensagem: 'Trancada.' }, s)).toBe('Trancada.');
    expect(situacaoDoJogador({ nivel: 1 }, {})).toEqual({ nivel: 1, inventario: {}, missoesAtivas: [], missoesConcluidas: [], cenasVistas: [] });
  });
});
