'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import {
  BYTES_MAXIMOS_DO_PNG,
  FORMATO_DO_TILESET,
  gradeDoTileset,
  LADO_MAXIMO_DA_IMAGEM,
  MARGEM_MAXIMA,
  TILE_MAXIMO_DO_TILESET,
  TILE_MINIMO_DO_TILESET,
  TILES_POR_TILESET,
  validarTileset,
  type TilesetDados,
} from '@/rules/tileset';
import { bytesDoDataUrl, sugerirIdentificador } from '@/lib/conteudoTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';

type Token = () => Promise<string>;

interface ImagemLida {
  png: string;
  largura: number;
  altura: number;
  imagem: HTMLImageElement;
}

/** Abre qualquer imagem que o navegador entenda (PNG, JPG, WebP, GIF...) e a converte para PNG. */
function lerImagem(arquivo: File): Promise<ImagemLida> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const largura = img.naturalWidth;
      const altura = img.naturalHeight;
      if (!largura || !altura) return reject(new Error('A imagem não tem tamanho definido.'));
      if (largura > LADO_MAXIMO_DA_IMAGEM || altura > LADO_MAXIMO_DA_IMAGEM) {
        return reject(new Error(`A imagem passa de ${LADO_MAXIMO_DA_IMAGEM} pixels de lado: divida em partes menores.`));
      }
      const canvas = document.createElement('canvas');
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('O navegador não conseguiu ler a imagem.'));
      ctx.drawImage(img, 0, 0);
      const png = canvas.toDataURL('image/png');
      const final = new Image();
      final.onload = () => resolve({ png, largura, altura, imagem: final });
      final.onerror = () => reject(new Error('O navegador não conseguiu converter a imagem.'));
      final.src = png;
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Esse arquivo não é uma imagem que o navegador consiga abrir.'));
    };
    img.src = url;
  });
}

/**
 * Importador de tiles (3.5.6.4): qualquer imagem vira um tileset. Você escolhe o tamanho do tile, a margem e o
 * espaçamento, confere a grade na prévia e cria o tileset como rascunho (publicar é no painel, como os mapas).
 */
export function ImportarTileset({ tokenFresco, criado }: { tokenFresco: Token; criado: (id: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [lida, setLida] = useState<ImagemLida | null>(null);
  const [nome, setNome] = useState('');
  const [id, setId] = useState('');
  const [tile, setTile] = useState(32);
  const [margem, setMargem] = useState(0);
  const [espacamento, setEspacamento] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const previa = useRef<HTMLCanvasElement>(null);

  const grade = lida ? gradeDoTileset(lida.largura, lida.altura, tile, margem, espacamento) : null;
  const total = grade ? grade.colunas * grade.linhas : 0;
  const bytes = lida ? bytesDoDataUrl(lida.png) : 0;

  useEffect(() => {
    const canvas = previa.current;
    if (!canvas || !lida || !grade) return;
    canvas.width = lida.largura;
    canvas.height = lida.altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lida.imagem, 0, 0);
    ctx.strokeStyle = 'rgba(245, 227, 179, 0.8)';
    ctx.lineWidth = Math.max(1, lida.largura / 512);
    for (let l = 0; l < grade.linhas; l++) {
      for (let c = 0; c < grade.colunas; c++) {
        ctx.strokeRect(margem + c * (tile + espacamento) + 0.5, margem + l * (tile + espacamento) + 0.5, tile - 1, tile - 1);
      }
    }
  }, [lida, grade, tile, margem, espacamento]);

  const montar = (): TilesetDados | null =>
    lida && grade
      ? {
          formato: FORMATO_DO_TILESET,
          imagem: lida.png,
          larguraImagem: lida.largura,
          alturaImagem: lida.altura,
          tamanhoDoTile: tile,
          margem,
          espacamento,
          colunas: grade.colunas,
          linhas: grade.linhas,
        }
      : null;

  return (
    <Cartao titulo="Importar tileset">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        Qualquer imagem serve: ela é convertida para PNG e cortada em tiles quadrados. Até {LADO_MAXIMO_DA_IMAGEM} px de lado,{' '}
        {Math.round(BYTES_MAXIMOS_DO_PNG / 1000)} KB e {TILES_POR_TILESET} tiles.
      </p>
      <label className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded border text-[12px] cursor-pointer" style={{ borderColor: OURO, color: '#E6C775' }}>
        <ImagePlus className="w-4 h-4" /> Escolher imagem
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = '';
            if (!arquivo) return;
            setErro(null);
            try {
              const nova = await lerImagem(arquivo);
              setLida(nova);
              const base = arquivo.name.replace(/\.[^.]+$/, '');
              if (!nome) setNome(base.slice(0, 60));
              if (!id) setId(sugerirIdentificador(base));
            } catch (error) {
              setErro(error instanceof Error ? error.message : 'Não foi possível abrir a imagem.');
            }
          }}
        />
      </label>

      {lida && (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const dados = montar();
            if (!dados) return;
            const v = validarTileset(dados);
            if (!v.ok) return setErro(v.erros.join(' '));
            setOcupado(true);
            setErro(null);
            const r = await chamar(tokenFresco, '/api/mestre/conteudo', { method: 'POST', body: JSON.stringify({ tipo: 'tileset', id, nome, dados }) });
            setOcupado(false);
            if (r.ok) {
              setLida(null);
              setNome('');
              setId('');
              criado(id);
            } else setErro(String(r.dados.error ?? 'Não foi possível criar o tileset.'));
          }}
        >
          <div className="grid gap-2 grid-cols-2 md:grid-cols-5 items-end">
            <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Nome
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} style={estiloCampo} required />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Identificador (fixo)
              <input value={id} onChange={(e) => setId(e.target.value)} className={campo} style={estiloCampo} autoComplete="off" required />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Tile (px)
              <input type="number" min={TILE_MINIMO_DO_TILESET} max={TILE_MAXIMO_DO_TILESET} value={tile} onChange={(e) => setTile(Math.max(1, Number(e.target.value) || 1))} className={campo} style={estiloCampo} />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Margem
              <input type="number" min={0} max={MARGEM_MAXIMA} value={margem} onChange={(e) => setMargem(Math.max(0, Number(e.target.value) || 0))} className={campo} style={estiloCampo} />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Espaço entre tiles
              <input type="number" min={0} max={MARGEM_MAXIMA} value={espacamento} onChange={(e) => setEspacamento(Math.max(0, Number(e.target.value) || 0))} className={campo} style={estiloCampo} />
            </label>
          </div>
          <p className="text-[11px]" style={{ color: total > TILES_POR_TILESET || total === 0 ? VERMELHO : colors.text.secondary }}>
            {lida.largura} × {lida.altura} px · {grade?.colunas ?? 0} colunas × {grade?.linhas ?? 0} linhas = {total} tiles · {Math.round(bytes / 1000)} KB
          </p>
          <div className="max-h-80 overflow-auto rounded-sm border" style={{ borderColor: `${OURO}33`, backgroundColor: '#0B0A09' }}>
            <canvas
              ref={previa}
              aria-label="Prévia do tileset com a grade"
              className="block max-w-full"
              // imagens pequenas aparecem ampliadas (sem borrar) para dar para ver a grade
              style={{ imageRendering: 'pixelated', width: lida.largura * Math.max(1, Math.floor(320 / lida.largura)) }}
            />
          </div>
          <button type="submit" disabled={ocupado} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            {ocupado ? 'Enviando...' : 'Criar tileset'}
          </button>
        </form>
      )}
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}
