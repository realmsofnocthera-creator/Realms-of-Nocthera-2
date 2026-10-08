'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { CharacterDocument } from '@/server/characterService';
import { AttributeName } from '@/rules/attributes';
import { DESENVOLVIMENTO_ASSETS } from '@/rules/desenvolvimentoAssets';
import {
  DesenvolvimentoSecaoId,
  DESENVOLVIMENTO_SECAO_PADRAO,
} from '@/rules/desenvolvimentoMenu';
import { GAME_CONFIG } from '@/rules/config';
import { calcularPoderTotal } from '@/game';
import {
  PendingAttributes,
  ZEROS_PENDENTE,
  ajustarPontoPendente,
  limparPendente,
} from '@/lib/attributeState';
import { NOCTHERA_THEME } from '@/theme/theme';
import { DesenvolvimentoMenu } from './DesenvolvimentoMenu';
import { AtributosPanel } from './AtributosPanel';

export function DesenvolvimentoScreen() {
  const router = useRouter();
  const { colors } = NOCTHERA_THEME;

  const [idToken, setIdToken] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const [secaoAtiva, setSecaoAtiva] = useState<DesenvolvimentoSecaoId>(
    DESENVOLVIMENTO_SECAO_PADRAO
  );
  const [pendente, setPendente] = useState<PendingAttributes>({ ...ZEROS_PENDENTE });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let cancelado = false;

    const buscarPersonagem = async (token: string): Promise<CharacterDocument | null> => {
      try {
        const res = await fetch('/api/character/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          return null;
        }
        const data = await res.json();
        return data.character || null;
      } catch {
        return null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      try {
        await auth.authStateReady();
      } catch {
        // Prossegue
      }

      const activeUser = auth.currentUser ?? currentUser;

      if (activeUser) {
        try {
          const token = await activeUser.getIdToken();
          const char = await buscarPersonagem(token);
          if (cancelado) return;
          if (char) {
            setIdToken(token);
            setCharacter(char);
            setLoading(false);
          } else {
            router.replace('/login');
          }
        } catch {
          if (!cancelado) router.replace('/login');
        }
      } else {
        if (!cancelado) router.replace('/login');
      }
    });

    return () => {
      cancelado = true;
      unsubscribe();
    };
  }, [router]);

  if (loading || !character) {
    return (
      <div
        className="h-dvh max-h-dvh w-full flex flex-col items-center justify-center p-4 select-none overflow-hidden"
        style={{ backgroundColor: colors.background.primary }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: colors.accent.primary, borderTopColor: 'transparent' }}
          />
          <span
            className="text-xs uppercase tracking-widest font-semibold font-cinzel"
            style={{ color: colors.text.secondary }}
          >
            Carregando Desenvolvimento...
          </span>
        </div>
      </div>
    );
  }

  const pontosDisponiveisBase = character.pontosDisponiveis || 0;
  const saldoDiamantes = character.diamantes ?? 0;
  const custoReset = GAME_CONFIG.CUSTO_RESET_ATRIBUTOS_DIAMANTES;
  const temPontosAlocados = Object.values(character.pontosAlocadosPorNivel || {}).some(
    (qtd) => Number(qtd) > 0
  );
  const podeResetar =
    temPontosAlocados && saldoDiamantes >= custoReset && !isSubmitting && !isResetting;

  const poderTotal = calcularPoderTotal(character.atributos);

  const handleAdjust = (attr: AttributeName, delta: number) => {
    if (isSubmitting || isResetting) return;
    setFeedback(null);
    setPendente((prev) => ajustarPontoPendente(pontosDisponiveisBase, prev, attr, delta));
  };

  const handleLimpar = () => {
    if (isSubmitting || isResetting) return;
    setFeedback(null);
    setPendente(limparPendente());
  };

  const handleConfirmarDistribuicao = async () => {
    if (isSubmitting || !idToken) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/character/atributos/distribuir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ distribuicao: pendente }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao distribuir pontos de atributo.');
      }

      if (data.character) {
        setCharacter(data.character);
        setPendente(limparPendente());
        setFeedback({
          type: 'success',
          message: 'Atributos atualizados!',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar distribuição.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmarReset = async () => {
    if (!podeResetar || isResetting || !idToken) return;

    setIsResetting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/character/atributos/resetar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao resetar atributos.');
      }

      if (data.character) {
        setCharacter(data.character);
        setPendente(limparPendente());
        setIsResetModalOpen(false);
        setFeedback({
          type: 'success',
          message: `Atributos resetados (-${custoReset} diamantes).`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao resetar atributos.';
      setFeedback({ type: 'error', message: msg });
      setIsResetModalOpen(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <main
      className="relative h-dvh max-h-dvh min-h-[520px] w-full flex flex-col justify-between overflow-hidden select-none"
      style={{
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
      }}
    >
      {/* 1) CENÁRIO DE FUNDO FIXO */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${DESENVOLVIMENTO_ASSETS.background}')`,
        }}
      >
        {/* Overlay escuro com cores de NOCTHERA_THEME */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 30%, rgba(13,13,13,0.45) 0%, rgba(13,13,13,0.92) 100%)`,
          }}
        />
      </div>

      {/* 2) HEADER / TOPO ESQUERDO: BOTÃO VOLTAR (~40px) */}
      <header className="relative z-30 w-full h-10 shrink-0 flex items-center justify-start px-2 sm:px-4 pt-1 pointer-events-auto">
        <button
          type="button"
          onClick={() => router.push('/personagem')}
          aria-label="Voltar para a Ficha de Personagem"
          className="relative transition-all active:scale-95 cursor-pointer hover:brightness-110 flex items-center h-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DESENVOLVIMENTO_ASSETS.botaoVoltar}
            alt="Voltar"
            className="h-8 sm:h-9 w-auto object-contain drop-shadow pointer-events-none select-none"
          />
        </button>
      </header>

      {/* 3) REGIÃO PRINCIPAL: DUAS COLUNAS (FLEX-1 SEM SCROLL) */}
      <div className="relative z-20 flex-1 min-h-0 w-full max-w-4xl mx-auto px-1.5 sm:px-3 flex items-stretch justify-between gap-1.5 sm:gap-3 overflow-hidden">
        {/* Coluna Esquerda: Menu Vertical (~84px) */}
        <aside className="w-[84px] shrink-0 h-full flex items-center justify-center overflow-hidden py-0.5">
          <DesenvolvimentoMenu
            secaoAtiva={secaoAtiva}
            onSelectSecao={setSecaoAtiva}
            pontosDisponiveis={pontosDisponiveisBase}
            className="w-full"
          />
        </aside>

        {/* Coluna Direita: Painel flex-1 min-w-0 */}
        <section className="flex-1 min-w-0 h-full flex flex-col justify-between max-w-[320px] overflow-hidden pr-0.5">
          {secaoAtiva === 'atributos' && (
            <AtributosPanel
              character={character}
              pendente={pendente}
              onAdjust={handleAdjust}
              onLimpar={handleLimpar}
              onConfirmar={handleConfirmarDistribuicao}
              isSubmitting={isSubmitting}
              isResetting={isResetting}
              feedback={feedback}
              className="h-full flex flex-col justify-between"
            />
          )}
        </section>
      </div>

      {/* 4) RODAPÉ: FLUXO NORMAL, TRANSPARENTE, SEM MOLDURA (~50px) */}
      <footer
        className="relative z-30 w-full h-[50px] shrink-0 px-3 sm:px-6 flex items-center justify-between bg-transparent pointer-events-auto"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Poder Total: SOMENTE Ícone + Número (sem moldura, sem fundo, sem borda, sem texto "PODER TOTAL") */}
        <div
          role="group"
          aria-label={`Poder Total: ${poderTotal}`}
          className="flex items-center gap-1.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DESENVOLVIMENTO_ASSETS.iconePoder}
            alt=""
            aria-hidden="true"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow pointer-events-none select-none"
          />
          <span
            className="text-base sm:text-lg font-black tracking-wider font-cinzel leading-none text-amber-400"
            style={{
              textShadow: '0 1px 3px rgba(0,0,0,1), 0 0 6px rgba(237,138,12,0.6)',
            }}
          >
            {poderTotal}
          </span>
        </div>

        {/* Botão Circular Dourado de Resetar Atributos */}
        <button
          type="button"
          onClick={() => setIsResetModalOpen(true)}
          disabled={!podeResetar}
          title={
            !temPontosAlocados
              ? 'Nenhum ponto de nível distribuído para resetar'
              : saldoDiamantes < custoReset
              ? `Diamantes insuficientes (${saldoDiamantes}/${custoReset})`
              : `Resetar atributos por ${custoReset} diamantes`
          }
          aria-label={`Resetar atributos por ${custoReset} diamantes`}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 shadow-xl group"
          style={{
            backgroundColor: colors.background.cardElevated,
            border: `2px solid ${podeResetar ? colors.accent.primary : `${colors.border.default}66`}`,
            boxShadow: podeResetar
              ? `0 0 12px ${colors.accent.primary}66, inset 0 0 8px ${colors.accent.primary}33`
              : 'none',
            color: podeResetar ? colors.accent.primary : colors.text.secondary,
          }}
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-rotate-45" />
        </button>
      </footer>

      {/* 5) MODAL DE CONFIRMAÇÃO DE RESET */}
      {isResetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-reset-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto"
        >
          <div
            className="w-full max-w-sm rounded-lg p-5 flex flex-col gap-4 shadow-2xl relative border"
            style={{
              backgroundColor: colors.background.card,
              borderColor: colors.accent.primary,
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${colors.accent.primary}22`,
                  border: `1px solid ${colors.accent.primary}55`,
                }}
              >
                <AlertTriangle className="w-5 h-5" style={{ color: colors.accent.primary }} />
              </div>
              <h3
                id="modal-reset-title"
                className="text-base font-bold font-serif uppercase tracking-wider font-cinzel"
                style={{ color: colors.text.primary }}
              >
                Confirmar Reset?
              </h3>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: colors.text.secondary }}>
              Você está prestes a resetar todos os pontos distribuídos por nível. O custo de{' '}
              <strong className="text-cyan-300 font-bold">{custoReset} diamantes</strong> será debitado
              do seu saldo atual ({saldoDiamantes} diamantes). Os 10 pontos da criação do personagem
              permanecem intactos.
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="flex-1 py-2 px-3 rounded text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer"
                style={{
                  backgroundColor: colors.background.cardElevated,
                  border: `1px solid ${colors.border.default}55`,
                  color: colors.text.secondary,
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmarReset}
                disabled={isResetting}
                className="flex-1 py-2 px-3 rounded text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-md"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: colors.background.secondary,
                }}
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Resetando...</span>
                  </>
                ) : (
                  <span>Confirmar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
