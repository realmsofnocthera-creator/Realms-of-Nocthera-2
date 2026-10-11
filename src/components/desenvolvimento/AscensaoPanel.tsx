'use client';

import React, { useState } from 'react';
import { Check, Hexagon, Lock } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { acaoDaAscensao, habilidadesDoEspaco, linhaDaAscensao, type PassoDaLinha } from '@/lib/progressaoHabilidadeTela';
import { NOCTHERA_THEME } from '@/theme/theme';
import { BotaoAcao, Feedback, Saldo, useAcaoDesenvolvimento } from './progressaoComum';

interface AscensaoPanelProps {
  character: CharacterDocument;
  idToken: string | null;
  onCharacterChange: (character: CharacterDocument) => void;
  className?: string;
}

/**
 * Ascensão de Habilidade (2.2.1, botão "Avanço de Habilidade"): A1 a A10, 1 fragmento de ascensão
 * por passo; libera com o Reforço no nível 30. Cada passo leva uma habilidade (classe e subclasse no
 * mesmo espaço) ao nível 2 (+10%) ou 3 (+20%).
 */
export function AscensaoPanel({ character, idToken, onCharacterChange, className = '' }: AscensaoPanelProps) {
  const { colors } = NOCTHERA_THEME;
  const linha = linhaDaAscensao(character);
  const acao = acaoDaAscensao(character);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const { ocupado, feedback, chamar } = useAcaoDesenvolvimento(idToken, onCharacterChange);
  const iconeFragmento = <Hexagon className="w-3 h-3 text-fuchsia-300" aria-hidden="true" />;

  const atual = selecionado ?? acao.ascensao ?? 10;
  const passo = linha.find((p) => p.ascensao === atual) as PassoDaLinha;
  const nomes = habilidadesDoEspaco(character, passo.espaco);

  const Circulo = ({ p }: { p: PassoDaLinha }) => {
    const comprado = p.estado === 'comprado';
    const proximo = p.estado === 'proximo';
    const ativo = p.ascensao === atual;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={ativo}
        aria-label={`A${p.ascensao}: ${p.rotulo} nível ${p.nivelHabilidade} (${comprado ? 'comprado' : proximo ? 'próximo' : 'bloqueado'})`}
        onClick={() => setSelecionado(p.ascensao)}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black font-cinzel shrink-0 cursor-pointer transition-all active:scale-95 ${proximo && acao.habilitada ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: comprado ? colors.accent.primary : colors.background.cardElevated,
          color: comprado ? colors.background.secondary : proximo ? colors.accent.primary : colors.text.secondary,
          border: `2px solid ${comprado || proximo ? colors.accent.primary : `${colors.border.default}66`}`,
          boxShadow: ativo ? `0 0 0 3px ${colors.accent.primary}55, 0 0 10px ${colors.accent.primary}88` : 'none',
          opacity: p.estado === 'bloqueado' ? 0.7 : 1,
        }}
      >
        A{p.ascensao}
      </button>
    );
  };

  const Fileira = ({ passos, titulo }: { passos: PassoDaLinha[]; titulo: string }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold font-cinzel uppercase tracking-wider" style={{ color: colors.text.secondary }}>{titulo}</span>
      <div className="flex items-center" role="tablist" aria-label={titulo}>
        {passos.map((p, i) => (
          <React.Fragment key={p.ascensao}>
            {i > 0 && (
              <div
                aria-hidden="true"
                className="flex-1 h-0.5"
                style={{ backgroundColor: passos[i - 1].estado === 'comprado' ? colors.accent.primary : `${colors.border.default}55` }}
              />
            )}
            <Circulo p={p} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`h-full flex flex-col gap-2 w-full max-w-[320px] select-none overflow-y-auto overflow-x-hidden pr-0.5 ${className}`}>
      <Feedback feedback={feedback} />

      <Saldo icone={iconeFragmento} valor={character.fragmentosAscensao ?? 0} rotulo="Fragmentos de ascensão" />

      <div
        className="rounded-md px-2 py-1.5 flex items-center justify-between"
        style={{ background: `linear-gradient(165deg, ${colors.accent.primary}33 0%, ${colors.background.card} 100%)`, border: `1.5px solid ${colors.accent.primary}88` }}
      >
        <span className="text-[14px] font-black font-cinzel" style={{ color: colors.text.primary }}>Ascensão</span>
        <span className="text-[11px] font-bold font-cinzel px-1.5 py-0.5 rounded" style={{ backgroundColor: '#000000bb', color: colors.accent.primary }}>
          A{character.ascensaoHabilidade ?? 0}/10
        </span>
      </div>

      <div className="rounded-md px-2 py-2 flex flex-col gap-2" style={{ backgroundColor: `${colors.background.card}99`, border: `1px solid ${colors.border.default}33` }}>
        <Fileira passos={linha.slice(0, 5)} titulo="Habilidades no nível 2 (+10%)" />
        <Fileira passos={linha.slice(5)} titulo="Habilidades no nível 3 (+20%)" />
      </div>

      <div className="rounded-md p-2 flex flex-col gap-0.5" style={{ backgroundColor: `${colors.background.card}ee`, border: `1px solid ${colors.border.default}55` }}>
        <span className="text-[11px] font-bold font-cinzel leading-tight flex items-center gap-1" style={{ color: colors.accent.primary }}>
          {passo.estado === 'comprado' ? <Check className="w-3 h-3" aria-hidden="true" /> : passo.estado === 'bloqueado' ? <Lock className="w-3 h-3" aria-hidden="true" /> : null}
          A{passo.ascensao} · {passo.rotulo} nível {passo.nivelHabilidade}
        </span>
        <span className="text-[11px] leading-snug" style={{ color: colors.text.secondary }}>
          {passo.bonus} no dano ou efeito de: <b style={{ color: colors.text.primary }}>{nomes.join(' e ')}</b>.
        </span>
      </div>

      {acao.ascensao !== null && (
        <BotaoAcao
          rotulo={`Ascender para A${acao.ascensao}`}
          habilitado={acao.habilitada}
          ocupado={ocupado}
          onClick={async () => {
            const ok = await chamar('/api/character/habilidades/ascender', `Ascensão A${acao.ascensao} concluída!`);
            if (ok) setSelecionado(null);
          }}
          custo={
            <span
              aria-label={`Fragmentos de ascensão: ${acao.custo}`}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold font-cinzel"
              style={{ color: acao.aviso === 'Fragmentos de ascensão insuficientes' ? '#F5A6A6' : colors.text.primary }}
            >
              {iconeFragmento}
              {acao.custo}
            </span>
          }
        />
      )}
      {acao.aviso && (
        <span className="text-[10px] text-center font-semibold" style={{ color: colors.text.secondary }}>
          {acao.aviso}
        </span>
      )}
    </div>
  );
}
