'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePersonagemAtual } from '@/lib/personagemAtual';
import { marcarTutorialAberto } from '@/lib/tutorialAberto';
import { avancar, gravarProgresso, lerProgresso, oQueMostrar, pularCapitulo, pularTudo, PROGRESSO_VAZIO, type ProgressoDoTutorial } from '@/lib/tutorialProgresso';
import { TEXTOS_DO_TUTORIAL as T } from '@/rules/textosDoTutorial';

/** Quanto esperar o elemento destacado aparecer (uma tela que ainda carrega) antes de mostrar o texto no meio da tela. */
const ESPERA_DO_ALVO_MS = 1800;
const FOLGA = 6;

const seletor = (alvo: string) => `[data-tutorial="${alvo}"]`;
const elementoVisivel = (alvo: string): HTMLElement | null => {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(seletor(alvo)))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
};

interface Caixa {
  x: number;
  y: number;
  l: number;
  a: number;
}

/**
 * O guia do tutorial, em todas as telas: escurece a tela, destaca onde tocar (com o contorno dourado pulsando) e mostra o texto do passo, com
 * "Próximo", "Pular este tutorial" e "Pular todos". Num passo "tocar" só o destaque responde ao toque, e tocar nele avança (e faz o que o botão faz
 * de verdade). O progresso fica no aparelho (ver `tutorialProgresso`).
 */
export function TutorialGuia() {
  const caminho = usePathname() ?? '';
  const personagem = usePersonagemAtual();
  const [progresso, setProgresso] = useState<ProgressoDoTutorial>(PROGRESSO_VAZIO);
  const [carregado, setCarregado] = useState<string | null>(null);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [desistiuDoAlvo, setDesistiuDoAlvo] = useState(false);
  const [confirmarPularTudo, setConfirmarPularTudo] = useState(false);
  const [, setTique] = useState(0);
  const alvoRef = useRef<HTMLElement | null>(null);

  // o progresso do personagem que está na tela
  useEffect(() => {
    if (!personagem) return;
    setProgresso(lerProgresso(personagem.uid));
    setCarregado(personagem.uid);
  }, [personagem]);
  // pedido de recomeço (o botão "Rever tutoriais" do Menu)
  useEffect(() => {
    const recarregar = () => personagem && setProgresso(lerProgresso(personagem.uid));
    window.addEventListener('nocthera:tutorial', recarregar);
    return () => window.removeEventListener('nocthera:tutorial', recarregar);
  }, [personagem]);

  const mudar = useCallback((f: (p: ProgressoDoTutorial) => ProgressoDoTutorial) => {
    setProgresso((p) => {
      const novo = f(p);
      if (personagem) gravarProgresso(personagem.uid, novo);
      return novo;
    });
    setConfirmarPularTudo(false);
  }, [personagem]);

  // a tela muda (elementos aparecem e somem): olha de novo a cada pouco
  useEffect(() => {
    const id = window.setInterval(() => setTique((t) => t + 1), 300);
    return () => window.clearInterval(id);
  }, []);

  const pronto = !!personagem && carregado === personagem.uid;
  const agora = pronto ? oQueMostrar(progresso, personagem!.nivel, caminho, (a) => !!elementoVisivel(a)) : null;
  const chave = agora ? `${agora.capitulo.id}:${agora.passo}` : '';
  const alvo = agora?.dado.alvo;

  // um passo novo: dá um tempo para o elemento aparecer
  useEffect(() => {
    setDesistiuDoAlvo(false);
    if (!chave) return;
    const id = window.setTimeout(() => setDesistiuDoAlvo(true), ESPERA_DO_ALVO_MS);
    return () => window.clearTimeout(id);
  }, [chave]);

  // onde está o destaque
  useLayoutEffect(() => {
    if (!alvo) {
      alvoRef.current = null;
      setCaixa(null);
      return;
    }
    const el = elementoVisivel(alvo);
    alvoRef.current = el;
    if (!el) {
      setCaixa(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setCaixa((c) => (c && Math.abs(c.x - r.left) < 1 && Math.abs(c.y - r.top) < 1 && Math.abs(c.l - r.width) < 1 && Math.abs(c.a - r.height) < 1 ? c : { x: r.left, y: r.top, l: r.width, a: r.height }));
  });

  // num passo "tocar", tocar no destaque avança (o toque segue para o botão)
  const tocar = !!agora?.dado.tocar && !!caixa;
  useEffect(() => {
    if (!tocar || !agora) return;
    const aoTocar = (e: Event) => {
      const el = alvoRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) mudar((p) => avancar(p, agora.capitulo.id, agora.passo));
    };
    document.addEventListener('click', aoTocar, true);
    return () => document.removeEventListener('click', aoTocar, true);
  }, [tocar, agora, mudar]);

  const visivel = !!agora && !(alvo && !caixa && !desistiuDoAlvo);
  return <GuiaNaTela visivel={visivel}>{visivel && agora ? desenhar() : null}</GuiaNaTela>;

  function desenhar() {
  if (!agora) return null;

  const { capitulo, passo, dado } = agora;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  const furo = caixa ? { x: caixa.x - FOLGA, y: caixa.y - FOLGA, l: caixa.l + FOLGA * 2, a: caixa.a + FOLGA * 2 } : null;
  const embaixo = furo ? furo.y + furo.a / 2 < vh * 0.5 : false;
  const largura = Math.min(vw - 24, 360);
  const ultimo = passo === capitulo.passos.length - 1;

  return (
    <div className="fixed inset-0 z-[300] pointer-events-none" role="dialog" aria-label={`${T.tutorial}: ${dado.titulo}`} aria-live="polite">
      <style>{'@keyframes tutorialPulso{0%,100%{box-shadow:0 0 0 2px #F3C769,0 0 10px 2px rgba(243,199,105,.7)}50%{box-shadow:0 0 0 3px #FFE9A0,0 0 22px 6px rgba(255,233,160,.9)}}'}</style>
      {/* o escuro, com o furo no destaque */}
      {furo ? (
        <>
          <div className="absolute" style={{ left: furo.x, top: furo.y, width: furo.l, height: furo.a, borderRadius: 10, boxShadow: '0 0 0 200vmax rgba(4,3,8,.66)' }} />
          <div className="absolute" style={{ left: furo.x, top: furo.y, width: furo.l, height: furo.a, borderRadius: 10, animation: 'tutorialPulso 1.4s ease-in-out infinite' }} />
          {/* o que bloqueia o toque fora do destaque (no passo "tocar", o destaque fica livre) */}
          {tocar ? (
            <>
              <div className="absolute pointer-events-auto" style={{ left: 0, top: 0, width: '100%', height: Math.max(0, furo.y) }} />
              <div className="absolute pointer-events-auto" style={{ left: 0, top: furo.y + furo.a, width: '100%', bottom: 0 }} />
              <div className="absolute pointer-events-auto" style={{ left: 0, top: furo.y, width: Math.max(0, furo.x), height: furo.a }} />
              <div className="absolute pointer-events-auto" style={{ left: furo.x + furo.l, top: furo.y, right: 0, height: furo.a }} />
            </>
          ) : (
            <div className="absolute inset-0 pointer-events-auto" />
          )}
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-auto" style={{ backgroundColor: 'rgba(4,3,8,.66)' }} />
      )}

      {/* o texto do passo */}
      <div className="absolute pointer-events-auto font-cinzel" style={{
        left: (vw - largura) / 2, width: largura,
        ...(furo ? (embaixo ? { top: Math.min(vh - 210, furo.y + furo.a + 12) } : { bottom: Math.min(vh - 210, vh - furo.y + 12) }) : { top: '50%', transform: 'translateY(-50%)' }),
        backgroundColor: 'rgba(18,13,22,.97)', border: '2px solid #C8A656', boxShadow: 'inset 0 0 0 1px #3a2a10, 0 8px 28px rgba(0,0,0,.8)', padding: '12px 14px 10px', color: '#F5E3B3',
      }}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-black text-[15px] leading-tight" style={{ color: '#F3C769' }}>{dado.titulo}</h2>
          <span className="text-[10px] shrink-0" style={{ color: '#C8A25A' }}>{capitulo.nome} · {passo + 1}/{capitulo.passos.length}</span>
        </div>
        <p className="mt-1.5 text-[13px] leading-snug" style={{ color: '#EDE0C4' }}>{dado.texto}</p>
        {tocar && <p className="mt-1.5 text-[11px] font-bold" style={{ color: '#F3C769' }}>{T.toqueNoDestaque}</p>}
        {confirmarPularTudo ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px]" style={{ color: '#EDE0C4' }}>{T.confirmarPularTudo}</span>
            <span className="flex gap-1.5 shrink-0">
              <button type="button" onClick={() => mudar(pularTudo)} className="px-2.5 py-1 text-[11px] font-black uppercase cursor-pointer" style={{ backgroundColor: '#7a1d12', color: '#FFE3D8', border: '1px solid #c0503c' }}>{T.sim}</button>
              <button type="button" onClick={() => setConfirmarPularTudo(false)} className="px-2.5 py-1 text-[11px] font-black uppercase cursor-pointer" style={{ border: '1px solid #6a5a38', color: '#F5E3B3' }}>{T.nao}</button>
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="flex gap-3">
              <button type="button" onClick={() => mudar((p) => pularCapitulo(p, capitulo.id))} className="text-[11px] underline cursor-pointer" style={{ color: '#C8A25A' }}>{T.pularEste}</button>
              <button type="button" onClick={() => setConfirmarPularTudo(true)} className="text-[11px] underline cursor-pointer" style={{ color: '#C8A25A' }}>{T.pularTodos}</button>
            </span>
            {!tocar && (
              <button type="button" onClick={() => mudar((p) => avancar(p, capitulo.id, passo))} className="px-4 py-1.5 text-[12px] font-black uppercase cursor-pointer shrink-0" style={{ background: 'linear-gradient(180deg,#F3C769,#C8962E)', color: '#2A1A0E', border: '1px solid #7a5a1c' }}>
                {ultimo ? T.entendi : T.proximo}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
  }
}

/** Avisa o resto do jogo (a luta pausa) enquanto o guia está na tela. */
function GuiaNaTela({ visivel, children }: { visivel: boolean; children: React.ReactNode }) {
  useEffect(() => {
    marcarTutorialAberto(visivel);
    return () => marcarTutorialAberto(false);
  }, [visivel]);
  return <>{children}</>;
}
