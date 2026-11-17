import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AberturaDeBatalha, TEMPOS_DA_ABERTURA, tirarOVerde, VIDEO_DA_ABERTURA } from '../AberturaDeBatalha';

const pixel = (r: number, g: number, b: number) => new Uint8ClampedArray([r, g, b, 255]);

describe('AberturaDeBatalha', () => {
  it('apaga o fundo verde e deixa o resto', () => {
    const verde = pixel(0, 255, 0);
    tirarOVerde(verde);
    expect(verde[3]).toBe(0);
    const dourado = pixel(240, 170, 60);
    tirarOVerde(dourado);
    expect(Array.from(dourado)).toEqual([240, 170, 60, 255]);
    const roxo = pixel(40, 20, 60);
    tirarOVerde(roxo);
    expect(Array.from(roxo)).toEqual([40, 20, 60, 255]);
  });
  it('a borda meio verde fica meio transparente e perde o verde que sobrou', () => {
    const borda = pixel(100, 150, 100);
    tirarOVerde(borda);
    expect(borda[3]).toBeGreaterThan(0);
    expect(borda[3]).toBeLessThan(255);
    expect(borda[1]).toBe(100);
  });
  it('devolve a luz média (para achar os clarões)', () => {
    expect(tirarOVerde(pixel(255, 255, 255))).toBe(255);
    expect(tirarOVerde(pixel(0, 0, 0))).toBe(0);
  });
  it('a abertura aparece com o anúncio para leitores de tela e o vídeo existe e é leve', () => {
    const h = renderToStaticMarkup(<AberturaDeBatalha aoTerminar={() => {}} />);
    expect(h).toContain('Batalha! O confronto começa.');
    expect(h).toContain(VIDEO_DA_ABERTURA.src);
    const arquivo = join(process.cwd(), 'public', VIDEO_DA_ABERTURA.src);
    expect(existsSync(arquivo)).toBe(true);
    expect(statSync(arquivo).size).toBeLessThanOrEqual(500 * 1024);
  });
  it('a abertura acaba antes do tremor final do vídeo', () => {
    expect(TEMPOS_DA_ABERTURA.fimDaFaixa).toBeLessThan(4.25);
    expect(VIDEO_DA_ABERTURA.altura / VIDEO_DA_ABERTURA.largura).toBeCloseTo(1.5, 5);
  });
});
