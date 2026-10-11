import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SubclassePanel } from '@/components/desenvolvimento/SubclassePanel';
import { FichaHabilidades } from '@/components/ficha';
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
const ativa = (tier: number, extra: Partial<CharacterDocument> = {}) =>
  personagem({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: tier }, ...extra });

describe('Tela de Subclasse — escolha (sem subclasse)', () => {
  it('o item "Subclasse" do menu de Desenvolvimento está disponível', () => {
    expect(DESENVOLVIMENTO_MENU.find((i) => i.id === 'subclasse')?.disponivel).toBe(true);
  });

  it('mostra os dois banners, com atributos, habilidades e o botão Desbloquear com o custo', () => {
    const h = html(personagem());
    expect(h).toContain('Arquimago');
    expect(h).toContain('Sábio Arcano');
    expect(h).not.toContain('Berserker'); // só as subclasses da classe
    expect(h).toContain('+24'); // atributos do Arquimago
    expect(h).toContain('Passiva · T1');
    expect(h).toContain('Ultimate · T4');
    expect(h).toContain('Desbloquear');
    expect(h).toContain('10.000');
    expect(h).toContain('>30<');
    expect(h).toContain('aria-label="Bola de Fogo"');
    // nada de linha de tiers nem de reset antes de escolher
    expect(h).not.toContain('role="tablist"');
    expect(h).not.toContain('Resetar subclasse');
  });

  it('abaixo do nível 20 mostra o aviso e nenhum botão de desbloquear', () => {
    const h = html(personagem({ nivel: 12 }));
    expect(h).toContain('Disponível a partir do nível 20');
    expect(h).not.toContain('Desbloquear');
  });
});

describe('Tela de Subclasse — evolução (com subclasse)', () => {
  it('os banners somem e entra a linha T1 a T4', () => {
    const h = html(ativa(1));
    expect(h).not.toContain('Sábio Arcano');
    expect(h).not.toContain('Desbloquear');
    expect(h).toContain('role="tablist"');
    for (const t of ['T1', 'T2', 'T3', 'T4']) expect(h).toContain(`>${t}<`);
    expect(h).toContain('aria-label="Tier 1: Passiva (comprado)"');
    expect(h).toContain('aria-label="Tier 2: Ataque básico (próximo)"');
    expect(h).toContain('aria-label="Tier 3: Habilidade especial (bloqueado)"');
  });

  it('explica o próximo tier e mostra o botão com o custo', () => {
    const h = html(ativa(1));
    expect(h).toContain('T2 · Ataque básico');
    expect(h).toContain('Bola de Fogo');
    expect(h).toContain('115% de dano de Fogo.');
    expect(h).toContain('Subir para o tier 2');
    expect(h).toContain('20.000');
    expect(h).toContain('>25<');
  });

  it('com a subclasse recém-desbloqueada o T1 (passiva) é o próximo', () => {
    const h = html(ativa(0));
    expect(h).toContain('T1 · Passiva');
    expect(h).toContain('Poder Arcano');
    expect(h).toContain('Subir para o tier 1');
  });

  it('tudo comprado: mostra "Comprado" no lugar do botão', () => {
    const h = html(ativa(4));
    expect(h).toContain('Comprado');
    expect(h).not.toContain('Subir para o tier');
  });

  it('o botão de resetar mostra os 100 diamantes', () => {
    const h = html(ativa(2));
    expect(h).toContain('Resetar subclasse');
    expect(h).toContain('>100<');
  });
});

describe('Ficha — troca entre a habilidade da classe e a da subclasse', () => {
  const ficha = (c: CharacterDocument) =>
    renderToStaticMarkup(
      <FichaHabilidades character={c} activePopoverId={null} onTogglePopover={() => {}} onEquiparHabilidade={async () => null} />
    );

  it('sem subclasse não há 🔄', () => {
    expect(ficha(personagem())).not.toContain('aria-label="Trocar ');
  });

  it('o 🔄 só aparece nos espaços liberados e leva à outra habilidade', () => {
    const h = ficha(ativa(2, { habilidadesEquipadas: { ataqueBasico: 'arquimago_bola_de_fogo', habilidadeEspecial: 'feiticeiro_explosao_arcana', ultimate: 'feiticeiro_cataclismo_arcano' } }));
    expect((h.match(/aria-label="Trocar /g) ?? []).length).toBe(1); // só o básico (tier 2)
    expect(h).toContain('Trocar Bola de Fogo pela habilidade da classe');
    expect(h).toContain('aria-label="Bola de Fogo"'); // o ícone mostra a habilidade da subclasse
  });

  it('com a da classe escolhida, o 🔄 oferece a da subclasse', () => {
    const h = ficha(ativa(4, { habilidadesEquipadas: { ataqueBasico: 'feiticeiro_faisca_arcana', habilidadeEspecial: 'feiticeiro_explosao_arcana', ultimate: 'feiticeiro_cataclismo_arcano' } }));
    expect((h.match(/aria-label="Trocar /g) ?? []).length).toBe(3);
    expect(h).toContain('Trocar Faísca Arcana pela habilidade da subclasse');
  });
});
