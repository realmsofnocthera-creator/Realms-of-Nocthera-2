'use client';

import React, { useState } from 'react';
import type { LinhaDaReciclagemTela } from '@/lib/forjaTela';
import { PERCENTUAL_DA_RECICLAGEM } from '@/game/reciclagem';
import { BotaoDoKit, TEXTO_PIXEL } from './KitDaForja';
import { IconeDoMaterial } from './IconeDoMaterial';

/**
 * Reciclar um equipamento (arma ou peça de armadura): o botão abre a confirmação com o que volta (30% dos materiais da receita) e só o segundo toque
 * recicla, porque não tem volta. O que está equipado não recicla (o servidor também confere).
 */
export function ReciclarEquipamento({ nome, devolve, equipada, ocupado, onReciclar }: {
  nome: string;
  devolve: readonly LinhaDaReciclagemTela[];
  equipada: boolean;
  ocupado: boolean;
  onReciclar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <section aria-label="Reciclar" className="flex flex-col gap-1">
      <h3 className="font-cinzel font-extrabold uppercase text-[11px] tracking-wider text-[#E7C46A]">Reciclar ({PERCENTUAL_DA_RECICLAGEM}% dos materiais)</h3>
      {equipada ? (
        <p className={`${TEXTO_PIXEL} text-[11px] text-[#FFB4B4]`}>Desequipe este item para poder reciclar.</p>
      ) : !confirmando ? (
        <BotaoDoKit disabled={ocupado} onClick={() => setConfirmando(true)} className="w-full py-1">Reciclar</BotaoDoKit>
      ) : (
        <div role="alertdialog" aria-label={`Confirmar reciclagem de ${nome}`} className="flex flex-col gap-1 p-1.5 border border-[#FF7A7A]/60 bg-[#1A0B0B]/80">
          <p className={`${TEXTO_PIXEL} text-[11px] text-[#F5F3E0]`}>Reciclar {nome}? O item some e não tem volta. Voltam para o inventário:</p>
          {devolve.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-1.5 py-1 bg-[#080C16]/85 border border-[#243B55]">
              <span className="relative w-7 h-7 shrink-0 flex items-center justify-center border border-[#3A5B7A] bg-[#0B0F1A]" aria-hidden="true">
                <IconeDoMaterial id={m.id} nome={m.nome} cor={m.cor} className="w-5 h-5" tamanhoDaInicial="13px" />
              </span>
              <span className="font-cinzel font-bold text-[12px] leading-tight min-w-0 flex-1" style={{ color: m.cor }}>{m.nome}</span>
              <span className={`${TEXTO_PIXEL} text-[12px] font-bold tabular-nums shrink-0 text-[#7BE08C]`}>+{m.qtd}</span>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-1">
            <BotaoDoKit disabled={ocupado} onClick={() => setConfirmando(false)} className="py-1">Cancelar</BotaoDoKit>
            <BotaoDoKit disabled={ocupado} onClick={() => { setConfirmando(false); onReciclar(); }} className="py-1">{ocupado ? 'Reciclando...' : 'Confirmar'}</BotaoDoKit>
          </div>
        </div>
      )}
    </section>
  );
}

/** "+3 Osso Bruto, +1 Presa Gasta": o resumo do que voltou, para o aviso depois de reciclar. */
export function resumoDoQueVoltou(devolvido: Readonly<Record<string, number>>, nomeDe: (id: string) => string): string {
  return Object.entries(devolvido).map(([id, q]) => `+${q} ${nomeDe(id)}`).join(', ');
}
