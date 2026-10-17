import { describe, it, expect } from 'vitest';
import { origensDeImagemDoArmazenamento } from '@/lib/origensDeImagem';

describe('Origens de imagem liberadas na CSP (R2)', () => {
  it('sempre libera *.r2.dev, mesmo sem a variável', () => {
    expect(origensDeImagemDoArmazenamento(undefined)).toEqual(['https://*.r2.dev']);
    expect(origensDeImagemDoArmazenamento('https://pub-abc.r2.dev')).toEqual(['https://*.r2.dev']);
  });

  it('inclui a origem de um domínio próprio, sem o caminho', () => {
    expect(origensDeImagemDoArmazenamento('https://arquivos.meujogo.com/imagens/')).toEqual(['https://*.r2.dev', 'https://arquivos.meujogo.com']);
  });

  it('ignora endereço inválido ou sem https', () => {
    expect(origensDeImagemDoArmazenamento('não é um endereço')).toEqual(['https://*.r2.dev']);
    expect(origensDeImagemDoArmazenamento('http://arquivos.meujogo.com')).toEqual(['https://*.r2.dev']);
  });
});
