'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { FUNDO_DA_MOCHILA } from '@/assets/mochilaUi';
import { ICONES_DAS_ABAS_DO_RESGATE } from '@/assets/resgateUi';
import { ABAS_DA_LOJA, NOME_DA_ABA, type AbaDaLoja, type MoedaDaLoja } from '@/rules/loja';
import type { EstadoDaLoja, ProdutoNaTela } from '@/server/loja';
import { ICONE_DA_MOEDA, NOME_DA_MOEDA, iconeDoProduto } from '@/lib/resgateTela';
import { COR_RARIDADE_ARMA } from '@/lib/forjaTela';
import { formatarCompacto } from '@/rules/numerosCompactos';
import type { RaridadeArma } from '@/rules/armas';
import { Abas, BarraDeTitulo, BotaoDoKit, BotaoRedondo, FundoDaForja, PainelDaForja, PalcoDaForja, PlacaDeRaridade, SlotDeArma, TEXTO_PIXEL } from '@/components/forja/KitDaForja';
import { IconeDoMaterial } from '@/components/forja/IconeDoMaterial';
import { Info } from '@/components/forja/PainelDaArma';

type Token = () => Promise<string | null>;
const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const COLUNAS = 3;

/** As mesmas chamadas da Loja de hoje (`/api/loja`): uma leitura do estado e uma gravação por compra. */
async function chamar(tokenFresco: Token, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch('/api/loja', {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const raridadeDe = (p: ProdutoNaTela) => p.raridade as RaridadeArma;
/** Materiais e recursos podem ser comprados em quantidade; o resto, um por vez. */
const emQuantidade = (p: ProdutoNaTela) => p.tipo === 'material' || p.tipo === 'recurso';

function IconeDoProdutoNaTela({ p, className }: { p: ProdutoNaTela; className: string }) {
  const i = iconeDoProduto(p);
  if (i.tipo === 'material') return <IconeDoMaterial id={p.id} nome={p.nome} cor={COR_RARIDADE_ARMA[raridadeDe(p)]} className={className} tamanhoDaInicial="3.6cqw" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={i.src} alt="" aria-hidden="true" draggable={false} className={`${className} object-contain`} style={pixel} />;
}

function Preco({ moeda, valor, className = '' }: { moeda: MoedaDaLoja; valor: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.8cqw] ${className}`} title={`${valor.toLocaleString('pt-BR')} de ${NOME_DA_MOEDA[moeda]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ICONE_DA_MOEDA[moeda]} alt="" aria-hidden="true" draggable={false} className="w-[4.2cqw] h-[4.2cqw] object-contain shrink-0" style={pixel} />
      <span className={`${TEXTO_PIXEL} text-[2.6cqw] font-bold tabular-nums text-[#F5F3E0]`}>{formatarCompacto(valor)}</span>
    </span>
  );
}

/**
 * Resgate (a loja de ouro, 7.2) em pixel (kit azul e dourado): os saldos no topo, as abas com ícone, a grade de produtos
 * e, ao tocar, um pop-up com a descrição, a quantidade e a compra. Materiais, cartas e emblemas giram toda segunda à
 * meia-noite; o limite de cada item zera no dia 1 de cada mês. Toda regra e todo preço são do servidor.
 */
export function ResgateScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDaLoja | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<AbaDaLoja>('materiais');
  const [aberto, setAberto] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [escolha, setEscolha] = useState('');

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco);
    if (!r.ok) {
      setErro(String(r.dados.error ?? 'Não foi possível carregar o Resgate agora.'));
      return;
    }
    setEstado(r.dados as unknown as EstadoDaLoja);
    setErro(null);
  }, [tokenFresco]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(null);
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aberto]);

  const produtos = useMemo(() => estado?.produtos.filter((p) => p.aba === aba) ?? [], [estado, aba]);
  const contagem = (a: AbaDaLoja) => estado?.produtos.filter((p) => p.aba === a).length ?? 0;
  const produto = estado?.produtos.find((p) => p.chave === aberto) ?? null;
  const celulas = Math.max(COLUNAS * 4, Math.ceil(produtos.length / COLUNAS) * COLUNAS);
  const gira = estado ? new Date(estado.giraEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' }) : '';

  const abrir = (p: ProdutoNaTela) => {
    setAviso(null);
    setQuantidade(1);
    setEscolha('');
    setAberto(p.chave);
  };

  async function comprar(p: ProdutoNaTela, q: number, opcao?: string) {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, { chave: p.chave, quantidade: q, escolha: opcao });
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? 'Compra feita.' : 'Não foi possível agora.')), erro: !r.ok });
    setQuantidade(1);
    await carregar();
  }

  const opcoes = produto && estado ? (produto.tipo === 'escolhaCarta' ? estado.escolhas.cartas : produto.tipo === 'escolhaEmblema' ? estado.escolhas.emblemas : null) : null;
  const q = produto ? Math.min(Math.max(1, quantidade), Math.max(1, produto.restantes)) : 1;
  const semSaldo = !!produto && !!estado && estado.saldos[produto.moeda] < produto.preco * q;
  const esgotado = !!produto && produto.restantes === 0;
  const status = aviso?.texto ?? erro ?? (estado && !estado.podeComprar ? `O Resgate abre no nível ${estado.nivelNecessario}` : estado ? 'Toque num item para ver e resgatar' : 'Carregando...');

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#05070D]">
      <FundoDaForja />
      <PalcoDaForja>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FUNDO_DA_MOCHILA} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'fill', zIndex: -1 }} />

        <header className="flex items-center gap-[1.4cqw] px-[3.4cqw] pt-[3.4cqw]">
          <Link href="/menu" aria-label="Voltar ao Menu" className="w-[9cqw] h-[9cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={pixel} />
          </Link>
          <BarraDeTitulo titulo="Resgate" className="w-[58cqw]" />
        </header>

        {estado && (
          <section aria-label="Saldos" className="grid grid-cols-3 gap-[1.2cqw] px-[3.4cqw] pt-[2.4cqw]">
            {(['ouro', 'diamantes', 'essenciaDeSoberano'] as const).map((m) => (
              <div key={m} aria-label={`${NOME_DA_MOEDA[m]}: ${estado.saldos[m].toLocaleString('pt-BR')}`} className="pilula-pixel flex items-center gap-[1.2cqw] pl-[1cqw] pr-[1.6cqw] py-[0.8cqw] min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ICONE_DA_MOEDA[m]} alt="" aria-hidden="true" draggable={false} className="w-[6.4cqw] h-[6.4cqw] object-contain shrink-0" style={pixel} />
                <span className="flex flex-col min-w-0 leading-none">
                  <span className={`${TEXTO_PIXEL} text-[3cqw] font-bold text-[#F5F3E0] tabular-nums truncate`}>{formatarCompacto(estado.saldos[m])}</span>
                  <span className="font-cinzel font-bold text-[1.9cqw] text-[#C9B27A] truncate mt-[0.5cqw]">{m === 'essenciaDeSoberano' ? 'Ess. de Soberano' : NOME_DA_MOEDA[m]}</span>
                </span>
              </div>
            ))}
          </section>
        )}

        <div className="px-[3.4cqw] pt-[2cqw]">
          <Abas<AbaDaLoja>
            rotulo="Abas do Resgate"
            ativa={aba}
            aoMudar={(a) => { setAba(a); setAberto(null); }}
            abas={ABAS_DA_LOJA.map((a) => ({ id: a, nome: a === 'essencia' ? 'Essência' : NOME_DA_ABA[a], contagem: contagem(a), rotuloAcessivel: `${NOME_DA_ABA[a]} (${contagem(a)})`, icone: ICONES_DAS_ABAS_DO_RESGATE[a] }))}
          />
        </div>

        <div className="flex-1 min-h-0 px-[3.4cqw] pt-[1.4cqw]">
          <PainelDaForja as="section" aria-label={NOME_DA_ABA[aba]} className="h-full overflow-y-auto forja-rolagem">
            {estado && (
              <p className={`${TEXTO_PIXEL} text-[2cqw] text-[#8FB3D1] leading-snug pb-[1.4cqw] text-center`}>
                {produtos.some((p) => p.daSemana) ? `Os itens desta aba mudam ${gira} à meia-noite. ` : ''}O limite de cada item zera no dia 1 de cada mês.
                {estado.descontoDoPasse > 0 ? ` Desconto do Passe: -${estado.descontoDoPasse}%.` : ''}
              </p>
            )}
            {erro && !estado && <p role="alert" className={`${TEXTO_PIXEL} text-[2.8cqw] text-[#FFB4B4] text-center py-[6cqw]`}>{erro}</p>}
            {estado && (
              <ul className="grid gap-[1.6cqw]" style={{ gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))` }}>
                {Array.from({ length: celulas }, (_, n) => {
                  const p = produtos[n];
                  if (!p) return <li key={`v${n}`} aria-hidden="true" className="h-full min-h-[34cqw] border border-[#1F3550] bg-[#080C16]/70" />;
                  const acabou = p.restantes === 0;
                  return (
                    <li key={p.chave}>
                      <button type="button" onClick={() => abrir(p)} aria-label={`${p.nome}, ${p.nomeDaRaridade}, ${p.preco} de ${NOME_DA_MOEDA[p.moeda]}${acabou ? ', esgotado' : ''}. Ver detalhes`} className="w-full h-full min-h-[34cqw] flex flex-col items-center gap-[0.8cqw] py-[1cqw] bg-[#080C16]/70 border border-[#1F3550] cursor-pointer active:translate-y-px" style={{ opacity: acabou ? 0.55 : 1 }}>
                        <SlotDeArma raridade={raridadeDe(p)} destaque={aberto === p.chave} tamanho="17cqw">
                          <IconeDoProdutoNaTela p={p} className="w-full h-full" />
                        </SlotDeArma>
                        <span className="font-cinzel font-bold text-[2.1cqw] leading-tight text-center px-[0.8cqw] h-[5.4cqw] overflow-hidden [text-shadow:1px_1px_0_#05070D]" style={{ color: COR_RARIDADE_ARMA[raridadeDe(p)] }}>{p.nome}</span>
                        {acabou ? (
                          <span className={`${TEXTO_PIXEL} text-[2.3cqw] font-bold text-[#FFB4B4]`}>Esgotado</span>
                        ) : (
                          <Preco moeda={p.moeda} valor={p.preco} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PainelDaForja>
        </div>

        <div className="grid px-[3.4cqw] pt-[1.4cqw] pb-[3cqw]">
          <div className="relative w-full" style={{ aspectRatio: '415 / 64' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.barraStatus} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ ...pixel, objectFit: 'fill' }} />
            <p role={aviso?.erro || erro ? 'alert' : 'status'} className={`absolute inset-0 flex items-center justify-center px-[6%] text-center font-cinzel font-bold text-[2.7cqw] leading-tight [text-shadow:1px_1px_0_#05070D] ${aviso?.erro || erro ? 'text-[#FFB4B4]' : 'text-[#DFF3FF]'}`}>{status}</p>
          </div>
        </div>
      </PalcoDaForja>

      {produto && estado && (
        <div role="dialog" aria-modal="true" aria-label={produto.nome} onClick={() => setAberto(null)} className="forja-palco !fixed inset-0 !z-50 !items-center !justify-center px-[6cqw]" style={{ backgroundColor: 'rgba(3,6,14,0.55)', left: 0, right: 0 }}>
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[84cqw]">
            <BotaoRedondo tipo="x" rotulo="Fechar" onClick={() => setAberto(null)} className="absolute -top-[3.4cqw] -right-[2.4cqw] z-10 w-[9cqw] h-[9cqw]" />
            <PainelDaForja aria-label={`Detalhe: ${produto.nome}`} borda="3cqw" className="max-h-[88dvh] overflow-y-auto forja-rolagem">
              <div className="flex flex-col gap-[2cqw]">
                <PlacaDeRaridade raridade={raridadeDe(produto)}>
                  <h2 className="font-cinzel font-extrabold text-[3.4cqw] leading-tight text-[#F5F3E0] [text-shadow:1px_1px_0_#05070D]">{produto.nome}</h2>
                </PlacaDeRaridade>
                <span className="relative block w-[62%] mx-auto" style={{ aspectRatio: '228 / 143' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={KIT_DA_FORJA.caixaArte} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={pixel} />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <IconeDoProdutoNaTela p={produto} className="w-[17cqw] h-[17cqw]" />
                  </span>
                </span>
                <div className="flex flex-col">
                  <Info rotulo="Raridade" cor={COR_RARIDADE_ARMA[raridadeDe(produto)]}>{produto.nomeDaRaridade}</Info>
                  <Info rotulo="Preço"><Preco moeda={produto.moeda} valor={produto.preco} /></Info>
                  <Info rotulo="Limite do mês" cor={esgotado ? '#FFB4B4' : undefined}>{esgotado ? 'atingido' : `mais ${produto.restantes}`}</Info>
                  {produto.daSemana && <Info rotulo="Rotação">muda {gira}</Info>}
                </div>

                {opcoes && !esgotado && (
                  <select value={escolha} onChange={(e) => setEscolha(e.target.value)} aria-label={`Escolha do ${produto.nome}`} className={`${TEXTO_PIXEL} text-[2.6cqw] w-full border border-[#3A5B7A] bg-[#0B0F1A] px-[2cqw] py-[1.4cqw] text-[#DFF3FF]`}>
                    <option value="">Escolha…</option>
                    {opcoes.map((o) => (
                      <option key={o.id} value={o.id}>{o.nome}</option>
                    ))}
                  </select>
                )}

                {!esgotado && emQuantidade(produto) && produto.restantes > 1 && (
                  <div className="flex items-center justify-center gap-[1.6cqw]">
                    <button type="button" aria-label="Menos" disabled={q <= 1} onClick={() => setQuantidade(Math.max(1, q - 1))} className={`${TEXTO_PIXEL} w-[8cqw] h-[8cqw] border border-[#3A5B7A] bg-[#0B0F1A] text-[4cqw] font-bold text-[#DFF3FF] leading-none enabled:cursor-pointer disabled:opacity-40`}>−</button>
                    <input type="number" inputMode="numeric" min={1} max={produto.restantes} value={q} onChange={(e) => setQuantidade(Number(e.target.value) || 1)} aria-label={`Quantidade de ${produto.nome}`} className={`${TEXTO_PIXEL} w-[16cqw] text-center text-[3.2cqw] font-bold border border-[#3A5B7A] bg-[#0B0F1A] py-[1.2cqw] text-[#F5F3E0]`} />
                    <button type="button" aria-label="Mais" disabled={q >= produto.restantes} onClick={() => setQuantidade(Math.min(produto.restantes, q + 1))} className={`${TEXTO_PIXEL} w-[8cqw] h-[8cqw] border border-[#3A5B7A] bg-[#0B0F1A] text-[4cqw] font-bold text-[#DFF3FF] leading-none enabled:cursor-pointer disabled:opacity-40`}>+</button>
                  </div>
                )}

                {aviso && <p role={aviso.erro ? 'alert' : 'status'} className={`${TEXTO_PIXEL} text-[2.4cqw] text-center leading-snug ${aviso.erro ? 'text-[#FFB4B4]' : 'text-[#7BE08C]'}`}>{aviso.texto}</p>}

                {!esgotado && (
                  <BotaoDoKit disabled={ocupado || !estado.podeComprar || semSaldo || (!!opcoes && !escolha)} onClick={() => void comprar(produto, q, escolha || undefined)} className="w-full py-[1cqw]">
                    {ocupado ? 'Resgatando...' : semSaldo ? 'Saldo insuficiente' : `Resgatar${q > 1 ? ` ${q}` : ''} · ${formatarCompacto(produto.preco * q)}`}
                  </BotaoDoKit>
                )}
              </div>
            </PainelDaForja>
          </div>
        </div>
      )}
    </main>
  );
}
