import { describe, it, expect } from 'vitest';
import { bytesDoDataUrl, descreverVersao, situacaoDoConteudo, sugerirIdentificador } from '@/lib/conteudoTela';
import { descreverAcao } from '@/lib/mestreTela';

describe('Textos do conteúdo no painel', () => {
  it('situação: só rascunho, no jogo igual, no jogo com mudanças', () => {
    expect(situacaoDoConteudo({ versaoPublicada: null, hashPublicado: null, hashRascunho: 'a' }).situacao).toBe('rascunho');
    expect(situacaoDoConteudo({ versaoPublicada: 2, hashPublicado: 'a', hashRascunho: 'a' }).texto).toBe('No jogo: versão 2');
    expect(situacaoDoConteudo({ versaoPublicada: 2, hashPublicado: 'a', hashRascunho: 'b' }).situacao).toBe('mudancas');
  });

  it('linhas do histórico', () => {
    expect(descreverVersao({ versao: 1, origem: 'publicacao', revertidaDe: null }, 3)).toBe('Versão 1 · publicada');
    expect(descreverVersao({ versao: 3, origem: 'reversao', revertidaDe: 1 }, 3)).toBe('Versão 3 · voltou para a versão 1 · no jogo');
  });

  it('identificador sugerido a partir do nome', () => {
    expect(sugerirIdentificador('Vila de Althor')).toBe('vila-de-althor');
    expect(sugerirIdentificador('  Floresta Sombria — Ato I ')).toBe('floresta-sombria-ato-i');
    expect(sugerirIdentificador('!')).toBe('');
    expect(sugerirIdentificador('a'.repeat(60)).length).toBe(48);
  });

  it('o log descreve as ações de conteúdo', () => {
    expect(descreverAcao({ acao: 'conteudo.publicar', alvo: 'mapa__vila', depois: { versaoPublicada: 2 } })).toBe('Publicou mapa__vila: versão 2');
    expect(descreverAcao({ acao: 'conteudo.reverter.falhou', alvo: 'mapa__vila', depois: { versaoPublicada: 4, revertidaDe: 1 } })).toBe(
      'Falhou: Voltou mapa__vila para a versão 1 (nova versão 4)'
    );
    expect(descreverAcao({ acao: 'conteudo.criar', alvo: 'mapa__vila' })).toBe('Criou mapa__vila (rascunho)');
  });

  it('tamanho em bytes de um data URL', () => {
    for (const n of [0, 1, 2, 3, 10, 1000]) {
      const url = `data:image/png;base64,${Buffer.alloc(n, 7).toString('base64')}`;
      expect(bytesDoDataUrl(url)).toBe(n);
    }
  });
});
