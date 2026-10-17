import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ErroMestre } from '@/server/mestre';

/**
 * Armazenamento de arquivos (Cloudflare R2, API compatível com S3). As chaves de acesso vêm só do ambiente do
 * servidor (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET) e nunca vão para o navegador:
 * o navegador só conhece o endereço público (R2_PUBLIC_URL) de onde carrega as imagens.
 * Nos testes tudo fica na memória.
 */

const emTeste = () => process.env.NODE_ENV === 'test';
const ENDERECO_DE_TESTE = 'https://arquivos.exemplo.test';
const memoria = new Map<string, Uint8Array>();

export function limparArmazenamentoDeTeste(): void {
  memoria.clear();
}

function ambiente() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return { conta: R2_ACCOUNT_ID, chaveId: R2_ACCESS_KEY_ID, segredo: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET, publico: R2_PUBLIC_URL.replace(/\/+$/, '') };
}

export function armazenamentoPronto(): boolean {
  return emTeste() || ambiente() !== null;
}

function exigirAmbiente() {
  const a = ambiente();
  if (!a) throw new ErroMestre(503, 'O armazenamento de imagens não está configurado neste ambiente.');
  return a;
}

let cliente: { s3: S3Client; chave: string } | null = null;
function s3(a: NonNullable<ReturnType<typeof ambiente>>): S3Client {
  const identidade = `${a.conta}:${a.chaveId}:${a.segredo}`;
  if (!cliente || cliente.chave !== identidade) {
    cliente = {
      chave: identidade,
      s3: new S3Client({
        region: 'auto',
        endpoint: `https://${a.conta}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: a.chaveId, secretAccessKey: a.segredo },
      }),
    };
  }
  return cliente.s3;
}

/** O endereço público de um arquivo. */
export function urlPublicaDe(chave: string): string {
  const base = emTeste() ? (process.env.R2_PUBLIC_URL?.replace(/\/+$/, '') ?? ENDERECO_DE_TESTE) : exigirAmbiente().publico;
  return `${base}/${chave}`;
}

/** A chave de um endereço público do nosso armazenamento, ou null se o endereço é de outro lugar. */
export function chaveDaUrlPublica(url: string): string | null {
  const base = emTeste() ? (process.env.R2_PUBLIC_URL?.replace(/\/+$/, '') ?? ENDERECO_DE_TESTE) : ambiente()?.publico;
  if (!base || !url.startsWith(`${base}/`)) return null;
  return url.slice(base.length + 1);
}

/** Grava (ou regrava) um arquivo. Imagens ficam em cache pelo navegador para sempre: o nome muda se o conteúdo muda. */
export async function gravarArquivo(chave: string, bytes: Uint8Array, tipo: string): Promise<void> {
  if (emTeste()) {
    memoria.set(chave, new Uint8Array(bytes));
    return;
  }
  const a = exigirAmbiente();
  await s3(a).send(
    new PutObjectCommand({ Bucket: a.bucket, Key: chave, Body: bytes, ContentType: tipo, CacheControl: 'public, max-age=31536000, immutable' })
  );
}

/** Os primeiros `quantos` bytes do arquivo, ou null se ele não existe. */
export async function lerInicioDoArquivo(chave: string, quantos: number): Promise<Uint8Array | null> {
  if (emTeste()) return memoria.get(chave)?.slice(0, quantos) ?? null;
  const a = exigirAmbiente();
  try {
    const r = await s3(a).send(new GetObjectCommand({ Bucket: a.bucket, Key: chave, Range: `bytes=0-${quantos - 1}` }));
    return r.Body ? await r.Body.transformToByteArray() : null;
  } catch (error) {
    const nome = (error as { name?: string }).name;
    if (nome === 'NoSuchKey' || nome === 'NotFound') return null;
    throw error;
  }
}

export async function apagarArquivo(chave: string): Promise<void> {
  if (emTeste()) {
    memoria.delete(chave);
    return;
  }
  const a = exigirAmbiente();
  await s3(a).send(new DeleteObjectCommand({ Bucket: a.bucket, Key: chave }));
}
