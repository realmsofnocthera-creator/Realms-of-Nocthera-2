'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CombateCacada } from '@/components/cacada/CombateCacada';
import { resolveAvatarSrc } from '@/assets/avatars';
import { ICONE_MONSTRO } from '@/lib/cacadaArte';
import { auth } from '@/lib/firebase';
import { definirMusica } from '@/lib/audio/motor';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { XP_TABLE } from '@/rules/xpTable';
import { TEXTOS_DA_INTRO as T } from '@/rules/textosDaIntro';
import type { RespostaDaIntro } from '@/server/intro';
import type { CharacterDocument } from '@/server/characterService';

export const VIDEO_DA_INTRO = '/videos/intro/intro-vertical.mp4';

type Fase = 'video' | 'carregando' | 'lobo' | 'criatura' | 'erro';

/**
 * A introdução, logo depois de criar o personagem: o vídeo; a luta contra o lobo (vitória garantida, o XP leva ao nível 2); a criatura de 9★ que
 * derrota o herói (cena roteirizada); e o Hub, onde o tutorial começa. As duas lutas vêm prontas do servidor (`/api/intro`), que grava o nível 2 uma vez.
 */
export function IntroDoLobo({ personagem }: { personagem: CharacterDocument }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>('video');
  const [resposta, setResposta] = useState<RespostaDaIntro | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [travado, setTravado] = useState(false);
  const [podePular, setPodePular] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const irAoHub = useCallback(() => router.replace('/hub'), [router]);

  // o vídeo tem som próprio: sem música do jogo por cima
  useEffect(() => {
    definirMusica('intro:video', null);
  }, []);

  const buscarLutas = useCallback(async () => {
    setFase('carregando');
    setErro(null);
    try {
      const token = (await auth.currentUser?.getIdToken()) ?? '';
      const res = await fetch('/api/intro', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const dados = (await res.json().catch(() => ({}))) as Partial<RespostaDaIntro> & { error?: string };
      if (res.status === 409) return irAoHub(); // já viveu a introdução
      if (!res.ok || !dados.vitoria) throw new Error(dados.error || T.erro);
      setResposta(dados as RespostaDaIntro);
      setFase('lobo');
    } catch (e) {
      setErro(e instanceof Error ? e.message : T.erro);
      setFase('erro');
    }
  }, [irAoHub]);

  // o botão "Pular" só aparece depois de uns segundos
  useEffect(() => {
    const t = window.setTimeout(() => setPodePular(true), 4000);
    return () => window.clearTimeout(t);
  }, []);

  const comecar = useCallback(() => {
    const v = video.current;
    if (!v) return;
    setTravado(false);
    void v.play().catch(() => setTravado(true));
  }, []);
  useEffect(() => {
    comecar();
  }, [comecar]);

  if (fase === 'lobo' || fase === 'criatura') {
    if (!resposta) return null;
    const lobo = MONSTROS_CACADA_MAP[resposta.loboId];
    const criatura = MONSTROS_CACADA_MAP[resposta.criaturaId];
    const antes: CharacterDocument = { ...resposta.character, nivel: 1, xpAtual: 0, pontosDisponiveis: resposta.character.pontosDisponiveis - 3 };
    const retratoDoHeroi = resolveAvatarSrc(resposta.character.avatarId, resposta.character.classeId);
    if (fase === 'lobo') {
      return (
        <CombateCacada
          key="lobo"
          resultado={resposta.vitoria}
          personagem={antes}
          monstro={lobo}
          titulo={`${T.titulo} · ${lobo.nome}`}
          estrela={1}
          onFim={() => undefined}
          telaDeFim={{
            retrato: ICONE_MONSTRO[lobo.id] ?? retratoDoHeroi,
            xp: { ganho: resposta.xpGanho, nivelNovo: 2, progresso: resposta.character.xpAtual / (XP_TABLE[2] || 1) },
            ouro: 0,
            espolios: [],
            aviso: T.subiuDeNivel,
            voltar: { rotulo: T.continuar, acao: () => setFase('criatura') },
          }}
        />
      );
    }
    return (
      <CombateCacada
        key="criatura"
        resultado={resposta.derrota}
        personagem={resposta.character}
        monstro={criatura}
        titulo={`${T.titulo} · ${criatura.nome}`}
        estrela={9}
        semAbertura
        onFim={() => undefined}
        telaDeFim={{
          retrato: retratoDoHeroi,
          ouro: 0,
          espolios: [],
          aviso: T.aviso9Estrelas,
          voltar: { rotulo: T.irAoHub, acao: irAoHub },
        }}
      />
    );
  }

  return (
    <main className="fixed inset-0 bg-black text-[#F5F3E0] flex items-center justify-center select-none" data-sem-som>
      <video
        ref={video}
        src={VIDEO_DA_INTRO}
        playsInline
        preload="auto"
        onEnded={() => void buscarLutas()}
        onError={() => void buscarLutas()}
        className="h-full w-full object-contain"
        aria-label={T.videoRotulo}
      />
      {fase === 'video' && travado && (
        <button type="button" onClick={comecar} className="absolute inset-0 flex items-center justify-center bg-black/70 font-cinzel font-black uppercase tracking-widest text-lg text-[#F3D58A] cursor-pointer">
          {T.tocarParaComecar}
        </button>
      )}
      {fase === 'video' && podePular && !travado && (
        <button type="button" onClick={() => { video.current?.pause(); void buscarLutas(); }} className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] px-3 py-1.5 border border-[#C8A656]/70 bg-black/55 font-cinzel text-[11px] font-bold uppercase tracking-wider text-[#F3D58A] cursor-pointer">
          {T.pular}
        </button>
      )}
      {fase === 'carregando' && <p role="status" className="absolute inset-0 flex items-center justify-center bg-black font-cinzel text-sm tracking-widest uppercase text-[#C8A656]">{T.preparando}</p>}
      {fase === 'erro' && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center font-cinzel">
          <p className="text-sm text-[#E2D6B6]">{erro}</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => void buscarLutas()} className="px-4 py-2 border border-[#C8A656] text-[#F3D58A] font-bold uppercase text-xs cursor-pointer">{T.tentarDeNovo}</button>
            <button type="button" onClick={irAoHub} className="px-4 py-2 border border-[#6a5a38] text-[#B8A98A] font-bold uppercase text-xs cursor-pointer">{T.irAoHub}</button>
          </div>
        </div>
      )}
      <span className="sr-only">{personagem.nome}</span>
    </main>
  );
}
