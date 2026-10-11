import { describe, it, expect } from 'vitest';
import type { CharacterDocument } from '@/server/characterService';
import { SUBCLASSES } from '@/rules/subclasses';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { PASSIVA_POR_SUBCLASSE } from '@/rules/subclasseKits';
import { TIER_POR_ESPACO_HABILIDADE } from '@/rules/subclasseTiers';
import { iconeDaHabilidadeSubclasse, SUBCLASSE_ICONE_BASE } from '@/rules/subclasseAssets';
import { obterHabilidade, obterPassiva } from '@/game/combate/habilidades';
import {
  acoesDaSubclasse,
  bonusDeAtributosDaSubclasse,
  estadoDaSubclasse,
  habilidadeDoKitLiberada,
  passivaDaSubclasseLiberada,
} from '@/lib/subclasseTela';

/** 2.1.5 — Lógica da Tela de Subclasse. */

type Char = Pick<
  CharacterDocument,
  'nivel' | 'ouro' | 'fragmentosAlma' | 'diamantes' | 'fragmentosSubclasse' | 'subclasseTiers' | 'subclasseAtualId'
>;
const char = (extra: Partial<Char> = {}): Char => ({
  nivel: 30, ouro: 1_000_000, fragmentosAlma: 1000, diamantes: 1000, fragmentosSubclasse: {}, subclasseTiers: {}, subclasseAtualId: null, ...extra,
});

describe('Textos das subclasses', () => {
  it('as 12 subclasses têm texto, com ids que existem no registro e no espaço certo', () => {
    expect(Object.keys(TEXTOS_SUBCLASSE).sort()).toEqual(SUBCLASSES.map((s) => s.id).sort());
    for (const sub of SUBCLASSES) {
      const t = TEXTOS_SUBCLASSE[sub.id];
      expect(t.tema.length).toBeGreaterThan(5);
      expect(obterHabilidade(t.basico.id)?.espaco).toBe('basico');
      expect(obterHabilidade(t.especial.id)?.espaco).toBe('especial');
      expect(obterHabilidade(t.ultimate.id)?.espaco).toBe('ultimate');
      expect(obterPassiva(t.passiva.id)).toBeDefined();
      expect(t.passiva.id).toBe(PASSIVA_POR_SUBCLASSE[sub.id]);
      for (const h of [t.passiva, t.basico, t.especial, t.ultimate]) {
        expect(h.nome.length).toBeGreaterThan(2);
        expect(h.descricao.length).toBeGreaterThan(5);
        expect(h.id.startsWith(`${sub.id}_`)).toBe(true);
      }
    }
  });

  it('sem arte oficial, toda habilidade usa a imagem base', () => {
    expect(iconeDaHabilidadeSubclasse('arquimago_meteoro')).toBe(SUBCLASSE_ICONE_BASE);
  });
});

describe('Estado e ações da subclasse', () => {
  it('nível abaixo de 20: bloqueada por nível, sem ação', () => {
    const c = char({ nivel: 19 });
    expect(estadoDaSubclasse(c, 'arquimago')).toBe('bloqueadaPorNivel');
    const a = acoesDaSubclasse(c, 'arquimago');
    expect(a.principal).toBeNull();
    expect(a.aviso).toContain('nível 20');
  });

  it('subclasse nova: Desbloquear com o custo do tier 0 (30 fragmentos e 10.000 de ouro)', () => {
    const a = acoesDaSubclasse(char(), 'arquimago');
    expect(a.estado).toBe('naoDesbloqueada');
    expect(a.principal).toMatchObject({ tipo: 'desbloquear', rotulo: 'Desbloquear', habilitada: true });
    expect(a.principal?.custo).toEqual({ ouro: 10_000, fragmentosAlma: 30, fragmentosSubclasse: 0, diamantes: 0 });
  });

  it('desabilitado e lista o que falta', () => {
    const a = acoesDaSubclasse(char({ ouro: 9_999, fragmentosAlma: 29 }), 'arquimago');
    expect(a.principal?.habilitada).toBe(false);
    expect(a.principal?.faltando).toEqual(['ouro', 'fragmentos de alma']);
  });

  it('subclasse ativa: sobe para o próximo tier, com o custo dele', () => {
    const c = char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 1 } });
    const a = acoesDaSubclasse(c, 'arquimago');
    expect(a.estado).toBe('ativa');
    expect(a.principal).toMatchObject({ tipo: 'subirTier', rotulo: 'Subir para o tier 2' });
    expect(a.principal?.custo).toEqual({ ouro: 20_000, fragmentosAlma: 25, fragmentosSubclasse: 0, diamantes: 0 });
    expect(a.secundaria).toBeNull();
  });

  it('tier 4 pede os fragmentos da própria subclasse', () => {
    const base = { subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 3 } };
    const sem = acoesDaSubclasse(char(base), 'arquimago');
    expect(sem.principal?.custo.fragmentosSubclasse).toBe(5);
    expect(sem.principal?.faltando).toEqual(['fragmentos da subclasse']);
    const com = acoesDaSubclasse(char({ ...base, fragmentosSubclasse: { arquimago: 5 } }), 'arquimago');
    expect(com.principal?.habilitada).toBe(true);
    // os fragmentos são por subclasse
    const outra = acoesDaSubclasse(char({ ...base, fragmentosSubclasse: { sabio_arcano: 9 } }), 'arquimago');
    expect(outra.principal?.habilitada).toBe(false);
  });

  it('tier máximo: sem ação principal', () => {
    const a = acoesDaSubclasse(char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 4 } }), 'arquimago');
    expect(a.principal).toBeNull();
    expect(a.aviso).toBe('Tier máximo');
  });

  it('desbloqueada e não ativa: oferece subir de tier e também Ativar (100 diamantes)', () => {
    const c = char({ subclasseAtualId: 'sabio_arcano', subclasseTiers: { sabio_arcano: 0, arquimago: 2 } });
    const a = acoesDaSubclasse(c, 'arquimago');
    expect(a.estado).toBe('desbloqueada');
    expect(a.principal?.rotulo).toBe('Subir para o tier 3');
    expect(a.secundaria).toMatchObject({ tipo: 'ativar', rotulo: 'Ativar' });
    expect(a.secundaria?.custo).toEqual({ ouro: 0, fragmentosAlma: 0, fragmentosSubclasse: 0, diamantes: 100 });
    expect(acoesDaSubclasse({ ...c, diamantes: 99 }, 'arquimago').secundaria?.habilitada).toBe(false);
  });
});

describe('Quais habilidades valem', () => {
  it('a habilidade de kit exige subclasse ativa e o tier do espaço', () => {
    const c = (tier: number, ativa: string | null = 'arquimago') => ({ subclasseAtualId: ativa, subclasseTiers: { arquimago: tier } });
    expect(habilidadeDoKitLiberada(c(1), 'arquimago', 'basico')).toBe(false);
    expect(habilidadeDoKitLiberada(c(2), 'arquimago', 'basico')).toBe(true);
    expect(habilidadeDoKitLiberada(c(2), 'arquimago', 'especial')).toBe(false);
    expect(habilidadeDoKitLiberada(c(3), 'arquimago', 'especial')).toBe(true);
    expect(habilidadeDoKitLiberada(c(3), 'arquimago', 'ultimate')).toBe(false);
    expect(habilidadeDoKitLiberada(c(4), 'arquimago', 'ultimate')).toBe(true);
    expect(habilidadeDoKitLiberada(c(4, 'sabio_arcano'), 'arquimago', 'ultimate')).toBe(false);
    expect(TIER_POR_ESPACO_HABILIDADE.basico).toBe(2);
  });

  it('a passiva libera no tier 1', () => {
    expect(passivaDaSubclasseLiberada({ subclasseTiers: { arquimago: 0 } }, 'arquimago')).toBe(false);
    expect(passivaDaSubclasseLiberada({ subclasseTiers: { arquimago: 1 } }, 'arquimago')).toBe(true);
    expect(passivaDaSubclasseLiberada({ subclasseTiers: {} }, 'arquimago')).toBe(false);
  });

  it('lista só os atributos que a subclasse soma, do maior para o menor', () => {
    expect(bonusDeAtributosDaSubclasse('arquimago')).toEqual([
      { atributo: 'inteligencia', valor: 24 },
      { atributo: 'sorte', valor: 12 },
      { atributo: 'arcano', valor: 4 },
    ]);
    expect(bonusDeAtributosDaSubclasse('nao_existe')).toEqual([]);
  });
});
