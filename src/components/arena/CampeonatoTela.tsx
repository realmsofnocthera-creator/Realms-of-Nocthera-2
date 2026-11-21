'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ARENA_UI, INSIGNIA_DO_RANQUE, POSICAO } from '@/assets/arenaUi';
import { resolveAvatarSrc } from '@/assets/avatars';
import { PalcoPixel, Peca, Texto, pixel, u, SOMBRA_DO_TEXTO } from '@/components/pixel/GradePixel';
import type { ResultadoCombatePvp } from '@/game/combat';
import { colunasDaChave, contagemCurta, formaDaChave, tempoAte, type ColunaDaChave, type PartidaNaChave } from '@/lib/arenaTela';
import { indiceDoRanque } from '@/rules/arenaRanqueada';
import { faixaPelaRodada, totalDeRodadas, type FaixaDoCampeonato } from '@/rules/campeonato';
import { TEXTOS_DA_ARENA as T } from '@/rules/textosDaArenaTela';
import { TITULO_MAP } from '@/rules/titulos';
import type { LadoNaTela } from '@/server/arena';
import type { EstadoDoCampeonato, LutaNaTela } from '@/server/campeonato';
import type { Aviso, ReplayPedido } from './ListaDaArena';
import { BotaoDeArte, CREME, DOURADO, Janela, Medalhao, SUB, TINTA } from './PecasDaArena';

type Token = () => Promise<string | null>;
const ATUALIZAR_MS = 30_000;
const BOTAO = { normal: ARENA_UI.botao, off: ARENA_UI.botaoOff, press: ARENA_UI.botaoPress };
const LINHA_APAGADA = '#56627a';
const LINHA_ACESA = '#4fd3e8';

async function chamar(tokenFresco: Token, url: string, corpo?: Record<string, unknown>): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(url, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: T.semConexao } };
  }
}

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·');
const dataBr = (dia: string) => dia.split('-').reverse().join('/');
const premioEmTexto = (f: FaixaDoCampeonato) =>
  [`${f.ouro.toLocaleString('pt-BR')} ouro`, `${f.diamantes} Diamantes`, ...Object.entries(f.selos).map(([s, n]) => `${n} ${T.seloNome[s] ?? s}`)].join(' · ');
const tituloDoCampeao = (vitorias: number): 1 | 2 | 3 | 5 => (vitorias >= 5 ? 5 : vitorias >= 3 ? 3 : vitorias === 2 ? 2 : 1);

/** Um cartão da chave (duas linhas: quem enfrenta quem), na escala do layout. */
function Cartao({ p, x, y, escala, aoAbrir }: { p: PartidaNaChave; x: number; y: number; escala: number; aoAbrir: () => void }) {
  const l = 78 * escala;
  const a = 59 * escala;
  const lado = (k: 'a' | 'b', cy: number) => {
    const pessoa = p.luta?.[k];
    const venceu = p.luta?.vencedor === k;
    const perdeu = !!p.luta?.vencedor && !venceu;
    return (
      <>
        {pessoa
          ? <Medalhao src={resolveAvatarSrc(undefined, pessoa.classeId)} cx={x + 14 * escala} cy={y + cy * escala} d={17 * escala} />
          : null}
        <Texto x={x + 24 * escala} y={y + cy * escala} tamanho={Math.max(2.6, 4.8 * escala)} alinhar="left" largura={36 * escala} cor={venceu ? DOURADO : perdeu ? '#8d97ab' : CREME} negrito={venceu}>{pessoa ? pessoa.nome : p.luta ? T.campeonato.passouDireto : ''}</Texto>
      </>
    );
  };
  return (
    <>
      <Peca src={ARENA_UI.partida[p.estado]} p={{ x, y, l, a }} />
      {lado('a', 22)}
      {lado('b', 45)}
      {p.luta && <button type="button" onClick={aoAbrir} aria-label={`${p.luta.a?.nome ?? '—'} × ${p.luta.b?.nome ?? '—'}`} className="absolute cursor-pointer" style={{ left: u(x), top: u(y), width: u(l), height: u(a) }} />}
      {p.estado === 'eu' && <Peca src={p.luta?.vencedor ? ARENA_UI.distintivo.fim : ARENA_UI.distintivo.vivo} p={{ x: x + l - 14 * escala, y: y - 9, l: 22, a: 23 }} />}
    </>
  );
}

/**
 * Campeonato (Arena 7.5): a próxima edição ou a rodada em andamento, a chave (as 4 últimas rodadas, ou as 3 quando a disputa chega às quartas),
 * cada luta com o replay, "Você está na chave", os prêmios por colocação e, para o campeão, a tela do Campeão.
 */
export function CampeonatoTela({ tokenFresco, abrirReplay, irPara, aviso, setAviso }: {
  tokenFresco: Token; abrirReplay: (r: ReplayPedido) => void; irPara: (v: 'modos' | 'arena' | 'ranqueada' | 'campeonato') => void; aviso: Aviso; setAviso: (a: Aviso) => void;
}) {
  const [estado, setEstado] = useState<EstadoDoCampeonato | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [dialogo, setDialogo] = useState<null | 'info' | { rodada: number; nome: string; luta: LutaNaTela }>(null);
  const [baus, setBaus] = useState(false);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [agora, setAgora] = useState(() => new Date());
  const [viuCampeao, setViuCampeao] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, '/api/campeonato');
    if (!r.ok) return setErro(String(r.dados.error ?? T.erroAoCarregar));
    setEstado(r.dados as unknown as EstadoDoCampeonato);
    setErro(null);
  }, [tokenFresco]);
  useEffect(() => {
    void carregar();
  }, [carregar]);
  const emAndamento = estado?.edicao?.estado === 'andamento';
  useEffect(() => {
    if (!emAndamento) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar();
    }, ATUALIZAR_MS);
    return () => window.clearInterval(id);
  }, [carregar, emAndamento]);
  useEffect(() => {
    const id = window.setInterval(() => setAgora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  // a tela do Campeão aparece uma vez por edição
  const dia = estado?.edicao?.dia ?? '';
  useEffect(() => {
    if (!dia) return;
    try {
      setViuCampeao(window.localStorage.getItem(`campeao-visto-${dia}`) === '1');
    } catch {
      /* sem armazenamento: aparece sempre que abrir */
    }
  }, [dia]);

  async function assistir(diaDaEdicao: string, rodada: number, l: LutaNaTela, nomeDaRodada: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, '/api/campeonato', { acao: 'replay', dia: diaDaEdicao, rodada, luta: l.indice });
    setOcupado(false);
    if (!r.ok) return setAviso({ texto: String(r.dados.error ?? T.naoFoiPossivel), erro: true });
    const d = r.dados as unknown as { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela } };
    setDialogo(null);
    abrirReplay({ combate: d.combate, lados: d.lados, modo: 'campeonato', titulo: `${T.abas.campeonato} · ${nomeDaRodada}` });
  }
  async function abrirBau(bau: string) {
    setOcupado(true);
    const r = await chamar(tokenFresco, '/api/arena', { acao: 'abrirBau', bau, carta: escolhas[bau] });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? T.feito), erro: !r.ok });
    setBaus(false);
    await carregar();
  }

  const cabecalho = (
    <>
      <Peca src={ARENA_UI.titulo} p={POSICAO.titulo}>
        <Texto x={100} y={48} tamanho={9.4} caixaAlta largura={150} cor={TINTA}>{T.abas.campeonato}</Texto>
      </Peca>
      <button type="button" onClick={() => irPara('modos')} aria-label={T.voltar} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${ARENA_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
      <button type="button" onClick={() => setDialogo('info')} aria-label={T.regras} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.livro.x), top: u(POSICAO.livro.y), width: u(POSICAO.livro.l), height: u(POSICAO.livro.a), backgroundImage: `url(${ARENA_UI.livro})`, backgroundSize: '100% 100%', ...pixel }} />
    </>
  );

  if (erro || !estado) {
    return (
      <PalcoPixel fundo={ARENA_UI.fundoTorneio}>
        {cabecalho}
        <p role={erro ? 'alert' : 'status'} className="absolute font-cinzel font-bold text-center w-full" style={{ top: u(260), fontSize: u(8), color: erro ? '#FF9A8F' : CREME, textShadow: SOMBRA_DO_TEXTO }}>{erro ?? T.campeonato.carregando}</p>
      </PalcoPixel>
    );
  }

  const e = estado.edicao;
  const entra = estado.meusPontos >= estado.pontosParaEntrar;
  const colunas = e && e.estado !== 'cancelado' ? colunasDaChave(e.rodadas, e.jogadores) : [];
  const total = e ? totalDeRodadas(Math.max(2, e.jogadores)) : 0;
  const final = e?.rodadas[e.rodadas.length - 1]?.lutas[0];
  const euSouCampeao = !!e && e.estado === 'encerrado' && !!final?.minha && !!final.vencedor && e.rodadas.length === total;

  // a tela do Campeão
  if (euSouCampeao && !viuCampeao) {
    const premio = estado.faixas[0];
    const n = tituloDoCampeao(estado.vitorias);
    const tituloNome = TITULO_MAP[estado.titulos.filter((t) => t.vitorias <= estado.vitorias).at(-1)?.titulo ?? '']?.nome ?? T.campeonato.campeaoDe(dataBr(e!.dia));
    const continuar = () => {
      try {
        window.localStorage.setItem(`campeao-visto-${e!.dia}`, '1');
      } catch {
        /* sem armazenamento */
      }
      setViuCampeao(true);
    };
    return (
      <PalcoPixel fundo={ARENA_UI.fundoCampeao}>
        <button type="button" onClick={() => irPara('modos')} aria-label={T.voltar} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${ARENA_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
        <Peca src={ARENA_UI.faixaCampeao} p={{ x: 60, y: 14, l: 240, a: 57 }}>
          <Texto x={120} y={26} tamanho={13} caixaAlta largura={150} cor="#EAF8FF">{T.campeonato.campeao}</Texto>
        </Peca>
        <Peca src={ARENA_UI.tituloDoCampeao(n)} p={{ x: 158, y: 252, l: n === 5 ? 64 : n === 3 ? 48 : 44, a: n === 5 ? 52 : n === 3 ? 47 : 46 }} style={{ transform: 'translateX(-4px)' }} />
        <Texto x={180} y={312} tamanho={7.6} caixaAlta largura={260} cor={DOURADO}>{tituloNome}</Texto>
        <Texto x={180} y={323} tamanho={5} caixaAlta largura={260} cor={CREME} negrito={false}>{T.campeonato.vitorias(estado.vitorias)}</Texto>
        {[
          { ic: ARENA_UI.moeda, l: 16, a: 16, t: `${premio.ouro.toLocaleString('pt-BR')} ${T.ouro}` },
          { ic: ARENA_UI.diamante, l: 18, a: 14, t: `${premio.diamantes} ${T.diamantes}` },
          { ic: ARENA_UI.selo, l: 18, a: 17, t: Object.entries(premio.selos).map(([s, q]) => `${q} ${T.seloNome[s] ?? s}`).join(' · ') },
        ].map((r, k) => (
          <React.Fragment key={k}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.ic} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(150), top: u(435 + k * 16 - r.a / 2), width: u(r.l), height: u(r.a), ...pixel }} />
            <Texto x={172} y={435 + k * 16} tamanho={6.2} alinhar="left" largura={170} cor={CREME}>{r.t}</Texto>
          </React.Fragment>
        ))}
        <Peca src={ARENA_UI.bauCampeao} p={{ x: 14, y: 389, l: 84, a: 59 }} />
        <Texto x={14 + 42} y={456} tamanho={4.6} caixaAlta largura={100} cor={CREME}>{T.campeonato.premiosEscolha}</Texto>
        <BotaoDeArte x={95} y={494} l={170} a={31} src={BOTAO} onClick={continuar} tamanho={10}>{T.campeonato.continuar}</BotaoDeArte>
      </PalcoPixel>
    );
  }

  // a contagem do alto: a próxima edição ou a próxima rodada
  const nomeRodada = e && e.estado === 'andamento' ? e.rodadas[e.rodadas.length - 1]?.nome : '';
  const rodadaEm = e?.proximaRodadaEm ?? null;
  const pequeno = emAndamento ? `${nomeRodada} · em andamento` : `${T.campeonato.proximaEdicao} · ${quando(estado.proxima.inicio)}`;
  const grande = emAndamento && rodadaEm ? `${T.campeonato.proximaRodada} ${contagemCurta(rodadaEm, agora)}` : tempoAte(estado.proxima.inicio, agora);

  const forma = colunas.length === 3 || colunas.length === 4 ? formaDaChave(colunas.length as 3 | 4) : null;
  const larg = forma ? 78 * forma.escala : 0;
  const alt = forma ? 59 * forma.escala : 0;
  const mostrarVoce = !forma || colunas.length === 3;
  const faixaDaPrimeira = colunas[0] ? faixaPelaRodada(colunas[0].rodada, total) : null;
  const jogadoresEmCampo = colunas[0]?.partidas.filter((p) => p.luta && p.luta.vencedor === null && (p.luta.a || p.luta.b)).length ?? 0;

  return (
    <PalcoPixel fundo={ARENA_UI.fundoTorneio}>
      {cabecalho}
      <Peca src={ARENA_UI.contagem} p={POSICAO.contagem}>
        <Texto x={92} y={13} tamanho={4.6} caixaAlta largura={130} cor={SUB} negrito={false}>{pequeno}</Texto>
        <Texto x={92} y={25} tamanho={emAndamento ? 7.6 : 8.4} caixaAlta largura={130} cor={CREME}>{grande}</Texto>
      </Peca>

      {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="absolute font-cinzel font-bold text-center z-20" style={{ left: u(30), width: u(300), top: u(36), fontSize: u(6.6), color: aviso.erro ? '#FF9A8F' : '#B8F0B0', textShadow: SOMBRA_DO_TEXTO, backgroundColor: 'rgba(8,6,12,.82)', padding: `${u(2.5)} ${u(4)}` }}>{aviso.texto}</p>}

      {mostrarVoce && (
        <Peca src={e?.entrei || (!e?.entrei && entra && !emAndamento) ? ARENA_UI.voce : ARENA_UI.voceTrancado} p={POSICAO.voce}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={INSIGNIA_DO_RANQUE(indiceDoRanque(estado.meusPontos), 'p')} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(28), top: u(8), width: u(36), height: 'auto', ...pixel }} />
          <Texto x={150} y={22} tamanho={7} caixaAlta largura={140} cor={CREME}>{e?.entrei || (entra && !emAndamento) ? T.campeonato.voceEstaNaChave : T.campeonato.voceNaoEntra}</Texto>
          <Texto x={150} y={34} tamanho={4.8} caixaAlta largura={140} cor={SUB} negrito={false}>{entra ? T.campeonato.ascendente(estado.meusPontos) : T.campeonato.faltam(estado.pontosParaEntrar - estado.meusPontos)}</Texto>
        </Peca>
      )}

      {/* a chave */}
      {forma && (
        <>
          {colunas.map((c: ColunaDaChave, ci) => {
            const cab = forma.cabecalhos[ci];
            const aceso = c.partidas.some((p) => p.luta && p.luta.vencedor === null) || (ci === colunas.length - 1 && e?.estado === 'encerrado');
            const e1 = forma.escala;
            return (
              <Peca key={c.rodada} src={ARENA_UI.cabecalho(aceso)} p={{ x: cab.x, y: cab.y, l: cab.l, a: (cab.l / 84) * 41 }}>
                <Texto x={cab.l / 2} y={((cab.l / 84) * 41) / 2 + 2} tamanho={e1 === 1 ? 6.2 : 4.6} caixaAlta largura={cab.l - 8} cor={aceso ? DOURADO : CREME}>{c.nome}</Texto>
              </Peca>
            );
          })}
          {/* as linhas entre uma coluna e a seguinte */}
          {colunas.slice(0, -1).map((c, ci) =>
            forma.colunas[ci + 1].map((destino, k) => {
              const p1 = forma.colunas[ci][2 * k];
              const p2 = forma.colunas[ci][2 * k + 1];
              const xFim = p1.x + larg;
              const xMeio = (xFim + destino.x) / 2;
              const y1 = p1.y + alt / 2;
              const y2 = p2.y + alt / 2;
              const yd = destino.y + alt / 2;
              const acesa = !!c.partidas[2 * k]?.luta?.vencedor && !!c.partidas[2 * k + 1]?.luta?.vencedor;
              const cor = acesa ? LINHA_ACESA : LINHA_APAGADA;
              const t = 1.2;
              return (
                <React.Fragment key={`${ci}-${k}`}>
                  <span className="absolute" style={{ left: u(xFim), top: u(y1 - t / 2), width: u(xMeio - xFim), height: u(t), backgroundColor: cor }} />
                  <span className="absolute" style={{ left: u(xFim), top: u(y2 - t / 2), width: u(xMeio - xFim), height: u(t), backgroundColor: cor }} />
                  <span className="absolute" style={{ left: u(xMeio - t / 2), top: u(y1), width: u(t), height: u(y2 - y1), backgroundColor: cor }} />
                  <span className="absolute" style={{ left: u(xMeio), top: u(yd - t / 2), width: u(destino.x - xMeio), height: u(t), backgroundColor: cor }} />
                </React.Fragment>
              );
            })
          )}
          {colunas.map((c, ci) => c.partidas.map((p, k) => (
            <Cartao key={`${ci}-${k}`} p={p} x={forma.colunas[ci][k].x} y={forma.colunas[ci][k].y} escala={forma.escala} aoAbrir={() => p.luta && setDialogo({ rodada: c.rodada, nome: c.nome, luta: p.luta })} />
          )))}
          {/* embaixo: quantos jogadores e o que se ganha ao cair ali; ou as lutas automáticas e o prêmio do campeão */}
          {colunas.length === 4 ? (
            <>
              <Texto x={180} y={442} tamanho={4.8} caixaAlta largura={330} cor={SUB} negrito={false}>{T.campeonato.jogadoresRodada(e!.jogadores, jogadoresEmCampo)}</Texto>
              {faixaDaPrimeira && <Texto x={180} y={460} tamanho={4.8} caixaAlta largura={330} cor={DOURADO} negrito={false}>{`Cai aqui: ${premioEmTexto(faixaDaPrimeira)}`}</Texto>}
            </>
          ) : (
            <>
              <Texto x={180} y={465} tamanho={4.8} caixaAlta largura={330} cor={SUB} negrito={false}>{T.campeonato.lutasAutomaticas}</Texto>
              <Texto x={180} y={483} tamanho={4.8} caixaAlta largura={330} cor={DOURADO} negrito={false}>{T.campeonato.campeaoLeva}</Texto>
            </>
          )}
        </>
      )}

      {/* sem chave (ainda não houve, cancelado ou só a próxima edição) */}
      {!forma && (
        <>
          <Texto x={180} y={190} tamanho={6.4} caixaAlta largura={310} cor={CREME}>{!e ? T.campeonato.semEdicao : e.estado === 'cancelado' ? `${T.campeonato.nao}: ${T.campeonato.cancelado(e.jogadores)}` : ''}</Texto>
          <p className="absolute font-cinzel text-center" style={{ left: u(30), width: u(300), top: u(210), fontSize: u(6), lineHeight: 1.5, color: SUB, textShadow: SOMBRA_DO_TEXTO }}>{T.campeonato.entram}</p>
          {estado.vitorias > 0 && <Texto x={180} y={300} tamanho={6.4} caixaAlta largura={300} cor={DOURADO}>{T.campeonato.vitorias(estado.vitorias)}</Texto>}
        </>
      )}
      {e?.campeao && forma && <Texto x={180} y={430} tamanho={6.4} caixaAlta largura={330} cor={DOURADO}>{`${T.campeonato.campeao} ${e.campeao}`}</Texto>}
      {estado.baus.length > 0 && <BotaoDeArte x={95} y={504} l={170} a={26} src={BOTAO} onClick={() => setBaus(true)} tamanho={6.4}>{T.campeonato.premiosEscolha}</BotaoDeArte>}

      {dialogo === 'info' && (
        <Janela titulo={T.campeonato.premiosETitulos} aoFechar={() => setDialogo(null)} fechar={T.fechar}>
          <p style={{ marginBottom: u(4) }}>{T.campeonato.entram}</p>
          <ul>
            {estado.faixas.map((f) => <li key={f.id} style={{ marginBottom: u(1.5) }}><b style={{ color: DOURADO }}>{f.nome}</b>: {premioEmTexto(f)}{f.bauMitico ? ' · baú de escolha mítico' : ''}</li>)}
          </ul>
          <p style={{ marginTop: u(4) }}>{estado.titulos.map((t) => `${TITULO_MAP[t.titulo]?.nome ?? t.titulo} (${t.vitorias})`).join(' · ')}</p>
          <p style={{ marginTop: u(4), color: SUB }}>{T.campeonato.empate}</p>
        </Janela>
      )}
      {dialogo && dialogo !== 'info' && e && (
        <Janela titulo={dialogo.nome} aoFechar={() => setDialogo(null)} fechar={T.fechar}>
          {[dialogo.luta.a, dialogo.luta.b].map((p, k) => (
            <p key={k} style={{ marginBottom: u(3) }}>
              <b style={{ color: dialogo.luta.vencedor === (k === 0 ? 'a' : 'b') ? DOURADO : CREME }}>{p?.nome ?? T.campeonato.passouDireto}</b>
              {p ? <span style={{ color: SUB }}> · {T.pontos(p.pontos)}{dialogo.luta.vidaA !== undefined ? ` · ${k === 0 ? dialogo.luta.vidaA : dialogo.luta.vidaB}%` : ''}</span> : null}
            </p>
          ))}
          {dialogo.luta.temReplay && (
            <button type="button" disabled={ocupado} onClick={() => void assistir(e.dia, dialogo.rodada, dialogo.luta, dialogo.nome)} className="font-cinzel font-black uppercase disabled:opacity-50" style={{ marginTop: u(4), fontSize: u(7), color: TINTA, backgroundColor: DOURADO, padding: `${u(2)} ${u(8)}` }}>{T.assistir}</button>
          )}
        </Janela>
      )}
      {baus && (
        <Janela titulo={T.campeonato.premiosEscolha} aoFechar={() => setBaus(false)} fechar={T.fechar}>
          {estado.baus.map((b) => (
            <div key={b.id} style={{ marginBottom: u(8) }}>
              <p style={{ color: SUB, marginBottom: u(3) }}>{b.origem}</p>
              <select value={escolhas[b.id] ?? ''} onChange={(ev) => setEscolhas((x) => ({ ...x, [b.id]: ev.target.value }))} aria-label={T.cartaOuEmblema} className="w-full" style={{ fontSize: u(7), padding: u(2), backgroundColor: '#221C16', border: `${u(0.8)} solid #4A3F2A`, color: CREME }}>
                <option value="">{T.escolha}</option>
                {estado.opcoesMiticas.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              <button type="button" disabled={ocupado || !escolhas[b.id]} onClick={() => void abrirBau(b.id)} className="font-cinzel font-black uppercase disabled:opacity-50" style={{ marginTop: u(4), fontSize: u(7), color: TINTA, backgroundColor: DOURADO, padding: `${u(2)} ${u(8)}` }}>{T.abrir}</button>
            </div>
          ))}
        </Janela>
      )}
    </PalcoPixel>
  );
}
