import { describe, it, expect } from 'vitest';
import { bytesGuardados, comprimirMapa, precisaComprimir } from '@/rules/mapaComprimido';
import { LADO_MAXIMO_DO_MAPA, MAIOR_TILE, mapaVazio, tileDoValor, validarMapa, valorDoTile } from '@/rules/mapa';
import { TAMANHO_MAXIMO_DO_MAPA_EM_BYTES, validarConteudo, chaveDoConteudo, ehTipoDeConteudo, ID_DE_CONTEUDO } from '@/rules/conteudo';

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

  it('o maior mapa (256 × 256) cabe no limite quando tem áreas repetidas; um mapa 100% aleatório não cabe', () => {
    const m = { ...mapaVazio(LADO_MAXIMO_DO_MAPA, LADO_MAXIMO_DO_MAPA), tilesets: Array.from({ length: 16 }, (_, i) => `tileset-${i}`) };
    m.camadas.chao.fill(65_535);
    m.camadas.objetos.fill(65_535);
    m.camadas.acima.fill(65_535);
    m.camadas.colisao.fill(1);
    expect(validarConteudo('mapa', m).ok).toBe(true);
    expect(bytesGuardados(m)).toBeLessThan(TAMANHO_MAXIMO_DO_MAPA_EM_BYTES);
    // mapa realista: chão em faixas de terreno, com alguns tiles soltos
    const real = { ...mapaVazio(256, 256), tilesets: ['floresta'] };
    for (let i = 0; i < real.camadas.chao.length; i++) real.camadas.chao[i] = 1 + (Math.floor(i / 256 / 8) % 5) + (i % 97 === 0 ? 3 : 0);
    expect(validarConteudo('mapa', real).ok).toBe(true);
    // 100% aleatório: cada célula diferente da vizinha, não comprime
    const caos = { ...mapaVazio(256, 256), tilesets: Array.from({ length: 16 }, (_, i) => `tileset-${i}`) };
    let semente = 7;
    for (const camada of ['chao', 'objetos', 'acima'] as const) {
      for (let i = 0; i < caos.camadas[camada].length; i++) {
        semente = (semente * 1103515245 + 12345) % 2147483648;
        const v = 1 + (semente % 65_534);
        caos.camadas[camada][i] = v % 4096 === 0 ? v + 1 : v;
      }
    }
    const r = validarConteudo('mapa', caos);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erros.join(' ')).toMatch(/grande demais/);
  });

  it('mapas até 128 de lado seguem como listas; só os grandes são comprimidos no banco', () => {
    const pequeno = mapaVazio(128, 128);
    expect(precisaComprimir(pequeno)).toBe(false);
    expect(comprimirMapa(pequeno)).toBe(pequeno);
    expect(precisaComprimir(mapaVazio(129, 10))).toBe(true);
    expect(precisaComprimir(mapaVazio(10, 129))).toBe(true);
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

  it('camada "acima do jogador": mapa antigo sem ela vira vazia; com ela, valida como as outras', () => {
    const { acima: _acima, ...antigas } = mapaVazio(5, 4).camadas;
    const antigo = validarMapa({ ...mapaVazio(5, 4), camadas: antigas });
    expect(antigo.ok && antigo.dados.camadas.acima).toEqual(new Array(20).fill(0));
    const m = { ...mapaVazio(5, 4), tilesets: ['floresta'] };
    m.camadas.acima[3] = valorDoTile(0, 7);
    const v = validarMapa(m);
    expect(v.ok && v.dados.camadas.acima[3]).toBe(valorDoTile(0, 7));
    m.camadas.acima.pop();
    expect(erros(m).join(' ')).toMatch(/Acima do jogador deve ter 20 posições/);
    const fora = { ...mapaVazio(5, 4), tilesets: [] as string[] };
    fora.camadas.acima[0] = valorDoTile(2, 0);
    expect(erros(fora).join(' ')).toMatch(/Acima do jogador usa um tile de um tileset que não está na lista/);
  });
});
