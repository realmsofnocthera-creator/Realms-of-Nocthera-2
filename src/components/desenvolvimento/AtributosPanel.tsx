'use client';

import React from 'react';
import { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTES, AttributeName } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { ATTRIBUTE_ICONS, RESOURCE_ICONS } from '@/assets/icons';
import { BOTOES_DE_ATRIBUTO } from '@/assets/atributosUi';
import { EMBLEMAS_UI } from '@/assets/emblemasUi';
import { FICHA_UI } from '@/assets/personagemUi';
import { calcularChanceCritico } from '@/game';
import { PendingAttributes, calcularTotalPendente, calcularPontosRestantes } from '@/lib/attributeState';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { PainelDaForja } from '@/components/forja/KitDaForja';
import { PlacaPixel, CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';

interface AtributosPanelProps {
  character: CharacterDocument;
  pendente: PendingAttributes;
  onAdjust: (attr: AttributeName, delta: number) => void;
  onLimpar: () => void;
  onConfirmar: () => void;
  isSubmitting: boolean;
  isResetting: boolean;
  feedback: { type: 'success' | 'error'; message: string } | null;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** Botão + ou − em pixel art (aceso ou apagado). */
function BotaoDeAjuste({ tipo, ativo, rotulo, onClick }: { tipo: 'mais' | 'menos'; ativo: boolean; rotulo: string; onClick: () => void }) {
  const src = tipo === 'mais' ? (ativo ? BOTOES_DE_ATRIBUTO.mais : BOTOES_DE_ATRIBUTO.maisApagado) : ativo ? BOTOES_DE_ATRIBUTO.menos : BOTOES_DE_ATRIBUTO.menosApagado;
  return (
    <button type="button" onClick={onClick} disabled={!ativo} aria-label={rotulo} className={`relative block w-[8.4cqw] h-[8.4cqw] shrink-0 before:absolute before:-inset-[1cqw] before:content-[''] ${ativo ? 'cursor-pointer active:translate-y-px' : 'cursor-not-allowed'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" draggable={false} className="block w-full h-full pointer-events-none" style={pixel} />
    </button>
  );
}

/**
 * A distribuição de atributos em pixel (arte do Yuri): a faixa de pontos disponíveis, o nível e os recursos, as 7 linhas
 * com − / valor / + e os botões Limpar e Confirmar. Os ícones são os de sempre; os textos vêm de `textosDaFicha.ts`.
 */
export function AtributosPanel({ character, pendente, onAdjust, onLimpar, onConfirmar, isSubmitting, isResetting, feedback, className = '' }: AtributosPanelProps) {
  const t = TEXTOS_DA_FICHA.desenvolvimentoTela;
  const totalPendente = calcularTotalPendente(pendente);
  const pontosRestantes = calcularPontosRestantes(character.pontosDisponiveis || 0, pendente);
  const ocupado = isSubmitting || isResetting;

  const recursos = [
    { id: 'hp', nome: 'HP', icone: RESOURCE_ICONS.hp, valor: String(character.hpMax), cor: 'text-[#F5A6A6]' },
    { id: 'sobreescudo', nome: 'Sobreescudo', icone: RESOURCE_ICONS.sobreescudo, valor: String(character.sobreescudoMax), cor: 'text-[#F5C542]' },
    { id: 'critico', nome: 'Crítico', icone: ATTRIBUTE_ICONS.sorte, valor: `${String(character.chanceCritico ?? calcularChanceCritico(character.atributos.sorte)).replace('.', ',')}%`, cor: 'text-[#C4B5FD]' },
  ];

  return (
    <div className={`flex flex-col items-stretch gap-[1.8cqw] w-full select-none ${className}`}>
      {feedback && (
        <p role="alert" className={`font-cinzel font-bold text-[2.4cqw] leading-snug text-center ${feedback.type === 'success' ? 'text-[#9BE3A0]' : 'text-[#FFB4B4]'}`}>{feedback.message}</p>
      )}

      {/* os pontos que ainda dá para distribuir (a moldura de identidade) */}
      <PlacaPixel src={FICHA_UI.identidade} aspecto="479 / 105" largura="100%" margens={[13, 5]} className={pontosRestantes > 0 ? 'drop-shadow-[0_0_1.4cqw_rgba(237,180,76,0.8)]' : ''}>
        <span className={pontosRestantes > 0 ? 'text-[#EDB44C]' : 'text-[#8FA3BF]'}>{pontosRestantes > 0 ? textoDaFicha(t.pontos, { n: pontosRestantes }) : t.semPontos}</span>
      </PlacaPixel>

      {/* o nível e os recursos */}
      <div className="grid grid-cols-4 gap-[1cqw]">
        <PainelDaForja borda="1.6cqw" role="group" aria-label={`${t.nivel}: ${character.nivel}`} className="flex items-center justify-center py-[0.4cqw]">
          <span className="font-cinzel font-black text-[2.6cqw] leading-[1.4] text-[#EDB44C] whitespace-nowrap">{textoDaFicha(t.nivelCurto, { n: character.nivel })}</span>
        </PainelDaForja>
        {recursos.map((rec) => (
          <PainelDaForja key={rec.id} borda="1.6cqw" role="group" aria-label={`${rec.nome}: ${rec.valor}`} className="flex items-center justify-center gap-[0.8cqw] py-[0.4cqw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rec.icone} alt="" aria-hidden="true" draggable={false} className="w-[3.4cqw] h-[3.4cqw] object-contain shrink-0 pointer-events-none" />
            <span className={`font-cinzel font-black text-[2.4cqw] leading-[1.4] tabular-nums ${rec.cor}`}>{rec.valor}</span>
          </PainelDaForja>
        ))}
      </div>

      {/* as 7 linhas de atributo */}
      <PainelDaForja borda="2.6cqw" aria-label={TEXTOS_DA_FICHA.atributos.titulo}>
        <ul className="flex flex-col">
          {ATTRIBUTES.map((attr) => {
            const valorServidor = character.atributos[attr] || 0;
            const qtdPendente = pendente[attr] || 0;
            const nome = ATTRIBUTE_DISPLAY_NAMES[attr];
            const podeAdicionar = pontosRestantes > 0 && !ocupado;
            const podeDiminuir = qtdPendente > 0 && !ocupado;
            return (
              <li key={attr} className="flex items-center justify-between gap-[1.4cqw] py-[1cqw] border-b border-dashed border-[#2B3F5C] last:border-b-0">
                <span className="flex items-center gap-[1.6cqw] min-w-0 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ATTRIBUTE_ICONS[attr]} alt="" aria-hidden="true" draggable={false} className="w-[5.2cqw] h-[5.2cqw] object-contain shrink-0 pointer-events-none" />
                  <span className="font-cinzel font-extrabold text-[2.8cqw] leading-[1.4] text-[#F5F3E0] whitespace-nowrap" style={{ textShadow: CONTORNO_PIXEL }}>{nome}</span>
                </span>
                <span className="flex items-center gap-[1.2cqw] shrink-0">
                  <BotaoDeAjuste tipo="menos" ativo={podeDiminuir} rotulo={textoDaFicha(t.diminuir, { nome })} onClick={() => onAdjust(attr, -1)} />
                  <span className={`w-[7cqw] text-center font-cinzel font-black text-[3.2cqw] leading-[1.4] tabular-nums ${qtdPendente > 0 ? 'text-[#EDB44C]' : 'text-[#F5F3E0]'}`} style={{ textShadow: CONTORNO_PIXEL }}>{valorServidor + qtdPendente}</span>
                  <BotaoDeAjuste tipo="mais" ativo={podeAdicionar} rotulo={textoDaFicha(t.aumentar, { nome })} onClick={() => onAdjust(attr, 1)} />
                </span>
              </li>
            );
          })}
        </ul>
      </PainelDaForja>

      {/* Limpar e Confirmar (as barras do Yuri) */}
      <div className="flex items-center justify-between gap-[1.4cqw]">
        <PlacaPixel src={EMBLEMAS_UI.barraB} aspecto="420 / 119" largura="38%" onClick={onLimpar} desligada={totalPendente === 0 || ocupado} margens={[17, 17]}>{t.limpar}</PlacaPixel>
        <PlacaPixel src={EMBLEMAS_UI.barraA} aspecto="520 / 131" largura="58%" onClick={onConfirmar} desligada={totalPendente === 0 || ocupado} margens={[16, 14]}>
          {isSubmitting ? t.gravando : `${t.confirmar}${totalPendente > 0 ? ` (${totalPendente})` : ''}`}
        </PlacaPixel>
      </div>
    </div>
  );
}
