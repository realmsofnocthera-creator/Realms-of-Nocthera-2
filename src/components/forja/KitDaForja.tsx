'use client';

import React from 'react';
import { FUNDO_DA_FERRARIA } from '@/assets/ferreiro';
import { KIT_DA_FORJA, MOLDURA_ESCOLHIDA, MOLDURAS_DE_SLOT, PLACAS_DE_RARIDADE } from '@/assets/forjaUi';
import { HUD_ICONS } from '@/assets/hud';
import type { RaridadeArma } from '@/rules/armas';
import { formatarCompacto, formatarTotal } from '@/rules/numerosCompactos';

/** Cores do kit da Forja (azul e dourado). */
export const AZUL_CLARO = '#BFE3FF';
export const CIANO = '#6FE3EE';
export const DOURADO = '#E7C46A';
const SOMBRA = '[text-shadow:1px_1px_0_#05070D]';
export const TEXTO_PIXEL = `font-[family-name:var(--font-silk)] ${SOMBRA}`;

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** O fundo da Forja: a ferraria bem escurecida, cobrindo a tela. */
export function FundoDaForja() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FUNDO_DA_FERRARIA} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={pixel} />
      <span aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(5,8,18,0.86) 0%, rgba(7,12,26,0.9) 100%)' }} />
    </>
  );
}

/** O painel do kit (moldura dourada com o fundo azul-noite), esticado em 9 fatias. */
export function PainelDaForja({ children, className = '', style, as: Tag = 'div', ...resto }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties; as?: 'div' | 'section' | 'article' } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      {...resto}
      className={className}
      style={{ borderStyle: 'solid', borderWidth: 16, borderImage: `url(${KIT_DA_FORJA.painel}) 44 fill / 16px stretch`, ...pixel, ...style }}
    >
      {children}
    </Tag>
  );
}

/** A barra de título (emblema de cristal e a barra dourada) com o título à esquerda e, opcional, o ouro à direita. */
export function BarraDeTitulo({ titulo, ouro, className = '' }: { titulo: string; ouro?: number; className?: string }) {
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio: '582 / 131' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KIT_DA_FORJA.titulo} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={pixel} />
      <h1 className={`absolute flex items-center font-cinzel font-extrabold uppercase tracking-wider leading-none text-[#DFF3FF] text-[clamp(11px,3.3vw,16px)] ${SOMBRA}`} style={{ left: '34%', top: '24%', height: '50%', maxWidth: ouro !== undefined ? '40%' : '56%' }}>
        <span className="truncate">{titulo}</span>
      </h1>
      {ouro !== undefined && (
        <span aria-label={`Ouro: ${formatarTotal(ouro)}`} title={formatarTotal(ouro)} className={`absolute flex items-center justify-end gap-1 ${TEXTO_PIXEL} text-[12px] font-bold text-[#F5F3E0] tabular-nums`} style={{ right: '8%', top: '24%', height: '50%', width: '22%' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HUD_ICONS.ouro} alt="" aria-hidden="true" className="w-4 h-4 object-contain shrink-0" style={pixel} />
          {formatarCompacto(ouro)}
        </span>
      )}
    </div>
  );
}

/** A faixa de abas (a ativa em ciano). */
export function Abas<T extends string>({ abas, ativa, aoMudar, rotulo }: { abas: readonly { id: T; nome: string; rotuloAcessivel?: string }[]; ativa: T; aoMudar: (id: T) => void; rotulo: string }) {
  return (
    <nav aria-label={rotulo} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${abas.length}, 1fr)` }}>
      {abas.map((a) => {
        const on = a.id === ativa;
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={on}
            aria-label={a.rotuloAcessivel}
            onClick={() => aoMudar(a.id)}
            className={`font-cinzel font-extrabold uppercase text-[11px] leading-none py-2.5 cursor-pointer ${on ? 'text-[#0A1A22]' : 'text-[#9CC4E0]'}`}
            style={{ borderStyle: 'solid', borderWidth: '8px 12px', borderImage: `url(${on ? KIT_DA_FORJA.abaAtiva : KIT_DA_FORJA.aba}) 20 24 fill / 8px 12px stretch`, ...pixel }}
          >
            {a.nome}
          </button>
        );
      })}
    </nav>
  );
}

/** A placa do nome na cor da raridade, esticada nas pontas. */
export function PlacaDeRaridade({ raridade, children, className = '' }: { raridade: RaridadeArma; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-center text-center px-6 py-3 ${className}`} style={{ borderStyle: 'solid', borderWidth: '0 22px', borderImage: `url(${PLACAS_DE_RARIDADE[raridade]}) 0 34 fill / 0 22px stretch`, minHeight: 50, ...pixel }}>
      {children}
    </div>
  );
}

/** Botão redondo do kit: fechar, voltar. */
export function BotaoRedondo({ tipo, rotulo, onClick, className = 'w-9 h-9' }: { tipo: 'x' | 'voltar'; rotulo: string; onClick?: () => void; className?: string }) {
  return (
    <button type="button" aria-label={rotulo} onClick={onClick} className={`cursor-pointer active:translate-y-px ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={KIT_DA_FORJA[tipo]} alt="" aria-hidden="true" className="w-full h-full object-contain" style={pixel} />
    </button>
  );
}

/** Botão grande do kit: ciano quando dá para agir, escuro quando não. */
export function BotaoDoKit({ children, onClick, disabled, className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-cinzel font-extrabold uppercase text-[13px] leading-tight px-2 cursor-pointer enabled:active:translate-y-px disabled:cursor-not-allowed ${disabled ? 'text-[#7C8AA0]' : 'text-white [text-shadow:1px_1px_0_#04353E,-1px_1px_0_#04353E,1px_-1px_0_#04353E,-1px_-1px_0_#04353E] forja-botao-pronto'} ${className}`}
      style={{ borderStyle: 'solid', borderWidth: '10px 14px', borderImage: `url(${disabled ? KIT_DA_FORJA.btnEscuro : KIT_DA_FORJA.btnForjar}) 22 30 fill / 10px 14px stretch`, ...pixel }}
    >
      {children}
    </button>
  );
}

/** O slot de uma arma: a moldura da raridade (ciano quando escolhida ou pronta), o ícone dentro e o selo do estado por cima. */
export function SlotDeArma({
  raridade,
  destaque = false,
  apagado = false,
  tamanho = 48,
  children,
  selo,
}: {
  raridade: RaridadeArma;
  destaque?: boolean;
  apagado?: boolean;
  tamanho?: number;
  children?: React.ReactNode;
  selo?: 'tenho' | 'bloqueada' | 'faltaMaterial' | null;
}) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${destaque ? 'forja-pronto' : ''}`} style={{ width: tamanho, height: tamanho, opacity: apagado ? 0.55 : 1 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={destaque ? MOLDURA_ESCOLHIDA : MOLDURAS_DE_SLOT[raridade]} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={pixel} />
      <span className="relative flex items-center justify-center" style={{ width: '62%', height: '62%' }}>{children}</span>
      {selo === 'tenho' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={KIT_DA_FORJA.ok} alt="" aria-hidden="true" className="absolute -top-1.5 -right-1.5 w-[42%] h-[42%]" style={pixel} />
      )}
      {selo === 'bloqueada' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={KIT_DA_FORJA.proibido} alt="" aria-hidden="true" className="absolute -top-1.5 -right-1.5 w-[42%] h-[42%]" style={pixel} />
      )}
      {selo === 'faltaMaterial' && <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-[#E5484D] shadow-[0_0_0_1px_#05070D]" />}
    </span>
  );
}

/** Divisor do kit. */
export function DivisorDaForja({ className = '' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={KIT_DA_FORJA.divisor} alt="" aria-hidden="true" className={`w-full h-2.5 ${className}`} style={{ ...pixel, objectFit: 'fill' }} />;
}
