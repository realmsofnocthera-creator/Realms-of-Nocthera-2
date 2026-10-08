'use client';

import React, { useRef, useState } from 'react';
import { SkillPopover } from './SkillPopover';

export interface SkillIconProps {
  id?: string;
  src: string | null;
  nome: string;
  tipo: string;
  descricao: string;
  nivelRequerido?: number;
  bloqueada?: boolean;
  recargaTurnos?: number;
  duracaoTurnos?: number;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
  size?: number;
  badgeIndex?: number | string;
}

export function SkillIcon({
  src,
  nome,
  tipo,
  descricao,
  nivelRequerido,
  bloqueada = false,
  recargaTurnos,
  duracaoTurnos,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  className = '',
  size,
  badgeIndex,
}: SkillIconProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isPopoverOpen = isControlled ? controlledIsOpen : internalOpen;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isControlled && controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const handleClose = () => {
    if (isControlled && controlledOnToggle && isPopoverOpen) {
      controlledOnToggle();
    } else {
      setInternalOpen(false);
    }
  };

  const sizeStyle = size ? { width: `${size}px`, height: `${size}px` } : undefined;
  const sizeClasses = size ? '' : 'w-9 h-9 sm:w-10 sm:h-10';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={nome}
        aria-haspopup="dialog"
        aria-expanded={isPopoverOpen}
        onClick={handleClick}
        style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
        className={`relative ${size ? '' : 'min-w-[40px] min-h-[40px]'} p-0 flex items-center justify-center cursor-pointer transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ED8A0C] shrink-0 ${className}`}
      >
        {src ? (
          <div
            style={sizeStyle}
            className={`relative ${sizeClasses} transition-all ${
              isPopoverOpen
                ? 'scale-105 drop-shadow-[0_0_10px_rgba(237,138,12,0.85)]'
                : 'hover:scale-105 hover:drop-shadow-[0_0_6px_rgba(237,138,12,0.4)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
            } ${bloqueada ? 'opacity-40 grayscale' : 'opacity-100'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={nome}
              className="w-full h-full object-contain select-none pointer-events-none rounded-full"
            />

            {/* Número ordinal da habilidade (1, 2, 3, etc) no canto inferior direito */}
            {badgeIndex !== undefined && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#120F0C] border border-[#F5C542] text-[#F5C542] flex items-center justify-center font-cinzel font-bold text-[8px] sm:text-[9px] shadow-sm pointer-events-none z-10">
                {badgeIndex}
              </div>
            )}

            {/* Etiqueta Nv X ou Bloq */}
            {nivelRequerido !== undefined && nivelRequerido > 1 && badgeIndex === undefined ? (
              <div className="absolute -bottom-1 inset-x-0 flex justify-center pointer-events-none">
                <span
                  className={`inline-block font-cinzel font-bold text-[8px] tracking-tight truncate leading-tight px-1 py-0.5 rounded-full bg-black/90 ${
                    bloqueada ? 'text-[#F5A6A6]' : 'text-[#F5C542]'
                  }`}
                >
                  Nv {nivelRequerido}
                </span>
              </div>
            ) : bloqueada && badgeIndex === undefined ? (
              <div className="absolute -bottom-1 inset-x-0 flex justify-center pointer-events-none">
                <span className="inline-block font-cinzel font-bold text-[8px] text-[#F5A6A6] tracking-tight truncate leading-tight px-1 py-0.5 rounded-full bg-black/90">
                  Bloq
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          /* Placeholder genérico caso src seja null */
          <div
            style={sizeStyle}
            className={`relative ${sizeClasses} rounded-full bg-gradient-to-b from-[#2A0E12] via-[#17090B] to-[#0D0607] flex items-center justify-center transition-all ${
              isPopoverOpen
                ? 'scale-105 drop-shadow-[0_0_10px_rgba(237,138,12,0.85)]'
                : 'hover:scale-105 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'
            } ${bloqueada ? 'opacity-40 grayscale' : 'opacity-100'}`}
          >
            <span className="font-cinzel font-bold text-xs sm:text-sm text-[#F5C542]/85">
              ?
            </span>
            {bloqueada && (
              <div className="absolute -bottom-1 inset-x-0 flex justify-center pointer-events-none">
                <span className="inline-block font-cinzel font-bold text-[8px] text-[#F5A6A6] tracking-tight truncate leading-tight px-1 py-0.5 rounded-full bg-black/90">
                  {nivelRequerido !== undefined ? `Nv ${nivelRequerido}` : 'Bloq'}
                </span>
              </div>
            )}
          </div>
        )}
      </button>

      {/* Popover explicativo */}
      <SkillPopover
        isOpen={isPopoverOpen}
        onClose={handleClose}
        anchorRef={buttonRef}
        nome={nome}
        tipo={tipo}
        descricao={descricao}
        nivelRequerido={nivelRequerido}
        bloqueada={bloqueada}
        recargaTurnos={recargaTurnos}
        duracaoTurnos={duracaoTurnos}
      />
    </>
  );
}
