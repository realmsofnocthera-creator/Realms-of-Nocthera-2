'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { chefeDoDia, faixaDoChefeMundial, FAIXAS_DO_CHEFE_MUNDIAL, montarChefeMundial, type FaixaDoChefeMundial } from '@/rules/chefeMundial';
import { ARTE_DOS_CHEFES_MUNDIAIS } from '@/assets/chefesMundiaisArte';
import { COLUNAS_DO_CABECALHO, ESPACOS_DA_BANDEJA, ESPACOS_DO_PAINEL, fundoDoChefe, LINHAS, linhaDoRanking, POSICAO, TELA_DO_CHEFE } from '@/assets/chefeMundialTelaUi';
import { ICONES_DOS_SELOS } from '@/assets/buscarUi';
import { HUD_ICONS } from '@/assets/hud';
import { ICONES_DE_SALDO } from '@/assets/mochilaUi';
import { resolveAvatarSrc } from '@/assets/avatars';
import { CombateCacada } from '@/components/cacada/CombateCacada';
import { SELOS_DE_BUSCA, type SeloDeBusca } from '@/rules/colecionaveis';
import { TEXTOS_DO_CHEFE_MUNDIAL as T } from '@/rules/textosDoChefeMundial';
import { tempoAteFechar, nomeCurtoDoChefe, subtituloDoChefe, valorCompacto } from '@/lib/chefeMundialTela';
import type { ResultadoCombate } from '@/game/combat';
import type { CharacterDocument } from '@/server/characterService';
import type { EstadoDoChefeMundial } from '@/server/chefeMundial';

type Token = () => Promise<string | null>;
const CREME = '#F5E3B3';
const DOURADO = '#FFD76A';
const pixel = { imageRendering: 'pixelated' } as const;
/** Um tamanho da arte (grade de 360 x 540) em pixels da tela: a tela escala com o menor lado. */
const u = (n: number) => `calc(var(--u) * ${n})`;
const sombra = '0 1px 0 #000, 0 0 3px #000';

async function chamar(tokenFresco: Token, post = false): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/chefe-mundial', { method: post ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token ?? ''}` } });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: T.semConexao } };
  }
}

const numero = (n: number) => n.toLocaleString('pt-BR');

/** Uma peça da arte posicionada na grade. */
function Peca({ src, p, className = '', style, children }: { src: string; p: { x: number; y: number; l: number; a: number }; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div className={`absolute ${className}`} style={{ left: u(p.x), top: u(p.y), width: u(p.l), height: u(p.a), backgroundImage: `url(${src})`, backgroundSize: '100% 100%', ...pixel, ...style }}>
      {children}
    </div>
  );
}

/** Um texto no meio de uma faixa da grade (centro x, centro y), com contorno para ler sobre a arte. */
function Texto({ x, y, tamanho, children, cor = CREME, alinhar = 'center', largura, negrito = true }: { x: number; y: number; tamanho: number; children: React.ReactNode; cor?: string; alinhar?: 'center' | 'left' | 'right'; largura?: number; negrito?: boolean }) {
  const l = largura ?? 200;
  const esquerda = alinhar === 'center' ? x - l / 2 : alinhar === 'left' ? x : x - l;
  return (
    <span className="absolute font-cinzel leading-none whitespace-nowrap overflow-hidden text-ellipsis" style={{ left: u(esquerda), top: u(y), width: u(l), height: u(tamanho * 1.3), marginTop: u(-tamanho * 0.65), textAlign: alinhar, fontSize: u(tamanho), color: cor, textShadow: sombra, fontWeight: negrito ? 800 : 500, display: 'flex', alignItems: 'center', justifyContent: alinhar === 'center' ? 'center' : alinhar === 'left' ? 'flex-start' : 'flex-end' }}>
      {children}
    </span>
  );
}

/** Os prêmios de uma faixa, um por espaço: ouro, Diamantes, Essência de Soberano e (se houver) o selo mais raro. */
function premiosDaFaixa(f: FaixaDoChefeMundial): { chave: string; icone: string; valor: number; nome: string }[] {
  const selo = [...SELOS_DE_BUSCA].reverse().find((s: SeloDeBusca) => f.selos[s]);
  return [
    { chave: 'ouro', icone: HUD_ICONS.ouro, valor: f.ouro, nome: T.ouro },
    { chave: 'diamantes', icone: HUD_ICONS.diamante, valor: f.diamantes, nome: T.diamantes },
    { chave: 'essencia', icone: ICONES_DE_SALDO.essenciaDeSoberano, valor: f.essenciaDeSoberano, nome: T.essencia },
    ...(selo ? [{ chave: `selo-${selo}`, icone: ICONES_DOS_SELOS[selo], valor: f.selos[selo]!, nome: T.selos }] : []),
  ];
}

function EspacoDePremio({ espaco, premio }: { espaco: { x: number; y: number; l: number; a: number }; premio: { icone: string; valor: number; nome: string } }) {
  return (
    <div className="absolute flex flex-col items-center justify-center" style={{ left: u(espaco.x), top: u(espaco.y), width: u(espaco.l), height: u(espaco.a) }} title={`${premio.nome}: ${numero(premio.valor)}`} role="img" aria-label={`${premio.nome}: ${numero(premio.valor)}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={premio.icone} alt="" aria-hidden draggable={false} style={{ width: '62%', height: '62%', objectFit: 'contain', ...pixel }} />
      <span className="font-cinzel font-black leading-none" style={{ fontSize: u(6), color: CREME, textShadow: sombra, marginTop: u(-1) }}>{valorCompacto(premio.valor)}</span>
    </div>
  );
}

const CSS = `
@keyframes chefeFlutua{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--u) * -3))}}
@media (prefers-reduced-motion: reduce){.chefe-flutua{animation:none !important}}
`;

/** Provação de Chefe Mundial: um chefe por dia; lutas ilimitadas; vale o maior dano; a recompensa chega pelo Correio. */
export function ChefeMundialScreen({ tokenFresco, personagem }: { tokenFresco: Token; personagem?: CharacterDocument }) {
  const [estado, setEstado] = useState<EstadoDoChefeMundial | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [verRanking, setVerRanking] = useState(false);
  /** Diferença entre o relógio do servidor e o do aparelho (a contagem usa a hora do servidor). */
  const [diferenca, setDiferenca] = useState(0);
  /** A luta que está passando (o replay animado), com o dano dela. */
  const [luta, setLuta] = useState<{ resultado: ResultadoCombate; dano: number; melhor: number; dia: string; antes: CharacterDocument } | null>(null);

  const receber = useCallback((e: EstadoDoChefeMundial) => {
    setEstado(e);
    setDiferenca(Date.parse(e.agora) - Date.now());
  }, []);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) receber(r.dados as unknown as EstadoDoChefeMundial);
    else setErroAoCarregar(true);
  }, [tokenFresco, receber]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  async function lutar() {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, true);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? T.naoFoiPossivelLutar), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? T.feito), erro: false });
    const novo = r.dados.estado as EstadoDoChefeMundial;
    receber(novo);
    const resultado = r.dados.resultado as ResultadoCombate | undefined;
    // com o personagem e a arte do chefe, mostra a luta animada; senão fica só a mensagem
    if (personagem && resultado && ARTE_DOS_CHEFES_MUNDIAIS[novo.chefeId]) {
      setLuta({ resultado, dano: Number(r.dados.dano ?? 0), melhor: Number(r.dados.melhor ?? 0), dia: novo.dia, antes: personagem });
    }
  }

  const bloqueado = !!estado && estado.meuNivel < estado.nivelNecessario;

  if (luta) {
    const chefe = chefeDoDia(luta.dia);
    return (
      <CombateCacada
        resultado={luta.resultado}
        personagem={luta.antes}
        monstro={montarChefeMundial(luta.dia)}
        titulo={T.chefeNaLuta(chefe.nome)}
        cena={ARTE_DOS_CHEFES_MUNDIAIS[chefe.id]}
        melhorDoDia={luta.melhor}
        onFim={() => undefined}
        telaDeFim={{
          retrato: resolveAvatarSrc(luta.antes.avatarId, luta.antes.classeId),
          aviso: T.danoDaLuta(numero(luta.dano), numero(luta.melhor)),
          voltar: { rotulo: T.voltarDaLuta, acao: () => setLuta(null) },
          repetir: { rotulo: T.lutarDeNovo, acao: () => { setLuta(null); void lutar(); } },
        }}
      />
    );
  }

  const chefeId = estado?.chefeId ?? 'solvaris';
  const arte = ARTE_DOS_CHEFES_MUNDIAIS[chefeId];
  const fundo = fundoDoChefe(chefeId);
  const horaDoServidor = agora + diferenca;
  const faixa = estado?.minhaPosicao ? faixaDoChefeMundial(estado.minhaPosicao) : FAIXAS_DO_CHEFE_MUNDIAL[FAIXAS_DO_CHEFE_MUNDIAL.length - 1];
  const premios = premiosDaFaixa(faixa);
  const premiosDoPrimeiro = premiosDaFaixa(FAIXAS_DO_CHEFE_MUNDIAL[0]).slice(0, 3);

  return (
    <main className="fixed inset-0 select-none overflow-hidden" style={{ backgroundColor: '#0d0a12' }}>
      <style>{CSS}</style>
      {/* o que sobra em volta da cena (telas mais altas que 2:3) é o mesmo fundo, desfocado e escuro */}
      <div aria-hidden className="absolute inset-0" style={{ backgroundImage: `url(${fundo})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(8px) brightness(.45)', transform: 'scale(1.1)', ...pixel }} />
      <div className="absolute left-1/2 top-1/2" style={{ aspectRatio: '360 / 540', height: 'min(100dvh, calc(100vw * 1.5))', transform: 'translate(-50%, -50%)', containerType: 'size', ['--u' as string]: 'calc(100cqh / 540)' }}>
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundImage: `url(${fundo})`, backgroundSize: '100% 100%', ...pixel }}>
          {!verRanking && (
            <>
              {/* o chefe do dia */}
              {arte && (
                <div className="absolute chefe-flutua" style={{ left: u(POSICAO.chefe.x), top: u(POSICAO.chefe.y), width: u(POSICAO.chefe.l), height: u(POSICAO.chefe.a), animation: 'chefeFlutua 3.2s ease-in-out infinite' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={arte.camada} alt={estado?.chefe ?? T.titulo} draggable={false} className="w-full h-full" style={pixel} />
                </div>
              )}

              {/* título, nome e subtítulo */}
              <Peca src={TELA_DO_CHEFE.banner} p={POSICAO.banner}>
                <Texto x={115} y={33} tamanho={6.5} cor="#D8C08F" largura={200} negrito={false}>{T.titulo.toUpperCase()}</Texto>
                <Texto x={115} y={47} tamanho={estado && nomeCurtoDoChefe(estado.chefe).length > 8 ? 11 : 13} cor="#F3D58A" largura={140}>{estado ? nomeCurtoDoChefe(estado.chefe) : T.titulo}</Texto>
              </Peca>
              <Peca src={TELA_DO_CHEFE.fita} p={POSICAO.fita}>
                <Texto x={75} y={12.5} tamanho={5.6} largura={120}>{estado ? subtituloDoChefe(estado.chefe).toUpperCase() : ''}</Texto>
              </Peca>

              {/* tempo restante e posição */}
              <Peca src={TELA_DO_CHEFE.info} p={POSICAO.tempo}>
                <Texto x={69} y={9} tamanho={5.4} cor="#D8C08F" largura={80} negrito={false}>{T.tempoRestante.toUpperCase()}</Texto>
                <Texto x={69} y={19} tamanho={8.5} largura={80}>{estado ? tempoAteFechar(estado.fechaEm, horaDoServidor) : '--:--:--'}</Texto>
              </Peca>
              <Peca src={TELA_DO_CHEFE.ampulheta} p={POSICAO.ampulheta} />
              <Peca src={TELA_DO_CHEFE.info} p={POSICAO.posicao}>
                <Texto x={49} y={9} tamanho={5.4} cor="#D8C08F" largura={80} negrito={false}>{T.ranking.toUpperCase()}</Texto>
                <Texto x={49} y={19} tamanho={8.5} largura={80}>{estado?.minhaPosicao ? T.lugar(estado.minhaPosicao).toUpperCase() : T.semPosicao.toUpperCase()}</Texto>
              </Peca>
              <Peca src={TELA_DO_CHEFE.trofeu} p={POSICAO.trofeu} />

              {/* as recompensas da sua faixa */}
              <Peca src={TELA_DO_CHEFE.bandeja} p={POSICAO.bandeja} />
              {estado && premios.map((p, i) => ESPACOS_DA_BANDEJA[i] && <EspacoDePremio key={p.chave} espaco={ESPACOS_DA_BANDEJA[i]} premio={p} />)}
              {estado && (
                <span className="absolute font-cinzel font-bold leading-none whitespace-nowrap" style={{ left: u(POSICAO.bandeja.x), top: u(POSICAO.bandeja.y + POSICAO.bandeja.a + 3), fontSize: u(6), color: CREME, textShadow: sombra, backgroundColor: 'rgba(8,6,12,.72)', padding: `${u(2)} ${u(4)}` }}>
                  {estado.minhaPosicao ? T.faixa(faixa.nome) : T.faixaSemLuta(faixa.nome)}
                </span>
              )}

              {/* o melhor dano e o botão de lutar */}
              <Peca src={TELA_DO_CHEFE.dano} p={POSICAO.dano}>
                <Texto x={65} y={47} tamanho={5.8} cor="#D8C08F" largura={100} negrito={false}>{T.danoMaximo.toUpperCase()}</Texto>
                <Texto x={65} y={57} tamanho={9} largura={100}>{estado ? numero(estado.meuMelhor) : '0'}</Texto>
              </Peca>
              <button type="button" disabled={ocupado || bloqueado || !estado} onClick={() => void lutar()} aria-label={T.lutar} className="absolute cursor-pointer disabled:cursor-not-allowed active:translate-y-px"
                style={{ left: u(POSICAO.botao.x), top: u(POSICAO.botao.y), width: u(POSICAO.botao.l), height: u(POSICAO.botao.a), backgroundImage: `url(${ocupado || bloqueado || !estado ? TELA_DO_CHEFE.botaoOff : TELA_DO_CHEFE.botao})`, backgroundSize: '100% 100%', ...pixel }}>
                <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ fontSize: u(10), color: CREME, textShadow: sombra, paddingBottom: u(1) }}>{ocupado ? T.lutando : T.lutar}</span>
              </button>

              {/* voltar e ranking */}
              <Link href="/provacoes" aria-label={T.voltar} className="absolute active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${TELA_DO_CHEFE.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
              <button type="button" onClick={() => setVerRanking(true)} aria-label={T.abrirRanking} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.ranking.x), top: u(POSICAO.ranking.y), width: u(POSICAO.ranking.l), height: u(POSICAO.ranking.a), backgroundImage: `url(${TELA_DO_CHEFE.ranking})`, backgroundSize: '100% 100%', ...pixel }} />
              <Link href="/correio" className="absolute font-cinzel font-bold underline" style={{ left: u(6), top: u(486), fontSize: u(6.5), color: CREME, textShadow: sombra }}>{T.correio}</Link>

              {(aviso || erroAoCarregar || bloqueado) && (
                <p role={aviso?.erro || erroAoCarregar || bloqueado ? 'alert' : 'status'} className="absolute font-cinzel font-bold text-center" style={{ left: u(30), width: u(300), top: u(222), fontSize: u(7), color: aviso?.erro || erroAoCarregar || bloqueado ? '#FF9A8F' : '#B8F0B0', textShadow: sombra, backgroundColor: 'rgba(8,6,12,.72)', padding: `${u(3)} ${u(4)}` }}>
                  {erroAoCarregar ? T.erroAoCarregar : bloqueado && estado ? T.nivel(estado.nivelNecessario, estado.meuNivel) : aviso?.texto}
                </p>
              )}
              {!estado && !erroAoCarregar && <p className="absolute font-cinzel font-bold text-center w-full" style={{ top: u(250), fontSize: u(8), color: CREME, textShadow: sombra }}>{T.carregando}</p>}
            </>
          )}

          {verRanking && (
            <>
              <div aria-hidden className="absolute inset-0" style={{ backgroundColor: 'rgba(8,5,10,.82)' }} />
              <Peca src={TELA_DO_CHEFE.fita} p={POSICAO.tituloDoRanking}>
                <Texto x={75} y={12.5} tamanho={7} largura={130}>{T.rankingDoDia.toUpperCase()}</Texto>
              </Peca>
              <button type="button" onClick={() => setVerRanking(false)} aria-label={T.fechar} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.fechar.x), top: u(POSICAO.fechar.y), width: u(POSICAO.fechar.l), height: u(POSICAO.fechar.a), backgroundImage: `url(${TELA_DO_CHEFE.fechar})`, backgroundSize: '100% 100%', ...pixel }} />
              <Peca src={TELA_DO_CHEFE.painelRank} p={POSICAO.painelRank} />
              {/* a faixa escura do cabeçalho das colunas (a arte do Yuri a traz desenhada na tela de exemplo, não como peça) */}
              <div aria-hidden className="absolute" style={{ left: u(44), top: u(COLUNAS_DO_CABECALHO.y - 6.5), width: u(188), height: u(13), backgroundColor: '#0d0c10', border: `${u(0.8)} solid #8a6d2a` }} />
              <Texto x={COLUNAS_DO_CABECALHO.numeroX} y={COLUNAS_DO_CABECALHO.y} tamanho={5.6} cor="#C8A25A" largura={40}>{T.colunaPosicao}</Texto>
              <Texto x={COLUNAS_DO_CABECALHO.jogadorX} y={COLUNAS_DO_CABECALHO.y} tamanho={5.6} cor="#C8A25A" largura={60}>{T.colunaJogador.toUpperCase()}</Texto>
              <Texto x={COLUNAS_DO_CABECALHO.danoX} y={COLUNAS_DO_CABECALHO.y} tamanho={5.6} cor="#C8A25A" largura={70}>{T.colunaDano.toUpperCase()}</Texto>
              {estado && estado.ranking.length === 0 && <Texto x={137} y={230} tamanho={7} largura={200} negrito={false}>{T.ninguemLutou}</Texto>}
              <ol aria-label={T.rankingDoDia} className="contents">
                {estado?.ranking.slice(0, 10).map((r, i) => {
                  const y = LINHAS.primeiraY + LINHAS.passo * i;
                  const centro = y + LINHAS.a / 2;
                  return (
                    <li key={`${r.posicao}-${i}`} className="contents">
                      <Peca src={linhaDoRanking(r.posicao)} p={{ x: LINHAS.x, y, l: LINHAS.l, a: LINHAS.a }} />
                      <Texto x={LINHAS.numeroX} y={centro} tamanho={r.posicao >= 10 ? 8 : 10} largura={30}>{r.posicao}</Texto>
                      <Texto x={LINHAS.nomeX} y={centro} tamanho={6.6} alinhar="left" largura={60}>{r.nome}</Texto>
                      <Texto x={LINHAS.danoFimX} y={centro} tamanho={6.6} alinhar="right" largura={60}>{numero(r.dano)}</Texto>
                    </li>
                  );
                })}
              </ol>
              <Peca src={TELA_DO_CHEFE.linhaEu} p={POSICAO.linhaEu} />
              <Texto x={50} y={POSICAO.linhaEu.y + 18} tamanho={estado?.minhaPosicao && estado.minhaPosicao >= 10 ? 8 : 10} largura={36}>{estado?.minhaPosicao ?? '-'}</Texto>
              <Texto x={90} y={POSICAO.linhaEu.y + 18} tamanho={6.6} alinhar="left" largura={60}>{T.voce}</Texto>
              <Texto x={252} y={POSICAO.linhaEu.y + 18} tamanho={6.6} alinhar="right" largura={70}>{estado ? numero(estado.meuMelhor) : '0'}</Texto>

              <Peca src={TELA_DO_CHEFE.painelRec} p={POSICAO.painelRec} />
              {premiosDoPrimeiro.map((p, i) => <EspacoDePremio key={p.chave} espaco={ESPACOS_DO_PAINEL[i]} premio={p} />)}
              <Texto x={POSICAO.painelRec.x + 31} y={POSICAO.painelRec.y + 84} tamanho={5} cor="#C8A25A" largura={60}>{T.premioDoPrimeiro.toUpperCase()}</Texto>
              <p className="absolute font-cinzel font-semibold text-center" style={{ left: u(6), width: u(348), top: u(516), fontSize: u(5.4), lineHeight: 1.25, color: CREME, textShadow: sombra }}>{T.regra}</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
