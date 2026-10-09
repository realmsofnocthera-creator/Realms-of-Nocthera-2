import { describe, it, expect } from 'vitest';
import { Combatente, turnoDeCombate } from '@/game/combat';
import { obterModificadoresRaciais } from '@/game/elements';
import { obterResistenciasRaciais, reducaoChanceStatusRacial } from '@/game/resistenciasRaciais';
import { RACES, RESISTENCIA_RACIAL_DANO_MAXIMA_PERCENTUAL } from '@/rules/races';
import { tentarAplicarEfeito } from '@/game/statusEffects';

/** Roadmap 1.4 — resistências raciais: dano recebido por tipo (até 5%), Resistência Ancestral do Anão, resistência a status. */

const atributos = { vigor: 100, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 };
const atacante = (extra: Partial<Combatente> = {}): Combatente => ({
  nome: 'Atacante', hp: 5000, hpMax: 5000, sobreescudo: 0,
  atributos: { ...atributos, forca: 50, inteligencia: 50 }, ...extra,
});
const alvoRaca = (racaId?: string): Combatente => ({
  nome: 'Alvo', racaId, hp: 5000, hpMax: 5000, sobreescudo: 0, atributos, mitigacao: 0,
});
const danoRecebido = (racaId?: string, classeAtacante?: string) =>
  turnoDeCombate(atacante(classeAtacante ? { classeId: classeAtacante, nivel: 1 } : {}), alvoRaca(racaId), 1).turnoLog.ataques[0].danoEfetivo;

describe('1.4.1 — resistência racial de dano recebido (máx. 5% por raça)', () => {
  it('nenhuma raça passa de 5% em dano recebido por tipo (o bônus da passiva do Anão é à parte)', () => {
    for (const r of RACES) {
      for (const res of r.resistencias ?? []) {
        if (['danoFisico', 'danoMagico', 'danoTrevas'].includes(res.tipo)) {
          expect(res.valor ?? 0, `${r.id}/${res.tipo}`).toBeLessThanOrEqual(RESISTENCIA_RACIAL_DANO_MAXIMA_PERCENTUAL);
        }
      }
    }
  });

  it('tabela: Anão e Orc físico, Elfo mágico; Humano e Vampiro sem resistência de dano físico/mágico', () => {
    expect(obterResistenciasRaciais('orc')).toMatchObject({ danoFisicoPercentual: 5, danoMagicoPercentual: 0 });
    expect(obterResistenciasRaciais('elfo')).toMatchObject({ danoFisicoPercentual: 0, danoMagicoPercentual: 5 });
    expect(obterResistenciasRaciais('humano')).toMatchObject({ danoFisicoPercentual: 0, danoMagicoPercentual: 0 });
    expect(obterResistenciasRaciais('vampiro')).toMatchObject({ danoFisicoPercentual: 0, danoMagicoPercentual: 0 });
    expect(obterResistenciasRaciais(undefined).danoFisicoPercentual).toBe(0);
  });

  it('Vampiro resiste 5% ao elemento Sombrio (modificador elemental)', () => {
    expect(obterModificadoresRaciais('vampiro').sombrio).toBe(-5);
  });

  it('Orc recebe 5% a menos de dano físico; Humano não', () => {
    const humano = danoRecebido('humano');
    expect(danoRecebido('orc')).toBe(Math.floor((humano * 95) / 100));
    expect(danoRecebido('orc')).toBeLessThan(humano);
  });

  it('Elfo recebe 5% a menos de dano mágico e nada a menos de dano físico', () => {
    const humanoMagico = danoRecebido('humano', 'feiticeiro');
    expect(danoRecebido('elfo', 'feiticeiro')).toBeLessThan(humanoMagico);
    expect(danoRecebido('elfo')).toBe(danoRecebido('humano'));
  });
});

describe('1.4.2 — Resistência Ancestral do Anão', () => {
  it('soma 10% (passiva) + 5% (racial) de dano físico recebido: 15%', () => {
    expect(obterResistenciasRaciais('anao').danoFisicoPercentual).toBe(15);
    const humano = danoRecebido('humano');
    expect(danoRecebido('anao')).toBe(Math.floor((humano * 85) / 100));
  });
});

describe('1.4.3 — resistência a status reduz a chance de ativação (não a duração)', () => {
  it('Anão: −10% de chance nos status físicos; nenhuma raça resiste a Podridão Escarlate ainda', () => {
    expect(reducaoChanceStatusRacial('anao', 'sangramento')).toBe(10);
    expect(reducaoChanceStatusRacial('anao', 'veneno')).toBe(10);
    expect(reducaoChanceStatusRacial('anao', 'podridaoEscarlate')).toBe(0);
    expect(reducaoChanceStatusRacial('humano', 'veneno')).toBe(0);
  });

  it('com 10% de resistência a chance do Veneno vai de 10 para 9 (fronteira do sorteio)', () => {
    const base = new Map();
    expect(tentarAplicarEfeito(base, 'veneno', 9.5).resultado).toBe('aplicado');
    expect(tentarAplicarEfeito(base, 'veneno', 9.5, 10).resultado).toBe('nao_ativou');
    expect(tentarAplicarEfeito(base, 'veneno', 8.99, 10).resultado).toBe('aplicado');
  });

  it('sem resistência nada muda; resistência de 100% ou mais anula o status', () => {
    const base = new Map();
    expect(tentarAplicarEfeito(base, 'veneno', 9.99).resultado).toBe('aplicado');
    expect(tentarAplicarEfeito(base, 'veneno', 0, 100).resultado).toBe('nao_ativou');
  });

  it('a duração não muda: o DOT aplicado continua com as mesmas rodadas', () => {
    const r = tentarAplicarEfeito(new Map(), 'veneno', 1, 10);
    expect(r.efeitos.get('veneno')?.rodadasRestantes).toBe(10);
  });
});
