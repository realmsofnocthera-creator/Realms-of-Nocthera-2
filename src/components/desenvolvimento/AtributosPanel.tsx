'use client';

import React from 'react';
import { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTES, AttributeName } from '@/rules/attributes';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { ATTRIBUTE_ICONS, RESOURCE_ICONS } from '@/assets/icons';
import { calcularChanceCritico } from '@/game';
import { FICHA_ASSETS } from '@/rules/fichaAssets';
import {
  PendingAttributes,
  calcularTotalPendente,
  calcularPontosRestantes,
} from '@/lib/attributeState';
import { NOCTHERA_THEME } from '@/theme/theme';
import { Check, AlertTriangle, Plus, Minus, RotateCcw } from 'lucide-react';

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

export function AtributosPanel({
  character,
  pendente,
  onAdjust,
  onLimpar,
  onConfirmar,
  isSubmitting,
  isResetting,
  feedback,
  className = '',
}: AtributosPanelProps) {
  const { colors } = NOCTHERA_THEME;

  const totalPendente = calcularTotalPendente(pendente);
  const pontosRestantes = calcularPontosRestantes(character.pontosDisponiveis || 0, pendente);

  const recursos = [
    {
      id: 'hp',
      nome: 'HP',
      icone: RESOURCE_ICONS.hp,
      valor: character.hpMax,
      corValor: 'text-[#F5A6A6]',
    },
    {
      id: 'sobreescudo',
      nome: 'Sobreescudo',
      icone: RESOURCE_ICONS.sobreescudo,
      valor: character.sobreescudoMax,
      corValor: 'text-[#F5C542]',
    },
    {
      id: 'critico',
      nome: 'Crítico',
      icone: ATTRIBUTE_ICONS.sorte,
      valor: `${String(
        character.chanceCritico ?? calcularChanceCritico(character.atributos.sorte)
      ).replace('.', ',')}%`,
      corValor: 'text-[#C4B5FD]',
    },
  ];

  return (
    <div
      className={`h-full flex flex-col justify-between gap-1.5 w-full max-w-[320px] select-none ${className}`}
    >
      {/* Toast / Faixa Compacta de Feedback (se houver) */}
      {feedback && (
        <div
          role="alert"
          className="rounded px-2 py-1 text-[11px] flex items-center gap-1.5 shadow-md animate-fade-in shrink-0 font-medium leading-tight"
          style={{
            backgroundColor: feedback.type === 'success' ? colors.status.success : colors.status.danger,
            border: `1px solid ${feedback.type === 'success' ? colors.status.successText : colors.status.danger}`,
            color: feedback.type === 'success' ? colors.status.successText : colors.text.primary,
          }}
        >
          {feedback.type === 'success' ? (
            <Check className="w-3.5 h-3.5 shrink-0 text-green-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          )}
          <span className="truncate">{feedback.message}</span>
        </div>
      )}

      {/* a) Linha única: Título "Nível do Personagem" à esquerda + Caixa "Nv. X" à direita */}
      <div className="flex items-center justify-between gap-2 px-1 h-7 shrink-0">
        <span
          className="text-xs sm:text-[13px] font-bold tracking-tight uppercase font-cinzel whitespace-nowrap"
          style={{
            color: colors.text.primary,
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          Nível do Personagem
        </span>

        <div
          className="px-2.5 py-0.5 rounded font-cinzel font-black text-xs shadow-md shrink-0"
          style={{
            backgroundColor: colors.background.card,
            border: `1.5px solid ${colors.accent.primary}`,
            color: colors.accent.primary,
            boxShadow: `0 0 6px ${colors.accent.primary}55`,
          }}
        >
          Nv. {character.nivel}
        </div>
      </div>

      {/* b) Linha com os 3 Chips (ícone + valor) */}
      <div className="grid grid-cols-3 gap-1 w-full shrink-0">
        {recursos.map((rec) => (
          <div
            key={rec.id}
            role="group"
            aria-label={`${rec.nome}: ${rec.valor}`}
            className="rounded px-1.5 py-1 flex items-center justify-center gap-1 shadow-sm"
            style={{
              backgroundColor: `${colors.background.card}ee`,
              border: `1px solid ${colors.border.default}44`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rec.icone}
              alt=""
              aria-hidden="true"
              className="w-3.5 h-3.5 object-contain shrink-0 pointer-events-none"
            />
            <span className={`text-xs font-bold tabular-nums font-cinzel ${rec.corValor}`}>
              {rec.valor}
            </span>
          </div>
        ))}
      </div>

      {/* b2) Faixa de pontos disponíveis em linha compacta */}
      <div
        className="rounded px-2.5 py-1 flex items-center justify-center text-center shadow-inner shrink-0"
        style={{
          backgroundColor: pontosRestantes > 0 ? `${colors.status.danger}d9` : `${colors.background.card}cc`,
          border: `1px solid ${pontosRestantes > 0 ? colors.accent.primary : `${colors.border.default}33`}`,
          boxShadow: pontosRestantes > 0 ? `0 0 6px ${colors.status.danger}66` : 'none',
        }}
      >
        <span
          className="text-[11px] sm:text-xs font-bold tracking-tight uppercase font-cinzel whitespace-nowrap"
          style={{
            color: pontosRestantes > 0 ? colors.text.primary : colors.text.secondary,
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          {pontosRestantes > 0
            ? `Pontos disponíveis: ${pontosRestantes}`
            : 'Nenhum ponto disponível'}
        </span>
      </div>

      {/* c) Moldura de Atributos com as 7 linhas 100% dentro da imagem */}
      <div className="relative flex-1 min-h-[220px] w-full shrink-0">
        {/* Imagem da moldura como fundo com object-fill para esticar perfeitamente e conter as 7 linhas */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FICHA_ASSETS.molduraAtributos}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0 drop-shadow-lg"
        />

        {/* Conteúdo com padding interno seguro que desvia do cabeçalho da moldura ("ATRIBUTOS") e bordas */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between pt-[16%] pb-[7%] pl-[7%] pr-[8%] text-[#F5F3E0] font-cinzel">
          <div className="flex flex-col justify-between h-full py-0.5">
            {ATTRIBUTES.map((attr) => {
              const valorServidor = character.atributos[attr] || 0;
              const qtdPendente = pendente[attr] || 0;
              const valorExibido = valorServidor + qtdPendente;
              const nomeExibicao = ATTRIBUTE_DISPLAY_NAMES[attr];
              const iconeSrc = ATTRIBUTE_ICONS[attr];

              const podeAdicionar = pontosRestantes > 0 && !isSubmitting && !isResetting;
              const podeDiminuir = qtdPendente > 0 && !isSubmitting && !isResetting;

              return (
                <div
                  key={attr}
                  className="flex-1 flex items-center justify-between gap-1 py-0.5 border-b border-[#B2A66C]/20 last:border-b-0 min-h-[22px]"
                >
                  {/* Ícone + Nome (SEM truncar/ellipsis, tracking ajustado) */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconeSrc}
                      alt=""
                      aria-hidden="true"
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain shrink-0 drop-shadow pointer-events-none"
                    />
                    <span
                      className="text-[11px] sm:text-xs font-bold tracking-tight whitespace-nowrap font-cinzel text-white"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                    >
                      {nomeExibicao}
                    </span>
                  </div>

                  {/* Grupo Controles: − / Valor / + (botões 26x26px com touch target de 36x36px) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAdjust(attr, -1)}
                      disabled={!podeDiminuir}
                      aria-label={`Diminuir ${nomeExibicao}`}
                      className="relative w-6 h-6 rounded bg-[#1C1B18] border border-[#B2A66C]/50 text-[#F5F3E0] hover:text-[#ED8A0C] flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-90 shadow-sm before:absolute before:-inset-1.5 before:content-['']"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <span
                      className="w-5 text-center text-xs sm:text-[13px] font-bold tabular-nums font-cinzel"
                      style={{ color: qtdPendente > 0 ? colors.accent.primary : colors.text.primary }}
                    >
                      {valorExibido}
                    </span>

                    <button
                      type="button"
                      onClick={() => onAdjust(attr, 1)}
                      disabled={!podeAdicionar}
                      aria-label={`Aumentar ${nomeExibicao}`}
                      className="relative w-6 h-6 rounded bg-[#1C1B18] border border-[#ED8A0C]/70 text-[#ED8A0C] hover:brightness-125 flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-90 shadow-sm before:absolute before:-inset-1.5 before:content-['']"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* e) Botões Confirmar e Limpar abaixo da moldura (altura ~36px, sem quebra de linha) */}
      <div className="flex items-center gap-2 h-9 shrink-0 w-full">
        <button
          type="button"
          onClick={onLimpar}
          disabled={totalPendente === 0 || isSubmitting || isResetting}
          className="flex-1 h-full rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 font-cinzel shadow-sm whitespace-nowrap"
          style={{
            backgroundColor: `${colors.background.card}f2`,
            border: `1px solid ${colors.border.default}55`,
            color: colors.text.secondary,
          }}
        >
          <RotateCcw className="w-3 h-3" />
          <span>Limpar</span>
        </button>

        <button
          type="button"
          onClick={onConfirmar}
          disabled={totalPendente === 0 || isSubmitting || isResetting}
          className="flex-[2] h-full rounded text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 shadow-md font-cinzel whitespace-nowrap px-2"
          style={{
            backgroundColor: colors.accent.primary,
            color: colors.background.secondary,
          }}
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Gravando...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[10px] font-black"
                style={{
                  backgroundColor: colors.background.secondary,
                  color: colors.accent.primary,
                }}
              >
                {totalPendente}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
