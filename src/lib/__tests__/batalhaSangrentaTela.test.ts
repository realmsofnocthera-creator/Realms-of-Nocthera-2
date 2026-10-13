import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createCharacter, executarCacada, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { dificuldadesDaBatalha, tentativasDeHoje } from '@/lib/batalhaSangrentaTela';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { BatalhaSangrentaScreen } from '@/components/batalhaSangrenta/BatalhaSangrentaScreen';
import { montarQuadros } from '@/lib/cacadaReplay';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';

/** Tela da Batalha Sangrenta: dificuldades, tentativas do dia e HP que passa de uma luta para a outra. */
const criar = (uid: string) =>
  createCharacter(uid, {
    nome: 'Yuri',
    racaId: 'elfo',
    classeId: 'cavaleiro',
    pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
  });

describe('Batalha Sangrenta (tela)', () => {
  const AGORA = new Date('2026-10-14T15:00:00Z');
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
  });

  it('abaixo do nível 20 tudo fica bloqueado pelo nível', () => {
    const d = dificuldadesDaBatalha({ nivel: 19 }, AGORA);
    expect(d.every((x) => !x.liberada)).toBe(true);
    expect(d[0].bloqueio).toBe('Requer nível 20');
  });

  it('no nível 20 só a Fácil abre; cada uma abre ao vencer a anterior', () => {
    expect(dificuldadesDaBatalha({ nivel: 20 }, AGORA).map((x) => x.liberada)).toEqual([true, false, false, false, false]);
    const d = dificuldadesDaBatalha({ nivel: 20, batalhaSangrentaVencidas: ['facil', 'medio'] }, AGORA);
    expect(d.map((x) => x.liberada)).toEqual([true, true, true, false, false]);
    expect(d[3].bloqueio).toBe('Vença a dificuldade Difícil');
    expect(d.map((x) => x.vencida)).toEqual([true, true, false, false, false]);
    expect(d[0].diamantesPendentes).toBe(false);
    expect(d[2].diamantesPendentes).toBe(true);
  });

  it('mostra os chefes, a faixa de fragmentos e o extra do Inferno', () => {
    const d = dificuldadesDaBatalha({ nivel: 20, batalhaSangrentaVencidas: ['facil', 'medio', 'dificil', 'muitoDificil'] }, AGORA);
    expect(d[0].chefes).toEqual(['Darius, o Carrasco Escarlate']);
    expect(d[0].fragmentos).toBe('1 a 3');
    expect(d[4].chefes).toEqual(['Varkhazar, o Dragão da Carnificina', 'Noctharion, o Dragão do Eclipse Eterno']);
    expect(d[4].extraSubclasse).toContain('20%');
    expect(d[0].extraSubclasse).toBeNull();
  });

  it('as tentativas do dia acabam em 3 e voltam no dia seguinte (Brasília)', () => {
    const dia = diaDeBrasilia(AGORA);
    expect(tentativasDeHoje({}, AGORA)).toBe(3);
    expect(tentativasDeHoje({ batalhaSangrenta: { dia, tentativas: 2 } }, AGORA)).toBe(1);
    const sem = dificuldadesDaBatalha({ nivel: 20, batalhaSangrenta: { dia, tentativas: 3 } }, AGORA);
    expect(sem[0].bloqueio).toBe('Sem tentativas hoje');
    expect(tentativasDeHoje({ batalhaSangrenta: { dia, tentativas: 3 } }, new Date('2026-10-15T15:00:00Z'))).toBe(3);
  });

  it('a tela renderiza as cinco dificuldades e as tentativas', async () => {
    await criar('u-bat');
    await updateCharacter('u-bat', { nivel: 20 });
    const c = (await getCharacterByUid('u-bat'))!;
    const html = renderToStaticMarkup(React.createElement(BatalhaSangrentaScreen, { character: c, onCharacterChange: () => {}, tokenFresco: async () => 't' }));
    for (const nome of ['Fácil', 'Médio', 'Difícil', 'Muito difícil', 'Inferno']) expect(html).toContain(`Dificuldade ${nome}`);
    expect(html).toContain('Tentativas hoje: 3/3');
    expect(html).toContain('Darius, o Carrasco Escarlate');
    expect(html).toContain('Batalhar');
  });

  it('o replay da luta pode começar com o HP que sobrou da luta anterior', async () => {
    await criar('u-bat2');
    await updateCharacter('u-bat2', { nivel: 2 });
    const c = (await getCharacterByUid('u-bat2'))!;
    const monstro = MONSTROS_CACADA_MAP['lobo-cinzento'];
    const { resultado } = await executarCacada('u-bat2', 'lobo-cinzento', { seed: 7, combateId: 'bat-tela-0001' });
    const normal = montarQuadros(resultado, c, monstro, 5);
    const comHp = montarQuadros(resultado, c, monstro, 5, 7);
    expect(normal[0].jogador.hp).toBe(c.hpMax);
    expect(comHp[0].jogador.hp).toBe(7);
  });
});
