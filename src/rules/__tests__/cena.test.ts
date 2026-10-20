import { describe, it, expect } from 'vitest';
import { cenaEmBranco, falanteDaTela, fundoDaTela, imagensDaCena, validarCena, chaveDaImagemDeCenaNoEndereco, type CenaDados } from '@/rules/cena';
import { validarConteudo } from '@/rules/conteudo';

const img = (c: string, ext = 'png') => `https://pub.exemplo.test/cenas/${c.repeat(64)}.${ext}`;
const cena = (): CenaDados => ({
  formato: 1,
  titulo: 'Abertura',
  personagens: [{ id: 'comandante', nome: 'Comandante', retrato: img('a', 'webp') }, { id: 'mestre', nome: 'Mestre de pesquisa' }],
  telas: [
    { tipo: 'narracao', texto: 'O mundo está em guerra.', fundo: img('b', 'jpg') },
    { tipo: 'fala', personagem: 'comandante', texto: 'Bem-vindo.' },
    { tipo: 'fala', personagem: 'jogador', texto: 'Obrigado.', fundo: null },
  ],
});

describe('Cena (schema)', () => {
  it('aceita uma cena completa e o rascunho em branco', () => {
    expect(validarCena(cena())).toEqual({ ok: true, dados: cena() });
    expect(validarCena(cenaEmBranco('Teste')).ok).toBe(true);
    expect(validarConteudo('cena', cena()).ok).toBe(true);
  });

  it('recusa formato, título, campos extras e listas fora do limite', () => {
    expect(validarCena(null).ok).toBe(false);
    expect(validarCena({ ...cena(), formato: 2 }).ok).toBe(false);
    expect(validarCena({ ...cena(), titulo: 'a' }).ok).toBe(false);
    expect(validarCena({ ...cena(), extra: 1 }).ok).toBe(false);
    expect(validarCena({ ...cena(), telas: [] }).ok).toBe(false);
    expect(validarCena({ ...cena(), telas: Array.from({ length: 61 }, () => ({ tipo: 'narracao', texto: 'x' })) }).ok).toBe(false);
    expect(validarCena({ ...cena(), personagens: Array.from({ length: 13 }, (_, i) => ({ id: `p${i}`, nome: 'x' })) }).ok).toBe(false);
  });

  it('personagens: id válido, único, "jogador" reservado, nome obrigatório, retrato só do armazenamento', () => {
    const com = (p: unknown[]) => validarCena({ ...cena(), personagens: p, telas: [{ tipo: 'narracao', texto: 'x' }] });
    expect(com([{ id: 'jogador', nome: 'X' }]).ok).toBe(false);
    expect(com([{ id: 'A B', nome: 'X' }]).ok).toBe(false);
    expect(com([{ id: 'a', nome: 'X' }, { id: 'a', nome: 'Y' }]).ok).toBe(false);
    expect(com([{ id: 'a', nome: '  ' }]).ok).toBe(false);
    expect(com([{ id: 'a', nome: 'X', retrato: 'https://x.com/a.png' }]).ok).toBe(false);
    expect(com([{ id: 'a', nome: 'X', retrato: 'javascript:alert(1)' }]).ok).toBe(false);
    expect(com([{ id: 'a', nome: 'X', extra: 1 }]).ok).toBe(false);
  });

  it('telas: texto de 1 a 600, tipo válido, falante existente, narração sem falante, fundo só do armazenamento', () => {
    const com = (t: unknown) => validarCena({ ...cena(), telas: [t] });
    expect(com({ tipo: 'narracao', texto: '' }).ok).toBe(false);
    expect(com({ tipo: 'narracao', texto: 'x'.repeat(601) }).ok).toBe(false);
    expect(com({ tipo: 'grito', texto: 'x' }).ok).toBe(false);
    expect(com({ tipo: 'fala', personagem: 'fantasma', texto: 'x' }).ok).toBe(false);
    expect(com({ tipo: 'narracao', personagem: 'comandante', texto: 'x' }).ok).toBe(false);
    expect(com({ tipo: 'narracao', texto: 'x', fundo: 'https://x.com/a.png' }).ok).toBe(false);
    expect(com({ tipo: 'fala', personagem: 'jogador', texto: 'x' }).ok).toBe(true);
  });

  it('reconhece a chave da imagem no endereço', () => {
    expect(chaveDaImagemDeCenaNoEndereco(img('c', 'jpg'))).toBe(`cenas/${'c'.repeat(64)}.jpg`);
    expect(chaveDaImagemDeCenaNoEndereco(`https://x.com/tilesets/${'c'.repeat(64)}.png`)).toBeNull();
    expect(chaveDaImagemDeCenaNoEndereco(`http://x.com/cenas/${'c'.repeat(64)}.png`)).toBeNull();
  });

  it('imagensDaCena junta retratos e fundos sem repetir; falanteDaTela e fundoDaTela', () => {
    const c = cena();
    expect(imagensDaCena(c).sort()).toEqual([img('a', 'webp'), img('b', 'jpg')].sort());
    expect(falanteDaTela(c, c.telas[0], { nome: 'Eu' })).toBeNull();
    expect(falanteDaTela(c, c.telas[1], { nome: 'Eu' })).toEqual({ nome: 'Comandante', retrato: img('a', 'webp') });
    expect(falanteDaTela(c, c.telas[2], { nome: 'Eu', retrato: 'r' })).toEqual({ nome: 'Eu', retrato: 'r' });
    expect(fundoDaTela(c, 0)).toBe(img('b', 'jpg'));
    expect(fundoDaTela(c, 1)).toBe(img('b', 'jpg'));
    expect(fundoDaTela(c, 2)).toBeNull();
  });
});
