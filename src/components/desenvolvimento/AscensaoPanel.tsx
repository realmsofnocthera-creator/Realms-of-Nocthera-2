'use client';

import React, { useState } from 'react';
import type { CharacterDocument } from '@/server/characterService';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { EMBLEMA_DA_ASCENSAO } from '@/assets/reforcoUi';
import { acaoDaAscensao, habilidadesDoEspaco, linhaDaAscensao, type PassoDaLinha } from '@/lib/progressaoHabilidadeTela';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import { BotaoDoKit, PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';
import { fmt, useAcaoDesenvolvimento } from './progressaoComum';

interface AscensaoPanelProps {
  character: CharacterDocument;
  idToken: string | null;
  onCharacterChange: (character: CharacterDocument) => void;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** O ícone dos fragmentos de ascensão: o que veio para a Mochila (o ícone de sempre desse saldo). */
const iconeFragmento = (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={ICONES_DE_SALDO.fragmentosAscensao} alt="" aria-hidden="true" draggable={false} className="w-[4.4cqw] h-[4.4cqw] object-contain shrink-0 pointer-events-none" style={pixel} />
);

/**
 * Ascensão de Habilidade (2.2.1, botão "Avanço de Habilidade") em pixel: A1 a A10, 1 fragmento de ascensão por passo;
 * libera com o Reforço no nível 30. Cada passo leva uma habilidade (classe e subclasse no mesmo espaço) ao nível 2 (+10%)
 * ou 3 (+20%). Os textos saem de `textosDaFicha.ts`.
 */
export function AscensaoPanel({ character, idToken, onCharacterChange, className = '' }: AscensaoPanelProps) {
  const t = TEXTOS_DA_FICHA.ascensao;
  const linha = linhaDaAscensao(character);
  const acao = acaoDaAscensao(character);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const { ocupado, feedback, chamar } = useAcaoDesenvolvimento(idToken, onCharacterChange);

  const atual = selecionado ?? acao.ascensao ?? 10;
  const passo = linha.find((p) => p.ascensao === atual) as PassoDaLinha;
  const nomes = habilidadesDoEspaco(character, passo.espaco);
  const estadoEmTexto = (p: PassoDaLinha) => (p.estado === 'comprado' ? t.comprado : p.estado === 'proximo' ? t.proximo : t.bloqueado);

  const Fileira = ({ passos, titulo }: { passos: PassoDaLinha[]; titulo: string }) => (
    <div className="flex flex-col gap-[1cqw]">
      <span className="font-cinzel font-bold uppercase tracking-wider text-[1.9cqw] leading-[1.4] text-[#9CC4E0]">{titulo}</span>
      <div className="flex items-center" role="tablist" aria-label={titulo}>
        {passos.map((p, i) => {
          const comprado = p.estado === 'comprado';
          const proximo = p.estado === 'proximo';
          return (
            <React.Fragment key={p.ascensao}>
              {i > 0 && <div aria-hidden="true" className={`flex-1 h-[0.8cqw] ${passos[i - 1].estado === 'comprado' ? 'bg-[#EDB44C]' : 'bg-[#2B3F5C]'}`} />}
              <button
                type="button"
                role="tab"
                aria-selected={p.ascensao === atual}
                aria-label={textoDaFicha(t.passoAria, { n: p.ascensao, rotulo: p.rotulo, nivel: p.nivelHabilidade, estado: estadoEmTexto(p) })}
                onClick={() => setSelecionado(p.ascensao)}
                className={`relative shrink-0 w-[11cqw] font-cinzel font-black text-[2.4cqw] leading-[1.4] text-center cursor-pointer active:translate-y-px ${comprado ? 'text-[#0A1A22]' : proximo ? 'text-[#EDB44C]' : 'text-[#7C8AA0]'} ${proximo && acao.habilitada ? 'animate-pulse' : ''}`}
                style={{ borderStyle: 'solid', borderWidth: '2cqw 1.4cqw', borderImage: `url(${comprado ? KIT_DA_FORJA.abaAtiva : KIT_DA_FORJA.aba}) 20 24 fill / 2cqw 1.4cqw stretch`, filter: p.ascensao === atual ? 'drop-shadow(0 0 1.4cqw rgba(255,180,60,0.9))' : undefined, ...pixel }}
              >
                A{p.ascensao}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col gap-[1.8cqw] w-full select-none ${className}`}>
      {feedback && <p role="alert" className={`font-cinzel font-bold text-[2.4cqw] leading-snug text-center ${feedback.type === 'success' ? 'text-[#9BE3A0]' : 'text-[#FFB4B4]'}`}>{feedback.message}</p>}

      {/* o saldo de fragmentos de ascensão */}
      <PainelDaForja borda="1.6cqw" role="group" aria-label={`${t.fragmentos}: ${character.fragmentosAscensao ?? 0}`} title={t.fragmentos} className="flex items-center justify-center gap-[1cqw] py-[0.4cqw]">
        {iconeFragmento}
        <span className="font-cinzel font-black text-[2.6cqw] leading-[1.4] tabular-nums text-[#F5F3E0]">{fmt(character.fragmentosAscensao ?? 0)}</span>
        <span className="font-cinzel text-[2cqw] leading-[1.4] text-[#9CC4E0]">{t.fragmentos}</span>
      </PainelDaForja>

      {/* o cabeçalho: o emblema da estrela com asas, o nome e o passo atual */}
      <PainelDaForja borda="2cqw" className="flex gap-[1.8cqw] items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={EMBLEMA_DA_ASCENSAO} alt="" aria-hidden="true" draggable={false} className="w-[13cqw] h-[13cqw] shrink-0 pointer-events-none" style={pixel} />
        <span className="flex-1 font-cinzel font-black text-[3cqw] leading-[1.35] text-[#F5F3E0]" style={{ textShadow: CONTORNO_PIXEL }}>{t.titulo}</span>
        <span className="shrink-0 font-cinzel font-bold text-[2.2cqw] leading-[1.4] px-[1.2cqw] bg-[#05070D]/80 border border-[#B8862B] text-[#EDB44C]">{textoDaFicha(t.nivel, { n: character.ascensaoHabilidade ?? 0 })}</span>
      </PainelDaForja>

      {/* as duas fileiras de passos */}
      <div className="flex flex-col gap-[2cqw] border border-[#2B3F5C] bg-[#080C16]/70 px-[1.6cqw] py-[1.8cqw]">
        <Fileira passos={linha.slice(0, 5)} titulo={t.fileiraNivel2} />
        <Fileira passos={linha.slice(5)} titulo={t.fileiraNivel3} />
      </div>

      {/* o que o passo escolhido faz */}
      <PainelDaForja borda="2cqw" className="flex flex-col gap-[0.8cqw]">
        <span className="flex items-center gap-[1cqw] font-cinzel font-bold text-[2.3cqw] leading-[1.4] text-[#EDB44C]">
          {passo.estado !== 'proximo' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={passo.estado === 'comprado' ? KIT_DA_FORJA.ok : KIT_DA_FORJA.proibido} alt="" aria-hidden="true" draggable={false} className="w-[3.4cqw] h-[3.4cqw] shrink-0 pointer-events-none" style={pixel} />
          )}
          {textoDaFicha(t.detalhe, { n: passo.ascensao, rotulo: passo.rotulo, nivel: passo.nivelHabilidade })}
        </span>
        <span className="font-cinzel text-[2.2cqw] leading-snug text-[#E9DDC0]">
          {textoDaFicha(t.efeito, { bonus: passo.bonus })} <b className="text-[#F5F3E0]">{nomes.join(' e ')}</b>.
        </span>
      </PainelDaForja>

      {/* o botão de ascender e o custo */}
      {acao.ascensao !== null && (
        <div className="flex flex-col items-stretch gap-[0.8cqw]">
          <BotaoDoKit
            onClick={async () => {
              const ok = await chamar('/api/character/habilidades/ascender', textoDaFicha(t.sucesso, { n: acao.ascensao as number }));
              if (ok) setSelecionado(null);
            }}
            disabled={!acao.habilitada || ocupado}
            className="w-full !text-[2.3cqw]"
          >
            {ocupado ? t.processando : textoDaFicha(t.ascender, { n: acao.ascensao })}
          </BotaoDoKit>
          <div className="flex items-center justify-center">
            <span aria-label={`${t.fragmentos}: ${acao.custo}`} className={`inline-flex items-center gap-[0.6cqw] font-cinzel font-bold text-[2.1cqw] leading-[1.4] ${acao.aviso === 'Fragmentos de ascensão insuficientes' ? 'text-[#F5A6A6]' : 'text-[#E9DDC0]'}`}>
              {iconeFragmento}
              {acao.custo}
            </span>
          </div>
        </div>
      )}
      {acao.aviso && <span className="font-cinzel font-bold text-[2cqw] leading-snug text-center text-[#9CC4E0]">{acao.aviso}</span>}
    </div>
  );
}
