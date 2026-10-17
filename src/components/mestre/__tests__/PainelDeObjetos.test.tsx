import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PainelDeObjetos } from '@/components/mestre/PainelDeObjetos';
import { objetoNovo, TIPOS_DE_OBJETO, type ObjetoDoMapa } from '@/rules/objetosDoMapa';

const base = {
  tipo: 'npc' as const,
  setTipo: () => undefined,
  selecionar: () => undefined,
  movendo: false,
  setMovendo: () => undefined,
  mudar: () => undefined,
  remover: () => undefined,
  erros: [] as string[],
  mapas: [{ id: 'vila', nome: 'Vila' }],
  monstros: [{ id: 'lobo-cinzento', nome: 'Lobo Cinzento' }],
  materiais: [{ id: 'pelo-de-rato', nome: 'Pelo de Rato' }],
};
const render = (objetos: ObjetoDoMapa[], selecionado: string | null, podeEditar = true, erros: string[] = []) =>
  renderToStaticMarkup(<PainelDeObjetos {...base} objetos={objetos} selecionado={selecionado} podeEditar={podeEditar} erros={erros} />);

describe('PainelDeObjetos (renderização)', () => {
  it('quem edita vê os seis tipos para colocar; quem só vê, não', () => {
    const html = render([], null);
    for (const t of TIPOS_DE_OBJETO) expect(html).toContain(`aria-label="Tipo de objeto"`);
    expect(html).toContain('Início do jogador');
    expect(html).toContain('Área de monstros');
    expect(html).toContain('Nenhum objeto selecionado');
    expect(render([], null, false)).not.toContain('Tocar no mapa coloca');
  });

  it('mostra o formulário certo de cada tipo selecionado', () => {
    expect(render([objetoNovo('npc', 'npc-1', 1, 1)], 'npc-1')).toContain('Fala');
    expect(render([objetoNovo('placa', 'placa-1', 1, 1)], 'placa-1')).toContain('Texto da placa');
    expect(render([objetoNovo('bau', 'bau-1', 1, 1)], 'bau-1')).toContain('Item do baú');
    const porta = render([objetoNovo('porta', 'porta-1', 1, 1)], 'porta-1');
    expect(porta).toContain('Mapa de destino');
    expect(porta).toContain('Vila (vila)');
    const area = render([objetoNovo('cacada', 'cacada-1', 1, 1)], 'cacada-1');
    expect(area).toContain('Lobo Cinzento');
    expect(area).toContain('Largura da área');
  });

  it('só quem edita vê mover e remover; os problemas aparecem em destaque', () => {
    const o = [objetoNovo('placa', 'placa-1', 1, 1)];
    expect(render(o, 'placa-1')).toContain('Remover');
    expect(render(o, 'placa-1', false)).not.toContain('Remover');
    expect(render(o, null, true, ['Porta sem destino.'])).toContain('Porta sem destino.');
    expect(render(o, null)).toContain('Objetos do mapa (1)');
  });
});
