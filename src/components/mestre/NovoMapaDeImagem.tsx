'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import {
  BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA,
  gradeDaImagem,
  LADO_MAXIMO_DA_IMAGEM_DO_MAPA,
  LADO_MAXIMO_DO_MAPA,
  LADO_MINIMO_DO_MAPA,
  mapaVazio,
  PIXELS_DO_AVISO_DA_IMAGEM_DO_MAPA,
  TAMANHOS_DE_TILE,
  TILE_PADRAO,
} from '@/rules/mapa';
import { sugerirIdentificador } from '@/lib/conteudoTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, chamar, OURO, VERMELHO } from '@/components/mestre/comum';

type Token = () => Promise<string>;

interface ImagemEscolhida {
  blob: Blob;
  largura: number;
  altura: number;
  nome: string;
}

/** Abre a imagem só para saber o tamanho (qualquer formato que o navegador entenda). */
function medirImagem(arquivo: Blob): Promise<{ largura: number; altura: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Esse arquivo não é uma imagem que o navegador consiga abrir.'));
    };
    img.src = url;
  });
}

/**
 * PNG segue como está (sem recomprimir), mas copiado para a memória: mandar o próprio arquivo escolhido falha no celular ("Failed to fetch") quando ele vem da
 * galeria ou da nuvem (o navegador perde a ligação com o arquivo antes do envio acabar). Outros formatos viram PNG pelo navegador.
 */
export async function prepararPng(arquivo: File): Promise<Blob> {
  if (arquivo.type === 'image/png') return new Blob([await arquivo.arrayBuffer()], { type: 'image/png' });
  const { largura, altura } = await medirImagem(arquivo);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('O navegador não conseguiu converter a imagem para PNG: envie um PNG.');
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
      i.src = url;
    });
    ctx.drawImage(img, 0, 0);
  } finally {
    URL.revokeObjectURL(url);
  }
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!png) throw new Error('O navegador não conseguiu converter a imagem para PNG: envie um PNG.');
  return png;
}

/**
 * Novo mapa a partir de uma imagem: o Mestre envia a imagem inteira do mapa (o chão e as construções já desenhados), escolhe o tamanho do tile da
 * colisão e o mapa nasce pronto, com a imagem de fundo e a grade cobrindo ela. Depois é só pintar a colisão e colocar os objetos (NPC, porta, baú...).
 * Para as copas das árvores e coisas assim, use a camada "Acima do jogador" com um tileset.
 */
export function NovoMapaDeImagem({ tokenFresco, criado }: { tokenFresco: Token; criado: (id: string) => void }) {
  const { colors } = NOCTHERA_THEME;
  const campo = 'rounded-sm border px-2 py-1 text-[12px] w-full';
  const estiloCampo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [imagem, setImagem] = useState<ImagemEscolhida | null>(null);
  const [nome, setNome] = useState('');
  const [id, setId] = useState('');
  const [idEditado, setIdEditado] = useState(false);
  const [tile, setTile] = useState<number>(TILE_PADRAO);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const grade = imagem ? gradeDaImagem(imagem.largura, imagem.altura, tile) : null;
  const pesada = imagem !== null && imagem.largura * imagem.altura > PIXELS_DO_AVISO_DA_IMAGEM_DO_MAPA;
  const problema = ((): string | null => {
    if (!imagem || !grade) return null;
    if (imagem.largura > LADO_MAXIMO_DA_IMAGEM_DO_MAPA || imagem.altura > LADO_MAXIMO_DA_IMAGEM_DO_MAPA) return `A imagem passa de ${LADO_MAXIMO_DA_IMAGEM_DO_MAPA} pixels de lado: divida em mapas menores.`;
    if (imagem.blob.size > BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA) return `O arquivo passa de ${Math.round(BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA / 1024 / 1024)} MB.`;
    if (grade.largura > LADO_MAXIMO_DO_MAPA || grade.altura > LADO_MAXIMO_DO_MAPA) return `Com tile de ${tile} px o mapa teria ${grade.largura} × ${grade.altura} tiles (o máximo é ${LADO_MAXIMO_DO_MAPA}): escolha um tile maior.`;
    if (grade.largura < LADO_MINIMO_DO_MAPA || grade.altura < LADO_MINIMO_DO_MAPA) return `O mapa precisa de pelo menos ${LADO_MINIMO_DO_MAPA} tiles de lado: escolha um tile menor ou uma imagem maior.`;
    return null;
  })();

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro(null);
    try {
      const blob = await prepararPng(arquivo);
      const tamanho = await medirImagem(blob);
      const base = arquivo.name.replace(/\.[^.]+$/, '');
      setImagem({ blob, ...tamanho, nome: arquivo.name });
      if (!nome) setNome(base.slice(0, 60));
      if (!idEditado) setId(sugerirIdentificador(base));
    } catch (e) {
      setImagem(null);
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a imagem.');
    }
  };

  const criar = async () => {
    if (!imagem || !grade || problema) return;
    setOcupado(true);
    setErro(null);
    try {
      const envio = await chamar(tokenFresco, '/api/mestre/mapas/imagem', { method: 'POST', body: imagem.blob, headers: { 'Content-Type': 'image/png' } });
      if (!envio.ok) throw new Error(String(envio.dados.error ?? 'Não foi possível enviar a imagem.'));
      const enviada = envio.dados.imagem as { url: string; largura: number; altura: number };
      const dados = { ...mapaVazio(grade.largura, grade.altura, tile), fundo: { url: enviada.url, largura: enviada.largura, altura: enviada.altura } };
      const r = await chamar(tokenFresco, '/api/mestre/conteudo', { method: 'POST', body: JSON.stringify({ tipo: 'mapa', id, nome, dados }) });
      if (!r.ok) throw new Error(String(r.dados.error ?? 'Não foi possível criar o mapa.'));
      setImagem(null);
      setNome('');
      setId('');
      setIdEditado(false);
      criado(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o mapa.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Cartao titulo="Novo mapa a partir de uma imagem">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        Envie a imagem inteira do mapa (PNG, até {LADO_MAXIMO_DA_IMAGEM_DO_MAPA} px de lado e {Math.round(BYTES_MAXIMOS_DA_IMAGEM_DO_MAPA / 1024 / 1024)} MB), escolha o tile da colisão e o mapa já nasce pronto. Depois, dentro do editor, você mesmo pinta a colisão e coloca os objetos.
      </p>
      <label className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded border text-[12px] cursor-pointer" style={{ borderColor: OURO, color: '#E6C775' }}>
        <ImagePlus className="w-4 h-4" /> {imagem ? 'Trocar a imagem' : 'Escolher a imagem'}
        <input ref={entrada} type="file" accept="image/*" className="sr-only" onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ''; void escolher(a); }} />
      </label>
      {imagem && grade && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void criar();
          }}
        >
          <div className="grid gap-2 grid-cols-2 md:grid-cols-3 items-end">
            <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Nome
              <input value={nome} onChange={(e) => { setNome(e.target.value); if (!idEditado) setId(sugerirIdentificador(e.target.value)); }} className={campo} style={estiloCampo} required />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5 col-span-2 md:col-span-1">Identificador (fixo)
              <input value={id} onChange={(e) => { setId(e.target.value); setIdEditado(true); }} className={campo} style={estiloCampo} autoComplete="off" required />
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">Tile da colisão (px)
              <select value={tile} onChange={(e) => setTile(Number(e.target.value))} className={campo} style={estiloCampo}>
                {TAMANHOS_DE_TILE.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[11px]" style={{ color: problema ? VERMELHO : colors.text.secondary }}>
            {imagem.nome}: {imagem.largura} × {imagem.altura} px · {(imagem.blob.size / 1024 / 1024).toFixed(1)} MB → com tile de {tile} px, o mapa terá {grade.largura} × {grade.altura} tiles ({(grade.largura * grade.altura).toLocaleString('pt-BR')} células). Todas começam livres: a colisão é você quem pinta no editor.
          </p>
          {pesada && !problema && <p role="status" className="text-[11px]" style={{ color: '#E6C775' }}>Imagem muito grande: pode ficar pesada em celulares mais fracos.</p>}
          {problema && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{problema}</p>}
          <button type="submit" disabled={ocupado || problema !== null} className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>
            {ocupado ? 'Enviando a imagem...' : 'Criar o mapa'}
          </button>
        </form>
      )}
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}
