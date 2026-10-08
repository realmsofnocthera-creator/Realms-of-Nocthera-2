'use client';

import React, { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { NOCTHERA_THEME } from '@/theme/theme';

export interface SkillPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  anchorEl?: HTMLElement | null;
  nome: string;
  tipo: string;
  descricao: string;
  nivelRequerido?: number;
  bloqueada?: boolean;
  recargaTurnos?: number;
  duracaoTurnos?: number;
  zIndex?: number | string;
}

const emptySubscribe = () => () => {};

export function SkillPopover({
  isOpen,
  onClose,
  anchorRef,
  anchorEl,
  nome,
  tipo,
  descricao,
  nivelRequerido,
  bloqueada,
  recargaTurnos,
  duracaoTurnos,
  zIndex,
}: SkillPopoverProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  const resolveAnchor = useCallback((): HTMLElement | null => {
    if (anchorRef) return anchorRef.current;
    if (anchorEl) return anchorEl;
    return null;
  }, [anchorRef, anchorEl]);

  const updatePosition = useCallback(() => {
    const el = resolveAnchor();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxWidth = Math.min(280, viewportWidth - 16);
    const popoverWidth = maxWidth;

    // Centro do ícone horizontalmente
    const iconCenterX = rect.left + rect.width / 2;

    // Calcular left do balão garantindo margem de 8px nas laterais
    let left = iconCenterX - popoverWidth / 2;
    if (left < 8) left = 8;
    if (left + popoverWidth > viewportWidth - 8) {
      left = viewportWidth - 8 - popoverWidth;
    }

    // Posição relativa da seta dentro do balão
    const arrowLeft = Math.max(14, Math.min(popoverWidth - 14, iconCenterX - left));

    // Decisão de posicionamento vertical (abaixo preferencial, acima se faltar espaço)
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 150;

    let placement: 'top' | 'bottom' = 'bottom';
    let top = rect.bottom + 8;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      placement = 'top';
      top = rect.top - 8;
    }

    setCoords({
      top,
      left,
      arrowLeft,
      placement,
    });
  }, [resolveAnchor]);

  useEffect(() => {
    if (!isOpen) return;

    let rafId: number | null = null;
    rafId = window.requestAnimationFrame(() => {
      updatePosition();
    });

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const el = resolveAnchor();
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!el || !el.contains(target))
      ) {
        onClose();
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose, updatePosition, resolveAnchor]);

  if (!isClient) return null;

  // Formatação da etiqueta
  let etiqueta = tipo;
  if (nivelRequerido !== undefined) {
    etiqueta = `Nv ${nivelRequerido}${tipo ? ` · ${tipo}` : ''}`;
  }

  const descFinal = descricao && descricao.trim() ? descricao : 'Descrição ainda não definida';

  return createPortal(
    <AnimatePresence>
      {isOpen && coords && (
        <motion.div
          ref={popoverRef}
          role="tooltip"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: coords.placement === 'bottom' ? coords.top : undefined,
            bottom: coords.placement === 'top' ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: Math.min(280, window.innerWidth - 16),
            backgroundColor: NOCTHERA_THEME.colors.background.card, // #1C1B18
            borderColor: NOCTHERA_THEME.colors.border.default, // #B2A66C
            color: NOCTHERA_THEME.colors.text.primary, // #F5F3E0
            zIndex: zIndex ?? 9999,
          }}
          className="rounded-md border p-3 shadow-2xl backdrop-blur-sm select-none"
        >
          {/* Seta apontando para o ícone */}
          <div
            aria-hidden="true"
            style={{
              left: coords.arrowLeft,
              top: coords.placement === 'bottom' ? -6 : undefined,
              bottom: coords.placement === 'top' ? -6 : undefined,
              backgroundColor: NOCTHERA_THEME.colors.background.card,
              borderColor: NOCTHERA_THEME.colors.border.default,
            }}
            className={`absolute w-3 h-3 -translate-x-1/2 rotate-45 border ${
              coords.placement === 'bottom' ? 'border-b-0 border-r-0' : 'border-t-0 border-l-0'
            }`}
          />

          {/* Cabeçalho: Título + Etiqueta */}
          <div className="flex items-start justify-between gap-2 border-b border-[#B2A66C]/30 pb-1.5 mb-2">
            <h4
              style={{ color: NOCTHERA_THEME.colors.accent.primary }}
              className="font-cinzel font-extrabold text-sm tracking-wide leading-tight"
            >
              {nome}
            </h4>
            <span
              className={`shrink-0 text-[10px] font-cinzel font-bold px-1.5 py-0.5 rounded border leading-none ${
                bloqueada
                  ? 'bg-[#2A0E12] border-[#D9383A]/60 text-[#F5A6A6]'
                  : 'bg-[#2B2824] border-[#B2A66C]/60 text-[#D5C7A4]'
              }`}
            >
              {bloqueada && nivelRequerido !== undefined ? `Nv ${nivelRequerido} (Bloqueada)` : etiqueta}
            </span>
          </div>

          {/* Descrição */}
          <p className="text-xs text-[#F5F3E0] leading-relaxed mb-2 font-normal">
            {descFinal}
          </p>

          {/* Detalhes de combate se existirem (Recarga, Duração) */}
          {(recargaTurnos !== undefined || duracaoTurnos !== undefined) && (
            <div className="pt-1.5 border-t border-[#B2A66C]/20 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#D5C7A4] font-cinzel">
              {recargaTurnos !== undefined && (
                <span>
                  Recarga:{' '}
                  <strong className="text-[#ED8A0C]">
                    {recargaTurnos} {recargaTurnos === 1 ? 'rodada' : 'rodadas'}
                  </strong>
                </span>
              )}
              {duracaoTurnos !== undefined && duracaoTurnos > 0 && (
                <span>
                  Duração:{' '}
                  <strong className="text-[#F5C542]">
                    {duracaoTurnos} {duracaoTurnos === 1 ? 'turno' : 'turnos'}
                  </strong>
                </span>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
