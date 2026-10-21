'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ID_DE_BORDA, MAXIMO_DE_BORDAS, NOME_MAXIMO_DA_BORDA, origemDaImagem, recorteDoTile, type RegraDeBorda, type TilesetDados } from '@/rules/tileset';
import { nomeDaPosicao } from '@/lib/autoTile';
import { sugerirIdentificador } from '@/lib/conteudoTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Cartao, OURO, VERMELHO } from '@/components/mestre/comum';
import { carregarImagem } from '@/components/mestre/carregarTileset';

const CELULA = 64;
type Rascunho = { id: string; nome: string; tiles: (number | null)[] };

const doRascunho = (r: RegraDeBorda): Rascunho => ({ id: r.id, nome: r.nome, tiles: [...r.tiles] });

/**
 * Montagem das regras de borda automática de um tileset (terrenos como grama, água e caminho): 16 posições, uma para
 * cada combinação de vizinhos do mesmo terreno (ver `RegraDeBorda`). Toque numa posição e depois no tile da folha.
 * Salva só o rascunho do tileset; publicar é no painel.
 */
export function EditorDeBordas({ dados, podeEditar, salvar }: { dados: TilesetDados; podeEditar: boolean; salvar: (bordas: RegraDeBorda[]) => Promise<string | null> }) {
  const { colors } = NOCTHERA_THEME;
  const estilo = { backgroundColor: colors.background.primary, borderColor: `${OURO}66`, color: colors.text.primary };
  const [regras, setRegras] = useState<Rascunho[]>((dados.bordas ?? []).map(doRascunho));
  const [regraSel, setRegraSel] = useState(0);
  const [posicao, setPosicao] = useState(0);
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const folhaRef = useRef<HTMLCanvasElement>(null);
  const gradeRef = useRef<HTMLCanvasElement>(null);
  const regra = regras[regraSel];
  const escala = Math.max(1, Math.round(32 / dados.tamanhoDoTile));
  const total = dados.colunas * dados.linhas;

  useEffect(() => {
    let vivo = true;
    void carregarImagem(origemDaImagem(dados))
      .then((i) => vivo && setImagem(i))
      .catch((e: unknown) => vivo && setErro(e instanceof Error ? e.message : 'Não foi possível abrir a imagem.'));
    return () => {
      vivo = false;
    };
  }, [dados]);

  // a folha de tiles
  useEffect(() => {
    const canvas = folhaRef.current;
    if (!canvas || !imagem) return;
    const l = dados.tamanhoDoTile * escala;
    canvas.width = dados.colunas * l;
    canvas.height = dados.linhas * l;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < total; i++) {
      const r = recorteDoTile(dados, i);
      ctx.drawImage(imagem, r.x, r.y, r.lado, r.lado, (i % dados.colunas) * l, Math.floor(i / dados.colunas) * l, l, l);
    }
    // marca os tiles que já estão na regra aberta
    if (regra) {
      ctx.strokeStyle = '#7BC47F';
      ctx.lineWidth = 2;
      for (const t of new Set(regra.tiles.filter((x): x is number => x !== null))) ctx.strokeRect((t % dados.colunas) * l + 1, Math.floor(t / dados.colunas) * l + 1, l - 2, l - 2);
    }
  }, [imagem, dados, escala, total, regra]);

  // as 16 posições da regra
  useEffect(() => {
    const canvas = gradeRef.current;
    if (!canvas || !imagem || !regra) return;
    canvas.width = 4 * CELULA;
    canvas.height = 4 * CELULA;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1A1612';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let m = 0; m < 16; m++) {
      const x = (m % 4) * CELULA;
      const y = Math.floor(m / 4) * CELULA;
      const t = regra.tiles[m];
      if (t !== null && t < total) {
        const r = recorteDoTile(dados, t);
        ctx.drawImage(imagem, r.x, r.y, r.lado, r.lado, x + 2, y + 2, CELULA - 4, CELULA - 4);
      } else {
        ctx.fillStyle = '#2A241D';
        ctx.fillRect(x + 2, y + 2, CELULA - 4, CELULA - 4);
      }
      ctx.strokeStyle = m === posicao ? '#F5E3B3' : `${OURO}55`;
      ctx.lineWidth = m === posicao ? 3 : 1;
      ctx.strokeRect(x + 1.5, y + 1.5, CELULA - 3, CELULA - 3);
      ctx.fillStyle = '#F5E3B3';
      ctx.font = 'bold 11px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(String(m), x + 5, y + 4);
    }
  }, [imagem, dados, regra, posicao, total]);

  const mudarRegra = (fn: (r: Rascunho) => Rascunho) => setRegras((lista) => lista.map((r, i) => (i === regraSel ? fn(r) : r)));

  const completas = (r: Rascunho): r is { id: string; nome: string; tiles: number[] } => r.tiles.every((t) => t !== null);

  return (
    <Cartao titulo="Bordas automáticas (terrenos)">
      <p className="text-[11px]" style={{ color: colors.text.secondary }}>
        Para cada terreno (grama, água, caminho), indique qual tile usar em cada uma das 16 situações de vizinhança. Depois, no editor de mapas, quem pinta com um tile do terreno ganha as bordas e os cantos certos sozinho.
        A posição é a soma: 1 = vizinho em cima, 2 = à direita, 4 = embaixo, 8 = à esquerda. A 0 é o tile sozinho e a 15 é o miolo.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {regras.map((r, i) => (
          <button key={r.id} type="button" onClick={() => { setRegraSel(i); setPosicao(0); }} className="rounded border px-2 py-1 text-[11px] font-bold" style={{ borderColor: i === regraSel ? '#F5E3B3' : `${OURO}55` }}>
            {r.nome || r.id}
          </button>
        ))}
        {podeEditar && regras.length < MAXIMO_DE_BORDAS && (
          <button
            type="button"
            className="rounded border px-2 py-1 text-[11px] font-bold"
            style={{ borderColor: `${OURO}66` }}
            onClick={() => {
              let id = sugerirIdentificador(`terreno ${regras.length + 1}`).slice(0, 24);
              while (regras.some((r) => r.id === id)) id = `${id.slice(0, 20)}-${Math.floor(Math.random() * 90 + 10)}`;
              setRegras([...regras, { id, nome: `Terreno ${regras.length + 1}`, tiles: new Array(16).fill(null) }]);
              setRegraSel(regras.length);
              setPosicao(0);
            }}
          >
            + Terreno
          </button>
        )}
      </div>

      {regra ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] flex flex-col gap-0.5">Nome do terreno
              <input value={regra.nome} maxLength={NOME_MAXIMO_DA_BORDA} disabled={!podeEditar} onChange={(e) => mudarRegra((r) => ({ ...r, nome: e.target.value }))} className="rounded-sm border px-2 py-1 text-[12px]" style={estilo} />
            </label>
            {podeEditar && (
              <>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-[11px]"
                  style={{ borderColor: `${OURO}66` }}
                  onClick={() => mudarRegra((r) => (r.tiles[15] === null ? r : { ...r, tiles: r.tiles.map((t) => t ?? r.tiles[15]) }))}
                >
                  Completar vazias com o miolo
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-[11px]"
                  style={{ borderColor: VERMELHO, color: VERMELHO }}
                  onClick={() => {
                    setRegras(regras.filter((_, i) => i !== regraSel));
                    setRegraSel(0);
                    setPosicao(0);
                  }}
                >
                  Remover terreno
                </button>
              </>
            )}
          </div>

          <p className="text-[12px] font-semibold" role="status">Posição {posicao}: {nomeDaPosicao(posicao)}{podeEditar ? '. Agora toque num tile da folha abaixo.' : ''}</p>
          <canvas
            ref={gradeRef}
            aria-label="Posições da regra"
            className="block self-start rounded-sm border"
            style={{ imageRendering: 'pixelated', borderColor: `${OURO}33`, width: 4 * CELULA, maxWidth: '100%' }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const l = r.width / 4;
              setPosicao(Math.min(3, Math.max(0, Math.floor((e.clientY - r.top) / l))) * 4 + Math.min(3, Math.max(0, Math.floor((e.clientX - r.left) / l))));
            }}
          />
          <div className="max-h-72 overflow-auto rounded-sm border" style={{ borderColor: `${OURO}33` }}>
            <canvas
              ref={folhaRef}
              aria-label={`Tiles do tileset`}
              className="block"
              style={{ imageRendering: 'pixelated' }}
              onClick={(e) => {
                if (!podeEditar) return;
                const r = e.currentTarget.getBoundingClientRect();
                const l = dados.tamanhoDoTile * escala * (r.width / e.currentTarget.width);
                const coluna = Math.floor((e.clientX - r.left) / l);
                const linha = Math.floor((e.clientY - r.top) / l);
                if (coluna < 0 || linha < 0 || coluna >= dados.colunas || linha >= dados.linhas) return;
                const tile = linha * dados.colunas + coluna;
                mudarRegra((rg) => ({ ...rg, tiles: rg.tiles.map((t, i) => (i === posicao ? tile : t)) }));
                setPosicao((p) => Math.min(15, p + 1));
              }}
            />
          </div>
        </div>
      ) : (
        <p className="text-[11px]" style={{ color: colors.text.secondary }}>{podeEditar ? 'Nenhum terreno ainda. Toque em "+ Terreno" para começar.' : 'Este tileset não tem bordas automáticas.'}</p>
      )}

      {podeEditar && (
        <button
          type="button"
          disabled={ocupado}
          className="self-start px-3 py-1.5 rounded font-cinzel font-bold text-xs disabled:opacity-50"
          style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}
          onClick={async () => {
            setErro(null);
            setAviso(null);
            const incompleta = regras.find((r) => !completas(r));
            if (incompleta) return setErro(`"${incompleta.nome || incompleta.id}" ainda tem posições sem tile. Preencha todas (ou use "Completar vazias com o miolo").`);
            const saida = regras.map((r) => ({ id: r.id, nome: r.nome.trim(), tiles: r.tiles as number[] }));
            if (saida.some((r) => !ID_DE_BORDA.test(r.id) || r.nome.length < 1)) return setErro('Dê um nome a cada terreno.');
            setOcupado(true);
            const falha = await salvar(saida);
            setOcupado(false);
            if (falha) setErro(falha);
            else setAviso('Rascunho salvo. Para o jogo e os mapas verem, publique o tileset.');
          }}
        >
          {ocupado ? 'Salvando…' : 'Salvar rascunho das bordas'}
        </button>
      )}
      {aviso && <p role="status" className="text-[12px] font-semibold" style={{ color: '#7BC47F' }}>{aviso}</p>}
      {erro && <p role="alert" className="text-[12px] font-semibold" style={{ color: VERMELHO }}>{erro}</p>}
    </Cartao>
  );
}
