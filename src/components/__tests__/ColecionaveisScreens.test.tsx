import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuscaScreen } from '@/components/colecionaveis/BuscaScreen';
import { ColecaoScreen, contagemDoQuadro } from '@/components/colecao/ColecaoScreen';
import { arteDaCarta, personagemDaCarta } from '@/assets/cartasDaAlma';
import { BANNER_DA_COLECAO, ICONES_DAS_MOEDAS, ICONES_DE_RARIDADE, MOLDURAS_DOS_COLECIONAVEIS } from '@/assets/colecaoUi';
import { BannerDaLista, IconeDeMoeda, IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import { RARIDADES_DE_COLECIONAVEL } from '@/rules/colecionaveis';
import { RARIDADES_DE_CARTA } from '@/rules/almas';
import { ArteDaCarta, VisualizadorDaCarta } from '@/components/alma/ArteDaCarta';
import { arteDoColecionavel } from '@/assets/colecionaveis';
import { TIPOS_DE_CARTA } from '@/rules/almas';
import { COLECIONAVEIS } from '@/rules/colecionaveis';
import type { CharacterDocument } from '@/server/characterService';

describe('Telas do Buscar e da Coleção', () => {
  it('Buscar abre com a explicação da roleta e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<BuscaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Buscar');
    expect(html).toContain('gasta 10 selos');
    expect(html).toContain('Carregando...');
    expect(html).toContain('href="/menu"');
  });

  it('Coleção abre no hub, com um quadro para cada parte e quantos o jogador tem', () => {
    const html = renderToStaticMarkup(<ColecaoScreen personagem={{ nome: 'Aragorn', nivel: 25 } as CharacterDocument} tokenFresco={async () => 't'} />);
    for (const nome of ['Relíquias Icônicas', 'Sonatas', 'Ecos e Entidades', 'Memórias', 'Cartas da Alma']) expect(html).toContain(nome);
    expect(html).toContain('aria-label="Sonatas: 0 de 30"');
    expect(html).toContain('href="/menu"');
    expect(html).toContain('href="/buscar"');
  });

  it('contagem do quadro: colecionáveis ativados da categoria e cartas descobertas', () => {
    const p = { colecionaveis: { 'RI-C01': { nivel: 1 }, 'RI-C02': { nivel: 0 }, 'SO-C01': { nivel: 3 } }, cartasDescobertas: ['a', 'b'] } as unknown as CharacterDocument;
    expect(contagemDoQuadro(p, 'reliquias')).toEqual({ tenho: 1, total: 30 });
    expect(contagemDoQuadro(p, 'sonatas').tenho).toBe(1);
    expect(contagemDoQuadro(p, 'memorias').tenho).toBe(0);
    expect(contagemDoQuadro(p, 'alma').tenho).toBe(2);
  });

  it('artes dos colecionáveis: as 30 Relíquias têm arte e cada código do catálogo existe', () => {
    const reliquias = COLECIONAVEIS.filter((c) => c.categoria === 'reliquias');
    expect(reliquias).toHaveLength(30);
    for (const c of reliquias) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
    expect(arteDoColecionavel('XX-C01')).toBeUndefined();
  });

  it('artes das Memórias: as 30 têm arte própria e cada uma é diferente', () => {
    const memorias = COLECIONAVEIS.filter((c) => c.categoria === 'memorias');
    expect(memorias).toHaveLength(30);
    for (const c of memorias) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
    expect(new Set(memorias.map((c) => arteDoColecionavel(c.id))).size).toBe(30);
  });

  it('artes dos Ecos e Entidades: as 30 têm arte própria e cada uma é diferente', () => {
    const ecos = COLECIONAVEIS.filter((c) => c.categoria === 'ecos');
    expect(ecos).toHaveLength(30);
    for (const c of ecos) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
    expect(new Set(ecos.map((c) => arteDoColecionavel(c.id))).size).toBe(30);
  });

  it('todos os 120 colecionáveis têm arte', () => {
    for (const c of COLECIONAVEIS) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
  });

  it('artes das Sonatas: uma por raridade, igual para todas da mesma raridade', () => {
    const sonatas = COLECIONAVEIS.filter((c) => c.categoria === 'sonatas');
    expect(sonatas).toHaveLength(30);
    for (const c of sonatas) expect(arteDoColecionavel(c.id), c.id).toBeTruthy();
    expect(arteDoColecionavel('SO-C01')).toBe(arteDoColecionavel('SO-C15'));
    expect(new Set(['SO-C01', 'SO-MR01', 'SO-L01', 'SO-M01'].map(arteDoColecionavel)).size).toBe(4);
  });

  it('artes das cartas da Alma: as 54 têm arte; as 45 não míticas são diferentes e as 9 míticas têm fundo e personagem', () => {
    expect(TIPOS_DE_CARTA).toHaveLength(54);
    for (const t of TIPOS_DE_CARTA) expect(arteDaCarta(t.id), t.id).toBeTruthy();
    const normais = TIPOS_DE_CARTA.filter((t) => t.raridade !== 'mitico');
    expect(new Set(normais.map((t) => arteDaCarta(t.id))).size).toBe(45);
    for (const t of normais) expect(personagemDaCarta(t.id), t.id).toBeUndefined();
    const miticas = TIPOS_DE_CARTA.filter((t) => t.raridade === 'mitico');
    expect(miticas).toHaveLength(9);
    for (const t of miticas) expect(personagemDaCarta(t.id), t.id).toBeTruthy();
    expect(new Set(miticas.map((t) => arteDaCarta(t.id))).size).toBe(9);
    expect(new Set(miticas.map((t) => personagemDaCarta(t.id))).size).toBe(9);
  });

  it('carta mítica: o personagem fica na frente do fundo e só anima quando pedido; a comum é uma imagem só', () => {
    const parada = renderToStaticMarkup(<ArteDaCarta tipoId="alma-mitico-1" className="w-10" />);
    expect(parada).toContain('carta-mitica__fundo');
    expect(parada).toContain('carta-mitica__personagem');
    expect(parada.indexOf('carta-mitica__fundo')).toBeLessThan(parada.indexOf('carta-mitica__personagem'));
    expect(parada).not.toContain('carta-mitica--animada');
    expect(parada).not.toContain('carta-mitica__particula');
    const animada = renderToStaticMarkup(<ArteDaCarta tipoId="alma-mitico-1" animada explosao={2} />);
    expect(animada).toContain('carta-mitica--animada');
    expect(animada).toContain('carta-mitica__particula');
    expect(animada).toContain('carta-mitica__onda');
    expect(renderToStaticMarkup(<ArteDaCarta tipoId="alma-comum-1" />)).not.toContain('carta-mitica');
    expect(renderToStaticMarkup(<ArteDaCarta tipoId="nao-existe" />)).toBe('');
  });

  it('visualizador: mostra o nome, a raridade e o efeito; a mítica abre animada', () => {
    const mitica = renderToStaticMarkup(<VisualizadorDaCarta tipoId="mente-mitico-1" aoFechar={() => {}} />);
    expect(mitica).toContain('Domínio do Instante');
    expect(mitica).toContain('Mítico');
    expect(mitica).toContain('carta-mitica--animada');
    const comum = renderToStaticMarkup(<VisualizadorDaCarta tipoId="corpo-comum-1" aoFechar={() => {}} />);
    expect(comum).toContain('Pulso Vital');
    expect(comum).not.toContain('carta-mitica');
  });

  it('artes da interface da Coleção: 4 moedas, 6 ícones de raridade, 4 molduras e o banner, todos diferentes', () => {
    expect(Object.keys(ICONES_DAS_MOEDAS).sort()).toEqual(['cacos', 'fragmento', 'pedra', 'poeira']);
    const moedas = Object.values(ICONES_DAS_MOEDAS);
    expect(new Set(moedas).size).toBe(4);
    for (const r of RARIDADES_DE_CARTA) expect(ICONES_DE_RARIDADE[r], r).toBeTruthy();
    expect(new Set(RARIDADES_DE_CARTA.map((r) => ICONES_DE_RARIDADE[r])).size).toBe(6);
    for (const r of RARIDADES_DE_COLECIONAVEL) expect(MOLDURAS_DOS_COLECIONAVEIS[r], r).toBeTruthy();
    expect(new Set(RARIDADES_DE_COLECIONAVEL.map((r) => MOLDURAS_DOS_COLECIONAVEIS[r])).size).toBe(4);
    expect(BANNER_DA_COLECAO).toBeTruthy();
  });

  it('banner da lista: o título fica num h1 por cima do banner; os ícones são decorativos', () => {
    const html = renderToStaticMarkup(<BannerDaLista titulo="Ecos e Entidades" />);
    expect(html).toMatch(/<h1[^>]*>Ecos e Entidades<\/h1>/);
    expect(html).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<IconeDeMoeda moeda="poeira" />)).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<IconeDeRaridade raridade="mitico" />)).toContain('<img');
  });
});
