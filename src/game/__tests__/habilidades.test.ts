import { describe, it, expect } from 'vitest';
import { CLASSES } from '@/rules/classes';
import {
  idsHabilidadesDaClasse,
  habilidadesPadraoDaClasse,
  normalizarHabilidadesEquipadas,
} from '@/game/habilidades';

describe('ORDEM 42 — Habilidades de Classe e Habilidades Equipadas', () => {
  it('(a) os ids de todas as classes são únicos e não vazios', () => {
    const todosIds: string[] = [];
    const nomesMilestones = [
      'ataqueBasico',
      'habilidadeEspecial',
      'passivaI',
      'passivaII',
      'ultimate',
    ] as const;

    expect(CLASSES.length).toBe(6);

    for (const classe of CLASSES) {
      for (const marco of nomesMilestones) {
        const habilidade = classe.progressao[marco];
        expect(habilidade.id).toBeDefined();
        expect(typeof habilidade.id).toBe('string');
        expect(habilidade.id.trim().length).toBeGreaterThan(0);
        expect(habilidade.id.startsWith(`${classe.id}_`)).toBe(true);
        todosIds.push(habilidade.id);
      }
    }

    // 6 classes * 5 marcos = 30 habilidades
    expect(todosIds.length).toBe(30);
    const idsUnicos = new Set(todosIds);
    expect(idsUnicos.size).toBe(30);
  });

  it('(b) habilidadesPadraoDaClasse devolve os 3 ids certos para cada uma das 6 classes', () => {
    const classesEsperadas = [
      {
        id: 'barbaro',
        esperado: {
          ataqueBasico: 'barbaro_golpe_barbaro',
          habilidadeEspecial: 'barbaro_furia_selvagem',
          ultimate: 'barbaro_ira_do_barbaro',
        },
      },
      {
        id: 'cavaleiro',
        esperado: {
          ataqueBasico: 'cavaleiro_golpe_do_guardiao',
          habilidadeEspecial: 'cavaleiro_postura_do_guardiao',
          ultimate: 'cavaleiro_juramento_do_guardiao',
        },
      },
      {
        id: 'feiticeiro',
        esperado: {
          ataqueBasico: 'feiticeiro_faisca_arcana',
          habilidadeEspecial: 'feiticeiro_explosao_arcana',
          ultimate: 'feiticeiro_cataclismo_arcano',
        },
      },
      {
        id: 'bandido',
        esperado: {
          ataqueBasico: 'bandido_golpe_rapido',
          habilidadeEspecial: 'bandido_rajada_de_golpes',
          ultimate: 'bandido_danca_das_laminas',
        },
      },
      {
        id: 'profeta',
        esperado: {
          ataqueBasico: 'profeta_luz_sagrada',
          habilidadeEspecial: 'profeta_bencao_divina',
          ultimate: 'profeta_milagre_divino',
        },
      },
      {
        id: 'samurai',
        esperado: {
          ataqueBasico: 'samurai_corte_preciso',
          habilidadeEspecial: 'samurai_iaijutsu',
          ultimate: 'samurai_corte_do_vazio',
        },
      },
    ];

    for (const { id, esperado } of classesEsperadas) {
      const padrao = habilidadesPadraoDaClasse(id);
      expect(padrao).toEqual(esperado);

      const ids = idsHabilidadesDaClasse(id);
      expect(ids).toEqual([
        esperado.ataqueBasico,
        esperado.habilidadeEspecial,
        esperado.ultimate,
      ]);
    }
  });

  it('(c) normalizar completa espaços ausentes', () => {
    // Sem passar equipadas
    const resultadoVazio = normalizarHabilidadesEquipadas('barbaro');
    expect(resultadoVazio).toEqual({
      ataqueBasico: 'barbaro_golpe_barbaro',
      habilidadeEspecial: 'barbaro_furia_selvagem',
      ultimate: 'barbaro_ira_do_barbaro',
    });

    // Passando objeto vazio
    const resultadoObjetoVazio = normalizarHabilidadesEquipadas('feiticeiro', {});
    expect(resultadoObjetoVazio).toEqual({
      ataqueBasico: 'feiticeiro_faisca_arcana',
      habilidadeEspecial: 'feiticeiro_explosao_arcana',
      ultimate: 'feiticeiro_cataclismo_arcano',
    });

    // Passando apenas ataqueBasico
    const parcialAtaque = normalizarHabilidadesEquipadas('bandido', {
      ataqueBasico: 'bandido_golpe_rapido',
    });
    expect(parcialAtaque).toEqual({
      ataqueBasico: 'bandido_golpe_rapido',
      habilidadeEspecial: 'bandido_rajada_de_golpes',
      ultimate: 'bandido_danca_das_laminas',
    });

    // Passando apenas ultimate
    const parcialUltimate = normalizarHabilidadesEquipadas('samurai', {
      ultimate: 'samurai_corte_do_vazio',
    });
    expect(parcialUltimate).toEqual({
      ataqueBasico: 'samurai_corte_preciso',
      habilidadeEspecial: 'samurai_iaijutsu',
      ultimate: 'samurai_corte_do_vazio',
    });
  });

  it('(d) normalizar substitui id inválido pelo padrão', () => {
    // ID aleatório inexistente
    const comInexistente = normalizarHabilidadesEquipadas('barbaro', {
      ataqueBasico: 'habilidade_inventada_123',
    });
    expect(comInexistente.ataqueBasico).toBe('barbaro_golpe_barbaro');

    // ID de outra classe
    const deOutraClasse = normalizarHabilidadesEquipadas('barbaro', {
      habilidadeEspecial: 'feiticeiro_explosao_arcana',
    });
    expect(deOutraClasse.habilidadeEspecial).toBe('barbaro_furia_selvagem');

    // String vazia
    const stringVazia = normalizarHabilidadesEquipadas('profeta', {
      ultimate: '',
    });
    expect(stringVazia.ultimate).toBe('profeta_milagre_divino');

    // ID de passiva que não é espaço de habilidade ativa
    const passivaInformada = normalizarHabilidadesEquipadas('cavaleiro', {
      ataqueBasico: 'cavaleiro_muralha_de_ferro',
    });
    expect(passivaInformada.ataqueBasico).toBe('cavaleiro_golpe_do_guardiao');
  });

  it('(e) classeId inexistente lança erro', () => {
    expect(() => idsHabilidadesDaClasse('classe_fantasma')).toThrow(
      'Classe "classe_fantasma" não encontrada.'
    );

    expect(() => habilidadesPadraoDaClasse('guerreiro_inexistente')).toThrow(
      'Classe "guerreiro_inexistente" não encontrada.'
    );

    expect(() => normalizarHabilidadesEquipadas('mago_inexistente')).toThrow(
      'Classe "mago_inexistente" não encontrada.'
    );

    expect(() => normalizarHabilidadesEquipadas('')).toThrow();
  });
});
