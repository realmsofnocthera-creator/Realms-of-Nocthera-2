'use client';

import React, { useState } from 'react';
import { ARENA_UI } from '@/assets/arenaUi';
import { CampeonatoTela } from '@/components/arena/CampeonatoTela';
import { ListaDaArena, type Aviso, type ReplayPedido } from '@/components/arena/ListaDaArena';
import { ModosDaArena } from '@/components/arena/ModosDaArena';
import { Janela } from '@/components/arena/PecasDaArena';
import { RecompensasDaRanqueada } from '@/components/arena/RecompensasDaRanqueada';
import { ReplayArena } from '@/components/arena/ReplayArena';
import { PalcoPixel, u } from '@/components/pixel/GradePixel';
import { TEXTOS_DA_ARENA as T } from '@/rules/textosDaArenaTela';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
type Vista = 'modos' | 'arena' | 'ranqueada' | 'campeonato' | 'recompensas';

/**
 * Arena (7.5), em pixel art do Yuri: a seleção de modo (Arena, Ranqueada ou Campeonato), a Arena (5 lutas por dia, mais 5 por Diamantes, pódio
 * semanal), a Arena ranqueada (10 ranques, mapa dos ranques e recompensas) e o Campeonato quinzenal (chave automática, prêmios por colocação).
 * Escolher um adversário e lutar contra a ficha atual dele; o replay das últimas 20 lutas. A luta em si (o replay) ainda está no estilo antigo.
 */
export function ArenaScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [vista, setVista] = useState<Vista>('modos');
  const [ranqueRecompensas, setRanqueRecompensas] = useState(0);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [replay, setReplay] = useState<ReplayPedido | null>(null);
  const [regras, setRegras] = useState(false);
  // remonta o painel depois do replay, para recarregar os pontos e o histórico
  const [versao, setVersao] = useState(0);
  const ir = (v: Vista) => {
    setAviso(null);
    setVista(v);
  };

  if (replay) {
    return (
      <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
        <div className="w-full max-w-[520px]">
          <ReplayArena
            combate={replay.combate}
            lados={replay.lados}
            titulo={replay.titulo}
            onFim={() => {
              if (replay.aviso) setAviso({ texto: replay.aviso, erro: false });
              setReplay(null);
              setVersao((v) => v + 1);
            }}
          />
        </div>
      </main>
    );
  }

  if (vista === 'arena' || vista === 'ranqueada') {
    return (
      <ListaDaArena key={`${vista}-${versao}`} modo={vista} tokenFresco={tokenFresco} abrirReplay={setReplay} irPara={ir} aviso={aviso} setAviso={setAviso}
        abrirRecompensas={(i) => { setRanqueRecompensas(i); ir('recompensas'); }} />
    );
  }
  if (vista === 'recompensas') return <RecompensasDaRanqueada ranqueInicial={ranqueRecompensas} aoVoltar={() => ir('ranqueada')} />;
  if (vista === 'campeonato') return <CampeonatoTela key={`campeonato-${versao}`} tokenFresco={tokenFresco} abrirReplay={setReplay} irPara={ir} aviso={aviso} setAviso={setAviso} />;

  return (
    <>
      <ModosDaArena aoEscolher={ir} aoAbrirRegras={() => setRegras(true)} />
      {regras && (
        <PalcoPixel fundo={ARENA_UI.fundoColiseu}>
          <Janela titulo={T.regras} aoFechar={() => setRegras(false)} fechar={T.fechar}>
            {[...T.regrasArena, ...T.regrasRanqueada, T.campeonato.entram].map((t) => <p key={t} style={{ marginBottom: u(5) }}>{t}</p>)}
          </Janela>
        </PalcoPixel>
      )}
    </>
  );
}
