'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import {
  BYTES_MAXIMOS_DO_PNG,
  BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO,
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
import {
  acrescentarTiles,
  alternarTile,
  bytesDoPngEmDataUrl,
  comporTilesetCompacto,
  dadosDoTilesetCompacto,
  gradeCompacta,
  indiceNoPonto,
  indicesDaArea,
  type FolhaDeTiles,
} from '@/lib/folhaDeTiles';
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
 * Importador de tiles (3.5.6.4): você importa a folha inteira (o produto), escolhe o tamanho do tile, a margem e o
 * espaçamento, confere a grade e escolhe os tiles que quer. Dois jeitos de criar, sempre como rascunho (publicar é no
 * painel, como os mapas):
 * - só com os escolhidos: a imagem do tileset leva apenas esses tiles (mais leve para o celular) e a folha original
 *   fica guardada para pegar mais tiles depois;
 * - com a folha inteira.
 */
export function ImportarTileset({ tokenFresco, criado }: { tokenFresco: Token; criado: (id: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const botao = 'px-3 py-1.5 rounded border text-[12px] disabled:opacity-50';
  const [lida, setLida] = useState<ImagemLida | null>(null);
  const [nome, setNome] = useState('');
  const [id, setId] = useState('');
  const [tile, setTile] = useState(32);
  const [margem, setMargem] = useState(0);
  const [espacamento, setEspacamento] = useState(0);
  const [selecao, setSelecao] = useState<number[]>([]);
  const [modoArea, setModoArea] = useState(false);
  const [pontoA, setPontoA] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [guardarFolha, setGuardarFolha] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const previa = useRef<HTMLCanvasElement>(null);

  const grade = lida ? gradeDoTileset(lida.largura, lida.altura, tile, margem, espacamento) : null;
  const total = grade ? grade.colunas * grade.linhas : 0;
  const bytes = lida ? bytesDoDataUrl(lida.png) : 0;
  const folha: FolhaDeTiles | null = lida ? { larguraImagem: lida.largura, alturaImagem: lida.altura, tamanhoDoTile: tile, margem, espacamento } : null;
  const compacta = gradeCompacta(selecao.length);

  /** Mudar a grade muda o número de cada tile: a escolha recomeça. */
  const mudarGrade = (fn: () => void) => {
    fn();
    setSelecao([]);
    setPontoA(null);
  };

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
    const marcados = new Set(selecao);
    for (let l = 0; l < grade.linhas; l++) {
      for (let c = 0; c < grade.colunas; c++) {
        const x = margem + c * (tile + espacamento);
        const y = margem + l * (tile + espacamento);
        const indice = l * grade.colunas + c;
        if (marcados.has(indice)) {
          ctx.fillStyle = 'rgba(230, 199, 117, 0.45)';
          ctx.fillRect(x, y, tile, tile);
        }
        if (indice === pontoA) {
          ctx.fillStyle = 'rgba(120, 190, 255, 0.55)';
          ctx.fillRect(x, y, tile, tile);
        }
        ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
      }
    }
  }, [lida, grade, tile, margem, espacamento, selecao, pontoA]);

  const tocar = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previa.current;
    if (!canvas || !lida || !grade || !folha) return;
    const r = canvas.getBoundingClientRect();
    const indice = indiceNoPonto(((e.clientX - r.left) * lida.largura) / r.width, ((e.clientY - r.top) * lida.altura) / r.height, folha);
    if (indice === null) return;
    if (!modoArea) return setSelecao(alternarTile(selecao, indice));
    if (pontoA === null) return setPontoA(indice);
    setSelecao(acrescentarTiles(selecao, indicesDaArea(pontoA, indice, grade.colunas)));
    setPontoA(null);
  };

  const concluir = async (dados: TilesetDados) => {
    const v = validarTileset(dados);
    if (!v.ok) {
      setOcupado(false);
      return setErro(v.erros.join(' '));
    }
    const r = await chamar(tokenFresco, '/api/mestre/conteudo', { method: 'POST', body: JSON.stringify({ tipo: 'tileset', id, nome, dados }) });
    setOcupado(false);
    if (r.ok) {
      setLida(null);
      setNome('');
      setId('');
      setSelecao([]);
      criado(id);
    } else setErro(String(r.dados.error ?? 'Não foi possível criar o tileset.'));
  };

  /** Envia um PNG para o armazenamento: o endereço, 'desligado' (503) ou um erro. */
  const enviar = async (png: string): Promise<{ url: string } | 'desligado' | { erro: string }> => {
    const r = await chamar(tokenFresco, '/api/mestre/tilesets/imagem', { method: 'POST', body: bytesDoPngEmDataUrl(png) as BodyInit, headers: { 'Content-Type': 'image/png' } });
    if (r.ok) return { url: String((r.dados.imagem as { url: string }).url) };
    if (r.status === 503) return 'desligado';
    return { erro: String(r.dados.error ?? 'Não foi possível enviar a imagem.') };
  };

  const criarComTudo = async () => {
    if (!lida || !grade) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    // a imagem vai para o armazenamento de arquivos (até 1 MB); se ele não estiver ligado, o PNG segue em texto (até 420 KB)
    const envio = await enviar(lida.png);
    if (envio !== 'desligado' && 'erro' in envio) {
      setOcupado(false);
      return setErro(envio.erro);
    }
    if (envio === 'desligado' && bytes > BYTES_MAXIMOS_DO_PNG) {
      setOcupado(false);
      return setErro(`O armazenamento de imagens está desligado e a imagem passa de ${Math.round(BYTES_MAXIMOS_DO_PNG / 1000)} KB.`);
    }
    const base = { formato: FORMATO_DO_TILESET, larguraImagem: lida.largura, alturaImagem: lida.altura, tamanhoDoTile: tile, margem, espacamento, colunas: grade.colunas, linhas: grade.linhas } as const;
    await concluir(envio === 'desligado' ? { ...base, imagem: lida.png } : { ...base, imagemUrl: envio.url });
  };

  const criarComEscolhidos = async () => {
    if (!lida || !folha || selecao.length === 0) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const comp = comporTilesetCompacto(lida.imagem, folha, selecao);
      const tamanho = bytesDoDataUrl(comp.png);
      if (tamanho > BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO) {
        setOcupado(false);
        return setErro(`A imagem dos tiles escolhidos passa de ${Math.round(BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO / 1024)} KB: escolha menos tiles.`);
      }
      const envio = await enviar(comp.png);
      if (envio !== 'desligado' && 'erro' in envio) {
        setOcupado(false);
        return setErro(envio.erro);
      }
      if (envio === 'desligado') {
        if (tamanho > BYTES_MAXIMOS_DO_PNG) {
          setOcupado(false);
          return setErro(`O armazenamento de imagens está desligado e a imagem passa de ${Math.round(BYTES_MAXIMOS_DO_PNG / 1000)} KB.`);
        }
        return await concluir({ formato: FORMATO_DO_TILESET, imagem: comp.png, larguraImagem: comp.largura, alturaImagem: comp.altura, tamanhoDoTile: tile, margem: 0, espacamento: 0, colunas: comp.colunas, linhas: comp.linhas });
      }
      let folhaUrl: string | null = null;
      if (guardarFolha) {
        if (bytes > BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO) {
          setAviso(`A folha original passa de ${Math.round(BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO / 1024)} KB e não foi guardada: para pegar mais tiles depois, importe a folha de novo.`);
        } else {
          const f = await enviar(lida.png);
          if (f !== 'desligado' && !('erro' in f)) folhaUrl = f.url;
          else setAviso('Não foi possível guardar a folha original; o tileset foi criado mesmo assim.');
        }
      }
      await concluir(dadosDoTilesetCompacto(comp, envio.url, folha, selecao, folhaUrl));
    } catch (error) {
      setOcupado(false);
      setErro(error instanceof Error ? error.message : 'Não foi possível montar o tileset.');
    }
  };

  return (
    <Cartao titulo="Importar tileset">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        Importe a folha inteira (qualquer imagem: ela vira PNG), marque a grade e escolha os tiles que quer. Até {LADO_MAXIMO_DA_IMAGEM} px de lado,{' '}
        {Math.round(BYTES_MAXIMOS_DO_PNG_NO_ARMAZENAMENTO / 1024)} KB e {TILES_POR_TILESET} tiles.
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
            setAviso(null);
            try {
              const nova = await lerImagem(arquivo);
              setLida(nova);
              setSelecao([]);
              setPontoA(null);
              setZoom(Math.max(1, Math.floor(320 / nova.largura)));
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
          onSubmit={(e) => {
            e.preventDefault();
            void (selecao.length > 0 ? criarComEscolhidos() : criarComTudo());
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
              <input type="number" min={TILE_MINIMO_DO_TILESET} max={TILE_MAXIMO_DO_TILESET} value={tile} onChange={(e) => mudarGrade(() => setTile(Math.max(1, Number(e.target.value) || 1)))} className={campo} style={estiloCampo} />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Margem
              <input type="number" min={0} max={MARGEM_MAXIMA} value={margem} onChange={(e) => mudarGrade(() => setMargem(Math.max(0, Number(e.target.value) || 0)))} className={campo} style={estiloCampo} />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Espaço entre tiles
              <input type="number" min={0} max={MARGEM_MAXIMA} value={espacamento} onChange={(e) => mudarGrade(() => setEspacamento(Math.max(0, Number(e.target.value) || 0)))} className={campo} style={estiloCampo} />
            </label>
          </div>
          <p className="text-[11px]" style={{ color: total > TILES_POR_TILESET || total === 0 ? VERMELHO : colors.text.secondary }}>
            {lida.largura} × {lida.altura} px · {grade?.colunas ?? 0} colunas × {grade?.linhas ?? 0} linhas = {total} tiles · {Math.round(bytes / 1000)} KB
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={botao} style={{ borderColor: modoArea ? '#78BEFF' : OURO, color: modoArea ? '#78BEFF' : '#E6C775' }} onClick={() => { setModoArea(!modoArea); setPontoA(null); }} aria-pressed={modoArea}>
              {modoArea ? (pontoA === null ? 'Área: toque no 1º canto' : 'Área: toque no 2º canto') : 'Marcar área (2 toques)'}
            </button>
            <button type="button" className={botao} style={{ borderColor: OURO, color: '#E6C775' }} disabled={total === 0 || total > TILES_POR_TILESET} onClick={() => setSelecao(Array.from({ length: total }, (_, i) => i))}>Selecionar tudo</button>
            <button type="button" className={botao} style={{ borderColor: OURO, color: '#E6C775' }} disabled={selecao.length === 0} onClick={() => { setSelecao([]); setPontoA(null); }}>Limpar</button>
            <label className="text-[11px] flex items-center gap-1">Zoom
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="rounded-sm border px-1 py-1 text-[12px]" style={estiloCampo}>
                {[0.25, 0.5, 1, 2, 3, 4].map((z) => <option key={z} value={z}>{z * 100}%</option>)}
              </select>
            </label>
          </div>
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>
            {selecao.length === 0
              ? 'Toque nos tiles da folha para escolher (toque de novo para tirar). Sem escolher nenhum, o tileset usa a folha inteira.'
              : `${selecao.length} tile${selecao.length > 1 ? 's' : ''} escolhido${selecao.length > 1 ? 's' : ''} · o tileset terá ${compacta.colunas * tile} × ${compacta.linhas * tile} px.`}
          </p>
          <div className="max-h-[60vh] overflow-auto rounded-sm border" style={{ borderColor: `${OURO}33`, backgroundColor: '#0B0A09' }}>
            <canvas
              ref={previa}
              onClick={tocar}
              aria-label="Folha de tiles: toque para escolher"
              className="block cursor-pointer"
              // imagens pequenas aparecem ampliadas (sem borrar) para dar para ver a grade e tocar nos tiles
              style={{ imageRendering: 'pixelated', width: lida.largura * zoom, maxWidth: 'none' }}
            />
          </div>
          {selecao.length > 0 && (
            <label className="text-[11px] flex items-center gap-1.5">
              <input type="checkbox" checked={guardarFolha} onChange={(e) => setGuardarFolha(e.target.checked)} />
              Guardar a folha original (para pegar mais tiles depois)
            </label>
          )}
          <button type="submit" disabled={ocupado} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            {ocupado ? 'Enviando...' : selecao.length > 0 ? `Criar tileset com os ${selecao.length} escolhidos` : 'Criar tileset com a folha inteira'}
          </button>
        </form>
      )}
      {aviso && <p role="status" className="text-[12px]" style={{ color: '#E6C775' }}>{aviso}</p>}
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}
