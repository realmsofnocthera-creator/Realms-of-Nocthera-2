import { createHash } from 'node:crypto';
import { BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA, chaveDaImagemDoMapaNoEndereco, LADO_MAXIMO_DA_IMAGEM_DO_MAPA, PIXELS_MAXIMOS_DA_IMAGEM_DO_MAPA, type FundoDoMapa } from '@/rules/mapa';
import { dimensoesDoPng } from '@/rules/tileset';
import { PERMISSAO_DE_EDICAO } from '@/rules/conteudo';
import { armazenamentoPronto, chaveDaUrlPublica, gravarArquivo, lerInicioDoArquivo, urlPublicaDe } from '@/server/armazenamento';
import { comRegistro, ErroMestre, exigir, type SessaoMestre } from '@/server/mestre';

/** Imagens de fundo dos mapas de imagem no armazenamento de arquivos (R2): envio pelo painel e conferência ao salvar o mapa. */

export interface ImagemDoMapaEnviada {
  url: string;
  chave: string;
  largura: number;
  altura: number;
  bytes: number;
}

/**
 * Recebe o PNG do painel (até 24 MB e 8192 px de lado), confere assinatura e dimensões e grava no armazenamento. O nome do arquivo é o SHA-256 do
 * conteúdo: enviar a mesma imagem de novo não duplica nada.
 */
export async function enviarImagemDoMapa(sessao: SessaoMestre, bytes: Uint8Array, ip?: string): Promise<ImagemDoMapaEnviada> {
  exigir(sessao, PERMISSAO_DE_EDICAO.mapa);
  if (!armazenamentoPronto()) throw new ErroMestre(503, 'O armazenamento de imagens não está configurado neste ambiente.');
  if (bytes.length === 0) throw new ErroMestre(400, 'Nenhuma imagem foi enviada.');
  if (bytes.length > BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA) {
    throw new ErroMestre(400, `A imagem passa de ${Math.round(BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA / 1024 / 1024)} MB.`);
  }
  const dimensoes = dimensoesDoPng(bytes);
  if (!dimensoes) throw new ErroMestre(400, 'O arquivo não é um PNG válido.');
  const { largura, altura } = dimensoes;
  if (largura < 1 || altura < 1 || largura > LADO_MAXIMO_DA_IMAGEM_DO_MAPA || altura > LADO_MAXIMO_DA_IMAGEM_DO_MAPA) {
    throw new ErroMestre(400, `A imagem vai de 1 a ${LADO_MAXIMO_DA_IMAGEM_DO_MAPA} pixels de lado.`);
  }
  if (largura * altura > PIXELS_MAXIMOS_DA_IMAGEM_DO_MAPA) {
    throw new ErroMestre(400, `A imagem passa de ${PIXELS_MAXIMOS_DA_IMAGEM_DO_MAPA / 1_000_000} milhões de pixels.`);
  }
  const chave = `mapas/${createHash('sha256').update(bytes).digest('hex')}.png`;
  await comRegistro(
    sessao,
    { acao: 'mapa.imagem', alvo: chave, depois: { bytes: bytes.length, largura, altura }, ip },
    () => gravarArquivo(chave, bytes, 'image/png')
  );
  return { url: urlPublicaDe(chave), chave, largura, altura, bytes: bytes.length };
}

/** Ao salvar um mapa com `fundo`: a imagem é do nosso armazenamento, existe lá e tem as dimensões informadas. */
export async function conferirImagemDoMapa(dados: { fundo?: FundoDoMapa }): Promise<void> {
  const fundo = dados.fundo;
  if (!fundo) return;
  const chave = chaveDaUrlPublica(fundo.url);
  if (!chave || chave !== chaveDaImagemDoMapaNoEndereco(fundo.url)) {
    throw new ErroMestre(400, 'A imagem do mapa não veio do armazenamento do jogo: envie a imagem pelo painel.');
  }
  const inicio = await lerInicioDoArquivo(chave, 24);
  if (!inicio) throw new ErroMestre(400, 'A imagem do mapa não foi encontrada no armazenamento: envie de novo.');
  const dimensoes = dimensoesDoPng(inicio);
  if (!dimensoes || dimensoes.largura !== fundo.largura || dimensoes.altura !== fundo.altura) {
    throw new ErroMestre(400, 'As dimensões informadas não batem com a imagem do mapa guardada.');
  }
}
