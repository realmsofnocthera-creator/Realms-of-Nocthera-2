import { createHash } from 'node:crypto';
import { BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO, chaveDaImagemNoEndereco, dimensoesDoPng, LADO_MAXIMO_DA_IMAGEM } from '@/rules/tileset';
import { PERMISSAO_DE_EDICAO } from '@/rules/conteudo';
import { armazenamentoPronto, chaveDaUrlPublica, gravarArquivo, lerInicioDoArquivo, urlPublicaDe } from '@/server/armazenamento';
import { comRegistro, ErroMestre, exigir, type SessaoMestre } from '@/server/mestre';

/** Imagens de tileset no armazenamento de arquivos (R2): envio pelo painel e conferência ao salvar o tileset. */

export interface ImagemEnviada {
  url: string;
  chave: string;
  largura: number;
  altura: number;
  bytes: number;
}

/**
 * Recebe o PNG do painel (até 1 MB), confere assinatura e dimensões e grava no armazenamento. O nome do arquivo é
 * o SHA-256 do conteúdo: enviar a mesma imagem de novo não duplica nada.
 */
export async function enviarImagemDeTileset(sessao: SessaoMestre, bytes: Uint8Array, ip?: string): Promise<ImagemEnviada> {
  exigir(sessao, PERMISSAO_DE_EDICAO.tileset);
  if (!armazenamentoPronto()) throw new ErroMestre(503, 'O armazenamento de imagens não está configurado neste ambiente.');
  if (bytes.length === 0) throw new ErroMestre(400, 'Nenhuma imagem foi enviada.');
  if (bytes.length > BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO) {
    throw new ErroMestre(400, `A imagem passa de ${Math.round(BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO / 1024)} KB.`);
  }
  const dimensoes = dimensoesDoPng(bytes);
  if (!dimensoes) throw new ErroMestre(400, 'O arquivo não é um PNG válido.');
  if (dimensoes.largura < 1 || dimensoes.altura < 1 || dimensoes.largura > LADO_MAXIMO_DA_IMAGEM || dimensoes.altura > LADO_MAXIMO_DA_IMAGEM) {
    throw new ErroMestre(400, `A imagem vai de 1 a ${LADO_MAXIMO_DA_IMAGEM} pixels de lado.`);
  }
  const chave = `tilesets/${createHash('sha256').update(bytes).digest('hex')}.png`;
  await comRegistro(
    sessao,
    { acao: 'tileset.imagem', alvo: chave, depois: { bytes: bytes.length, largura: dimensoes.largura, altura: dimensoes.altura }, ip },
    () => gravarArquivo(chave, bytes, 'image/png')
  );
  return { url: urlPublicaDe(chave), chave, largura: dimensoes.largura, altura: dimensoes.altura, bytes: bytes.length };
}

/** Ao salvar um tileset com `imagemUrl`: o endereço é do nosso armazenamento, o arquivo existe e tem as dimensões informadas. */
export async function conferirImagemDoTileset(dados: { imagemUrl?: string; larguraImagem: number; alturaImagem: number }): Promise<void> {
  if (dados.imagemUrl === undefined) return;
  const chave = chaveDaUrlPublica(dados.imagemUrl);
  if (!chave || chave !== chaveDaImagemNoEndereco(dados.imagemUrl)) {
    throw new ErroMestre(400, 'A imagem não veio do armazenamento do jogo: envie a imagem pelo painel.');
  }
  const inicio = await lerInicioDoArquivo(chave, 24);
  if (!inicio) throw new ErroMestre(400, 'A imagem não foi encontrada no armazenamento: envie de novo.');
  const dimensoes = dimensoesDoPng(inicio);
  if (!dimensoes || dimensoes.largura !== dados.larguraImagem || dimensoes.altura !== dados.alturaImagem) {
    throw new ErroMestre(400, 'As dimensões informadas não batem com a imagem guardada.');
  }
}
