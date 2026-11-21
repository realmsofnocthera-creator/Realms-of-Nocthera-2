'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ARENA_UI, DEGRAUS_DOS_RANQUES, INSIGNIA_DO_RANQUE, POSICAO } from '@/assets/arenaUi';
import { resolveAvatarSrc } from '@/assets/avatars';
import { PalcoPixel, Peca, Texto, pixel, u, SOMBRA_DO_TEXTO } from '@/components/pixel/GradePixel';
import type { ResultadoCombatePvp } from '@/game/combat';
import { fichasDaArena, progressoDoRanque, tempoAte, tipoDoCartao } from '@/lib/arenaTela';
import { PRECO_DA_LUTA_EM_DIAMANTES, type ModoDaArena } from '@/rules/arena';
import { indiceDoRanque, RANQUES } from '@/rules/arenaRanqueada';
import { CLASSES_MAP } from '@/rules/classes';
import { TEXTOS_DA_ARENA as T } from '@/rules/textosDaArenaTela';
import type { EstadoDaArena, LadoNaTela, ResultadoDaLuta } from '@/server/arena';
import { BotaoDeArte, CREME, DOURADO, Fatiada, Janela, Medalhao, SUB, TINTA } from './PecasDaArena';

type Token = () => Promise<string | null>;
export type Aviso = { texto: string; erro: boolean } | null;
export type ReplayPedido = { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela }; titulo: string; aviso?: string };

async function chamar(tokenFresco: Token, modo: ModoDaArena, corpo?: Record<string, unknown>): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(corpo ? '/api/arena' : `/api/arena?modo=${modo}`, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify({ ...corpo, modo }) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: T.semConexao } };
  }
}

const classe = (id: string) => CLASSES_MAP[id]?.nome ?? id;
const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit' });
const BOTAO = { normal: ARENA_UI.botao, off: ARENA_UI.botaoOff, press: ARENA_UI.botaoPress };

type Dialogo = null | 'regras' | 'lutas' | 'podio' | 'baus';
const ABAS: readonly { id: 'arena' | 'ranqueada' | 'campeonato'; n: 1 | 2 | 3 }[] = [{ id: 'arena', n: 1 }, { id: 'ranqueada', n: 2 }, { id: 'campeonato', n: 3 }];

/**
 * A Arena (modo `arena`, com as abas) e a Arena ranqueada (modo `ranqueada`, com o mapa dos 10 ranques): o painel de quem joga, as fichas de luta do
 * dia, os 5 adversários, "Trocar lista" e, nas janelas, as regras, as últimas lutas (com replay), o pódio, os prêmios e os baús de escolha.
 */
export function ListaDaArena({ modo, tokenFresco, abrirReplay, irPara, aviso, setAviso, abrirRecompensas }: {
  modo: ModoDaArena; tokenFresco: Token; abrirReplay: (r: ReplayPedido) => void; irPara: (v: 'modos' | 'arena' | 'ranqueada' | 'campeonato') => void;
  aviso: Aviso; setAviso: (a: Aviso) => void; abrirRecompensas: (indiceDoRanque: number) => void;
}) {
  const ranqueada = modo === 'ranqueada';
  const [estado, setEstado] = useState<EstadoDaArena | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, modo);
    if (!r.ok) return setErro(String(r.dados.error ?? T.erroAoCarregar));
    setEstado(r.dados as unknown as EstadoDaArena);
    setErro(null);
  }, [tokenFresco, modo]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(corpo: Record<string, unknown>) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, modo, corpo);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? T.naoFoiPossivel), erro: true });
      return null;
    }
    return r.dados;
  }
  async function lutar(uid: string, nome: string) {
    const d = (await agir({ acao: 'lutar', alvo: uid })) as unknown as ResultadoDaLuta | null;
    if (d) abrirReplay({ combate: d.combate, lados: d.lados, titulo: `${ranqueada ? T.abas.ranqueada : T.abas.arena} · ${T.contra(nome)}`, aviso: d.mensagem });
  }
  async function assistir(lutaId: string, titulo: string) {
    const d = (await agir({ acao: 'replay', luta: lutaId })) as { combate: ResultadoCombatePvp; lados: { a: LadoNaTela; b: LadoNaTela } } | null;
    if (d) {
      setDialogo(null);
      abrirReplay({ combate: d.combate, lados: d.lados, titulo });
    }
  }
  async function simples(corpo: Record<string, unknown>) {
    const d = await agir(corpo);
    if (d) setAviso({ texto: String(d.mensagem ?? T.feito), erro: false });
    await carregar();
  }

  const fundo = ranqueada ? ARENA_UI.fundoTorre : ARENA_UI.fundoColiseu;
  const meu = estado ? indiceDoRanque(estado.pontos) : 0;
  const prog = estado ? progressoDoRanque(estado.pontos) : null;
  const fichas = estado ? fichasDaArena(estado.lutasRestantes, estado.comprasFeitas) : [];
  const cartoes = ranqueada ? POSICAO.rcartao : POSICAO.cartao;
  const tipo = (pontos: number) => tipoDoCartao(estado?.pontos ?? 0, pontos);
  const livre = !!estado?.podeLutar;

  return (
    <PalcoPixel fundo={fundo}>
      <Peca src={ARENA_UI.titulo} p={POSICAO.titulo}>
        <Texto x={100} y={48} tamanho={ranqueada ? 10 : 11} caixaAlta largura={150} cor={TINTA}>{ranqueada ? T.abas.ranqueada : T.titulo}</Texto>
      </Peca>
      <button type="button" onClick={() => irPara('modos')} aria-label={T.voltar} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${ARENA_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
      <button type="button" onClick={() => setDialogo('regras')} aria-label={T.regras} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.livro.x), top: u(POSICAO.livro.y), width: u(POSICAO.livro.l), height: u(POSICAO.livro.a), backgroundImage: `url(${ARENA_UI.livro})`, backgroundSize: '100% 100%', ...pixel }} />

      {/* as abas (só na Arena; a Ranqueada tem o mapa dos ranques no lugar) */}
      {!ranqueada && ABAS.map((a, i) => (
        <button key={a.id} type="button" onClick={() => a.id !== 'arena' && irPara(a.id)} role="tab" aria-selected={a.id === 'arena'} aria-label={T.abas[a.id]} className="absolute cursor-pointer"
          style={{ left: u(POSICAO.abas.xs[i]), top: u(POSICAO.abas.y), width: u(POSICAO.abas.l), height: u(POSICAO.abas.a), backgroundImage: `url(${ARENA_UI.tab(a.n, a.id === 'arena')})`, backgroundSize: '100% 100%', ...pixel }}>
          <Texto x={70} y={17} tamanho={6.4} caixaAlta largura={70} cor={TINTA}>{T.abas[a.id]}</Texto>
        </button>
      ))}

      {/* o mapa dos 10 ranques */}
      {ranqueada && estado && DEGRAUS_DOS_RANQUES.map((d, i) => {
        const atual = i === meu;
        const alcancado = i <= meu;
        const arte = INSIGNIA_DO_RANQUE(i, atual ? 'g' : 'p');
        const lg = atual ? 64 : 34;
        return (
          <React.Fragment key={i}>
            <Peca src={atual ? ARENA_UI.plataforma.vio : alcancado ? ARENA_UI.plataforma.ouro : ARENA_UI.plataforma.off} p={{ x: d.x - 21, y: d.y - 17, l: atual ? 42 : alcancado ? 42 : 42, a: 34 }} style={atual ? { filter: 'drop-shadow(0 0 6px #b57cff)' } : undefined} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={arte} alt={RANQUES[i].nome} draggable={false} className="absolute" style={{ left: u(d.x - lg / 2), top: u(Math.max(70, d.y - 8 - (atual ? 62 : 32))), width: u(lg), height: 'auto', filter: alcancado ? (atual ? 'drop-shadow(0 0 6px rgba(190,140,255,.9))' : undefined) : 'grayscale(.7) brightness(.55)', ...pixel }} />
            <Texto x={d.x} y={d.y + 22} tamanho={4.6} cor={alcancado ? CREME : SUB} negrito={false} largura={20}>{String(i + 1)}</Texto>
          </React.Fragment>
        );
      })}
      {ranqueada && estado && <Texto x={DEGRAUS_DOS_RANQUES[meu].x} y={DEGRAUS_DOS_RANQUES[meu].y + 36} tamanho={7} cor={DOURADO} caixaAlta largura={120}>{RANQUES[meu].nome}</Texto>}

      {erro && <p role="alert" className="absolute font-cinzel font-bold text-center" style={{ left: u(30), width: u(300), top: u(250), fontSize: u(8), color: '#FF9A8F', textShadow: SOMBRA_DO_TEXTO }}>{erro}</p>}
      {!estado && !erro && <p className="absolute font-cinzel font-bold text-center w-full" style={{ top: u(260), fontSize: u(8), color: CREME, textShadow: SOMBRA_DO_TEXTO }}>{T.carregando}</p>}
      {estado && !livre && <p role="status" className="absolute font-cinzel font-black text-center w-full" style={{ top: u(260), fontSize: u(8.5), color: DOURADO, textShadow: SOMBRA_DO_TEXTO }}>{T.abre(estado.nivelNecessario)}</p>}
      {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="absolute font-cinzel font-bold text-center z-20" style={{ left: u(30), width: u(300), top: u(36), fontSize: u(6.6), color: aviso.erro ? '#FF9A8F' : '#B8F0B0', textShadow: SOMBRA_DO_TEXTO, backgroundColor: 'rgba(8,6,12,.82)', padding: `${u(2.5)} ${u(4)}` }}>{aviso.texto}</p>}

      {estado && livre && (
        <>
          {/* o painel de quem joga: o retrato (ou a insígnia do ranque) no anel, o nome, os pontos e o caminho até o próximo ranque */}
          {(() => {
            const p = ranqueada ? POSICAO.ranquePainel : POSICAO.painelJogador;
            const conteudo = (
              <>
                <Peca src={ARENA_UI.painelJogador} p={{ x: 0, y: 0, l: p.l, a: p.a }} />
                {ranqueada
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={INSIGNIA_DO_RANQUE(meu, 'p')} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(POSICAO.painelCirculo.cx - 17), top: u(POSICAO.painelCirculo.cy - 19), width: u(34), height: 'auto', ...pixel }} />
                  : <Medalhao src={resolveAvatarSrc(estado.eu.avatarId, estado.eu.classeId)} cx={POSICAO.painelCirculo.cx} cy={POSICAO.painelCirculo.cy} d={POSICAO.painelCirculo.d} />}
                <Texto x={86} y={19} tamanho={9} alinhar="left" largura={190} cor={TINTA}>{ranqueada ? RANQUES[meu].nome : estado.eu.nome}</Texto>
                <Texto x={86} y={30} tamanho={5.8} alinhar="left" largura={190} cor="#5a4630" negrito={false} caixaAlta>{`${T.pontos(estado.pontos)} · ${T.lugar(estado.posicao)}`}</Texto>
                {ranqueada && prog && (
                  <>
                    <span className="absolute" style={{ left: u(86), top: u(42), width: u(150), height: u(7), backgroundColor: '#2a1d10', border: `${u(0.6)} solid #5a4630` }}>
                      <span className="absolute inset-y-0 left-0" style={{ width: `${prog.progresso * 100}%`, background: 'linear-gradient(180deg,#F3C769,#C8962E)' }} />
                    </span>
                    <Texto x={284} y={46} tamanho={5} alinhar="right" largura={120} cor="#5a4630" negrito={false} caixaAlta>{prog.proximo ? T.proximoRanque(prog.proximo) : T.ranqueMaisAlto}</Texto>
                  </>
                )}
              </>
            );
            return ranqueada ? (
              <button type="button" onClick={() => abrirRecompensas(meu)} aria-label={T.verRecompensas} className="absolute cursor-pointer" style={{ left: u(p.x), top: u(p.y), width: u(p.l), height: u(p.a) }}>{conteudo}</button>
            ) : (
              <div className="absolute" style={{ left: u(p.x), top: u(p.y), width: u(p.l), height: u(p.a) }}>{conteudo}</div>
            );
          })()}

          {/* as fichas de luta do dia e a semana */}
          {fichas.map((f, i) => (
            <Peca key={i} src={f === 'cheia' ? ARENA_UI.fichaCheia : f === 'ouro' ? ARENA_UI.fichaOuro : ARENA_UI.fichaVazia} p={{ x: POSICAO.fichas.xs[0] + i * POSICAO.fichas.passo, y: ranqueada ? POSICAO.ranqueFichas.y : POSICAO.fichas.y, l: 24, a: 24 }} />
          ))}
          {ranqueada ? (
            <>
              <Peca src={ARENA_UI.badgeQueda} p={{ x: POSICAO.badgeQueda.x, y: POSICAO.badgeQueda.y, l: 24, a: 24 }} />
              <Texto x={196} y={279} tamanho={5.2} alinhar="left" largura={150} caixaAlta negrito={false}>{T.segundaQueda}</Texto>
              <Texto x={196} y={290} tamanho={6.6} alinhar="left" largura={150} caixaAlta>{T.emTempo(tempoAte(estado.acabaEm))}</Texto>
            </>
          ) : (
            <>
              <Peca src={ARENA_UI.ampulheta} p={{ x: POSICAO.ampulheta.x, y: POSICAO.ampulheta.y, l: 16, a: 21 }} />
              <Texto x={238} y={187} tamanho={5} alinhar="left" largura={100} caixaAlta negrito={false}>{T.semanaTermina}</Texto>
              <Texto x={238} y={199} tamanho={8} alinhar="left" largura={60} caixaAlta>{tempoAte(estado.acabaEm)}</Texto>
              <button type="button" onClick={() => setDialogo('lutas')} aria-label={T.suasLutas} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(302), top: u(184), width: u(16), height: u(16), backgroundImage: `url(${ARENA_UI.replay})`, backgroundSize: '100% 100%', ...pixel }} />
              <button type="button" onClick={() => setDialogo('podio')} aria-label={T.podio} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(326), top: u(183), width: u(18), height: u(17), backgroundImage: `url(${ARENA_UI.trofeu})`, backgroundSize: '100% 100%', ...pixel }} />
            </>
          )}

          {/* os 5 adversários */}
          {estado.adversarios.length === 0 && <Texto x={180} y={300} tamanho={7} largura={300} cor={SUB} negrito={false}>{T.semAdversarios}</Texto>}
          {estado.adversarios.slice(0, 5).map((a, i) => {
            const t = tipo(a.pontos);
            const y = cartoes.ys[i];
            const arte = ranqueada ? ARENA_UI.rcard[t] : ARENA_UI.card[t];
            const f = POSICAO.fatiaDoCartao;
            const sem = estado.lutasRestantes <= 0 || ocupado;
            return (
              <div key={a.uid}>
                <Fatiada src={arte} x={cartoes.x} y={y} l={cartoes.l} a={cartoes.a} origemL={f.origemL} esq={f.esquerda} dir={f.direita} miolo={f.miolo} />
                {ranqueada
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={INSIGNIA_DO_RANQUE(indiceDoRanque(a.pontos), 'p')} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(cartoes.x + 10), top: u(y + 2), width: u(34), height: 'auto', ...pixel }} />
                  : <Medalhao src={resolveAvatarSrc(undefined, a.classeId)} cx={cartoes.x + 29} cy={y + 26} d={30} />}
                <Texto x={cartoes.x + (ranqueada ? 50 : 60)} y={y + (ranqueada ? 13 : 17)} tamanho={ranqueada ? 7 : 8} alinhar="left" largura={190} caixaAlta>{a.nome}</Texto>
                <Texto x={cartoes.x + (ranqueada ? 50 : 60)} y={y + (ranqueada ? 25 : 31)} tamanho={5} alinhar="left" largura={200} caixaAlta negrito={false} cor="#D9CBB0">
                  {`${classe(a.classeId)} · ${T.nivelEPontos(a.nivel, a.pontos)}${ranqueada ? ` · ${T.ganhaEPerde}` : ''}`}
                </Texto>
                {t !== 'neutro' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t === 'forte' ? ARENA_UI.sobe : ARENA_UI.desce} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(cartoes.iconeX), top: u(y + cartoes.iconeDY), width: u(16), height: u(16), ...pixel }} />
                )}
                <button type="button" onClick={() => void lutar(a.uid, a.nome)} disabled={sem} aria-label={T.lutar(a.nome)} className="absolute cursor-pointer disabled:cursor-not-allowed active:translate-y-px"
                  style={{ left: u(cartoes.espadasX - 4), top: u(y + cartoes.iconeDY - 4), width: u(26), height: u(25), backgroundImage: `url(${ARENA_UI.espadas})`, backgroundSize: `${u(18)} ${u(17)}`, backgroundPosition: 'center', backgroundRepeat: 'no-repeat', filter: sem ? 'grayscale(1) brightness(.6)' : undefined, ...pixel }} />
              </div>
            );
          })}

          {/* trocar a lista, e (na Arena) comprar mais uma luta */}
          {!ranqueada && (
            <>
              <button type="button" onClick={() => void simples({ acao: 'trocarLista' })} disabled={ocupado || !!estado.trocaLiberadaEm} aria-label={T.trocarLista} className="absolute cursor-pointer disabled:cursor-not-allowed active:translate-y-px"
                style={{ left: u(POSICAO.trocar.x), top: u(POSICAO.trocar.y), width: u(POSICAO.trocar.l), height: u(POSICAO.trocar.a), backgroundImage: `url(${ARENA_UI.trocar})`, backgroundSize: '100% 100%', filter: estado.trocaLiberadaEm ? 'grayscale(.8) brightness(.8)' : undefined, ...pixel }}>
                <Texto x={80} y={16} tamanho={6.4} caixaAlta largura={78} cor={TINTA}>{estado.trocaLiberadaEm ? T.trocarEm(hora(estado.trocaLiberadaEm)) : T.trocarLista}</Texto>
              </button>
              <Texto x={176} y={497} tamanho={5} caixaAlta negrito={false} largura={74} cor={SUB}>{T.gratisACadaHora}</Texto>
              {estado.podeComprarLuta && (
                <BotaoDeArte x={214} y={484} l={136} a={25} src={BOTAO} desligado={ocupado || estado.diamantes < estado.precoDaLuta} onClick={() => void simples({ acao: 'comprarLuta' })} tamanho={6.6} rotulo={T.maisUmaLuta(PRECO_DA_LUTA_EM_DIAMANTES)}>{T.maisUmaLuta(estado.precoDaLuta)}</BotaoDeArte>
              )}
            </>
          )}
          {ranqueada && estado.baus.length > 0 && (
            <BotaoDeArte x={95} y={510} l={170} a={26} src={BOTAO} onClick={() => setDialogo('baus')} tamanho={6.6}>{T.abrirBau}</BotaoDeArte>
          )}
        </>
      )}

      {/* as janelas: regras, lutas, pódio e baús */}
      {dialogo === 'regras' && (
        <Janela titulo={T.regras} aoFechar={() => setDialogo(null)} fechar={T.fechar}>
          {(ranqueada ? T.regrasRanqueada : T.regrasArena).map((t) => <p key={t} style={{ marginBottom: u(5) }}>{t}</p>)}
        </Janela>
      )}
      {dialogo === 'lutas' && estado && (
        <Janela titulo={T.suasLutas} aoFechar={() => setDialogo(null)} fechar={T.fechar}>
          {estado.historico.length === 0 && <p style={{ color: SUB }}>{T.nenhumaLuta}</p>}
          {estado.historico.map((h) => (
            <button key={h.id} type="button" disabled={ocupado} onClick={() => void assistir(h.id, `${h.atacou ? T.abas.arena : h.adversario} · ${h.adversario}`)} className="relative block w-full text-left disabled:opacity-60" style={{ height: u(36), marginBottom: u(3) }}>
              <Fatiada src={h.empate ? ARENA_UI.linhaDerrota : h.venceu ? ARENA_UI.linhaVitoria : ARENA_UI.linhaDerrota} x={0} y={0} l={304} a={34} origemL={150} esq={46} dir={20} miolo={[60, 100]} />
              <Texto x={46} y={12} tamanho={6.6} alinhar="left" largura={190} cor={h.empate ? DOURADO : h.venceu ? '#B8F0B0' : '#FFB4A8'} caixaAlta>{h.empate ? T.empate : h.venceu ? T.vitoria : T.derrota}</Texto>
              <Texto x={46} y={24} tamanho={5.4} alinhar="left" largura={190} negrito={false}>{`${h.atacou ? T.contra(h.adversario) : T.defendendo(h.adversario)} (${h.pontos >= 0 ? '+' : ''}${h.pontos})`}</Texto>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ARENA_UI.replay} alt={T.assistir} draggable={false} className="absolute" style={{ right: u(14), top: u(9), width: u(16), height: u(16), ...pixel }} />
            </button>
          ))}
        </Janela>
      )}
      {dialogo === 'podio' && estado && (
        <Janela titulo={ranqueada ? T.melhores : T.podio} aoFechar={() => setDialogo(null)} fechar={T.fechar}>
          {estado.podio.length === 0 ? <p style={{ color: SUB }}>{T.ninguemLutou}</p> : (
            <ol>
              {estado.podio.map((p) => (
                <li key={`${p.posicao}-${p.nome}`} className="flex justify-between" style={{ gap: u(4), marginBottom: u(2) }}>
                  <span className="truncate"><b style={{ color: DOURADO }}>{p.posicao}º</b> {p.nome} <span style={{ color: SUB }}>· {classe(p.classeId)} {p.nivel}</span></span>
                  <span className="shrink-0">{T.pontos(p.pontos)}</span>
                </li>
              ))}
            </ol>
          )}
          <h3 className="font-cinzel font-black uppercase" style={{ color: DOURADO, margin: `${u(6)} 0 ${u(3)}` }}>{T.premios}</h3>
          <ul>
            {estado.faixas.map((f) => (
              <li key={f.de} style={{ marginBottom: u(1.5) }}>{f.nome}: {f.ouro.toLocaleString('pt-BR')} de ouro{f.diamantes ? ` e ${f.diamantes} Diamantes` : ''}{f.ate === null ? ' (com pelo menos 1 luta)' : ''}</li>
            ))}
          </ul>
        </Janela>
      )}
      {dialogo === 'baus' && estado && (
        <Janela titulo={T.bauDeEscolha} aoFechar={() => setDialogo(null)} fechar={T.fechar}>
          {estado.baus.map((b) => (
            <div key={b.id} style={{ marginBottom: u(8) }}>
              <p style={{ color: DOURADO, fontWeight: 800 }}>{T.bauLendario}</p>
              <p style={{ color: SUB, marginBottom: u(3) }}>{b.origem}</p>
              <select value={escolhas[b.id] ?? ''} onChange={(e) => setEscolhas((x) => ({ ...x, [b.id]: e.target.value }))} aria-label={T.cartaLendaria} className="w-full" style={{ fontSize: u(7), padding: u(2), backgroundColor: '#221C16', border: `${u(0.8)} solid #4A3F2A`, color: CREME }}>
                <option value="">{T.escolha}</option>
                {estado.cartasLendarias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button type="button" disabled={ocupado || !escolhas[b.id]} onClick={() => void simples({ acao: 'abrirBau', bau: b.id, carta: escolhas[b.id] }).then(() => setDialogo(null))} className="font-cinzel font-black uppercase disabled:opacity-50" style={{ marginTop: u(4), fontSize: u(7), color: TINTA, backgroundColor: DOURADO, padding: `${u(2)} ${u(8)}` }}>{T.abrir}</button>
            </div>
          ))}
        </Janela>
      )}
    </PalcoPixel>
  );
}

