'use client';

import React, { useEffect, useRef } from 'react';

/** O pedaço do Cloudflare Turnstile que esta tela usa (o script é carregado do Cloudflare na hora). */
interface ApiDoTurnstile {
  render(el: HTMLElement, opcoes: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: ApiDoTurnstile;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let carregando: Promise<void> | null = null;

function carregarScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!carregando) {
    carregando = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        carregando = null;
        reject(new Error('Turnstile não carregou'));
      };
      document.head.appendChild(s);
    });
  }
  return carregando;
}

/**
 * Anti-bot da criação de personagem (6.5-5). `chave` é a pública que vem de /api/status; sem ela, não mostra nada.
 * Cada token vale uma vez: `reiniciar` muda depois de uma tentativa recusada para pedir um novo.
 */
export function CaixaDoTurnstile({ chave, aoMudar, reiniciar = 0 }: { chave: string | null; aoMudar: (token: string | null) => void; reiniciar?: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const aviso = useRef(aoMudar);
  aviso.current = aoMudar;

  useEffect(() => {
    if (!chave || !caixa.current) return;
    let cancelado = false;
    carregarScript()
      .then(() => {
        if (cancelado || !caixa.current || !window.turnstile) return;
        widget.current = window.turnstile.render(caixa.current, {
          sitekey: chave,
          theme: 'dark',
          language: 'pt-br',
          callback: (token: string) => aviso.current(token),
          'expired-callback': () => aviso.current(null),
          'error-callback': () => aviso.current(null),
        });
      })
      .catch(() => aviso.current(null));
    return () => {
      cancelado = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [chave]);

  useEffect(() => {
    if (reiniciar && widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
      aviso.current(null);
    }
  }, [reiniciar]);

  if (!chave) return null;
  return <div ref={caixa} className="flex justify-center min-h-[65px]" />;
}
