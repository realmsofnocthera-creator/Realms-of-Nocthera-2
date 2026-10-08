'use client';

import React from 'react';
import { CharacterDocument } from '@/server/characterService';
import { getRaceById } from '@/rules/races';
import { getClassById } from '@/rules/classes';
import { getRaceSkillIcon, getClassSkillIcon } from '@/rules/skillIcons';
import { FICHA_ASSETS } from '@/rules/fichaAssets';
import { SkillIcon } from '@/components/skills';

interface FichaHabilidadesProps {
  character: CharacterDocument;
  activePopoverId: string | null;
  onTogglePopover: (id: string) => void;
  className?: string;
}

export function FichaHabilidades({
  character,
  activePopoverId,
  onTogglePopover,
  className = '',
}: FichaHabilidadesProps) {
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
    custoMana?: number;
    recargaTurnos?: number;
    duracaoTurnos?: number;
  }

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
      custoMana: raca.habilidadeRacial.custoMana,
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
    items.push({
      id: `sheet-class-${classe.id}-ataqueBasico`,
      nome: classe.progressao.ataqueBasico.nome,
      tipo: 'Ataque Básico',
      descricao: classe.progressao.ataqueBasico.descricao,
      src: getClassSkillIcon(classe.id, 0),
      nivelRequerido: 1,
      bloqueada: character.nivel < 1,
    });

    // 4. Nv 5 - Habilidade Especial
    items.push({
      id: `sheet-class-${classe.id}-habilidadeEspecial`,
      nome: classe.progressao.habilidadeEspecial.nome,
      tipo: 'Habilidade Especial',
      descricao: classe.progressao.habilidadeEspecial.descricao,
      src: getClassSkillIcon(classe.id, 1),
      nivelRequerido: 5,
      bloqueada: character.nivel < 5,
    });

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
    items.push({
      id: `sheet-class-${classe.id}-ultimate`,
      nome: classe.progressao.ultimate.nome,
      tipo: 'Ultimate',
      descricao: classe.progressao.ultimate.descricao,
      src: getClassSkillIcon(classe.id, 4),
      nivelRequerido: 30,
      bloqueada: character.nivel < 30,
    });
  }

  const row1 = items.slice(0, 4);
  const row2 = items.slice(4);

  return (
    <section
      aria-label="Habilidades"
      className={`relative w-full aspect-[1279/700] max-h-[175px] sm:max-h-[195px] bg-no-repeat bg-center bg-[length:100%_100%] shadow-2xl select-none mx-auto shrink-0 ${className}`}
      style={{
        backgroundImage: `url(${FICHA_ASSETS.molduraHabilidades})`,
      }}
    >
      {/* Contêiner seguro bem dentro do pergaminho (top 20% a bottom 21%) */}
      <div className="absolute inset-x-[8%] sm:inset-x-[10%] top-[20%] bottom-[21%] flex flex-col justify-around py-0.5">
        {/* Linha 1: 4 habilidades */}
        <div className="grid grid-cols-4 items-center justify-items-center w-full gap-x-1 sm:gap-x-2">
          {row1.map((skill, idx) => (
            <div
              key={skill.id}
              className="flex flex-col items-center justify-start gap-0.5 w-full max-w-[64px]"
            >
              <SkillIcon
                id={skill.id}
                src={skill.src}
                nome={skill.nome}
                tipo={skill.tipo}
                descricao={skill.descricao}
                nivelRequerido={skill.nivelRequerido}
                bloqueada={skill.bloqueada}
                custoMana={skill.custoMana}
                recargaTurnos={skill.recargaTurnos}
                duracaoTurnos={skill.duracaoTurnos}
                badgeIndex={idx + 1}
                size={30}
                isOpen={activePopoverId === skill.id}
                onToggle={() => onTogglePopover(skill.id)}
              />
              <span
                title={skill.nome}
                className="block font-cinzel font-semibold text-[8px] sm:text-[9px] tracking-tight leading-none text-center truncate w-full px-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] text-[#D5C7A4]"
              >
                {skill.bloqueada ? `Nv. ${skill.nivelRequerido}` : `Nv. ${character.nivel}`}
              </span>
            </div>
          ))}
        </div>

        {/* Linha 2: 3 habilidades centralizadas */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
          {row2.map((skill, idx) => (
            <div
              key={skill.id}
              className="flex flex-col items-center justify-start gap-0.5 w-full max-w-[64px]"
            >
              <SkillIcon
                id={skill.id}
                src={skill.src}
                nome={skill.nome}
                tipo={skill.tipo}
                descricao={skill.descricao}
                nivelRequerido={skill.nivelRequerido}
                bloqueada={skill.bloqueada}
                custoMana={skill.custoMana}
                recargaTurnos={skill.recargaTurnos}
                duracaoTurnos={skill.duracaoTurnos}
                badgeIndex={idx + 5}
                size={30}
                isOpen={activePopoverId === skill.id}
                onToggle={() => onTogglePopover(skill.id)}
              />
              <span
                title={skill.nome}
                className="block font-cinzel font-semibold text-[8px] sm:text-[9px] tracking-tight leading-none text-center truncate w-full px-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] text-[#D5C7A4]"
              >
                {skill.bloqueada ? `Nv. ${skill.nivelRequerido}` : `Nv. ${character.nivel}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
