'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { NOCTHERA_THEME } from '@/theme/theme';

export const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Chamada POST das telas de Desenvolvimento, com o feedback de sucesso ou erro. */
export function useAcaoDesenvolvimento(
  idToken: string | null,
  onCharacterChange: (character: CharacterDocument) => void
) {
  const [ocupado, setOcupado] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const chamar = async (url: string, sucesso: string): Promise<boolean> => {
    if (!idToken || ocupado) return false;
    setOcupado(true);
    setFeedback(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
      if (data.character) onCharacterChange(data.character);
      setFeedback({ type: 'success', message: sucesso });
      return true;
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao processar a ação.' });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  return { ocupado, feedback, chamar };
}

export function Feedback({ feedback }: { feedback: { type: 'success' | 'error'; message: string } | null }) {
  const { colors } = NOCTHERA_THEME;
  if (!feedback) return null;
  return (
    <div
      role="alert"
      className="rounded px-2 py-1 text-[11px] flex items-center gap-1.5 shadow-md font-medium leading-tight shrink-0"
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
      <span>{feedback.message}</span>
    </div>
  );
}

export function Saldo({ icone, valor, rotulo }: { icone: React.ReactNode; valor: number; rotulo: string }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <div
      role="group"
      aria-label={`${rotulo}: ${valor}`}
      title={rotulo}
      className="rounded px-1.5 py-1 flex items-center justify-center gap-1 shadow-sm"
      style={{ backgroundColor: `${colors.background.card}ee`, border: `1px solid ${colors.border.default}44` }}
    >
      {icone}
      <span className="text-[11px] font-bold font-cinzel" style={{ color: colors.text.primary }}>
        {fmt(valor)}
      </span>
      <span className="text-[9px] font-cinzel" style={{ color: colors.text.secondary }}>
        {rotulo}
      </span>
    </div>
  );
}

export function BotaoAcao({
  rotulo,
  habilitado,
  ocupado,
  onClick,
  custo,
}: {
  rotulo: string;
  habilitado: boolean;
  ocupado: boolean;
  onClick: () => void;
  custo?: React.ReactNode;
}) {
  const { colors } = NOCTHERA_THEME;
  return (
    <div className="flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        disabled={!habilitado || ocupado}
        onClick={onClick}
        className="w-full rounded py-1.5 px-1 text-[11px] font-bold font-cinzel leading-tight transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        style={{
          backgroundColor: colors.accent.primary,
          color: colors.background.secondary,
          border: `1px solid ${colors.accent.primary}`,
        }}
      >
        {ocupado ? 'Processando...' : rotulo}
      </button>
      {custo && <div className="flex items-center justify-center gap-1">{custo}</div>}
    </div>
  );
}
