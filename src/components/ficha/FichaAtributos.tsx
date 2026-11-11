'use client';

import React from 'react';
import { CharacterDocument } from '@/server/characterService';
import { FICHA_UI, ICONES_DA_FICHA, POSICOES_DA_FICHA } from '@/assets/personagemUi';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { calcularChanceCritico } from '@/game';
import { formatarCompacto } from '@/rules/numerosCompactos';

interface FichaAtributosProps {
  character: CharacterDocument;
  onOpenLupa?: () => void;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const CONTORNO = '0.2cqw 0 0 #0B0610, -0.2cqw 0 0 #0B0610, 0 0.2cqw 0 #0B0610, 0 -0.2cqw 0 #0B0610';

/**
 * O painel de atributos (arte do Yuri): o título e as 10 linhas são desenhados em código, sobre a moldura sem texto.
 * Atributo zerado aparece como "—".
 */
export function FichaAtributos({ character, onOpenLupa, className = '' }: FichaAtributosProps) {
  const t = TEXTOS_DA_FICHA.atributos;
  // Atributos efetivos: os gravados, o bônus do Reforço de Habilidade (2.2.2) e o do equipamento equipado
  const efetivo = (attr: keyof typeof character.atributos) =>
    character.atributos[attr] + (character.bonusReforco?.[attr] ?? 0) + (character.bonusEquipamento?.[attr] ?? 0);
  // Chance de crítico (2% de base + 0,1% por ponto de Sorte)
  const chanceCritico = `${String(character.chanceCritico ?? calcularChanceCritico(character.atributos.sorte)).replace('.', ',')}%`;

  const linhas: { id: keyof typeof ICONES_DA_FICHA; nome: string; valor: string; cor: string }[] = [
    { id: 'hp', nome: t.hp, valor: `${character.hpMax}/${character.hpMax}`, cor: '#F5D9D9' },
    { id: 'sobreescudo', nome: t.sobreescudo, valor: `${character.sobreescudoMax}/${character.sobreescudoMax}`, cor: '#F5D9D9' },
    { id: 'critico', nome: t.critico, valor: chanceCritico, cor: '#F5D9D9' },
    ...(['vigor', 'sorte', 'forca', 'vitalidade', 'arcano', 'inteligencia', 'agilidade'] as const).map((a) => ({
      id: a,
      nome: t[a],
      valor: efetivo(a) > 0 ? formatarCompacto(efetivo(a)) : '—',
      cor: '#EDB44C',
    })),
  ];
  const { interior, lupa } = POSICOES_DA_FICHA.atributos;

  return (
    <section aria-label={t.titulo} className={`relative w-full select-none shrink-0 ${className}`} style={{ aspectRatio: '365 / 431' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FICHA_UI.painelAtributos} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
      <h2 className="absolute font-cinzel font-extrabold uppercase tracking-wide text-[#EDB44C] leading-none" style={{ left: '19%', top: '5.2%', fontSize: '2.9cqw', textShadow: CONTORNO }}>{t.titulo}</h2>
      <button type="button" onClick={onOpenLupa} aria-label={t.explicacoes} className="absolute cursor-pointer active:scale-95" style={{ left: `${lupa.esquerda}%`, top: `${lupa.topo}%`, width: `${lupa.lado}%`, aspectRatio: '1' }} />
      <ul className="absolute flex flex-col" style={{ left: `${interior.esquerda}%`, right: `${interior.direita}%`, top: `${interior.topo}%`, bottom: `${interior.base}%` }}>
        {linhas.map((l) => (
          <li key={l.id} className="flex-1 min-h-0 flex items-center gap-[1.6cqw] border-b border-[#B2873B]/45 last:border-b-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICONES_DA_FICHA[l.id]} alt="" aria-hidden="true" draggable={false} className="w-[3.7cqw] h-[3.7cqw] object-contain shrink-0" style={pixel} />
            <span className="flex-1 min-w-0 truncate font-cinzel font-bold uppercase text-[2.7cqw] leading-[1.35] text-[#E9DDC0]" style={{ textShadow: CONTORNO }}>{l.nome}</span>
            <span className="font-cinzel font-black text-[3cqw] leading-none tabular-nums shrink-0" style={{ color: l.cor, textShadow: CONTORNO }}>{l.valor}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
