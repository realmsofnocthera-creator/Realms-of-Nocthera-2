import { describe, it, expect } from 'vitest';
import { mapaVazio, valorDoTile } from '@/rules/mapa';
import {
  celulaDoPonto,
  copiarMapa,
  desfazer,
  historicoVazio,
  juntarMudancas,
  LIMITE_DO_HISTORICO,
  pintar,
  pontosDaLinha,
  preencher,
  refazer,
  registrar,
  valorDaFerramenta,
} from '@/lib/editorMapa';

describe('Editor de mapas (lógica)', () => {
  it('a linha entre dois pontos não tem buracos, em qualquer direção', () => {
    expect(pontosDaLinha({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
    expect(pontosDaLinha({ x: 2, y: 2 }, { x: 0, y: 0 })).toEqual([{ x: 2, y: 2 }, { x: 1, y: 1 }, { x: 0, y: 0 }]);
    const l = pontosDaLinha({ x: 0, y: 0 }, { x: 5, y: 2 });
    expect(l[0]).toEqual({ x: 0, y: 0 });
    expect(l[l.length - 1]).toEqual({ x: 5, y: 2 });
    for (let i = 1; i < l.length; i++) expect(Math.abs(l[i].x - l[i - 1].x) + Math.abs(l[i].y - l[i - 1].y)).toBeLessThanOrEqual(2);
  });

  it('pintar muda só o que é diferente e ignora pontos fora do mapa', () => {
    const m = mapaVazio(4, 4);
    const t = valorDoTile(0, 2);
    expect(pintar(m, 'chao', [{ x: 1, y: 1 }, { x: 9, y: 9 }, { x: -1, y: 0 }], t)).toEqual([[5, 0, t]]);
    expect(pintar(m, 'chao', [{ x: 1, y: 1 }], t)).toEqual([]);
    expect(m.camadas.chao[5]).toBe(t);
    expect(m.camadas.objetos[5]).toBe(0);
  });

  it('o balde preenche só a área contínua com o mesmo valor', () => {
    const m = mapaVazio(4, 4);
    // uma parede vertical na coluna 1
    pintar(m, 'colisao', [0, 1, 2, 3].map((y) => ({ x: 1, y })), 1);
    const mud = preencher(m, 'colisao', { x: 3, y: 0 }, 1);
    expect(mud).toHaveLength(8);
    expect(m.camadas.colisao.filter((v) => v === 1)).toHaveLength(12);
    expect(m.camadas.colisao[0]).toBe(0);
    expect(preencher(m, 'colisao', { x: 3, y: 0 }, 1)).toEqual([]);
    expect(preencher(m, 'colisao', { x: 7, y: 0 }, 1)).toEqual([]);
  });

  it('o balde aguenta o maior mapa sem estourar a pilha', () => {
    const m = mapaVazio(128, 128);
    expect(preencher(m, 'chao', { x: 64, y: 64 }, valorDoTile(0, 0))).toHaveLength(128 * 128);
  });

  it('juntar mudanças de um traço que passa duas vezes no mesmo lugar', () => {
    expect(juntarMudancas([[1, 0, 5], [2, 0, 5], [1, 5, 7], [3, 4, 9], [3, 9, 4]])).toEqual([[1, 0, 7], [2, 0, 5]]);
  });

  it('desfazer e refazer voltam e repetem o mapa; ação nova limpa o refazer', () => {
    const m = mapaVazio(4, 4);
    const t = valorDoTile(0, 1);
    let h = registrar(historicoVazio(), { camada: 'chao', mudancas: pintar(m, 'chao', [{ x: 0, y: 0 }], t) });
    h = registrar(h, { camada: 'colisao', mudancas: preencher(m, 'colisao', { x: 0, y: 0 }, 1) });
    h = desfazer(m, h);
    expect(m.camadas.colisao.every((v) => v === 0)).toBe(true);
    expect(m.camadas.chao[0]).toBe(t);
    h = desfazer(m, h);
    expect(m.camadas.chao[0]).toBe(0);
    expect(desfazer(m, h)).toBe(h);
    h = refazer(m, h);
    expect(m.camadas.chao[0]).toBe(t);
    expect(h.refazer).toHaveLength(1);
    h = registrar(h, { camada: 'objetos', mudancas: pintar(m, 'objetos', [{ x: 2, y: 2 }], t) });
    expect(h.refazer).toHaveLength(0);
    expect(registrar(h, { camada: 'chao', mudancas: [] })).toBe(h);
  });

  it('o histórico guarda no máximo 100 ações', () => {
    const m = mapaVazio(16, 16);
    let h = historicoVazio();
    for (let i = 0; i < 150; i++) h = registrar(h, { camada: 'colisao', mudancas: pintar(m, 'colisao', [{ x: i % 16, y: Math.floor(i / 16) }], 1) });
    expect(h.desfazer).toHaveLength(LIMITE_DO_HISTORICO);
  });

  it('célula sob o dedo, cópia independente e valor de cada ferramenta', () => {
    expect(celulaDoPonto(70, 10, 32)).toEqual({ x: 2, y: 0 });
    const m = mapaVazio(4, 4);
    const c = copiarMapa(m);
    c.camadas.chao[0] = 3;
    expect(m.camadas.chao[0]).toBe(0);
    expect(valorDaFerramenta('borracha', 'chao', 9)).toBe(0);
    expect(valorDaFerramenta('pincel', 'colisao', 0)).toBe(1);
    expect(valorDaFerramenta('pincel', 'chao', 9)).toBe(9);
    expect(valorDaFerramenta('pincel', 'chao', 0)).toBeNull();
    expect(valorDaFerramenta('mover', 'chao', 9)).toBeNull();
  });

  it('copiarMapa copia a camada acima do jogador (e aceita mapa sem ela)', () => {
    const m = mapaVazio(4, 4);
    m.camadas.acima[2] = 5;
    const c = copiarMapa(m);
    expect(c.camadas.acima[2]).toBe(5);
    expect(c.camadas.acima).not.toBe(m.camadas.acima);
    const antigo = { ...m, camadas: { chao: m.camadas.chao, objetos: m.camadas.objetos, colisao: m.camadas.colisao } } as unknown as typeof m;
    expect(copiarMapa(antigo).camadas.acima).toEqual(new Array(16).fill(0));
  });
});
