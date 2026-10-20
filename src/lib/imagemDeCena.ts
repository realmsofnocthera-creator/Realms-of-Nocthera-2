import { BYTES_MAXIMOS_DA_IMAGEM_DE_CENA } from '@/rules/cena';

/** Preparo e envio das imagens de cena no navegador: reduz e converte para caber em 1 MB antes de mandar ao armazenamento. */
export type PapelDaImagem = 'fundo' | 'retrato';

const LADO_MAXIMO: Record<PapelDaImagem, number> = { fundo: 1280, retrato: 512 };

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler essa imagem.'));
    };
    img.src = url;
  });
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

/**
 * Fundo: JPEG (até 1280 px de lado). Retrato: WebP com transparência (até 512 px), ou PNG se o navegador não gerar WebP.
 * A qualidade baixa em passos até caber no limite; se não couber, reduz o tamanho.
 */
export async function prepararImagemDeCena(arquivo: File, papel: PapelDaImagem): Promise<Blob> {
  const img = await carregar(arquivo);
  let lado = LADO_MAXIMO[papel];
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * escala));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador não consegue preparar a imagem.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const q of [0.9, 0.8, 0.7, 0.55]) {
      const blob = papel === 'fundo' ? await paraBlob(canvas, 'image/jpeg', q) : await paraBlob(canvas, 'image/webp', q);
      if (blob && blob.size <= BYTES_MAXIMOS_DA_IMAGEM_DE_CENA) return blob;
    }
    lado = Math.round(lado * 0.75);
  }
  throw new Error('Não consegui reduzir essa imagem para menos de 1 MB.');
}
