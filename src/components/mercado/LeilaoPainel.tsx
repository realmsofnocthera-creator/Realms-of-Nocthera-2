'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { NOME_DA_CATEGORIA, type MoedaDoMercado } from '@/rules/mercado';
import type { EstadoDoLeilao, ItemDoLeilaoNaTela } from '@/server/leilao';
import { ARENA_UI } from '@/assets/arenaUi';
import { GEMA_DA_RARIDADE } from '@/assets/telasSociaisUi';
import { BotaoPequeno, CREME, DOURADO, FaixaDeArte, Icone, Rotulo, SOMBRA_DO_TEXTO, SUB, u } from '@/components/pixel/PecasDeTela';
import { TEXTOS_DAS_TELAS as TT } from '@/rules/textosDasTelasSociais';

type Token = () => Promise<string | null>;
const L = TT.mercado.leilao;
/** Com item aberto, a tela atualiza a cada 3 segundos (só com a aba visível); fora disso, a cada 30 segundos. */
const ATUALIZAR_ABERTO_MS = 3_000;
const ATUALIZAR_FECHADO_MS = 30_000;

const valor = (moeda: MoedaDoMercado, n: number) => `${n.toLocaleString('pt-BR')} ${moeda === 'ouro' ? 'de ouro' : n === 1 ? 'Diamante' : 'Diamantes'}`;
const corDaRaridade = (r: string) => EMBLEMA_RARIDADE_MAP[r as keyof typeof EMBLEMA_RARIDADE_MAP]?.cor ?? '#F5E3B3';

function relogio(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m}:${String(seg).padStart(2, '0')}`;
}

async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/leilao', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: TT.semConexao } };
  }
}

/**
 * Leilão (7.2): segunda, quarta, sexta, sábado e domingo, das 19h às 20h. 10 itens de 5 minutos cada; o botão dá o
 * próximo lance (o mínimo ou 10% acima do atual). O valor fica reservado e volta se alguém cobrir; o item ganho chega
 * pelo Correio.
 */
export function LeilaoPainel({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDoLeilao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // diferença entre o relógio do servidor e o do aparelho, para a contagem regressiva
  const diferenca = useRef(0);
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (!r.ok) {
      setErro(String(r.dados.error ?? L.erro));
      return;
    }
    const e = r.dados as unknown as EstadoDoLeilao;
    diferenca.current = Date.parse(e.agora) - Date.now();
    setEstado(e);
    setErro(null);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const temAberto = !!estado?.itens.some((i) => i.situacao === 'aberto');
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carregar();
    }, temAberto ? ATUALIZAR_ABERTO_MS : ATUALIZAR_FECHADO_MS);
    return () => window.clearInterval(id);
  }, [carregar, temAberto]);

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now() + diferenca.current), 1000);
    return () => window.clearInterval(id);
  }, []);

  async function lance(i: ItemDoLeilaoNaTela) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { indice: i.indice, valor: i.proximo });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? L.lanceDado : TT.naoFoiPossivel)), erro: !r.ok });
    await carregar();
  }

  const texto = (t: string, cor = CREME, tamanho = 7) => <p className="font-cinzel font-bold text-center shrink-0" style={{ fontSize: u(tamanho), lineHeight: 1.4, color: cor, textShadow: SOMBRA_DO_TEXTO, padding: `${u(2)} ${u(6)}` }}>{t}</p>;
  if (erro) return texto(erro, '#FF9A8F');
  if (!estado) return texto(TT.carregando);
  const dataDoProximo = new Date(estado.comecaEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {aviso && texto(aviso.texto, aviso.erro ? '#FF9A8F' : '#B8F0B0')}
      {texto(L.regras, SUB, 5.8)}
      {!estado.podeDarLance && texto(L.abreNoNivel(estado.nivelNecessario), '#E6C775', 6.4)}
      {!estado.hoje ? texto(L.hojeNao(dataDoProximo)) : estado.itens.map((i) => {
        const restante = Date.parse(i.fim) - agora;
        const paraAbrir = Date.parse(i.inicio) - agora;
        const aberto = i.situacao === 'aberto';
        return (
          <FaixaDeArte key={i.indice} src={aberto ? ARENA_UI.card.forte : i.situacao === 'encerrado' ? ARENA_UI.card.fraco : ARENA_UI.card.neutro} a={50} esq={85} dir={22} style={{ opacity: i.situacao === 'encerrado' ? 0.8 : 1 }}>
            <Icone src={GEMA_DA_RARIDADE[i.raridade] ?? GEMA_DA_RARIDADE.comum} x={13} y={13} l={24} a={24} alt={i.nomeDaRaridade} />
            <Rotulo x={56} y={19} tamanho={7} largura={170} cor={corDaRaridade(i.raridade)}>{`${i.quantidade > 1 ? `${i.quantidade}× ` : ''}${i.nome}`}</Rotulo>
            <Rotulo x={56} y={28.5} tamanho={5} largura={180} cor="#D9CBB0" negrito={false}>{[NOME_DA_CATEGORIA[i.categoria], i.nomeDaRaridade, i.detalhe].filter(Boolean).join(' · ')}</Rotulo>
            <Rotulo x={56} y={36.5} tamanho={5} largura={170} cor={SUB} negrito={false}>
              {i.lance ? `${i.situacao === 'encerrado' ? L.vencedor : L.maiorLance}: ${i.meu ? L.voce : i.lance.nome} · ${valor(i.moeda, i.lance.valor)}` : i.situacao === 'encerrado' ? L.semLances : L.lanceMinimo(valor(i.moeda, i.proximo))}
            </Rotulo>
            <Rotulo x={30} y={17} tamanho={6.4} largura={80} alinhar="right" cor={aberto ? DOURADO : SUB}>{aberto ? relogio(restante) : i.situacao === 'aguardando' ? L.abreEm(relogio(paraAbrir)) : L.encerrado}</Rotulo>
            {aberto && !i.meu && <BotaoPequeno direita={26} y={26} largura={84} desligado={ocupado || !estado.podeDarLance} onClick={() => void lance(i)} rotulo={L.lance(valor(i.moeda, i.proximo))}>{L.lance(i.proximo.toLocaleString('pt-BR'))}</BotaoPequeno>}
          </FaixaDeArte>
        );
      })}
    </>
  );
}
