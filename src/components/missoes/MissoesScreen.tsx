'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ARENA_UI } from '@/assets/arenaUi';
import { TELAS_UI } from '@/assets/telasSociaisUi';
import { BotaoDeArte, Janela } from '@/components/arena/PecasDaArena';
import { PalcoPixel, Texto } from '@/components/pixel/GradePixel';
import { Abas, AreaQueRola, AvisoDaTela, Cabecalho, CREME, DOURADO, FaixaDeArte, Icone, Recado, Rotulo, SUB, u, pixel } from '@/components/pixel/PecasDeTela';
import { TEXTOS_DAS_TELAS as TT } from '@/rules/textosDasTelasSociais';
import type { BauNaTela, EstadoDoDiario, MissaoNaTela } from '@/server/diario';

type Token = () => Promise<string | null>;
const T = TT.missoes;
type Aba = 'diarias' | 'semanais';
const BOTAO = { normal: ARENA_UI.botao, off: ARENA_UI.botaoOff, press: ARENA_UI.botaoPress };

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/diario', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: TT.semConexao } };
  }
}

function abaInicial(): Aba {
  if (typeof window === 'undefined') return 'diarias';
  return new URLSearchParams(window.location.search).get('aba') === 'semanais' ? 'semanais' : 'diarias';
}

function tempoAte(iso: string, agora: number): string {
  const s = Math.max(0, Math.floor((Date.parse(iso) - agora) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d} d ${h} h` : h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

/** Os degraus do baú: cada um numa moldura da Coleção (dourada quando está pronto, azul depois de resgatado, cinza enquanto não abre), com o baú do Check-in. */
function Bau({ degraus, y }: { degraus: BauNaTela[]; y: number }) {
  const l = 62;
  const passo = 70;
  const x0 = (360 - (degraus.length - 1) * passo - l) / 2;
  return (
    <>
      {degraus.map((d, i) => {
        const x = x0 + i * passo;
        const moldura = d.resgatado ? TELAS_UI.molduraAzul : d.aberto ? TELAS_UI.molduraDourada : TELAS_UI.molduraCinza;
        return (
          <div key={d.missoes} className="absolute" style={{ left: u(x), top: u(y), width: u(l), height: u(l + 22) }} aria-label={`${T.nMissoes(d.missoes)}, ${d.diamantes} Diamantes, ${d.resgatado ? T.resgatado : d.aberto ? T.pronto : T.bloqueado}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={moldura} alt="" aria-hidden draggable={false} className="absolute" style={{ left: 0, top: 0, width: u(l), height: u(l), ...pixel }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.aberto ? TELAS_UI.bauAberto : TELAS_UI.bauFechado} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(13), top: u(11), width: u(36), height: u(36), filter: d.aberto || d.resgatado ? undefined : 'grayscale(.6) brightness(.7)', opacity: d.resgatado ? 0.55 : 1, ...pixel }} />
            {d.resgatado && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={TELAS_UI.feito} alt="" aria-hidden draggable={false} className="absolute" style={{ left: u(36), top: u(36), width: u(20), height: u(20), ...pixel }} />
            )}
            <span className="absolute w-full text-center font-cinzel font-black leading-none" style={{ top: u(l + 3), fontSize: u(6), color: CREME, textShadow: '0 1px 0 #000' }}>{T.nMissoes(d.missoes)}</span>
            <span className="absolute w-full flex items-center justify-center font-cinzel font-black leading-none" style={{ top: u(l + 12), fontSize: u(6.6), color: d.aberto && !d.resgatado ? DOURADO : SUB, gap: u(2), textShadow: '0 1px 0 #000' }}>
              {d.diamantes}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ARENA_UI.diamante} alt="Diamantes" draggable={false} style={{ width: u(9), height: u(7), ...pixel }} />
            </span>
          </div>
        );
      })}
    </>
  );
}

/** Uma missão: o cartão prateado com a barra de progresso; a concluída fica na faixa verde, com o selo de feito. */
function Missao({ m }: { m: MissaoNaTela }) {
  const pct = Math.min(1, m.progresso / Math.max(1, m.meta));
  return (
    <FaixaDeArte src={m.completa ? ARENA_UI.linhaVitoria : ARENA_UI.card.neutro} a={m.completa ? 36 : 44} esq={m.completa ? 46 : 85} dir={22}>
      {m.completa
        ? <Icone src={TELAS_UI.feito} x={13} y={8} l={20} a={20} alt={T.concluida} />
        : <Rotulo x={28} y={22} tamanho={6} largura={36} alinhar="center" cor={DOURADO}>{`${Math.floor(pct * 100)}%`}</Rotulo>}
      <Rotulo x={m.completa ? 50 : 56} y={m.completa ? 18 : 18} tamanho={7} largura={200}>{m.nome}</Rotulo>
      {m.completa ? (
        <Rotulo x={34} y={18} tamanho={5.6} largura={80} alinhar="right" cor="#B8F0B0">{T.concluida}</Rotulo>
      ) : (
        <>
          <span className="absolute" role="progressbar" aria-valuemin={0} aria-valuemax={m.meta} aria-valuenow={m.progresso} aria-label={m.nome} style={{ left: u(56), top: u(26), width: u(180), height: u(5), backgroundColor: '#1b140c', border: `${u(0.6)} solid #5a4630` }}>
            <span className="absolute inset-y-0 left-0" style={{ width: `${pct * 100}%`, background: 'linear-gradient(180deg,#F3C769,#C8962E)' }} />
          </span>
          <Rotulo x={34} y={29} tamanho={5.4} largura={60} alinhar="right" cor="#D9CBB0" negrito={false}>{`${m.progresso.toLocaleString('pt-BR')}/${m.meta.toLocaleString('pt-BR')}`}</Rotulo>
        </>
      )}
    </FaixaDeArte>
  );
}

/** Missões diárias e semanais, com os baús de progresso, no painel da Mochila. */
export function MissoesScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDoDiario | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [agora] = useState(() => Date.now());
  const [regras, setRegras] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDoDiario);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(corpo: Record<string, unknown>) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, corpo);
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? TT.naoFoiPossivel), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? TT.feito), erro: false });
    setEstado(r.dados.estado as EstadoDoDiario);
  }

  const degraus = estado ? (aba === 'diarias' ? estado.bauDiario : estado.bauSemanal) : [];
  const missoes = estado ? (aba === 'diarias' ? estado.diarias : estado.semanais) : [];
  const prontos = degraus.filter((d) => d.aberto && !d.resgatado).length;
  const ponto = (a: Aba) => !!estado && (a === 'diarias' ? estado.bauDiario : estado.bauSemanal).some((d) => d.aberto && !d.resgatado);

  return (
    <PalcoPixel fundo={TELAS_UI.fundoMissoes}>
      <Cabecalho titulo={T.titulo} voltar="/hub" aoAbrirLivro={() => setRegras(true)} rotuloVoltar={TT.voltarAoHub} rotuloLivro={TT.comoFunciona} />
      <AvisoDaTela aviso={aviso} y={66} />
      {erroAoCarregar ? <Recado erro>{TT.erroAoCarregar}</Recado>
        : !estado ? <Recado>{TT.carregando}</Recado>
        : (
          <>
            <Abas rotulo={T.titulo} y={70} ativa={aba} aoMudar={setAba} abas={[{ id: 'diarias', nome: T.diarias, ponto: ponto('diarias') }, { id: 'semanais', nome: T.semanais, ponto: ponto('semanais') }]} />
            <Texto x={180} y={118} tamanho={5.4} caixaAlta largura={320} cor={SUB} negrito={false}>{aba === 'diarias' ? T.reiniciaDia(tempoAte(estado.fechaDiaEm, agora)) : T.reiniciaSemana(tempoAte(estado.fechaSemanaEm, agora))}</Texto>
            <Texto x={180} y={131} tamanho={7.6} caixaAlta largura={300} cor={DOURADO}>{`${aba === 'diarias' ? T.bauDiario : T.bauSemanal} · ${T.concluidas(missoes.filter((m) => m.completa).length)}`}</Texto>
            <Bau degraus={degraus} y={140} />
            {prontos > 0 && <BotaoDeArte x={105} y={230} l={150} a={27} src={BOTAO} desligado={ocupado} onClick={() => void agir({ acao: 'bau', tipo: aba === 'diarias' ? 'diario' : 'semanal' })} tamanho={7.6}>{T.resgatarBau(prontos)}</BotaoDeArte>}
            <AreaQueRola topo={prontos > 0 ? 262 : 236} base={528} rotulo={aba === 'diarias' ? T.diarias : T.semanais}>
              {missoes.map((m) => <Missao key={m.id} m={m} />)}
            </AreaQueRola>
          </>
        )}
      {regras && <Janela titulo={T.titulo} aoFechar={() => setRegras(false)} fechar={TT.fechar}><p>{T.regras}</p></Janela>}
    </PalcoPixel>
  );
}
