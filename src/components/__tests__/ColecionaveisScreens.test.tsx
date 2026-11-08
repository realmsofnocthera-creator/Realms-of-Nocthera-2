import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BuscaScreen } from '@/components/colecionaveis/BuscaScreen';
import { ColecaoScreen, contagemDoQuadro } from '@/components/colecao/ColecaoScreen';
import { arteDaCarta, personagemDaCarta } from '@/assets/cartasDaAlma';
import { BANNER_DA_COLECAO, ICONES_DAS_MOEDAS, ICONES_DE_RARIDADE, MOLDURAS_DOS_COLECIONAVEIS } from '@/assets/colecaoUi';
import { BannerDaLista, IconeDeMoeda, IconeDeRaridade } from '@/components/colecao/ArtesDaColecao';
import { ANEL_DA_ROLETA, BRILHO_DA_RARIDADE, FUNDO_DO_BUSCAR, GEMA_DA_ROLETA, ICONES_DOS_SELOS, VERSO_DO_COLECIONAVEL } from '@/assets/buscarUi';
import { InfoDaBusca } from '@/components/colecionaveis/InfoDaBusca';
import { etiquetaDoResultado, melhorRaridade, RevelacaoDaBusca } from '@/components/colecionaveis/RevelacaoDaBusca';
import type { ResultadoDaBusca } from '@/game/colecionaveis';
import { SELOS_DE_BUSCA } from '@/rules/colecionaveis';
import { COLECIONAVEL_MAP, RARIDADES_DE_COLECIONAVEL } from '@/rules/colecionaveis';
import { HudDaColecao } from '@/components/colecao/HudDaColecao';
import { PopupDoColecionavel } from '@/components/colecionaveis/PopupDoColecionavel';
import { LORE_DOS_COLECIONAVEIS } from '@/rules/loreColecionaveis';
import { RARIDADES_DE_CARTA } from '@/rules/almas';
import { ArteDaCarta, VisualizadorDaCarta } from '@/components/alma/ArteDaCarta';
import { arteDoColecionavel } from '@/assets/colecionaveis';
import { TIPOS_DE_CARTA } from '@/rules/almas';
import { COLECIONAVEIS } from '@/rules/colecionaveis';
import type { CharacterDocument } from '@/server/characterService';

describe('Telas do Buscar e da Coleção', () => {
  it('Buscar abre em tela cheia, com o carregamento e os links para o Menu e a Coleção (sem texto corrido)', () => {
    const html = renderToStaticMarkup(<BuscaScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Carregando...');
    expect(html).toContain('href="/menu"');
    expect(html).toContain('href="/colecao"');
    expect(html).toContain('aria-label="Chances e garantia da busca"');
    expect(html).not.toContain('gasta 10 selos');
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

  it('lore: os 120 colecionáveis têm um mini texto curto, cada um diferente, e nenhum id sobrando', () => {
    const ids = COLECIONAVEIS.map((c) => c.id).sort();
    expect(Object.keys(LORE_DOS_COLECIONAVEIS).sort()).toEqual(ids);
    for (const t of Object.values(LORE_DOS_COLECIONAVEIS)) {
      expect(t.length).toBeGreaterThan(30);
      expect(t.length).toBeLessThanOrEqual(160);
    }
    expect(new Set(Object.values(LORE_DOS_COLECIONAVEIS)).size).toBe(120);
  });

  it('HUD da Coleção: as 4 moedas, cada uma com o total no rótulo', () => {
    const html = renderToStaticMarkup(<HudDaColecao saldos={{ fragmentos: 1400, pedras: 3, poeira: 25, cacos: 2_500_000 }} />);
    expect(html).toContain('Fragmentos de Memória: 1.400');
    expect(html).toContain('Pedras da Recordação: 3');
    expect(html).toContain('Poeira de Alma: 25');
    expect(html).toContain('Cacos de Alma: 2.500.000');
    expect(html.match(/<button/g)).toHaveLength(4);
  });

  const pop = (id: string, e: object | undefined, saldos: { memoria?: number; pedras?: number } = {}) =>
    renderToStaticMarkup(
      <PopupDoColecionavel c={COLECIONAVEL_MAP[id]} e={e as never} memoria={saldos.memoria ?? 0} pedras={saldos.pedras ?? 0} ocupado={false} aviso={null} aoAgir={() => {}} aoFechar={() => {}} />,
    );

  it('pop-up: sem ativar mostra o lore, o bônus com o ícone do atributo e o botão Ativar (travado sem fragmentos)', () => {
    const html = pop('RI-C01', { fragmentos: 3 });
    expect(html).toContain('Medalhão do Viajante');
    expect(html).toContain(LORE_DOS_COLECIONAVEIS['RI-C01'].replace(/'/g, '&#x27;'));
    expect(html).toContain('ao ativar');
    expect(html).toContain('3/20 frag.');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>\s*Ativar/);
    expect(html).not.toContain('Reforçar');
  });

  it('pop-up: com fragmentos suficientes o Ativar libera; ativado mostra nível, estrelas e os botões de reforço e estrela', () => {
    expect(pop('RI-C01', { fragmentos: 20 })).not.toMatch(/<button[^>]*disabled[^>]*>\s*Ativar/);
    const ativo = pop('RI-C01', { fragmentos: 5, nivel: 4, estrelas: 1 }, { memoria: 500, pedras: 5 });
    expect(ativo).toContain('NV 4/');
    expect(ativo).toContain('bônus atual');
    expect(ativo).toContain('Reforçar +1');
    expect(ativo).not.toContain('>Ativar');
    expect(pop('RI-C01', { fragmentos: 5, nivel: 4, estrelas: 1 })).toMatch(/<button[^>]*disabled[^>]*>\s*Reforçar/);
  });

  it('artes do Buscar: fundo, anel, gema, verso, 4 selos diferentes e uma cor de brilho por raridade', () => {
    for (const a of [FUNDO_DO_BUSCAR, ANEL_DA_ROLETA, GEMA_DA_ROLETA, VERSO_DO_COLECIONAVEL]) expect(a).toBeTruthy();
    expect(new Set(SELOS_DE_BUSCA.map((s) => ICONES_DOS_SELOS[s])).size).toBe(4);
    expect(new Set(Object.values(BRILHO_DA_RARIDADE)).size).toBe(4);
  });

  const res = (id: string, raridade: ResultadoDaBusca['raridade'], extra: Partial<ResultadoDaBusca> = {}): ResultadoDaBusca =>
    ({ id, nome: COLECIONAVEL_MAP[id].nome, raridade, inteiro: false, fragmentos: 4, ativou: false, garantido: false, ...extra });

  it('revelação: etiqueta Novo ou fragmentos, e a melhor raridade do lote', () => {
    expect(etiquetaDoResultado(res('RI-C01', 'comum', { ativou: true }))).toBe('NOVO!');
    expect(etiquetaDoResultado(res('RI-C01', 'comum', { fragmentos: 6 }))).toBe('+6 FRAG.');
    expect(melhorRaridade([res('RI-C01', 'comum'), res('RI-L01', 'lendario'), res('RI-MR01', 'muitoRaro')])).toBe('lendario');
    expect(melhorRaridade([res('RI-C01', 'comum')])).toBe('comum');
  });

  it('revelação: as cartas chegam viradas para baixo (verso) e o botão Pular está lá; o nome fica escondido até virar', () => {
    const html = renderToStaticMarkup(<RevelacaoDaBusca resultados={[res('RI-L01', 'lendario', { inteiro: true, ativou: true })]} aoFechar={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('revela-carta--aguarda');
    expect(html).toContain('Pular');
    expect(html).toMatch(/opacity-0[^>]*>Coroa do Primeiro Soberano/);
    const dez = renderToStaticMarkup(<RevelacaoDaBusca resultados={Array.from({ length: 10 }, () => res('RI-C01', 'comum'))} aoFechar={() => {}} />);
    expect(dez.match(/revela-carta__giro/g)!.length).toBeGreaterThanOrEqual(10);
    expect(dez).toContain('grid-cols-5');
  });

  it('chances: mostra a tabela do selo, a garantia e troca de selo pelas abas', () => {
    const html = renderToStaticMarkup(<InfoDaBusca seloInicial="eternidade" aoFechar={() => {}} />);
    expect(html).toContain('Selo da Eternidade');
    expect(html).toContain('74%');
    expect(html).toContain('Garantia: Lendário inteiro');
    expect(html.match(/role="tab"/g)).toHaveLength(4);
  });
});
