'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Crown,
  Flame,
  Frame,
  Lock,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  User as UserIcon,
  UserCircle2,
  X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { calcularPoderTotal } from '@/game';
import { getRaceById } from '@/rules/races';
import { getClassById } from '@/rules/classes';
import { MOLDURAS_DISPONIVEIS } from '@/rules/molduras';
import { TITULOS_DISPONIVEIS } from '@/rules/titulos';
import { CharacterDocument, PublicCharacterProfile } from '@/server/characterService';
import { getAvatarFaceStyle, resolveAvatarSrc } from '@/assets/avatars';
import { HUD_IMAGES } from '@/assets/hud';
import { PERFIL_IMAGES } from '@/assets/perfil';
import { AvatarPicker } from '@/components/AvatarPicker';


export interface PerfilPublicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownCharacter: CharacterDocument;
  onSobreUpdated?: (novoSobre: string) => void;
  onAvatarUpdated?: (novoAvatarId: string) => void;
}

type TrocaMenuStep = 'closed' | 'menu' | 'avatar' | 'moldura' | 'titulo';

async function resolveCurrentToken(): Promise<string | null> {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      // Sem token válido
    }
  }

  return null;
}

function characterToPublicProfile(char: CharacterDocument): PublicCharacterProfile {
  const racaDef = getRaceById(char.racaId);
  const classeDef = getClassById(char.classeId);
  return {
    nome: char.nome,
    raca: racaDef?.nome || char.racaId,
    racaId: char.racaId,
    classe: classeDef?.nome || char.classeId,
    classeId: char.classeId,
    ...(char.linhagem ? { linhagem: char.linhagem } : {}),
    nivel: char.nivel,
    avatarId: char.avatarId || char.classeId,
    atributosFinais: char.atributos,
    poderTotal: calcularPoderTotal(char.atributos),
    sobre: typeof char.sobre === 'string' ? char.sobre : '',
  };
}

export function PerfilPublicoModal({
  isOpen,
  onClose,
  ownCharacter,
  onSobreUpdated,
  onAvatarUpdated,
}: PerfilPublicoModalProps) {
  const [searchedProfile, setSearchedProfile] = useState<PublicCharacterProfile | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isEditingSobre, setIsEditingSobre] = useState(false);
  const [sobreDraft, setSobreDraft] = useState('');
  const [savingSobre, setSavingSobre] = useState(false);
  const [sobreError, setSobreError] = useState<string | null>(null);

  const [trocaStep, setTrocaStep] = useState<TrocaMenuStep>('closed');
  const [localOwnAvatarId, setLocalOwnAvatarId] = useState<string | null>(null);

  const effectiveOwnCharacter: CharacterDocument =
    localOwnAvatarId !== null
      ? { ...ownCharacter, avatarId: localOwnAvatarId }
      : ownCharacter;

  const ownPublicProfile = characterToPublicProfile(effectiveOwnCharacter);
  const viewedProfile = searchedProfile ?? ownPublicProfile;
  const isOwnProfile =
    viewedProfile.nome.trim().toLowerCase() === ownCharacter.nome.trim().toLowerCase();

  const handleCloseModal = () => {
    setSearchedProfile(null);
    setSearchQuery('');
    setSearchError(null);
    setIsEditingSobre(false);
    setSobreError(null);
    setTrocaStep('closed');
    onClose();
  };

  if (!isOpen) return null;

  const avatarSrc = resolveAvatarSrc(viewedProfile.avatarId, viewedProfile.classeId);
  const faceStyle = getAvatarFaceStyle(viewedProfile.avatarId, viewedProfile.classeId);
  const poderTotal = calcularPoderTotal(viewedProfile.atributosFinais);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchError('Digite o nome de um personagem para buscar.');
      return;
    }

    if (trimmed.toLowerCase() === ownCharacter.nome.trim().toLowerCase()) {
      setSearchedProfile(null);
      setIsEditingSobre(false);
      return;
    }

    setSearchLoading(true);
    try {
      const token = await resolveCurrentToken();
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const res = await fetch(
        `/api/character/public/${encodeURIComponent(trimmed)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(
          data.error || `Nenhum personagem encontrado com o nome "${trimmed}".`
        );
      }

      setSearchedProfile(data.profile as PublicCharacterProfile);
      setIsEditingSobre(false);
      setTrocaStep('closed');
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Erro ao buscar personagem.'
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSaveSobre = async () => {
    if (!isOwnProfile || savingSobre) return;

    const textoNormalizado = sobreDraft.trim();
    if (textoNormalizado.length > 150) {
      setSobreError('O campo "Sobre" deve ter no máximo 150 caracteres.');
      return;
    }

    setSavingSobre(true);
    setSobreError(null);
    try {
      const token = await resolveCurrentToken();
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const res = await fetch('/api/character/sobre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sobre: textoNormalizado }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar descrição.');
      }

      setSearchedProfile(null);
      setIsEditingSobre(false);
      onSobreUpdated?.(textoNormalizado);
    } catch (err) {
      setSobreError(
        err instanceof Error ? err.message : 'Erro ao salvar descrição.'
      );
    } finally {
      setSavingSobre(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil Público de ${viewedProfile.nome}`}
      onClick={handleCloseModal}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] px-1.5 sm:px-4 py-2 overflow-y-auto"
    >
      {/* Disposição lado a lado (2 colunas fixas: 44% esquerda / 56% direita) fiel à referência */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[430px] sm:max-w-[540px] md:max-w-[620px] my-auto grid grid-cols-[44%_56%] items-stretch select-none drop-shadow-[0_24px_60px_rgba(0,0,0,0.95)]"
      >
        {/* COLUNA ESQUERDA: Moldura vertical decorativa + Arte de corpo inteiro + Faixa inclinada com Nome */}
        <div className="relative z-20 -my-1.5 sm:-my-2.5 -mr-1.5 flex flex-col justify-between overflow-hidden rounded-l-md shadow-[8px_0_24px_rgba(0,0,0,0.65)]">
          {/* Fundo da moldura esquerda */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PERFIL_IMAGES.molduraEsquerda}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />

          {/* Arte de corpo inteiro do personagem centralizada sobre a moldura */}
          <div className="relative z-10 flex-1 flex items-end justify-center px-1.5 pt-8 pb-14 sm:pb-16 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt={`Avatar de ${viewedProfile.nome}`}
              className="w-full h-[330px] sm:h-[420px] md:h-[460px] object-contain object-bottom scale-[1.06] drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] pointer-events-none"
            />
          </div>

          {/* Faixa diagonal inferior com o Nome do personagem e Raça/Classe (fiel à referência) */}
          <div className="relative z-20 w-full pb-4 sm:pb-6 pt-2 px-2 overflow-hidden">
            <div className="bg-gradient-to-r from-[#140B24]/95 via-[#24143D]/95 to-[#140B24]/90 border-y-2 border-[#D4AF37]/85 py-1.5 sm:py-2 px-2 -mx-3 -rotate-[6deg] shadow-[0_6px_16px_rgba(0,0,0,0.9)] text-center">
              <h2 className="font-cinzel font-extrabold text-sm sm:text-xl md:text-2xl tracking-wide text-[#F7E396] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate">
                {viewedProfile.nome}
              </h2>
              <p className="font-cinzel font-bold text-[8px] sm:text-[10px] tracking-[0.14em] uppercase text-[#D4AF37] truncate">
                {viewedProfile.raca} · {viewedProfile.classe}
              </p>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Fundo pergaminho claro com as seções empilhadas como na referência */}
        <div className="relative z-10 flex flex-col justify-between rounded-r-md overflow-hidden text-[#2B2118] py-2.5 sm:py-4 pl-3 sm:pl-5 pr-2.5 sm:pr-4">
          {/* Imagem de fundo de pergaminho */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PERFIL_IMAGES.fundoDireita}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          />

          {/* Velo pergaminho claro sutil para uniformizar a leitura dos textos escuros */}
          <div
            aria-hidden="true"
            className="absolute inset-1 rounded bg-[#EBE3D0]/78 pointer-events-none"
          />

          {/* Botão Fechar (X) em formato de brasão no canto superior direito */}
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Fechar Perfil Público"
            className="absolute top-1.5 right-1.5 z-30 w-7 h-8 sm:w-8 sm:h-9 bg-gradient-to-b from-[#4E2375] to-[#2B1145] hover:from-[#642E94] hover:to-[#3A185C] text-[#F7E396] border-2 border-[#D4AF37] rounded-b-lg flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-95"
          >
            <X className="w-4 h-4 stroke-[2.75]" />
          </button>

          <div className="relative z-10 flex flex-col gap-2 sm:gap-2.5">
            {/* Cabeçalho: PERFIL DO JOGADOR */}
            <div className="border-b border-[#B8A88A] pb-1 pr-7">
              <span className="font-cinzel font-bold text-[10px] sm:text-xs tracking-[0.16em] uppercase text-[#7A6A58] block">
                ✦ Perfil do Jogador
              </span>
            </div>

            {/* Busca por nome (compacta no topo do pergaminho) */}
            <form onSubmit={handleSearchSubmit} className="space-y-1 pr-5 sm:pr-6">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar jogador por nome..."
                  aria-label="Buscar aventureiro por nome"
                  className="w-full min-w-0 bg-[#DFD5C0]/90 border border-[#A8967A] rounded px-2 py-1 text-[10px] sm:text-xs text-[#2B2118] placeholder-[#7A6A58]/80 focus:outline-none focus:border-[#8C5818]"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  aria-label="Buscar"
                  className="inline-flex items-center justify-center gap-1 bg-[#4E2375] hover:bg-[#612C91] disabled:opacity-50 text-[#F7E396] font-cinzel font-bold uppercase text-[9px] sm:text-[10px] px-2 py-1 rounded border border-[#D4AF37] cursor-pointer shrink-0"
                >
                  <Search className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {searchLoading ? '...' : 'Buscar'}
                  </span>
                </button>
                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchedProfile(null);
                      setSearchError(null);
                      setSearchQuery('');
                    }}
                    title="Voltar ao meu perfil"
                    className="inline-flex items-center justify-center bg-[#D5C7AD] hover:bg-[#C7B698] text-[#2B2118] border border-[#9E8C70] font-cinzel font-bold uppercase text-[9px] px-1.5 py-1 rounded cursor-pointer shrink-0"
                  >
                    <UserIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
              {searchError && (
                <p role="alert" className="text-[9px] sm:text-[10px] text-[#9E1C1C] font-semibold leading-tight">
                  {searchError}
                </p>
              )}
            </form>

            {/* BLOCO DE IDENTIDADE: Avatar circular com moldura + Nome + Título (Em breve) */}
            <div className="relative flex items-center gap-2 sm:gap-3 pt-0.5">
              {/* Avatar circular com rosto recortado + moldura-perfil.png + ícone de troca (só no próprio perfil) */}
              <div className="relative w-13 h-13 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
                <div className="w-[76%] h-[76%] rounded-full overflow-hidden bg-[#16120E]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarSrc}
                    alt={`Rosto de ${viewedProfile.nome}`}
                    style={faceStyle}
                    className="w-full h-full select-none pointer-events-none"
                  />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HUD_IMAGES.molduraPerfil}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Ícone de troca sobreposto no canto do círculo — SOMENTE no próprio perfil */}
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() =>
                      setTrocaStep((prev) => (prev === 'closed' ? 'menu' : 'closed'))
                    }
                    aria-label="Trocar Avatar, Moldura ou Título"
                    title="Personalizar Avatar, Moldura ou Título"
                    className="absolute -bottom-0.5 -right-0.5 z-20 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b from-[#2B1B12] to-[#140C08] hover:from-[#ED8A0C] hover:to-[#C86D08] text-[#F7E396] hover:text-[#0D0D0D] border border-[#D4AF37] flex items-center justify-center shadow-md cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[2.5]" />
                  </button>
                )}
              </div>

              {/* Popover / Menu de Troca (Avatar / Moldura / Título) — SOMENTE no próprio perfil */}
              {isOwnProfile && trocaStep !== 'closed' && (
                <div
                  role="menu"
                  aria-label="Opções de Personalização"
                  className="absolute left-0 top-14 sm:top-17 z-30 w-full max-w-[290px] sm:max-w-[320px] rounded-lg bg-[#16120E] border-2 border-[#D4AF37] p-2.5 text-[#F5F3E0] shadow-[0_14px_34px_rgba(0,0,0,0.92)]"
                >
                  {trocaStep === 'menu' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#C8A656]/35 pb-1">
                        <span className="font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider text-[#ED8A0C]">
                          Personalizar Perfil
                        </span>
                        <button
                          type="button"
                          onClick={() => setTrocaStep('closed')}
                          aria-label="Fechar menu de troca"
                          className="text-[#D5C7A4] hover:text-[#F5F3E0] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setTrocaStep('avatar')}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#221C16] hover:bg-[#2E251D] border border-[#C8A656]/40 hover:border-[#ED8A0C] text-left transition-colors cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-2 text-xs font-cinzel font-semibold text-[#F5F3E0]">
                            <UserCircle2 className="w-3.5 h-3.5 text-[#ED8A0C]" />
                            Avatar
                          </span>
                          <span className="text-[10px] text-[#D5C7A4]">Trocar →</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setTrocaStep('moldura')}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#221C16] hover:bg-[#2E251D] border border-[#C8A656]/40 hover:border-[#ED8A0C] text-left transition-colors cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-2 text-xs font-cinzel font-semibold text-[#F5F3E0]">
                            <Frame className="w-3.5 h-3.5 text-[#ED8A0C]" />
                            Moldura
                          </span>
                          <span className="text-[10px] text-[#D5C7A4]">Ver →</span>
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => setTrocaStep('titulo')}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-[#221C16] hover:bg-[#2E251D] border border-[#C8A656]/40 hover:border-[#ED8A0C] text-left transition-colors cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-2 text-xs font-cinzel font-semibold text-[#F5F3E0]">
                            <Crown className="w-3.5 h-3.5 text-[#ED8A0C]" />
                            Título
                          </span>
                          <span className="text-[10px] text-[#D5C7A4]">Ver →</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {trocaStep === 'avatar' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[#C8A656]/35 pb-1">
                        <button
                          type="button"
                          onClick={() => setTrocaStep('menu')}
                          className="inline-flex items-center gap-1 text-[10px] font-cinzel uppercase tracking-wider text-[#D5C7A4] hover:text-[#ED8A0C] cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Voltar
                        </button>
                        <span className="font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider text-[#ED8A0C]">
                          Escolher Avatar
                        </span>
                        <button
                          type="button"
                          onClick={() => setTrocaStep('closed')}
                          aria-label="Fechar seletor de avatar"
                          className="text-[#D5C7A4] hover:text-[#F5F3E0] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <AvatarPicker
                        selectedAvatarId={viewedProfile.avatarId}
                        onSelect={(novoAvatarId) => {
                          setLocalOwnAvatarId(novoAvatarId);
                          onAvatarUpdated?.(novoAvatarId);
                          setTrocaStep('closed');
                        }}
                      />
                    </div>
                  )}

                  {trocaStep === 'moldura' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[#C8A656]/35 pb-1">
                        <button
                          type="button"
                          onClick={() => setTrocaStep('menu')}
                          className="inline-flex items-center gap-1 text-[10px] font-cinzel uppercase tracking-wider text-[#D5C7A4] hover:text-[#ED8A0C] cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Voltar
                        </button>
                        <span className="font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider text-[#ED8A0C]">
                          Moldura
                        </span>
                        <button
                          type="button"
                          onClick={() => setTrocaStep('closed')}
                          aria-label="Fechar seletor de moldura"
                          className="text-[#D5C7A4] hover:text-[#F5F3E0] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {MOLDURAS_DISPONIVEIS.length === 0 ? (
                        <p className="py-4 text-center text-xs text-[#D5C7A4] italic">
                          Nenhuma moldura disponível ainda
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {MOLDURAS_DISPONIVEIS.map((moldura) => (
                            <div
                              key={moldura.id}
                              className="p-2 rounded border border-[#C8A656]/40 text-center text-xs"
                            >
                              {moldura.nome}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {trocaStep === 'titulo' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[#C8A656]/35 pb-1">
                        <button
                          type="button"
                          onClick={() => setTrocaStep('menu')}
                          className="inline-flex items-center gap-1 text-[10px] font-cinzel uppercase tracking-wider text-[#D5C7A4] hover:text-[#ED8A0C] cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Voltar
                        </button>
                        <span className="font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider text-[#ED8A0C]">
                          Título
                        </span>
                        <button
                          type="button"
                          onClick={() => setTrocaStep('closed')}
                          aria-label="Fechar seletor de título"
                          className="text-[#D5C7A4] hover:text-[#F5F3E0] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {TITULOS_DISPONIVEIS.length === 0 ? (
                        <p className="py-4 text-center text-xs text-[#D5C7A4] italic">
                          Nenhum título disponível ainda
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {TITULOS_DISPONIVEIS.map((titulo) => (
                            <div
                              key={titulo.id}
                              className="px-2.5 py-1.5 rounded border border-[#C8A656]/40 text-xs"
                            >
                              {titulo.nome}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="font-cinzel font-extrabold text-sm sm:text-lg text-[#231A12] truncate leading-tight">
                  {viewedProfile.nome}
                </h3>

                {/* Badge de Título (travado - Em breve) exatamente abaixo do nome como na referência */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#3E245B] via-[#54337A] to-[#3E245B] border border-[#D4AF37] text-[#F5E7B8] shadow-sm max-w-full">
                  <Sparkles className="w-2.5 h-2.5 text-[#F7E396] shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-cinzel font-semibold truncate">
                    Título: Em breve
                  </span>
                  <Lock className="w-2.5 h-2.5 text-[#D4AF37] shrink-0" />
                </div>
              </div>
            </div>

            {/* Linha de Nível + Barra decorativa + Raça/Classe */}
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#B8A88A]">
              <span className="font-cinzel font-extrabold text-[11px] sm:text-xs text-[#2B2118] shrink-0">
                Nv. {viewedProfile.nivel}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[#CFC3AC] border border-[#A8967A] overflow-hidden">
                <div className="h-full w-2/3 bg-gradient-to-r from-[#D97706] to-[#F59E0B]" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-cinzel font-semibold text-[#5C4D3C] truncate">
                {viewedProfile.raca} · {viewedProfile.classe}
              </span>
            </div>

            {/* LINHA DIVIDIDA: Poder Total (Esquerda) | Guilda (Direita) */}
            <div className="grid grid-cols-2 border-b border-[#B8A88A] pb-2">
              <div className="pr-2 border-r border-[#B8A88A]">
                <span className="text-[9px] sm:text-[10px] font-cinzel font-semibold text-[#6E5D4F] block">
                  Poder Total
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#D95B12] fill-[#F59E0B] shrink-0" />
                  <span className="font-cinzel font-extrabold text-sm sm:text-base text-[#C85A11] tabular-nums">
                    {poderTotal}
                  </span>
                </div>
              </div>

              <div className="pl-2.5">
                <span className="text-[9px] sm:text-[10px] font-cinzel font-semibold text-[#6E5D4F] block">
                  Guilda
                </span>
                <div className="flex items-center gap-1 mt-0.5 text-[#5C4D3C]">
                  <Shield className="w-3.5 h-3.5 text-[#6E5D4F] shrink-0" />
                  <span className="text-[10px] sm:text-xs font-semibold italic truncate">
                    Em breve
                  </span>
                  <Lock className="w-3 h-3 text-[#7A6A58] shrink-0 ml-auto" />
                </div>
              </div>
            </div>

            {/* SEÇÃO SOBRE (com divisória ornamental e ícone de lápis à direita se for o próprio perfil) */}
            <div className="space-y-1 border-b border-[#B8A88A] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-cinzel font-bold text-[10px] sm:text-xs text-[#4A3B2C] shrink-0">
                  Sobre
                </span>
                <div className="flex-1 h-px bg-[#B8A88A]" />
                {isOwnProfile && !isEditingSobre && (
                  <button
                    type="button"
                    onClick={() => {
                      setSobreDraft(viewedProfile.sobre || '');
                      setSobreError(null);
                      setIsEditingSobre(true);
                    }}
                    aria-label="Editar Sobre"
                    title="Editar Sobre"
                    className="w-5 h-5 rounded bg-[#DFD5C0] hover:bg-[#D2C4A8] border border-[#A8967A] flex items-center justify-center text-[#3A2B1E] cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isOwnProfile && isEditingSobre ? (
                <div className="space-y-1.5 pt-0.5">
                  <textarea
                    rows={2}
                    maxLength={150}
                    value={sobreDraft}
                    onChange={(e) => setSobreDraft(e.target.value)}
                    placeholder="Escreva uma breve descrição (até 150 caracteres)..."
                    className="w-full bg-[#DFD5C0] border border-[#8C5818] rounded p-1.5 text-[10px] sm:text-xs text-[#2B2118] placeholder-[#7A6A58] focus:outline-none resize-none"
                  />
                  {sobreError && (
                    <p className="text-[9px] text-[#9E1C1C] font-semibold" role="alert">
                      {sobreError}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#6E5D4F] tabular-nums">
                      {sobreDraft.length}/150
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={savingSobre}
                        onClick={() => {
                          setIsEditingSobre(false);
                          setSobreError(null);
                        }}
                        className="text-[9px] font-cinzel font-bold uppercase px-2 py-0.5 rounded border border-[#9E8C70] text-[#4A3B2C] bg-[#DFD5C0] cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingSobre}
                        onClick={handleSaveSobre}
                        className="inline-flex items-center gap-0.5 text-[9px] font-cinzel font-bold uppercase px-2 py-0.5 rounded bg-[#4E2375] text-[#F7E396] border border-[#D4AF37] cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>{savingSobre ? '...' : 'Salvar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-[#5C4D3C] leading-snug break-words min-h-[26px]">
                  {viewedProfile.sobre ? (
                    viewedProfile.sobre
                  ) : (
                    <span className="italic text-[#8A7966]">Nenhuma descrição...</span>
                  )}
                </p>
              )}
            </div>

            {/* SEÇÃO EQUIPAMENTOS PRINCIPAIS (fileira de cards verticais travados como na referência) */}
            <div className="space-y-1.5 border-b border-[#B8A88A] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-cinzel font-bold text-[10px] sm:text-xs text-[#4A3B2C] shrink-0">
                  ✦ Equipamentos Principais
                </span>
                <div className="flex-1 h-px bg-[#B8A88A]" />
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((slot) => (
                  <div
                    key={slot}
                    className="aspect-[3/4] rounded bg-gradient-to-b from-[#2A221E] to-[#171210] border border-[#C8A656]/80 flex flex-col items-center justify-center p-1 text-center shadow-sm opacity-85"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#D4AF37] mb-1" />
                    <span className="text-[8px] sm:text-[9px] font-cinzel text-[#E2D6B6] leading-tight">
                      Em breve
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO CONQUISTAS (fileira de insígnias hexagonais travadas como na referência) */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-cinzel font-bold text-[10px] sm:text-xs text-[#4A3B2C] shrink-0">
                  ✦ Conquistas
                </span>
                <div className="flex-1 h-px bg-[#B8A88A]" />
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                {[1, 2, 3, 4].map((badge) => (
                  <div key={badge} className="flex flex-col items-center gap-0.5 opacity-85">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg rotate-45 bg-gradient-to-br from-[#3E245B] to-[#1F1230] border border-[#D4AF37] flex items-center justify-center shadow-sm my-1">
                      <Lock className="-rotate-45 w-3.5 h-3.5 text-[#F7E396]" />
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-cinzel font-semibold text-[#5C4D3C] leading-tight">
                      Em breve
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
