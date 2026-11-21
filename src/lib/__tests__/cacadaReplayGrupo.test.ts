import { describe, expect, it } from 'vitest';
import { resolverCombateEmGrupo, type Combatente } from '@/game/combat';
import { montarQuadrosEmGrupo } from '../cacadaReplayGrupo';
import { posicoesDaFormacao } from '../formacaoDoGrupo';
import { montarChefeDoTeste, type ReplayDoTeste } from '@/rules/testeEquipe';

const aliado = (nome: string, classeId: string, forca: number): Combatente => ({
  nome, hp: 2400, hpMax: 2400, sobreescudo: 300,
  atributos: { vigor: 240, sorte: 10, forca, vitalidade: 60, arcano: 0, inteligencia: 0, agilidade: 40 },
  racaId: 'humano', classeId, nivel: 30, ouro: 0,
});

function replayDe(venceuForca: number): ReplayDoTeste {
  const cs = [aliado('Brann', 'barbaro', venceuForca), aliado('Brann', 'cavaleiro', venceuForca), aliado('Lyra', 'ladino', venceuForca)];
  const chefe = montarChefeDoTeste('alma', 1, 3);
  const r = resolverCombateEmGrupo(cs, chefe, 11);
  return {
    categoria: 'alma',
    chefe: { id: chefe.id, nome: chefe.nome, nivel: chefe.nivel, hp: chefe.hp },
    aliados: r.aliados.map((a, i) => ({ nome: a.nome, nivel: 30, classeId: cs[i].classeId ?? 'barbaro', hpMax: 2400, sobreescudoMax: 300 })),
    turnos: r.replay,
    venceu: r.vencedor === 'grupo',
  };
}

describe('replay da luta em grupo', () => {
  it('um quadro por golpe, com quem agiu e o alvo; o chefe cai na vitória', () => {
    const replay = replayDe(400);
    expect(replay.venceu).toBe(true);
    const quadros = montarQuadrosEmGrupo(replay);
    expect(quadros[0].aliados).toHaveLength(3);
    const ultimo = quadros[quadros.length - 1];
    expect(ultimo.chefe.hp).toBe(0);
    const dosAliados = quadros.filter((q) => q.agiu?.lado === 'aliado');
    const doChefe = quadros.filter((q) => q.agiu?.lado === 'chefe');
    expect(dosAliados.length).toBeGreaterThan(0);
    // mais de um aliado age, e os dois "Brann" são separados pelo nome
    expect(new Set(dosAliados.map((q) => (q.agiu as { i: number }).i)).size).toBeGreaterThanOrEqual(2);
    for (const q of doChefe) expect((q.agiu as { alvo: number }).alvo).toBeGreaterThanOrEqual(0);
    for (const q of dosAliados) expect(q.acao?.de).toBe('jogador');
    for (const q of doChefe) expect(q.acao?.de).toBe('monstro');
    // a rodada nunca volta atrás
    for (let i = 1; i < quadros.length; i++) expect(quadros[i].rodada).toBeGreaterThanOrEqual(quadros[i - 1].rodada);
  });

  it('na derrota o chefe resiste (com vida) e os aliados caídos ficam com a vida zerada', () => {
    const replay = replayDe(1);
    expect(replay.venceu).toBe(false);
    const quadros = montarQuadrosEmGrupo(replay);
    const ultimo = quadros[quadros.length - 1];
    expect(ultimo.chefe.hp).toBeGreaterThan(0);
    expect(ultimo.aliados.some((a) => a.hp <= 0)).toBe(true);
  });
});

describe('formação do grupo na arena', () => {
  it('3 aliados: um na frente, no centro, e dois atrás, um de cada lado; nada sai da tela', () => {
    const [frente, esq, dir] = posicoesDaFormacao(3, 390, 844, 250, 580);
    expect(frente.pes).toBeGreaterThan(esq.pes);
    expect(esq.pes).toBe(dir.pes);
    expect(esq.x).toBeLessThan(frente.x);
    expect(frente.x).toBeLessThan(dir.x);
    for (const p of [frente, esq, dir]) { expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(390); expect(p.pes).toBeLessThan(844 * 0.81); }
  });

  it('2 aliados: um na frente e outro atrás; 1: o lugar de sempre', () => {
    const [a, b] = posicoesDaFormacao(2, 390, 844, 250, 580);
    expect(a.pes).toBeGreaterThan(b.pes);
    expect(posicoesDaFormacao(1, 390, 844, 250, 580)).toEqual([{ x: 250, pes: 580 }]);
  });
});
