import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createCharacter, executarCacada, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { dropsTela, estrelaDoMonstro, estrelasDoRanque, monstrosDaEstrela, ranquesDaCacada } from '@/lib/cacadaTela';
import { CICLO_ESPECIAL, espacosDoPersonagem, larguraDasBarras, montarQuadros } from '@/lib/cacadaReplay';
import { MochilaScreen } from '@/components/mochila/MochilaScreen';
import { BarraVidaEscudo, destacarLinha, geometriaDaCena } from '@/components/cacada/CombateCacada';
import { CENARIO_ESTRELA, SPRITE_CLASSE, SPRITE_MONSTRO } from '@/lib/cacadaArte';
import fs from 'node:fs';

/** Telas da Caçada: ranque, estrelas, catálogo, replay da luta e Mochila. */
describe('Caçada (telas)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
  });

  it('ranques: baixo no nível 2; alto pede nível 20 e a chave da 5★', () => {
    expect(ranquesDaCacada({ nivel: 1, cacadaChavesVencidas: [] }).map((r) => r.liberado)).toEqual([false, false]);
    expect(ranquesDaCacada({ nivel: 2, cacadaChavesVencidas: [] }).map((r) => r.liberado)).toEqual([true, false]);
    expect(ranquesDaCacada({ nivel: 20, cacadaChavesVencidas: [] })[1].liberado).toBe(false);
    expect(ranquesDaCacada({ nivel: 20, cacadaChavesVencidas: [1, 2, 3, 4, 5] })[1].liberado).toBe(true);
  });

  it('estrelas mostram o motivo do bloqueio e a chave vencida', () => {
    const e = estrelasDoRanque({ nivel: 6, cacadaChavesVencidas: [1] }, 'baixo');
    expect(e.map((x) => x.estrela)).toEqual([1, 2, 3, 4, 5]);
    expect(e[0]).toMatchObject({ liberada: true, chaveVencida: true, bloqueio: null });
    expect(e[1]).toMatchObject({ liberada: true, chaveVencida: false });
    expect(e[2].bloqueio).toBe('Requer nível 8');
    const semChave = estrelasDoRanque({ nivel: 30, cacadaChavesVencidas: [] }, 'baixo');
    expect(semChave[1].bloqueio).toBe('Vença o monstro-chave da 1★');
    expect(estrelasDoRanque({ nivel: 30, cacadaChavesVencidas: [] }, 'alto').map((x) => x.estrela)).toEqual([6, 7, 8, 9]);
  });

  it('catálogo traz os monstros da estrela com drops e chances', () => {
    const m = monstrosDaEstrela(1);
    expect(m.length).toBeGreaterThan(0);
    expect(m.filter((x) => x.chave)).toHaveLength(1);
    for (const x of m) {
      expect(estrelaDoMonstro(x.id)).toBe(1);
      expect(x.drops[0].chance).toBe('Garantido');
    }
    expect(dropsTela(['nao-existe'])).toEqual([]);
  });

  it('a tela da Mochila mostra o material e a quantidade, e avisa quando está vazia', () => {
    const comum = monstrosDaEstrela(1)[0].drops.find((d) => d.raridade === 'comum')!;
    const html = renderToStaticMarkup(React.createElement(MochilaScreen, { character: { nome: 'Yuri', nivel: 3, inventario: { [comum.id]: 3 } } as never }));
    expect(html).toContain(comum.nome);
    expect(html).toContain('×3');
    expect(renderToStaticMarkup(React.createElement(MochilaScreen, { character: { nome: 'Yuri', nivel: 3 } as never }))).toContain('mochila está vazia');
  });

  it('barra única: escudo azul por cima da vida', () => {
    expect(larguraDasBarras({ hp: 50, hpMax: 100, escudo: 0, escudoMax: 0 })).toEqual({ vida: 50, escudo: 0 });
    const b = larguraDasBarras({ hp: 100, hpMax: 100, escudo: 20, escudoMax: 40 });
    expect(b.vida).toBe(100);
    expect(b.escudo).toBeGreaterThan(0);
    const html = renderToStaticMarkup(React.createElement(BarraVidaEscudo, { painel: { nome: 'x', nivel: 1, hp: 30, hpMax: 60, escudo: 10, escudoMax: 10, status: [], enfurecido: false } } as never));
    expect(html).toContain('30');
  });

  it('replay de uma caçada real: quadros, 5 habilidades e fim com o perdedor zerado', async () => {
    await createCharacter('t1', {
      nome: 'Cacador',
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter('t1', { nivel: 2, atributos: { vigor: 400, sorte: 0, forca: 300, vitalidade: 100, arcano: 0, inteligencia: 0, agilidade: 50 } });
    const antes = (await getCharacterByUid('t1'))!;
    const r = await executarCacada('t1', 'lobo-cinzento', { seed: 7, combateId: 'cacada-tela-0001' });
    const quadros = montarQuadros(r.resultado, antes, MONSTROS_CACADA_MAP['lobo-cinzento']);
    expect(quadros.length).toBeGreaterThan(1);
    for (const q of quadros) {
      expect(q.habilidades).toHaveLength(5);
      expect(q.linhas.length).toBeLessThanOrEqual(6);
      expect(q.jogador.hp).toBeGreaterThanOrEqual(0);
    }
    const fim = quadros[quadros.length - 1];
    expect(fim.monstro.hp).toBe(0);
    expect(fim.jogador.hp).toBeGreaterThan(0);
    expect(espacosDoPersonagem(antes)).toHaveLength(5);
    expect(CICLO_ESPECIAL).toBe(3);
  });

  it('artes: cada caminho aponta para um arquivo que existe', () => {
    const caminhos = [...Object.values(SPRITE_CLASSE).map((x) => x.src), ...Object.values(SPRITE_MONSTRO).map((x) => x.src), ...Object.values(CENARIO_ESTRELA)];
    expect(caminhos.length).toBeGreaterThanOrEqual(3);
    for (const c of caminhos) expect(fs.existsSync('public' + c), c).toBe(true);
    for (const id of Object.keys(SPRITE_MONSTRO)) expect(MONSTROS_CACADA_MAP[id], id).toBeTruthy();
  });

  it('cena: monstro sempre acima do jogador e dentro da arena, em telas diferentes', () => {
    for (const [w, h] of [[390, 600], [390, 380], [360, 340], [320, 340], [412, 680], [480, 700]]) {
      const g = geometriaDaCena(w, h);
      expect(g.monstro.pes - g.monstro.altura, `${w}x${h} topo do monstro`).toBeGreaterThanOrEqual(0);
      expect(g.monstro.pes).toBeLessThan(g.jogador.pes - g.jogador.altura * 0.4);
      expect(g.jogador.pes).toBeLessThanOrEqual(h);
      expect(g.monstro.x).toBeGreaterThan(0);
      expect(g.monstro.x).toBeLessThan(w);
      expect(g.imgW).toBeGreaterThanOrEqual(w);
      expect(g.imgH).toBeGreaterThanOrEqual(h);
    }
  });

  it('log: dano em destaque e status na cor do status', () => {
    const html = renderToStaticMarkup(React.createElement('p', null, destacarLinha('Rato recebeu 22 de dano e sofreu Sangramento.')));
    expect(html).toContain('<b style="color:#F3C769">22</b>');
    expect(html).toContain('Sangramento</b>');
    expect(renderToStaticMarkup(React.createElement('p', null, destacarLinha('Yuri usou Golpe.')))).toBe('<p>Yuri usou Golpe.</p>');
  });
});
