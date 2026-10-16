import { describe, it, expect } from 'vitest';
import { LADO_MAXIMO_DO_MAPA, MAIOR_TILE, mapaVazio, tileDoValor, validarMapa, valorDoTile } from '@/rules/mapa';
import { TAMANHO_MAXIMO_EM_BYTES, validarConteudo, chaveDoConteudo, ehTipoDeConteudo, ID_DE_CONTEUDO } from '@/rules/conteudo';

const erros = (bruto: unknown) => {
  const r = validarMapa(bruto);
  return r.ok ? [] : r.erros;
};

describe('Formato do mapa (v1)', () => {
  it('um mapa vazio é válido e volta igual', () => {
    const m = mapaVazio(10, 6);
    expect(m.camadas.chao).toHaveLength(60);
    const r = validarMapa(m);
    expect(r.ok && r.dados).toEqual(m);
  });

  it('devolve uma cópia limpa (mexer no original não muda a validada)', () => {
    const m = mapaVazio(4, 4);
    const r = validarMapa(m);
    m.camadas.chao[0] = 9;
    expect(r.ok && r.dados.camadas.chao[0]).toBe(0);
  });

  it('recusa tamanhos fora do limite e camadas com o número errado de posições', () => {
    expect(erros(mapaVazio(3, 10)).join(' ')).toMatch(/largura/);
    expect(erros({ ...mapaVazio(4, 4), altura: LADO_MAXIMO_DO_MAPA + 1 }).join(' ')).toMatch(/altura/);
    const m = mapaVazio(4, 4);
    m.camadas.objetos.pop();
    expect(erros(m).join(' ')).toMatch(/Objetos deve ter 16 posições \(tem 15\)/);
  });

  it('recusa tiles inválidos e colisão diferente de 0 e 1', () => {
    const a = mapaVazio(4, 4);
    a.camadas.chao[2] = -1;
    expect(erros(a).join(' ')).toMatch(/Chão só aceita/);
    const b = { ...mapaVazio(4, 4), tilesets: ['floresta'] };
    b.camadas.chao[2] = 1.5;
    expect(erros(b)).not.toHaveLength(0);
    const c = mapaVazio(4, 4);
    c.camadas.colisao[0] = 2;
    expect(erros(c).join(' ')).toMatch(/Colisão só aceita 0/);
  });

  it('recusa campos e camadas desconhecidos, formato diferente e tamanho de tile fora da lista', () => {
    expect(erros({ ...mapaVazio(4, 4), extra: 1 }).join(' ')).toMatch(/Campos desconhecidos no mapa: extra/);
    const m = mapaVazio(4, 4) as unknown as { camadas: Record<string, number[]> };
    m.camadas.ceu = [];
    expect(erros(m).join(' ')).toMatch(/Camadas desconhecidas: ceu/);
    expect(erros({ ...mapaVazio(4, 4), formato: 2 }).join(' ')).toMatch(/Formato/);
    expect(erros({ ...mapaVazio(4, 4), tamanhoDoTile: 20 }).join(' ')).toMatch(/tamanho do tile/);
    expect(erros(null)).toEqual(['O mapa precisa ser um objeto.']);
  });

  it('tilesets: até 16 identificadores válidos e sem repetir', () => {
    expect(erros({ ...mapaVazio(4, 4), tilesets: ['floresta', 'vila-1'] })).toEqual([]);
    expect(erros({ ...mapaVazio(4, 4), tilesets: ['Floresta'] }).join(' ')).toMatch(/tileset inválido/);
    expect(erros({ ...mapaVazio(4, 4), tilesets: ['aa', 'aa'] }).join(' ')).toMatch(/repetido/);
  });

  it('o maior mapa cabe no limite de tamanho do conteúdo', () => {
    const m = { ...mapaVazio(LADO_MAXIMO_DO_MAPA, LADO_MAXIMO_DO_MAPA), tilesets: Array.from({ length: 16 }, (_, i) => `tileset-${i}`) };
    m.camadas.chao.fill(65_535);
    m.camadas.objetos.fill(65_535);
    m.camadas.colisao.fill(1);
    const r = validarConteudo('mapa', m);
    expect(r.ok).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(m)).length).toBeLessThan(TAMANHO_MAXIMO_EM_BYTES);
  });
});

describe('Conteúdo (tipos e chaves)', () => {
  it('tipos, chave e identificadores', () => {
    expect(ehTipoDeConteudo('mapa')).toBe(true);
    expect(ehTipoDeConteudo('monstro')).toBe(true);
    expect(ehTipoDeConteudo('quest')).toBe(false);
    expect(chaveDoConteudo('mapa', 'vila-inicial')).toBe('mapa__vila-inicial');
    expect(ID_DE_CONTEUDO.test('vila-inicial')).toBe(true);
    for (const ruim of ['a', 'Vila', 'vila_inicial', '-vila', 'x'.repeat(49), 'a/b']) expect(ID_DE_CONTEUDO.test(ruim)).toBe(false);
  });
});

describe('Número do tile no mapa', () => {
  it('valorDoTile e tileDoValor são inversos; 0 e múltiplos de 4096 não apontam para tile', () => {
    expect(valorDoTile(0, 0)).toBe(1);
    expect(valorDoTile(2, 10)).toBe(2 * 4096 + 11);
    expect(valorDoTile(15, 4094)).toBe(MAIOR_TILE);
    for (const [ts, t] of [[0, 0], [3, 77], [15, 4094]]) expect(tileDoValor(valorDoTile(ts, t))).toEqual({ tileset: ts, tile: t });
    expect(tileDoValor(0)).toBeNull();
    expect(tileDoValor(4096)).toBeNull();
  });

  it('o mapa recusa tile de um tileset que não está na lista', () => {
    const m = { ...mapaVazio(4, 4), tilesets: ['floresta'] };
    m.camadas.chao[0] = valorDoTile(0, 5);
    expect(validarMapa(m).ok).toBe(true);
    m.camadas.objetos[1] = valorDoTile(1, 0);
    expect(erros(m).join(' ')).toMatch(/Objetos usa um tile de um tileset que não está na lista/);
    const n = { ...mapaVazio(4, 4), tilesets: ['floresta'] };
    n.camadas.chao[0] = 4096;
    expect(validarMapa(n).ok).toBe(false);
  });
});
