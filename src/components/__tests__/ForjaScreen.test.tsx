import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FUNDO_DA_FERRARIA, QUADROS_DO_FERREIRO, SPRITES_DO_FERREIRO } from '@/assets/ferreiro';
import { FerreiroScreen } from '@/components/forja/FerreiroScreen';
import { FALAS_SOLTAS_DO_FERREIRO, falaComNome, SAUDACOES_DO_FERREIRO } from '@/rules/falasDoFerreiro';
import { ForjaScreen } from '@/components/forja/ForjaScreen';
import { AnimacaoDeForja } from '@/components/forja/AnimacaoDeForja';
import { FolhaDetalhe } from '@/components/forja/PopupsDaForja';
import { detalheDaArma } from '@/lib/forjaTela';
import type { CharacterDocument } from '@/server/characterService';

vi.mock('next/link', () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

const personagem = { uid: 'u', nome: 'Yuri', nivel: 12, ouro: 1500, inventario: {}, armas: [] } as unknown as CharacterDocument;

describe('Ferreiro e Forja', () => {
  it('o Ferreiro abre na ferraria em tela cheia: o ferreiro animado, o link do Menu e o menu só depois da saudação', () => {
    const html = renderToStaticMarkup(<FerreiroScreen character={personagem} />);
    expect(html).toContain('ferreiro-sprite');
    expect(html).toContain('Conversar com o Ferreiro');
    expect(html).toContain('href="/menu"');
    expect(html.match(/forja-faisca/g)).toHaveLength(10);
    // a saudação é sorteada depois de abrir: no primeiro desenho ainda não há caixa de diálogo nem menu
    expect(html).not.toContain('Menu do Ferreiro');
    expect(html).not.toContain('role="dialog"');
  });

  it('falas do Ferreiro: 3 saudações de até 3 linhas curtas, o nome entra no lugar de {nome}, e há falas soltas', () => {
    expect(SAUDACOES_DO_FERREIRO).toHaveLength(3);
    for (const set of SAUDACOES_DO_FERREIRO) {
      expect(set.length).toBeGreaterThanOrEqual(2);
      expect(set.length).toBeLessThanOrEqual(3);
      for (const l of set) expect(l.length).toBeLessThanOrEqual(100);
    }
    expect(falaComNome('Ah, {nome}! {nome}.', 'Yuri')).toBe('Ah, Yuri! Yuri.');
    expect(FALAS_SOLTAS_DO_FERREIRO.length).toBeGreaterThanOrEqual(4);
    for (const l of FALAS_SOLTAS_DO_FERREIRO) expect(l.length).toBeLessThanOrEqual(60);
    expect(SAUDACOES_DO_FERREIRO.flat().some((l) => l.includes('{nome}'))).toBe(true);
  });

  it('artes do Ferreiro: o fundo e a folha de 7 quadros em linha', () => {
    expect(FUNDO_DA_FERRARIA).toBeTruthy();
    expect(SPRITES_DO_FERREIRO).toBeTruthy();
    expect(QUADROS_DO_FERREIRO.colunas * QUADROS_DO_FERREIRO.linhas).toBe(QUADROS_DO_FERREIRO.total);
    expect(QUADROS_DO_FERREIRO.total).toBe(7);
    expect(QUADROS_DO_FERREIRO.linhas).toBe(1);
  });

  it('a Forja abre na grade com as 6 categorias de arma, sem pop-up, e mostra quantas armas há em cada', () => {
    const c = { ...personagem, armas: [{ id: 'a1', baseId: 'ferro-de-cacada', categoria: 'katana', atributo: 'forca', pontos: 4, reforjas: 0, criadaEm: '' }] } as unknown as CharacterDocument;
    const html = renderToStaticMarkup(<ForjaScreen character={c} onCharacterChange={() => {}} tokenFresco={async () => 't'} />);
    for (const n of ['Espada grande', 'Katana', 'Lança', 'Espada e escudo', 'Grimório', 'Cajado']) expect(html).toContain(n);
    expect(html).toContain('Categorias de arma');
    expect(html).toContain('Katana, você tem 1');
    expect(html).toContain('href="/ferreiro"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('Árvore de Rato da Floresta');
  });

  it('a categoria aberta mostra as abas, o ouro na barra de título e a árvore das Espadas grandes na 1★', () => {
    const html = renderToStaticMarkup(<ForjaScreen character={personagem} onCharacterChange={() => {}} tokenFresco={async () => 't'} categoriaInicial="espadaGrande" />);
    expect(html).toContain('Árvore');
    expect(html).toContain('Lista (0)');
    expect(html).toContain('Minhas (0)');
    expect(html).toContain('Ouro: 1.500');
    expect(html).toContain('Árvore de Rato da Floresta');
    expect(html).toContain('Rato das Cinzas');
    expect(html).toContain('Ferro de Caçada, Comum. Falta material ou ouro');
    expect(html).not.toContain('Árvore de Grizzharn');
    expect(html).not.toContain('role="dialog"');
  });
});

describe('Armaduras', () => {
  it('abre nos conjuntos 1★ com as 5 peças de cada um', async () => {
    const { ArmaduraScreen } = await import('@/components/forja/ArmaduraScreen');
    const html = renderToStaticMarkup(<ArmaduraScreen character={personagem} onCharacterChange={() => {}} tokenFresco={async () => 't'} />);
    expect(html).toContain('Melhorar armadura');
    expect(html).toContain('Minhas peças (0)');
    expect(html).toContain('Conjunto Rato da Floresta');
    expect(html).toContain('Gibão de Rato da Floresta (Peitoral). Falta material ou ouro');
    expect(html).not.toContain('Conjunto Grizzharn');
    expect(html).not.toContain('role="dialog"');
  });
});

describe('Minhas armas: reforjar e customizar', () => {
  const nada = () => {};
  const armaComum = { id: 'a1', baseId: 'ferro-de-cacada', categoria: 'espadaGrande', atributo: 'forca', pontos: 4, reforjas: 1, criadaEm: '' };

  it('a Forja mostra a quantidade de armas na aba Minhas armas', () => {
    const c = { ...personagem, armas: [armaComum] } as unknown as CharacterDocument;
    const html = renderToStaticMarkup(<ForjaScreen character={c} onCharacterChange={nada} tokenFresco={async () => 't'} categoriaInicial="espadaGrande" />);
    expect(html).toContain('Minhas (1)');
  });

  it('a folha de uma arma comum tem Reforjar com o custo e não oferece Customização', async () => {
    const { FolhaMinhaArma } = await import('@/components/forja/ForjaScreen');
    const { detalheDaMinhaArma } = await import('@/lib/forjaTela');
    const c = { ...personagem, armas: [armaComum] } as unknown as CharacterDocument;
    const d = detalheDaMinhaArma('a1', c)!;
    const html = renderToStaticMarkup(<FolhaMinhaArma detalhe={d} ocupado={false} erro={null} onFechar={nada} onReforjar={nada} onCustomizar={nada} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Reforjar (75% da receita)'); // 50% + 25% de uma reforja já feita
    expect(html).toContain('Falta material ou ouro');
    expect(html).toContain('Só as armas Míticas podem ser customizadas');
    expect(html).not.toContain('Adicionar ponto em');
  });

  it('a folha de uma arma Mítica mostra a Customização com as três opções e o custo por ponto', async () => {
    const { FolhaMinhaArma } = await import('@/components/forja/ForjaScreen');
    const { detalheDaMinhaArma } = await import('@/lib/forjaTela');
    const { ARMAS_BASE } = await import('@/rules/armasCatalogo');
    const mitica = ARMAS_BASE.find((b) => b.raridade === 'mitico' && b.status.length > 0)!;
    const c = {
      ...personagem,
      ouro: 50000,
      inventario: { 'bilhete-de-melhoria': 2 },
      armas: [{ id: 'm1', baseId: mitica.id, categoria: 'espadaGrande', atributo: 'forca', pontos: 120, reforjas: 0, customizacao: { dano: 3 }, criadaEm: '' }],
    } as unknown as CharacterDocument;
    const d = detalheDaMinhaArma('m1', c)!;
    const html = renderToStaticMarkup(<FolhaMinhaArma detalhe={d} ocupado={false} erro={null} onFechar={nada} onReforjar={nada} onCustomizar={nada} />);
    expect(html).toContain('Customização (3/20 pontos)');
    expect(html).toContain('Adicionar ponto em Dano');
    expect(html).toContain('Adicionar ponto em Atributo secundário');
    expect(html).toContain('Adicionar ponto em Mais status');
    expect(html).toContain('Bilhete de melhoria');
    expect(html).toContain('2/1');
    expect(html).not.toContain('Só as armas Míticas');
  });

  it('mostra o erro do servidor na folha', async () => {
    const { FolhaMinhaArma } = await import('@/components/forja/ForjaScreen');
    const { detalheDaMinhaArma } = await import('@/lib/forjaTela');
    const c = { ...personagem, armas: [armaComum] } as unknown as CharacterDocument;
    const html = renderToStaticMarkup(<FolhaMinhaArma detalhe={detalheDaMinhaArma('a1', c)!} ocupado={false} erro="Materiais insuficientes." onFechar={nada} onReforjar={nada} onCustomizar={nada} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Materiais insuficientes.');
  });

  it('o pop-up de uma arma da árvore mostra a receita com tem/precisa, o custo em ouro e o botão Fabricar travado sem material', () => {
    const d = detalheDaArma('ferro-de-cacada', 'espadaGrande', personagem)!;
    const html = renderToStaticMarkup(<FolhaDetalhe detalhe={d} categoria="espadaGrande" ocupado={false} erro={null} onFechar={nada} onForjar={nada} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Ferro de Caçada');
    expect(html).toContain('Pelo de Rato');
    expect(html).toContain('0/6');
    expect(html).toContain('Falta material ou ouro');
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toContain('aria-label="Receita"');
  });

  it('o pop-up mostra o erro do servidor', () => {
    const d = detalheDaArma('ferro-de-cacada', 'espadaGrande', personagem)!;
    const html = renderToStaticMarkup(<FolhaDetalhe detalhe={d} categoria="espadaGrande" ocupado={false} erro="Materiais insuficientes." onFechar={nada} onForjar={nada} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Materiais insuficientes.');
  });

  it('animação de forjar: martelando mostra o ferreiro e as faíscas; revelada mostra o resultado, com raios só nas lendárias e míticas', () => {
    const base = { titulo: 'ARMA FORJADA!', nome: 'Ferro de Caçada', categoria: 'espadaGrande' as const, linhas: [{ rotulo: 'Força', antes: '+4', depois: '+9', subiu: true }], aoFechar: nada };
    const martelando = renderToStaticMarkup(<AnimacaoDeForja {...base} fase="martelando" raridade="comum" />);
    expect(martelando).toContain('ferreiro-sprite');
    expect(martelando).toContain('fx-faisca');
    expect(martelando).not.toContain('Ótimo!');
    const comum = renderToStaticMarkup(<AnimacaoDeForja {...base} fase="revelada" raridade="comum" />);
    expect(comum).toContain('Ótimo!');
    expect(comum).toContain('Força');
    expect(comum).toContain('▲');
    expect(comum).not.toContain('revela-raios');
    expect(renderToStaticMarkup(<AnimacaoDeForja {...base} fase="revelada" raridade="lendario" />)).toContain('revela-raios');
    expect(renderToStaticMarkup(<AnimacaoDeForja {...base} fase="revelada" raridade="mitico" linhas={[{ rotulo: 'Força', antes: '+9', depois: '+4', subiu: false }]} />)).toContain('▼');
  });
});
