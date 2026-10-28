import React from 'react';
import Link from 'next/link';
import { IDADE_MINIMA } from '@/rules/idadeMinima';

interface CamposDeIdadeETermosProps {
  idBase: string;
  dataNascimento: string;
  aceitou: boolean;
  onDataNascimento: (valor: string) => void;
  onAceitou: (valor: boolean) => void;
}

const ROTULO = 'block text-xs uppercase font-cinzel tracking-wider text-[#D5C7A4] mb-1.5';
const CAMPO =
  'w-full bg-[#0D0D0D]/80 border-4 border-[#1A120B] shadow-[0_0_0_2px_#B2A66C99] px-3 py-2.5 text-[#F5F3E0] placeholder-[#E2D6B6]/35 focus:outline-none focus:shadow-[0_0_0_2px_#ED8A0C] hover:shadow-[0_0_0_2px_#D5C7A4] transition-shadow text-sm';

/** Data de nascimento (idade mínima de 16 anos) e o aceite dos Termos. Usado no cadastro e na confirmação para quem entrou pelo Google. */
export function CamposDeIdadeETermos({ idBase, dataNascimento, aceitou, onDataNascimento, onAceitou }: CamposDeIdadeETermosProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idBase}-nascimento`} className={ROTULO}>
          Data de nascimento
        </label>
        <input
          id={`${idBase}-nascimento`}
          type="date"
          required
          value={dataNascimento}
          onChange={(e) => onDataNascimento(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className={`${CAMPO} campo-data-escuro`}
        />
        <p className="mt-1.5 text-[11px] text-[#E2D6B6]/80 leading-snug">
          O jogo é permitido a partir de {IDADE_MINIMA} anos. A data só confere a idade e não fica guardada.
        </p>
      </div>
      <label htmlFor={`${idBase}-aceite`} className="flex items-start gap-3 cursor-pointer select-none">
        <input
          id={`${idBase}-aceite`}
          type="checkbox"
          required
          checked={aceitou}
          onChange={(e) => onAceitou(e.target.checked)}
          className="mt-0.5 w-5 h-5 shrink-0 accent-[#ED8A0C]"
        />
        <span className="text-xs text-[#E2D6B6] leading-relaxed">
          Li e aceito os{' '}
          <Link href="/termos" target="_blank" className="text-[#ED8A0C] underline underline-offset-2 hover:text-[#F58C0C]">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link href="/privacidade" target="_blank" className="text-[#ED8A0C] underline underline-offset-2 hover:text-[#F58C0C]">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
    </div>
  );
}
