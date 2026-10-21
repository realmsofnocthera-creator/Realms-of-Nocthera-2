import { describe, it, expect } from 'vitest';
import { comprimirCamada, comprimirMapa, descomprimirCamada, descomprimirMapa, precisaComprimir } from '@/rules/mapaComprimido';
import { mapaVazio, validarMapa } from '@/rules/mapa';
import { validarConteudo } from '@/rules/conteudo';

describe('Mapa comprimido (RLE em base 36)', () => {
  it('camada: agrupa repetições e volta igual', () => {
    expect(comprimirCamada([0, 0, 0, 5, 5, 7, 0])).toBe('0.3,5.2,7,0');
    expect(descomprimirCamada('0.3,5.2,7,0', 7)).toEqual([0, 0, 0, 5, 5, 7, 0]);
    expect(comprimirCamada(new Array(65_536).fill(0))).toBe('0.1ekg');
    expect(comprimirCamada([])).toBe('');
    expect(descomprimirCamada('', 0)).toEqual([]);
    const valores = Array.from({ length: 500 }, (_, i) => (i * 7919) % 65_536);
    expect(descomprimirCamada(comprimirCamada(valores), 500)).toEqual(valores);
    expect(descomprimirCamada(comprimirCamada([65_535, 65_535]), 2)).toEqual([65_535, 65_535]);
  });

  it('texto corrompido ou com o tamanho errado é recusado (null)', () => {
    expect(descomprimirCamada('0.3,5.2', 6)).toBeNull(); // faltam posições
    expect(descomprimirCamada('0.3,5.2', 4)).toBeNull(); // passa
    expect(descomprimirCamada('0.0', 3)).toBeNull(); // zero vezes
    expect(descomprimirCamada('xyz!', 3)).toBeNull();
    expect(descomprimirCamada('0..3', 3)).toBeNull();
    expect(descomprimirCamada('', 3)).toBeNull();
  });

  it('mapa grande: comprime as camadas, descomprime igual e continua válido', () => {
    const m = { ...mapaVazio(200, 150), tilesets: ['floresta'] };
    for (let i = 0; i < m.camadas.chao.length; i++) m.camadas.chao[i] = i % 13 === 0 ? 2 : 1;
    m.camadas.colisao[1234] = 1;
    m.camadas.acima[5000] = 3;
    expect(precisaComprimir(m)).toBe(true);
    const c = comprimirMapa(m);
    expect(typeof c.camadas.chao).toBe('string');
    expect(typeof c.camadas.acima).toBe('string');
    expect(JSON.stringify(c).length).toBeLessThan(JSON.stringify(m).length / 3);
    const volta = descomprimirMapa(c);
    expect(volta).toEqual(m);
    expect(validarMapa(volta).ok).toBe(true);
    expect(validarConteudo('mapa', volta).ok).toBe(true);
  });

  it('o que não precisa ou não é mapa volta igual: pequeno, antigo em listas, outros dados, texto corrompido', () => {
    const pequeno = mapaVazio(20, 20);
    expect(comprimirMapa(pequeno)).toBe(pequeno);
    expect(descomprimirMapa(pequeno)).toBe(pequeno);
    const grande = mapaVazio(130, 130);
    expect(descomprimirMapa(grande)).toBe(grande); // grande, mas já em listas
    for (const outro of [null, undefined, 7, 'texto', [1, 2], { a: 1 }, { largura: 200, altura: 200, camadas: 'x' }]) {
      expect(comprimirMapa(outro)).toBe(outro);
      expect(descomprimirMapa(outro)).toBe(outro);
    }
    const quebrado = { ...mapaVazio(130, 130), camadas: { chao: '0.1', objetos: '0.1', acima: '0.1', colisao: '0.1' } };
    const volta = descomprimirMapa(quebrado as never) as typeof quebrado;
    expect(volta.camadas.chao).toBe('0.1'); // fica como está: o validador recusa depois
    expect(validarMapa(volta).ok).toBe(false);
  });

  it('um mapa com os dois lados acima de 128 até o limite é aceito; acima do limite, recusado', () => {
    expect(validarMapa({ ...mapaVazio(256, 256) }).ok).toBe(true);
    const demais = validarMapa({ ...mapaVazio(256, 256), largura: 257 });
    expect(demais.ok).toBe(false);
  });
});
