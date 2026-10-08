import React from 'react';
import { ArrowDown, ArrowRight, Shield, Swords } from 'lucide-react';
import { RESOURCE_ICONS } from '@/assets/icons';

interface FlowStep {
  id: string;
  titulo: string;
  subtitulo: string;
  iconType: 'swords' | 'shield' | 'sobreescudo' | 'hp';
}

const COMBAT_FLOW_STEPS: ReadonlyArray<FlowStep> = [
  {
    id: 'ataque',
    titulo: 'Ataque',
    subtitulo: 'Dano físico ou mágico da classe',
    iconType: 'swords',
  },
  {
    id: 'mitigacao',
    titulo: 'Mitigação',
    subtitulo: 'Defesa física ou mágica do alvo',
    iconType: 'shield',
  },
  {
    id: 'sobreescudo',
    titulo: 'Sobreescudo',
    subtitulo: 'Absorve o dano antes da vida',
    iconType: 'sobreescudo',
  },
  {
    id: 'hp',
    titulo: 'HP',
    subtitulo: 'Pontos de vida restantes',
    iconType: 'hp',
  },
];

/**
 * Diagrama visual do fluxo de combate:
 * "Ataque" → "Mitigação" → "Sobreescudo" → "HP"
 * Empilha verticalmente em telas estreitas e alinha em fileira horizontal no desktop.
 */
export function CombatFlowDiagram() {
  return (
    <div
      aria-label="Fluxo de resolução de dano no combate: Ataque, Mitigação, Sobreescudo e HP"
      className="w-full pt-4"
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-2">
        {COMBAT_FLOW_STEPS.map((step, index) => {
          const isLast = index === COMBAT_FLOW_STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Caixa do estágio em fundo #1C1B18 com borda #B2A66C */}
              <div className="flex-1 bg-[#1C1B18] border border-[#B2A66C] rounded-xl p-4 flex flex-col items-center text-center gap-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
                <div className="w-12 h-12 rounded-lg bg-[#0D0D0D] border border-[#B2A66C]/60 flex items-center justify-center p-2 shrink-0">
                  {step.iconType === 'swords' && (
                    <Swords className="w-6 h-6 text-[#ED8A0C]" aria-hidden="true" />
                  )}
                  {step.iconType === 'shield' && (
                    <Shield className="w-6 h-6 text-[#D5C7A4]" aria-hidden="true" />
                  )}
                  {step.iconType === 'sobreescudo' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={RESOURCE_ICONS.sobreescudo}
                      alt="Sobreescudo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  )}
                  {step.iconType === 'hp' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={RESOURCE_ICONS.hp}
                      alt="HP"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                <div>
                  <span className="font-cinzel font-bold text-sm sm:text-base text-[#F5F3E0] block tracking-wide">
                    {step.titulo}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#E2D6B6] block mt-0.5 leading-snug">
                    {step.subtitulo}
                  </span>
                </div>
              </div>

              {/* Setas de conexão em #ED8A0C (vertical no mobile, horizontal no desktop) */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="flex items-center justify-center py-0.5 md:py-0 md:px-1 shrink-0 text-[#ED8A0C]"
                >
                  <ArrowDown className="w-5 h-5 md:hidden" />
                  <ArrowRight className="hidden md:block w-6 h-6" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
