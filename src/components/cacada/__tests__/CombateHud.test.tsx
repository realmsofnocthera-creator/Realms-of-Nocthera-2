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
