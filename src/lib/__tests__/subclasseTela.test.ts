import { describe, it, expect } from 'vitest';
import type { CharacterDocument } from '@/server/characterService';
import { SUBCLASSES } from '@/rules/subclasses';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { PASSIVA_POR_SUBCLASSE } from '@/rules/subclasseKits';
import { TIER_POR_ESPACO_HABILIDADE } from '@/rules/subclasseTiers';
import { iconeDaHabilidadeSubclasse, SUBCLASSE_ICONE_BASE } from '@/rules/subclasseAssets';
import { obterHabilidade, obterPassiva } from '@/game/combate/habilidades';
import {
  acaoDeEscolha,
  acaoDeReset,
  acaoDoTier,
  bonusDeAtributosDaSubclasse,
  estadoDaSubclasse,
  habilidadeDoKitLiberada,
  linhaDeTiers,
  modoDaTela,
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

describe('Escolha, evolução e reset', () => {
  it('sem subclasse mostra a escolha; com subclasse, a evolução', () => {
    expect(modoDaTela({ subclasseAtualId: null })).toBe('escolha');
    expect(modoDaTela({ subclasseAtualId: 'arquimago' })).toBe('evolucao');
  });

  it('nível abaixo de 20: aviso e nenhum botão de desbloquear', () => {
    const c = char({ nivel: 19 });
    expect(estadoDaSubclasse(c, 'arquimago')).toBe('bloqueadaPorNivel');
    const r = acaoDeEscolha(c, 'arquimago');
    expect(r.acao).toBeNull();
    expect(r.aviso).toContain('nível 20');
  });

  it('Desbloquear tem o custo do tier 0 (30 fragmentos e 10.000 de ouro)', () => {
    const r = acaoDeEscolha(char(), 'arquimago');
    expect(estadoDaSubclasse(char(), 'arquimago')).toBe('disponivel');
    expect(r.acao).toMatchObject({ tipo: 'desbloquear', rotulo: 'Desbloquear', habilitada: true });
    expect(r.acao?.custo).toEqual({ ouro: 10_000, fragmentosAlma: 30, fragmentosSubclasse: 0, diamantes: 0 });
  });

  it('desabilitado e lista o que falta', () => {
    const r = acaoDeEscolha(char({ ouro: 9_999, fragmentosAlma: 29 }), 'arquimago');
    expect(r.acao?.habilitada).toBe(false);
    expect(r.acao?.faltando).toEqual(['ouro', 'fragmentos de alma']);
  });

  it('a linha tem 4 círculos (T1 a T4): comprados, o próximo e os bloqueados', () => {
    const c = char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 2 } });
    const linha = linhaDeTiers(c);
    expect(linha.map((t) => t.tier)).toEqual([1, 2, 3, 4]);
    expect(linha.map((t) => t.estado)).toEqual(['comprado', 'comprado', 'proximo', 'bloqueado']);
    expect(linha.map((t) => t.espaco)).toEqual(['passiva', 'basico', 'especial', 'ultimate']);
    // recém-desbloqueada (tier 0): o T1 é o próximo
    expect(linhaDeTiers(char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 0 } })).map((t) => t.estado)).toEqual(['proximo', 'bloqueado', 'bloqueado', 'bloqueado']);
    expect(linhaDeTiers(char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 4 } })).every((t) => t.estado === 'comprado')).toBe(true);
  });

  it('só o próximo tier tem botão, com o custo dele', () => {
    const c = char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 1 } });
    expect(acaoDoTier(c, 1)).toEqual({ acao: null, aviso: 'Comprado' });
    const prox = acaoDoTier(c, 2);
    expect(prox.acao).toMatchObject({ tipo: 'subirTier', rotulo: 'Subir para o tier 2', habilitada: true });
    expect(prox.acao?.custo).toEqual({ ouro: 20_000, fragmentosAlma: 25, fragmentosSubclasse: 0, diamantes: 0 });
    expect(acaoDoTier(c, 4)).toEqual({ acao: null, aviso: 'Compre o tier 3 antes' });
  });

  it('tier 4 pede os fragmentos da própria subclasse', () => {
    const base = { subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 3 } };
    const sem = acaoDoTier(char(base), 4).acao;
    expect(sem?.custo).toEqual({ ouro: 40_000, fragmentosAlma: 60, fragmentosSubclasse: 5, diamantes: 0 });
    expect(sem?.faltando).toEqual(['fragmentos da subclasse']);
    expect(acaoDoTier(char({ ...base, fragmentosSubclasse: { arquimago: 5 } }), 4).acao?.habilitada).toBe(true);
    // os fragmentos são por subclasse
    expect(acaoDoTier(char({ ...base, fragmentosSubclasse: { sabio_arcano: 9 } }), 4).acao?.habilitada).toBe(false);
  });

  it('com tudo comprado não há mais botão', () => {
    const c = char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 4 } });
    expect(acaoDoTier(c, 4)).toEqual({ acao: null, aviso: 'Comprado' });
  });

  it('resetar custa 100 diamantes e só existe com subclasse', () => {
    expect(acaoDeReset(char())).toBeNull();
    const a = acaoDeReset(char({ subclasseAtualId: 'arquimago', subclasseTiers: { arquimago: 1 } }));
    expect(a).toMatchObject({ tipo: 'resetar', habilitada: true });
    expect(a?.custo).toEqual({ ouro: 0, fragmentosAlma: 0, fragmentosSubclasse: 0, diamantes: 100 });
    expect(acaoDeReset(char({ subclasseAtualId: 'arquimago', diamantes: 99 }))?.habilitada).toBe(false);
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
