'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Sparkles, Swords } from 'lucide-react';
import { FUNDO_DA_FERRARIA, SPRITES_DO_FERREIRO } from '@/assets/ferreiro';
import { FALAS_SOLTAS_DO_FERREIRO, falaComNome, NOME_DO_FERREIRO, SAUDACOES_DO_FERREIRO } from '@/rules/falasDoFerreiro';
import type { CharacterDocument } from '@/server/characterService';

const SOMBRA = '[text-shadow:1px_1px_0_#1A120B]';
const MS_POR_LETRA = 26;

/** As faíscas que saem do fogo (posição em % do fundo, atraso e duração fixos: a tela não muda a cada desenho). */
const FAISCAS = [
  { left: 47, top: 36.5, dx: '-14px', atraso: '0s', dur: '2.4s' },
  { left: 50, top: 37, dx: '6px', atraso: '0.5s', dur: '2.9s' },
  { left: 53, top: 36, dx: '16px', atraso: '1.1s', dur: '2.2s' },
  { left: 56, top: 37.5, dx: '-8px', atraso: '0.3s', dur: '3.1s' },
  { left: 49, top: 38, dx: '10px', atraso: '1.7s', dur: '2.6s' },
  { left: 58, top: 36, dx: '20px', atraso: '0.9s', dur: '2.8s' },
  { left: 45, top: 37.5, dx: '-20px', atraso: '2s', dur: '2.5s' },
  { left: 52, top: 38.5, dx: '-4px', atraso: '1.4s', dur: '3s' },
  { left: 55, top: 38, dx: '8px', atraso: '2.3s', dur: '2.3s' },
  { left: 51, top: 36, dx: '14px', atraso: '0.7s', dur: '2.7s' },
];

const OPCOES = [
  { id: 'armas', nome: 'Forjar arma', Icone: Swords, href: '/forja' as string | null },
  { id: 'armadura', nome: 'Armadura', Icone: Shield, href: '/armaduras' },
  { id: 'cosmeticos', nome: 'Cosmético', Icone: Sparkles, href: null },
];

const semMovimento = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Fala {
  linhas: string[];
  indice: number;
  /** A saudação libera o menu quando termina. */
  saudacao: boolean;
}

/** Duas correntes de pixel que seguram a placa (a de cima nasce na borda da tela ou na placa de cima). */
function Correntes({ altura }: { altura: number }) {
  return (
    <span aria-hidden="true" className="flex justify-between w-[112px]" style={{ height: altura }}>
      <span className="forja-corrente" />
      <span className="forja-corrente" />
    </span>
  );
}

/**
 * A ferraria: o fundo cobre a tela, o ferreiro martela no meio (folha de quadros animada), o fogo solta faíscas e,
 * ao abrir, ele fala umas linhas curtas. Depois da saudação aparecem, no alto à esquerda, as placas do menu
 * penduradas por correntes: Forjar arma, Armadura e Cosmético (em breve). Tocar no ferreiro faz ele falar de novo.
 */
export function FerreiroScreen({ character }: { character: CharacterDocument }) {
  const [fala, setFala] = useState<Fala | null>(null);
  const [digitadas, setDigitadas] = useState(0);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const fechar = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A saudação é sorteada depois de abrir (para a primeira tela do servidor e a do aparelho serem iguais)
  useEffect(() => {
    const set = SAUDACOES_DO_FERREIRO[Math.floor(Math.random() * SAUDACOES_DO_FERREIRO.length)];
    setFala({ linhas: set.map((l) => falaComNome(l, character.nome)), indice: 0, saudacao: true });
    setDigitadas(0);
    return () => {
      if (fechar.current) clearTimeout(fechar.current);
    };
  }, [character.nome]);

  const linha = fala ? fala.linhas[fala.indice] : '';

  // Máquina de escrever: uma letra por vez (com movimento reduzido, a fala aparece inteira)
  useEffect(() => {
    if (!fala) return;
    if (semMovimento()) {
      setDigitadas(linha.length);
      return;
    }
    if (digitadas >= linha.length) return;
    const t = setTimeout(() => setDigitadas((n) => n + 1), MS_POR_LETRA);
    return () => clearTimeout(t);
  }, [fala, linha, digitadas]);

  // Fala solta: some sozinha alguns segundos depois de terminar de escrever
  useEffect(() => {
    if (!fala || fala.saudacao || digitadas < linha.length) return;
    fechar.current = setTimeout(() => setFala(null), 2600);
    return () => {
      if (fechar.current) clearTimeout(fechar.current);
    };
  }, [fala, linha, digitadas]);

  const terminarSaudacao = useCallback(() => {
    setFala(null);
    setMenuVisivel(true);
  }, []);

  const tocarNaCaixa = () => {
    if (!fala) return;
    if (digitadas < linha.length) {
      setDigitadas(linha.length);
      return;
    }
    if (fala.indice < fala.linhas.length - 1) {
      setFala({ ...fala, indice: fala.indice + 1 });
      setDigitadas(0);
      return;
    }
    if (fala.saudacao) terminarSaudacao();
    else setFala(null);
  };

  const conversar = () => {
    if (!menuVisivel || fala) return;
    const solta = FALAS_SOLTAS_DO_FERREIRO[Math.floor(Math.random() * FALAS_SOLTAS_DO_FERREIRO.length)];
    setFala({ linhas: [solta], indice: 0, saudacao: false });
    setDigitadas(0);
  };

  const acabouDeEscrever = !!fala && digitadas >= linha.length;

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#0D0D0D]">
      <div className="hub-ferreiro">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FUNDO_DA_FERRARIA} alt="Ferraria com a forja acesa, armas e armaduras nas estantes" className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
        <span aria-hidden="true" className="forja-brilho" style={{ left: '37%', top: '27%', width: '28%', height: '14%' }} />
        {FAISCAS.map((f, i) => (
          <span key={i} aria-hidden="true" className="forja-faisca" style={{ left: `${f.left}%`, top: `${f.top}%`, ['--dx' as string]: f.dx, ['--atraso' as string]: f.atraso, ['--dur' as string]: f.dur }} />
        ))}
        <button type="button" onClick={conversar} aria-label={`Conversar com o ${NOME_DO_FERREIRO}`} className="absolute cursor-pointer focus:outline-none" style={{ left: '27%', width: '46%', bottom: '31%' }}>
          <span aria-hidden="true" className="ferreiro-sprite" style={{ backgroundImage: `url(${SPRITES_DO_FERREIRO})` }} />
        </button>
      </div>

      <Link href="/menu" aria-label="Voltar ao Menu" className="caixa-pixel absolute top-3 right-2.5 z-30 inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 sm:right-5">
        <ArrowLeft className="w-4 h-4 text-[#F5E3B3]" aria-hidden="true" />
        <span className={`font-[family-name:var(--font-pixel)] text-[8px] leading-none uppercase text-[#F5E3B3] ${SOMBRA}`}>Menu</span>
      </Link>

      {/* O menu: placas penduradas por correntes, no alto à esquerda */}
      {menuVisivel && (
        <nav aria-label="Menu do Ferreiro" className="absolute left-2.5 top-0 z-20 flex flex-col items-center sm:left-5">
          {OPCOES.map(({ id, nome, Icone, href }, i) => (
            <div key={id} className="forja-placa flex flex-col items-center" style={{ ['--atraso' as string]: `${i * 0.18}s` }}>
              <Correntes altura={i === 0 ? 20 : 12} />
              {href ? (
                <Link href={href} aria-label={nome} className="botao-kit botao-kit-dourado w-[148px] flex items-center justify-center gap-1.5 px-2 py-1 font-cinzel font-extrabold uppercase text-[11px] leading-tight text-[#2B1D0E]">
                  <Icone className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {nome}
                </Link>
              ) : (
                <div aria-label={`${nome} (em breve)`} aria-disabled="true" className="botao-kit botao-kit-cinza w-[148px] flex flex-col items-center px-2 py-1 font-cinzel font-extrabold uppercase text-[11px] leading-tight text-[#2B2118] opacity-70 cursor-not-allowed">
                  <span className="flex items-center gap-1.5">
                    <Icone className="w-4 h-4 shrink-0" aria-hidden="true" />
                    {nome}
                  </span>
                  <span className="font-[family-name:var(--font-silk)] text-[9px] normal-case">em breve</span>
                </div>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* A caixa de diálogo do ferreiro */}
      {fala && (
        <div role="dialog" aria-label={`${NOME_DO_FERREIRO} fala`} className="absolute inset-x-3 bottom-4 z-30 mx-auto max-w-[480px]">
          <button type="button" onClick={tocarNaCaixa} aria-label="Avançar a conversa" className="caixa-pixel relative block w-full text-left px-3.5 pt-5 pb-3 cursor-pointer">
            <span className="absolute -top-2.5 left-3 bg-[#ED8A0C] px-2 py-1 font-[family-name:var(--font-pixel)] text-[8px] leading-none text-[#1A120B] shadow-[0_0_0_2px_#1A120B]">{NOME_DO_FERREIRO.toUpperCase()}</span>
            <span className={`block min-h-[2.8em] font-cinzel font-bold text-[14px] leading-snug text-[#F5E3B3] ${SOMBRA}`}>
              {linha.slice(0, digitadas)}
              <span aria-hidden="true" className="opacity-0">{linha.slice(digitadas)}</span>
            </span>
            {acabouDeEscrever && <span aria-hidden="true" className="forja-indicador absolute bottom-2 right-3 text-[#ED8A0C] text-xs">▼</span>}
          </button>
          {fala.saudacao && (
            <button type="button" onClick={terminarSaudacao} className="absolute -top-2.5 right-3 z-10 bg-[#1A120B] border border-[#B2A66C] px-2 py-1 font-[family-name:var(--font-pixel)] text-[7px] leading-none uppercase text-[#E2D6B6] cursor-pointer">
              Pular
            </button>
          )}
        </div>
      )}
    </main>
  );
}
