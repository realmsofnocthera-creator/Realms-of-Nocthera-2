'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTES, AttributeName } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES, getAttributeExplanation } from '@/rules/attributeInfo';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { getCharacterOtherBonuses } from '@/rules/otherBonuses';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { BotaoRedondo, PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from './PlacaPixel';

export interface FichaLupaModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterDocument;
}

/** Uma linha que abre a explicação logo abaixo dela (no lugar do balão solto de antes). */
export function LinhaExplicada({ id, nome, icone, texto, aberta, aoAlternar }: { id: string; nome: string; icone?: string; texto: string; aberta: boolean; aoAlternar: (id: string) => void }) {
  return (
    <li className="border-b border-dashed border-[#2B3F5C] last:border-b-0">
      <button
        type="button"
        onClick={() => aoAlternar(id)}
        aria-expanded={aberta}
        aria-controls={`lupa-${id}`}
        className="w-full flex items-center gap-[1.6cqw] py-[1.8cqw] text-left cursor-pointer active:translate-y-px"
      >
        {icone && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icone} alt="" aria-hidden="true" draggable={false} className="w-[5.2cqw] h-[5.2cqw] object-contain shrink-0 pointer-events-none" />
        )}
        <span className={`flex-1 font-cinzel font-extrabold text-[2.9cqw] leading-[1.4] ${aberta ? 'text-[#EDB44C]' : 'text-[#F5F3E0]'}`} style={{ textShadow: CONTORNO_PIXEL }}>{nome}</span>
        <span aria-hidden="true" className="font-cinzel font-black text-[3cqw] leading-none text-[#6FE3EE]">{aberta ? '−' : '?'}</span>
      </button>
      {aberta && (
        <p id={`lupa-${id}`} className="mb-[1.8cqw] ml-[1cqw] pl-[2cqw] border-l-[0.6cqw] border-[#B8862B] font-cinzel text-[2.4cqw] leading-snug text-[#E9DDC0]">{texto}</p>
      )}
    </li>
  );
}

/**
 * O pop-up das explicações dos atributos (a lupa da ficha) no estilo pixel: o painel do kit com o X redondo e uma lista em que
 * cada atributo (e cada outro bônus) abre a explicação logo abaixo. Esc ou o fundo fecham a explicação aberta e depois o pop-up.
 */
export function FichaLupaModal({ isOpen, onClose, character }: FichaLupaModalProps) {
  const t = TEXTOS_DA_FICHA.lupa;
  const [aberta, setAberta] = useState<string | null>(null);
  const otherBonuses = getCharacterOtherBonuses(character);

  // Fecha a explicação ao fechar o pop-up
  useEffect(() => {
    if (!isOpen) setAberta(null);
  }, [isOpen]);

  // Trava a rolagem do fundo enquanto o pop-up estiver aberto
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Esc: primeiro fecha a explicação aberta; se não houver, fecha o pop-up
  const aoTeclar = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (aberta) setAberta(null);
      else onClose();
    },
    [aberta, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen, aoTeclar]);

  if (!isOpen) return null;

  const alternar = (id: string) => setAberta((atual) => (atual === id ? null : id));
  const fecharPeloFundo = () => (aberta ? setAberta(null) : onClose());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lupa-modal-title"
      onClick={fecharPeloFundo}
      className="forja-palco !fixed inset-0 !z-[9990] !items-center !justify-center px-[4cqw] select-none"
      style={{ backgroundColor: 'rgba(3,6,14,0.7)', left: 0, right: 0 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[88cqw]">
        <BotaoRedondo tipo="x" rotulo={t.fechar} onClick={onClose} className="absolute -top-[3.4cqw] -right-[2cqw] z-10 w-[9cqw] h-[9cqw]" />
        <PainelDaForja borda="3cqw" className="max-h-[84dvh] overflow-y-auto forja-rolagem">
          <div className="flex flex-col gap-[2.4cqw]">
            <h2 id="lupa-modal-title" className="font-cinzel font-extrabold uppercase text-[3.4cqw] leading-[1.35] text-[#EDB44C]">{t.titulo}</h2>

            <section aria-label={t.principais}>
              <h3 className="font-cinzel font-bold uppercase tracking-wider text-[2.1cqw] leading-[1.4] text-[#9CC4E0] pb-[0.8cqw] border-b border-[#2B3F5C]">{t.principais}</h3>
              <ul className="flex flex-col">
                {ATTRIBUTES.map((attr: AttributeName) => (
                  <LinhaExplicada key={attr} id={attr} nome={ATTRIBUTE_DISPLAY_NAMES[attr]} icone={ATTRIBUTE_ICONS[attr]} texto={getAttributeExplanation(attr)} aberta={aberta === attr} aoAlternar={alternar} />
                ))}
              </ul>
            </section>

            <section aria-label={t.outros}>
              <h3 className="font-cinzel font-bold uppercase tracking-wider text-[2.1cqw] leading-[1.4] text-[#9CC4E0] pb-[0.8cqw] border-b border-[#2B3F5C]">{t.outros}</h3>
              {otherBonuses.length === 0 ? (
                <p className="font-cinzel italic text-[2.3cqw] leading-snug text-[#8FA3BF] py-[1.4cqw]">{t.nenhum}</p>
              ) : (
                <ul className="flex flex-col">
                  {otherBonuses.map((bonus) => (
                    <LinhaExplicada key={bonus.id} id={bonus.id} nome={bonus.nome} texto={bonus.explicacao} aberta={aberta === bonus.id} aoAlternar={alternar} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </PainelDaForja>
      </div>
    </div>
  );
}
