// Otimiza imagens em public/ e src/assets/ SEM mudar nome nem formato (0.5-E1).
// - Ícones de habilidade: redimensiona para no máximo 256 px (usados a 40-96 px).
// - Demais PNG/JPG acima de 300 KB: recompressão (PNG sem perda; JPG qualidade 82).
// Idempotente: ignora arquivos que já estão pequenos. Uso: node scripts/otimizar-imagens.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const LIMITE_BYTES = 300 * 1024;
const raizes = ['public', 'src/assets'];

function listar(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listar(join(dir, e.name)) : [join(dir, e.name)]
  );
}

let antes = 0;
let depois = 0;
for (const arquivo of raizes.flatMap(listar)) {
  const ext = extname(arquivo).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
  const tamanho = statSync(arquivo).size;
  if (tamanho <= LIMITE_BYTES) continue;

  const entrada = readFileSync(arquivo);
  let img = sharp(entrada);
  const ehIconeHabilidade = arquivo.replaceAll('\\', '/').includes('icons/skills/');
  if (ehIconeHabilidade) img = img.resize(256, 256, { fit: 'inside', withoutEnlargement: true });

  const saida =
    ext === '.png'
      ? await img.png({ compressionLevel: 9, effort: 10, palette: ehIconeHabilidade, quality: 90 }).toBuffer()
      : await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

  antes += tamanho;
  if (saida.length < tamanho) {
    writeFileSync(arquivo, saida);
    depois += saida.length;
  } else {
    depois += tamanho;
  }
}
console.log(`Antes: ${(antes / 1e6).toFixed(1)} MB  Depois: ${(depois / 1e6).toFixed(1)} MB`);
