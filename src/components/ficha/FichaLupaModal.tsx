'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTES, AttributeName } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES, getAttributeExplanation } from '@/rules/attributeInfo';
import { getCharacterOtherBonuses, OtherBonus } from '@/rules/otherBonuses';
import { SkillPopover } from '@/components/skills/SkillPopover';

export interface FichaLupaModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterDocument;
}

interface ActivePopoverState {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  anchorEl: HTMLElement;
}

export function FichaLupaModal({ isOpen, onClose, character }: FichaLupaModalProps) {
  const [activePopover, setActivePopover] = useState<ActivePopoverState | null>(null);

  const otherBonuses = getCharacterOtherBonuses(character);

  // Fecha o popover ao fechar o modal
  useEffect(() => {
    if (!isOpen) {
      setActivePopover(null);
    }
  }, [isOpen]);

  // Trava rolagem do fundo enquanto o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Tratamento da tecla Esc: primeiro fecha o balão; se já estiver fechado, fecha o modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (activePopover) {
          setActivePopover(null);
        } else {
          onClose();
        }
      }
    },
    [activePopover, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Ao clicar no overlay: primeiro fecha o balão; se já fechado, fecha o modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      if (activePopover) {
        setActivePopover(null);
      } else {
        onClose();
      }
    }
  };

  const handleToggleAttribute = (attr: AttributeName, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activePopover?.id === attr) {
      setActivePopover(null);
    } else {
      setActivePopover({
        id: attr,
        nome: ATTRIBUTE_DISPLAY_NAMES[attr],
        tipo: 'Atributo',
        descricao: getAttributeExplanation(attr),
        anchorEl: e.currentTarget,
      });
    }
  };

  const handleToggleBonus = (bonus: OtherBonus, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activePopover?.id === bonus.id) {
      setActivePopover(null);
    } else {
      setActivePopover({
        id: bonus.id,
        nome: bonus.nome,
        tipo: 'Bônus',
        descricao: bonus.explicacao,
        anchorEl: e.currentTarget,
      });
    }
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lupa-modal-title"
        onClick={handleOverlayClick}
        className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm select-none"
      >
        <div
          onClick={(e) => {
            // Se clicar dentro do painel do modal e houver balão aberto, pode fechar o balão se não for um botão
            e.stopPropagation();
          }}
          className="relative w-full max-w-[340px] max-h-[80vh] flex flex-col bg-[#1C1B18] border border-[#B2A66C] rounded-lg shadow-2xl overflow-hidden pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))]"
        >
          {/* Cabeçalho do Modal */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#B2A66C]/40 bg-[#141311] shrink-0">
            <h2
              id="lupa-modal-title"
              className="font-cinzel font-bold text-base sm:text-lg text-[#ED8A0C] tracking-wide"
            >
              Atributos
            </h2>
            <button
              type="button"
              onClick={() => {
                if (activePopover) setActivePopover(null);
                onClose();
              }}
              aria-label="Fechar explicações"
              className="p-1 rounded text-[#D5C7A4] hover:text-[#F5F3E0] hover:bg-[#2B2824] transition-colors cursor-pointer active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo com Rolagem Interna */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 text-[#F5F3E0] font-cinzel">
            {/* Seção 1: Atributos */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#D5C7A4] font-bold mb-2 pb-1 border-b border-[#B2A66C]/20">
                Atributos Principais
              </h3>
              <div className="flex flex-col gap-1.5">
                {ATTRIBUTES.map((attr) => {
                  const isSelected = activePopover?.id === attr;
                  return (
                    <button
                      key={attr}
                      type="button"
                      onClick={(e) => handleToggleAttribute(attr, e)}
                      aria-haspopup="dialog"
                      aria-expanded={isSelected}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded border text-left font-bold text-sm tracking-wide transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'bg-[#2B2824] border-[#ED8A0C] text-[#ED8A0C] shadow-[0_0_8px_rgba(237,138,12,0.3)]'
                          : 'bg-[#141311]/80 hover:bg-[#2B2824]/60 border-[#B2A66C]/40 text-[#F5F3E0]'
                      }`}
                    >
                      <span>{ATTRIBUTE_DISPLAY_NAMES[attr]}</span>
                      <span className="text-xs text-[#D5C7A4]/60 font-normal">?</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seção 2: Outros Bônus */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#D5C7A4] font-bold mb-2 pb-1 border-b border-[#B2A66C]/20">
                Outros bônus
              </h3>
              {otherBonuses.length === 0 ? (
                <p className="text-xs text-[#D5C7A4]/60 italic py-1 px-1">
                  Nenhum bônus no momento.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {otherBonuses.map((bonus) => {
                    const isSelected = activePopover?.id === bonus.id;
                    return (
                      <button
                        key={bonus.id}
                        type="button"
                        onClick={(e) => handleToggleBonus(bonus, e)}
                        aria-haspopup="dialog"
                        aria-expanded={isSelected}
                        className={`w-full min-h-[48px] px-3.5 py-2.5 rounded border text-left font-bold text-sm tracking-wide transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? 'bg-[#2B2824] border-[#ED8A0C] text-[#ED8A0C]'
                            : 'bg-[#141311]/80 hover:bg-[#2B2824]/60 border-[#B2A66C]/40 text-[#F5F3E0]'
                        }`}
                      >
                        <span>{bonus.nome}</span>
                        <span className="text-xs text-[#D5C7A4]/60 font-normal">?</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Balão com z-index superior ao modal */}
      {activePopover && (
        <SkillPopover
          isOpen={true}
          onClose={() => setActivePopover(null)}
          anchorEl={activePopover.anchorEl}
          nome={activePopover.nome}
          tipo={activePopover.tipo}
          descricao={activePopover.descricao}
          zIndex={10005}
        />
      )}
    </>
  );
}
