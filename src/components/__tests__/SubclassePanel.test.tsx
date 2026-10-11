import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubclassePanel } from '@/components/desenvolvimento/SubclassePanel';
import type { CharacterDocument } from '@/server/characterService';
import { DESENVOLVIMENTO_MENU } from '@/rules/desenvolvimentoMenu';

const personagem = (extra: Partial<CharacterDocument> = {}): CharacterDocument => ({
  uid: 'u', nome: 'Teste', avatarId: 'a', racaId: 'humano', classeId: 'feiticeiro', nivel: 30, xpAtual: 0,
  pontosDisponiveis: 0, ouro: 123_456, diamantes: 250, fragmentosAlma: 87, hpMax: 100, sobreescudoMax: 10,
  atributos: { vigor: 1, sorte: 1, forca: 1, vitalidade: 1, arcano: 1, inteligencia: 1, agilidade: 1 }, criadoEm: 'x',
  subclasseAtualId: null, subclasseTiers: {}, fragmentosSubclasse: {},
  ...extra,
});
const html = (c: CharacterDocument) => renderToStaticMarkup(<SubclassePanel character={c} idToken="t" onCharacterChange={() => {}} />);

describe('Tela de Subclasse', () => {
  it('o item "Subclasse" do menu de Desenvolvimento está disponível', () => {
    expect(DESENVOLVIMENTO_MENU.find((i) => i.id === 'subclasse')?.disponivel).toBe(true);
  });

  it('mostra as duas subclasses da classe, com atributos, habilidades e o botão Desbloquear com o custo', () => {
    const h = html(personagem());
    expect(h).toContain('Arquimago');
    expect(h).toContain('Sábio Arcano');
    expect(h).not.toContain('Berserker'); // só as subclasses da classe
    expect(h).toContain('+24'); // atributos do Arquimago
    expect(h).toContain('Passiva · T1');
    expect(h).toContain('Ultimate · T4');
    expect(h).toContain('Desbloquear');
    expect(h).toContain('10.000'); // ouro do tier 0
    expect(h).toContain('>30<'); // fragmentos do tier 0
    expect(h).toContain('aria-label="Bola de Fogo"'); // habilidade clicável
  });

  it('abaixo do nível 20 mostra o aviso e nenhum botão de desbloquear', () => {
    const h = html(personagem({ nivel: 12 }));
    expect(h).toContain('Disponível a partir do nível 20');
    expect(h).not.toContain('Desbloquear');
  });

  it('subclasse ativa com tier: botão do próximo tier e o 🔄 só nos espaços liberados', () => {
    const h = html(personagem({
      subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 2 },
      habilidadesEquipadas: { ataqueBasico: 'arquimago_bola_de_fogo', habilidadeEspecial: 'feiticeiro_explosao_arcana', ultimate: 'feiticeiro_cataclismo_arcano' },
    }));
    expect(h).toContain('Subir para o tier 3');
    expect(h).toContain('Ativa · T2');
    // só o ataque básico (tier 2) pode ser trocado
    expect((h.match(/aria-label="Trocar /g) ?? []).length).toBe(1);
    expect(h).toContain('Trocar Bola de Fogo pela habilidade da classe');
  });

  it('com a habilidade da classe escolhida, o 🔄 oferece a da subclasse', () => {
    const h = html(personagem({
      subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 2 },
      habilidadesEquipadas: { ataqueBasico: 'feiticeiro_faisca_arcana', habilidadeEspecial: 'feiticeiro_explosao_arcana', ultimate: 'feiticeiro_cataclismo_arcano' },
    }));
    expect(h).toContain('Trocar Faísca Arcana pela habilidade da subclasse');
  });

  it('subclasse desbloqueada e não ativa oferece Ativar com 100 diamantes', () => {
    const h = html(personagem({ subclasseAtualId: 'sabio_arcano', subclasseTiers: { sabio_arcano: 0, arquimago: 1 } }));
    expect(h).toContain('Ativar');
    expect(h).toContain('>100<');
  });
});
