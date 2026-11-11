'use client';

import React from 'react';
import { ABAS_DA_FICHA_UI } from '@/assets/personagemUi';
import { TEXTOS_DA_FICHA, textoDaFicha } from '@/rules/textosDaFicha';
import { NIVEL_DA_ALMA } from '@/rules/almas';

export type AbaFicha = 'personagem' | 'equipamentos' | 'emblemas' | 'alma';

interface FichaSidebarProps {
  className?: string;
  /** A aba Alma (7.8) abre na mesma página, mas só tem cartas a partir do nível 25: antes disso ela avisa e fica apagada. */
  almaLiberada?: boolean;
  /** Aba aberta. Sem `onMudarAba`, só a aba Personagem funciona. */
  aba?: AbaFicha;
  onMudarAba?: (aba: AbaFicha) => void;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/**
 * As abas da ficha na barra de cima (arte do Yuri, sem texto): Personagem, Equipamentos, Emblemas e Alma. A aba aberta
 * brilha; as outras ficam apagadas. O nome de cada aba só aparece para quem usa leitor de tela.
 */
export function FichaSidebar({ className = '', aba = 'personagem', onMudarAba, almaLiberada = false }: FichaSidebarProps) {
  const t = TEXTOS_DA_FICHA.abas;
  const botoes = [
    { id: 'personagem' as const, rotulo: t.personagem, src: ABAS_DA_FICHA_UI.personagem, ativa: aba === 'personagem' },
    { id: 'equipamentos' as const, rotulo: t.equipamentos, src: ABAS_DA_FICHA_UI.equipamentos, ativa: aba === 'equipamentos' },
    { id: 'emblemas' as const, rotulo: t.emblemas, src: ABAS_DA_FICHA_UI.emblemas, ativa: aba === 'emblemas' },
    { id: 'alma' as const, rotulo: almaLiberada ? t.alma : textoDaFicha(t.almaBloqueada, { nivel: NIVEL_DA_ALMA }), src: ABAS_DA_FICHA_UI.alma, ativa: aba === 'alma' },
  ];
  return (
    <nav aria-label={TEXTOS_DA_FICHA.navegacao} className={`flex items-center gap-[0.8cqw] ${className}`}>
      {botoes.map((b) => {
        const alma = b.id === 'alma';
        // a aba aberta e as que a ficha não sabe trocar ficam desligadas (aria-disabled), como antes
        const clicavel = !!onMudarAba && !b.ativa;
        return (
          <button
            key={b.id}
            type="button"
            aria-label={b.rotulo}
            aria-current={b.ativa ? 'page' : undefined}
            aria-disabled={clicavel ? undefined : true}
            tabIndex={clicavel ? undefined : -1}
            onClick={() => {
              if (!clicavel) return;
              onMudarAba?.(b.id);
            }}
            className={`relative block w-[9.6cqw] shrink-0 active:translate-y-px ${clicavel ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="block w-full h-auto select-none pointer-events-none"
              style={{
                ...pixel,
                // só a moldura da aba Personagem existe acesa: quando outra aba está aberta, ela fica apagada por filtro
                filter: b.ativa ? 'drop-shadow(0 0 1.4cqw rgba(255,180,60,0.85))' : b.id === 'personagem' ? 'saturate(0.15) brightness(0.55)' : alma && !almaLiberada ? 'brightness(0.6)' : undefined,
              }}
            />
          </button>
        );
      })}
    </nav>
  );
}
