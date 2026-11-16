import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LivroDaCacada, lugarInicial } from '../LivroDaCacada';
import { LIVRO_DA_CACADA as L } from '@/assets/cacadaLivroUi';

const pasta = join(process.cwd(), 'src/assets/images/cacada-livro');
const personagem = (nivel: number, chaves: number[] = []) => ({ nivel, cacadaChavesVencidas: chaves }) as never;
const html = (p: never, lugar = lugarInicial()) =>
  renderToStaticMarkup(<LivroDaCacada personagem={p} lugar={lugar} aoMudarLugar={() => {}} ocupado={false} aoCacar={() => {}} />);

describe('LivroDaCacada', () => {
  it('mostra as duas abas, as cinco fitas do ranque Baixo e os botões', () => {
    const h = html(personagem(10));
    expect(h).toContain('Rank Baixo');
    expect(h).toContain('Rank Alto');
    for (let n = 1; n <= 5; n++) expect(h).toContain(`Dificuldade ${n} estrelas`);
    expect(h).toContain('Caçar');
    expect(h).not.toContain('Ficha');
  });
  it('no ranque Alto, as fitas são de 6★ a 9★', () => {
    const h = html(personagem(25, [5]), { ranque: 'alto', estrela: 6, monstroId: lugarInicial().monstroId });
    for (let n = 6; n <= 9; n++) expect(h).toContain(`Dificuldade ${n} estrelas`);
    expect(h).not.toContain('Dificuldade 1 estrelas');
  });
  it('estrela bloqueada avisa o requisito e desliga o Caçar', () => {
    const h = html(personagem(2));
    expect(h).toContain('Bloqueada: Requer nível');
  });
  it('a página da direita mostra fraquezas, resistências e drops', () => {
    const h = html(personagem(10));
    expect(h).toContain('Fraquezas');
    expect(h).toContain('Resist.');
    expect(h).toContain('Drops');
  });
  it('as caixas de abas, fitas e virada cabem no livro', () => {
    const caixas = [L.abas.baixo.caixa, L.abas.alto.caixa, ...L.fitas.map((f) => f.caixa), L.virada.caixa, L.paginas.esquerda, L.paginas.direita];
    for (const c of caixas) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.largura).toBeLessThanOrEqual(L.largura);
      expect(c.y + c.altura).toBeLessThanOrEqual(L.altura);
    }
  });
  it('as imagens existem, têm o tamanho das caixas e ficam abaixo de 350 KB', async () => {
    const esperado: Record<string, { largura: number; altura: number }> = {
      'livro.webp': { largura: L.largura, altura: L.altura },
      'aba-baixo.webp': L.abas.baixo.caixa,
      'aba-alto.webp': L.abas.alto.caixa,
      ...Object.fromEntries(L.fitas.map((f, i) => [`fita-${i + 1}.webp`, f.caixa])),
      ...Object.fromEntries(L.virada.quadros.map((_, i) => [`virada-${i + 1}.webp`, L.virada.caixa])),
    };
    for (const [arquivo, tam] of Object.entries(esperado)) {
      const buf = readFileSync(join(pasta, arquivo));
      expect(buf.length, arquivo).toBeLessThanOrEqual(350 * 1024);
      const meta = await sharp(buf).metadata();
      expect([meta.width, meta.height], arquivo).toEqual([tam.largura, tam.altura]);
    }
  });
});

describe('layout da ficha: o botão Caçar nunca some', () => {
  it('os ícones encolhem para caber numa linha só', async () => {
    const { tamanhoDoIcone } = await import('../DetalhesDoMonstro');
    expect(tamanhoDoIcone(2, 25)).toBe('4.8cqw');
    expect(parseFloat(tamanhoDoIcone(5, 25))).toBeLessThanOrEqual(4.6);
    for (let n = 1; n <= 7; n++) {
      const t = parseFloat(tamanhoDoIcone(n, 25));
      expect(t * n + 0.6 * (n - 1)).toBeLessThanOrEqual(25.01);
    }
    for (let n = 1; n <= 4; n++) expect(parseFloat(tamanhoDoIcone(n, 14.2)) * n + 0.6 * (n - 1)).toBeLessThanOrEqual(14.21);
  });
  it('o botão Caçar fica fora da área que corta o conteúdo', () => {
    const h = html(personagem(10), { ranque: 'alto', estrela: 6, monstroId: 'raizark' });
    const i = h.indexOf('shrink-0 flex justify-center');
    expect(i).toBeGreaterThan(h.indexOf('overflow-hidden'));
    expect(h.indexOf('Caçar', i)).toBeGreaterThan(i);
  });
});
