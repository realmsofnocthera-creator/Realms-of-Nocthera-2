'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PalcoPixel, Peca, Texto, u, pixel, SOMBRA_DO_TEXTO } from '@/components/pixel/GradePixel';
import { DORSO, MOLDURA_DA_CARTA, PILAR, POSICAO, SELO_DA_DIFICULDADE, TESTE_UI, topoDaDificuldade } from '@/assets/testeEquipeUi';
import { ARENAS_DO_TESTE } from '@/assets/arenasDoTeste';
import { ArteDaCarta } from '@/components/alma/ArteDaCarta';
import { CombateEmGrupo } from './CombateEmGrupo';
import { CATEGORIAS_DO_TESTE, NOMES_DAS_DIFICULDADES, TAMANHO_MAXIMO_DA_PARTY, TAMANHO_MINIMO_DO_TESTE, type CartaGanha, type CategoriaDoTeste, type ReplayDoTeste, type ResultadoDaParty } from '@/rules/testeEquipe';
import { TEXTOS_DO_TESTE_EQUIPE as T } from '@/rules/textosDoTesteEquipe';
import { indiceDaRaridade, maiorRaridadeDaDificuldade, podeIniciar, segmentosDoFeixe } from '@/lib/testeEquipeTela';
import type { EstadoDoTeste } from '@/server/testeEquipe';

type Token = () => Promise<string | null>;
const CREME = '#F5E3B3';
const DOURADO = '#F3C769';
const SUB = '#C8A25A';
/** Enquanto está numa party, a tela recarrega sozinha para ver quem entrou e quem marcou "Pronto". */
const ATUALIZAR_A_CADA_MS = 15_000;

type Vista = 'testes' | 'party' | 'dificuldades' | 'recompensas';

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/teste-equipe', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: T.semConexao } };
  }
}

/** O botão largo do Yuri (dourado, cinza quando desligado, escuro ao apertar) com o texto por cima. */
function BotaoLargo({ p, children, onClick, disabled, rotulo }: { p: { x: number; y: number; l: number; a: number }; children: React.ReactNode; onClick: () => void; disabled?: boolean; rotulo?: string }) {
  const [apertado, setApertado] = useState(false);
  const src = disabled ? TESTE_UI.botaoOff : apertado ? TESTE_UI.botaoPress : TESTE_UI.botao;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={rotulo}
      onPointerDown={() => setApertado(true)} onPointerUp={() => setApertado(false)} onPointerLeave={() => setApertado(false)} onPointerCancel={() => setApertado(false)}
      className="absolute cursor-pointer disabled:cursor-not-allowed" style={{ left: u(p.x), top: u(p.y), width: u(p.l), height: u(p.a), backgroundImage: `url(${src})`, backgroundSize: '100% 100%', ...pixel }}>
      <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ fontSize: u(11), color: disabled ? '#A99C80' : CREME, textShadow: SOMBRA_DO_TEXTO, paddingBottom: u(apertado ? 0 : 2), paddingTop: u(apertado ? 2 : 0) }}>{children}</span>
    </button>
  );
}

/**
 * Teste de Equipe (7.4): party (até 3, sem precisar de guilda), todos marcam "Pronto", o líder escolhe o teste (Alma, Corpo ou Mente) e a
 * dificuldade e inicia. Cada membro gasta 1 chave da provação (ou 1 selo do abismo no Inferno). Em pixel art do Yuri, em quatro vistas:
 * escolher o teste, a party, as dificuldades e as recompensas.
 */
export function TesteEquipeScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDoTeste | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [vista, setVista] = useState<Vista>('testes');
  const [categoria, setCategoria] = useState<CategoriaDoTeste>('corpo');
  const [dificuldade, setDificuldade] = useState(1);
  const [convidado, setConvidado] = useState('');
  const [regras, setRegras] = useState(false);
  const [desfecho, setDesfecho] = useState<{ resultado: ResultadoDaParty; cacos: number; poeira: number; diamantes: number; cartas: CartaGanha[] } | null>(null);
  // a luta em grupo, reproduzida antes da tela de recompensas
  const [luta, setLuta] = useState<ReplayDoTeste | null>(null);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDoTeste);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const party = estado?.minhaParty ?? null;
  const naParty = !!party;
  useEffect(() => {
    if (!naParty) return;
    const id = setInterval(() => void carregar(), ATUALIZAR_A_CADA_MS);
    return () => clearInterval(id);
  }, [naParty, carregar]);

  // quem já está numa party abre direto nela
  const [abriu, setAbriu] = useState(false);
  useEffect(() => {
    if (estado && !abriu) {
      setAbriu(true);
      if (estado.minhaParty) setVista('party');
    }
  }, [estado, abriu]);

  const agir = async (acao: string, extra: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> => {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao, ...extra });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? T.naoFoiPossivel), erro: true });
      return null;
    }
    setAviso({ texto: String(r.dados.mensagem ?? T.feito), erro: false });
    setEstado(r.dados.estado as EstadoDoTeste);
    return r.dados;
  };

  const iniciar = async () => {
    const teste = estado?.testes.find((t) => t.categoria === categoria);
    const regra = teste?.dificuldades.find((d) => d.dificuldade === dificuldade);
    const dados = await agir('iniciar', { categoria, dificuldade });
    if (dados && regra) {
      const resultado = dados.resultado as ResultadoDaParty;
      setDesfecho({ resultado, cacos: regra.cacos, poeira: regra.poeira, diamantes: regra.diamantes, cartas: (dados.cartasGanhas as CartaGanha[] | undefined) ?? [] });
      const replay = dados.replay as ReplayDoTeste | undefined;
      // a mensagem de vitória só aparece depois da luta
      setAviso(null);
      if (replay) setLuta(replay);
      else setVista('recompensas');
    }
  };

  const teste = estado?.testes.find((t) => t.categoria === categoria);
  const escolhida = teste?.dificuldades.find((d) => d.dificuldade === dificuldade);
  const souLider = !!party?.souLider;
  const pronto = (uid: string) => !!party?.membros.find((m) => m.uid === uid)?.pronto;
  const nivelBaixo = !!estado && estado.meuNivel < estado.nivelNecessario;
  const pode = !!estado && !!party && !!escolhida && podeIniciar({ souLider, membros: party.membros.length, todosProntos: party.membros.every((m) => m.pronto), liberada: escolhida.liberada, custo: escolhida.custo, chaves: estado.chaves.gratisRestantes + estado.chaves.guardadas, selos: estado.selos });

  const titulo = vista === 'testes' ? T.titulo : vista === 'party' ? T.nomeDoTeste[categoria] : vista === 'dificuldades' ? T.dificuldades : desfecho?.resultado.venceu ? T.vitoria : T.derrota;
  const subtitulo = vista === 'testes' ? T.escolhaOTeste : vista === 'party' ? T.suaParty : vista === 'dificuldades' ? T.nomeDoTeste[categoria] : `${T.nomeDoTeste[desfecho?.resultado.categoria ?? categoria]} · ${NOMES_DAS_DIFICULDADES[(desfecho?.resultado.dificuldade ?? 1) - 1]}`;
  const voltar = () => {
    setAviso(null);
    if (vista === 'dificuldades') setVista('party');
    else if (vista === 'recompensas') setVista(party ? 'party' : 'testes');
    else if (vista === 'party') setVista('testes');
  };

  if (luta) {
    return <CombateEmGrupo replay={luta} mapa={ARENAS_DO_TESTE[luta.categoria]} onFim={() => { setLuta(null); setVista('recompensas'); }} />;
  }

  return (
    <PalcoPixel fundo={vista === 'testes' ? TESTE_UI.fundo : TESTE_UI.fundoDesfocado}>
      {/* o título e os cantos */}
      <Peca src={TESTE_UI.titulo} p={POSICAO.titulo}>
        <Texto x={115} y={51} tamanho={vista === 'dificuldades' ? 12 : 13} caixaAlta largura={170}>{titulo}</Texto>
        <Texto x={115} y={64} tamanho={6.2} cor={SUB} negrito={false} largura={170} caixaAlta>{subtitulo}</Texto>
      </Peca>
      {vista === 'testes' ? (
        <Link href="/provacoes" aria-label={T.voltarAsProvacoes} className="absolute active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${TESTE_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
      ) : (
        <button type="button" onClick={voltar} aria-label={T.voltar} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.voltar.x), top: u(POSICAO.voltar.y), width: u(POSICAO.voltar.l), height: u(POSICAO.voltar.a), backgroundImage: `url(${TESTE_UI.voltar})`, backgroundSize: '100% 100%', ...pixel }} />
      )}
      <button type="button" onClick={() => setRegras(true)} aria-label={T.regras} className="absolute cursor-pointer active:translate-y-px" style={{ left: u(POSICAO.livro.x), top: u(POSICAO.livro.y), width: u(POSICAO.livro.l), height: u(POSICAO.livro.a), backgroundImage: `url(${TESTE_UI.livro})`, backgroundSize: '100% 100%', ...pixel }} />

      {erroAoCarregar && <p role="alert" className="absolute font-cinzel font-bold text-center" style={{ left: u(30), width: u(300), top: u(250), fontSize: u(8), color: '#FF9A8F', textShadow: SOMBRA_DO_TEXTO }}>{T.erroAoCarregar}</p>}
      {!estado && !erroAoCarregar && <p className="absolute font-cinzel font-bold text-center w-full" style={{ top: u(260), fontSize: u(8), color: CREME, textShadow: SOMBRA_DO_TEXTO }}>{T.carregando}</p>}
      {aviso && (
        <p role={aviso.erro ? 'alert' : 'status'} className="absolute font-cinzel font-bold text-center z-20" style={{ left: u(30), width: u(300), top: u(90), fontSize: u(7), color: aviso.erro ? '#FF9A8F' : '#B8F0B0', textShadow: SOMBRA_DO_TEXTO, backgroundColor: 'rgba(8,6,12,.82)', padding: `${u(3)} ${u(4)}` }}>{aviso.texto}</p>
      )}

      {estado && vista === 'testes' && (
        <>
          {CATEGORIAS_DO_TESTE.map((c) => {
            const aceso = c === categoria;
            const p = POSICAO.pilares[c];
            return (
              <button key={c} type="button" onClick={() => setCategoria(c)} aria-pressed={aceso} aria-label={T.nomeDoTeste[c]} className="absolute cursor-pointer" style={{ left: u(p.x), top: u(p.y), width: u(p.l), height: u(p.a), backgroundImage: `url(${PILAR(c, aceso)})`, backgroundSize: '100% 100%', filter: aceso ? 'drop-shadow(0 0 6px rgba(255,190,90,.7))' : undefined, ...pixel }} />
            );
          })}
          {CATEGORIAS_DO_TESTE.map((c, i) => (
            <Peca key={c} src={TESTE_UI.placaNome} p={{ x: POSICAO.placaNome.xs[i], y: POSICAO.placaNome.y, l: POSICAO.placaNome.l, a: POSICAO.placaNome.a }}>
              <Texto x={52} y={9} tamanho={7.6} caixaAlta largura={92} cor={c === categoria ? '#F3D58A' : CREME}>{T.nomeDoTeste[c]}</Texto>
              <Texto x={52} y={18} tamanho={5} caixaAlta largura={92} cor={SUB} negrito={false}>{T.cartasDe(T.nomeDaCategoria[c])}</Texto>
            </Peca>
          ))}
          {/* as chaves */}
          <Peca src={TESTE_UI.chaveGratis} p={{ x: POSICAO.chaves.xs[0], y: POSICAO.chaves.y, l: 22, a: 49 }} />
          <Texto x={POSICAO.chaves.xs[0] + POSICAO.chaves.textoDX} y={POSICAO.chaves.y + 15} tamanho={7} alinhar="left" caixaAlta largura={80}>{T.gratis(estado.chaves.gratisRestantes, estado.chaves.gratisPorDia)}</Texto>
          <Texto x={POSICAO.chaves.xs[0] + POSICAO.chaves.textoDX} y={POSICAO.chaves.y + 25} tamanho={5} alinhar="left" caixaAlta largura={80} cor={SUB} negrito={false}>{T.porDia}</Texto>
          <button type="button" disabled={ocupado || estado.chaves.comprasRestantes <= 0 || estado.diamantes < estado.chaves.preco} onClick={() => void agir('comprarChave')} aria-label={T.aComprar(estado.chaves.comprasRestantes, estado.chaves.preco)} className="absolute cursor-pointer disabled:cursor-not-allowed" style={{ left: u(POSICAO.chaves.xs[1] - 2), top: u(POSICAO.chaves.y), width: u(110), height: u(50), opacity: estado.chaves.comprasRestantes > 0 ? 1 : 0.85 }}>
            <Peca src={TESTE_UI.chaveComprada} p={{ x: 2, y: 0, l: 22, a: 47 }} />
            <Texto x={28} y={15} tamanho={7} alinhar="left" caixaAlta largura={80}>{T.guardadas(estado.chaves.guardadas)}</Texto>
            <Texto x={28} y={25} tamanho={5} alinhar="left" largura={82} cor={SUB} negrito={false} caixaAlta>{T.aComprar(estado.chaves.comprasRestantes, estado.chaves.preco)}</Texto>
          </button>
          <Peca src={TESTE_UI.chaveAbismo} p={{ x: POSICAO.chaves.xs[2], y: POSICAO.chaves.y, l: 24, a: 50 }} />
          <Texto x={POSICAO.chaves.xs[2] + 28} y={POSICAO.chaves.y + 15} tamanho={7} alinhar="left" caixaAlta largura={80}>{T.selos(estado.selos)}</Texto>
          <Texto x={POSICAO.chaves.xs[2] + 28} y={POSICAO.chaves.y + 25} tamanho={5} alinhar="left" caixaAlta largura={80} cor={SUB} negrito={false}>{T.doAbismo}</Texto>

          <BotaoLargo p={POSICAO.botaoFormar} disabled={ocupado || nivelBaixo} onClick={() => (party ? setVista('party') : void agir('criar').then((d) => d && setVista('party')))}>
            {party ? T.irParaAParty : T.formarParty}
          </BotaoLargo>
          <Texto x={180} y={472} tamanho={5.6} cor={nivelBaixo ? '#FF9A8F' : SUB} negrito={false} caixaAlta largura={300}>
            {nivelBaixo ? T.nivel(estado.nivelNecessario, estado.meuNivel) : T.requisito(estado.nivelNecessario, TAMANHO_MINIMO_DO_TESTE, TAMANHO_MAXIMO_DA_PARTY)}
          </Texto>

          {/* convites recebidos */}
          {estado.convites.length > 0 && (
            <ul aria-label={T.convites} className="absolute z-10" style={{ left: u(20), width: u(320), top: u(92), display: 'flex', flexDirection: 'column', gap: u(3) }}>
              {estado.convites.map((c) => (
                <li key={c.partyId} className="flex items-center justify-between" style={{ backgroundColor: 'rgba(8,6,12,.86)', border: `${u(0.8)} solid #8a6d2a`, padding: `${u(3)} ${u(5)}`, gap: u(4) }}>
                  <span className="font-cinzel font-bold truncate" style={{ fontSize: u(7), color: CREME }}>{T.chamouVoce(c.de)}</span>
                  <span className="shrink-0 flex" style={{ gap: u(3) }}>
                    <button type="button" disabled={ocupado || nivelBaixo} onClick={() => void agir('aceitar', { partyId: c.partyId }).then((d) => d && setVista('party'))} className="font-cinzel font-black uppercase cursor-pointer disabled:opacity-50" style={{ fontSize: u(6.5), color: '#B8F0B0', border: `${u(0.8)} solid #5a8a50`, padding: `${u(1.5)} ${u(4)}` }}>{T.aceitar}</button>
                    <button type="button" disabled={ocupado} onClick={() => void agir('recusar', { partyId: c.partyId })} className="font-cinzel font-black uppercase cursor-pointer disabled:opacity-50" style={{ fontSize: u(6.5), color: '#FF9A8F', border: `${u(0.8)} solid #8a4a40`, padding: `${u(1.5)} ${u(4)}` }}>{T.recusar}</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {estado && vista === 'party' && (
        <>
          {POSICAO.altares.xs.map((x, i) => {
            const membro = party?.membros[i];
            const convite = !membro ? party?.convites[i - (party?.membros.length ?? 0)] : undefined;
            const aberta = !membro && !convite;
            const eu = !!membro && membro.uid === estado.meuUid;
            const src = membro ? (membro.pronto ? TESTE_UI.altarPronto : TESTE_UI.altarOcupado) : aberta && !souLider ? TESTE_UI.altarTrancado : TESTE_UI.altarVazio;
            const nome = membro ? membro.nome : convite ? convite.nome : aberta ? (souLider ? T.chamar : T.vazio) : '';
            const al = POSICAO.altares;
            return (
              <div key={i}>
                <Peca src={src} p={{ x, y: al.y, l: al.l, a: al.a }} style={!membro ? { opacity: convite ? 0.85 : 1 } : undefined} />
                {membro && (
                  <>
                    <div aria-hidden className="absolute flex items-center justify-center" style={{ left: u(x + al.circulo.cx - 32), top: u(al.y + al.circulo.cy - 32), width: u(64), height: u(64), borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #3a2d18, #0c0a10 70%)' }}>
                      <span className="font-cinzel font-black" style={{ fontSize: u(30), color: membro.pronto ? '#F3D58A' : '#8d8470', textShadow: SOMBRA_DO_TEXTO }}>{membro.nome.slice(0, 1).toUpperCase()}</span>
                    </div>
                    {membro.uid === party?.liderUid && <Peca src={TESTE_UI.liderOn} p={{ x: x + al.liderX, y: al.y + al.liderY, l: 22, a: 22 }} />}
                    <Peca src={membro.pronto ? TESTE_UI.prontoOn : TESTE_UI.prontoOff} p={{ x: x + al.prontoX, y: al.y + al.prontoY, l: 22, a: 21 }} />
                  </>
                )}
                {membro && (
                  <button type="button" disabled={ocupado} onClick={() => void agir('pronto', { pronto: !membro.pronto })} aria-pressed={membro.pronto} aria-label={`${membro.nome}: ${membro.pronto ? T.pronto : T.naoPronto}. ${eu ? (membro.pronto ? T.desmarcarPronto : T.marcarPronto) : ''}`}
                    className="absolute cursor-pointer" style={{ left: u(x), top: u(al.y), width: u(al.l), height: u(al.a), display: 'block', pointerEvents: eu ? 'auto' : 'none' }} />
                )}
                <Texto x={x + al.l / 2} y={al.y + al.nomeY} tamanho={7} caixaAlta largura={80} cor={membro ? CREME : SUB}>{nome}</Texto>
              </div>
            );
          })}
          {segmentosDoFeixe(party?.membros ?? []).map((aceso, i) => (
            <Peca key={i} src={aceso ? TESTE_UI.feixeOn : TESTE_UI.feixeOff} p={POSICAO.feixes[i]} />
          ))}
          <Texto x={180} y={272} tamanho={6} cor={SUB} negrito={false} caixaAlta largura={320}>
            {party && party.membros.length >= TAMANHO_MINIMO_DO_TESTE && party.membros.every((m) => m.pronto) ? T.todosProntos : T.aguardando}
          </Texto>

          {/* chamar alguém pelo nome */}
          {souLider && party && party.membros.length < TAMANHO_MAXIMO_DA_PARTY ? (
            <>
              <Peca src={TESTE_UI.info} p={POSICAO.info} />
              <input value={convidado} onChange={(e) => setConvidado(e.target.value)} maxLength={32} placeholder={T.digiteONome} aria-label={T.chamarJogador}
                onKeyDown={(e) => { if (e.key === 'Enter' && convidado.trim().length >= 2) void agir('convidar', { nome: convidado }).then((d) => d && setConvidado('')); }}
                className="absolute bg-transparent font-cinzel font-semibold outline-none uppercase" style={{ left: u(POSICAO.info.x + 38), top: u(POSICAO.info.y + 8), width: u(98), height: u(21), fontSize: u(6.2), color: CREME, textShadow: SOMBRA_DO_TEXTO }} />
              <button type="button" disabled={ocupado || convidado.trim().length < 2} onClick={() => void agir('convidar', { nome: convidado }).then((d) => d && setConvidado(''))} aria-label={T.chamarJogador}
                className="absolute cursor-pointer disabled:opacity-60" style={{ left: u(POSICAO.mais.x), top: u(POSICAO.mais.y), width: u(POSICAO.mais.l), height: u(POSICAO.mais.a), backgroundImage: `url(${TESTE_UI.mais})`, backgroundSize: '100% 100%', ...pixel }} />
            </>
          ) : (
            <Texto x={180} y={305} tamanho={6} cor={SUB} negrito={false} caixaAlta largura={300}>{party ? (souLider ? T.todosProntos : T.esperandoOLider) : ''}</Texto>
          )}

          {/* a dificuldade (o líder escolhe) e o custo */}
          <button type="button" disabled={!souLider} onClick={() => setVista('dificuldades')} aria-label={T.dificuldade(escolhida?.nome ?? '')} className="absolute cursor-pointer disabled:cursor-default"
            style={{ left: u(POSICAO.dificuldadeNaParty.x), top: u(POSICAO.dificuldadeNaParty.y), width: u(POSICAO.dificuldadeNaParty.l), height: u(POSICAO.dificuldadeNaParty.a), backgroundImage: `url(${TESTE_UI.botao2})`, backgroundSize: '100% 100%', ...pixel }}>
            <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black uppercase" style={{ fontSize: u(8.5), color: CREME, textShadow: SOMBRA_DO_TEXTO }}>{souLider ? T.dificuldade(escolhida?.nome ?? '') : T.olideraEscolhe}</span>
          </button>
          <Peca src={TESTE_UI.chaveGratis} p={{ x: POSICAO.chaveDaParty.x, y: POSICAO.chaveDaParty.y, l: 22, a: 49 }} />
          <Texto x={POSICAO.chaveDaParty.x + 30} y={POSICAO.chaveDaParty.y + 14} tamanho={6} alinhar="left" caixaAlta cor={SUB} negrito={false} largura={190}>{escolhida?.custo === 'selo' ? T.custoSelo : T.custoChave}</Texto>
          {party && escolhida && souLider && !pode && party.membros.length >= TAMANHO_MINIMO_DO_TESTE && party.membros.every((m) => m.pronto) && estado && (
            <Texto x={POSICAO.chaveDaParty.x + 30} y={POSICAO.chaveDaParty.y + 26} tamanho={5.6} alinhar="left" cor="#FF9A8F" negrito={false} largura={200}>
              {escolhida.custo === 'selo' ? (estado.selos < 1 ? T.semSelo : '') : estado.chaves.gratisRestantes + estado.chaves.guardadas < 1 ? T.semChave : ''}
            </Texto>
          )}

          <BotaoLargo p={POSICAO.botaoIniciar} disabled={ocupado || !pode} onClick={() => void iniciar()}>{ocupado ? T.iniciando : T.iniciar}</BotaoLargo>
          <button type="button" disabled={ocupado} onClick={() => void agir('sair').then((d) => d && setVista('testes'))} className="absolute font-cinzel font-bold underline cursor-pointer" style={{ left: u(8), top: u(495), fontSize: u(6.2), color: '#FF9A8F', textShadow: SOMBRA_DO_TEXTO }}>{T.sairDaParty}</button>
        </>
      )}

      {estado && vista === 'dificuldades' && teste && (
        <>
          <Peca src={TESTE_UI.painel} p={POSICAO.painel} />
          {[...teste.dificuldades].reverse().map((d) => {
            const y = topoDaDificuldade(d.dificuldade);
            const L = POSICAO.linhasDasDificuldades;
            const selecionada = d.dificuldade === dificuldade;
            return (
              <div key={d.dificuldade} className="contents">
                {d.dificuldade < 6 && <Peca src={d.concluida ? TESTE_UI.caminhoOn : TESTE_UI.caminhoOff} p={{ x: L.x + 18, y: y - 24, l: 16, a: 48 }} />}
                <button type="button" disabled={!d.liberada} onClick={() => setDificuldade(d.dificuldade)} aria-pressed={selecionada} aria-label={`${d.nome}${d.liberada ? '' : ` (${T.dificuldadeTrancada})`}`} className="absolute cursor-pointer disabled:cursor-not-allowed"
                  style={{ left: u(L.x - 6), top: u(y - 8), width: u(250), height: u(L.a + 12) }}>
                  {selecionada && <Peca src={TESTE_UI.halo} p={{ x: -6 + 0, y: 0, l: 64, a: 66 }} />}
                </button>
                <Peca src={SELO_DA_DIFICULDADE(d.dificuldade)} p={{ x: L.x + 4, y: y + 1, l: 44, a: 48 }} className="pointer-events-none" style={{ opacity: d.liberada ? 1 : 0.55 }} />
                {d.concluida && <Peca src={TESTE_UI.concluido} p={{ x: L.x, y, l: 52, a: 50 }} className="pointer-events-none" />}
                {!d.liberada && <Peca src={TESTE_UI.trancado} p={{ x: L.x, y, l: 52, a: 50 }} className="pointer-events-none" />}
                <Texto x={L.textoX} y={y + 15} tamanho={9} alinhar="left" caixaAlta largura={170} cor={d.liberada ? CREME : '#9a8f78'}>{d.nome}</Texto>
                <Texto x={L.textoX} y={y + 27} tamanho={5.8} alinhar="left" caixaAlta largura={180} cor={d.liberada ? SUB : '#7d745f'} negrito={false}>
                  {`${d.poeira ? T.cacosEPoeira(d.cacos) : T.cacos(d.cacos)} · ${d.dificuldade === 1 ? T.cartasComuns : T.ate(T.raridadesAte[maiorRaridadeDaDificuldade(d.raridades)])}`}
                </Texto>
              </div>
            );
          })}
          <BotaoLargo p={POSICAO.botaoEscolher} disabled={!escolhida?.liberada} onClick={() => setVista('party')}>{T.escolherDificuldade}</BotaoLargo>
        </>
      )}

      {vista === 'recompensas' && desfecho && (
        <>
          {desfecho.resultado.venceu ? (
            <>
              {POSICAO.cartas.xs.map((x, i) => {
                const carta = desfecho.cartas[i];
                return carta ? (
                  <div key={i} className="absolute" role="img" aria-label={`${carta.nome}${carta.nova ? `, ${T.nova}` : ''}`} style={{ left: u(x - 6), top: u(POSICAO.cartas.y), width: u(70), height: u(117) }}>
                    <ArteDaCarta tipoId={carta.tipo} className="absolute" style={{ left: u(4), top: u(4), width: u(62), height: u(109), objectFit: 'fill' }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={MOLDURA_DA_CARTA(indiceDaRaridade(carta.raridade) + 1)} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full" style={pixel} />
                    {carta.nova && <span className="absolute font-cinzel font-black uppercase" style={{ left: u(8), top: u(6), fontSize: u(5.5), color: '#1b1206', backgroundColor: DOURADO, padding: `0 ${u(2)}` }}>{T.nova}</span>}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={DORSO(desfecho.resultado.categoria)} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(x - 6), top: u(POSICAO.cartas.y), width: u(70), height: u(117), ...pixel }} />
                );
              })}
              <Texto x={180} y={226} tamanho={7} caixaAlta largura={320} cor={DOURADO}>{T.cartasGanhas(3, T.nomeDaCategoria[desfecho.resultado.categoria])}</Texto>
              <Link href="/colecao?aba=alma" className="absolute font-cinzel font-bold underline" style={{ left: u(110), top: u(231), fontSize: u(5.8), color: CREME, textShadow: SOMBRA_DO_TEXTO }}>{T.verNaColecao}</Link>
              <Premio y={POSICAO.placasDePremio.ys[0]} icone={TESTE_UI.caco} rotulo={T.cacosDeAlma} valor={`+${desfecho.cacos}`} iw={20} ih={34} />
              {desfecho.poeira > 0 && <Premio y={POSICAO.placasDePremio.ys[1]} icone={TESTE_UI.poeira} rotulo={T.poeiraDeAlma} valor={`+${desfecho.poeira}`} iw={26} ih={18} />}
              {desfecho.diamantes > 0 && (
                <>
                  <Premio y={POSICAO.placasDePremio.ys[2]} icone={TESTE_UI.diamante} rotulo={T.diamantesPrimeiraVez} valor={`+${desfecho.diamantes}`} iw={22} ih={19} />
                  <Peca src={TESTE_UI.carimbo} p={POSICAO.carimbo} />
                </>
              )}
            </>
          ) : (
            <>
              <Texto x={180} y={110} tamanho={7.5} caixaAlta largura={320} cor={SUB}>{`${T.rodadas}: ${desfecho.resultado.rodadas}`}</Texto>
              {desfecho.resultado.aliados.map((a, i) => (
                <div key={a.nome}>
                  <Peca src={TESTE_UI.placaRecompensa} p={{ x: POSICAO.placasDePremio.x, y: 130 + i * 62, l: 150, a: 56 }} />
                  <Texto x={POSICAO.placasDePremio.x + 14} y={130 + i * 62 + 20} tamanho={8} alinhar="left" largura={125} caixaAlta>{a.nome}</Texto>
                  <Texto x={POSICAO.placasDePremio.x + 14} y={130 + i * 62 + 34} tamanho={6.2} alinhar="left" largura={125} cor={SUB} negrito={false}>{`${a.dano.toLocaleString('pt-BR')}${a.caiuNaRodada ? ` · ${a.caiuNaRodada}ª rodada` : ''}`}</Texto>
                </div>
              ))}
            </>
          )}
          <BotaoLargo p={POSICAO.botaoContinuar} onClick={voltar}>{T.continuar}</BotaoLargo>
        </>
      )}

      {regras && (
        <div className="absolute inset-0 flex items-center justify-center z-30" style={{ backgroundColor: 'rgba(6,4,10,.85)' }} onClick={() => setRegras(false)}>
          <div role="dialog" aria-label={T.regras} className="flex flex-col items-center text-center" style={{ width: u(290), padding: u(14), gap: u(10), backgroundColor: '#12151b', border: `${u(1.5)} solid #8a6d2a` }} onClick={(e) => e.stopPropagation()}>
            <p className="font-cinzel font-semibold" style={{ fontSize: u(7.4), lineHeight: 1.45, color: CREME }}>{T.explicacao(estado?.nivelNecessario ?? 25, TAMANHO_MINIMO_DO_TESTE, TAMANHO_MAXIMO_DA_PARTY)}</p>
            <button type="button" onClick={() => setRegras(false)} className="font-cinzel font-black uppercase cursor-pointer" style={{ fontSize: u(8), color: CREME, border: `${u(1)} solid #8a6d2a`, padding: `${u(3)} ${u(14)}` }}>{T.fecharRegras}</button>
          </div>
        </div>
      )}
    </PalcoPixel>
  );
}

/** Uma placa de prêmio da tela de recompensas: o ícone no medalhão, o nome e o valor. */
function Premio({ y, icone, rotulo, valor, iw, ih }: { y: number; icone: string; rotulo: string; valor: string; iw: number; ih: number }) {
  const P = POSICAO.placasDePremio;
  return (
    <>
      <Peca src={TESTE_UI.placaRecompensa} p={{ x: P.x, y, l: P.l, a: P.a }} />
      <Peca src={icone} p={{ x: 113, y: y + 9 + (40 - ih) / 2 - 2, l: iw, a: ih }} />
      <Texto x={P.x + 52} y={y + 12} tamanho={5.6} alinhar="left" caixaAlta largura={95} cor={SUB} negrito={false}>{rotulo}</Texto>
      <Texto x={P.x + 52} y={y + 26} tamanho={11} alinhar="left" largura={95} cor={DOURADO}>{valor}</Texto>
    </>
  );
}
