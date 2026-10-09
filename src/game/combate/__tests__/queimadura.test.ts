import { describe, it, expect } from 'vitest';
import { Combatente, resolverCombate } from '@/game/combat';
import { EfeitoAtivo, formatarEventoEfeito, processarTickEfeitos, tentarAplicarEfeito } from '@/game/statusEffects';
import { EFEITOS_STATUS, EfeitoStatus } from '@/rules/statusEffects';
import { MonsterDefinition } from '@/rules/monsters';

/** 1.6.5 — Queimadura: dano contínuo de fogo (proposta aprovada pelo Yuri em 09/10/2026). */

describe('1.6.5 — Queimadura', () => {
  it('dados: 6% do HP máximo por rodada, 5 rodadas, chance de 6%', () => {
    expect(EFEITOS_STATUS.queimadura).toMatchObject({
      id: 'queimadura',
      nome: 'Queimadura',
      tipo: 'dot',
      percentualHpMax: 6,
      duracaoRodadas: 5,
      chanceAtivacao: 6,
    });
  });

  it('fronteira da chance: 5,99 ativa e 6 não', () => {
    expect(tentarAplicarEfeito(new Map(), 'queimadura', 5.99).resultado).toBe('aplicado');
    expect(tentarAplicarEfeito(new Map(), 'queimadura', 6).resultado).toBe('nao_ativou');
  });

  it('causa 6% por rodada durante 5 rodadas (30% do HP máximo no total) e expira', () => {
    let mapa = tentarAplicarEfeito(new Map(), 'queimadura', 0).efeitos;
    let total = 0;
    const rodadas: number[] = [];
    for (let i = 0; i < 5; i++) {
      const tick = processarTickEfeitos(mapa, 1000);
      mapa = tick.efeitos;
      total += tick.danoTotal;
      rodadas.push(tick.danoTotal);
    }
    expect(rodadas).toEqual([60, 60, 60, 60, 60]);
    expect(total).toBe(300);
    expect(mapa.size).toBe(0);
  });

  it('renova a duração em vez de empilhar', () => {
    const parcial = new Map<EfeitoStatus, EfeitoAtivo>([['queimadura', { id: 'queimadura', rodadasRestantes: 2 }]]);
    const r = tentarAplicarEfeito(parcial, 'queimadura', 0);
    expect(r.resultado).toBe('renovado');
    expect(r.efeitos.get('queimadura')?.rodadasRestantes).toBe(5);
    expect(r.efeitos.size).toBe(1);
  });

  it('o texto usa o artigo feminino', () => {
    expect(formatarEventoEfeito({ tipo: 'renovado', efeito: 'queimadura' }, 'Dragão')).toBe('O Dragão renovou a Queimadura');
    expect(formatarEventoEfeito({ tipo: 'expirado', efeito: 'queimadura' })).toBe('A Queimadura se dissipou');
    expect(formatarEventoEfeito({ tipo: 'dano', efeito: 'queimadura', dano: 60, rodadasRestantes: 4 })).toBe(
      'Queimadura causa 60 de dano (restam 4 rodadas)'
    );
  });

  it('monstro que aplica Queimadura causa dano contínuo no personagem durante a luta', () => {
    const monstro: MonsterDefinition = {
      id: 'teste-queimadura', nome: 'Chamas', nivel: 1, hp: 10_000, categoriaCorporal: 'feral',
      atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
      xpConcedido: 1, ouroConcedido: { min: 1, max: 1 }, efeitosAplicados: ['queimadura'],
    };
    const heroi: Combatente = {
      nome: 'Heroi', hp: 1000, hpMax: 1000, sobreescudo: 0, mitigacao: 0,
      atributos: { vigor: 1, sorte: 0, forca: 1, vitalidade: 0, arcano: 0, inteligencia: 0, agilidade: 1 },
    };
    const r = resolverCombate(heroi, monstro, 1, { rngStatus: () => 0 });
    const eventos = r.logTurnos.flatMap((t) => t.eventosEfeitos ?? []).filter((e) => e.efeito === 'queimadura');
    expect(eventos.some((e) => e.tipo === 'aplicado')).toBe(true);
    const danos = eventos.filter((e) => e.tipo === 'dano');
    expect(danos.length).toBeGreaterThanOrEqual(5);
    expect(danos[0].dano).toBe(60);
  });
});
