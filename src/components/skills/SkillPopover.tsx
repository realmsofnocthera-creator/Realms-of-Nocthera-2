'use client';

import React, { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

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
  /** Ícone da habilidade, mostrado no cabeçalho do balão. */
  icone?: string | null;
}

const emptySubscribe = () => () => {};

const LARGURA_DO_BALAO = 300;
const EM_DEGRAUS = (t: number) => Math.floor(t * 4) / 4;

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
  icone,
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

    const maxWidth = Math.min(LARGURA_DO_BALAO, viewportWidth - 16);
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
    const estimatedHeight = 190;

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

  const mostraRecarga = recargaTurnos !== undefined;
  const mostraDuracao = duracaoTurnos !== undefined && duracaoTurnos > 0;
  const textoDaEtiqueta = bloqueada && nivelRequerido !== undefined ? `Nv ${nivelRequerido} (Bloqueada)` : etiqueta;

  return createPortal(
    <AnimatePresence>
      {isOpen && coords && (
        <motion.div
          ref={popoverRef}
          role="tooltip"
          aria-live="polite"
          initial={{ opacity: 0, y: coords.placement === 'bottom' ? -6 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EM_DEGRAUS }}
          style={{
            position: 'fixed',
            top: coords.placement === 'bottom' ? coords.top : undefined,
            bottom: coords.placement === 'top' ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: Math.min(LARGURA_DO_BALAO, window.innerWidth - 16),
            zIndex: zIndex ?? 9999,
          }}
          className="border-4 border-[#1A120B] bg-[#17120E] p-3 shadow-[0_0_0_2px_#B2A66C,0_14px_34px_rgba(0,0,0,0.92)] select-none"
        >
          {/* Seta apontando para o ícone */}
          <div
            aria-hidden="true"
            style={{
              left: coords.arrowLeft,
              top: coords.placement === 'bottom' ? -11 : undefined,
              bottom: coords.placement === 'top' ? -11 : undefined,
            }}
            className={`absolute w-3 h-3 -translate-x-1/2 rotate-45 bg-[#17120E] border-2 border-[#B2A66C] ${
              coords.placement === 'bottom' ? 'border-b-0 border-r-0' : 'border-t-0 border-l-0'
            }`}
          />

          {/* Cabeçalho: ícone, nome e etiqueta */}
          <div className="flex items-start gap-2.5 pb-2 mb-2 border-b-2 border-[#B2A66C]/40">
            {icone && (
              <div className="shrink-0 w-11 h-11 border-[3px] border-[#1A120B] bg-[#0D0A09] shadow-[0_0_0_2px_#B2A66C]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icone} alt="" draggable={false} className={`w-full h-full object-contain ${bloqueada ? 'grayscale opacity-60' : ''}`} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-[family-name:var(--font-pixel)] text-[10px] leading-snug text-[#ED8A0C] uppercase [text-shadow:0_2px_0_#7a4506] break-words">
                {nome}
              </h4>
              <span
                className={`inline-block mt-1.5 font-[family-name:var(--font-silk)] text-[10px] uppercase tracking-wide leading-none px-1.5 py-1 border-2 ${
                  bloqueada ? 'bg-[#2A0E12] border-[#D9383A]/70 text-[#F5A6A6]' : 'bg-[#2B2824] border-[#B2A66C]/70 text-[#D5C7A4]'
                }`}
              >
                {textoDaEtiqueta}
              </span>
            </div>
          </div>

          {/* Descrição */}
          <p className="text-xs text-[#E2D6B6] leading-relaxed">{descFinal}</p>

          {/* Recarga e duração, em quadros separados */}
          {(mostraRecarga || mostraDuracao) && (
            <div className="mt-2.5 pt-2 border-t-2 border-[#B2A66C]/25 flex flex-wrap gap-2">
              {mostraRecarga && (
                <div className="border-2 border-[#1A120B] bg-[#0D0A09] shadow-[0_0_0_1px_#B2A66C99] px-2 py-1">
                  <span className="block font-[family-name:var(--font-silk)] text-[9px] uppercase tracking-wide text-[#D5C7A4]">Recarga</span>
                  <span className="block font-[family-name:var(--font-pixel)] text-[9px] text-[#ED8A0C] leading-relaxed">
                    {recargaTurnos} {recargaTurnos === 1 ? 'rodada' : 'rodadas'}
                  </span>
                </div>
              )}
              {mostraDuracao && (
                <div className="border-2 border-[#1A120B] bg-[#0D0A09] shadow-[0_0_0_1px_#B2A66C99] px-2 py-1">
                  <span className="block font-[family-name:var(--font-silk)] text-[9px] uppercase tracking-wide text-[#D5C7A4]">Duração</span>
                  <span className="block font-[family-name:var(--font-pixel)] text-[9px] text-[#F5C542] leading-relaxed">
                    {duracaoTurnos} {duracaoTurnos === 1 ? 'turno' : 'turnos'}
                  </span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
