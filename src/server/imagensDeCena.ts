import { createHash } from 'node:crypto';
import { BYTES_MAXIMOS_DA_IMAGEM_DE_CENA, chaveDaImagemDeCenaNoEndereco, imagensDaCena, type CenaDados } from '@/rules/cena';
import { PERMISSAO_DE_EDICAO } from '@/rules/conteudo';
import { armazenamentoPronto, chaveDaUrlPublica, gravarArquivo, lerInicioDoArquivo, urlPublicaDe } from '@/server/armazenamento';
import { comRegistro, ErroMestre, type SessaoMestre, exigir } from '@/server/mestre';

/** Imagens de cena (fundos e retratos) no armazenamento de arquivos (R2): envio pelo painel e conferência ao salvar a cena. */

export type FormatoDeImagem = 'png' | 'jpg' | 'webp';
const TIPO_HTTP: Record<FormatoDeImagem, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

/** Pela assinatura (primeiros bytes), não pelo que o navegador diz. */
export function formatoDaImagem(b: Uint8Array): FormatoDeImagem | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 12 && String.fromCharCode(b[0], b[1], b[2], b[3]) === 'RIFF' && String.fromCharCode(b[8], b[9], b[10], b[11]) === 'WEBP') return 'webp';
  return null;
}

export interface ImagemDeCenaEnviada {
  url: string;
  chave: string;
  bytes: number;
  formato: FormatoDeImagem;
}

/** Recebe a imagem do painel (PNG, JPEG ou WebP, até 1 MB). O nome é o SHA-256 do conteúdo: reenviar a mesma imagem não duplica nada. */
export async function enviarImagemDeCena(sessao: SessaoMestre, bytes: Uint8Array, ip?: string): Promise<ImagemDeCenaEnviada> {
  exigir(sessao, PERMISSAO_DE_EDICAO.cena);
  if (!armazenamentoPronto()) throw new ErroMestre(503, 'O armazenamento de imagens não está configurado neste ambiente.');
  if (bytes.length === 0) throw new ErroMestre(400, 'Nenhuma imagem foi enviada.');
  if (bytes.length > BYTES_MAXIMOS_DA_IMAGEM_DE_CENA) {
    throw new ErroMestre(400, `A imagem passa de ${Math.round(BYTES_MAXIMOS_DA_IMAGEM_DE_CENA / 1024)} KB.`);
  }
  const formato = formatoDaImagem(bytes);
  if (!formato) throw new ErroMestre(400, 'O arquivo não é uma imagem PNG, JPEG ou WebP válida.');
  const chave = `cenas/${createHash('sha256').update(bytes).digest('hex')}.${formato}`;
  await comRegistro(
    sessao,
    { acao: 'cena.imagem', alvo: chave, depois: { bytes: bytes.length, formato }, ip },
    () => gravarArquivo(chave, bytes, TIPO_HTTP[formato])
  );
  return { url: urlPublicaDe(chave), chave, bytes: bytes.length, formato };
}

/** Ao salvar uma cena: cada imagem é do nosso armazenamento e existe lá. */
export async function conferirImagensDaCena(dados: Pick<CenaDados, 'personagens' | 'telas'>): Promise<void> {
  for (const url of imagensDaCena(dados)) {
    const chave = chaveDaUrlPublica(url);
    if (!chave || chave !== chaveDaImagemDeCenaNoEndereco(url)) {
      throw new ErroMestre(400, 'Uma imagem da cena não veio do armazenamento do jogo: envie a imagem pelo painel.');
    }
    const inicio = await lerInicioDoArquivo(chave, 16);
    if (!inicio) throw new ErroMestre(400, 'Uma imagem da cena não foi encontrada no armazenamento: envie de novo.');
    const formato = formatoDaImagem(inicio);
    if (!formato || !chave.endsWith(`.${formato}`)) throw new ErroMestre(400, 'Uma imagem da cena guardada não confere com o formato esperado.');
  }
}

