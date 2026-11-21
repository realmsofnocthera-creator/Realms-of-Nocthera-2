'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import type { CharacterDocument, RespostaBatalhaSangrenta } from '@/server/characterService';
import { MONSTROS_CACADA_MAP } from '@/rules/cacada';
import { CHEFES_ESPECIAIS_MAP } from '@/rules/chefesEspeciais';
import { dificuldadesDaBatalha, nomeDaSubclasse, REGRAS_RESUMO, tentativasDeHoje, tentativasPorDia } from '@/lib/batalhaSangrentaTela';
import { BATALHA_SANGRENTA, type DificuldadeBatalha } from '@/game/batalhaSangrenta';
import { ARENAS_DA_BATALHA } from '@/assets/arenasDaBatalha';
import { CombateCacada } from '@/components/cacada/CombateCacada';
import { PalcoPixel, Peca, Texto, u, pixel, SOMBRA_DO_TEXTO } from '@/components/pixel/GradePixel';
import { BATALHA_UI, FIM_DAS_MOLDURAS, POSICAO, QUADROS, RETRATO_DO_SEGUNDO_CHEFE } from '@/assets/batalhaSangrentaUi';
import { TEXTOS_DA_BATALHA_SANGRENTA as T } from '@/rules/textosDaBatalhaSangrenta';
import type { DificuldadeTela } from '@/lib/batalhaSangrentaTela';

interface BatalhaSangrentaScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

type Etapa =
  | { tipo: 'dificuldades' }
  | { tipo: 'combate'; antes: CharacterDocument; resposta: RespostaBatalhaSangrenta; indice: number }
  | { tipo: 'resultado'; antes: CharacterDocument; resposta: RespostaBatalhaSangrenta };

const CREME = '#F5E3B3';
const DOURADO = '#F3C769';
/** Onde começa o texto "Monstros ★" de cada moldura (x dentro dela). */
const X_DOS_MONSTROS = [113, 111, 109, 107, 105];
const monstroDe = (id: string) => MONSTROS_CACADA_MAP[id] ?? CHEFES_ESPECIAIS_MAP[id];

/**
 * Provação de Batalha Sangrenta: escolha da dificuldade → lutas em sequência (o HP passa de uma para a outra) →
 * resultado com as recompensas. Toda regra (nível, dificuldade liberada, tentativas do dia, recompensas) é do servidor.
 */
export function BatalhaSangrentaScreen({ character, onCharacterChange, tokenFresco }: BatalhaSangrentaScreenProps) {
  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'dificuldades' });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const batalhar = async (dificuldade: string) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const token = await tokenFresco();
      if (!token) throw new Error(T.sessaoExpirada);
      const combateId = `bat-${crypto.randomUUID()}`;
      const res = await fetch('/api/batalha-sangrenta/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dificuldade, combateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || T.falhaAoIniciar);
      setEtapa({ tipo: 'combate', antes: character, resposta: data as RespostaBatalhaSangrenta, indice: 0 });
    } catch (e) {
      setErro(e instanceof Error ? e.message : T.erroAoIniciar);
    } finally {
      setOcupado(false);
    }
  };

  const proximaLuta = useCallback(() => {
    setEtapa((e) => {
      if (e.tipo !== 'combate') return e;
      if (e.indice + 1 < e.resposta.ondas.length) return { ...e, indice: e.indice + 1 };
      onCharacterChange(e.resposta.character);
      return { tipo: 'resultado', antes: e.antes, resposta: e.resposta };
    });
  }, [onCharacterChange]);

  if (etapa.tipo === 'combate') {
    const onda = etapa.resposta.ondas[etapa.indice];
    const monstro = monstroDe(onda.monstroId);
    if (onda.resultado && monstro) {
      return (
        <CombateCacada
          key={etapa.indice}
          // a abertura "A Batalha começa" toca só antes da primeira luta; nas outras a luta já começa
          semAbertura={etapa.indice > 0}
          mapa={ARENAS_DA_BATALHA[etapa.resposta.dificuldade as DificuldadeBatalha]}
          resultado={onda.resultado}
          personagem={etapa.antes}
          monstro={monstro}
          hpInicialJogador={onda.hpInicial}
          titulo={T.luta(etapa.indice + 1, etapa.resposta.ondas.length, onda.chefe, monstro.nome)}
          estrela={etapa.resposta.estrela}
          onFim={proximaLuta}
        />
      );
    }
    // Sem log (não deveria acontecer numa resposta nova): pula direto para o resultado
    return (
      <PalcoPixel fundo={BATALHA_UI.fundo}>
        <button type="button" onClick={proximaLuta} className="absolute left-1/2 -translate-x-1/2 cursor-pointer" style={{ top: u(250), width: u(170), height: u(27), backgroundImage: `url(${BATALHA_UI.botao})`, backgroundSize: '100% 100%', ...pixel }}>
          <span className="font-cinzel font-black uppercase" style={{ fontSize: u(9), color: CREME, textShadow: SOMBRA_DO_TEXTO }}>{T.verResultado}</span>
        </button>
      </PalcoPixel>
    );
  }

  const restantes = tentativasDeHoje(character);
  const porDia = tentativasPorDia(character);
  const dificuldades = dificuldadesDaBatalha(character);
  const inicial = dificuldades.find((d) => d.liberada && !d.vencida) ?? [...dificuldades].reverse().find((d) => d.liberada) ?? dificuldades[0];
  return (
    <TelaDasDificuldades
      character={character}
      etapa={etapa}
      dificuldades={dificuldades}
      inicial={inicial.id}
      restantes={restantes}
      porDia={porDia}
      ocupado={ocupado}
      erro={erro}
      batalhar={batalhar}
      voltarAsDificuldades={() => { setErro(null); setEtapa({ tipo: 'dificuldades' }); }}
    />
  );
}

/** A moldura de uma dificuldade com o retrato, o nome, os nós das lutas e o espaço da direita (selo, ▶ ou cadeado). */
function Moldura({ d, selecionada, restantes, ocupado, nos, onEscolher, onBatalhar, y, semDireita }: {
  d: DificuldadeTela;
  selecionada: boolean;
  restantes: number;
  ocupado: boolean;
  /** o estado de cada nó: 4 lutas e o(s) chefe(s) */
  nos: ('ok' | 'pend' | 'perdeu')[];
  onEscolher: () => void;
  onBatalhar: () => void;
  /** onde a moldura fica (o padrão é o lugar dela na lista) */
  y?: number;
  /** sem o espaço da direita (no resultado) */
  semDireita?: boolean;
}) {
  const q = QUADROS[d.id];
  const indice = Object.keys(QUADROS).indexOf(d.id);
  const total = nos.length;
  const inicioDosNos = 184 - 20 - (total * POSICAO.nosPasso - 1) / 2;
  const trancada = !d.liberada;
  const semTentativas = d.liberada && restantes <= 0;
  const [cx, cy] = q.direita;
  return (
    <article aria-label={T.dificuldade(d.nome)} className="absolute" style={{ left: u(20), top: u(y ?? q.y), width: u(q.l), height: u(q.a), filter: selecionada ? 'drop-shadow(0 0 5px #F3C769)' : undefined }}>
      <div className="absolute inset-0" style={{ opacity: trancada ? 0.6 : 1 }}>
        <Peca src={q.moldura} p={{ x: 0, y: 0, l: q.l, a: q.a }} />
        <Peca src={q.retrato} p={{ x: q.retratoXY[0], y: q.retratoXY[1], l: 54, a: 52 }} />
        <Texto x={160} y={q.yTitulo} tamanho={9.5} caixaAlta largura={150} cor="#F3D58A">{d.nome}</Texto>
        <Texto x={X_DOS_MONSTROS[indice]} y={q.yMonstros} tamanho={6} alinhar="left" largura={110} cor="#C8A25A" negrito={false}>
          <span>{T.monstros}</span><span className="ml-1" style={{ color: DOURADO, letterSpacing: '0.05em' }}>{'★'.repeat(d.estrela)}</span>
        </Texto>
        <Texto x={163} y={q.yNome} tamanho={6.8} largura={150} negrito={false}>{/* com dois chefes (o Inferno) só os nomes, para caber na moldura */}
        {d.chefes.length > 1 ? d.chefes.map((n) => n.split(',')[0]).join(' e ') : d.chefes[0]}</Texto>
        {nos.map((estado, i) => {
          const chefe = i >= total - (d.chefes.length || 1);
          const src = chefe ? (estado === 'ok' ? BATALHA_UI.coroaOk : BATALHA_UI.coroaPend) : estado === 'ok' ? BATALHA_UI.noOk : estado === 'perdeu' ? BATALHA_UI.noPerdeu : BATALHA_UI.noPend;
          return <Peca key={i} src={src} p={{ x: inicioDosNos + i * POSICAO.nosPasso, y: q.yNos - 6.5, l: 13, a: chefe ? 12 : 13 }} />;
        })}
      </div>
      {/* a área de toque da moldura: escolher a dificuldade */}
      <button type="button" onClick={onEscolher} aria-pressed={selecionada} aria-label={`${T.dificuldade(d.nome)}${d.bloqueio ? `: ${d.bloqueio}` : ''}`} className="absolute inset-y-0 left-0 cursor-pointer" style={{ width: u(250) }} />
      {/* o espaço da direita */}
      {semDireita ? null : trancada ? (
        <Peca src={BATALHA_UI.cadeado} p={{ x: 295 - 46, y: cy - 30, l: 92, a: 61 }} className="pointer-events-none" />
      ) : d.vencida ? (
        <Peca src={BATALHA_UI.seloOuro} p={{ x: cx - 15, y: cy - 16, l: 30, a: 32 }} className="pointer-events-none" />
      ) : (
        <button type="button" disabled={ocupado || semTentativas} onClick={onBatalhar} aria-label={T.batalhar} className="absolute cursor-pointer disabled:cursor-not-allowed flex items-center justify-center" style={{ left: u(cx - 18), top: u(cy - 18), width: u(36), height: u(36) }}>
          {semTentativas ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={BATALHA_UI.seloCinza} alt="" aria-hidden draggable={false} style={{ width: u(30), height: u(30), ...pixel }} />
          ) : (
            <span aria-hidden style={{ width: u(15), height: u(17), backgroundColor: '#F0B43C', clipPath: 'polygon(0 0, 100% 50%, 0 100%)', filter: 'drop-shadow(0 1px 0 #000)' }} />
          )}
        </button>
      )}
    </article>
  );
}

function TelaDasDificuldades({ character, etapa, dificuldades, inicial, restantes, porDia, ocupado, erro, batalhar, voltarAsDificuldades }: {
  character: CharacterDocument;
  etapa: Etapa;
  dificuldades: DificuldadeTela[];
  inicial: string;
  restantes: number;
  porDia: number;
  ocupado: boolean;
  erro: string | null;
  batalhar: (dificuldade: string) => void;
  voltarAsDificuldades: () => void;
}) {
  const [escolhida, setEscolhida] = useState(inicial);
  const [regras, setRegras] = useState(false);
  const [apertado, setApertado] = useState(false);
  const atual = dificuldades.find((d) => d.id === escolhida) ?? dificuldades[0];
  const pode = atual.liberada && restantes > 0 && !ocupado;
  const botaoSrc = !pode ? BATALHA_UI.botaoOff : apertado ? BATALHA_UI.botaoPress : BATALHA_UI.botao;
  const gotas = Array.from({ length: porDia }, (_, i) => ({ cheia: i < restantes, vip: i >= 3 }));

  if (etapa.tipo === 'resultado') {
    return <Resultado etapa={etapa} porDia={porDia} dificuldades={dificuldades} aoVoltar={voltarAsDificuldades} />;
  }

  return (
    <PalcoPixel fundo={BATALHA_UI.fundo}>
      <Peca src={BATALHA_UI.faixa} p={POSICAO.faixa}>
        <Texto x={84} y={35} tamanho={11} caixaAlta largura={150}>{T.linha1}</Texto>
        <Texto x={84} y={48} tamanho={11} caixaAlta largura={150} cor="#F3D58A">{T.linha2}</Texto>
      </Peca>
      <Link href="/provacoes" aria-label={T.voltar} className="absolute active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${BATALHA_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
      <button type="button" onClick={() => setRegras(true)} aria-label={T.regras} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.livro.x), top: u(POSICAO.livro.y), width: u(POSICAO.livro.l), height: u(POSICAO.livro.a), backgroundImage: `url(${BATALHA_UI.livro})`, backgroundSize: '100% 100%', ...pixel }} />

      {/* as tentativas do dia */}
      <div role="group" aria-label={T.tentativasHoje(restantes, porDia)}>
        <Texto x={106} y={97} tamanho={6.5} alinhar="left" largura={40} cor="#C8A25A" negrito={false} caixaAlta>{T.tentativas}</Texto>
        {gotas.map((g, i) => <Peca key={i} src={g.cheia ? (g.vip ? BATALHA_UI.gotaVip : BATALHA_UI.gota) : BATALHA_UI.gotaVazia} p={{ x: POSICAO.gotaX + POSICAO.gotaPasso * i, y: POSICAO.gotaY, l: POSICAO.gotaLado, a: POSICAO.gotaLado }} />)}
        <Texto x={POSICAO.gotaX + POSICAO.gotaPasso * porDia + 6} y={97} tamanho={9} alinhar="left" largura={30} cor={restantes > 0 ? CREME : '#FF9A8F'}>{restantes}/{porDia}</Texto>
      </div>

      {dificuldades.map((d) => (
        <Moldura key={d.id} d={d} selecionada={d.id === atual.id} restantes={restantes} ocupado={ocupado}
          nos={Array.from({ length: 4 + d.chefes.length }, () => (d.vencida ? 'ok' : 'pend'))}
          onEscolher={() => setEscolhida(d.id)} onBatalhar={() => batalhar(d.id)} />
      ))}

      {/* o que a dificuldade escolhida dá e o botão de batalhar */}
      <Texto x={180} y={FIM_DAS_MOLDURAS + 8} tamanho={5.8} largura={340} negrito={false}>
        {atual.bloqueio ? atual.bloqueio : `${T.fragmentos(atual.fragmentos)}${atual.diamantesPendentes ? ` · ${T.primeiraVitoria(BATALHA_SANGRENTA.diamantesDaPrimeiraVitoria)}` : ''}`}
      </Texto>
      <button type="button" disabled={!pode} onClick={() => batalhar(atual.id)} onPointerDown={() => setApertado(true)} onPointerUp={() => setApertado(false)} onPointerLeave={() => setApertado(false)} aria-label={T.batalhar}
        className="absolute cursor-pointer disabled:cursor-not-allowed" style={{ left: u(95), top: u(FIM_DAS_MOLDURAS + 14), width: u(170), height: u(27), backgroundImage: `url(${botaoSrc})`, backgroundSize: '100% 100%', ...pixel }}>
        <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ fontSize: u(9), color: pode ? CREME : '#B9A98A', textShadow: SOMBRA_DO_TEXTO }}>
          {ocupado ? T.iniciando : restantes <= 0 && atual.liberada ? T.semTentativas : T.batalhar}
        </span>
      </button>

      {erro && (
        <p role="alert" className="absolute font-cinzel font-bold text-center" style={{ left: u(20), width: u(320), top: u(96), fontSize: u(7), color: '#FF9A8F', textShadow: SOMBRA_DO_TEXTO, backgroundColor: 'rgba(8,4,6,.85)', padding: `${u(3)} ${u(4)}`, zIndex: 20 }}>{erro}</p>
      )}
      <span className="sr-only">{character.nome} · Nv. {character.nivel}</span>

      {regras && (
        <div className="absolute inset-0 flex items-center justify-center z-30" style={{ backgroundColor: 'rgba(6,3,4,.82)' }} onClick={() => setRegras(false)}>
          <div role="dialog" aria-label={T.regras} className="flex flex-col items-center text-center" style={{ width: u(280), padding: u(14), gap: u(10), backgroundColor: '#150b0b', border: `${u(1.5)} solid #8a6d2a` }} onClick={(e) => e.stopPropagation()}>
            <p className="font-cinzel font-semibold" style={{ fontSize: u(8), lineHeight: 1.45, color: CREME }}>{REGRAS_RESUMO}</p>
            <button type="button" onClick={() => setRegras(false)} className="cursor-pointer" style={{ width: u(170), height: u(27), backgroundImage: `url(${BATALHA_UI.botao})`, backgroundSize: '100% 100%', ...pixel }}>
              <span className="font-cinzel font-black uppercase" style={{ fontSize: u(9), color: CREME, textShadow: SOMBRA_DO_TEXTO }}>{T.fecharRegras}</span>
            </button>
          </div>
        </div>
      )}
    </PalcoPixel>
  );
}

/** O resultado: a moldura da dificuldade com os nós de cada luta (verde, vermelho ou parado) e o que a batalha rendeu. */
function Resultado({ etapa, porDia, dificuldades, aoVoltar }: { etapa: Extract<Etapa, { tipo: 'resultado' }>; porDia: number; dificuldades: DificuldadeTela[]; aoVoltar: () => void }) {
  const { resposta } = etapa;
  const venceu = resposta.chefeVencido;
  const d = dificuldades.find((x) => x.id === resposta.dificuldade) ?? dificuldades[0];
  const q = QUADROS[d.id];
  const nos = Array.from({ length: 4 + d.chefes.length }, (_, i) => {
    const onda = resposta.ondas[i];
    return !onda ? 'pend' : onda.vencedor === 'personagem' ? 'ok' : 'perdeu';
  }) as ('ok' | 'pend' | 'perdeu')[];
  return (
    <PalcoPixel fundo={BATALHA_UI.fundo}>
      <Peca src={BATALHA_UI.faixa} p={POSICAO.faixa}>
        <Texto x={84} y={35} tamanho={7.2} caixaAlta largura={104} cor={venceu ? '#F3D58A' : '#FF9A8F'}>{venceu ? T.vencida : T.derrotado}</Texto>
        <Texto x={84} y={48} tamanho={6.2} largura={104} negrito={false}>{T.lutasVencidas(resposta.ondasVencidas)}</Texto>
      </Peca>
      <Moldura d={d} selecionada={false} restantes={1} ocupado={false} nos={nos} y={110} semDireita onEscolher={() => undefined} onBatalhar={() => undefined} />
      <section aria-label="Resultado da Batalha Sangrenta" className="absolute" style={{ left: u(20), top: u(200), width: u(320), height: u(262), backgroundColor: 'rgba(12,6,8,.86)', border: `${u(1)} solid #5a4420`, padding: u(10) }}>
        <div className="flex flex-wrap justify-center font-cinzel font-black" style={{ gap: `${u(3)} ${u(10)}`, fontSize: u(8.5) }}>
          {resposta.fragmentosAlma > 0 && <span style={{ color: '#C27BF0' }}>{T.fragmentosAlma} +{resposta.fragmentosAlma}</span>}
          {resposta.fragmentosSubclasse && <span style={{ color: '#C27BF0' }}>{nomeDaSubclasse(resposta.fragmentosSubclasse.subclasseId)} +{resposta.fragmentosSubclasse.quantidade}</span>}
          <span style={{ color: DOURADO }}>{T.ouro} +{resposta.ouro}</span>
          {resposta.diamantes > 0 && <span style={{ color: '#5AA7F0' }}>{T.diamantes} +{resposta.diamantes}</span>}
        </div>
        <div className="font-cinzel font-bold" style={{ marginTop: u(8), fontSize: u(8), color: '#E6C775' }}>{T.lutas}</div>
        <ul className="flex flex-col" style={{ marginTop: u(4), gap: u(3) }}>
          {resposta.ondas.map((o, i) => (
            <li key={`${o.monstroId}-${i}`} className="flex items-center justify-between font-semibold" style={{ fontSize: u(7.5), color: CREME, gap: u(6) }}>
              <span className="truncate">{o.chefe ? `${T.chefe} · ` : ''}{o.nome}</span>
              <span className="shrink-0 font-black" style={{ color: o.vencedor === 'personagem' ? '#7FE08A' : '#FF9A8F' }}>{o.vencedor === 'personagem' ? T.hp(Math.round(o.hpFinal)) : T.derrota}</span>
            </li>
          ))}
        </ul>
        {d.id === 'inferno' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={RETRATO_DO_SEGUNDO_CHEFE} alt="" aria-hidden draggable={false} className="absolute" style={{ right: u(10), bottom: u(46), width: u(36), height: u(36), ...pixel, opacity: 0.9 }} />
        )}
        <p className="text-center font-semibold" style={{ position: 'absolute', left: 0, right: 0, bottom: u(44), fontSize: u(6.5), color: '#B8A27A' }}>{T.restantesHoje(resposta.tentativasRestantes, porDia)}</p>
        <button type="button" onClick={aoVoltar} className="absolute cursor-pointer" style={{ left: '50%', bottom: u(10), width: u(170), height: u(27), transform: 'translateX(-50%)', backgroundImage: `url(${BATALHA_UI.botao})`, backgroundSize: '100% 100%', ...pixel }}>
          <span className="font-cinzel font-black uppercase" style={{ fontSize: u(8.5), color: CREME, textShadow: SOMBRA_DO_TEXTO }}>{T.voltarAsDificuldades}</span>
        </button>
      </section>
    </PalcoPixel>
  );
}
