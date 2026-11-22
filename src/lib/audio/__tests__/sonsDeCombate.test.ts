import { describe, it, expect } from 'vitest';
import { sonsDaAcao } from '@/lib/audio/sonsDeCombate';
import { ehSom } from '@/rules/audio';
import type { AcaoDaLuta } from '@/lib/cacadaReplay';

const base: AcaoDaLuta = { de: 'jogador', dano: 10, golpes: [10], criticos: 0, cura: 0, bloqueado: false };

describe('sons do golpe', () => {
  it('o elemento manda no som; sem elemento vale o tipo de dano; crítico soma o som de crítico', () => {
    expect(sonsDaAcao({ ...base, elemento: 'gelo' })).toEqual(['elem_gelo_impacto']);
    expect(sonsDaAcao({ ...base, tipoGolpe: 'perfuracao' })[0]).toBe('sfx_lanca_golpe');
    expect(sonsDaAcao({ ...base, tipoGolpe: 'contusao', criticos: 1 })).toContain('sfx_dano_critico');
    expect(sonsDaAcao({ ...base, tipoGolpe: 'corte' })[0]).toBe('sfx_espada_golpe');
  });
  it('golpe sem dano: o monstro bate no escudo, o herói erra; o monstro que acerta machuca', () => {
    expect(sonsDaAcao({ ...base, de: 'monstro', dano: 0, bloqueado: true })).toEqual(['sfx_escudo_bloqueio']);
    expect(sonsDaAcao({ ...base, dano: 0, bloqueado: true })).toEqual(['sfx_falha_errou']);
    expect(sonsDaAcao({ ...base, de: 'monstro' })).toEqual(['sfx_dano_recebido_leve']);
    expect(sonsDaAcao({ ...base, de: 'monstro', criticos: 1 })).toEqual(['sfx_dano_recebido_pesado']);
  });
  it('todo som devolvido existe no catálogo', () => {
    for (const el of ['fogo', 'gelo', 'relampago', 'terra', 'vento', 'sagrado', 'sombrio'] as const)
      for (const de of ['jogador', 'monstro'] as const) for (const id of sonsDaAcao({ ...base, de, elemento: el, cura: 5, criticos: 1, reacao: 'imune' })) expect(ehSom(id), id).toBe(true);
  });
});
