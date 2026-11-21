'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ARENA_UI } from '@/assets/arenaUi';
import { TELAS_UI } from '@/assets/telasSociaisUi';
import { BotaoDeArte, Janela } from '@/components/arena/PecasDaArena';
import { PalcoPixel, Texto } from '@/components/pixel/GradePixel';
import { AreaQueRola, AvisoDaTela, BotaoLargo, Cabecalho, FaixaDeArte, Icone, PergaminhoAberto, Recado, Rotulo, SUB } from '@/components/pixel/PecasDeTela';
import { textoDoPresente } from '@/rules/correio';
import { TEXTOS_DAS_TELAS as TT } from '@/rules/textosDasTelasSociais';
import type { EstadoDoCorreio, MensagemNaTela } from '@/server/correio';

type Token = () => Promise<string | null>;
const T = TT.correio;
const DIA_MS = 86_400_000;
const BOTAO = { normal: ARENA_UI.botao, off: ARENA_UI.botaoOff, press: ARENA_UI.botaoPress };

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/correio', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: TT.semConexao } };
  }
}

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const diasAte = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / DIA_MS));

/**
 * Correio, na mesa de madeira da Caçada: as cartas (com o sigilo, ou o presente quando trazem recompensa) e, ao abrir uma, o pergaminho com o
 * texto, o presente e os botões Resgatar e Apagar. As recompensas do Chefe Mundial, da Arena, do Campeonato e as mensagens do Mestre chegam aqui;
 * cada mensagem fica 30 dias.
 */
export function CorreioScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDoCorreio | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const [regras, setRegras] = useState(false);

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (r.ok) setEstado(r.dados as unknown as EstadoDoCorreio);
    else setErroAoCarregar(true);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(acao: string, id?: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { acao, id });
    setOcupado(false);
    if (!r.ok) {
      setAviso({ texto: String(r.dados.error ?? TT.naoFoiPossivel), erro: true });
      return;
    }
    setAviso({ texto: String(r.dados.mensagem ?? TT.feito), erro: false });
    setEstado(r.dados.estado as EstadoDoCorreio);
    if (acao === 'apagar') setAberta(null);
  }

  const carta: MensagemNaTela | undefined = estado?.mensagens.find((m) => m.id === aberta);
  const comBotao = !!estado && estado.naoResgatadas > 1;

  return (
    <PalcoPixel fundo={TELAS_UI.fundoCorreio}>
      <Cabecalho titulo={T.titulo} voltar="/hub" aoAbrirLivro={() => setRegras(true)} rotuloVoltar={TT.voltarAoHub} rotuloLivro={TT.comoFunciona} />
      <Texto x={180} y={79} tamanho={6.4} caixaAlta largura={300} cor={SUB} negrito={false}>{T.sub}</Texto>
      <AvisoDaTela aviso={aviso} y={86} />

      {erroAoCarregar ? <Recado erro>{TT.erroAoCarregar}</Recado>
        : !estado ? <Recado>{TT.carregando}</Recado>
        : estado.mensagens.length === 0 ? <Recado>{T.nenhuma}</Recado>
        : (
          <AreaQueRola topo={92} base={comBotao ? 490 : 532}>
            {estado.mensagens.map((m) => {
              const pendente = !!m.presente && !m.resgatada;
              return (
                <FaixaDeArte key={m.id} src={pendente ? ARENA_UI.card.forte : ARENA_UI.card.neutro} a={50} esq={85} dir={22} onClick={() => setAberta(m.id)} rotulo={T.abrir(m.titulo)}>
                  <Icone src={m.presente ? TELAS_UI.presente : TELAS_UI.sigilo} x={10} y={10} l={30} a={30} />
                  <Rotulo x={60} y={22} tamanho={8} largura={190}>{m.titulo}</Rotulo>
                  <Rotulo x={60} y={34} tamanho={5.6} largura={220} cor="#D9CBB0" negrito={false}>{`${T.de(m.de, !!m.paraTodos)} · ${T.some(diasAte(m.expiraEm))}`}</Rotulo>
                  <Rotulo x={30} y={22} tamanho={5} largura={56} alinhar="right" cor={SUB} negrito={false}>{data(m.criadaEm)}</Rotulo>
                  {m.presente && <Icone src={m.resgatada ? TELAS_UI.feito : ARENA_UI.sobe} x={306} y={28} l={12} a={12} alt={m.resgatada ? T.resgatado : T.comPresente} />}
                </FaixaDeArte>
              );
            })}
          </AreaQueRola>
        )}

      {comBotao && <BotaoDeArte x={95} y={498} l={170} a={31} src={BOTAO} desligado={ocupado} onClick={() => void agir('resgatarTudo')} tamanho={8}>{T.resgatarTudo(estado!.naoResgatadas)}</BotaoDeArte>}

      {carta && (
        <PergaminhoAberto src={TELAS_UI.pergaminho} titulo={carta.titulo} aoFechar={() => setAberta(null)} rotuloFechar={TT.fechar}
          rodape={
            <>
              {carta.presente && !carta.resgatada && <BotaoLargo onClick={() => void agir('resgatar', carta.id)} desligado={ocupado} largura={140}>{T.resgatar}</BotaoLargo>}
              {(!carta.presente || carta.resgatada) && <BotaoLargo onClick={() => void agir('apagar', carta.id)} desligado={ocupado} largura={140} perigo>{T.apagar}</BotaoLargo>}
            </>
          }>
          <p style={{ fontSize: '0.82em', opacity: 0.85, marginBottom: '0.6em' }}>{T.de(carta.de, !!carta.paraTodos)} · {data(carta.criadaEm)} · {T.some(diasAte(carta.expiraEm))}</p>
          <p className="whitespace-pre-line" style={{ marginBottom: '0.8em' }}>{carta.texto}</p>
          {carta.presente && (
            <div style={{ borderTop: '1px solid rgba(90,42,20,.35)', paddingTop: '0.5em' }}>
              <p style={{ fontWeight: 800, color: carta.resgatada ? '#5f6b3a' : '#7a3a10' }}>{carta.resgatada ? `${T.presente} · ${T.resgatado}` : T.presente}</p>
              <ul>{textoDoPresente(carta.presente).map((l) => <li key={l}>• {l}</li>)}</ul>
            </div>
          )}
        </PergaminhoAberto>
      )}
      {regras && <Janela titulo={T.titulo} aoFechar={() => setRegras(false)} fechar={TT.fechar}><p>{T.regras}</p></Janela>}
    </PalcoPixel>
  );
}
