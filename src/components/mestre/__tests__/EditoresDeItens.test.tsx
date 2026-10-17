import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorDeArmadura } from '@/components/mestre/EditorDeArmadura';
import { EditorDeEmblema } from '@/components/mestre/EditorDeEmblema';
import { armaduraDadosDePeca } from '@/rules/armaduraConteudo';
import { emblemaDadosDeTipo } from '@/rules/emblemaConteudo';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import { TIPO_EMBLEMA_MAP } from '@/rules/emblemasCatalogo';

describe('Editores de armadura e emblema (renderização)', () => {
  it('armadura: nome, raridade, receita e salvar para quem edita; sem salvar na leitura', () => {
    const inicial = armaduraDadosDePeca(PECAS_ARMADURA_MAP['lobo-cinzento-elmo']);
    const edita = renderToStaticMarkup(<EditorDeArmadura inicial={inicial} podeEditar salvar={async () => null} />);
    expect(edita).toContain('Dados da peça');
    expect(edita).toContain('Ouro da receita');
    expect(edita).toContain('Salvar rascunho');
    const le = renderToStaticMarkup(<EditorDeArmadura inicial={inicial} podeEditar={false} salvar={async () => null} />);
    expect(le).not.toContain('Salvar rascunho');
    expect(le).toContain('disabled');
  });

  it('emblema: nome, lore, 3 atributos e uma caixa por habilidade, com o aviso do efeito', () => {
    const inicial = emblemaDadosDeTipo(TIPO_EMBLEMA_MAP['dargan']);
    const html = renderToStaticMarkup(<EditorDeEmblema inicial={inicial} podeEditar salvar={async () => null} />);
    expect(html).toContain('Dados do emblema');
    expect(html).toContain('Habilidade da 3ª estrela');
    expect(html).not.toContain('Habilidade da 4ª estrela');
    expect(html).toContain('não o que a habilidade faz');
    expect(html).toContain('Instinto de Carniceiro');
  });
});
