'use client';

import React from 'react';
import { DESENVOLVIMENTO_MENU, DesenvolvimentoMenuItem, DesenvolvimentoSecaoId } from '@/rules/desenvolvimentoMenu';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { NotificationDot } from '@/components/NotificationDot';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';

interface DesenvolvimentoMenuProps {
  secaoAtiva: DesenvolvimentoSecaoId;
  onSelectSecao: (id: DesenvolvimentoSecaoId) => void;
  pontosDisponiveis: number;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** O menu das seções do Desenvolvimento em pixel: uma aba do kit para cada seção (ícone e nome), a aberta acesa. */
export function DesenvolvimentoMenu({ secaoAtiva, onSelectSecao, pontosDisponiveis, className = '' }: DesenvolvimentoMenuProps) {
  return (
    <nav aria-label={TEXTOS_DA_FICHA.desenvolvimentoTela.menu} className={`flex flex-col gap-[1.4cqw] w-full select-none ${className}`}>
      {DESENVOLVIMENTO_MENU.map((item: DesenvolvimentoMenuItem) => {
        const ativo = secaoAtiva === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => item.disponivel && onSelectSecao(item.id)}
            disabled={!item.disponivel}
            aria-current={ativo ? 'page' : undefined}
            className={`relative block w-full font-cinzel font-extrabold leading-[1.3] text-center ${ativo ? 'text-[#0A1A22]' : 'text-[#9CC4E0]'} ${item.disponivel ? 'cursor-pointer active:translate-y-px' : 'cursor-not-allowed opacity-45'}`}
            style={{ borderStyle: 'solid', borderWidth: '2cqw 1.6cqw', borderImage: `url(${ativo ? KIT_DA_FORJA.abaAtiva : KIT_DA_FORJA.aba}) 20 24 fill / 2cqw 1.6cqw stretch`, fontSize: '1.9cqw', ...pixel }}
          >
            {item.id === 'atributos' && <NotificationDot visible={pontosDisponiveis > 0} className="-top-[1.6cqw] -right-[1.2cqw] z-30" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.icone} alt="" aria-hidden="true" draggable={false} className="block mx-auto w-[8cqw] h-[8cqw] object-contain mb-[0.8cqw] pointer-events-none" style={{ ...pixel, opacity: ativo ? 1 : 0.8 }} />
            <span className="block">{item.label}</span>
            {!item.disponivel && <span className="block mt-[0.4cqw] text-[1.6cqw] italic opacity-80">Em breve</span>}
          </button>
        );
      })}
    </nav>
  );
}
