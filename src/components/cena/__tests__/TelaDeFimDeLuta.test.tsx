import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BURACOS, TelaDeFimDeLuta, VIDEOS_DO_FIM } from '../TelaDeFimDeLuta';
import { espoliosDaLuta } from '@/components/cacada/espolios';

const nada = () => {};

describe('telas de vitória e de derrota', () => {
  it('os vídeos existem e são leves', () => {
    for (const v of [VIDEOS_DO_FIM.vitoria, VIDEOS_DO_FIM.derrota]) {
      const arquivo = join(process.cwd(), 'public', v);
      expect(existsSync(arquivo), v).toBe(true);
      expect(statSync(arquivo).size, v).toBeLessThanOrEqual(500 * 1024);
    }
  });
  it('os buracos ficam dentro do quadro de 1024 x 1536', () => {
    const todos = [B(BURACOS.vitoria.retrato), B(BURACOS.vitoria.xp), B(BURACOS.vitoria.ouro), ...BURACOS.vitoria.espolios.map(B), B(BURACOS.vitoria.botoes), B(BURACOS.derrota.retrato), B(BURACOS.derrota.repetir), B(BURACOS.derrota.voltar)];
    for (const b of todos) {
      expect(b.x + b.l).toBeLessThanOrEqual(1024);
      expect(b.y + b.a).toBeLessThanOrEqual(1536);
    }
  });
  it('a vitória mostra XP, ouro, espólios e os dois botões', () => {
    const h = renderToStaticMarkup(
      <TelaDeFimDeLuta tipo="vitoria" retrato="/x.webp" xp={{ ganho: 48, progresso: 0.5 }} ouro={35} espolios={espoliosDaLuta([{ materialId: 'orbe-de-armadura', quantidade: 2 }])}
        voltar={{ rotulo: 'Voltar ao livro', acao: nada }} repetir={{ rotulo: 'Caçar de novo', acao: nada }} />
    );
    expect(h).toContain('+48 XP');
    expect(h).toContain('+35');
    expect(h).toContain('Orbe de Armadura ×2');
    expect(h).toContain('Voltar ao livro');
    expect(h).toContain('Caçar de novo');
  });
  it('a derrota mostra os botões com os textos do jogo (não os do vídeo)', () => {
    const h = renderToStaticMarkup(<TelaDeFimDeLuta tipo="derrota" retrato="/x.webp" voltar={{ rotulo: 'Voltar ao livro', acao: nada }} repetir={{ rotulo: 'Tentar novamente', acao: nada }} />);
    expect(h).toContain('Tentar novamente');
    expect(h).toContain('Voltar ao livro');
    expect(h).toContain('Derrota');
  });
});

function B(b: { x: number; y: number; l: number; a: number }) {
  return b;
}
