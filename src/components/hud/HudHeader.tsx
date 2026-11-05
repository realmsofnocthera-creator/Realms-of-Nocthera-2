'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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

  // Correio: quantas mensagens têm presente para resgatar (o ponto no botão)
  const [presentesNoCorreio, setPresentesNoCorreio] = useState(0);
  useEffect(() => {
    if (!firebaseUser) return;
    let cancelado = false;
    void (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/correio', { headers: { Authorization: `Bearer ${token}` } });
        const dados = (await res.json().catch(() => ({}))) as { naoResgatadas?: number };
        if (!cancelado && res.ok) setPresentesNoCorreio(dados.naoResgatadas ?? 0);
      } catch {
        // sem o ponto, o botão continua funcionando
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [firebaseUser]);

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
          <div className="w-[86%] h-[86%] rounded-full overflow-hidden bg-[#16120E] group-hover:brightness-110 transition-all">
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

        {/* Placa em pixel acoplada à direita da moldura: nome, nível e barra de XP em blocos */}
        <div className="caixa-pixel relative -ml-3 sm:-ml-4 pl-5 sm:pl-6 pr-3 sm:pr-4 py-1.5 sm:py-2 min-w-[112px] max-w-[140px] sm:min-w-[176px] sm:max-w-[230px]">
          <h1 className="font-[family-name:var(--font-silk)] text-[12px] sm:text-[15px] font-bold truncate leading-none text-[#F5F3E0] [text-shadow:1px_1px_0_#1A120B]">
            {personagem.nome}
          </h1>

          <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5 sm:gap-2 tabular-nums">
            <span className="font-[family-name:var(--font-pixel)] text-[7px] sm:text-[9px] leading-none shrink-0 text-[#ED8A0C] [text-shadow:1px_1px_0_#1A120B]">
              LV{personagem.nivel}
            </span>

            <div
              className="barra-pixel relative w-9 sm:w-20 md:w-24 h-2 sm:h-2.5 shrink-0 overflow-hidden"
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
                  boxShadow: 'inset 0 -2px 0 #1FA89C',
                }}
              />
            </div>

            <span className="font-[family-name:var(--font-silk)] text-[8px] sm:text-[10px] shrink-0 text-[#E2D6B6]">
              {personagem.xpAtual}/{xpProximoNivel}
            </span>
          </div>
        </div>
      </div>

      {/* TOPO DIREITO: Ouro + Diamante (travado) + Mail (com NotificationBadge) + Configurações */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 pt-0.5 sm:pt-1">
        {/* Pílula de Ouro */}
        <div
          className="pilula-pixel relative flex items-center gap-1 sm:gap-1.5 pl-1 pr-1.5 sm:pr-2 py-0.5 tabular-nums"
          aria-label="Ouro do personagem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.ouro}
            alt="Ouro"
            className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0 select-none"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="font-[family-name:var(--font-silk)] text-[11px] sm:text-[13px] font-bold text-[#F5F3E0] [text-shadow:1px_1px_0_#1A120B]">
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

        {/* Pílula de Diamantes, com o saldo (a loja de Diamantes ainda não existe) */}
        <div
          title="Diamantes"
          aria-label={`Diamantes: ${personagem.diamantes ?? 0}`}
          className="pilula-pixel relative flex items-center gap-1 sm:gap-1.5 pl-1 pr-1.5 sm:pr-2 py-0.5 select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.diamante}
            alt=""
            aria-hidden="true"
            className="w-3.5 h-3.5 sm:w-5 sm:h-5 object-contain shrink-0 select-none pointer-events-none"
          />
          <span className="font-[family-name:var(--font-silk)] text-[11px] sm:text-[13px] font-bold text-[#F5F3E0] [text-shadow:1px_1px_0_#1A120B]">
            {personagem.diamantes ?? 0}
          </span>
        </div>

        {/* Botão do Correio (o ponto aparece quando há presente para resgatar) */}
        <Link
          href="/correio"
          title="Correio"
          aria-label={presentesNoCorreio ? `Correio: ${presentesNoCorreio} ${presentesNoCorreio === 1 ? 'presente' : 'presentes'} para resgatar` : 'Correio'}
          className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-md flex items-center justify-center select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD_ICONS.mail}
            alt=""
            aria-hidden="true"
            className="w-5 h-5 sm:w-7 sm:h-7 object-contain select-none pointer-events-none drop-shadow"
          />
          {presentesNoCorreio > 0 && <NotificationBadge />}
        </Link>

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
