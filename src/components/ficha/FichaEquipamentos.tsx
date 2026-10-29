'use client';

import { IconesDeElementos } from '@/components/IconeDeElemento';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { IconeEspaco } from '@/components/equipamento/IconeEspaco';
import {
  ItemEquipamentoTela,
  SlotEquipamento,
  SLOTS_EQUIPAMENTO,
  opcoesDoSlot,
  resumoDoEquipamento,
  slotsDaTela,
} from '@/lib/equipamentoTela';
import { ARMAS_BASE_MAP } from '@/rules/armasCatalogo';

const OURO = '#B2A66C';

/** Categoria da arma equipada, para escolher o ícone (espada, grimório ou cajado). */
function categoriaDaArma(c: Pick<CharacterDocument, 'armas' | 'equipamento'>, item: ItemEquipamentoTela | null) {
  if (!item || item.slot !== 'arma') return undefined;
  const a = (c.armas ?? []).find((x) => x.id === item.id);
  return a && ARMAS_BASE_MAP[a.baseId] ? a.categoria : undefined;
}

/** Coluna dos 6 espaços (arma e as 5 peças), no lugar da moldura de atributos. Toque abre a escolha do item. */
export function FichaSlotsEquipamento({
  character,
  onAbrirSlot,
}: {
  character: CharacterDocument;
  onAbrirSlot: (slot: SlotEquipamento) => void;
}) {
  const slots = slotsDaTela(character);
  return (
    <section
      aria-label="Espaços de equipamento"
      className="w-[clamp(168px,44vw,218px)] rounded-lg p-1.5 border flex flex-col gap-1"
      style={{ borderColor: `${OURO}66`, background: 'linear-gradient(160deg, rgba(28,24,20,0.94) 0%, rgba(13,13,13,0.95) 100%)' }}
    >
      {slots.map((s) => {
        const cor = s.equipado?.cor ?? `${OURO}55`;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onAbrirSlot(s.id)}
            aria-label={s.equipado ? `${s.nome}: ${s.equipado.nome}. Trocar` : `${s.nome}: vazio. ${s.disponiveis} disponíveis`}
            className="flex items-center gap-2 rounded-md border px-1.5 py-1 min-h-[42px] text-left cursor-pointer active:scale-[0.98] transition-transform"
            style={{ borderColor: cor, borderStyle: s.equipado ? 'solid' : 'dashed', backgroundColor: 'rgba(13,13,13,0.7)' }}
          >
            <span className="w-7 h-7 shrink-0 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
              <IconeEspaco espaco={s.id} categoria={categoriaDaArma(character, s.equipado)} className="w-[18px] h-[18px]" style={{ color: s.equipado ? s.equipado.cor : OURO }} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block font-cinzel text-[8.5px] uppercase tracking-wider" style={{ color: OURO }}>{s.nome}</span>
              <span className="block text-[10.5px] font-semibold truncate" style={{ color: s.equipado ? s.equipado.cor : '#8d8574' }}>
                {s.equipado ? s.equipado.nome : s.disponiveis > 0 ? `Vazio (${s.disponiveis})` : 'Vazio'}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}

/** Resumo do que o equipamento soma: HP, defesa, atributos, percentuais, elemento, status e habilidades de armadura. */
export function FichaResumoEquipamento({ character, className = '' }: { character: CharacterDocument; className?: string }) {
  const r = resumoDoEquipamento(character);
  return (
    <section
      aria-label="Resumo do equipamento"
      className={`w-full rounded-lg border px-2 py-1.5 flex flex-col gap-1 ${className}`}
      style={{ borderColor: `${OURO}66`, background: 'linear-gradient(160deg, rgba(28,24,20,0.94) 0%, rgba(13,13,13,0.95) 100%)' }}
    >
      {r.vazio ? (
        <p className="text-[11px] text-center py-1" style={{ color: '#D5C7A4' }}>
          Nada equipado. Toque num espaço para equipar uma arma ou uma peça de armadura.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1 text-center">
            <Celula rotulo="HP" valor={r.hp ? `+${r.hp}` : '—'} />
            <Celula rotulo="Defesa" valor={r.defesa ? `+${r.defesa}` : '—'} />
            {r.atributos.slice(0, 2).map((a) => <Celula key={a.nome} rotulo={a.nome} valor={a.valor} />)}
          </div>
          {(r.atributos.length > 2 || r.percentuais.length > 0) && (
            <p className="text-[10px] leading-snug" style={{ color: '#D5C7A4' }}>
              {[...r.atributos.slice(2).map((a) => `${a.nome} ${a.valor}`), ...r.percentuais.map((p) => `${p.rotulo} ${p.valor}`)].join(' · ')}
            </p>
          )}
          {(r.elementos.length > 0 || r.status.length > 0) && (
            <p className="text-[10px]" style={{ color: '#F3C769' }}>
              {r.elementos.length > 0 && (
                <>
                  {`Elemento: ${r.elementos.join(' e ')} `}
                  <IconesDeElementos elementos={r.elementos} tamanho={14} />
                </>
              )}
              {r.elementos.length > 0 && r.status.length > 0 && ' · '}
              {r.status.length > 0 && `Status: ${r.status.join(', ')}`}
            </p>
          )}
          {r.habilidades.length > 0 && (
            <div className="flex flex-wrap gap-1" aria-label="Habilidades de armadura">
              {r.habilidades.map((h) => (
                <span
                  key={h.id}
                  title={h.aplicada ? undefined : 'Ainda não vale no combate'}
                  className="rounded px-1.5 py-0.5 text-[9.5px] border"
                  style={{ borderColor: h.aplicada ? `${OURO}aa` : `${OURO}44`, color: h.aplicada ? '#F5F3E0' : '#8d8574', backgroundColor: 'rgba(0,0,0,0.4)' }}
                >
                  {h.nome} {h.nivel}/{h.nivelMaximo}{h.aplicada ? '' : ' •'}
                </span>
              ))}
              {r.habilidades.some((h) => !h.aplicada) && (
                <span className="text-[9px] self-center" style={{ color: '#8d8574' }}>• ainda não valem no combate</span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Celula({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded border px-1 py-0.5" style={{ borderColor: `${OURO}44`, backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <div className="font-cinzel text-[8px] uppercase tracking-wider" style={{ color: OURO }}>{rotulo}</div>
      <div className="text-[12px] font-bold tabular-nums" style={{ color: '#F5F3E0' }}>{valor}</div>
    </div>
  );
}

/** Escolha do item de um espaço: lista do que o personagem tem, com equipar e desequipar. */
export function FichaEquipamentoModal({
  character,
  slot,
  onClose,
  onEquipar,
  onDesequipar,
}: {
  character: CharacterDocument;
  slot: SlotEquipamento;
  onClose: () => void;
  onEquipar?: (slot: SlotEquipamento, itemId: string) => Promise<string | null>;
  onDesequipar?: (slot: SlotEquipamento) => Promise<string | null>;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nome = SLOTS_EQUIPAMENTO.find((s) => s.id === slot)?.nome ?? '';
  const opcoes = opcoesDoSlot(character, slot);

  const executar = async (acao: () => Promise<string | null> | undefined) => {
    setOcupado(true);
    setErro(null);
    const msg = (await acao()) ?? null;
    setOcupado(false);
    if (msg) setErro(msg);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Equipar: ${nome}`}>
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 cursor-default" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <div className="relative w-full max-w-[480px] max-h-[82dvh] overflow-y-auto rounded-t-md border-2 border-b-0 px-3.5 pt-3 pb-4 flex flex-col gap-2" style={{ backgroundColor: '#120F0C', borderColor: OURO }}>
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-[16px] font-cinzel font-extrabold" style={{ color: '#F3C769' }}>{nome}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="cursor-pointer"><X className="w-5 h-5" style={{ color: '#E2D6B6' }} /></button>
        </div>
        {erro && <p role="alert" className="text-[12px]" style={{ color: '#F28B82' }}>{erro}</p>}
        {opcoes.length === 0 ? (
          <p className="text-[12px] py-3 text-center" style={{ color: '#D5C7A4' }}>
            Você ainda não tem {slot === 'arma' ? 'nenhuma arma' : `nenhuma peça para ${nome.toLowerCase()}`}. Fabrique no Ferreiro.
          </p>
        ) : (
          opcoes.map((o) => (
            <div key={o.id} className="rounded-md border p-2 flex flex-col gap-1" style={{ borderColor: o.equipado ? o.cor : `${OURO}55`, backgroundColor: 'rgba(28,27,24,0.9)' }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-cinzel font-bold leading-tight" style={{ color: o.cor }}>{o.nome}</div>
                  <div className="text-[10.5px]" style={{ color: '#D5C7A4' }}>{o.raridadeNome} · {o.resumo}</div>
                </div>
                {o.equipado ? (
                  <button type="button" disabled={ocupado} onClick={() => executar(() => onDesequipar?.(slot))} className="shrink-0 rounded border px-2.5 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50" style={{ borderColor: OURO, color: '#E2D6B6' }}>
                    Desequipar
                  </button>
                ) : (
                  <button type="button" disabled={ocupado} onClick={() => executar(() => onEquipar?.(slot, o.id))} className="shrink-0 rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-50" style={{ backgroundColor: '#ED8A0C', color: '#120F0C' }}>
                    Equipar
                  </button>
                )}
              </div>
              <ul className="text-[10.5px] leading-snug list-disc pl-4" style={{ color: '#E2D6B6' }}>
                {o.linhas.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
