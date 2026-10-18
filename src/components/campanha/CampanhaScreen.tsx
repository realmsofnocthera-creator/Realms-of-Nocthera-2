'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from 'lucide-react';
import type { MapaDados } from '@/rules/mapa';
import { origemDaImagem, type TilesetDados } from '@/rules/tileset';
import type { ProgressoDaCampanha } from '@/game/campanha';
import { andar, iniciarJogo, interagir, type Direcao, type EstadoDeJogo, type EventoDeJogo } from '@/lib/jogarMapa';
import { deveSalvarPosicao, type PontoDaCampanha } from '@/lib/salvamentoCampanha';
import { NOCTHERA_THEME } from '@/theme/theme';
import { carregarImagem } from '@/components/mestre/carregarTileset';
import { desenharMapaDeJogo, type MapaParaDesenhar } from '@/components/mestre/desenharMapaDeJogo';

type Token = () => Promise<string | null>;

/** O que o servidor devolve em /api/campanha/estado e ao atravessar uma porta. */
interface RespostaDoMundo {
  iniciada: boolean;
  mensagem?: string;
  progresso?: ProgressoDaCampanha;
  mapa?: { id: string; nome: string; dados: MapaDados };
  tilesets?: ({ id: string; dados: TilesetDados } | null)[];
}

interface MundoAberto extends MapaParaDesenhar {
  id: string;
  nome: string;
}

const OURO = '#C8A656';
const TECLAS: Readonly<Record<string, Direcao>> = {
  ArrowUp: 'cima', ArrowDown: 'baixo', ArrowLeft: 'esquerda', ArrowRight: 'direita',
  w: 'cima', s: 'baixo', a: 'esquerda', d: 'direita',
};
const VERIFICA_O_SALVAMENTO_A_CADA_MS = 5_000;
const RENOVA_O_TOKEN_A_CADA_MS = 4 * 60_000;

const nomeDoItem = (id: string) => id.replace(/-/g, ' ');
const novoCombateId = () => `camp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const abertosDoMapa = (p: ProgressoDaCampanha) => p.baus.filter((b) => b.startsWith(`${p.mapaId}:`)).map((b) => b.slice(p.mapaId.length + 1));

async function abrirMundo(r: RespostaDoMundo): Promise<MundoAberto | null> {
  if (!r.mapa) return null;
  const tilesets = await Promise.all(
    (r.tilesets ?? []).map(async (t) => {
      if (!t) return null;
      try {
        return { dados: t.dados, imagem: await carregarImagem(origemDaImagem(t.dados)) };
      } catch {
        return null; // a imagem não abriu: o mapa é desenhado sem esse tileset
      }
    })
  );
  return { id: r.mapa.id, nome: r.mapa.nome, mapa: { ...r.mapa.dados, objetos: r.mapa.dados.objetos ?? [] }, tilesets };
}

/**
 * Campanha (5.5): o jogador anda pelo mapa PUBLICADO. O celular manda no movimento; o servidor só guarda a posição em
 * checkpoints raros (ver `lib/salvamentoCampanha`) e confere as ações que valem: baú e porta, que já levam a posição
 * junto (uma gravação só). Lutas ainda não existem: a área de monstros só avisa.
 */
export function CampanhaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [mundo, setMundo] = useState<MundoAberto | null>(null);
  const [jogo, setJogo] = useState<EstadoDeJogo | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<{ titulo: string; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tamanho, setTamanho] = useState({ largura: 320, altura: 320 });

  // o que o salvamento precisa saber sem causar nova renderização
  const jogoRef = useRef<EstadoDeJogo | null>(null);
  const salvaRef = useRef<PontoDaCampanha | null>(null);
  const ultimoPassoRef = useRef(0);
  const ultimoSalvamentoRef = useRef(0);
  const tokenRef = useRef<{ valor: string; em: number } | null>(null);
  /** Áreas de monstros descansando: "mapa:objeto" e até quando (ms). O servidor é quem manda; isto só evita perguntar à toa. */
  const descansosRef = useRef<Record<string, number>>({});

  const token = useCallback(async () => {
    const agora = Date.now();
    if (!tokenRef.current || agora - tokenRef.current.em > RENOVA_O_TOKEN_A_CADA_MS) {
      const valor = await tokenFresco();
      if (valor) tokenRef.current = { valor, em: agora };
    }
    return tokenRef.current?.valor ?? null;
  }, [tokenFresco]);

  const chamar = useCallback(
    async (url: string, corpo?: unknown): Promise<{ ok: boolean; status: number; dados: Record<string, unknown> }> => {
      try {
        const t = await token();
        const res = await fetch(url, {
          method: corpo === undefined ? 'GET' : 'POST',
          headers: { Authorization: `Bearer ${t ?? ''}`, 'Content-Type': 'application/json' },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
        });
        return { ok: res.ok, status: res.status, dados: ((await res.json().catch(() => ({}))) as Record<string, unknown>) ?? {} };
      } catch {
        return { ok: false, status: 0, dados: { error: 'Sem conexão. Tente de novo.' } };
      }
    },
    [token]
  );

  /** Coloca o jogador no mapa que o servidor mandou, no ponto salvo. */
  const entrar = useCallback(async (r: RespostaDoMundo) => {
    const aberto = await abrirMundo(r);
    if (!aberto || !r.progresso) return false;
    const estado = iniciarJogo(aberto.id, aberto.mapa, { x: r.progresso.x, y: r.progresso.y });
    const novo = { ...estado, abertos: abertosDoMapa(r.progresso) };
    jogoRef.current = novo;
    salvaRef.current = { mapaId: aberto.id, x: r.progresso.x, y: r.progresso.y };
    descansosRef.current = { ...(r.progresso.descansos ?? {}) };
    ultimoSalvamentoRef.current = Date.now();
    ultimoPassoRef.current = Date.now();
    setMundo(aberto);
    setJogo(novo);
    return true;
  }, []);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      const r = await chamar('/api/campanha/estado');
      if (cancelado) return;
      if (!r.ok) return setErro(String(r.dados.error ?? 'Não foi possível abrir a Campanha agora.'));
      const estado = r.dados as unknown as RespostaDoMundo;
      if (!estado.iniciada) return setMensagem(estado.mensagem ?? 'A Campanha ainda não começou.');
      if (!(await entrar(estado)) && !cancelado) setErro('O mapa da Campanha não pôde ser aberto.');
    })();
    return () => {
      cancelado = true;
    };
  }, [chamar, entrar]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 3000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  // ---- salvamento econômico ----

  const salvar = useCallback(
    async (saindo: boolean) => {
      const j = jogoRef.current;
      if (!j) return;
      const posicao = { mapaId: j.mapaId, x: j.x, y: j.y };
      if (!deveSalvarPosicao({ agora: Date.now(), posicao, salva: salvaRef.current, ultimoPassoEm: ultimoPassoRef.current, ultimoSalvamentoEm: ultimoSalvamentoRef.current, saindo })) return;
      ultimoSalvamentoRef.current = Date.now(); // evita repetir enquanto este pedido está a caminho
      try {
        // keepalive: o pedido segue mesmo se a página fechar; o token já está guardado, sem esperar rede
        const t = tokenRef.current?.valor ?? (saindo ? null : await token());
        if (!t) return;
        const res = await fetch('/api/campanha/posicao', { method: 'POST', keepalive: saindo, headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(posicao) });
        if (res.ok) salvaRef.current = posicao;
        else ultimoSalvamentoRef.current = 0; // tenta de novo no próximo ciclo
      } catch {
        ultimoSalvamentoRef.current = 0;
      }
    },
    [token]
  );

  useEffect(() => {
    const ciclo = window.setInterval(() => void salvar(false), VERIFICA_O_SALVAMENTO_A_CADA_MS);
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') void salvar(true);
    };
    const aoSair = () => void salvar(true);
    document.addEventListener('visibilitychange', aoEsconder);
    window.addEventListener('pagehide', aoSair);
    return () => {
      window.clearInterval(ciclo);
      document.removeEventListener('visibilitychange', aoEsconder);
      window.removeEventListener('pagehide', aoSair);
      void salvar(true); // saiu desta tela (voltou ao hub)
    };
  }, [salvar]);

  // ---- tela ----

  useEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa) return;
    const medir = () => setTamanho({ largura: caixa.clientWidth, altura: caixa.clientHeight });
    medir();
    const o = new ResizeObserver(medir);
    o.observe(caixa);
    return () => o.disconnect();
  }, [mundo]);

  const lado = mundo ? Math.max(16, Math.floor(Math.min(tamanho.largura / Math.min(mundo.mapa.largura, 11), tamanho.altura / Math.min(mundo.mapa.altura, 11)))) : 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mundo || !jogo) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(tamanho.largura * dpr);
    canvas.height = Math.round(tamanho.altura * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    desenharMapaDeJogo(ctx, mundo, jogo, tamanho.largura, tamanho.altura, lado);
  }, [mundo, jogo, tamanho, lado]);

  // ---- ações ----

  const tratar = useCallback(
    async (eventos: EventoDeJogo[], antes: EstadoDeJogo, depois: EstadoDeJogo) => {
      const posicao = { mapaId: depois.mapaId, x: depois.x, y: depois.y };
      for (const e of eventos) {
        if (e.tipo === 'texto') {
          setDialogo({ titulo: e.titulo, texto: e.texto });
        } else if (e.tipo === 'bau-vazio') {
          setDialogo({ titulo: 'Baú', texto: 'O baú está vazio.' });
        } else if (e.tipo === 'nada') {
          setDialogo({ titulo: 'Nada aqui', texto: e.motivo });
        } else if (e.tipo === 'luta') {
          const chave = `${depois.mapaId}:${e.objetoId}`;
          if ((descansosRef.current[chave] ?? 0) > Date.now()) {
            setAviso('Esta área está calma por enquanto.');
            continue;
          }
          setOcupado(true);
          const combateId = novoCombateId();
          let r = await chamar('/api/campanha/lutar', { objetoId: e.objetoId, posicao, combateId });
          if (r.status === 0) r = await chamar('/api/campanha/lutar', { objetoId: e.objetoId, posicao, combateId }); // sem conexão: tenta de novo com o mesmo id (não paga duas vezes)
          setOcupado(false);
          if (!r.ok) {
            if (typeof r.dados.descansaAte === 'number') {
              descansosRef.current[chave] = r.dados.descansaAte;
              setAviso(String(r.dados.error));
            } else {
              setDialogo({ titulo: 'Luta', texto: String(r.dados.error ?? 'Não foi possível lutar agora.') });
            }
            continue;
          }
          const c = r.dados.campanha as { vencedor: 'personagem' | 'monstro'; monstroNome: string; xpGanho: number; ouroGanho: number; progresso: ProgressoDaCampanha; descansaAte: number };
          const mensagens = (r.dados.mensagens as string[] | undefined) ?? [];
          descansosRef.current = { ...(c.progresso.descansos ?? {}) };
          salvaRef.current = { mapaId: c.progresso.mapaId, x: c.progresso.x, y: c.progresso.y };
          ultimoSalvamentoRef.current = Date.now();
          if (c.vencedor === 'monstro') {
            // derrota: volta ao último ponto salvo, sem perder nada
            const volta = { ...depois, x: c.progresso.x, y: c.progresso.y };
            jogoRef.current = volta;
            setJogo(volta);
            setDialogo({ titulo: `Luta: ${c.monstroNome}`, texto: `Você foi derrotado por ${c.monstroNome}.\nNada foi perdido: você voltou ao último ponto salvo. A área descansa por alguns minutos.` });
          } else {
            const subiu = mensagens.filter((m) => m.includes('SUBIU DE NÍVEL'));
            setDialogo({ titulo: `Luta: ${c.monstroNome}`, texto: [`Vitória! +${c.xpGanho} XP e +${c.ouroGanho} de ouro.`, ...subiu].join('\n') });
          }
        } else if (e.tipo === 'item') {
          setOcupado(true);
          const r = await chamar('/api/campanha/bau', { objetoId: e.objetoId, posicao });
          setOcupado(false);
          if (r.ok) {
            salvaRef.current = posicao;
            ultimoSalvamentoRef.current = Date.now();
            setDialogo({ titulo: 'Baú', texto: `Você encontrou ${e.item.qtd} × ${nomeDoItem(e.item.id)}.` });
          } else {
            jogoRef.current = { ...depois, abertos: antes.abertos };
            setJogo(jogoRef.current); // o baú não abriu: volta a ficar fechado
            setDialogo({ titulo: 'Baú', texto: String(r.dados.error ?? 'Não foi possível abrir o baú agora.') });
          }
        } else if (e.tipo === 'porta') {
          setOcupado(true);
          const r = await chamar('/api/campanha/porta', { objetoId: e.objetoId, posicao });
          if (r.ok && (await entrar(r.dados as unknown as RespostaDoMundo))) {
            setOcupado(false);
            return; // chegou ao outro mapa: o resto dos eventos não vale mais
          }
          setOcupado(false);
          setDialogo({ titulo: 'Porta', texto: String(r.dados.error ?? 'Esta passagem está fechada por enquanto.') });
        }
      }
    },
    [chamar, entrar]
  );

  const passo = useCallback(
    (dir: Direcao) => {
      const atual = jogoRef.current;
      if (!atual || dialogo || ocupado) return;
      const r = andar(atual, dir);
      jogoRef.current = r.estado;
      setJogo(r.estado);
      if (r.estado.x !== atual.x || r.estado.y !== atual.y) ultimoPassoRef.current = Date.now();
      if (r.eventos.length) void tratar(r.eventos, atual, r.estado);
    },
    [dialogo, ocupado, tratar]
  );

  const acao = useCallback(() => {
    const atual = jogoRef.current;
    if (!atual || ocupado) return;
    if (dialogo) return setDialogo(null);
    const r = interagir(atual);
    jogoRef.current = r.estado;
    setJogo(r.estado);
    ultimoPassoRef.current = Date.now();
    if (r.eventos.length) void tratar(r.eventos, atual, r.estado);
  }, [dialogo, ocupado, tratar]);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
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
      <header className="flex items-center gap-2 px-2 py-1.5 border-b" style={{ borderColor: `${OURO}44` }}>
        <Link href="/hud" aria-label="Voltar ao hub" className="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-cinzel font-bold" style={{ borderColor: OURO, color: '#E6C775' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Hub
        </Link>
        <h1 className="text-[13px] font-cinzel font-bold truncate" style={{ color: '#F5E3B3' }}>{mundo?.nome ?? 'História'}</h1>
      </header>

      <div ref={caixaRef} className="flex-1 min-h-0 relative">
        {mundo && jogo ? (
          <canvas ref={canvasRef} aria-label={`Mapa ${mundo.nome}`} className="absolute inset-0 w-full h-full" />
        ) : erro ? (
          <p role="alert" className="p-4 text-[13px]" style={{ color: '#E5736B' }}>{erro}</p>
        ) : mensagem ? (
          <p className="p-4 text-[13px]" style={{ color: colors.text.secondary }}>{mensagem}</p>
        ) : (
          <p className="p-4 text-[13px]" style={{ color: colors.text.secondary }}>Abrindo o mundo...</p>
        )}
        {aviso && !dialogo && (
          <p role="status" className="absolute left-2 right-2 top-2 rounded-sm border px-2 py-1 text-[12px]" style={{ backgroundColor: colors.background.secondary, borderColor: OURO }}>{aviso}</p>
        )}
        {dialogo && (
          <div role="dialog" aria-label={dialogo.titulo} className="absolute left-2 right-2 bottom-2 rounded-sm border-2 p-3 flex flex-col gap-1.5" style={{ backgroundColor: colors.background.secondary, borderColor: OURO }}>
            <strong className="font-cinzel text-[13px]" style={{ color: '#F5E3B3' }}>{dialogo.titulo}</strong>
            <p className="text-[13px] whitespace-pre-wrap">{dialogo.texto}</p>
            <button type="button" onClick={() => setDialogo(null)} className="self-end px-3 py-1 rounded text-[11px] font-bold" style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}>Continuar</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-3 border-t" style={{ borderColor: `${OURO}44` }}>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Direção">
          <span />
          <button type="button" aria-label="Andar para cima" disabled={!jogo || ocupado} onClick={() => passo('cima')} className={botao} style={estiloBotao}><ArrowUp className="w-6 h-6" /></button>
          <span />
          <button type="button" aria-label="Andar para a esquerda" disabled={!jogo || ocupado} onClick={() => passo('esquerda')} className={botao} style={estiloBotao}><ArrowLeft className="w-6 h-6" /></button>
          <button type="button" aria-label="Andar para baixo" disabled={!jogo || ocupado} onClick={() => passo('baixo')} className={botao} style={estiloBotao}><ArrowDown className="w-6 h-6" /></button>
          <button type="button" aria-label="Andar para a direita" disabled={!jogo || ocupado} onClick={() => passo('direita')} className={botao} style={estiloBotao}><ArrowRight className="w-6 h-6" /></button>
        </div>
        <button type="button" aria-label="Interagir" disabled={!jogo || ocupado} onClick={acao} className="w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center font-cinzel font-bold text-[11px] disabled:opacity-50" style={{ backgroundColor: colors.accent.primary, borderColor: OURO, color: colors.background.secondary }}>
          <Hand className="w-6 h-6" /> {dialogo ? 'Continuar' : 'Interagir'}
        </button>
      </div>
    </main>
  );
}
