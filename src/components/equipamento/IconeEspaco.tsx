import React from 'react';
import { BookOpen, Footprints, Hand, HardHat, Shirt, Sword, WandSparkles } from 'lucide-react';
import type { SlotEquipamento } from '@/lib/equipamentoTela';
import type { CategoriaArma } from '@/rules/armas';

/** Ícone do espaço de equipamento (a arte das peças entra depois). */

function Perneiras({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d="M7 3h10l1 18h-4l-2-11-2 11H6z" />
    </svg>
  );
}

export function IconeEspaco({ espaco, categoria, className, style }: { espaco: SlotEquipamento; categoria?: CategoriaArma; className?: string; style?: React.CSSProperties }) {
  const props = { className, style, 'aria-hidden': true as const };
  switch (espaco) {
    case 'arma':
      return categoria === 'grimorio' ? <BookOpen {...props} /> : categoria === 'cajado' ? <WandSparkles {...props} /> : <Sword {...props} />;
    case 'elmo': return <HardHat {...props} />;
    case 'peitoral': return <Shirt {...props} />;
    case 'luvas': return <Hand {...props} />;
    case 'perneiras': return <Perneiras className={className} style={style} />;
    case 'botas': return <Footprints {...props} />;
  }
}
