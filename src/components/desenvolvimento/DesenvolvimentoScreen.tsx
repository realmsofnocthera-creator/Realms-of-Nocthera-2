'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { CharacterDocument } from '@/server/characterService';
import { AttributeName } from '@/rules/attributes';
import { FICHA_UI, ICONE_DO_PODER } from '@/assets/personagemUi';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { BotaoRedondo, BotaoDoKit, BarraDeTitulo, PainelDaForja } from '@/components/forja/KitDaForja';
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
import { DesenvolvimentoMenu } from './DesenvolvimentoMenu';
import { AtributosPanel } from './AtributosPanel';
import { SubclassePanel } from './SubclassePanel';
import { ReforcoPanel } from './ReforcoPanel';
import { AscensaoPanel } from './AscensaoPanel';
import { MaestriasPanel } from './MaestriasPanel';

export function DesenvolvimentoScreen() {
  const router = useRouter();
  const t = TEXTOS_DA_FICHA.desenvolvimentoTela;

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
      <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-center p-4 select-none overflow-hidden bg-[#05070D]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#EDB44C] border-t-transparent animate-spin" />
          <span className="text-xs uppercase tracking-widest font-extrabold font-cinzel text-[#DFF3FF]">{t.carregando}</span>
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

  // Poder Total com o bônus do Reforço de Habilidade e o do equipamento (atributos efetivos)
  const poderTotal =
    character.poderTotal ??
    calcularPoderTotal(character.atributos) +
    Object.values(character.bonusReforco ?? {}).reduce((soma, v) => soma + Number(v || 0), 0) +
    Object.values(character.bonusEquipamento ?? {}).reduce((soma, v) => soma + Number(v || 0), 0);

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
        throw new Error(data.error || t.erroDistribuir);
      }

      if (data.character) {
        setCharacter(data.character);
        setPendente(limparPendente());
        setFeedback({
          type: 'success',
          message: t.atributosAtualizados,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.erroProcessar;
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
        throw new Error(data.error || t.erroResetar);
      }

      if (data.character) {
        setCharacter(data.character);
        setPendente(limparPendente());
        setIsResetModalOpen(false);
        setFeedback({
          type: 'success',
          message: textoDaFicha(t.resetFeito, { custo: custoReset }),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.erroResetarGeral;
      setFeedback({ type: 'error', message: msg });
      setIsResetModalOpen(false);
    } finally {
      setIsResetting(false);
    }
  };

  const dicaDoReset = !temPontosAlocados ? t.resetarSemPontos : saldoDiamantes < custoReset ? textoDaFicha(t.resetarSemDiamantes, { saldo: saldoDiamantes, custo: custoReset }) : textoDaFicha(t.resetarRotulo, { custo: custoReset });

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none bg-[#05070D] text-[#F5F3E0]">
      {/* 1) FUNDO: as ruínas sob a lua, a tela toda, com um véu escuro para os textos lerem bem */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-cover bg-no-repeat" style={{ backgroundImage: `url(${FICHA_UI.fundo})`, backgroundPosition: '76% center' }}>
        <div className="absolute inset-0 bg-[#05070D]/45" />
      </div>

      <div className="forja-palco !justify-between gap-[1.4cqw] pt-[max(1.4cqw,env(safe-area-inset-top))] pb-[max(1.6cqw,env(safe-area-inset-bottom))]">
        {/* 2) TOPO: voltar para a ficha e o título */}
        <header className="flex items-center gap-[2cqw] px-[2.4cqw] shrink-0">
          <button type="button" onClick={() => router.push('/personagem')} aria-label={t.voltar} className="relative block w-[8cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.voltar} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={{ imageRendering: 'pixelated' }} />
          </button>
          <BarraDeTitulo titulo={t.titulo} className="w-[74cqw]" />
        </header>

        {/* 3) MEIO: o menu das seções e o painel da seção aberta */}
        <div className="flex-1 min-h-0 flex items-stretch gap-[1.6cqw] px-[2cqw]">
          <aside className="w-[19cqw] shrink-0 overflow-y-auto forja-rolagem">
            <DesenvolvimentoMenu secaoAtiva={secaoAtiva} onSelectSecao={setSecaoAtiva} pontosDisponiveis={pontosDisponiveisBase} />
          </aside>
          <section className="flex-1 min-w-0 overflow-y-auto forja-rolagem pr-[0.6cqw]">
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
              />
            )}
            {secaoAtiva === 'subclasse' && <SubclassePanel character={character} idToken={idToken} onCharacterChange={setCharacter} />}
            {secaoAtiva === 'melhorarHabilidade' && <ReforcoPanel character={character} idToken={idToken} onCharacterChange={setCharacter} className="h-full" />}
            {secaoAtiva === 'avancoHabilidade' && <AscensaoPanel character={character} idToken={idToken} onCharacterChange={setCharacter} className="h-full" />}
            {secaoAtiva === 'maestrias' && <MaestriasPanel character={character} className="h-full" />}
          </section>
        </div>

        {/* 4) BASE: o Poder Total e o reset dos atributos */}
        <footer className="flex items-center justify-between gap-[2cqw] px-[3cqw] shrink-0">
          <div role="group" aria-label={textoDaFicha(t.poderTotal, { n: poderTotal })} className="flex items-center gap-[1.4cqw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICONE_DO_PODER} alt="" aria-hidden="true" draggable={false} className="w-[8cqw] h-[8cqw] object-contain pointer-events-none" style={{ imageRendering: 'pixelated' }} />
            <span className="font-cinzel font-black text-[4cqw] leading-[1.4] text-[#EDB44C]" style={{ textShadow: '0.2cqw 0 0 #05070D, -0.2cqw 0 0 #05070D, 0 0.2cqw 0 #05070D, 0 -0.2cqw 0 #05070D' }}>{poderTotal}</span>
          </div>
          <BotaoDoKit onClick={() => setIsResetModalOpen(true)} disabled={!podeResetar} className="min-w-[26cqw]">
            <span title={dicaDoReset} aria-label={textoDaFicha(t.resetarRotulo, { custo: custoReset })}>{t.resetar}</span>
          </BotaoDoKit>
        </footer>
      </div>

      {/* 5) CONFIRMAÇÃO DO RESET */}
      {isResetModalOpen && (
        <div role="dialog" aria-modal="true" aria-label={t.resetTitulo} className="forja-palco !fixed inset-0 !z-[80] !items-center !justify-center px-[4cqw]" style={{ backgroundColor: 'rgba(3,6,14,0.7)', left: 0, right: 0 }}>
          <div className="relative w-full max-w-[88cqw]">
            <BotaoRedondo tipo="x" rotulo={t.cancelar} onClick={() => !isResetting && setIsResetModalOpen(false)} className="absolute -top-[3.4cqw] -right-[2cqw] z-10 w-[9cqw] h-[9cqw]" />
            <PainelDaForja borda="3cqw">
              <div className="flex flex-col gap-[2.4cqw]">
                <h2 className="font-cinzel font-extrabold uppercase text-[3.4cqw] leading-[1.35] text-[#EDB44C]">{t.resetTitulo}</h2>
                <p className="font-cinzel text-[2.5cqw] leading-snug text-[#E9DDC0]">{textoDaFicha(t.resetTexto, { custo: custoReset, saldo: saldoDiamantes })}</p>
                <div className="flex items-center gap-[2cqw]">
                  <BotaoDoKit onClick={() => setIsResetModalOpen(false)} disabled={isResetting} className="flex-1">{t.cancelar}</BotaoDoKit>
                  <BotaoDoKit onClick={handleConfirmarReset} disabled={isResetting} className="flex-1">{isResetting ? t.resetando : t.confirmar}</BotaoDoKit>
                </div>
              </div>
            </PainelDaForja>
          </div>
        </div>
      )}
    </main>
  );
}
