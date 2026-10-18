'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand, RotateCcw } from 'lucide-react';
import type { MapaDados } from '@/rules/mapa';
import { LETRA_DO_OBJETO, NOME_DO_OBJETO } from '@/rules/objetosDoMapa';
import { andar, iniciarJogo, interagir, tileLivre, type Direcao, type EstadoDeJogo, type EventoDeJogo } from '@/lib/jogarMapa';
import type { ConteudoDocumento } from '@/server/persistencia/tipos';
import { NOCTHERA_THEME } from '@/theme/theme';
import { chamar, OURO } from '@/components/mestre/comum';
import { COR_DO_OBJETO } from '@/components/mestre/PainelDeObjetos';
import { desenharMapaDeJogo } from '@/components/mestre/desenharMapaDeJogo';
import { carregarTileset, type TilesetCarregado } from '@/components/mestre/carregarTileset';

type Token = () => Promise<string>;

interface MapaAberto {
  id: string;
  nome: string;
  mapa: MapaDados;
  tilesets: TilesetCarregado[];
}

async function abrirMapa(tokenFresco: Token, id: string): Promise<MapaAberto> {
  const r = await chamar(tokenFresco, `/api/mestre/conteudo/mapa/${id}`);
  if (!r.ok) throw new Error(String(r.dados.error ?? `Não foi possível abrir o mapa ${id}.`));
  const conteudo = r.dados.conteudo as ConteudoDocumento;
  const mapa = conteudo.rascunho as MapaDados;
  mapa.objetos ??= [];
  return { id, nome: conteudo.nome, mapa, tilesets: await Promise.all(mapa.tilesets.map((t) => carregarTileset(tokenFresco, t))) };
}

const TECLAS: Readonly<Record<string, Direcao>> = {
  ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita',
  w: 'cima', s: 'baixo', a: 'esquerda', d: 'direita',
};

/**
 * Jogar o mapa (3.5.6.6): o Mestre anda pelo RASCUNHO do mapa, tile a tile (setas, WASD ou os botões da tela), para
 * testar colisões, portas, NPCs, placas, baús e áreas de monstros antes de publicar. Nada é gravado: lutas, itens e
 * viagens só aparecem como aviso. Portas levam ao rascunho do mapa de destino.
 */
export function JogarMapa({ id, tokenFresco }: { id: string; tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [aberto, setAberto] = useState<MapaAberto | null>(null);
  const [jogo, setJogo] = useState<EstadoDeJogo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ titulo: string; texto: string } | null>(null);
  const [registro, setRegistro] = useState<string[]>([]);
  const caixaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tamanho, setTamanho] = useState({ largura: 320, altura: 320 });

  const anotar = useCallback((linha: string) => setRegistro((r) => [linha, ...r].slice(0, 12)), []);

  const entrarNoMapa = useCallback(
    async (mapaId: string, posicao?: { x: number; y: number }) => {
      try {
        const a = mapaId === aberto?.id ? aberto : await abrirMapa(tokenFresco, mapaId);
        const novo = iniciarJogo(a.id, a.mapa, posicao);
        setAberto(a);
        setJogo(novo);
        setErro(null);
        if (posicao && !tileLivre(a.mapa, novo.x, novo.y)) anotar(`Atenção: o destino (${novo.x}, ${novo.y}) está bloqueado no mapa ${a.nome}.`);
        if (novo.semInicio) anotar(`Atenção: o mapa ${a.nome} não tem início do jogador; o teste começou no primeiro tile livre.`);
        return novo;
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não foi possível abrir o mapa.');
        return null;
      }
    },
    [aberto, tokenFresco, anotar]
  );

  useEffect(() => {
    void entrarNoMapa(id);
    // abre uma vez; as viagens chamam entrarNoMapa sozinhas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;
    const medir = () => setTamanho({ largura: caixa.clientWidth, altura: caixa.clientHeight });
    medir();
    const o = new ResizeObserver(medir);
    o.observe(caixa);
    return () => o.disconnect();
  }, [aberto]);

  const lado = aberto ? Math.max(16, Math.floor(Math.min(tamanho.largura / Math.min(aberto.mapa.largura, 11), tamanho.altura / Math.min(aberto.mapa.altura, 11)))) : 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !aberto || !jogo) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(tamanho.largura * dpr);
    canvas.height = Math.round(tamanho.altura * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    desenharMapaDeJogo(ctx, aberto, jogo, tamanho.largura, tamanho.altura, lado, { mostrarColisao: true });
  }, [aberto, jogo, tamanho, lado]);

  const tratar = useCallback(
    async (eventos: EventoDeJogo[]) => {
      for (const e of eventos) {
        if (e.tipo === 'texto') {
          setDialogo({ titulo: e.titulo, texto: e.texto });
          anotar(`${e.titulo}: ${e.texto}`);
        } else if (e.tipo === 'item') {
          setDialogo({ titulo: 'Baú', texto: `Você receberia ${e.item.qtd} × ${e.item.id}. (Teste: nada foi gravado.)` });
          anotar(`Baú aberto: ${e.item.qtd} × ${e.item.id}.`);
        } else if (e.tipo === 'bau-vazio') {
          setDialogo({ titulo: 'Baú', texto: 'O baú já foi aberto (ou não tem item).' });
        } else if (e.tipo === 'luta') {
          setDialogo({ titulo: 'Área de monstros', texto: `Aqui começaria a luta contra ${e.monstroId}. (Teste: a luta não acontece.)` });
          anotar(`Entrou na área de monstros: luta contra ${e.monstroId}.`);
        } else if (e.tipo === 'porta') {
          anotar(`Porta: indo para ${e.destino.mapa} (${e.destino.x}, ${e.destino.y}).`);
          await entrarNoMapa(e.destino.mapa, { x: e.destino.x, y: e.destino.y });
        } else if (e.tipo === 'nada') {
          anotar(e.motivo);
        }
      }
    },
    [anotar, entrarNoMapa]
  );

  const passo = useCallback(
    (dir: Direcao) => {
      if (!jogo || dialogo) return;
      const r = andar(jogo, dir);
      setJogo(r.estado);
      void tratar(r.eventos);
    },
    [jogo, dialogo, tratar]
  );

  const acao = useCallback(() => {
    if (!jogo) return;
    if (dialogo) {
      setDialogo(null);
      return;
    }
    const r = interagir(jogo);
    setJogo(r.estado);
    void tratar(r.eventos);
  }, [jogo, dialogo, tratar]);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const dir = TECLAS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (dir) {
        e.preventDefault();
        passo(dir);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'e') {
        e.preventDefault();
        acao();
      }
    };
    window.addEventListener('keydown', teclas);
    return () => window.removeEventListener('keydown', teclas);
  }, [passo, acao]);

  const botao = 'w-14 h-14 rounded-md border flex items-center justify-center active:scale-95 disabled:opacity-40';
  const estiloBotao = { backgroundColor: colors.background.secondary, borderColor: `${OURO}88`, color: colors.text.primary };

  return (
    <main className="h-dvh w-full flex flex-col select-none" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <header className="flex items-center gap-2 px-2 py-1.5 border-b flex-wrap" style={{ borderColor: `${OURO}44` }}>
        <Link href={`/mestre/mapas/${id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-cinzel font-bold" style={{ borderColor: OURO, color: '#E6C775' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Editor
        </Link>
        <span className="text-[12px] font-cinzel font-bold truncate" style={{ color: '#F5E3B3' }}>Jogar: {aberto?.nome ?? id}</span>
        <span className="text-[10px]" style={{ color: colors.text.secondary }}>{jogo ? `(${jogo.x}, ${jogo.y})` : ''} · teste do rascunho, nada é gravado</span>
        <button type="button" aria-label="Recomeçar" title="Recomeçar este mapa" onClick={() => void entrarNoMapa(jogo?.mapaId ?? id)} className="ml-auto p-1.5 rounded border" style={estiloBotao}>
          <RotateCcw className="w-4 h-4" />
        </button>
      </header>

      {erro && <p role="alert" className="px-2 py-1 text-[11px] font-semibold" style={{ color: '#E5736B' }}>{erro}</p>}

      <div ref={caixaRef} className="flex-1 min-h-0 relative">
        {aberto && jogo ? (
          <canvas ref={canvasRef} aria-label={`Mapa ${aberto.nome} em teste`} className="absolute inset-0 w-full h-full" />
        ) : (
          !erro && <p className="p-4 text-[12px]" style={{ color: colors.text.secondary }}>Abrindo o mapa...</p>
        )}
        {dialogo && (
          <div role="dialog" aria-label={dialogo.titulo} className="absolute left-2 right-2 bottom-2 rounded-sm border-2 p-3 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: OURO }}>
            <strong className="font-cinzel text-[13px]" style={{ color: '#F5E3B3' }}>{dialogo.titulo}</strong>
            <p className="text-[12px] whitespace-pre-wrap">{dialogo.texto}</p>
            <button type="button" onClick={() => setDialogo(null)} className="self-end px-3 py-1 rounded text-[11px] font-bold" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>Continuar</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2 border-t" style={{ borderColor: `${OURO}44` }}>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Direção">
          <span />
          <button type="button" aria-label="Andar para cima" onClick={() => passo('cima')} className={botao} style={estiloBotao}><ArrowUp className="w-6 h-6" /></button>
          <span />
          <button type="button" aria-label="Andar para a esquerda" onClick={() => passo('esquerda')} className={botao} style={estiloBotao}><ArrowLeft className="w-6 h-6" /></button>
          <button type="button" aria-label="Andar para baixo" onClick={() => passo('baixo')} className={botao} style={estiloBotao}><ArrowDown className="w-6 h-6" /></button>
          <button type="button" aria-label="Andar para a direita" onClick={() => passo('direita')} className={botao} style={estiloBotao}><ArrowRight className="w-6 h-6" /></button>
        </div>
        <button type="button" aria-label="Interagir" onClick={acao} className="w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center font-cinzel font-bold text-[11px]" style={{ backgroundColor: colors.accent.primary, borderColor: OURO, color: colors.background.secondary }}>
          <Hand className="w-6 h-6" /> {dialogo ? 'Continuar' : 'Interagir'}
        </button>
      </div>

      <section aria-label="Registro do teste" className="h-24 overflow-auto px-3 py-1.5 border-t text-[11px]" style={{ borderColor: `${OURO}22`, backgroundColor: colors.background.secondary }}>
        {registro.length === 0 ? (
          <p style={{ color: colors.text.secondary }}>Setas ou WASD andam; Espaço, Enter ou E interagem. O que acontecer aparece aqui.</p>
        ) : (
          <ul>{registro.map((r, i) => <li key={`${i}-${r}`}>{r}</li>)}</ul>
        )}
        <p className="mt-1 text-[10px]" style={{ color: colors.text.secondary }}>
          {Object.entries(COR_DO_OBJETO).map(([t]) => `${LETRA_DO_OBJETO[t as keyof typeof LETRA_DO_OBJETO]} ${NOME_DO_OBJETO[t as keyof typeof NOME_DO_OBJETO]}`).join(' · ')}
        </p>
      </section>
    </main>
  );
}
