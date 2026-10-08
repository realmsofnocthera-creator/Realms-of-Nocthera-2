import { describe, it, expect } from 'vitest';
import { Attributes } from '@/rules/attributes';
import { CLASSES } from '@/rules/classes';
import { GAME_CONFIG } from '@/rules/config';
import { SUBCLASSES } from '@/rules/subclasses';
import {
  subclassesDaClasse,
  obterSubclasse,
  verificarRequisitosDesbloqueio,
  aplicarBonusSubclasse,
  removerBonusSubclasse,
} from '@/game/subclasses';

describe('ORDEM 43 — Dados e Funções Puras de Subclasses', () => {
  it('(a) existem exatamente 12 subclasses, 2 por classe, ids únicos', () => {
    expect(SUBCLASSES.length).toBe(12);

    const ids = SUBCLASSES.map((s) => s.id);
    const idsUnicos = new Set(ids);
    expect(idsUnicos.size).toBe(12);

    for (const id of ids) {
      expect(typeof id).toBe('string');
      expect(id.trim().length).toBeGreaterThan(0);
    }

    for (const classe of CLASSES) {
      const subclasses = subclassesDaClasse(classe.id);
      expect(subclasses.length).toBe(2);
    }
  });

  it('(b) toda subclasse pertence a uma classe existente', () => {
    const classIdsExistentes = new Set(CLASSES.map((c) => c.id));

    for (const sub of SUBCLASSES) {
      expect(classIdsExistentes.has(sub.classeId)).toBe(true);
      expect(obterSubclasse(sub.id)).toBeDefined();
      expect(obterSubclasse(sub.id)?.nome).toBe(sub.nome);
    }
  });

  it('(c) a soma dos bônus de cada subclasse é igual a GAME_CONFIG.SUBCLASSE_BONUS_TOTAL_PONTOS', () => {
    for (const sub of SUBCLASSES) {
      const soma =
        sub.bonusAtributos.vigor +
        sub.bonusAtributos.sorte +
        sub.bonusAtributos.forca +
        sub.bonusAtributos.vitalidade +
        sub.bonusAtributos.arcano +
        sub.bonusAtributos.inteligencia +
        sub.bonusAtributos.agilidade;

      expect(soma).toBe(GAME_CONFIG.SUBCLASSE_BONUS_TOTAL_PONTOS);
      expect(soma).toBe(40);
    }
  });

  it('(d) os 12 bônus batem com a tabela do passo 2', () => {
    const esperadoPorId: Record<string, { classeId: string; nome: string; bonus: Attributes }> = {
      berserker: {
        classeId: 'barbaro',
        nome: 'Berserker',
        bonus: { vigor: 12, sorte: 0, forca: 20, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 8 },
      },
      colosso: {
        classeId: 'barbaro',
        nome: 'Colosso',
        bonus: { vigor: 18, sorte: 0, forca: 6, vitalidade: 16, arcano: 0, inteligencia: 0, agilidade: 0 },
      },
      vanguarda: {
        classeId: 'cavaleiro',
        nome: 'Vanguarda',
        bonus: { vigor: 10, sorte: 0, forca: 16, vitalidade: 14, arcano: 0, inteligencia: 0, agilidade: 0 },
      },
      bastiao: {
        classeId: 'cavaleiro',
        nome: 'Bastião',
        bonus: { vigor: 14, sorte: 0, forca: 0, vitalidade: 22, arcano: 4, inteligencia: 0, agilidade: 0 },
      },
      arquimago: {
        classeId: 'feiticeiro',
        nome: 'Arquimago',
        bonus: { vigor: 0, sorte: 12, forca: 0, vitalidade: 0, arcano: 4, inteligencia: 24, agilidade: 0 },
      },
      sabio_arcano: {
        classeId: 'feiticeiro',
        nome: 'Sábio Arcano',
        bonus: { vigor: 0, sorte: 18, forca: 0, vitalidade: 0, arcano: 12, inteligencia: 10, agilidade: 0 },
      },
      assassino: {
        classeId: 'bandido',
        nome: 'Assassino',
        bonus: { vigor: 4, sorte: 0, forca: 22, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 14 },
      },
      duelista: {
        classeId: 'bandido',
        nome: 'Duelista',
        bonus: { vigor: 4, sorte: 0, forca: 14, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 22 },
      },
      sacerdote: {
        classeId: 'profeta',
        nome: 'Sacerdote',
        bonus: { vigor: 12, sorte: 18, forca: 0, vitalidade: 0, arcano: 10, inteligencia: 0, agilidade: 0 },
      },
      inquisidor: {
        classeId: 'profeta',
        nome: 'Inquisidor',
        bonus: { vigor: 6, sorte: 12, forca: 0, vitalidade: 0, arcano: 0, inteligencia: 22, agilidade: 0 },
      },
      kensei: {
        classeId: 'samurai',
        nome: 'Kensei',
        bonus: { vigor: 6, sorte: 0, forca: 24, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 10 },
      },
      ronin: {
        classeId: 'samurai',
        nome: 'Ronin',
        bonus: { vigor: 10, sorte: 0, forca: 12, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 18 },
      },
    };

    for (const [id, esperado] of Object.entries(esperadoPorId)) {
      const sub = obterSubclasse(id);
      expect(sub).toBeDefined();
      expect(sub?.classeId).toBe(esperado.classeId);
      expect(sub?.nome).toBe(esperado.nome);
      expect(sub?.bonusAtributos).toEqual(esperado.bonus);
    }
  });

  it('(e) verificarRequisitosDesbloqueio: ok com nível 20, 10000 de ouro e 5 fragmentos; falha com 19 níveis, 9999 de ouro e 4 fragmentos (um caso por motivo)', () => {
    // Caso de sucesso exato
    const sucesso = verificarRequisitosDesbloqueio({
      nivel: 20,
      ouro: 10000,
      fragmentosAlma: 5,
    });
    expect(sucesso).toEqual({ ok: true });

    // Caso com valores acima dos mínimos
    const sucessoAcima = verificarRequisitosDesbloqueio({
      nivel: 25,
      ouro: 20000,
      fragmentosAlma: 10,
    });
    expect(sucessoAcima).toEqual({ ok: true });

    // Falha por nível insuficiente
    const falhaNivel = verificarRequisitosDesbloqueio({
      nivel: 19,
      ouro: 10000,
      fragmentosAlma: 5,
    });
    expect(falhaNivel).toEqual({
      ok: false,
      motivo: 'Nível insuficiente',
    });

    // Falha por ouro insuficiente
    const falhaOuro = verificarRequisitosDesbloqueio({
      nivel: 20,
      ouro: 9999,
      fragmentosAlma: 5,
    });
    expect(falhaOuro).toEqual({
      ok: false,
      motivo: 'Ouro insuficiente',
    });

    // Falha por fragmentos de alma insuficientes
    const falhaFragmentos = verificarRequisitosDesbloqueio({
      nivel: 20,
      ouro: 10000,
      fragmentosAlma: 4,
    });
    expect(falhaFragmentos).toEqual({
      ok: false,
      motivo: 'Fragmentos de alma insuficientes',
    });
  });

  it('(f) aplicar e depois remover o mesmo bônus devolve os atributos originais', () => {
    const atributosBase: Attributes = {
      vigor: 15,
      sorte: 10,
      forca: 20,
      vitalidade: 12,
      arcano: 5,
      inteligencia: 8,
      agilidade: 14,
    };

    const copiaBase = { ...atributosBase };
    const berserker = obterSubclasse('berserker')!;

    const comBonus = aplicarBonusSubclasse(atributosBase, berserker.bonusAtributos);

    // Confirma imutabilidade do objeto base
    expect(atributosBase).toEqual(copiaBase);

    // Confirma que os valores foram somados
    expect(comBonus.forca).toBe(atributosBase.forca + berserker.bonusAtributos.forca);
    expect(comBonus.vigor).toBe(atributosBase.vigor + berserker.bonusAtributos.vigor);
    expect(comBonus.agilidade).toBe(atributosBase.agilidade + berserker.bonusAtributos.agilidade);

    // Remove o bônus
    const aposRemover = removerBonusSubclasse(comBonus, berserker.bonusAtributos);

    // Confirma imutabilidade de comBonus
    expect(comBonus.forca).toBe(atributosBase.forca + berserker.bonusAtributos.forca);

    // Confirma que devolveu exatamente os atributos originais
    expect(aposRemover).toEqual(atributosBase);
  });

  it('(g) remover um bônus maior que os atributos lança erro', () => {
    const atributosBaixos: Attributes = {
      vigor: 2,
      sorte: 2,
      forca: 5, // menor que o bônus de 20 do berserker
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    };

    const berserker = obterSubclasse('berserker')!;

    expect(() => {
      removerBonusSubclasse(atributosBaixos, berserker.bonusAtributos);
    }).toThrowError(/negativo/i);
  });
});
