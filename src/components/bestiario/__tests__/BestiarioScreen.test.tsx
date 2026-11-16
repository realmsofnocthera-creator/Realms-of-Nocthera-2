import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BestiarioScreen } from '../BestiarioScreen';
import { categoriasDoBestiario, paginasDoBestiario } from '@/lib/bestiarioTela';
import { MONSTROS_CACADA_DADOS } from '@/rules/cacada';
import { CLASSIFICACAO_DO_MONSTRO } from '@/rules/classificacaoDosMonstros';
import { CLASSIFICACOES_DE_MONSTRO } from '@/rules/maestrias';
import { ICONES_DAS_TRILHAS_DE_MONSTRO } from '@/assets/maestriasUi';

const personagem = (extra = {}) => ({ nome: 'Yuri', nivel: 10, ...extra }) as never;

describe('Bestiário', () => {
  it('tem todas as criaturas do jogo, cada uma uma vez, por categoria', () => {
    const todas = categoriasDoBestiario().flatMap((c) => c.monstros.map((m) => m.id));
    expect(todas.length).toBe(MONSTROS_CACADA_DADOS.length);
    expect(new Set(todas).size).toBe(todas.length);
    for (const c of categoriasDoBestiario()) expect(c.monstros.every((m) => CLASSIFICACAO_DO_MONSTRO[m.id] === c.id)).toBe(true);
  });
  it('as páginas guardam até 6 criaturas da mesma categoria', () => {
    for (const p of paginasDoBestiario()) {
      expect(p.monstros.length).toBeGreaterThan(0);
      expect(p.monstros.length).toBeLessThanOrEqual(6);
      expect(p.monstros.every((m) => CLASSIFICACAO_DO_MONSTRO[m.id] === p.categoriaId)).toBe(true);
    }
  });
  it('mostra o livro, a faixa de categorias e o nível da criatura', () => {
    const h = renderToStaticMarkup(<BestiarioScreen personagem={personagem()} />);
    expect(h).toContain('Bestiário');
    expect(h).toContain('Nível 0/4');
    expect(h).toContain('Ir para Feras');
    expect(h).toContain('ainda não derrotada');
  });
  it('sem derrotas, os drops, as resistências e as fraquezas aparecem como "?"', () => {
    const h = renderToStaticMarkup(<BestiarioScreen personagem={personagem()} />);
    expect(h).toContain('Ainda não descoberto');
    expect(h).not.toContain('ver informações');
  });
  it('no nível 4, as informações aparecem e podem ser tocadas', () => {
    const primeira = paginasDoBestiario()[0].monstros[0].id;
    const h = renderToStaticMarkup(<BestiarioScreen personagem={personagem({ bestiario: { [primeira]: 10 } })} />);
    expect(h).toContain('Nível 4/4');
    expect(h).toContain('ver informações');
    expect(h).not.toContain('Ainda não descoberto');
  });
});

describe('Bestiário: nomes na lista', () => {
  it('palavras longas ganham fonte menor para caber na coluna', async () => {
    const { tamanhoDoNome } = await import('../BestiarioScreen');
    expect(tamanhoDoNome('Rato')).toBe(1.8);
    expect(tamanhoDoNome('Floragoth Carmesim')).toBe(1.7);
    expect(tamanhoDoNome('Esqueleto Amaldiçoado')).toBe(1.55);
  });
});

describe('Bestiário: as 13 classificações do Yuri', () => {
  it('toda criatura tem uma classificação das 13, e só elas aparecem', () => {
    const ids = new Set(CLASSIFICACOES_DE_MONSTRO.map((c) => c.id as string));
    for (const m of MONSTROS_CACADA_DADOS) expect(ids.has(CLASSIFICACAO_DO_MONSTRO[m.id]), m.id).toBe(true);
    for (const c of categoriasDoBestiario()) {
      expect(ids.has(c.id)).toBe(true);
      expect(ICONES_DAS_TRILHAS_DE_MONSTRO[`monstro:${c.id}`], c.id).toBeDefined();
    }
  });
  it('as categorias seguem a ordem do Yuri e nenhuma inventada aparece', () => {
    const nomes = categoriasDoBestiario().map((c) => c.nome);
    expect(nomes).toContain('Necrófagos');
    expect(nomes).toContain('Leviatãs');
    expect(nomes).not.toContain('Fera pequena');
    expect(nomes).not.toContain('Wyvern');
    const ordem = CLASSIFICACOES_DE_MONSTRO.map((c) => c.nome as string).filter((n) => nomes.includes(n));
    expect(nomes).toEqual(ordem);
  });
});
