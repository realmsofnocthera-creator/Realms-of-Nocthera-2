import React from 'react';

export interface SectionDividerProps {
  className?: string;
}

/**
 * Divisor decorativo reutilizável entre capítulos da Landing Page:
 * linha horizontal fina em ouro pálido (#B2A66C) com um losango central (~10px) rotacionado a 45°.
 */
export function SectionDivider({ className = 'my-8 sm:my-12' }: SectionDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={`w-full max-w-4xl mx-auto px-4 flex items-center justify-center ${className}`}
    >
      <div className="relative w-full flex items-center justify-center">
        {/* Linha horizontal fina na cor dourada pálida (#B2A66C) */}
        <div className="w-full h-px bg-[#B2A66C]/55" />

        {/* Losango centralizado sobre a linha (~10px via rotate-45) */}
        <div
          className="absolute w-2.5 h-2.5 bg-[#120F0C] border border-[#B2A66C] shadow-[0_0_8px_rgba(237,138,12,0.35)]"
          style={{ transform: 'rotate(45deg)' }}
        />
      </div>
    </div>
  );
}
