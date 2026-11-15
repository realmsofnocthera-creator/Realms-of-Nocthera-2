'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import type { CharacterDocument } from '@/server/characterService';
import type { ResultadoCombate } from '@/game/combat';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { dropsTela } from '@/lib/cacadaTela';
import { LIVRO_DA_CACADA } from '@/assets/cacadaLivroUi';
import { LIVRO_DAS_PROVACOES as P } from '@/assets/provacoesLivroUi';
import { FICHA_UI } from '@/assets/personagemUi';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DA_CACADA as T } from '@/rules/textosDaCacada';
import { CombateCacada } from './CombateCacada';
import { BotaoPixel, JanelaDaCacada, TINTA } from './JanelaDaCacada';
import { LivroDaCacada, lugarInicial, type LugarNoLivro } from './LivroDaCacada';

interface CacadaScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

interface RespostaCacadaTela {
  resultado: ResultadoCombate;
  character: CharacterDocument;
  levelUps: number;
  mensagens: string[];
  cacada: { monstroId: string; estrela: number; drops: { materialId: string; quantidade: number }[]; xpBase: number; xpGanho: number; chaveVencida?: number };
}

type Fase =
  | { tipo: 'livro' }
  | { tipo: 'combate'; lugar: LugarNoLivro; antes: CharacterDocument; resposta: RespostaCacadaTela }
  | { tipo: 'resultado'; lugar: LugarNoLivro; antes: CharacterDocument; resposta: RespostaCacadaTela };

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const estrelas = (n: number) => '★'.repeat(n);

/**
 * Provação da Caçada, em forma de livro (arte do Yuri): a mesa de madeira ao fundo e o livro vermelho no centro, com os
 * monstros à esquerda e a ficha do escolhido à direita. Toda regra (nível, monstro-chave, XP, drops) é conferida no
 * servidor; a tela só mostra. A luta continua na arena e o resultado aparece numa janela de pergaminho.
 */
export function CacadaScreen({ character, onCharacterChange, tokenFresco }: CacadaScreenProps) {
  const [fase, setFase] = useState<Fase>({ tipo: 'livro' });
  const [lugar, setLugar] = useState<LugarNoLivro>(lugarInicial);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const cacar = useCallback(
    async (onde: LugarNoLivro) => {
      if (ocupado) return;
      setOcupado(true);
      setErro(null);
      try {
        const token = await tokenFresco();
        if (!token) throw new Error(T.semConexao);
        const combateId = `cac-${crypto.randomUUID()}`;
        const res = await fetch('/api/cacada/iniciar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ monstroId: onde.monstroId, combateId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || T.erroAoIniciar);
        setLugar(onde);
        setFase({ tipo: 'combate', lugar: onde, antes: character, resposta: data as RespostaCacadaTela });
      } catch (e) {
        setErro(e instanceof Error ? e.message : T.erroAoIniciar);
      } finally {
        setOcupado(false);
      }
    },
    [ocupado, tokenFresco, character]
  );

  const terminarCombate = useCallback(() => {
    setFase((f) => {
      if (f.tipo !== 'combate') return f;
      onCharacterChange(f.resposta.character);
      return { ...f, tipo: 'resultado' };
    });
  }, [onCharacterChange]);

  if (fase.tipo === 'combate') {
    const monstro = MONSTROS_CACADA_MAP[fase.resposta.cacada.monstroId];
    return (
      <CombateCacada
        resultado={fase.resposta.resultado}
        personagem={fase.antes}
        monstro={monstro}
        titulo={`${T.titulo} · ${fase.lugar.estrela}★ ${monstro.nome}`}
        estrela={fase.lugar.estrela}
        onFim={terminarCombate}
      />
    );
  }

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden select-none bg-[#1A0F0A] text-[#F5F3E0]">
      {/* a mesa de madeira (arte do Yuri), cobrindo a tela inteira */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LIVRO_DA_CACADA.mesa} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      <div className="forja-palco !justify-start gap-[1.6cqw] pt-[max(1.4cqw,env(safe-area-inset-top))] pb-[max(1.6cqw,env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-[2cqw] px-[2.4cqw] shrink-0">
          <Link href="/provacoes" aria-label={T.voltar} className="relative block w-[8cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FICHA_UI.voltar} alt="" aria-hidden="true" draggable={false} className="block w-full h-auto pointer-events-none" style={pixel} />
          </Link>
          <div className="relative w-[50cqw] shrink-0" style={{ aspectRatio: '132 / 30' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P.pergaminho} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
            <h1 className="absolute inset-0 flex items-center justify-center pt-[0.6cqw] font-cinzel font-black uppercase tracking-widest text-[4cqw] leading-none" style={{ color: TINTA }}>{T.titulo}</h1>
          </div>
          <div className="relative ml-auto w-[27cqw] shrink-0" style={{ aspectRatio: '64 / 22' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={P.etiqueta} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
            <span className="absolute inset-y-0 left-[12%] right-[12%] flex items-center justify-center pt-[0.4cqw] font-cinzel font-extrabold text-[2cqw] leading-none whitespace-nowrap" style={{ color: TINTA }}>
              <span className="truncate">{textoDaFicha(T.jogador, { nome: character.nome, nivel: character.nivel })}</span>
            </span>
          </div>
        </header>

        {erro && (
          <div role="alert" className="mx-[3cqw] px-[2cqw] py-[1.2cqw] text-[2.8cqw] font-cinzel font-bold bg-[#8E1F1A] text-[#FFE9B0] border-[0.4cqw] border-[#2A0F0A]">{erro}</div>
        )}

        <div className="flex-1 min-h-0 flex items-center px-[2cqw] overflow-y-auto">
          <LivroDaCacada personagem={character} lugar={lugar} aoMudarLugar={setLugar} ocupado={ocupado} aoCacar={cacar} className="pb-[4cqw]" />
        </div>
      </div>

      {fase.tipo === 'resultado' && (() => {
        const { resposta, antes, lugar: onde } = fase;
        const venceu = resposta.resultado.vencedor === 'personagem';
        const monstro = MONSTROS_CACADA_MAP[resposta.cacada.monstroId];
        const drops = dropsTela(resposta.cacada.drops.map((d) => d.materialId));
        const ouro = resposta.character.ouro - antes.ouro;
        return (
          <>
            <JanelaDaCacada titulo={venceu ? T.concluida : T.derrotado}>
              <section aria-label={T.resultado} className="flex flex-col gap-[2cqw] font-cinzel font-bold text-[3.2cqw] text-center">
                <div>{monstro.nome} · {estrelas(resposta.cacada.estrela)}</div>
                <div className="flex justify-center gap-[4cqw] font-black">
                  <span>{resposta.cacada.xpGanho < resposta.cacada.xpBase && venceu ? textoDaFicha(T.xpDe, { n: resposta.cacada.xpGanho, base: resposta.cacada.xpBase }) : textoDaFicha(T.xp, { n: resposta.cacada.xpGanho })}</span>
                  <span>{textoDaFicha(T.ouro, { n: ouro >= 0 ? `+${ouro}` : ouro })}</span>
                </div>
                {resposta.levelUps > 0 && <div className="font-black text-[#2E6B2E]">{textoDaFicha(T.subiuNivel, { n: resposta.character.nivel })}</div>}
                {resposta.cacada.chaveVencida && (
                  <div className="font-black text-[#8E5A00]">
                    {resposta.cacada.chaveVencida < 9 ? textoDaFicha(T.chaveVencidaProxima, { n: resposta.cacada.chaveVencida + 1 }) : T.chaveVencida}
                  </div>
                )}
                {venceu && drops.length > 0 && (
                  <div className="text-left">
                    <div className="font-black uppercase text-[2.8cqw] opacity-70">{T.materiais}</div>
                    <ul>
                      {drops.map((d) => (
                        <li key={d.id} className="flex justify-between gap-[2cqw]"><span>{d.nome}</span><span className="opacity-80">{d.raridadeNome}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-center gap-[3cqw] pt-[1cqw]">
                  <BotaoPixel aoClicar={() => setFase({ tipo: 'livro' })}>{T.voltarAoLivro}</BotaoPixel>
                  <BotaoPixel destaque desligado={ocupado} aoClicar={() => { setFase({ tipo: 'livro' }); void cacar(onde); }}>{T.cacarDeNovo}</BotaoPixel>
                </div>
                <Link href="/mochila" className="underline text-[2.8cqw]">{T.verMochila}</Link>
              </section>
            </JanelaDaCacada>
          </>
        );
      })()}
    </main>
  );
}
