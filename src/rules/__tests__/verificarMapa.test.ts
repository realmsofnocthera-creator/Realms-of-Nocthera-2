import { describe, it, expect } from 'vitest';
import { mapaVazio, type MapaDados } from '@/rules/mapa';
import { objetoNovo, type ObjetoDoMapa } from '@/rules/objetosDoMapa';
import { TEM_ERRO, tilesAlcancaveis, verificarMapa } from '@/rules/verificarMapa';
import { tileLivre } from '@/rules/passagem';

const mapa = (objetos: ObjetoDoMapa[], colisao: [number, number][] = [], l = 10, a = 8): MapaDados => {
  const m = mapaVazio(l, a);
  m.objetos = objetos;
  for (const [x, y] of colisao) m.camadas.colisao[y * l + x] = 1;
  return m;
};
const porta = (id: string, x: number, y: number, destino: string, dx = 1, dy = 1): ObjetoDoMapa => ({ ...objetoNovo('porta', id, x, y), destino: { mapa: destino, x: dx, y: dy } });
const textos = (p: ReturnType<typeof verificarMapa>, nivel: 'erro' | 'aviso') => p.filter((x) => x.nivel === nivel).map((x) => x.texto);

describe('Verificação do mapa antes de publicar (3.5.6.6)', () => {
  it('mapa certo (início, porta alcançável, destino livre, alguém aponta para ele): sem problemas', () => {
    const vila = mapa([objetoNovo('inicio', 'i', 1, 1), porta('p', 5, 1, 'floresta')]);
    const floresta = mapa([porta('volta', 2, 2, 'vila', 1, 1)]);
    expect(verificarMapa('vila', vila, { floresta })).toEqual([]);
  });

  it('início numa parede é erro; sem início é só aviso', () => {
    const preso = verificarMapa('vila', mapa([objetoNovo('inicio', 'i', 1, 1), porta('p', 5, 1, 'vila')], [[1, 1]]));
    expect(TEM_ERRO(preso)).toBe(true);
    expect(textos(preso, 'erro')[0]).toMatch(/início do jogador.*bloqueado/);
    const sem = verificarMapa('vila', mapa([porta('p', 5, 1, 'vila')]));
    expect(TEM_ERRO(sem)).toBe(false);
    expect(textos(sem, 'aviso').join(' ')).toMatch(/não tem o início/);
  });

  it('porta: destino em mapa que não existe, fora dos limites ou bloqueado são erros', () => {
    const inicio = objetoNovo('inicio', 'i', 0, 0);
    expect(textos(verificarMapa('a', mapa([inicio, porta('p', 3, 3, 'sumiu')])), 'erro')[0]).toMatch(/"sumiu" não foi encontrado/);
    const pequeno = mapa([], [], 4, 4);
    expect(textos(verificarMapa('a', mapa([inicio, porta('p', 3, 3, 'b', 9, 9)]), { b: pequeno }), 'erro')[0]).toMatch(/fora do mapa "b" \(4 × 4\)/);
    const comParede = mapa([], [[2, 2]]);
    expect(textos(verificarMapa('a', mapa([inicio, porta('p', 3, 3, 'b', 2, 2)]), { b: comParede }), 'erro')[0]).toMatch(/está bloqueado/);
    const comNpc = mapa([objetoNovo('npc', 'n', 2, 2)]);
    expect(TEM_ERRO(verificarMapa('a', mapa([inicio, porta('p', 3, 3, 'b', 2, 2)]), { b: comNpc }))).toBe(true);
  });

  it('porta para o próprio mapa confere o destino no próprio mapa', () => {
    const m = mapa([objetoNovo('inicio', 'i', 0, 0), porta('p', 3, 3, 'a', 20, 20)]);
    expect(textos(verificarMapa('a', m), 'erro')[0]).toMatch(/fora do mapa "a"/);
  });

  it('o que o jogador não alcança vira aviso: NPC cercado, porta atrás da parede, área isolada', () => {
    const paredes: [number, number][] = [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7]]; // divide o mapa em dois
    const m = mapa([objetoNovo('inicio', 'i', 1, 1), { ...objetoNovo('npc', 'n', 7, 1), nome: 'Alguém' }, porta('p', 8, 5, 'b')], paredes);
    const p = verificarMapa('a', m, { b: mapa([]) });
    const avisos = textos(p, 'aviso').join(' | ');
    expect(avisos).toMatch(/NPC \(n, em 7, 1\).*não consegue chegar/);
    expect(avisos).toMatch(/Porta ou passagem \(p.*não consegue chegar/);
    expect(avisos).toMatch(/Nenhuma porta é alcançável/);
    expect(TEM_ERRO(p)).toBe(false);
  });

  it('NPC encostado numa parede só alcançável pelo lado vizinho conta como alcançado', () => {
    const m = mapa([objetoNovo('inicio', 'i', 1, 1), { ...objetoNovo('placa', 'pl', 2, 1) }, porta('p', 5, 5, 'a')], [[3, 1], [2, 0], [2, 2]]);
    expect(textos(verificarMapa('a', m), 'aviso').join(' ')).not.toMatch(/Placa/);
  });

  it('mapa isolado e mapa sem portas que recebe visitantes', () => {
    const isolado = verificarMapa('a', mapa([objetoNovo('inicio', 'i', 1, 1)]), { b: mapa([porta('p', 1, 1, 'c')]) });
    expect(textos(isolado, 'aviso').join(' ')).toMatch(/Mapa isolado/);
    const semSaida = verificarMapa('a', mapa([objetoNovo('inicio', 'i', 1, 1)]), { b: mapa([porta('p', 1, 1, 'a')]) });
    expect(textos(semSaida, 'aviso').join(' ')).toMatch(/não tem portas: o jogador que entra aqui não tem como sair/);
    expect(textos(semSaida, 'aviso').join(' ')).not.toMatch(/isolado/);
  });

  it('sem início e sem ninguém apontando: ninguém chega ao mapa', () => {
    const p = verificarMapa('a', mapa([porta('p', 3, 3, 'b')]), { b: mapa([]) });
    expect(textos(p, 'aviso').join(' ')).toMatch(/ninguém chega a este mapa/);
  });

  it('objeto sobre colisão avisa, mas a área de monstros e o início não', () => {
    const m = mapa([objetoNovo('inicio', 'i', 0, 0), { ...objetoNovo('placa', 'pl', 2, 2) }, { ...objetoNovo('cacada', 'c', 3, 3), largura: 2, altura: 2 }, porta('p', 6, 6, 'a', 0, 0)], [[2, 2], [3, 3]]);
    const avisos = textos(verificarMapa('a', m), 'aviso').join(' | ');
    expect(avisos).toMatch(/Placa de texto \(pl, em 2, 2\) está sobre um tile com colisão/);
    expect(avisos).not.toMatch(/Área de monstros.*colisão/);
  });

  it('o alcance respeita colisão, bordas e objetos sólidos', () => {
    const m = mapa([{ ...objetoNovo('npc', 'n', 1, 0) }], [[0, 1]], 3, 2);
    // (0,0) livre; vizinhos: (1,0) NPC sólido, (0,1) parede => só ele mesmo
    expect([...tilesAlcancaveis(m, 0, 0)]).toEqual([0]);
    expect(tilesAlcancaveis(m, 1, 0).size).toBe(0);
    expect(tileLivre(m, 2, 0)).toBe(true);
    expect(tileLivre(m, 3, 0)).toBe(false);
  });

  it('ativador de cena é uma área: alcançável se algum tile dela é; não avisa de colisão', () => {
    const m = mapa([objetoNovo('inicio', 'i', 0, 0), { ...objetoNovo('cena', 'c', 3, 3), largura: 2, altura: 2, cenaId: 'chegada' }], [[3, 3]]);
    const problemas = verificarMapa('vila', m, {});
    expect(problemas.some((p) => p.objetoId === 'c')).toBe(false);
  });
});
