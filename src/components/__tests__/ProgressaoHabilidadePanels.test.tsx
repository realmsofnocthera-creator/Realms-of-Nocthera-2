import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReforcoPanel } from '@/components/desenvolvimento/ReforcoPanel';
import { AscensaoPanel } from '@/components/desenvolvimento/AscensaoPanel';
import type { CharacterDocument } from '@/server/characterService';
import { acaoDaAscensao, estadoDoReforco, habilidadesDoEspaco, linhaDaAscensao } from '@/lib/progressaoHabilidadeTela';

const personagem = (extra: Partial<CharacterDocument> = {}): CharacterDocument => ({
  uid: 'u', nome: 'Teste', avatarId: 'a', racaId: 'humano', classeId: 'barbaro', nivel: 30, xpAtual: 0,
  pontosDisponiveis: 0, ouro: 0, diamantes: 0, fragmentosAlma: 0, hpMax: 100, sobreescudoMax: 10,
  atributos: { vigor: 100, sorte: 10, forca: 200, vitalidade: 10, arcano: 0, inteligencia: 0, agilidade: 10 }, criadoEm: 'x',
  subclasseAtualId: null, subclasseTiers: {}, fragmentosSubclasse: {},
  reforcoHabilidade: 0, ascensaoHabilidade: 0, essenciaHabilidade: 0, fragmentosAscensao: 0,
  ...extra,
});

describe('Tela de Reforço de Habilidade (2.2.2)', () => {
  it('nível 0 sem essência: mostra o custo do nível 1 e o botão travado', () => {
    const e = estadoDoReforco(personagem());
    expect(e).toMatchObject({ nivel: 0, custo: 100, habilitado: false, aviso: 'Essência de habilidade insuficiente', bonusAtual: '+0%' });
    const h = renderToStaticMarkup(<ReforcoPanel character={personagem()} idToken="t" onCharacterChange={() => {}} />);
    expect(h).toContain('Reforço de Habilidade');
    expect(h).toContain('Nv 0/30');
    expect(h).toContain('Reforçar para o nível 1');
    expect(h).toContain('disabled');
  });

  it('nível 11 com essência: bônus +5,8%, próximo +0,8%, custo 570', () => {
    const e = estadoDoReforco(personagem({ reforcoHabilidade: 11, essenciaHabilidade: 1000 }));
    expect(e).toMatchObject({ nivel: 11, custo: 570, habilitado: true, aviso: null, bonusAtual: '+5,8%', bonusProximoNivel: '+0,8%' });
  });

  it('nível 30: sem botão, aviso de máximo', () => {
    const e = estadoDoReforco(personagem({ reforcoHabilidade: 30, essenciaHabilidade: 99_999 }));
    expect(e).toMatchObject({ custo: null, habilitado: false, aviso: 'Reforço no nível máximo', bonusAtual: '+25%' });
    const h = renderToStaticMarkup(
      <ReforcoPanel character={personagem({ reforcoHabilidade: 30 })} idToken="t" onCharacterChange={() => {}} />
    );
    expect(h).not.toContain('Reforçar para');
  });
});

describe('Tela de Ascensão de Habilidade (2.2.1)', () => {
  it('linha A1 a A10: comprados, próximo e bloqueados', () => {
    const linha = linhaDaAscensao(personagem({ ascensaoHabilidade: 2 }));
    expect(linha.map((p) => p.estado)).toEqual([
      'comprado', 'comprado', 'proximo', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado',
    ]);
    expect(linha[2]).toMatchObject({ rotulo: 'Passiva I', nivelHabilidade: 2, bonus: '+10%' });
    expect(linha[9]).toMatchObject({ rotulo: 'Ultimate', nivelHabilidade: 3, bonus: '+20%' });
  });

  it('bloqueada antes do Reforço 30; sem fragmento avisa; com fragmento libera', () => {
    expect(acaoDaAscensao(personagem({ reforcoHabilidade: 29, fragmentosAscensao: 5 })).aviso).toBe(
      'Libera com o Reforço de Habilidade no nível 30'
    );
    expect(acaoDaAscensao(personagem({ reforcoHabilidade: 30 })).aviso).toBe('Fragmentos de ascensão insuficientes');
    expect(acaoDaAscensao(personagem({ reforcoHabilidade: 30, fragmentosAscensao: 1 }))).toMatchObject({
      ascensao: 1, habilitada: true, aviso: null, custo: 1,
    });
    expect(acaoDaAscensao(personagem({ ascensaoHabilidade: 10 })).ascensao).toBeNull();
  });

  it('o passo melhora a habilidade da classe e a da subclasse no mesmo espaço (Passiva I inclui a passiva da subclasse)', () => {
    expect(habilidadesDoEspaco(personagem(), 'ataqueBasico')).toEqual(['Golpe Bárbaro']);
    const comSub = personagem({ subclasseAtualId: 'berserker', subclasseTiers: { berserker: 1 } });
    expect(habilidadesDoEspaco(comSub, 'ataqueBasico')).toEqual(['Golpe Bárbaro', 'Golpe Desenfreado (Berserker)']);
    expect(habilidadesDoEspaco(comSub, 'passivaI')).toEqual(['Instinto de Sobrevivência', 'Frenesi (Berserker)']);
    expect(habilidadesDoEspaco(comSub, 'passivaII')).toEqual(['Resistência Bárbara']);
  });

  it('renderiza as duas fileiras e o botão da próxima ascensão', () => {
    const h = renderToStaticMarkup(
      <AscensaoPanel character={personagem({ reforcoHabilidade: 30, fragmentosAscensao: 3 })} idToken="t" onCharacterChange={() => {}} />
    );
    expect(h).toContain('Habilidades no nível 2 (+10%)');
    expect(h).toContain('Habilidades no nível 3 (+20%)');
    expect(h).toContain('A1 · Ataque Básico nível 2');
    expect(h).toContain('Ascender para A1');
    expect(h).toContain('Golpe Bárbaro');
  });
});
