import { describe, it, expect } from 'vitest';
import { areaDoCarimbo, carimbar, copiarArea, espelharCarimbo, expandirPincel, girarCarimbo, origemDoCarimbo, pontosDoRetangulo, retanguloEntre, type Carimbo } from '@/lib/carimbo';
import { desfazer, historicoVazio, refazer, registrar } from '@/lib/editorMapa';
import { mapaVazio } from '@/rules/mapa';

const mapa6 = () => mapaVazio(6, 6);
const pt = (x: number, y: number) => ({ x, y });

describe('Pincel maior e formas', () => {
  it('retângulo entre dois cantos, em qualquer ordem, e seus pontos', () => {
    expect(retanguloEntre(pt(3, 1), pt(1, 2))).toEqual({ x: 1, y: 1, largura: 3, altura: 2 });
    expect(retanguloEntre(pt(2, 2), pt(2, 2))).toEqual({ x: 2, y: 2, largura: 1, altura: 1 });
    expect(pontosDoRetangulo({ x: 1, y: 1, largura: 2, altura: 2 })).toEqual([pt(1, 1), pt(2, 1), pt(1, 2), pt(2, 2)]);
  });

  it('pincel de 1 não muda; 3 é um quadrado centrado; 2 e 5 também; sem células repetidas', () => {
    expect(expandirPincel([pt(4, 4)], 1)).toEqual([pt(4, 4)]);
    const tres = expandirPincel([pt(4, 4)], 3);
    expect(tres).toHaveLength(9);
    expect(tres).toEqual(expect.arrayContaining([pt(3, 3), pt(5, 5), pt(4, 4)]));
    const dois = expandirPincel([pt(4, 4)], 2);
    expect(dois).toHaveLength(4);
    expect(dois).toEqual(expect.arrayContaining([pt(4, 4), pt(5, 5)])); // a sobra vai para a direita e para baixo
    expect(expandirPincel([pt(4, 4)], 5)).toHaveLength(25);
    // dois pontos vizinhos com pincel 3: 3 × 4 = 12 células, sem repetir
    expect(expandirPincel([pt(4, 4), pt(5, 4)], 3)).toHaveLength(12);
  });
});

describe('Carimbo', () => {
  const comArvore = () => {
    const m = mapa6();
    m.camadas.chao[1 * 6 + 1] = 5;
    m.camadas.objetos[1 * 6 + 2] = 7; // tronco
    m.camadas.acima[0 * 6 + 1] = 9; // copa
    m.camadas.colisao[1 * 6 + 2] = 1;
    return m;
  };

  it('copia as quatro camadas da área e corta pelas bordas do mapa', () => {
    const m = comArvore();
    const c = copiarArea(m, { x: 1, y: 0, largura: 2, altura: 2 })!;
    expect(c).toMatchObject({ largura: 2, altura: 2 });
    expect(c.camadas.chao).toEqual([0, 0, 5, 0]);
    expect(c.camadas.objetos).toEqual([0, 0, 0, 7]);
    expect(c.camadas.acima).toEqual([9, 0, 0, 0]);
    expect(c.camadas.colisao).toEqual([0, 0, 0, 1]);
    const cortado = copiarArea(m, { x: 5, y: 5, largura: 4, altura: 4 })!;
    expect(cortado).toMatchObject({ largura: 1, altura: 1 });
    expect(copiarArea(m, { x: 9, y: 9, largura: 2, altura: 2 })).toBeNull();
    expect(copiarArea(m, { x: -3, y: -3, largura: 2, altura: 2 })).toBeNull();
  });

  it('carimbar cola nas quatro camadas, sem apagar com vazio, e ignora o que cai fora do mapa', () => {
    const m = comArvore();
    const c = copiarArea(m, { x: 1, y: 0, largura: 2, altura: 2 })!;
    const destino = mapa6();
    destino.camadas.chao[3 * 6 + 3] = 4; // já tinha chão onde o carimbo tem vazio no chão
    destino.camadas.chao[3 * 6 + 4] = 4;
    const lotes = carimbar(destino, c, pt(3, 3));
    expect(lotes.map((l) => l.camada).sort()).toEqual(['acima', 'chao', 'colisao', 'objetos']);
    expect(destino.camadas.chao[3 * 6 + 3]).toBe(4); // vazio do carimbo não apagou
    expect(destino.camadas.chao[4 * 6 + 3]).toBe(5);
    expect(destino.camadas.objetos[4 * 6 + 4]).toBe(7);
    expect(destino.camadas.acima[3 * 6 + 3]).toBe(9);
    expect(destino.camadas.colisao[4 * 6 + 4]).toBe(1);

    const bordas = mapa6();
    const parcial = carimbar(bordas, c, pt(5, 5)); // só a célula (0,0) do carimbo cabe
    expect(parcial.map((l) => l.camada)).toEqual(['acima']);
    expect(carimbar(mapa6(), c, pt(40, 40))).toEqual([]);
  });

  it('um carimbo vira um só passo do desfazer e do refazer', () => {
    const origem = comArvore();
    const c = copiarArea(origem, { x: 1, y: 0, largura: 2, altura: 2 })!;
    const m = mapa6();
    const lotes = carimbar(m, c, pt(2, 2));
    let h = registrar(historicoVazio(), { varios: lotes });
    expect(h.desfazer).toHaveLength(1);
    const depois = JSON.stringify(m.camadas);
    h = desfazer(m, h);
    expect(m.camadas).toEqual(mapa6().camadas);
    h = refazer(m, h);
    expect(JSON.stringify(m.camadas)).toBe(depois);
    expect(registrar(historicoVazio(), { varios: [] }).desfazer).toHaveLength(0); // nada mudou: não vira passo
  });

  it('espelhar e girar', () => {
    const c: Carimbo = { largura: 3, altura: 2, camadas: { chao: [1, 2, 3, 4, 5, 6], objetos: [0, 0, 0, 0, 0, 0], acima: [0, 0, 0, 0, 0, 0], colisao: [0, 0, 0, 0, 0, 0] } };
    expect(espelharCarimbo(c).camadas.chao).toEqual([3, 2, 1, 6, 5, 4]);
    const g = girarCarimbo(c); // 3×2 → 2×3, sentido horário
    expect(g).toMatchObject({ largura: 2, altura: 3 });
    expect(g.camadas.chao).toEqual([4, 1, 5, 2, 6, 3]);
    // quatro giros voltam ao início
    expect(girarCarimbo(girarCarimbo(girarCarimbo(girarCarimbo(c))))).toEqual(c);
    expect(espelharCarimbo(espelharCarimbo(c))).toEqual(c);
  });

  it('o toque fica no meio do carimbo', () => {
    expect(origemDoCarimbo({ largura: 3, altura: 3 }, pt(5, 5))).toEqual(pt(4, 4));
    expect(origemDoCarimbo({ largura: 2, altura: 4 }, pt(5, 5))).toEqual(pt(4, 3));
    expect(areaDoCarimbo({ largura: 2, altura: 4 }, pt(4, 3))).toEqual({ x: 4, y: 3, largura: 2, altura: 4 });
  });
});
