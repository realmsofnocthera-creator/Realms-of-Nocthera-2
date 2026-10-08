'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface EntityCarouselItem {
  id: string;
  nome: string;
  iconeUrl: string;
  descricaoCurta: string;
}

export interface EntityCarouselProps {
  items: ReadonlyArray<EntityCarouselItem>;
  ariaLabel?: string;
}

/**
 * Carrossel horizontal informativo com CSS scroll-snap puro (x mandatory / align center),
 * suporte a swipe por toque no celular e botões laterais que ajustam scrollLeft.
 * Os cards são puramente informativos/decorativos (não clicáveis).
 */
export function EntityCarousel({
  items,
  ariaLabel = 'Carrossel de elementos do jogo',
}: EntityCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: -1 | 1) => {
    const container = containerRef.current;
    if (!container) return;

    const firstCard = container.querySelector<HTMLElement>('[data-carousel-card]');
    const stepWidth = firstCard ? firstCard.offsetWidth + 16 : 280;
    const nextScrollLeft = container.scrollLeft + direction * stepWidth;

    container.scrollTo({
      left: nextScrollLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full" aria-label={ariaLabel}>
      {/* Controles de navegação lateral */}
      <div className="flex items-center justify-end gap-2 mb-3 px-1">
        <button
          type="button"
          onClick={() => handleScroll(-1)}
          aria-label="Anterior"
          className="w-9 h-9 rounded-lg bg-[#1C1B18] hover:bg-[#2B2824] border border-[#B2A66C]/60 hover:border-[#ED8A0C] text-[#F5F3E0] hover:text-[#ED8A0C] flex items-center justify-center transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => handleScroll(1)}
          aria-label="Próximo"
          className="w-9 h-9 rounded-lg bg-[#1C1B18] hover:bg-[#2B2824] border border-[#B2A66C]/60 hover:border-[#ED8A0C] text-[#F5F3E0] hover:text-[#ED8A0C] flex items-center justify-center transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Container com overflow-x: auto e scroll-snap-type: x mandatory */}
      <div
        ref={containerRef}
        className="flex gap-6 sm:gap-8 overflow-x-auto pb-4 pt-2 px-2 sm:px-4 touch-pan-x select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {items.map((item) => (
          <article
            key={item.id}
            data-carousel-card
            className="w-[240px] sm:w-[265px] md:w-[280px] shrink-0 px-3 py-2 flex flex-col items-center text-center"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mb-3.5 shrink-0">
              {item.iconeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.iconeUrl}
                  alt={item.nome}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain pointer-events-none drop-shadow-[0_6px_16px_rgba(0,0,0,0.85)]"
                />
              ) : (
                <span className="font-cinzel text-2xl font-bold text-[#ED8A0C] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {item.nome.charAt(0)}
                </span>
              )}
            </div>

            <h3 className="font-cinzel font-bold text-base sm:text-lg text-[#F5F3E0] tracking-wide mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {item.nome}
            </h3>

            <p className="text-xs sm:text-sm text-[#E2D6B6] leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {item.descricaoCurta}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
