import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PerfilEquipamentos } from '@/components/perfil/PerfilEquipamentos';
import type { EquipamentoPerfil } from '@/lib/perfilEquipamentos';

const item = (id: string, nome: string): EquipamentoPerfil => ({ id, slot: 'arma', slotNome: 'Arma', nome, cor: '#C27BF0', raridadeNome: 'Épico', curto: 'Dano 34' });

describe('Seção Equipamentos principais do perfil', () => {
  it('no perfil de outro jogador, mostra os itens e deixa os espaços sem item como Vazio, sem botões', () => {
    const html = renderToStaticMarkup(<PerfilEquipamentos itens={[item('a', 'Lâmina da Geada')]} editavel={false} />);
    expect(html).toContain('Lâmina da Geada');
    expect(html).toContain('Arma');
    expect(html).toContain('Épico');
    expect(html).toContain('Dano 34');
    expect(html.match(/Vazio/g)).toHaveLength(3);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('role="dialog"');
  });

  it('no próprio perfil, cada espaço é um botão: o ocupado troca e o vazio convida a escolher', () => {
    const html = renderToStaticMarkup(<PerfilEquipamentos itens={[item('a', 'Lâmina da Geada')]} editavel equipados={[]} />);
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).toContain('Espaço 1: Lâmina da Geada. Trocar');
    expect(html.match(/Escolher item/g)).toHaveLength(3);
    expect(html).not.toContain('role="dialog"');
  });

  it('mostra o erro de salvar', () => {
    const html = renderToStaticMarkup(<PerfilEquipamentos itens={[]} editavel erro="Falha ao salvar" />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Falha ao salvar');
  });
});
