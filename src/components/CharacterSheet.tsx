'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CharacterDocument } from '@/server/characterService';
import type { SlotHabilidade } from '@/rules/habilidadesEquipadas';
import { FICHA_ASSETS } from '@/rules/fichaAssets';
import { FICHA_UI } from '@/assets/personagemUi';
import { getClassById } from '@/rules/classes';
import { TEXTOS_DA_FICHA, textoDaFicha } from '@/rules/textosDaFicha';
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
  FichaSidebar,
} from '@/components/ficha';
import type { SlotEquipamento } from '@/lib/equipamentoTela';
import { NIVEL_DA_ALMA } from '@/rules/almas';
import { ElementoDoFeiticeiro } from '@/components/ficha/ElementoDoFeiticeiro';

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

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

function abaInicialDaUrl(): AbaFicha {
  if (typeof window === 'undefined') return 'personagem';
  const aba = new URLSearchParams(window.location.search).get('aba');
  return aba === 'emblemas' || aba === 'equipamentos' ? aba : 'personagem';
}

/**
 * A ficha do personagem em pixel (arte do Yuri, sem texto escrito: os textos saem de `textosDaFicha.ts`). Fica num
 * palco que escala inteiro (tudo em cqw): a barra de cima com o voltar, o banner da classe, as abas e a bússola; o herói
 * com a arte, a identidade e os atributos; as habilidades; e o banner do Desenvolvimento.
 */
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
  const [contaAberta, setContaAberta] = useState(false);

  const handleTogglePopover = (skillId: string) => {
    setActiveSkillPopoverId((prev) => (prev === skillId ? null : skillId));
  };

  const [avisoAlma, setAvisoAlma] = useState(false);
  // A aba Alma (7.8) tem tela própria; antes do nível 25, só avisa
  const abrirAlma = () => {
    if (character.nivel >= NIVEL_DA_ALMA) router.push('/alma');
    else setAvisoAlma(true);
  };

  const classe = getClassById(character.classeId);
  const t = TEXTOS_DA_FICHA;

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full text-[#F5F3E0] overflow-hidden select-none bg-[#05070D]">
      {/* 1) FUNDO FIXO (imagem fundo com cover + overlay escuro leve) */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${FICHA_ASSETS.fundo})` }}>
        <div className="absolute inset-0 bg-[#0D0D0D]/55" />
      </div>

      <div className="forja-palco !justify-between gap-[1.2cqw] pt-[max(1.4cqw,env(safe-area-inset-top))] pb-[max(1.6cqw,env(safe-area-inset-bottom))]">
        {/* 2) BARRA DE CIMA: voltar, banner da classe, abas e bússola (a conta) */}
        <header className="flex items-center gap-[1cqw] px-[2.4cqw] shrink-0">
          <button type="button" onClick={() => router.push('/hub')} aria-label={t.voltarAoHub} className="relative block w-[8cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.voltar} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
          </button>
          <div className="relative shrink-0" style={{ width: '27cqw', aspectRatio: '521 / 110' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.banner} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
            <span className="absolute flex items-center font-cinzel font-extrabold uppercase leading-[1.4] text-[#F5F3E0]" style={{ left: '41%', right: '7%', top: '20%', bottom: '20%', fontSize: '2.1cqw', textShadow: '0.2cqw 0 0 #0B0610, -0.2cqw 0 0 #0B0610, 0 0.2cqw 0 #0B0610, 0 -0.2cqw 0 #0B0610' }}>
              <span className="truncate">{classe?.nome ?? ''}</span>
            </span>
          </div>
          <FichaSidebar aba={aba} onMudarAba={onEquiparItem ? setAba : undefined} onAbrirAlma={abrirAlma} almaLiberada={character.nivel >= NIVEL_DA_ALMA} className="ml-auto" />
          <button type="button" onClick={() => setContaAberta(true)} aria-label={t.conta.menu} className="relative block w-[8.4cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.bussola} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
          </button>
        </header>

        {/* O feiticeiro escolhe o elemento (só aparece para a classe dele) */}
        {character.classeId === 'feiticeiro' && (
          <div className="flex justify-center shrink-0">
            <ElementoDoFeiticeiro character={character} />
          </div>
        )}

        {/* 3) HERÓI: arte, identidade, atributos e Poder Total */}
        <FichaHero
          character={character}
          onOpenLupa={() => setLupaOpen(true)}
          aba={aba}
          onMudarAba={onEquiparItem ? setAba : undefined}
          onAbrirAlma={abrirAlma}
          colunaEquipamentos={<FichaSlotsEquipamento character={character} onAbrirSlot={setSlotAberto} />}
          colunaEmblemas={<FichaSlotsEmblema character={character} onAbrir={() => setEmblemasAberto(true)} />}
        />

        {/* 4) HABILIDADES (na aba Equipamentos ou Emblemas, o resumo dos bônus) */}
        {aba === 'equipamentos' ? (
          <FichaResumoEquipamento character={character} className="shrink-0" />
        ) : aba === 'emblemas' ? (
          <FichaResumoEmblemas character={character} className="shrink-0" />
        ) : (
          <FichaHabilidades character={character} activePopoverId={activeSkillPopoverId} onTogglePopover={handleTogglePopover} onEquiparHabilidade={onEquiparHabilidade} className="shrink-0" />
        )}

        {/* 5) BANNER DE DESENVOLVIMENTO */}
        <FichaBannerDesenvolvimento character={character} className="shrink-0" />
      </div>

      {/* 6) ESCOLHA DO ITEM DE UM ESPAÇO (aba Equipamentos) */}
      {aba === 'equipamentos' && slotAberto && (
        <FichaEquipamentoModal character={character} slot={slotAberto} onClose={() => setSlotAberto(null)} onEquipar={onEquiparItem} onDesequipar={onDesequiparItem} />
      )}

      {/* 6b) INVENTÁRIO DE EMBLEMAS (aba Emblemas) */}
      {aba === 'emblemas' && emblemasAberto && (
        <FichaEmblemaModal character={character} onClose={() => setEmblemasAberto(false)} onAcao={onEmblemaAcao} onFundir={onFundirEmblemas} />
      )}

      {avisoAlma && (
        <div role="alertdialog" aria-label="Alma bloqueada" className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6" onClick={() => setAvisoAlma(false)}>
          <div className="rounded-lg border border-[#B2A66C]/60 bg-[#120F0C] px-4 py-3 text-center text-sm text-[#E2D6B6] max-w-xs">
            <p className="font-cinzel font-bold mb-1">{t.abas.alma}</p>
            <p>{textoDaFicha('A Alma abre no nível {nivel}. Você está no nível {atual}.', { nivel: NIVEL_DA_ALMA, atual: character.nivel })}</p>
            <button type="button" onClick={() => setAvisoAlma(false)} className="mt-2 rounded border border-[#B2A66C]/60 px-3 py-1 text-xs">Entendi</button>
          </div>
        </div>
      )}

      {/* 7) MODAL DE EXPLICAÇÃO DOS ATRIBUTOS (LUPA) */}
      <FichaLupaModal isOpen={lupaOpen} onClose={() => setLupaOpen(false)} character={character} />

      {/* 8) MENU DA CONTA (a bússola): desconectar */}
      {contaAberta && (
        <div role="dialog" aria-modal="true" aria-label={t.conta.menu} className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6" onClick={() => setContaAberta(false)}>
          <div className="pilula-pixel flex flex-col gap-3 px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-cinzel font-extrabold uppercase tracking-wider text-sm text-[#EDB44C]">{t.conta.titulo}</p>
            <button type="button" onClick={onLogout} className="rounded border border-[#B2A66C]/70 bg-[#1C1210] px-4 py-2 font-cinzel font-bold text-xs text-[#F5F3E0] cursor-pointer active:translate-y-px">{t.conta.desconectar}</button>
            <button type="button" onClick={() => setContaAberta(false)} className="font-cinzel text-xs text-[#C9B27A] cursor-pointer">{t.conta.fechar}</button>
          </div>
        </div>
      )}
    </div>
  );
}
