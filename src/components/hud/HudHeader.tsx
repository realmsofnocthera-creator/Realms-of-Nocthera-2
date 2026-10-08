'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { onAuthStateChanged, sendEmailVerification, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { CharacterDocument } from '@/server/characterService';
import { xpParaProximoNivel } from '@/game';
import { XP_TABLE } from '@/rules/xpTable';
import { GAME_CONFIG } from '@/rules/config';
import { NOCTHERA_THEME } from '@/theme/theme';
import { HUD_ICONS, HUD_IMAGES } from '@/assets/hud';
import { getAvatarFaceStyle, resolveAvatarSrc } from '@/assets/avatars';
import { NotificationBadge } from './NotificationBadge';

export { NotificationBadge };

export interface HudHeaderProps {
  personagem: CharacterDocument;
  onOpenProfile?: () => void;
}

function obterXpProximoNivelSeguro(nivel: number): number {
  try {
    return xpParaProximoNivel(nivel);
  } catch {
    return XP_TABLE[GAME_CONFIG.NIVEL_MAXIMO_GRAU_1] ?? 100;
  }
}

export function HudHeader({ personagem, onOpenProfile }: HudHeaderProps) {
  const { colors } = NOCTHERA_THEME;
  const xpProximoNivel = obterXpProximoNivelSeguro(personagem.nivel);
  const percentualXp =
    xpProximoNivel > 0
      ? Math.min(100, Math.max(0, Math.floor((personagem.xpAtual / xpProximoNivel) * 100)))
      : 0;

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean>(true);
  const [cooldown, setCooldown] = useState<number>(0);
  const [sendingVerification, setSendingVerification] = useState<boolean>(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        setEmailVerified(currentUser.emailVerified);
      } else {
        setEmailVerified(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleResendVerification = async () => {
    if (!firebaseUser || cooldown > 0 || sendingVerification) return;
    setSendingVerification(true);
    setVerificationFeedback(null);
    try {
      await sendEmailVerification(firebaseUser);
      setCooldown(60);
      setVerificationFeedback('E-mail enviado! Verifique sua caixa de entrada.');
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code === 'auth/too-many-requests') {
        setCooldown(60);
        setVerificationFeedback('Aguarde alguns instantes antes de tentar novamente.');
      } else {
        setVerificationFeedback('Falha ao reenviar. Tente novamente em instantes.');
      }
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <header className="relative z-20 w-full flex flex-col gap-1 px-2 sm:px-4 pt-2 sm:pt-3 pointer-events-auto">
      <div className="w-full flex items-start justify-between gap-1.5 sm:gap-3">
      {/* TOPO ESQUERDO: Retrato com Moldura + Faixa Horizontal Compacta com Nome, Lv e Barra de XP */}
      <div className="flex items-center min-w-0 shrink">
        {/* Retrato circular clicável (abre Perfil Público) com moldura dourada sobreposta e animação contínua sutil */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="relative z-10 w-11 h-11 sm:w-15 sm:h-15 md:w-16 md:h-16 flex items-center justify-center shrink-0 select-none cursor-pointer group focus:outline-none"
          aria-label="Abrir Perfil Público do personagem"
          title="Ver Perfil Público"
        >
          <div className="w-[74%] h-[74%] rounded-full overflow-hidden bg-[#16120E] group-hover:brightness-110 transition-all">
            <motion.div
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveAvatarSrc(personagem.avatarId, personagem.classeId)}
                alt={`Avatar de ${personagem.nome}`}
                style={getAvatarFaceStyle(personagem.avatarId, personagem.classeId)}
                className="w-full h-full select-none pointer-events-none"
              />
            </motion.div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_IMAGES.molduraPerfil}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          />
        </button>

        {/* Faixa escura acoplada à direita da moldura */}
        <div
          className="-ml-3 sm:-ml-4 pl-4 sm:pl-5 pr-2.5 sm:pr-3.5 py-1 sm:py-1.5 rounded-r-md sm:rounded-r-lg border-y border-r backdrop-blur-md shadow-lg min-w-[108px] max-w-[138px] sm:min-w-[170px] sm:max-w-[220px]"
          style={{
            background:
              'linear-gradient(90deg, rgba(16,24,36,0.92) 0%, rgba(16,24,36,0.78) 75%, rgba(16,24,36,0.25) 100%)',
            borderColor: `${colors.border.default}66`,
          }}
        >
          <h1
            className="text-[11px] sm:text-sm font-cinzel font-bold tracking-wide truncate leading-tight drop-shadow"
            style={{ color: colors.text.primary }}
          >
            {personagem.nome}
          </h1>

          <div
            className="my-0.5 sm:my-1 h-px w-full"
            style={{
              background: `linear-gradient(90deg, ${colors.border.default}88 0%, transparent 100%)`,
            }}
          />

          <div className="flex items-center gap-1 sm:gap-1.5 tabular-nums">
            <span
              className="text-[9px] sm:text-[11px] font-cinzel font-bold shrink-0"
              style={{ color: colors.text.primary }}
            >
              Lv.{personagem.nivel}
            </span>

            <div
              className="w-8 sm:w-16 md:w-20 h-1.5 sm:h-2 rounded-full overflow-hidden border shrink-0"
              style={{
                backgroundColor: colors.background.primary,
                borderColor: `${colors.border.default}66`,
              }}
              role="progressbar"
              aria-valuenow={personagem.xpAtual}
              aria-valuemin={0}
              aria-valuemax={xpProximoNivel}
              aria-label="Progresso de XP"
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${percentualXp}%`,
                  backgroundColor: '#2EE6D6',
                }}
              />
            </div>

            <span
              className="text-[8px] sm:text-[10px] font-semibold shrink-0"
              style={{ color: colors.text.primary }}
            >
              {personagem.xpAtual}/{xpProximoNivel}
            </span>
          </div>
        </div>
      </div>

      {/* TOPO DIREITO: Ouro + Diamante (travado) + Mail (com NotificationBadge) + Configurações */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 pt-0.5 sm:pt-1">
        {/* Pílula de Ouro */}
        <div
          className="relative flex items-center gap-1 sm:gap-1.5 pl-1 pr-1.5 sm:pr-2 py-0.5 rounded-full border backdrop-blur-md shadow-md tabular-nums"
          style={{
            backgroundColor: 'rgba(14, 20, 30, 0.88)',
            borderColor: `${colors.border.default}80`,
          }}
          aria-label="Ouro do personagem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.ouro}
            alt="Ouro"
            className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain shrink-0 select-none"
          />
          <span
            className="text-[10px] sm:text-xs font-bold"
            style={{ color: colors.text.primary }}
          >
            {personagem.ouro}
          </span>
          <span
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full flex items-center justify-center opacity-70"
            style={{ color: colors.text.secondary }}
            aria-hidden="true"
          >
            <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </span>
        </div>

        {/* Pílula de Diamante (travado, sem valor numérico) */}
        <div
          aria-disabled="true"
          title="Em breve"
          aria-label="Diamantes (Em breve)"
          className="relative flex items-center gap-1 sm:gap-1.5 pl-1 pr-1.5 sm:pr-2 py-0.5 rounded-full border backdrop-blur-md shadow-md opacity-60 cursor-not-allowed select-none"
          style={{
            backgroundColor: 'rgba(14, 20, 30, 0.88)',
            borderColor: `${colors.border.default}66`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.diamante}
            alt=""
            aria-hidden="true"
            className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain shrink-0 select-none pointer-events-none"
          />
          <span
            className="text-[9px] sm:text-[11px] font-cinzel uppercase tracking-wider"
            style={{ color: colors.text.secondary }}
          >
            ---
          </span>
          <Lock
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0"
            style={{ color: colors.text.muted }}
            aria-hidden="true"
          />
        </div>

        {/* Botão Mail (travado + NotificationBadge sobreposto no canto superior direito) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Em breve"
          aria-label="Correio (Em breve)"
          className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-md flex items-center justify-center opacity-85 cursor-not-allowed select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.mail}
            alt=""
            aria-hidden="true"
            className="w-5 h-5 sm:w-7 sm:h-7 object-contain select-none pointer-events-none drop-shadow"
          />
          <NotificationBadge />
        </button>

        {/* Botão Configurações (travado) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Em breve"
          aria-label="Configurações (Em breve)"
          className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-md flex items-center justify-center opacity-80 cursor-not-allowed select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.configuracoes}
            alt=""
            aria-hidden="true"
            className="w-5 h-5 sm:w-7 sm:h-7 object-contain select-none pointer-events-none drop-shadow"
          />
        </button>
      </div>
      </div>

      {/* Indicador discreto e não bloqueante de e-mail não verificado */}
      {firebaseUser && !emailVerified && (
        <div
          role="status"
          className="self-start ml-2 sm:ml-4 px-2.5 py-1 rounded-md border backdrop-blur-md shadow-md flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-cinzel tracking-wide"
          style={{
            backgroundColor: 'rgba(18, 15, 12, 0.92)',
            borderColor: `${colors.accent.primary}80`,
            color: colors.text.secondary,
          }}
        >
          <span>{verificationFeedback || 'E-mail não verificado'}</span>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={cooldown > 0 || sendingVerification}
            className="underline font-bold transition-opacity disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
            style={{ color: colors.accent.primary }}
          >
            {sendingVerification
              ? 'Enviando...'
              : cooldown > 0
              ? `Reenviar e-mail (${cooldown}s)`
              : 'Reenviar e-mail'}
          </button>
        </div>
      )}
    </header>
  );
}
