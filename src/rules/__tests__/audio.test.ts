import { existsSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  caminhoDaMusica, caminhoDoSom, canalDoSom, MUSICAS_DA_ARENA, MUSICAS_DE_COMBATE, musicaDaLuta, musicaDaRota, preferenciasDoTexto, prioridadeDoSom, proximaFaixa, VOLUMES_PADRAO, type IdDeMusica, type IdDeSom,
} from '@/rules/audio';
import { SONS_COMBATE, SONS_ELEMENTOS, SONS_INTERFACE, SONS_STINGERS } from '@/rules/audioSons';

describe('áudio: arquivos', () => {
  it('todo som e toda música listados existem em public/audio, e não sobra arquivo fora da lista', () => {
    for (const id of [...SONS_INTERFACE, ...SONS_COMBATE, ...SONS_ELEMENTOS, ...SONS_STINGERS] as IdDeSom[]) expect(existsSync(`public${caminhoDoSom(id)}`), id).toBe(true);
    const faixas = new Set<IdDeMusica>(['menu_principal', ...MUSICAS_DE_COMBATE, ...MUSICAS_DA_ARENA]);
    for (const f of faixas) expect(existsSync(`public${caminhoDaMusica(f)}`), f).toBe(true);
    expect(readdirSync('public/audio/musica')).toHaveLength(faixas.size);
    expect(readdirSync('public/audio/musica').some((n) => n.includes('gemini'))).toBe(false);
  });
});

describe('áudio: música por tela e por luta', () => {
  it('fora de luta, TODAS as telas tocam o tema do menu (Hub, Provações, Guilda, Perfil, livros, salas da Arena e da Torre)', () => {
    for (const r of ['/', '/login', '/hub', '/provacoes', '/guilda', '/personagem', '/menu', '/mochila', '/cacada', '/bestiario', '/combate', '/torre-celestial', '/chefe-mundial', '/expedicao', '/campanha', '/teste-equipe'])
      expect(musicaDaRota(r).faixas, r).toEqual(['menu_principal']);
  });

  it('na luta: a Arena só com as dela; Torre e Chefe Mundial com a própria; o resto sorteia as de combate, sem menu nem Arena', () => {
    expect(musicaDaLuta('/combate').faixas).toEqual(['the_final_parry', 'beneath_the_blade']);
    expect(musicaDaLuta('/torre-celestial').faixas).toEqual(['throne_of_frozen_breath']);
    expect(musicaDaLuta('/chefe-mundial').faixas).toEqual(['finis_mundi']);
    for (const r of ['/cacada', '/batalha-sangrenta', '/teste-equipe', '/provacoes', '/intro']) {
      const f = musicaDaLuta(r).faixas;
      expect(f.length).toBeGreaterThan(5);
      expect(f).not.toContain('menu_principal');
      for (const a of MUSICAS_DA_ARENA) expect(f).not.toContain(a);
    }
  });

  it('o sorteio não repete a faixa que acabou de tocar', () => {
    const ctx = musicaDaLuta('/cacada');
    for (let i = 0; i < 50; i++) expect(proximaFaixa(ctx, 'vis_fati', () => i / 50)).not.toBe('vis_fati');
    expect(proximaFaixa(musicaDaRota('/'), 'menu_principal')).toBe('menu_principal');
  });
});

describe('áudio: preferências e prioridades', () => {
  it('padrão 45/95/70, volume sempre entre 0 e 1, lixo vira padrão', () => {
    expect(preferenciasDoTexto(null)).toEqual({ volumes: VOLUMES_PADRAO, mudo: false });
    expect(preferenciasDoTexto({ volumes: { musica: 2, efeitos: -1, interface: 'x' }, mudo: true })).toMatchObject({ volumes: { musica: 1, efeitos: 0, interface: 0.7 }, mudo: true });
  });
  it('ultimate vence habilidade, que vence interface; interface vai no canal Interface', () => {
    expect(prioridadeDoSom('stinger_ultimate_pronta')).toBeGreaterThan(prioridadeDoSom('elem_fogo_ultimate'));
    expect(prioridadeDoSom('elem_fogo_ultimate')).toBeGreaterThan(prioridadeDoSom('elem_fogo_impacto'));
    expect(prioridadeDoSom('elem_fogo_impacto')).toBeGreaterThan(prioridadeDoSom('ui_botao_toque'));
    expect(canalDoSom('ui_moedas')).toBe('interface');
    expect(canalDoSom('sfx_cura')).toBe('efeitos');
  });
});
