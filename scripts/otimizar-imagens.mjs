#!/usr/bin/env node
/**
 * 0.5-E1 — Converte as imagens grandes para WebP no tamanho de uso e atualiza as
 * referências no código. Pode ser rodado de novo quando entrarem imagens novas.
 *
 *   node scripts/otimizar-imagens.mjs
 *
 * Regras de tamanho (lado maior):
 * - ícones de habilidade, botões e ícones de interface: 256 px (aparecem com ~40 px)
 * - fundos, molduras, banners e cartas: mantêm a resolução original (máx. 1280 px)
 */
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PASTAS = ['public', 'src/assets/images'];
const TAMANHO_MINIMO_BYTES = 100 * 1024;
const QUALIDADE = 82;

const ICONES = [
  /^public\/icons\/skills\//,
  /^public\/images\/desenvolvimento\/(botao|icone)-/,
  /^public\/images\/ficha\/btn-/,
];

function listar(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p) : [p];
  });
}

function ladoMaximo(relativo) {
  return ICONES.some((re) => re.test(relativo)) ? 256 : 1280;
}

const convertidos = [];
for (const pasta of PASTAS) {
  for (const arquivo of listar(path.join(RAIZ, pasta))) {
    if (!/\.(png|jpe?g)$/i.test(arquivo)) continue;
    const antes = statSync(arquivo).size;
    if (antes < TAMANHO_MINIMO_BYTES) continue;

    const relativo = path.relative(RAIZ, arquivo).split(path.sep).join('/');
    const destino = arquivo.replace(/\.(png|jpe?g)$/i, '.webp');
    const lado = ladoMaximo(relativo);
    const buffer = await sharp(arquivo)
      .resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALIDADE, alphaQuality: 90, effort: 6 })
      .toBuffer();
    writeFileSync(destino, buffer);
    unlinkSync(arquivo);
    convertidos.push({ relativo, antes, depois: buffer.length });
  }
}

// Atualiza as referências: caminho público (/images/x.png) e import relativo (./images/x.png)
const fontes = listar(path.join(RAIZ, 'src')).filter((f) => /\.(ts|tsx|css)$/.test(f));
for (const fonte of fontes) {
  let texto = readFileSync(fonte, 'utf8');
  const original = texto;
  for (const { relativo } of convertidos) {
    const nome = path.posix.basename(relativo);
    const novoNome = nome.replace(/\.(png|jpe?g)$/i, '.webp');
    const pastaPai = path.posix.basename(path.posix.dirname(relativo));
    // Troca só ocorrências com a pasta-pai junto, para não confundir arquivos homônimos
    texto = texto.split(`${pastaPai}/${nome}`).join(`${pastaPai}/${novoNome}`);
  }
  if (texto !== original) writeFileSync(fonte, texto);
}

const total = (campo) => convertidos.reduce((s, c) => s + c[campo], 0);
for (const c of convertidos) {
  console.log(`${(c.antes / 1024).toFixed(0).padStart(6)} KB → ${(c.depois / 1024).toFixed(0).padStart(5)} KB  ${c.relativo}`);
}
console.log(
  `${convertidos.length} imagem(ns): ${(total('antes') / 1048576).toFixed(1)} MB → ${(total('depois') / 1048576).toFixed(1)} MB`
);
