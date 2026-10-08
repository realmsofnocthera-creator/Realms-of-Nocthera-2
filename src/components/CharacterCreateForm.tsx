'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { ATTRIBUTES, AttributeName, Attributes } from '@/rules/attributes';
import { GAME_CONFIG } from '@/rules/config';
import { RACES, RaceDefinition, DraconianLineage, bonusSortePassivaRacial } from '@/rules/races';
import { CLASSES, ClassDefinition } from '@/rules/classes';
import { calcularChanceCritico, calcularHpMax, calcularSobreescudoMax } from '@/game';
import {
  RACE_ICONS,
  CLASS_ICONS,
  ATTRIBUTE_ICONS,
  RESOURCE_ICONS,
  ProvisionalLineageSvg,
} from '@/assets/icons';
import {
  WIZARD_BACKGROUNDS,
  WIZARD_CLASS_IMAGES,
  WIZARD_RACE_IMAGES,
} from '@/assets/wizard';
import { resolveAvatarSrc } from '@/assets/avatars';
import { SkillIcon } from '@/components/skills';
import { getRaceSkillIcon, getClassSkillIcon } from '@/rules/skillIcons';
import { auth } from '@/lib/firebase';

interface CharacterCreateFormProps {
  idToken: string;
  onCharacterCreated: () => void;
  onLogout: () => void;
  userEmail: string;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const WIZARD_STEPS: ReadonlyArray<{ step: WizardStep; label: string }> = [
  { step: 1, label: 'Nome' },
  { step: 2, label: 'Raça' },
  { step: 3, label: 'Classe' },
  { step: 4, label: 'Atributos' },
  { step: 5, label: 'Resumo' },
];

/**
 * Escala visual das barras de "Atributos Base" nas telas de Raça e Classe:
 * - Nas Raças (soma = 5) e nas Classes (soma = 3), o maior bônus individual em um único
 *   atributo é +2 (ex.: Anão Vigor +2 / Vitalidade +2; Cavaleiro Vitalidade +2).
 * - Adotamos escala de 5 segmentos (0 a 5) para representar visualmente os bônus de cada
 *   atributo de forma proporcional e uniforme entre Raça e Classe.
 */
const BONUS_BAR_SEGMENTS = 5;

function formatRacialPassiveSummary(race: RaceDefinition): string {
  return race.passivaRacial.descricao ?? 'Descrição ainda não definida';
}

/**
 * Descrições curtas canônicas dos 7 atributos reais do Nocthera
 * baseadas nas regras oficiais do jogo.
 */
const ATTRIBUTE_CANONICAL_DESCRIPTIONS: Record<AttributeName, string> = {
  vigor: 'Concede +5 pontos de HP máximo por ponto investido.',
  sorte: 'Cada ponto dá +0,1% de chance de crítico (2x de dano) e +0,1% de chance de drops.',
  forca: 'Aumenta o dano físico causado pelos seus ataques.',
  vitalidade: 'Concede +2 de Sobreescudo máximo e +1 de Defesa Física por ponto.',
  arcano: 'Amplifica a afinidade arcana e o poder místico do personagem.',
  inteligencia: 'Aumenta o dano mágico e a Defesa Mágica em combate.',
  agilidade: 'Define a iniciativa e a ordem de ação nos turnos de combate.',
};

const ATTRIBUTE_SHORT_NAMES: Record<AttributeName, string> = {
  vigor: 'Vigor',
  sorte: 'Sorte',
  forca: 'Força',
  vitalidade: 'Vitalidade',
  arcano: 'Arcano',
  inteligencia: 'Inteligência',
  agilidade: 'Agilidade',
};

const LINEAGE_LABELS: Record<DraconianLineage, { nome: string; efeitoSopro: string }> = {
  fogo: { nome: 'Fogo', efeitoSopro: 'Queimadura' },
  gelo: { nome: 'Gelo', efeitoSopro: 'Reduz Agilidade do alvo' },
  relampago: { nome: 'Relâmpago', efeitoSopro: 'Atinge um segundo alvo' },
  terra: { nome: 'Terra', efeitoSopro: 'Reduz Defesa Física do alvo' },
  vento: { nome: 'Vento', efeitoSopro: 'Aumenta a Agilidade do draconiano' },
};

interface ShowcaseOption {
  id: string;
  nome: string;
  descricao: string;
  bonusAtributos: Attributes;
  artSrc: string;
  emblemSrc?: string | null;
}

interface ShowcaseSkillItem {
  id: string;
  src: string | null;
  nome: string;
  tipo: string;
  descricao: string;
  nivelRequerido?: number;
  recargaTurnos?: number;
  duracaoTurnos?: number;
}

interface WizardSelectionShowcaseProps {
  category: 'raca' | 'classe';
  stepTitle: string;
  options: readonly ShowcaseOption[];
  selectedId: string;
  onSelectId: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  confirmDisabled: boolean;
  extraContent?: React.ReactNode;
}

/**
 * Componente visual compartilhado entre a Etapa 2 (Raça) e a Etapa 3 (Classe):
 * - Arte grande de corpo inteiro à esquerda/centro ocupando o painel principal
 * - Nome e descrição canônica no canto superior esquerdo sobre a arte
 * - Coluna vertical à direita com as 6 miniaturas clicáveis (sem cadeados)
 * - Seção "Atributos Base" com as 7 barras e ícones reais (attr-*.png)
 * - Seção "Habilidades" com ícones reais e balão explicativo ao tocar
 * - Botão "Selecionar >" no rodapé direito e botão de voltar no topo/rodapé
 */
function WizardSelectionShowcase({
  category,
  stepTitle,
  options,
  selectedId,
  onSelectId,
  onConfirm,
  onBack,
  confirmDisabled,
  extraContent,
}: WizardSelectionShowcaseProps) {
  const [activeSkillPopoverId, setActiveSkillPopoverId] = useState<string | null>(null);
  const activeOption =
    options.find((opt) => opt.id === selectedId) || options[0];

  const activeRace = category === 'raca' ? RACES.find((r) => r.id === activeOption.id) || RACES[0] : null;
  const activeClass = category === 'classe' ? CLASSES.find((c) => c.id === activeOption.id) || CLASSES[0] : null;

  const showcaseSkills: ShowcaseSkillItem[] = activeRace
    ? [
        {
          id: `wiz-race-ativa-${activeRace.id}`,
          src: getRaceSkillIcon(activeRace.id, 'ativa'),
          nome: activeRace.habilidadeRacial.nome,
          tipo: 'Ativa',
          descricao: activeRace.habilidadeRacial.efeito,
          recargaTurnos: activeRace.habilidadeRacial.recargaTurnos,
          duracaoTurnos: activeRace.habilidadeRacial.duracaoTurnos,
        },
        {
          id: `wiz-race-passiva-${activeRace.id}`,
          src: getRaceSkillIcon(activeRace.id, 'passiva'),
          nome: activeRace.passivaRacial.nome,
          tipo: 'Passiva',
          descricao: activeRace.passivaRacial.descricao ?? 'Descrição ainda não definida',
        },
      ]
    : activeClass
      ? [
          {
            id: `wiz-class-${activeClass.id}-0`,
            src: getClassSkillIcon(activeClass.id, 0),
            nome: activeClass.progressao.ataqueBasico.nome,
            tipo: 'Ataque Básico',
            nivelRequerido: 1,
            descricao: activeClass.progressao.ataqueBasico.descricao,
          },
          {
            id: `wiz-class-${activeClass.id}-1`,
            src: getClassSkillIcon(activeClass.id, 1),
            nome: activeClass.progressao.habilidadeEspecial.nome,
            tipo: 'Habilidade Especial',
            nivelRequerido: 5,
            descricao: activeClass.progressao.habilidadeEspecial.descricao,
          },
          {
            id: `wiz-class-${activeClass.id}-2`,
            src: getClassSkillIcon(activeClass.id, 2),
            nome: activeClass.progressao.passivaI.nome,
            tipo: 'Passiva I',
            nivelRequerido: 12,
            descricao: activeClass.progressao.passivaI.descricao,
          },
          {
            id: `wiz-class-${activeClass.id}-3`,
            src: getClassSkillIcon(activeClass.id, 3),
            nome: activeClass.progressao.passivaII.nome,
            tipo: 'Passiva II',
            nivelRequerido: 20,
            descricao: activeClass.progressao.passivaII.descricao,
          },
          {
            id: `wiz-class-${activeClass.id}-4`,
            src: getClassSkillIcon(activeClass.id, 4),
            nome: activeClass.progressao.ultimate.nome,
            tipo: 'Ultimate',
            nivelRequerido: 30,
            descricao: activeClass.progressao.ultimate.descricao,
          },
        ]
      : [];

  return (
    <div
      className="relative w-full h-full bg-[#0A0708] overflow-hidden flex flex-col justify-between select-none pt-13 pb-3 px-3 sm:px-5"
      role="radiogroup"
      aria-label={stepTitle}
    >
      {/* Fundo dramático escuro com silhueta ampliada animada no canto superior direito */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[#2B090D]/55 via-[#0B0809] to-[#080607] pointer-events-none"
      />
      <motion.img
        key={`bg-silhouette-${activeOption.id}`}
        src={activeOption.artSrc}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{
          opacity: [0.12, 0.2, 0.12],
          scale: [1.02, 1.07, 1.02],
          x: [0, -6, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -right-8 top-4 w-[62%] h-[55%] object-cover object-top mix-blend-lighten blur-[1px] pointer-events-none"
      />

      {/* Halo pulsante atrás da arte principal */}
      <motion.div
        aria-hidden="true"
        animate={{
          opacity: [0.2, 0.38, 0.2],
          scale: [0.94, 1.05, 0.94],
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-[14%] left-1/2 -translate-x-1/2 z-0 w-56 h-72 rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(212,175,55,0.28) 0%, rgba(138,17,23,0.16) 55%, transparent 75%)',
        }}
      />

      {/* Arte principal de corpo inteiro centralizada com entrada + respiração contínua */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeOption.id}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -8 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
          className="absolute inset-0 z-10 flex items-end justify-center pointer-events-none"
        >
          <motion.img
            src={activeOption.artSrc}
            alt={activeOption.nome}
            style={{ transformOrigin: 'bottom center' }}
            animate={{
              y: [0, -5, 0],
              scaleY: [1, 1.016, 1],
              scaleX: [1, 1.006, 1],
            }}
            transition={{
              duration: 4.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="h-[86%] sm:h-[90%] w-auto max-w-[85%] object-contain object-bottom drop-shadow-[0_14px_30px_rgba(0,0,0,0.95)]"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradientes sutis de leitura à esquerda e na base */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 bg-gradient-to-r from-[#080607]/85 via-[#080607]/25 to-transparent pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-44 z-10 bg-gradient-to-t from-[#080607] via-[#080607]/75 to-transparent pointer-events-none"
      />

      {/* TOPO ESQUERDO COMPACTO: Botão Voltar + Nome da Raça/Classe + Descrição Oficial */}
      <motion.div
        key={`header-${activeOption.id}`}
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="relative z-20 pr-14 sm:pr-16 max-w-[230px] sm:max-w-[280px] space-y-1.5"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar etapa"
            className="inline-flex items-center gap-1 text-[10px] font-cinzel uppercase tracking-wider text-[#E2D6B6] hover:text-[#F5C542] bg-black/70 border border-[#C8A656]/45 px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3 text-[#F5C542]" />
            <span>Voltar</span>
          </button>
        </div>

        {/* Emblema + Título compacto */}
        <div className="flex items-center gap-2">
          {activeOption.emblemSrc && (
            <motion.div
              initial={{ scale: 0.8, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.25 }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1A0D0E]/90 border border-[#C8A656]/70 flex items-center justify-center p-1 shrink-0 shadow"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeOption.emblemSrc}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-contain"
              />
            </motion.div>
          )}
          <div className="-skew-x-12 bg-gradient-to-r from-[#8A1117]/90 via-[#5E0C10]/70 to-transparent px-2.5 py-0.5 border-l-2 border-[#F5C542]">
            <h3 className="skew-x-12 font-cinzel font-extrabold italic text-lg sm:text-2xl text-[#F5F3E0] tracking-wide leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
              {activeOption.nome}
            </h3>
          </div>
        </div>

        {/* Descrição oficial compacta */}
        <p className="text-[10px] sm:text-xs text-[#E2D6B6]/95 leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] line-clamp-4">
          {activeOption.descricao}
        </p>
      </motion.div>

      {/* DIREITA: Coluna vertical compacta com as 6 miniaturas clicáveis (sem cadeado) */}
      <div className="absolute right-2.5 sm:right-4 top-14 z-30 flex flex-col gap-1.5">
        {options.map((opt, idx) => {
          const isSelected = opt.id === activeOption.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={opt.nome}
              title={opt.nome}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.04 }}
              whileHover={{ scale: 1.06, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectId(opt.id)}
              className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded overflow-hidden transition-colors duration-150 cursor-pointer ${
                isSelected
                  ? 'border-2 border-[#F5C542] shadow-[0_0_12px_rgba(245,197,66,0.75)] scale-105 z-10'
                  : 'border border-[#C8A656]/45 opacity-75 hover:opacity-100 hover:border-[#C8A656]'
              }`}
            >
              <div className="w-full h-full bg-[#140E0C] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={opt.artSrc}
                  alt={opt.nome}
                  style={{
                    objectFit: 'cover',
                    objectPosition: '50% 14%',
                    transform: 'scale(1.85)',
                    transformOrigin: '50% 18%',
                  }}
                  className="w-full h-full pointer-events-none select-none"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-black/80 px-0.5 py-[1px] text-center">
                <span
                  className={`block font-cinzel font-bold text-[7px] sm:text-[8px] uppercase tracking-tight truncate ${
                    isSelected ? 'text-[#F5C542]' : 'text-[#E2D6B6]'
                  }`}
                >
                  {opt.nome}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* PARTE INFERIOR COMPACTA: Atributos Base + Habilidades à esquerda e Botão Selecionar à direita */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, delay: 0.08 }}
        className="relative z-20 space-y-1.5"
      >
        {/* Seletor compacto de linhagem elemental do Draconiano (quando aplicável) */}
        {extraContent}

        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1.5 w-[220px] sm:w-[260px] max-w-[82vw]">
            {/* Painel compacto de Atributos Base (7 barras reais com ícones attr-*.png) */}
            <div className="bg-[#0D0A09]/90 border border-[#C8A656]/60 rounded-md p-2 shadow-[0_6px_18px_rgba(0,0,0,0.85)] space-y-1">
              <div className="flex items-center justify-between border-b border-[#C8A656]/35 pb-0.5">
                <span className="font-cinzel font-bold text-[10px] sm:text-xs text-[#F5C542] tracking-wider uppercase">
                  Atributos Base
                </span>
              </div>

              <div className="space-y-1">
                {ATTRIBUTES.map((attr) => {
                  const bonusVal = activeOption.bonusAtributos[attr] || 0;
                  return (
                    <div
                      key={attr}
                      className="grid grid-cols-[68px_1fr_20px] sm:grid-cols-[78px_1fr_22px] items-center gap-1.5"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ATTRIBUTE_ICONS[attr]}
                          alt={ATTRIBUTE_SHORT_NAMES[attr]}
                          className="w-3 h-3 object-contain shrink-0"
                        />
                        <span className="text-[9px] sm:text-[10px] font-cinzel text-[#F5F3E0] truncate">
                          {ATTRIBUTE_SHORT_NAMES[attr]}
                        </span>
                      </div>

                      {/* Barra segmentada compacta (escala 0..5) */}
                      <div className="grid grid-cols-5 gap-0.5 h-1.5 bg-[#1B1613] p-[1px] rounded-[2px] border border-[#C8A656]/25">
                        {Array.from({ length: BONUS_BAR_SEGMENTS }).map((_, idx) => {
                          const filled = idx < bonusVal;
                          return (
                            <motion.div
                              key={`${activeOption.id}-${attr}-${idx}`}
                              initial={filled ? { scaleX: 0, opacity: 0.4 } : false}
                              animate={{ scaleX: 1, opacity: 1 }}
                              transition={{ duration: 0.2, delay: idx * 0.04 }}
                              style={{ transformOrigin: 'left center' }}
                              className={`h-full rounded-[1px] ${
                                filled
                                  ? 'bg-gradient-to-r from-[#D99B26] to-[#F5C542]'
                                  : 'bg-[#2C2520]'
                              }`}
                            />
                          );
                        })}
                      </div>

                      <span
                        className={`text-[9px] font-cinzel font-bold text-right tabular-nums ${
                          bonusVal > 0 ? 'text-[#F5C542]' : 'text-[#D5C7A4]/40'
                        }`}
                      >
                        +{bonusVal}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seção Habilidades com ícones reais e balão explicativo ao tocar */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="font-cinzel font-bold text-[10px] sm:text-xs text-[#F5C542] tracking-wider uppercase">
                  {category === 'raca' ? 'Habilidades Raciais' : 'Habilidades (Progressão)'}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#C8A656]/50 to-transparent" />
              </div>

              <div className="flex items-center gap-0.5 overflow-x-auto py-0.5 scrollbar-none">
                {showcaseSkills.map((skill) => (
                  <SkillIcon
                    key={skill.id}
                    id={skill.id}
                    src={skill.src}
                    nome={skill.nome}
                    tipo={skill.tipo}
                    descricao={skill.descricao}
                    nivelRequerido={skill.nivelRequerido}
                    recargaTurnos={skill.recargaTurnos}
                    duracaoTurnos={skill.duracaoTurnos}
                    isOpen={activeSkillPopoverId === skill.id}
                    onToggle={() =>
                      setActiveSkillPopoverId((prev) => (prev === skill.id ? null : skill.id))
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Botão Selecionar simples e elegante no canto inferior direito */}
          <motion.button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            whileHover={confirmDisabled ? undefined : { scale: 1.04 }}
            whileTap={confirmDisabled ? undefined : { scale: 0.96 }}
            className="inline-flex items-center justify-center gap-1.5 bg-[#140C0D]/90 hover:bg-[#221315] disabled:opacity-35 disabled:cursor-not-allowed text-[#F5E3A6] font-cinzel font-semibold uppercase tracking-[0.18em] text-xs sm:text-sm py-2.5 px-5 rounded border border-[#D4AF37]/85 hover:border-[#F5C542] shadow-[0_4px_16px_rgba(0,0,0,0.85)] transition-all cursor-pointer shrink-0"
          >
            <span>Selecionar</span>
            <ChevronRight className="w-4 h-4 text-[#F5C542]" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export function CharacterCreateForm({
  idToken,
  onCharacterCreated,
  onLogout,
  userEmail,
}: CharacterCreateFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [resumoSkillPopoverId, setResumoSkillPopoverId] = useState<string | null>(null);

  // Estado único do formulário preservado entre todas as etapas
  const [nome, setNome] = useState('');
  const [selectedRaceId, setSelectedRaceId] = useState<string>(RACES[0].id);
  const [selectedClassId, setSelectedClassId] = useState<string>(CLASSES[0].id);
  const [selectedLinhagem, setSelectedLinhagem] = useState<DraconianLineage | ''>('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [pontos, setPontos] = useState<Record<AttributeName, number>>({
    vigor: 0,
    sorte: 0,
    forca: 0,
    vitalidade: 0,
    arcano: 0,
    inteligencia: 0,
    agilidade: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRace: RaceDefinition =
    RACES.find((r) => r.id === selectedRaceId) || RACES[0];
  const selectedClass: ClassDefinition =
    CLASSES.find((c) => c.id === selectedClassId) || CLASSES[0];

  const totalAlocado = Object.values(pontos).reduce((acc, curr) => acc + curr, 0);
  const pontosRestantes = GAME_CONFIG.PONTOS_INICIAIS - totalAlocado;

  // Validações por etapa (inalteradas)
  const nomeLimpo = nome.trim();
  const isStep1Valid = nomeLimpo.length >= 2 && nomeLimpo.length <= 32;
  const isStep2Valid =
    Boolean(selectedRaceId) &&
    (selectedRaceId !== 'draconiano' || Boolean(selectedLinhagem));
  const isStep3Valid = Boolean(selectedClassId);
  const isStep4Valid = pontosRestantes === 0;

  const goToStep = (targetStep: WizardStep) => {
    setError(null);
    setStepDirection(targetStep > currentStep ? 1 : -1);
    setCurrentStep(targetStep);
  };

  const handleNextStep = () => {
    if (currentStep === 1 && isStep1Valid) {
      goToStep(2);
    } else if (currentStep === 2 && isStep2Valid) {
      goToStep(3);
    } else if (currentStep === 3 && isStep3Valid) {
      goToStep(4);
    } else if (
      currentStep === 4 &&
      isStep4Valid &&
      isStep1Valid &&
      isStep2Valid &&
      isStep3Valid
    ) {
      goToStep(5);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      goToStep((currentStep - 1) as WizardStep);
    }
  };

  const handlePointChange = (attr: AttributeName, delta: number) => {
    const atual = pontos[attr];
    const proximo = atual + delta;

    if (proximo < 0) return;
    if (delta > 0 && pontosRestantes <= 0) return;

    setPontos((prev) => ({
      ...prev,
      [attr]: proximo,
    }));
  };

  const handleResetPoints = () => {
    setPontos({
      vigor: 0,
      sorte: 0,
      forca: 0,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    });
  };

  const finalVigor =
    GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vigor +
    selectedRace.bonusAtributos.vigor +
    selectedClass.bonusAtributos.vigor +
    pontos.vigor;
  const finalSorte =
    GAME_CONFIG.VALOR_BASE_ATRIBUTOS.sorte +
    selectedRace.bonusAtributos.sorte +
    bonusSortePassivaRacial(selectedRace) +
    selectedClass.bonusAtributos.sorte +
    pontos.sorte;
  const finalVitalidade =
    GAME_CONFIG.VALOR_BASE_ATRIBUTOS.vitalidade +
    selectedRace.bonusAtributos.vitalidade +
    selectedClass.bonusAtributos.vitalidade +
    pontos.vitalidade;

  const previewHp = calcularHpMax(finalVigor, {
    classeId: selectedClass.id,
    nivel: 1,
  });
  const previewCritico = `${String(calcularChanceCritico(finalSorte)).replace('.', ',')}%`;
  const previewSobreescudo = calcularSobreescudoMax(finalVitalidade, {
    classeId: selectedClass.id,
    nivel: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentStep < 5) {
      handleNextStep();
      return;
    }

    if (pontosRestantes !== 0) {
      setError(
        `Você precisa distribuir exatamente os ${GAME_CONFIG.PONTOS_INICIAIS} pontos iniciais.`
      );
      return;
    }

    if (!nome.trim()) {
      setError('Informe um nome para o seu personagem.');
      return;
    }

    setLoading(true);
    try {
      // 1. Garante o token mais recente e válido
      let activeToken = idToken;
      if (auth.currentUser) {
        try {
          activeToken = await auth.currentUser.getIdToken();
        } catch {
          // ignora
        }
      }
      if (!activeToken) {
        setError('Sessão expirada ou não encontrada. Por favor, faça login novamente.');
        return;
      }

      const res = await fetch('/api/character/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          nome: nome.trim(),
          racaId: selectedRace.id,
          classeId: selectedClass.id,
          ...(selectedRace.id === 'draconiano' && selectedLinhagem
            ? { linhagem: selectedLinhagem }
            : {}),
          pontos,
        }),
      });

      let data: { error?: string; character?: unknown } | null = null;
      const text = await res.text();
      if (text && text.trim().length > 0) {
        try {
          data = JSON.parse(text);
        } catch {
          // Resposta não é JSON válido
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            (res.status === 401
              ? 'Não autorizado. Sua sessão expirou — faça login novamente.'
              : `Falha ao criar personagem (código ${res.status}).`)
        );
      }

      onCharacterCreated();
      router.push('/hub');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar personagem.');
    } finally {
      setLoading(false);
    }
  };

  // Opções mapeadas para o componente compartilhado das Etapas 2 e 3
  const raceShowcaseOptions: ShowcaseOption[] = RACES.map((r) => ({
    id: r.id,
    nome: r.nome,
    descricao: r.descricao,
    bonusAtributos: r.bonusAtributos,
    artSrc: WIZARD_RACE_IMAGES[r.id] || WIZARD_RACE_IMAGES.humano,
    emblemSrc: RACE_ICONS[r.id] || r.iconeUrl,
  }));

  const classShowcaseOptions: ShowcaseOption[] = CLASSES.map((c) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    bonusAtributos: c.bonusAtributos,
    artSrc: WIZARD_CLASS_IMAGES[c.id] || WIZARD_CLASS_IMAGES.barbaro,
    emblemSrc: CLASS_ICONS[c.id],
  }));

  return (
    <div className="fixed inset-0 z-40 bg-[#070506] flex items-center justify-center overflow-hidden text-[#F5F3E0]">
      <div className="relative w-full h-[100dvh] sm:max-w-[460px] md:max-w-[500px] sm:h-[95dvh] sm:rounded-2xl sm:border border-[#C8A656]/55 bg-[#0A0708] shadow-[0_24px_80px_rgba(0,0,0,0.98)] flex flex-col overflow-hidden">
        {/* Barra de Progresso Flutuante Discreta no Topo (mantém navegação clicável entre etapas + botão Sair) */}
        <header className="absolute top-0 inset-x-0 z-30 px-2.5 pt-2 pb-1.5 bg-gradient-to-b from-black/85 via-black/55 to-transparent flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] font-cinzel uppercase tracking-widest text-[#D5C7A4]/85 truncate">
              {userEmail}
            </span>
            <button
              onClick={onLogout}
              type="button"
              className="text-[10px] font-cinzel uppercase tracking-wider text-[#E2D6B6] hover:text-[#F5C542] bg-black/65 border border-[#C8A656]/50 hover:border-[#F5C542] px-2.5 py-0.5 rounded transition-colors whitespace-nowrap cursor-pointer"
            >
              Sair
            </button>
          </div>

          <nav aria-label="Progresso de criação de personagem">
            <ol className="grid grid-cols-5 gap-1">
              {WIZARD_STEPS.map(({ step, label }) => {
                const isCurrent = currentStep === step;
                const isCompleted = currentStep > step;

                return (
                  <li key={step} className="min-w-0">
                    <button
                      type="button"
                      disabled={!isCompleted}
                      onClick={() => {
                        if (isCompleted) {
                          goToStep(step);
                        }
                      }}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`w-full flex items-center justify-center gap-1 px-1 py-1 rounded border text-center transition-all ${
                        isCurrent
                          ? 'bg-[#2A1718]/90 border-[#F5C542] text-[#F5C542] shadow-[0_0_10px_rgba(245,197,66,0.3)]'
                          : isCompleted
                            ? 'bg-black/75 border-[#C8A656]/65 text-[#F5F3E0] hover:border-[#F5C542] cursor-pointer'
                            : 'bg-black/45 border-[#C8A656]/20 text-[#E2D6B6]/40 cursor-default'
                      }`}
                    >
                      <span className="font-cinzel text-[9px] sm:text-[10px] font-bold tracking-tight truncate">
                        {isCompleted ? '✓ ' : `${step}.`}
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {error && (
            <div
              role="alert"
              className="p-2 bg-[#6B1212]/90 border border-[#D9534F] rounded text-[#F5F3E0] text-xs font-medium text-center shadow-lg"
            >
              {error}
            </div>
          )}
        </header>

        <form onSubmit={handleSubmit} className="relative flex-1 w-full h-full overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {/* =========================================================
                ETAPA 1 — ESCOLHER NOME (Tela inteira com input dentro do retângulo central da arte)
               ========================================================= */}
            {currentStep === 1 && (
              <motion.div
                key="step-1-nome"
                initial={{ opacity: 0, x: stepDirection * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: stepDirection * -20 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full h-full overflow-hidden select-none"
              >
                {/* Imagem bg-escolher-nome cobrindo 100% da tela com animação sutil de respiração */}
                <motion.img
                  src={WIZARD_BACKGROUNDS.escolherNome}
                  alt=""
                  aria-hidden="true"
                  initial={{ scale: 1.02 }}
                  animate={{
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                />

                {/* Brilho atmosférico suave atrás do retângulo dourado central */}
                <motion.div
                  aria-hidden="true"
                  animate={{
                    opacity: [0.18, 0.4, 0.18],
                    scale: [0.96, 1.04, 0.96],
                  }}
                  transition={{
                    duration: 3.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    top: '46%',
                    height: '12%',
                    left: '8%',
                    width: '84%',
                    background:
                      'radial-gradient(ellipse at center, rgba(245,197,66,0.28) 0%, transparent 72%)',
                  }}
                  className="absolute z-10 blur-xl pointer-events-none"
                />

                {/* Título posicionado logo acima do retângulo dourado central */}
                <motion.div
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.05, ease: 'easeOut' }}
                  className="absolute inset-x-6 top-[36.5%] z-10 text-center pointer-events-none"
                >
                  <label
                    htmlFor="charName"
                    className="block font-cinzel font-extrabold text-lg sm:text-2xl uppercase tracking-[0.18em] text-[#F5F3E0] drop-shadow-[0_3px_10px_rgba(0,0,0,0.98)]"
                  >
                    Escolha seu <span className="text-[#F5C542]">Nome</span>
                  </label>
                </motion.div>

                {/* Retângulo central da própria imagem (Y: 47.8% a 56.0%, X: 8.5% a 91.5%) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
                  style={{
                    top: '47.8%',
                    height: '8.2%',
                    left: '8.5%',
                    width: '83%',
                  }}
                  className="absolute z-20 flex items-center justify-center px-3"
                >
                  <input
                    id="charName"
                    type="text"
                    required
                    minLength={2}
                    maxLength={32}
                    autoFocus
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Digite o nome do personagem..."
                    className="w-full h-full bg-transparent border-0 text-center font-cinzel font-extrabold text-base sm:text-xl text-[#F5F3E0] placeholder-[#E2D6B6]/45 focus:outline-none focus:ring-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
                  />
                </motion.div>

                {/* Contador e feedback discretos logo abaixo do retângulo central */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.16, ease: 'easeOut' }}
                  className="absolute inset-x-10 top-[57.5%] z-10 flex items-center justify-between text-[11px] sm:text-xs font-cinzel text-[#E2D6B6] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                >
                  <span>
                    {nomeLimpo.length === 0
                      ? '2 a 32 caracteres'
                      : nomeLimpo.length < 2
                        ? 'Mínimo de 2 caracteres'
                        : 'Nome válido para consagração'}
                  </span>
                  <span className="tabular-nums font-bold text-[#F5C542]">
                    {nomeLimpo.length}/32
                  </span>
                </motion.div>

                {/* Botão de confirmação simples e elegante na parte inferior da tela */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.2, ease: 'easeOut' }}
                  className="absolute inset-x-8 bottom-8 z-20 flex justify-center"
                >
                  <motion.button
                    type="button"
                    disabled={!isStep1Valid}
                    onClick={handleNextStep}
                    whileHover={!isStep1Valid ? undefined : { scale: 1.04 }}
                    whileTap={!isStep1Valid ? undefined : { scale: 0.96 }}
                    className="inline-flex items-center justify-center gap-2 bg-[#140C0D]/90 hover:bg-[#221315] disabled:opacity-35 disabled:cursor-not-allowed text-[#F5E3A6] font-cinzel tracking-[0.22em] uppercase font-semibold py-2.5 px-8 rounded border border-[#D4AF37]/85 hover:border-[#F5C542] shadow-[0_6px_20px_rgba(0,0,0,0.9)] transition-all text-xs sm:text-sm cursor-pointer"
                  >
                    <span>Continuar</span>
                    <ChevronRight className="w-4 h-4 text-[#F5C542]" />
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* =========================================================
                ETAPA 2 — RAÇA (Componente compartilhado + Linhagem Draconiana)
               ========================================================= */}
            {currentStep === 2 && (
              <motion.div
                key="step-2-raca"
                initial={{ opacity: 0, x: stepDirection * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: stepDirection * -20 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <WizardSelectionShowcase
                  category="raca"
                  stepTitle="Etapa 2 · Escolha sua Raça"
                  options={raceShowcaseOptions}
                  selectedId={selectedRace.id}
                  onSelectId={(id) => setSelectedRaceId(id)}
                  onConfirm={handleNextStep}
                  onBack={handlePrevStep}
                  confirmDisabled={!isStep2Valid}
                  extraContent={
                    selectedRace.id === 'draconiano' && selectedRace.linhagens ? (
                      <div className="bg-[#120C0A]/95 border border-[#F5C542]/75 rounded-md p-2 space-y-1 shadow-lg max-w-[310px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-cinzel uppercase tracking-wider text-[#F5C542] font-bold">
                            Linhagem Elemental
                          </span>
                          <span className="text-[9px] text-[#D5C7A4] truncate">
                            {selectedLinhagem
                              ? LINEAGE_LABELS[selectedLinhagem].nome
                              : 'Obrigatório'}
                          </span>
                        </div>
                        <div
                          className="grid grid-cols-5 gap-1"
                          role="radiogroup"
                          aria-label="Linhagens Dracônicas"
                        >
                          {selectedRace.linhagens.map((linhagemKey) => {
                            const info = LINEAGE_LABELS[linhagemKey];
                            const isLinhagemSelected = selectedLinhagem === linhagemKey;
                            return (
                              <button
                                key={linhagemKey}
                                type="button"
                                role="radio"
                                aria-checked={isLinhagemSelected}
                                title={`${info.nome}: ${info.efeitoSopro}`}
                                onClick={() => setSelectedLinhagem(linhagemKey)}
                                className={`p-1 rounded border text-center transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                                  isLinhagemSelected
                                    ? 'bg-[#2B1D14] border-[#F5C542] text-[#F5F3E0]'
                                    : 'bg-[#1A1412] border-[#C8A656]/40 text-[#E2D6B6] hover:border-[#F5C542]/70'
                                }`}
                              >
                                <ProvisionalLineageSvg
                                  lineage={linhagemKey}
                                  className="w-3.5 h-3.5"
                                />
                                <span className="block font-cinzel font-bold text-[8px] text-[#F5F3E0] truncate w-full">
                                  {info.nome}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null
                  }
                />
              </motion.div>
            )}

            {/* =========================================================
                ETAPA 3 — CLASSE (Mesmo componente compartilhado)
               ========================================================= */}
            {currentStep === 3 && (
              <motion.div
                key="step-3-classe"
                initial={{ opacity: 0, x: stepDirection * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: stepDirection * -20 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <WizardSelectionShowcase
                  category="classe"
                  stepTitle="Etapa 3 · Escolha sua Classe"
                  options={classShowcaseOptions}
                  selectedId={selectedClass.id}
                  onSelectId={(id) => setSelectedClassId(id)}
                  onConfirm={handleNextStep}
                  onBack={handlePrevStep}
                  confirmDisabled={!isStep3Valid}
                />
              </motion.div>
            )}

            {/* =========================================================
                ETAPA 4 — DISTRIBUIÇÃO DE ATRIBUTOS (Fundo: bg-distribuir-pontos.png)
               ========================================================= */}
            {currentStep === 4 && (
              <motion.div
                key="step-4-atributos"
                initial={{ opacity: 0, x: stepDirection * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: stepDirection * -20 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full overflow-y-auto"
              >
                <div
                  className="relative w-full min-h-full overflow-hidden pt-13 pb-4 px-3 sm:px-5 bg-cover bg-center flex flex-col justify-between gap-2.5"
                  style={{
                    backgroundImage: `url('${WIZARD_BACKGROUNDS.distribuirPontos}')`,
                  }}
                >
                  {/* Velo escuro leve para preservar as faixas rubras e a rosa dos ventos do fundo */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70 pointer-events-none"
                  />

                  {/* TOPO: Seta Voltar à esquerda + Título inclinado estilo Referência + Subtítulo + Divisória com losango */}
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="relative z-10 flex flex-col items-center text-center pt-0.5"
                  >
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={loading}
                      aria-label="Voltar para Classe"
                      className="self-start -mb-2 inline-flex items-center gap-1 text-[#F5C542] hover:text-[#FFF0B8] cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <div className="-rotate-2 py-0.5">
                      <h3 className="font-cinzel font-extrabold italic text-xl sm:text-3xl uppercase tracking-wider leading-none text-[#F5F3E0] drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)]">
                        Distribuição
                      </h3>
                      <span className="block font-cinzel font-extrabold italic text-lg sm:text-2xl uppercase tracking-wider leading-tight text-[#F5F3E0] drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)]">
                        de <span className="text-[#D9383A]">Atributos</span>
                      </span>
                    </div>

                    <p className="text-[10px] sm:text-xs text-[#E2D6B6] mt-1 max-w-[280px] leading-snug">
                      Distribua seus pontos de atributos de acordo com o seu estilo de
                      jogo.
                    </p>

                    {/* Divisória dourada fina com losango central */}
                    <div className="w-full max-w-[260px] flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C8A656]/70" />
                      <div className="w-1.5 h-1.5 rotate-45 border border-[#F5C542] bg-[#140A0C]" />
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C8A656]/70" />
                    </div>
                  </motion.div>

                  {/* LINHA SUPERIOR LADO A LADO: PONTOS DISPONÍVEIS (esquerda) + LIMPAR PONTOS (direita) */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.24, delay: 0.05 }}
                    className="relative z-10 flex flex-row items-end justify-between gap-2.5"
                  >
                    {/* Caixa Pontos Disponíveis */}
                    <div className="w-[58%] bg-gradient-to-b from-[#1B080C]/95 via-[#120608]/95 to-[#19070B]/95 border border-[#D4AF37] rounded-[3px] px-3 py-1.5 text-center shadow-[0_6px_18px_rgba(0,0,0,0.85),inset_0_0_18px_rgba(217,56,58,0.22)]">
                      <span className="block font-cinzel font-bold text-[10px] sm:text-xs uppercase tracking-wider text-[#F5E3A6]">
                        Pontos Disponíveis
                      </span>
                      <motion.span
                        key={pontosRestantes}
                        initial={{ scale: 1.24 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.18 }}
                        className="block font-cinzel font-extrabold text-2xl sm:text-3xl text-white drop-shadow-[0_0_10px_rgba(220,38,38,0.95)] tabular-nums leading-tight"
                      >
                        {pontosRestantes}
                      </motion.span>
                    </div>

                    {/* Botão Limpar Pontos ao lado direito */}
                    <motion.button
                      type="button"
                      onClick={handleResetPoints}
                      disabled={totalAlocado === 0 || loading}
                      whileHover={totalAlocado === 0 || loading ? undefined : { scale: 1.03 }}
                      whileTap={totalAlocado === 0 || loading ? undefined : { scale: 0.96 }}
                      className="w-[40%] bg-[#12100E]/95 hover:bg-[#1E1915] disabled:opacity-40 disabled:cursor-not-allowed border border-[#D4AF37] rounded-[3px] px-2.5 py-2 flex items-center justify-center gap-2 text-[#F5E3A6] font-cinzel font-bold uppercase tracking-wider text-[10px] sm:text-xs leading-tight transition-colors cursor-pointer shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
                    >
                      <RotateCcw className="w-4 h-4 text-[#F5C542] shrink-0 stroke-[2.25]" />
                      <span className="text-left leading-tight">
                        Limpar
                        <br />
                        Pontos
                      </span>
                    </motion.button>
                  </motion.div>

                  {/* LISTA DOS 7 ATRIBUTOS REAIS DO NOCTHERA (Cada um em linha horizontal única igual à referência) */}
                  <div className="relative z-10 space-y-1.5">
                    {ATTRIBUTES.map((attr, attrIdx) => {
                      const base = GAME_CONFIG.VALOR_BASE_ATRIBUTOS[attr];
                      const bonusRacial = selectedRace.bonusAtributos[attr];
                      const bonusClasse = selectedClass.bonusAtributos[attr];
                      const extra = pontos[attr];
                      const total = base + bonusRacial + bonusClasse + extra;
                      const attrIconSrc = ATTRIBUTE_ICONS[attr];
                      const imgKey = `attr-${attr}`;

                      return (
                        <motion.div
                          key={attr}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.22,
                            delay: 0.06 + attrIdx * 0.035,
                            ease: 'easeOut',
                          }}
                          className="relative bg-gradient-to-r from-[#24090D]/95 via-[#0F0C0C]/95 to-[#0D0B0A]/95 border border-[#C8A656]/85 rounded-[3px] px-2.5 py-1.5 flex flex-row items-center justify-between gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.85)]"
                        >
                          {/* Esquerda: Ícone do atributo */}
                          <motion.div
                            animate={{ y: [0, -1.5, 0] }}
                            transition={{
                              duration: 2.8 + attrIdx * 0.2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center p-0.5"
                          >
                            {attrIconSrc && !imageErrors[imgKey] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={attrIconSrc}
                                alt={ATTRIBUTE_SHORT_NAMES[attr]}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setImageErrors((prev) => ({
                                    ...prev,
                                    [imgKey]: true,
                                  }))
                                }
                                className="w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                              />
                            ) : (
                              <span className="font-cinzel text-xs font-bold text-[#F5C542]">
                                {ATTRIBUTE_SHORT_NAMES[attr].charAt(0)}
                              </span>
                            )}
                          </motion.div>

                          {/* Centro: Nome + Descrição curta + Barra de 10 blocos */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="font-cinzel font-extrabold text-xs sm:text-sm text-[#F5F3E0] leading-tight truncate">
                                {ATTRIBUTE_SHORT_NAMES[attr]}
                              </span>
                              <span className="text-[9px] font-cinzel text-[#D5C7A4]/85 tabular-nums shrink-0">
                                Total: <strong className="text-[#F5C542]">{total}</strong>
                              </span>
                            </div>

                            <p className="text-[9px] sm:text-[10px] text-[#D5C7A4] leading-tight truncate">
                              {ATTRIBUTE_CANONICAL_DESCRIPTIONS[attr]}
                            </p>

                            {/* Barra horizontal de 10 blocos */}
                            <div className="grid grid-cols-10 gap-[2px] h-2 sm:h-2.5 bg-[#080707] p-[1.5px] border border-[#3A3228] rounded-[1px]">
                              {Array.from({
                                length: GAME_CONFIG.PONTOS_INICIAIS,
                              }).map((_, idx) => {
                                const isFilled = idx < extra;
                                return (
                                  <div
                                    key={idx}
                                    className={`h-full transition-colors ${
                                      isFilled
                                        ? 'bg-gradient-to-t from-[#C88A1E] to-[#F5C542]'
                                        : 'bg-[#2C2B29]'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Direita (na mesma linha!): [ − ] [ 0 ] [ + ] */}
                          <div className="flex items-center gap-1 sm:gap-1.5 tabular-nums shrink-0">
                            <motion.button
                              type="button"
                              onClick={() => handlePointChange(attr, -1)}
                              disabled={extra <= 0 || loading}
                              whileTap={extra <= 0 || loading ? undefined : { scale: 0.88 }}
                              aria-label={`Diminuir ${attr}`}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-[#171311] hover:bg-[#261F1B] border border-[#C8A656]/85 text-[#F5E3A6] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm sm:text-base transition-colors cursor-pointer"
                            >
                              −
                            </motion.button>

                            <motion.div
                              key={extra}
                              initial={{ scale: 1.18 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.15 }}
                              className="w-9 h-7 sm:w-11 sm:h-8 rounded-[2px] bg-[#0B0908] border border-[#C8A656]/85 flex items-center justify-center"
                            >
                              <span className="font-cinzel font-bold text-xs sm:text-sm text-[#F5F3E0] leading-none">
                                {extra}
                              </span>
                            </motion.div>

                            <motion.button
                              type="button"
                              onClick={() => handlePointChange(attr, 1)}
                              disabled={pontosRestantes <= 0 || loading}
                              whileTap={pontosRestantes <= 0 || loading ? undefined : { scale: 0.88 }}
                              aria-label={`Aumentar ${attr}`}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] bg-[#171311] hover:bg-[#261F1B] border border-[#C8A656]/85 text-[#F5E3A6] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-sm sm:text-base transition-colors cursor-pointer"
                            >
                              +
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* RODAPÉ LADO A LADO: Botões CANCELAR (esquerda) e CONFIRMAR (direita) */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.28 }}
                    className="relative z-10 grid grid-cols-2 gap-3 pt-1"
                  >
                    <motion.button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={loading}
                      whileHover={loading ? undefined : { scale: 1.02 }}
                      whileTap={loading ? undefined : { scale: 0.96 }}
                      className="inline-flex items-center justify-center gap-2 bg-[#12100E]/95 hover:bg-[#1E1915] text-[#F5E3A6] border border-[#D4AF37] font-cinzel tracking-wider uppercase font-bold py-2.5 px-3 rounded-[3px] shadow-[0_6px_18px_rgba(0,0,0,0.85)] transition-colors text-xs sm:text-sm cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-[#F5C542] shrink-0" />
                      <span>Cancelar</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handleNextStep}
                      disabled={
                        !isStep4Valid ||
                        !isStep1Valid ||
                        !isStep2Valid ||
                        !isStep3Valid ||
                        loading
                      }
                      whileHover={
                        !isStep4Valid ||
                        !isStep1Valid ||
                        !isStep2Valid ||
                        !isStep3Valid ||
                        loading
                          ? undefined
                          : { scale: 1.03 }
                      }
                      whileTap={
                        !isStep4Valid ||
                        !isStep1Valid ||
                        !isStep2Valid ||
                        !isStep3Valid ||
                        loading
                          ? undefined
                          : { scale: 0.96 }
                      }
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-b from-[#F2CA68] via-[#DFA83C] to-[#C48B28] hover:from-[#F7D683] hover:to-[#C9922B] disabled:from-[#2B2824] disabled:to-[#1C1B18] disabled:border-[#B2A66C]/25 disabled:text-[#E2D6B6]/40 disabled:cursor-not-allowed text-[#140E08] font-cinzel tracking-wider uppercase font-extrabold py-2.5 px-3 rounded-[3px] border border-[#FFF0B8]/85 shadow-[0_6px_18px_rgba(0,0,0,0.85)] transition-all text-xs sm:text-sm cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3] shrink-0" />
                      <span>Confirmar</span>
                    </motion.button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* =========================================================
                ETAPA 5 — RESUMO E CONFIRMAÇÃO FINAL (Tela única inteiriça na disposição da referência)
               ========================================================= */}
            {currentStep === 5 && (
              <motion.div
                key="step-5-resumo"
                initial={{ opacity: 0, x: stepDirection * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: stepDirection * -20 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full overflow-hidden select-none"
              >
                <div
                  className="relative w-full h-full overflow-hidden pt-13 pb-2.5 px-2.5 sm:px-4 bg-cover bg-center flex flex-col justify-between gap-2"
                  style={{
                    backgroundImage: `url('${WIZARD_BACKGROUNDS.resumo}')`,
                  }}
                >
                  {/* Velo escuro sutil para contraste mantendo o castelo e a lua rubra no topo */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/80 pointer-events-none"
                  />

                  {/* BLOCO SUPERIOR (2 Colunas): Retrato Grande à Esquerda + Banner de Nome e 7 Barras de Atributos à Direita */}
                  <div className="relative z-10 grid grid-cols-[44%_54%] justify-between gap-2 flex-1 min-h-0 max-h-[48%]">
                    {/* ESQUERDA SUPERIOR: Moldura de Foto de Perfil (Background bg-resumo mantido + Personagem do Hub acima do background) */}
                    <motion.div
                      initial={{ opacity: 0, x: -16, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      className="relative h-full rounded-[3px] border-2 border-[#D4AF37] bg-[#0E090A] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.9)] flex flex-col justify-end"
                    >
                      {/* Estrela dourada ornamental no topo da moldura */}
                      <div
                        aria-hidden="true"
                        className="absolute top-1 left-1/2 -translate-x-1/2 z-30 w-3.5 h-3.5 rotate-45 border border-[#F5C542] bg-[#160B0D] flex items-center justify-center shadow"
                      >
                        <div className="w-1.5 h-1.5 bg-[#F5C542]" />
                      </div>

                      {/* 1. Background mantido na foto de perfil (bg-resumo.png) com movimento sutil */}
                      <motion.img
                        src={WIZARD_BACKGROUNDS.resumo}
                        alt=""
                        aria-hidden="true"
                        initial={{ scale: 1.03 }}
                        animate={{
                          scale: [1.03, 1.08, 1.03],
                          x: [0, -3, 0, 3, 0],
                        }}
                        transition={{
                          duration: 14,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute inset-0 z-0 w-full h-full object-cover object-center pointer-events-none"
                      />

                      {/* Halo atmosférico pulsante entre o background e o personagem do Hub */}
                      <motion.div
                        aria-hidden="true"
                        animate={{
                          opacity: [0.22, 0.45, 0.22],
                          scale: [0.92, 1.06, 0.92],
                        }}
                        transition={{
                          duration: 4.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute bottom-[10%] left-1/2 -translate-x-1/2 z-10 w-28 h-36 rounded-full blur-2xl pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle, rgba(200,166,86,0.42) 0%, rgba(200,166,86,0.08) 60%, transparent 75%)',
                        }}
                      />

                      {/* 2. Personagem que fica no Hub (sprite transparente) ACIMA do background */}
                      <div className="absolute inset-x-0 bottom-4 top-2 z-20 flex items-end justify-center pointer-events-none overflow-hidden">
                        <motion.img
                          src={resolveAvatarSrc(undefined, selectedClass.id)}
                          alt={selectedClass.nome}
                          style={{ transformOrigin: 'bottom center' }}
                          animate={{
                            y: [0, -4, 0],
                            scaleY: [1, 1.018, 1],
                            scaleX: [1, 1.007, 1],
                            rotate: [0, 0.45, 0, -0.35, 0],
                          }}
                          transition={{
                            duration: 4.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="h-[94%] w-auto max-w-[94%] object-contain object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]"
                        />
                      </div>

                      {/* Miniatura circular da Raça no canto superior esquerdo */}
                      <div
                        title={`Raça: ${selectedRace.nome}`}
                        className="absolute top-2 left-2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#F5C542] bg-[#0D090A] overflow-hidden shadow-md"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            WIZARD_RACE_IMAGES[selectedRace.id] ||
                            RACE_ICONS[selectedRace.id] ||
                            ''
                          }
                          alt={selectedRace.nome}
                          style={{ objectFit: 'cover', objectPosition: '50% 15%' }}
                          className="w-full h-full"
                        />
                      </div>

                      {/* Faixa inferior da moldura do retrato com Raça + Classe (+ Linhagem) */}
                      <div className="relative z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent px-2 pt-4 pb-1.5 text-center">
                        <span className="block font-cinzel font-extrabold text-[10px] sm:text-xs text-[#F5C542] uppercase tracking-wider truncate">
                          {selectedRace.nome} · {selectedClass.nome}
                        </span>
                        {selectedRace.id === 'draconiano' && selectedLinhagem && (
                          <span className="block font-cinzel text-[8px] sm:text-[9px] text-[#E2D6B6] truncate">
                            Linhagem: {LINEAGE_LABELS[selectedLinhagem].nome}
                          </span>
                        )}
                      </div>
                    </motion.div>

                    {/* DIREITA SUPERIOR: Banner de Nome no Topo + 7 Linhas Horizontais dos Atributos Finais */}
                    <motion.div
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, delay: 0.05, ease: 'easeOut' }}
                      className="h-full flex flex-col justify-between gap-1 min-w-0"
                    >
                      {/* Moldura do Nome do Personagem */}
                      <div className="relative bg-gradient-to-r from-[#22080B]/95 via-[#110C0C]/95 to-[#22080B]/95 border border-[#D4AF37] rounded-[3px] px-2.5 py-1 text-center shadow-md shrink-0">
                        <span className="block font-cinzel font-extrabold text-xs sm:text-sm text-[#F5F3E0] tracking-wider uppercase truncate">
                          {nomeLimpo}
                        </span>
                        <span className="block font-cinzel text-[8px] sm:text-[9px] text-[#F5C542] uppercase tracking-widest">
                          Nível 1 · 10/10 Pontos
                        </span>
                      </div>

                      {/* As 7 Barras de Atributos Finais (Ícone quadrado à esquerda + Barra emoldurada à direita) */}
                      <div className="flex-1 flex flex-col justify-between gap-0.5 min-h-0">
                        {ATTRIBUTES.map((attr, idx) => {
                          const base = GAME_CONFIG.VALOR_BASE_ATRIBUTOS[attr];
                          const bonusRacial = selectedRace.bonusAtributos[attr];
                          const bonusClasse = selectedClass.bonusAtributos[attr];
                          const extra = pontos[attr];
                          const total = base + bonusRacial + bonusClasse + extra;
                          const attrIconSrc = ATTRIBUTE_ICONS[attr];

                          return (
                            <motion.div
                              key={attr}
                              initial={{ opacity: 0, x: 12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.2,
                                delay: 0.08 + idx * 0.03,
                                ease: 'easeOut',
                              }}
                              className="flex items-center gap-1 min-h-0 flex-1"
                            >
                              {/* Caixa quadrada do ícone à esquerda */}
                              <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-[2px] bg-[#140B0C] border border-[#D4AF37]/85 flex items-center justify-center p-0.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={attrIconSrc}
                                  alt={ATTRIBUTE_SHORT_NAMES[attr]}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              {/* Barra horizontal emoldurada à direita */}
                              <div className="flex-1 h-5 sm:h-6 rounded-[2px] bg-[#0E0B0B]/95 border border-[#C8A656]/80 px-1.5 flex items-center justify-between gap-1 min-w-0">
                                <span className="font-cinzel font-bold text-[9px] sm:text-[10px] text-[#F5F3E0] truncate">
                                  {ATTRIBUTE_SHORT_NAMES[attr]}
                                </span>
                                <span className="text-[7px] sm:text-[8px] text-[#D5C7A4]/85 truncate hidden xs:inline">
                                  B{base}
                                  {bonusRacial > 0 ? `+R${bonusRacial}` : ''}
                                  {bonusClasse > 0 ? `+C${bonusClasse}` : ''}
                                  {extra > 0 ? `+P${extra}` : ''}
                                </span>
                                <span className="font-cinzel font-extrabold text-[10px] sm:text-xs text-[#F5C542] tabular-nums shrink-0">
                                  {total}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>

                  {/* BLOCO DO MEIO (2 Colunas): Grade de Slots/Recursos à Esquerda + Caixa de Passiva/Progressão e 4 Slots de Habilidade à Direita */}
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.26, delay: 0.16, ease: 'easeOut' }}
                    className="relative z-10 grid grid-cols-[44%_54%] justify-between gap-2 h-[31%] shrink-0"
                  >
                    {/* ESQUERDA MEIO: 4 mini-slots + Moldura Central de Recursos (HP / MP / SE) + 4 mini-slots */}
                    <div className="h-full grid grid-cols-[22%_52%_22%] justify-between items-stretch gap-1">
                      {/* 4 slots ornamentais esquerdos */}
                      <div className="flex flex-col justify-between gap-1">
                        {[1, 2, 3, 4].map((slot) => (
                          <div
                            key={`left-slot-${slot}`}
                            className="flex-1 rounded-[2px] bg-[#110C0C]/90 border border-[#C8A656]/65 flex items-center justify-center"
                          >
                            <div className="w-1.5 h-1.5 rotate-45 border border-[#C8A656]/40" />
                          </div>
                        ))}
                      </div>

                      {/* Moldura central vertical com os 3 Recursos Previstos (HP, Mana, Sobreescudo) */}
                      <div className="rounded-[3px] bg-[#110B0C]/95 border border-[#D4AF37] p-1.5 flex flex-col justify-around items-center text-center shadow-inner">
                        <span className="font-cinzel font-bold text-[8px] uppercase tracking-wider text-[#F5C542]">
                          Recursos Nv.1
                        </span>

                        <div className="w-full flex items-center justify-between px-1 text-[9px] sm:text-[10px] tabular-nums">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={RESOURCE_ICONS.hp}
                            alt="HP"
                            className="w-3.5 h-3.5 object-contain"
                          />
                          <span className="font-cinzel text-[#D5C7A4] text-[8px]">HP</span>
                          <span className="font-cinzel font-bold text-[#F5F3E0]">
                            {previewHp}
                          </span>
                        </div>

                        <div className="w-full flex items-center justify-between px-1 text-[9px] sm:text-[10px] tabular-nums">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ATTRIBUTE_ICONS.sorte}
                            alt="Crítico"
                            className="w-3.5 h-3.5 object-contain"
                          />
                          <span className="font-cinzel text-[#D5C7A4] text-[8px]">CRÍT.</span>
                          <span className="font-cinzel font-bold text-[#F5F3E0]">
                            {previewCritico}
                          </span>
                        </div>

                        <div className="w-full flex items-center justify-between px-1 text-[9px] sm:text-[10px] tabular-nums">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={RESOURCE_ICONS.sobreescudo}
                            alt="SE"
                            className="w-3.5 h-3.5 object-contain"
                          />
                          <span className="font-cinzel text-[#D5C7A4] text-[8px]">SE</span>
                          <span className="font-cinzel font-bold text-[#F5C542]">
                            {previewSobreescudo}
                          </span>
                        </div>
                      </div>

                      {/* 4 slots ornamentais direitos */}
                      <div className="flex flex-col justify-between gap-1">
                        {[1, 2, 3, 4].map((slot) => (
                          <div
                            key={`right-slot-${slot}`}
                            className="flex-1 rounded-[2px] bg-[#110C0C]/90 border border-[#C8A656]/65 flex items-center justify-center"
                          >
                            <div className="w-1.5 h-1.5 rotate-45 border border-[#C8A656]/40" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DIREITA MEIO: Caixa de Passiva/Progressão no topo + 4 Slots Quadrados de Habilidades embaixo */}
                    <div className="h-full flex flex-col justify-between gap-1.5 min-w-0">
                      {/* Caixa retangular de Passiva Racial e Progressão Inicial */}
                      <div className="flex-1 rounded-[3px] bg-gradient-to-br from-[#20080C]/95 via-[#100C0C]/95 to-[#0D0A0A]/95 border border-[#D4AF37] p-2 flex flex-col justify-between overflow-hidden">
                        <div>
                          <span className="block font-cinzel font-bold text-[9px] sm:text-[10px] uppercase tracking-wider text-[#F5C542] truncate">
                            Passiva: {selectedRace.passivaRacial.nome}
                          </span>
                          <p className="text-[8px] sm:text-[9px] text-[#E2D6B6] leading-tight line-clamp-2 mt-0.5">
                            {formatRacialPassiveSummary(selectedRace)}
                          </p>
                        </div>

                        <div className="border-t border-[#C8A656]/30 pt-1">
                          <span className="block font-cinzel font-bold text-[8px] sm:text-[9px] uppercase tracking-wider text-[#D5C7A4] truncate">
                            Classe ({selectedClass.nome}):
                          </span>
                          <p className="text-[8px] sm:text-[9px] text-[#F5F3E0] leading-tight truncate">
                            Nv.1 {selectedClass.progressao.ataqueBasico.nome} · Nv.5{' '}
                            {selectedClass.progressao.habilidadeEspecial.nome} · Nv.30{' '}
                            {selectedClass.progressao.ultimate.nome}
                          </p>
                        </div>
                      </div>

                      {/* 4 Habilidades principais (Raça Ativa/Passiva + Classe Nv 1/5) */}
                      <div className="grid grid-cols-4 gap-1 h-9 sm:h-10 shrink-0">
                        <div className="flex items-center justify-center">
                          <SkillIcon
                            id="resumo-race-ativa"
                            src={getRaceSkillIcon(selectedRace.id, 'ativa')}
                            nome={selectedRace.habilidadeRacial.nome}
                            tipo="Ativa"
                            descricao={selectedRace.habilidadeRacial.efeito}
                            recargaTurnos={selectedRace.habilidadeRacial.recargaTurnos}
                            duracaoTurnos={selectedRace.habilidadeRacial.duracaoTurnos}
                            isOpen={resumoSkillPopoverId === 'resumo-race-ativa'}
                            onToggle={() =>
                              setResumoSkillPopoverId((prev) =>
                                prev === 'resumo-race-ativa' ? null : 'resumo-race-ativa'
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-center">
                          <SkillIcon
                            id="resumo-race-passiva"
                            src={getRaceSkillIcon(selectedRace.id, 'passiva')}
                            nome={selectedRace.passivaRacial.nome}
                            tipo="Passiva"
                            descricao={selectedRace.passivaRacial.descricao ?? 'Descrição ainda não definida'}
                            isOpen={resumoSkillPopoverId === 'resumo-race-passiva'}
                            onToggle={() =>
                              setResumoSkillPopoverId((prev) =>
                                prev === 'resumo-race-passiva' ? null : 'resumo-race-passiva'
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-center">
                          <SkillIcon
                            id="resumo-class-0"
                            src={getClassSkillIcon(selectedClass.id, 0)}
                            nome={selectedClass.progressao.ataqueBasico.nome}
                            tipo="Ataque Básico"
                            nivelRequerido={1}
                            descricao={selectedClass.progressao.ataqueBasico.descricao}
                            isOpen={resumoSkillPopoverId === 'resumo-class-0'}
                            onToggle={() =>
                              setResumoSkillPopoverId((prev) =>
                                prev === 'resumo-class-0' ? null : 'resumo-class-0'
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-center">
                          <SkillIcon
                            id="resumo-class-1"
                            src={getClassSkillIcon(selectedClass.id, 1)}
                            nome={selectedClass.progressao.habilidadeEspecial.nome}
                            tipo="Habilidade Especial"
                            nivelRequerido={5}
                            descricao={selectedClass.progressao.habilidadeEspecial.descricao}
                            isOpen={resumoSkillPopoverId === 'resumo-class-1'}
                            onToggle={() =>
                              setResumoSkillPopoverId((prev) =>
                                prev === 'resumo-class-1' ? null : 'resumo-class-1'
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* BLOCO INFERIOR (Largura Total): Moldura Horizontal com Detalhamento e Botões Voltar / Confirmar */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.26, delay: 0.24, ease: 'easeOut' }}
                    className="relative z-10 rounded-[3px] bg-gradient-to-r from-[#1E080B]/95 via-[#0E0B0B]/95 to-[#1E080B]/95 border-2 border-[#D4AF37] p-2.5 sm:p-3 flex flex-col justify-between gap-2 shadow-[0_10px_28px_rgba(0,0,0,0.95)] shrink-0"
                  >
                    <div className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px] text-[#D5C7A4] border-b border-[#C8A656]/30 pb-1">
                      <span className="font-cinzel uppercase tracking-wider text-[#F5C542] font-bold truncate">
                        Pergaminho de Consagração
                      </span>
                      <span className="truncate">
                        {selectedRace.nome} · {selectedClass.nome} · HP {previewHp} / Crítico{' '}
                        {previewCritico}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2.5">
                      <motion.button
                        type="button"
                        onClick={handlePrevStep}
                        disabled={loading}
                        whileHover={loading ? undefined : { scale: 1.03 }}
                        whileTap={loading ? undefined : { scale: 0.96 }}
                        className="inline-flex items-center justify-center gap-1.5 bg-[#140C0D]/95 hover:bg-[#221315] disabled:opacity-40 text-[#E2D6B6] hover:text-[#F5C542] border border-[#C8A656]/80 font-cinzel tracking-wider uppercase font-semibold py-2 px-4 rounded text-xs transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-[#F5C542]" />
                        <span>Voltar</span>
                      </motion.button>

                      <motion.button
                        type="submit"
                        disabled={
                          !isStep4Valid ||
                          !isStep1Valid ||
                          !isStep2Valid ||
                          !isStep3Valid ||
                          loading
                        }
                        whileHover={
                          !isStep4Valid ||
                          !isStep1Valid ||
                          !isStep2Valid ||
                          !isStep3Valid ||
                          loading
                            ? undefined
                            : { scale: 1.02 }
                        }
                        whileTap={
                          !isStep4Valid ||
                          !isStep1Valid ||
                          !isStep2Valid ||
                          !isStep3Valid ||
                          loading
                            ? undefined
                            : { scale: 0.97 }
                        }
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-[#140C0D]/95 hover:bg-[#241316] disabled:opacity-35 disabled:cursor-not-allowed text-[#F5E3A6] font-cinzel tracking-[0.16em] uppercase font-bold py-2 px-4 rounded border border-[#F5C542] shadow-[0_4px_16px_rgba(0,0,0,0.9)] transition-all text-xs sm:text-sm truncate cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-[#F5C542] shrink-0" />
                        <span className="truncate">
                          {loading ? 'Consagrando...' : 'Confirmar e Criar'}
                        </span>
                      </motion.button>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
