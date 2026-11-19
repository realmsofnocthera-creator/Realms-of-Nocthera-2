import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BarraVidaEscudo, geometriaDaCena } from '../CombateCacada';

const painel = { nome: 'Lobo', nivel: 3, hp: 30, hpMax: 60, escudo: 5, escudoMax: 10, status: [], enfurecido: false } as never;

describe('HUD da luta', () => {
  it('a barra do inimigo pode vir sem os números por dentro', () => {
    expect(renderToStaticMarkup(<BarraVidaEscudo painel={painel} />)).toContain('30 / 60');
    expect(renderToStaticMarkup(<BarraVidaEscudo painel={painel} semTexto />)).not.toContain('30 / 60');
  });
  it('na tela cheia de um celular em pé, o monstro fica à esquerda e mais ao fundo, o jogador à direita e mais perto', () => {
    const g = geometriaDaCena(390, 844);
    expect(g.monstro.x).toBeLessThan(g.jogador.x);
    expect(g.monstro.pes).toBeLessThan(g.jogador.pes - g.jogador.altura * 0.4);
    // os pés do jogador ficam acima da faixa de baixo (retrato e habilidades)
    expect(g.jogador.pes).toBeLessThan(844 - 90);
    // o monstro fica abaixo da barra de vida do inimigo
    expect(g.monstro.pes - g.monstro.altura).toBeGreaterThan(110);
  });
});

describe('geometria da cena nos mapas da Torre', () => {
  const cena = { monstroX: 0.84, monstroPes: 0.27, jogadorX: 0.5, jogadorPes: 0.62 };

  it('acompanha as duas plataformas: o monstro e o herói ficam dentro da tela', () => {
    for (const [w, h] of [[390, 844], [360, 740], [430, 932]]) {
      const g = geometriaDaCena(w, h, cena);
      expect(g.monstro.x).toBeGreaterThan(0);
      expect(g.monstro.x).toBeLessThan(w);
      expect(g.jogador.x).toBeGreaterThan(0);
      expect(g.jogador.x).toBeLessThan(w);
      expect(g.monstro.pes).toBeLessThan(g.jogador.pes);
    }
  });

  it('sem mapa da Torre a cena continua a da Caçada', () => {
    const a = geometriaDaCena(390, 844);
    const b = geometriaDaCena(390, 844, undefined);
    expect(b).toEqual(a);
    expect(a.esq).toBeCloseTo((a.imgW - 390) / 2);
  });
});
