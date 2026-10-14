import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { createCharacter, getCharacterByUid, updateCharacter } from '@/server/characterService';
import { resetCharacterStore } from '@/test/repositorioMemoria';
import { dificuldadesDoGuerreiro, emblemasDoPersonagem } from '@/lib/guerreiroTela';
import { diaDeBrasilia } from '@/game/batalhaSangrenta';
import { GuerreiroScreen } from '@/components/guerreiro/GuerreiroScreen';

const HOJE = new Date('2026-10-14T15:00:00Z');

/** Tela da Provação do Guerreiro: estado de cada chefe, chances de emblema e emblemas do personagem. */
describe('Provação do Guerreiro (tela)', () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    resetCharacterStore();
  });

  it('abaixo do nível 12 todos os chefes ficam bloqueados pelo nível', () => {
    const d = dificuldadesDoGuerreiro({ nivel: 11 }, HOJE);
    expect(d).toHaveLength(10);
    expect(d.every((x) => x.estado === 'bloqueado')).toBe(true);
    expect(d[0].aviso).toBe('Requer nível 12');
  });

  it('no nível 12 só o Astaroth está disponível; os outros esperam o anterior', () => {
    const d = dificuldadesDoGuerreiro({ nivel: 12 }, HOJE);
    expect(d.map((x) => x.estado)).toEqual(['disponivel', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado']);
    expect(d[1].aviso).toBe('Vença Astaroth, o Louco');
    const tudo = dificuldadesDoGuerreiro({ nivel: 30, guerreiroVencidas: [1, 2, 3, 4, 5, 6, 7, 8, 9] }, HOJE);
    expect(tudo.every((x) => x.estado === 'disponivel')).toBe(true);
  });

  it('a tentativa usada hoje aparece e volta no dia seguinte', () => {
    const c = { nivel: 20, guerreiroTentativas: { '1': diaDeBrasilia(HOJE) }, guerreiroVencidas: [1] };
    const hoje = dificuldadesDoGuerreiro(c, HOJE);
    expect(hoje[0]).toMatchObject({ estado: 'tentativaUsada', aviso: 'Tentativa de hoje já usada', vencido: true });
    expect(hoje[1].estado).toBe('disponivel');
    expect(dificuldadesDoGuerreiro(c, new Date('2026-10-15T15:00:00Z'))[0].estado).toBe('disponivel');
  });

  it('mostra a chance de cada emblema da dificuldade', () => {
    const d = dificuldadesDoGuerreiro({ nivel: 12 }, HOJE);
    expect(d[0].chances.map((c) => [c.nome, c.percentual])).toEqual([['Comum', 100]]);
    expect(d[9].chances.map((c) => [c.nome, c.percentual])).toEqual([['Muito raro', 40], ['Épico', 35], ['Lendário', 20], ['Mítico', 5]]);
  });

  it('lista os emblemas do personagem do mais raro para o mais comum', () => {
    expect(emblemasDoPersonagem(undefined)).toEqual([]);
    expect(emblemasDoPersonagem({ comum: 4, epico: 1, raro: 0 }).map((e) => [e.nome, e.quantidade])).toEqual([['Épico', 1], ['Comum', 4]]);
  });

  it('a tela renderiza os 10 chefes, as mecânicas, as chances e os emblemas', async () => {
    await createCharacter('u-gue', {
      nome: 'Yuri',
      racaId: 'elfo',
      classeId: 'cavaleiro',
      pontos: { vigor: 5, sorte: 0, forca: 5, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 0 },
    });
    await updateCharacter('u-gue', { nivel: 12, emblemas: { comum: 4 } });
    const c = (await getCharacterByUid('u-gue'))!;
    const html = renderToStaticMarkup(React.createElement(GuerreiroScreen, { character: c, onCharacterChange: () => {}, tokenFresco: async () => 't' }));
    expect(html).toContain('Provação do Guerreiro');
    for (const nome of ['Astaroth, o Louco', 'Zephyron, o Mago', 'Thundrak, o Carro', 'Gorvath, a Força', 'Veredar, a Justiça', 'Selvara, a Roda da Fortuna', 'Nekrath, a Morte', 'Belzareth, o Diabo', 'Kolossar, a Torre', 'Aetherion, o Mundo']) {
      expect(html).toContain(nome);
    }
    expect(html).toContain('Caos Imprevisível');
    expect(html).toContain('Enfrentar');
    expect(html).toContain('Comum 100%');
    expect(html).toContain('Mítico 5%');
    expect(html).toContain('Comum</b> x4');
  });
});
