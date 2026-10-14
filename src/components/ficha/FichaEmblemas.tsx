'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { SLOTS_EMBLEMA } from '@/game/emblemas';
import { atributosDoEmblemaEmTexto, atributosDosEquipadosEmTexto, COR_ESTRELA_VERMELHA, habilidadesEmAcao, inventarioDeEmblemas, slotsDeEmblema } from '@/lib/emblemasTela';

const OURO = '#B2A66C';

/** Estrelas do emblema: ★ a ★★★; no Mítico, a 4ª estrela é vermelha. */
export function Estrelas({ n, className = '' }: { n: number; className?: string }) {
  return (
    <span className={className} aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}>
      {Array.from({ length: Math.min(3, n) }, (_, i) => <span key={i} style={{ color: '#F3C769' }}>★</span>)}
      {n >= 4 && <span style={{ color: COR_ESTRELA_VERMELHA }}>★</span>}
    </span>
  );
}

/** Coluna dos 4 espaços de emblema, no lugar da moldura de atributos. Toque abre o inventário de emblemas. */
export function FichaSlotsEmblema({ character, onAbrir }: { character: CharacterDocument; onAbrir: () => void }) {
  const slots = slotsDeEmblema(character);
  return (
    <section
      aria-label="Espaços de emblema"
      className="w-[clamp(168px,44vw,218px)] rounded-lg p-1.5 border flex flex-col gap-1"
      style={{ borderColor: `${OURO}66`, background: 'linear-gradient(160deg, rgba(28,24,20,0.94) 0%, rgba(13,13,13,0.95) 100%)' }}
    >
      {slots.map((s) => (
        <button
          key={s.indice}
          type="button"
          onClick={onAbrir}
          aria-label={s.emblema ? `Espaço ${s.indice + 1}: Emblema ${s.emblema.nome}. Trocar` : `Espaço ${s.indice + 1}: vazio`}
          className="flex items-center gap-2 rounded-md border px-1.5 py-1 min-h-[42px] text-left cursor-pointer active:scale-[0.98] transition-transform"
          style={{ borderColor: s.emblema ? s.emblema.cor : `${OURO}55`, borderStyle: s.emblema ? 'solid' : 'dashed', backgroundColor: 'rgba(13,13,13,0.7)' }}
        >
          <span className="w-7 h-7 shrink-0 rounded flex items-center justify-center font-cinzel font-black text-[13px]" style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: s.emblema ? s.emblema.cor : OURO }}>
            {s.indice + 1}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            {s.emblema ? (
              <>
                <span className="block text-[10.5px] font-semibold truncate" style={{ color: s.emblema.cor }}>{s.emblema.nome}</span>
                <span className="block text-[10px]"><Estrelas n={s.emblema.estrelas} /> <span style={{ color: '#D5C7A4' }}>{s.emblema.raridadeNome}</span></span>
              </>
            ) : (
              <span className="block text-[10.5px] font-semibold" style={{ color: '#8d8574' }}>Vazio</span>
            )}
          </span>
        </button>
      ))}
    </section>
  );
}

/** Resumo no pé da ficha: as habilidades dos emblemas equipados e o nível de cada uma. */
export function FichaResumoEmblemas({ character, className = '' }: { character: CharacterDocument; className?: string }) {
  const habilidades = habilidadesEmAcao(character);
  const atributos = atributosDosEquipadosEmTexto(character);
  return (
    <section
      aria-label="Habilidades dos emblemas"
      className={`w-full rounded-lg border px-2 py-1.5 flex flex-col gap-1 max-h-[26dvh] overflow-y-auto ${className}`}
      style={{ borderColor: `${OURO}66`, background: 'linear-gradient(160deg, rgba(28,24,20,0.94) 0%, rgba(13,13,13,0.95) 100%)' }}
    >
      {atributos && (
        <p className="text-[10.5px] font-semibold leading-snug" style={{ color: '#F3C769' }} aria-label="Atributos dos emblemas">
          Atributos dos emblemas: <span style={{ color: '#F5F3E0' }}>{atributos}</span>
        </p>
      )}
      {habilidades.length === 0 ? (
        <p className="text-[11px] text-center py-1" style={{ color: '#D5C7A4' }}>
          Nenhum emblema equipado. Toque num espaço para equipar. Emblemas iguais equipados juntos sobem o nível das habilidades (até 4).
        </p>
      ) : (
        habilidades.map((h) => (
          <div key={`${h.tipoNome}-${h.nome}`} className="text-[10.5px] leading-snug">
            <span className="font-semibold" style={{ color: h.cor }}>{h.nome}</span>
            <span className="font-cinzel font-bold" style={{ color: '#F3C769' }}> · Nv. {h.nivel}{h.multiplicador !== 1 ? ` (×${String(h.multiplicador).replace('.', ',')})` : ''}</span>
            {!h.vale && <span className="font-semibold" style={{ color: '#8d8574' }}> · ainda não vale no combate</span>}
            <span className="block" style={{ color: '#E2D6B6' }}>{h.descricao}</span>
          </div>
        ))
      )}
    </section>
  );
}

/** Inventário de emblemas: equipar, desequipar e fundir emblemas iguais. */
export function FichaEmblemaModal({
  character,
  onClose,
  onAcao,
  onFundir,
}: {
  character: CharacterDocument;
  onClose: () => void;
  onAcao?: (id: string, acao: 'equipar' | 'desequipar') => Promise<string | null>;
  onFundir?: (tipo: string, estrelas: number) => Promise<string | null>;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const grupos = inventarioDeEmblemas(character);
  const ocupados = (character.emblemasEquipados ?? []).length;

  const executar = async (acao: () => Promise<string | null> | undefined) => {
    setOcupado(true);
    setErro(null);
    const msg = (await acao()) ?? null;
    setOcupado(false);
    if (msg) setErro(msg);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Emblemas">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 cursor-default" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <div className="relative w-full max-w-[480px] max-h-[82dvh] overflow-y-auto rounded-t-md border-2 border-b-0 px-3.5 pt-3 pb-4 flex flex-col gap-2" style={{ backgroundColor: '#120F0C', borderColor: OURO }}>
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-[16px] font-cinzel font-extrabold" style={{ color: '#F3C769' }}>Emblemas <span className="text-[12px]" style={{ color: '#D5C7A4' }}>({ocupados}/{SLOTS_EMBLEMA} equipados)</span></h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="cursor-pointer"><X className="w-5 h-5" style={{ color: '#E2D6B6' }} /></button>
        </div>
        {erro && <p role="alert" className="text-[12px]" style={{ color: '#F28B82' }}>{erro}</p>}
        {grupos.length === 0 ? (
          <p className="text-[12px] py-3 text-center" style={{ color: '#D5C7A4' }}>
            Você ainda não tem emblemas. Derrote os chefes da Provação do Guerreiro para consegui-los.
          </p>
        ) : (
          grupos.map((g) => (
            <div key={g.tipo.id} className="rounded-md border p-2 flex flex-col gap-1.5" style={{ borderColor: `${g.cor}99`, backgroundColor: 'rgba(28,27,24,0.9)' }}>
              <div>
                <div className="text-[13px] font-cinzel font-bold leading-tight" style={{ color: g.cor }}>Emblema {g.nome}</div>
                <div className="text-[10.5px]" style={{ color: '#D5C7A4' }}>{g.raridadeNome}</div>
              </div>
              <p className="text-[10.5px]" style={{ color: '#D5C7A4' }}>
                Atributos: {g.tipo.atributos.map((a) => ATTRIBUTE_DISPLAY_NAMES[a]).join(', ')}
              </p>
              <ul className="text-[10.5px] leading-snug flex flex-col gap-0.5" style={{ color: '#E2D6B6' }}>
                {g.tipo.habilidades.map((h, i) => (
                  <li key={h.nome}><Estrelas n={i + 1} /> <b>{h.nome}:</b> {h.descricao}</li>
                ))}
              </ul>
              {g.porEstrela.map((e) => (
                <div key={e.estrelas} className="flex items-center gap-2 flex-wrap border-t pt-1.5" style={{ borderColor: `${OURO}33` }}>
                  <span className="text-[12px] font-semibold" style={{ color: '#F5F3E0' }}>
                    <Estrelas n={e.estrelas} /> x{e.total} <span className="text-[10.5px] font-normal" style={{ color: '#D5C7A4' }}>({atributosDoEmblemaEmTexto({ tipo: g.tipo.id, estrelas: e.estrelas })} cada)</span>
                    {e.equipados > 0 && <span className="text-[10.5px] font-normal" style={{ color: '#D5C7A4' }}> ({e.equipados} equipado{e.equipados > 1 ? 's' : ''})</span>}
                  </span>
                  <span className="flex-1" />
                  {e.equipados > 0 && (
                    <button type="button" disabled={ocupado} onClick={() => executar(() => onAcao?.(e.idsEquipados[0], 'desequipar'))} className="rounded border px-2 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50" style={{ borderColor: OURO, color: '#E2D6B6' }}>
                      Desequipar
                    </button>
                  )}
                  {e.livres.length > 0 && (
                    <button type="button" disabled={ocupado || ocupados >= SLOTS_EMBLEMA} onClick={() => executar(() => onAcao?.(e.livres[0], 'equipar'))} className="rounded px-2 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-50" style={{ backgroundColor: '#ED8A0C', color: '#120F0C' }}>
                      Equipar
                    </button>
                  )}
                  {e.custoDaFusao !== null && (
                    <button type="button" disabled={ocupado || !e.podeFundir} onClick={() => executar(() => onFundir?.(g.tipo.id, e.estrelas))} className="rounded border px-2 py-1 text-[11px] font-semibold cursor-pointer disabled:opacity-40" style={{ borderColor: g.cor, color: g.cor }} title={`Funde ${e.custoDaFusao} emblemas iguais em 1 com uma estrela a mais`}>
                      Fundir {e.custoDaFusao}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
