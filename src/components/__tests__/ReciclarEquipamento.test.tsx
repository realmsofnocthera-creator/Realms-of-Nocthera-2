import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReciclarEquipamento, resumoDoQueVoltou } from '@/components/forja/ReciclarEquipamento';
import { FolhaMinhaArma } from '@/components/forja/PopupsDaForja';
import { detalheDaMinhaArma, linhasDaReciclagem } from '@/lib/forjaTela';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';

const nada = () => {};
const personagem = (equipada: boolean) => ({
  armas: [{ id: 'a1', baseId: 'ferro-de-cacada', categoria: 'katana' as const, atributo: 'vigor' as const, pontos: 3, reforjas: 0, criadaEm: '' }],
  inventario: {},
  ouro: 0,
  equipamento: { armaId: equipada ? 'a1' : null, armadura: {} },
});

describe('Reciclar: tela', () => {
  it('a janela da arma tem a seção Reciclar com o botão e o aviso de 30%', () => {
    const d = detalheDaMinhaArma('a1', personagem(false))!;
    expect(d.reciclagem.equipada).toBe(false);
    expect(d.reciclagem.devolve.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<FolhaMinhaArma detalhe={d} ocupado={false} erro={null} onFechar={nada} onReforjar={nada} onCustomizar={nada} onReciclar={nada} />);
    expect(html).toContain('Reciclar (30% dos materiais)');
    expect(html).toContain('Sorteia de novo o atributo e os pontos dele.');
  });
  it('arma equipada mostra o pedido para desequipar em vez do botão', () => {
    const d = detalheDaMinhaArma('a1', personagem(true))!;
    expect(d.reciclagem.equipada).toBe(true);
    const html = renderToStaticMarkup(<ReciclarEquipamento nome="x" devolve={d.reciclagem.devolve} equipada ocupado={false} onReciclar={nada} />);
    expect(html).toContain('Desequipe este item');
    expect(html).not.toContain('>Reciclar</');
  });
  it('as linhas de devolução vêm da receita (30%) e o resumo do aviso lista cada material', () => {
    const linhas = linhasDaReciclagem(ARMAS_BASE_MAP['ferro-de-cacada'].receita);
    expect(linhas.every((l) => l.qtd >= 1 && l.nome.length > 0)).toBe(true);
    expect(resumoDoQueVoltou({ a: 2, b: 1 }, (id) => id.toUpperCase())).toBe('+2 A, +1 B');
  });
});
