'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import type { CharacterDocument } from '@/server/characterService';
import type { ResultadoCombate } from '@/game/combat';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { LIVRO_DA_CACADA } from '@/assets/cacadaLivroUi';
import { LIVRO_DAS_PROVACOES as P } from '@/assets/provacoesLivroUi';
import { FICHA_UI } from '@/assets/personagemUi';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DA_CACADA as T } from '@/rules/textosDaCacada';
import { CombateCacada } from './CombateCacada';
import { TINTA } from './JanelaDaCacada';
import { espoliosDaLuta } from './espolios';
import { ICONE_MONSTRO } from '@/lib/cacadaArte';
import { resolveAvatarSrc } from '@/assets/avatars';
import { XP_TABLE } from '@/rules/xpTable';
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
  | { tipo: 'combate'; lugar: LugarNoLivro; antes: CharacterDocument; resposta: RespostaCacadaTela; n: number };

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

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
        setFase((f) => ({ tipo: 'combate', lugar: onde, antes: character, resposta: data as RespostaCacadaTela, n: (f.tipo === 'combate' ? f.n : 0) + 1 }));
      } catch (e) {
        setErro(e instanceof Error ? e.message : T.erroAoIniciar);
        setFase({ tipo: 'livro' });
      } finally {
        setOcupado(false);
      }
    },
    [ocupado, tokenFresco, character]
  );

  // a luta acabou: o personagem já atualiza (XP, ouro, mochila); a tela de vitória/derrota fica na luta, com os botões
  const terminarCombate = useCallback(() => {
    if (fase.tipo === 'combate') onCharacterChange(fase.resposta.character);
  }, [fase, onCharacterChange]);

  if (fase.tipo === 'combate') {
    const { resposta, antes, lugar: onde } = fase;
    const monstro = MONSTROS_CACADA_MAP[resposta.cacada.monstroId];
    const venceu = resposta.resultado.vencedor === 'personagem';
    const xpDoNivel = XP_TABLE[resposta.character.nivel];
    const chave = resposta.cacada.chaveVencida;
    return (
      <CombateCacada
        key={fase.n}
        resultado={resposta.resultado}
        personagem={antes}
        monstro={monstro}
        titulo={`${T.titulo} · ${onde.estrela}★ ${monstro.nome}`}
        estrela={onde.estrela}
        onFim={terminarCombate}
        telaDeFim={{
          retrato: venceu ? ICONE_MONSTRO[monstro.id] ?? resolveAvatarSrc(antes.avatarId, antes.classeId) : resolveAvatarSrc(antes.avatarId, antes.classeId),
          xp: { ganho: resposta.cacada.xpGanho, nivelNovo: resposta.levelUps > 0 ? resposta.character.nivel : undefined, progresso: xpDoNivel ? resposta.character.xpAtual / xpDoNivel : 1 },
          ouro: resposta.character.ouro - antes.ouro,
          espolios: venceu ? espoliosDaLuta(resposta.cacada.drops) : [],
          aviso: chave ? (chave < 9 ? textoDaFicha(T.chaveVencidaProxima, { n: chave + 1 }) : T.chaveVencida) : undefined,
          voltar: { rotulo: T.voltarAoLivro, acao: () => setFase({ tipo: 'livro' }) },
          repetir: { rotulo: venceu ? T.cacarDeNovo : T.tentarNovamente, acao: () => void cacar(onde), desligado: ocupado },
        }}
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

        <div className="flex-1 min-h-0 flex items-center overflow-y-auto overflow-x-hidden">
          <LivroDaCacada personagem={character} lugar={lugar} aoMudarLugar={setLugar} ocupado={ocupado} aoCacar={cacar} className="pb-[4cqw]" />
        </div>
      </div>

    </main>
  );
}
