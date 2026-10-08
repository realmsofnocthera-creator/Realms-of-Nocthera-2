'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { CharacterDocument } from '@/server/characterService';
import { NOCTHERA_THEME } from '@/theme/theme';
import { HUD_IMAGES } from '@/assets/hud';
import { resolveAvatarSrc } from '@/assets/avatars';
import { PerfilPublicoModal } from '@/components/perfil/PerfilPublicoModal';
import { HudHeader } from './HudHeader';
import { HudMenu } from './HudMenu';

export interface HudScreenProps {
  personagem: CharacterDocument;
  backgroundUrl?: string;
}

export function HudScreen({
  personagem,
  backgroundUrl = HUD_IMAGES.backgroundHub,
}: HudScreenProps) {
  const router = useRouter();
  const { colors } = NOCTHERA_THEME;
  const [pulseKey, setPulseKey] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [customSobre, setCustomSobre] = useState<string | null>(null);
  const [customAvatarId, setCustomAvatarId] = useState<string | null>(null);

  const localPersonagem: CharacterDocument = {
    ...personagem,
    ...(customSobre !== null ? { sobre: customSobre } : {}),
    ...(customAvatarId !== null ? { avatarId: customAvatarId } : {}),
  };

  const handleNavigatePersonagem = () => {
    router.push('/personagem');
  };

  const handleNavigateCombate = () => {
    router.push('/combate');
  };

  const handleNavigateProvacoes = () => {
    router.push('/provacoes');
  };

  const handleNavigateMenu = () => {
    router.push('/menu');
  };

  const handleCharacterTap = () => {
    setPulseKey((prev) => prev + 1);
  };

  return (
    <main
      className="relative h-dvh max-h-dvh min-h-[480px] w-full flex flex-col justify-between overflow-hidden select-none"
      style={{ color: colors.text.primary }}
    >
      {/* Cenário de fundo fixo com leve movimento de câmera (background-hub.png) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundColor: colors.background.secondary,
          backgroundImage: `url('${backgroundUrl}')`,
        }}
      >
        <motion.img
          src={backgroundUrl}
          alt="Cenário do Hub de Realms of Nocthera"
          referrerPolicy="no-referrer"
          initial={{ scale: 1.04 }}
          animate={{
            scale: [1.04, 1.07, 1.04],
            x: [0, -4, 0, 4, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-full h-full object-cover object-center select-none pointer-events-none"
        />
        {/* Vinheta sutil apenas nas extremidades superior e inferior para leitura da HUD */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0D]/35 via-transparent to-[#0D0D0D]/55" />
      </div>

      {/* Personagem de corpo inteiro centralizado com animação idle de respiração, oscilação e reação ao toque */}
      <div className="fixed inset-x-0 bottom-0 top-[10%] z-10 flex items-end justify-center pointer-events-none overflow-hidden">
        {/* Halo de luz atmosférica pulsante atrás do personagem */}
        <motion.div
          aria-hidden="true"
          animate={{
            opacity: [0.22, 0.42, 0.22],
            scale: [0.95, 1.06, 0.95],
          }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-[12%] w-56 h-72 sm:w-72 sm:h-96 rounded-full blur-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(200,166,86,0.35) 0%, rgba(200,166,86,0.08) 55%, transparent 75%)',
          }}
        />

        {/* Container de entrada + reação ao toque */}
        <motion.div
          key={pulseKey}
          initial={pulseKey === 0 ? { opacity: 0, y: 18, scale: 0.96 } : { scale: 1.03, y: -6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="h-[78dvh] sm:h-[85dvh] max-w-[82vw] flex items-end justify-center"
        >
          {/* Loop contínuo de respiração e postura (ancorado na base para manter os pés firmes) */}
          <motion.img
            src={resolveAvatarSrc(localPersonagem.avatarId, localPersonagem.classeId)}
            alt={`Personagem ${localPersonagem.nome}`}
            onClick={handleCharacterTap}
            style={{ transformOrigin: 'bottom center' }}
            animate={{
              y: [0, -5, 0],
              scaleY: [1, 1.018, 1],
              scaleX: [1, 1.007, 1],
              rotate: [0, 0.45, 0, -0.35, 0],
            }}
            transition={{
              duration: 4.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="h-full w-auto object-contain object-bottom drop-shadow-[0_14px_28px_rgba(0,0,0,0.72)] select-none pointer-events-auto cursor-pointer"
          />
        </motion.div>
      </div>

      {/* Camada de interface HUD nas bordas (Header no topo + Menus nas laterais/base) */}
      <div className="relative z-20 w-full h-full max-w-5xl mx-auto flex flex-col justify-between flex-1 pointer-events-none">
        <HudHeader
          personagem={localPersonagem}
          onOpenProfile={() => setIsProfileOpen(true)}
        />
        <HudMenu
          onNavigatePersonagem={handleNavigatePersonagem}
          onNavigateCombate={handleNavigateCombate}
          onNavigateProvacoes={handleNavigateProvacoes}
          onNavigateMenu={handleNavigateMenu}
        />
      </div>

      {/* Overlay de Perfil Público (abre ao clicar no avatar do header) */}
      <PerfilPublicoModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        ownCharacter={localPersonagem}
        onSobreUpdated={(novoSobre) => {
          setCustomSobre(novoSobre);
        }}
        onAvatarUpdated={(novoAvatarId) => {
          setCustomAvatarId(novoAvatarId);
        }}
      />
    </main>
  );
}
