import { describe, it, expect } from 'vitest';
import { apagarComBorda, mascaraDaCelula, nomeDaPosicao, pintarComBorda, regraDoValor, type RegrasDoMapa } from '@/lib/autoTile';
import { desfazer, historicoVazio, registrar } from '@/lib/editorMapa';
import { mapaVazio, tileDoValor, valorDoTile, type MapaDados } from '@/rules/mapa';
import type { RegraDeBorda } from '@/rules/tileset';

// o tile i da regra é o próprio número da posição (tile 0 = sozinho ... tile 15 = miolo)
const grama: RegraDeBorda = { id: 'grama', nome: 'Grama', tiles: Array.from({ length: 16 }, (_, i) => i) };
const agua: RegraDeBorda = { id: 'agua', nome: 'Água', tiles: Array.from({ length: 16 }, (_, i) => 20 + i) };
const regras: RegrasDoMapa = [[grama, agua]];
const alvo = (r: RegraDeBorda) => ({ regra: r, tileset: 0 });
const pos = (m: MapaDados, x: number, y: number) => tileDoValor(m.camadas.chao[y * m.largura + x])?.tile ?? null;
const novo = () => {
  const m = mapaVazio(7, 7);
  m.tilesets = ['t'];
  return m;
};
const bloco3 = (x0: number, y0: number) => Array.from({ length: 9 }, (_, i) => ({ x: x0 + (i % 3), y: y0 + Math.floor(i / 3) }));

describe('Borda automática (auto-tile)', () => {
  it('reconhece o terreno pelo tile e ignora tile sem regra', () => {
    expect(regraDoValor(regras, valorDoTile(0, 5))?.regra.id).toBe('grama');
    expect(regraDoValor(regras, valorDoTile(0, 27))?.regra.id).toBe('agua');
    expect(regraDoValor(regras, valorDoTile(0, 99))).toBeNull();
    expect(regraDoValor(regras, valorDoTile(1, 5))).toBeNull(); // outro tileset
    expect(regraDoValor(regras, 0)).toBeNull();
  });

  it('um tile sozinho vira o "sozinho"; um bloco 3x3 ganha cantos, lados e miolo', () => {
    const m = novo();
    pintarComBorda(m, 'chao', [{ x: 3, y: 3 }], alvo(grama), regras);
    expect(pos(m, 3, 3)).toBe(0);

    const b = novo();
    const mud = pintarComBorda(b, 'chao', bloco3(2, 2), alvo(grama), regras);
    expect(pos(b, 3, 3)).toBe(15); // miolo
    expect(pos(b, 2, 2)).toBe(2 | 4); // canto de cima à esquerda: vizinhos à direita e embaixo
    expect(pos(b, 4, 2)).toBe(4 | 8); // canto de cima à direita
    expect(pos(b, 2, 4)).toBe(1 | 2); // canto de baixo à esquerda
    expect(pos(b, 4, 4)).toBe(1 | 8);
    expect(pos(b, 3, 2)).toBe(2 | 4 | 8); // lado de cima
    expect(pos(b, 3, 4)).toBe(1 | 2 | 8);
    expect(pos(b, 2, 3)).toBe(1 | 2 | 4);
    expect(pos(b, 4, 3)).toBe(1 | 4 | 8);
    expect(mud).toHaveLength(9);
    expect(mud.every(([, antes]) => antes === 0)).toBe(true);
  });

  it('pintar ao lado de um terreno existente acerta as bordas do vizinho também', () => {
    const m = novo();
    pintarComBorda(m, 'chao', [{ x: 2, y: 3 }], alvo(grama), regras);
    expect(pos(m, 2, 3)).toBe(0);
    const mud = pintarComBorda(m, 'chao', [{ x: 3, y: 3 }], alvo(grama), regras);
    expect(pos(m, 2, 3)).toBe(2); // agora liga à direita
    expect(pos(m, 3, 3)).toBe(8); // e este liga à esquerda
    expect(mud.map(([i]) => i).sort()).toEqual([3 * 7 + 2, 3 * 7 + 3]);
  });

  it('fora do mapa conta como o mesmo terreno', () => {
    const m = novo();
    pintarComBorda(m, 'chao', [{ x: 0, y: 0 }], alvo(grama), regras);
    expect(pos(m, 0, 0)).toBe(1 | 8);
    expect(mascaraDaCelula(m, 'chao', 0, 0, alvo(grama))).toBe(1 | 8);
  });

  it('terrenos diferentes não se ligam (a água faz borda na grama)', () => {
    const m = novo();
    pintarComBorda(m, 'chao', [{ x: 2, y: 3 }], alvo(grama), regras);
    pintarComBorda(m, 'chao', [{ x: 3, y: 3 }], alvo(agua), regras);
    expect(pos(m, 2, 3)).toBe(0);
    expect(pos(m, 3, 3)).toBe(20);
  });

  it('apagar acerta as bordas de quem sobra; desfazer volta tudo', () => {
    const m = novo();
    const pintado = pintarComBorda(m, 'chao', bloco3(2, 2), alvo(grama), regras);
    let h = registrar(historicoVazio(), { camada: 'chao', mudancas: pintado });
    const apagado = apagarComBorda(m, 'chao', [{ x: 3, y: 3 }], regras);
    h = registrar(h, { camada: 'chao', mudancas: apagado });
    expect(m.camadas.chao[3 * 7 + 3]).toBe(0);
    expect(pos(m, 3, 2)).toBe(2 | 8); // lado de cima, sem o miolo embaixo
    expect(pos(m, 2, 3)).toBe(1 | 4); // lado esquerdo
    h = desfazer(m, h);
    expect(pos(m, 3, 3)).toBe(15);
    expect(pos(m, 3, 2)).toBe(2 | 4 | 8);
    desfazer(m, h);
    expect(m.camadas.chao.every((v) => v === 0)).toBe(true);
  });

  it('apagar longe de qualquer terreno com regra só apaga', () => {
    const m = novo();
    m.camadas.chao[10] = valorDoTile(0, 99);
    expect(apagarComBorda(m, 'chao', [{ x: 3, y: 1 }], regras)).toEqual([[10, valorDoTile(0, 99), 0]]);
  });

  it('pontos fora do mapa são ignorados e nomes das posições', () => {
    const m = novo();
    expect(pintarComBorda(m, 'chao', [{ x: -1, y: 0 }, { x: 99, y: 3 }], alvo(grama), regras)).toEqual([]);
    expect(nomeDaPosicao(0)).toBe('Sozinho');
    expect(nomeDaPosicao(15)).toBe('Miolo');
    expect(nomeDaPosicao(1 | 2)).toBe('Liga: cima, direita');
  });
});
