'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import { CharacterDocument } from '@/server/characterService';
import type { SlotHabilidade } from '@/rules/habilidadesEquipadas';
import { FICHA_ASSETS } from '@/rules/fichaAssets';
import {
  AbaFicha,
  FichaHero,
  FichaHabilidades,
  FichaBannerDesenvolvimento,
  FichaEquipamentoModal,
  FichaLupaModal,
  FichaResumoEquipamento,
  FichaSlotsEquipamento,
  FichaEmblemaModal,
  FichaResumoEmblemas,
  FichaSlotsEmblema,
} from '@/components/ficha';
import type { SlotEquipamento } from '@/lib/equipamentoTela';

interface CharacterSheetProps {
  character: CharacterDocument;
  onLogout: () => void;
  userEmail: string;
  onAvatarChange?: (newAvatarId: string) => void;
  onEquiparHabilidade?: (slot: SlotHabilidade, habilidadeId: string) => Promise<string | null>;
  /** Equipa o item no espaço (arma ou peça). Devolve a mensagem de erro, se houver. */
  onEquiparItem?: (slot: SlotEquipamento, itemId: string) => Promise<string | null>;
  onDesequiparItem?: (slot: SlotEquipamento) => Promise<string | null>;
  /** Equipa ou desequipa um emblema pelo id. Devolve a mensagem de erro, se houver. */
  onEmblemaAcao?: (id: string, acao: 'equipar' | 'desequipar') => Promise<string | null>;
  /** Funde emblemas iguais (mesmo tipo e estrela). */
  onFundirEmblemas?: (tipo: string, estrelas: number) => Promise<string | null>;
}

function abaInicialDaUrl(): AbaFicha {
  if (typeof window === 'undefined') return 'personagem';
  const aba = new URLSearchParams(window.location.search).get('aba');
  return aba === 'emblemas' || aba === 'equipamentos' ? aba : 'personagem';
}

export function CharacterSheet({
  character,
  onLogout,
  onEquiparHabilidade,
  onEquiparItem,
  onDesequiparItem,
  onEmblemaAcao,
  onFundirEmblemas,
}: CharacterSheetProps) {
  const router = useRouter();
  const [activeSkillPopoverId, setActiveSkillPopoverId] = useState<string | null>(null);
  const [lupaOpen, setLupaOpen] = useState(false);
  // A Mochila abre a ficha direto na aba Emblemas (?aba=emblemas); a ficha só aparece depois de carregar o personagem
  const [aba, setAba] = useState<AbaFicha>(abaInicialDaUrl);
  const [slotAberto, setSlotAberto] = useState<SlotEquipamento | null>(null);
  const [emblemasAberto, setEmblemasAberto] = useState(false);

  const handleTogglePopover = (skillId: string) => {
    setActiveSkillPopoverId((prev) => (prev === skillId ? null : skillId));
  };

  const handleGoBack = () => {
    router.push('/hub');
  };

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full text-[#F5F3E0] overflow-hidden flex flex-col justify-between select-none">
      {/* 1) FUNDO FIXO (imagem fundo com cover + overlay escuro leve) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${FICHA_ASSETS.fundo})` }}
      >
        {/* Overlay escuro calibrado para contraste e legibilidade das molduras */}
        <div className="absolute inset-0 bg-[#0D0D0D]/65 backdrop-blur-[1px]" />
      </div>

      {/* CONTEÚDO PRINCIPAL (Estrutura vertical travada em 100dvh sem rolagem) */}
      <div className="relative z-10 w-full max-w-xl mx-auto h-full px-2.5 sm:px-4 pt-[max(6px,env(safe-area-inset-top))] pb-[max(6px,env(safe-area-inset-bottom))] flex flex-col justify-between gap-1 sm:gap-1.5 overflow-hidden">
        {/* 2) BARRA SUPERIOR: Seta de voltar no topo esquerdo e botão de desconectar */}
        <header className="flex items-center justify-between w-full shrink-0 pt-0.5">
          <button
            type="button"
            onClick={handleGoBack}
            aria-label="Voltar ao Hub"
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-cinzel uppercase tracking-widest text-[#E2D6B6] hover:text-[#ED8A0C] bg-[#120F0C]/85 hover:bg-[#1C1814] border border-[#B2A66C]/50 hover:border-[#ED8A0C] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-colors cursor-pointer shadow-md active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#F5C542] shrink-0" />
            <span>Voltar ao Hub</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Desconectar da conta"
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-cinzel text-stone-400 hover:text-[#F5C542] bg-[#120F0C]/80 hover:bg-[#1C1814] border border-stone-800/80 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desconectar</span>
          </button>
        </header>

        {/* 3) FICHA HERO: Sidebar à esquerda + Arte Central desobstruída + Bloco de Identidade + Atributos à direita + Poder Total */}
        <FichaHero
          character={character}
          onOpenLupa={() => setLupaOpen(true)}
          aba={aba}
          onMudarAba={onEquiparItem ? setAba : undefined}
          colunaEquipamentos={<FichaSlotsEquipamento character={character} onAbrirSlot={setSlotAberto} />}
          colunaEmblemas={<FichaSlotsEmblema character={character} onAbrir={() => setEmblemasAberto(true)} />}
          className="flex-1 min-h-0"
        />

        {/* 4) FICHA HABILIDADES: Moldura de Habilidades com os 7 ícones (na aba Equipamentos, o resumo dos bônus) */}
        {aba === 'equipamentos' ? (
          <FichaResumoEquipamento character={character} className="shrink-0" />
        ) : aba === 'emblemas' ? (
          <FichaResumoEmblemas character={character} className="shrink-0" />
        ) : (
          <FichaHabilidades
            character={character}
            activePopoverId={activeSkillPopoverId}
            onTogglePopover={handleTogglePopover}
            onEquiparHabilidade={onEquiparHabilidade}
            className="shrink-0"
          />
        )}

        {/* 5) BANNER DE DESENVOLVIMENTO (ampliado, limpo e direto da arte oficial) */}
        <FichaBannerDesenvolvimento character={character} className="shrink-0" />
      </div>

      {/* 6) ESCOLHA DO ITEM DE UM ESPAÇO (aba Equipamentos) */}
      {aba === 'equipamentos' && slotAberto && (
        <FichaEquipamentoModal
          character={character}
          slot={slotAberto}
          onClose={() => setSlotAberto(null)}
          onEquipar={onEquiparItem}
          onDesequipar={onDesequiparItem}
        />
      )}

      {/* 6b) INVENTÁRIO DE EMBLEMAS (aba Emblemas) */}
      {aba === 'emblemas' && emblemasAberto && (
        <FichaEmblemaModal character={character} onClose={() => setEmblemasAberto(false)} onAcao={onEmblemaAcao} onFundir={onFundirEmblemas} />
      )}

      {/* 7) MODAL DE EXPLICAÇÃO DOS ATRIBUTOS (LUPA) */}
      <FichaLupaModal
        isOpen={lupaOpen}
        onClose={() => setLupaOpen(false)}
        character={character}
      />
    </div>
  );
}
