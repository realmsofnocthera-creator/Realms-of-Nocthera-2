'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { musicaDaRota } from '@/rules/audio';
import { definirAbaVisivel, definirMusica, desbloquear, tocar } from '@/lib/audio/motor';

/**
 * O áudio do jogo, montado uma vez no layout: destrava o som no primeiro toque, toca o clique de interface em todo botão
 * (um botão com data-sem-som fica mudo), troca a música conforme a tela e pausa tudo quando a aba sai de cena.
 */
export function AudioDoJogo() {
  const caminho = usePathname() ?? '/';

  useEffect(() => {
    definirMusica(`rota:${musicaDaRota(caminho).faixas.join(',')}`, musicaDaRota(caminho));
  }, [caminho]);

  useEffect(() => {
    const aoTocar = (e: Event) => {
      desbloquear();
      const alvo = e.target instanceof Element ? e.target.closest('button, [role="button"], a[href]') : null;
      if (alvo && !alvo.closest('[data-sem-som]') && !(alvo as HTMLButtonElement).disabled) tocar('ui_botao_toque');
    };
    const aoMudarAba = () => definirAbaVisivel(document.visibilityState === 'visible');
    window.addEventListener('pointerdown', aoTocar, { capture: true });
    window.addEventListener('keydown', desbloquear, { capture: true });
    document.addEventListener('visibilitychange', aoMudarAba);
    return () => {
      window.removeEventListener('pointerdown', aoTocar, { capture: true });
      window.removeEventListener('keydown', desbloquear, { capture: true });
      document.removeEventListener('visibilitychange', aoMudarAba);
    };
  }, []);

  return null;
}
