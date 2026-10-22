import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExpedicaoScreen, textoDaRecompensa } from '@/components/expedicao/ExpedicaoScreen';
import { ProvacoesScreen } from '@/components/provacoes/ProvacoesScreen';
import { TURNOS_DE_EXPEDICAO } from '@/rules/expedicao';
import type { CharacterDocument } from '@/server/characterService';

describe('Expedição: telas', () => {
  it('a tela abre com a explicação, a volta às Provações e o aviso de carregamento', () => {
    const html = renderToStaticMarkup(<ExpedicaoScreen tokenFresco={async () => 't'} />);
    expect(html).toContain('Expedição');
    expect(html).toContain('href="/provacoes"');
    expect(html).toContain('Carregando...');
  });

  it('o texto da recompensa do turno de 12 h', () => {
    expect(textoDaRecompensa(TURNOS_DE_EXPEDICAO[3])).toEqual([
      'Selos: 60 Desgastado, 15 Encantado, 5 da Eternidade, 1 da Origem',
      '150 Fragmentos de Memória · 3 Pedras da Recordação',
      'Materiais de mundo: 5 comuns, 4 raros, 2 muito raros, 1 épico',
    ]);
  });

  it('a Expedição está nas Provações, no lugar da Dungeon, e leva à tela dela a partir do nível 15', () => {
    const html = renderToStaticMarkup(<ProvacoesScreen personagem={{ nome: 'Aragorn', nivel: 15 } as CharacterDocument} />);
    expect(html).toContain('href="/expedicao"');
    expect(html).not.toContain('Dungeons');
    const baixo = renderToStaticMarkup(<ProvacoesScreen personagem={{ nome: 'Aragorn', nivel: 14 } as CharacterDocument} />);
    expect(baixo).toContain('Expedição - Requer Nível 15');
  });
});
