'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CharacterDocument } from '@/server/characterService';
import type { SlotHabilidade } from '@/rules/habilidadesEquipadas';
import { TEXTOS_SUBCLASSE } from '@/rules/subclasseTextos';
import { iconeDaHabilidadeSubclasse } from '@/rules/subclasseAssets';
import { habilidadeDoKitLiberada, type ChaveEspaco } from '@/lib/subclasseTela';
import { getRaceById } from '@/rules/races';
import { getClassById } from '@/rules/classes';
import { getRaceSkillIcon, getClassSkillIcon } from '@/rules/skillIcons';
import { FICHA_UI, POSICOES_DA_FICHA } from '@/assets/personagemUi';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { SkillIcon } from '@/components/skills';

interface FichaHabilidadesProps {
  character: CharacterDocument;
  activePopoverId: string | null;
  onTogglePopover: (id: string) => void;
  /** Troca a habilidade do espaço entre a da classe e a da subclasse. Devolve a mensagem de erro, se houver. */
  onEquiparHabilidade?: (slot: SlotHabilidade, habilidadeId: string) => Promise<string | null>;
  className?: string;
}

export function FichaHabilidades({
  character,
  activePopoverId,
  onTogglePopover,
  onEquiparHabilidade,
  className = '',
}: FichaHabilidadesProps) {
  const [trocando, setTrocando] = useState(false);
  const [erroTroca, setErroTroca] = useState<string | null>(null);
  const raca = getRaceById(character.racaId);
  const classe = getClassById(character.classeId);

  interface SkillItem {
    id: string;
    nome: string;
    tipo: string;
    descricao: string;
    src: string | null;
    nivelRequerido?: number;
    bloqueada: boolean;
    recargaTurnos?: number;
    duracaoTurnos?: number;
    /** Espaço com habilidade da subclasse liberada: o ícone de troca (🔄) leva à outra habilidade. */
    troca?: { slot: SlotHabilidade; alvoId: string; para: 'classe' | 'subclasse' };
  }

  const textosSub = character.subclasseAtualId ? TEXTOS_SUBCLASSE[character.subclasseAtualId] : undefined;
  /** Se a subclasse tem habilidade liberada neste espaço, mostra a escolhida (classe ou subclasse) e a troca. */
  const comTroca = (item: SkillItem, slot: SlotHabilidade, espaco: ChaveEspaco, idDaClasse: string): SkillItem => {
    if (!textosSub || !character.subclasseAtualId) return item;
    if (!habilidadeDoKitLiberada(character, character.subclasseAtualId, espaco)) return item;
    const kit = textosSub[espaco];
    const daSubclasse = character.habilidadesEquipadas?.[slot] === kit.id;
    return daSubclasse
      ? {
          ...item,
          nome: kit.nome,
          descricao: kit.descricao,
          src: iconeDaHabilidadeSubclasse(kit.id),
          tipo: `${item.tipo} · da subclasse`,
          troca: { slot, alvoId: idDaClasse, para: 'classe' },
        }
      : { ...item, troca: { slot, alvoId: kit.id, para: 'subclasse' } };
  };

  const trocar = async (t: NonNullable<SkillItem['troca']>) => {
    if (!onEquiparHabilidade || trocando) return;
    setTrocando(true);
    setErroTroca(null);
    try {
      setErroTroca(await onEquiparHabilidade(t.slot, t.alvoId));
    } finally {
      setTrocando(false);
    }
  };

  const items: SkillItem[] = [];

  // 1. Ativa Racial
  if (raca) {
    items.push({
      id: `sheet-race-ativa-${raca.id}`,
      nome: raca.habilidadeRacial.nome,
      tipo: 'Ativa',
      descricao: raca.habilidadeRacial.efeito,
      src: getRaceSkillIcon(raca.id, 'ativa'),
      nivelRequerido: 1,
      bloqueada: false,
      recargaTurnos: raca.habilidadeRacial.recargaTurnos,
      duracaoTurnos: raca.habilidadeRacial.duracaoTurnos,
    });

    // 2. Passiva Racial
    items.push({
      id: `sheet-race-passiva-${raca.id}`,
      nome: raca.passivaRacial.nome,
      tipo: 'Passiva',
      descricao: raca.passivaRacial.descricao ?? 'Descrição ainda não definida',
      src: getRaceSkillIcon(raca.id, 'passiva'),
      nivelRequerido: 1,
      bloqueada: false,
    });
  }

  // 3 a 7. Marcos da Classe
  if (classe) {
    // 3. Nv 1 - Ataque Básico
    items.push(
      comTroca(
        {
          id: `sheet-class-${classe.id}-ataqueBasico`,
          nome: classe.progressao.ataqueBasico.nome,
          tipo: 'Ataque Básico',
          descricao: classe.progressao.ataqueBasico.descricao,
          src: getClassSkillIcon(classe.id, 0),
          nivelRequerido: 1,
          bloqueada: character.nivel < 1,
        },
        'ataqueBasico',
        'basico',
        classe.progressao.ataqueBasico.id
      )
    );

    // 4. Nv 5 - Habilidade Especial
    items.push(
      comTroca(
        {
          id: `sheet-class-${classe.id}-habilidadeEspecial`,
          nome: classe.progressao.habilidadeEspecial.nome,
          tipo: 'Habilidade Especial',
          descricao: classe.progressao.habilidadeEspecial.descricao,
          src: getClassSkillIcon(classe.id, 1),
          nivelRequerido: 5,
          bloqueada: character.nivel < 5,
        },
        'habilidadeEspecial',
        'especial',
        classe.progressao.habilidadeEspecial.id
      )
    );

    // 5. Nv 12 - Passiva I
    items.push({
      id: `sheet-class-${classe.id}-passivaI`,
      nome: classe.progressao.passivaI.nome,
      tipo: 'Passiva I',
      descricao: classe.progressao.passivaI.descricao,
      src: getClassSkillIcon(classe.id, 2),
      nivelRequerido: 12,
      bloqueada: character.nivel < 12,
    });

    // 6. Nv 20 - Passiva II
    items.push({
      id: `sheet-class-${classe.id}-passivaII`,
      nome: classe.progressao.passivaII.nome,
      tipo: 'Passiva II',
      descricao: classe.progressao.passivaII.descricao,
      src: getClassSkillIcon(classe.id, 3),
      nivelRequerido: 20,
      bloqueada: character.nivel < 20,
    });

    // 7. Nv 30 - Ultimate
    items.push(
      comTroca(
        {
          id: `sheet-class-${classe.id}-ultimate`,
          nome: classe.progressao.ultimate.nome,
          tipo: 'Ultimate',
          descricao: classe.progressao.ultimate.descricao,
          src: getClassSkillIcon(classe.id, 4),
          nivelRequerido: 30,
          bloqueada: character.nivel < 30,
        },
        'ultimate',
        'ultimate',
        classe.progressao.ultimate.id
      )
    );
  }

  const { lado, centros } = POSICOES_DA_FICHA.habilidades;

  return (
    <>
      {erroTroca && (
        <p role="alert" className="text-center text-[#F5A6A6] font-semibold shrink-0 leading-tight" style={{ fontSize: '2.4cqw' }}>
          {erroTroca}
        </p>
      )}
      <section aria-label={TEXTOS_DA_FICHA.habilidades.titulo} className={`relative mx-auto select-none shrink-0 ${className}`} style={{ width: '94cqw', aspectRatio: '740 / 236' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FICHA_UI.painelHabilidades} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
        <h2 className="absolute font-cinzel font-extrabold uppercase tracking-wide text-[#EDB44C] leading-none" style={{ left: '14%', top: '8.4%', fontSize: '2.9cqw', textShadow: '0.2cqw 0 0 #0B0610, -0.2cqw 0 0 #0B0610, 0 0.2cqw 0 #0B0610, 0 -0.2cqw 0 #0B0610' }}>
          {TEXTOS_DA_FICHA.habilidades.titulo}
        </h2>
        {items.slice(0, centros.length).map((skill, idx) => (
          <div key={skill.id} className="absolute flex items-center justify-center" style={{ left: `${centros[idx][0]}%`, top: `${centros[idx][1]}%`, width: `${lado}%`, aspectRatio: '1', transform: 'translate(-50%, -50%)' }}>
            <div className="relative w-full h-full">
              <SkillIcon
                id={skill.id}
                src={skill.src}
                nome={skill.nome}
                tipo={skill.tipo}
                descricao={skill.descricao}
                nivelRequerido={skill.nivelRequerido}
                bloqueada={skill.bloqueada}
                recargaTurnos={skill.recargaTurnos}
                duracaoTurnos={skill.duracaoTurnos}
                size="100%"
                isOpen={activePopoverId === skill.id}
                onToggle={() => onTogglePopover(skill.id)}
              />
              {skill.troca && onEquiparHabilidade && (
                <button
                  type="button"
                  aria-label={`Trocar ${skill.nome} pela habilidade ${skill.troca.para === 'classe' ? 'da classe' : 'da subclasse'}`}
                  title={`Usar a ${skill.troca.para === 'classe' ? 'da classe' : 'da subclasse'}`}
                  disabled={trocando}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (skill.troca) void trocar(skill.troca);
                  }}
                  className="absolute -top-[18%] -right-[18%] w-[34%] h-[34%] rounded-full bg-[#120F0C] border border-[#F5C542] text-[#F5C542] flex items-center justify-center cursor-pointer active:scale-90 disabled:opacity-50 z-20"
                >
                  <RefreshCw className="w-[60%] h-[60%]" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
