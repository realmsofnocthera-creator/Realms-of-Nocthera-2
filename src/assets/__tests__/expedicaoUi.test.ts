import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as ui from '../expedicaoUi';
import { SELOS_DE_BUSCA } from '@/rules/colecionaveis';
import { TURNOS_DE_EXPEDICAO } from '@/rules/expedicao';

const publico = join(__dirname, '..', '..', '..', 'public');

function caminhos(v: unknown): string[] {
  if (typeof v === 'string') return v.startsWith('/images/') ? [v] : [];
  if (v && typeof v === 'object') return Object.values(v).flatMap(caminhos);
  return [];
}

describe('arte da Expedição', () => {
  it('todos os arquivos usados existem e cada um tem até 350 KB', () => {
    const usados = new Set<string>([
      ...caminhos(ui.EXPEDICAO_UI), ...caminhos(ui.MATERIAL_POR_RARIDADE), ...caminhos(ui.SELO_ESTATICO), ...caminhos(ui.SELO_EM_LACO),
      ...caminhos(ui.ANIMACOES_DA_EXPEDICAO), ...caminhos(ui.POP),
      ...TURNOS_DE_EXPEDICAO.map((t) => ui.turno(t.horas)),
      ...(['ouro', 'carmesim'] as const).flatMap((t) => (['normal', 'pressionado', 'desativado'] as const).map((e) => ui.botao(t, e))),
    ]);
    for (const f of usados) {
      expect(existsSync(join(publico, f)), f).toBe(true);
      expect(statSync(join(publico, f)).size, f).toBeLessThanOrEqual(350 * 1024);
    }
    for (const dir of ['images/expedicao', 'images/expedicao/animacoes']) {
      for (const f of readdirSync(join(publico, dir)).filter((x) => x.endsWith('.webp'))) expect(usados.has(`/${dir}/${f}`), f).toBe(true);
    }
  });

  it('há selo parado, em laço e pop para cada selo de busca', () => {
    for (const s of SELOS_DE_BUSCA) {
      expect(ui.SELO_ESTATICO[s]).toBeTruthy();
      expect(ui.SELO_EM_LACO[s]).toBeTruthy();
      expect(ui.POP.selo[s]).toBeTruthy();
    }
  });
});
