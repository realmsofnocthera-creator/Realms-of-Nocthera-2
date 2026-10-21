import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorDeMissao } from '@/components/mestre/EditorDeMissao';
import { PainelDeObjetos } from '@/components/mestre/PainelDeObjetos';
import { missaoEmBranco } from '@/rules/missao';
import type { ObjetoDoMapa } from '@/rules/objetosDoMapa';

describe('Missões no Painel (renderização)', () => {
  it('editor: título, requisitos, objetivos, recompensa e salvar; só leitura não mostra edição', () => {
    const dados = { ...missaoEmBranco('Primeiros passos'), recompensa: { xp: 10, ouro: 5, itens: [{ id: 'pelo-de-rato', qtd: 2 }] } };
    const edita = renderToStaticMarkup(<EditorDeMissao id="primeira" inicial={dados} podeEditar tokenFresco={async () => 'x'} salvar={async () => null} />);
    expect(edita).toContain('Primeiros passos');
    expect(edita).toContain('Requisitos para começar');
    expect(edita).toContain('Objetivos (1/10)');
    expect(edita).toContain('Derrotar monstros');
    expect(edita).toContain('Recompensa (ao concluir)');
    expect(edita).toContain('+ Objetivo');
    expect(edita).toContain('+ Item');
    expect(edita).toContain('Salvar rascunho');
    const le = renderToStaticMarkup(<EditorDeMissao id="primeira" inicial={dados} podeEditar={false} tokenFresco={async () => 'x'} salvar={async () => null} />);
    expect(le).not.toContain('Salvar rascunho');
    expect(le).not.toContain('+ Objetivo');
  });

  it('objetos do mapa: NPC e ativador escolhem a missão; porta, baú, ativador e área têm a condição', () => {
    const base = {
      tipo: 'npc' as const,
      setTipo: () => undefined,
      selecionar: () => undefined,
      podeEditar: true,
      movendo: false,
      setMovendo: () => undefined,
      mudar: () => undefined,
      remover: () => undefined,
      erros: [] as string[],
      mapas: [],
      monstros: [],
      cenas: [{ id: 'abertura', nome: 'Abertura' }],
      missoes: [{ id: 'primeira', nome: 'Primeira missão' }],
      materiais: [{ id: 'pelo-de-rato', nome: 'Pelo de Rato' }],
    };
    const render = (o: ObjetoDoMapa) => renderToStaticMarkup(<PainelDeObjetos {...base} objetos={[o]} selecionado={o.id} />);
    const npc = render({ id: 'npc-1', tipo: 'npc', x: 1, y: 1, gatilho: 'interagir', nome: 'Chefe', texto: '' });
    expect(npc).toContain('Missão que começa aqui');
    expect(npc).toContain('Primeira missão (primeira)');
    expect(npc).not.toContain('Condição para valer');
    const porta = render({ id: 'porta-1', tipo: 'porta', x: 1, y: 1, gatilho: 'pisar', destino: { mapa: 'vila', x: 1, y: 1 }, condicao: { missaoConcluida: 'primeira' } });
    expect(porta).toContain('Condição para valer (ligada)');
    expect(porta).toContain('Missão em andamento');
    expect(porta).toContain('Missão concluída');
    expect(porta).toContain('Cena já vista');
    expect(porta).toContain('Item na mochila');
    expect(porta).toContain('Mensagem quando bloqueado');
    expect(render({ id: 'bau-1', tipo: 'bau', x: 1, y: 1, gatilho: 'interagir', item: { id: 'pelo-de-rato', qtd: 1 } })).toContain('Condição para valer (nenhuma)');
    const ativador = render({ id: 'cena-1', tipo: 'cena', x: 1, y: 1, gatilho: 'entrar', largura: 1, altura: 1, cenaId: 'abertura', unica: true });
    expect(ativador).toContain('Missão que começa ao entrar');
    expect(ativador).toContain('Condição para valer');
    expect(render({ id: 'area-1', tipo: 'cacada', x: 1, y: 1, gatilho: 'entrar', largura: 1, altura: 1, monstroId: 'rato' })).toContain('Condição para valer');
    expect(render({ id: 'placa-1', tipo: 'placa', x: 1, y: 1, gatilho: 'interagir', texto: '' })).not.toContain('Condição para valer');
  });
});
