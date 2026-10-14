import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { recompensasEmTexto, torreDoPersonagem } from '@/lib/torreTela';
import { TorreCelestialScreen } from '@/components/torreCelestial/TorreCelestialScreen';

/** Tela da Torre Celestial: andar atual, recompensas, próximo chefe e bloqueio de nível. */
describe('Torre Celestial (tela)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
  });

  it('abaixo do nível 5 a Torre mostra o bloqueio; no 5 começa no andar 1', () => {
    expect(torreDoPersonagem({ nivel: 4 }).bloqueio).toBe('Requer nível 5');
    const t = torreDoPersonagem({ nivel: 5 });
    expect(t).toMatchObject({ andar: 1, vencidos: 0, completa: false, bloqueio: null, chefe: false });
    expect(t.recompensas).toEqual([{ rotulo: 'XP', valor: 27 }, { rotulo: 'Essência de habilidade', valor: 3 }]);
    expect(t.proximoChefe).toMatchObject({ andar: 10, nome: 'Rikk, o Rato Carniceiro', faltam: 9 });
  });

  it('o andar de chefe mostra o chefe e o que ele aplica', () => {
    const t = torreDoPersonagem({ nivel: 10, torreAndar: 19 });
    expect(t).toMatchObject({ andar: 20, chefe: true, nome: 'Morvick, o Esqueleto Errante', efeitos: 'Sombrio' });
  });

  it('do andar 200 a recompensa troca a essência por Diamantes e dá o fragmento de ascensão no chefe', () => {
    expect(recompensasEmTexto(200, 30)).toEqual([
      { rotulo: 'Diamantes', valor: 5 },
      { rotulo: 'Fragmento de ascensão', valor: 1 },
    ]);
    expect(recompensasEmTexto(201, 30)).toEqual([{ rotulo: 'Diamantes', valor: 5 }]);
  });

  it('a Torre completa não tem andar atual', () => {
    expect(torreDoPersonagem({ nivel: 30, torreAndar: 300 })).toMatchObject({ completa: true, andar: null, vencidos: 300 });
  });

  it('a tela renderiza o andar atual e o botão de subir', async () => {
    await createCharacter('u-torre', {
      nome: 'Yuri',
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter('u-torre', { nivel: 5, torreAndar: 9 });
    const c = (await getCharacterByUid('u-torre'))!;
    const html = renderToStaticMarkup(React.createElement(TorreCelestialScreen, { character: c, onCharacterChange: () => {}, tokenFresco: async () => 't' }));
    expect(html).toContain('Torre Celestial');
    expect(html).toContain('Andar 10');
    expect(html).toContain('Rikk, o Rato Carniceiro');
    expect(html).toContain('Subir');
    expect(html).toContain('9 / 300');
  });
});
