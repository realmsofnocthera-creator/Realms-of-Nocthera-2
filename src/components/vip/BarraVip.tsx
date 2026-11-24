'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { formatarPontosVip, pontosDoVip, progressoDoVip } from '@/rules/vip';

const OURO = '#C8A656';
const CREME = '#F5E3B3';

/**
 * A barra do VIP: o nível, o nome, os pontos VIP (1 ponto = R$ 1 gasto) e o quanto já andou até o próximo nível (sem dizer quantos pontos faltam).
 * Toda a barra é um botão que leva à tela do VIP. Vai na Loja Premium e embaixo do nome no perfil.
 */
export function BarraVip({ gastoCentavos, href = '/vip', compacta = false }: { gastoCentavos: number | undefined; href?: string; compacta?: boolean }) {
  const p = progressoDoVip(gastoCentavos ?? 0);
  const pontos = pontosDoVip(gastoCentavos ?? 0);
  const maximo = p.proximo === null;
  return (
    <Link
      href={href}
      aria-label={`VIP ${p.nivel}, ${p.nome}, ${formatarPontosVip(pontos)}. Abrir a tela do VIP`}
      className={`relative w-full flex items-center gap-2 rounded-sm border active:translate-y-px ${compacta ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}
      style={{ borderColor: `${OURO}cc`, background: 'linear-gradient(180deg, rgba(48,34,16,.96), rgba(18,13,8,.98))', boxShadow: '0 0 10px rgba(243,177,60,.28), inset 0 0 12px rgba(243,177,60,.1)' }}
    >
      <span className="relative shrink-0" style={{ width: compacta ? 30 : 38, height: compacta ? 31 : 40 }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/perfil/losango.webp" alt="" draggable={false} className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }} />
        <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black" style={{ color: '#FFF1CC', fontSize: compacta ? 12 : 15, textShadow: '0 1px 0 #1a0d2b' }}>{p.nivel}</span>
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2 leading-none">
          <span className="font-cinzel font-black uppercase tracking-wider truncate" style={{ color: CREME, fontSize: compacta ? 10 : 12 }}>VIP · {p.nome}</span>
          <span className="shrink-0 font-bold" style={{ color: '#E9D9AE', fontSize: compacta ? 9 : 10 }}>{formatarPontosVip(pontos)}</span>
        </span>
        <span className="relative block h-2 rounded-sm overflow-hidden" style={{ backgroundColor: '#120d08', border: `1px solid ${OURO}66` }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percentual} aria-label="Progresso para o próximo nível VIP">
          <span className="absolute inset-y-0 left-0" style={{ width: `${p.percentual}%`, background: 'linear-gradient(180deg, #FFE08A, #C98A1E)', boxShadow: '0 0 8px rgba(243,177,60,.7)' }} />
        </span>
        {maximo && <span className="text-[8px] uppercase tracking-widest font-bold" style={{ color: '#9fd4a0' }}>Nível máximo</span>}
      </span>
      <ChevronRight className="shrink-0 w-4 h-4" style={{ color: OURO }} aria-hidden="true" />
    </Link>
  );
}
