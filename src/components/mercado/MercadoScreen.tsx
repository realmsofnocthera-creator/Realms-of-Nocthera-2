'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { CATEGORIAS_DO_MERCADO, NOME_DA_CATEGORIA, RARIDADES_DO_MERCADO, type CategoriaDoMercado, type MoedaDoMercado } from '@/rules/mercado';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import type { AnuncioNaTela, EstadoDoMercado, ItemVendavel } from '@/server/mercado';
import { NOCTHERA_THEME } from '@/theme/theme';

type Token = () => Promise<string | null>;
const OURO = '#C8A656';
const VERMELHO = '#E5484D';
const VERDE = '#7BC47F';
type Aba = 'comprar' | 'vender' | 'meus';
const ABAS: readonly { id: Aba; nome: string }[] = [
  { id: 'comprar', nome: 'Comprar' },
  { id: 'vender', nome: 'Vender' },
  { id: 'meus', nome: 'Meus anúncios' },
];

interface Filtro {
  categoria: string;
  raridade: string;
  busca: string;
  ordem: string;
  pagina: number;
}

async function chamar(tokenFresco: Token, filtro: Filtro | null, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const q = filtro ? `?${new URLSearchParams({ ...(filtro.categoria ? { categoria: filtro.categoria } : {}), ...(filtro.raridade ? { raridade: filtro.raridade } : {}), ...(filtro.busca ? { busca: filtro.busca } : {}), ordem: filtro.ordem, pagina: String(filtro.pagina) })}` : '';
    const res = await fetch(`/api/mercado${q}`, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    return { ok: res.ok, dados: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { error: 'Sem conexão. Tente de novo.' } };
  }
}

const preco = (moeda: MoedaDoMercado, n: number) => `${n.toLocaleString('pt-BR')} ${moeda === 'ouro' ? 'de ouro' : n === 1 ? 'Diamante' : 'Diamantes'}`;
const corDaRaridade = (r: string) => EMBLEMA_RARIDADE_MAP[r as keyof typeof EMBLEMA_RARIDADE_MAP]?.cor ?? '#F5E3B3';

function Botao({ children, onClick, disabled, perigo }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className="rounded-sm border px-3 py-1.5 text-xs font-bold disabled:opacity-50 shrink-0"
      style={{ borderColor: perigo ? VERMELHO : OURO, backgroundColor: '#3A2F18', color: '#F5E3B3' }}
    >
      {children}
    </button>
  );
}

function CartaoDoAnuncio({ a, acao }: { a: AnuncioNaTela; acao: React.ReactNode }) {
  const { colors } = NOCTHERA_THEME;
  return (
    <li className="rounded-sm border px-2.5 py-2 flex items-center justify-between gap-2" style={{ borderColor: '#4A3F2A', backgroundColor: colors.background.secondary }}>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold truncate" style={{ color: corDaRaridade(a.raridade) }}>
          {a.quantidade > 1 ? `${a.quantidade.toLocaleString('pt-BR')}× ` : ''}
          {a.nome}
        </span>
        <span className="text-[11px]" style={{ color: colors.text.secondary }}>
          {[NOME_DA_CATEGORIA[a.categoria], a.nomeDaRaridade, a.detalhe].filter(Boolean).join(' · ')}
        </span>
        <span className="text-[11px]" style={{ color: colors.text.secondary }}>
          {a.meu ? 'Seu anúncio' : `Vendedor: ${a.vendedor}`} · expira em {new Date(a.expiraEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs font-bold" style={{ color: '#F5E3B3' }}>{preco(a.moeda, a.preco)}</span>
        {acao}
      </div>
    </li>
  );
}

/**
 * Mercado (7.2): por enquanto a Troca entre jogadores. Comprar (com filtros), vender o que está na mochila (por ouro
 * ou Diamantes, o anúncio dura 7 dias) e ver ou cancelar os próprios anúncios. A loja normal e o leilão entram depois.
 */
export function MercadoScreen({ tokenFresco }: { tokenFresco: Token }) {
  const { colors } = NOCTHERA_THEME;
  const [estado, setEstado] = useState<EstadoDoMercado | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<Aba>('comprar');
  const [filtro, setFiltro] = useState<Filtro>({ categoria: '', raridade: '', busca: '', ordem: 'menorPreco', pagina: 1 });
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    const r = await chamar(tokenFresco, filtro);
    if (r.ok) {
      setEstado(r.dados as unknown as EstadoDoMercado);
      setErroAoCarregar(false);
    } else setErroAoCarregar(true);
  }, [tokenFresco, filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function agir(corpo: Record<string, unknown>): Promise<boolean> {
    setOcupado(true);
    setAviso(null);
    const r = await chamar(tokenFresco, null, corpo);
    setOcupado(false);
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? 'Feito.' : 'Não foi possível agora.')), erro: !r.ok });
    await carregar();
    return r.ok;
  }

  const campo = 'rounded-sm border px-2 py-1 text-xs';
  const estiloCampo = { backgroundColor: '#221C16', borderColor: '#4A3F2A', color: colors.text.primary };

  return (
    <main className="min-h-dvh w-full flex flex-col items-center px-2.5 sm:px-5 py-3 sm:py-6" style={{ backgroundColor: colors.background.primary, color: colors.text.primary }}>
      <div className="w-full max-w-[520px] flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <Link href="/menu" aria-label="Voltar ao Menu" className="p-1"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-cinzel font-extrabold italic tracking-widest uppercase" style={{ color: '#F5E3B3' }}>Mercado</h1>
        </header>
        {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-sm font-semibold" style={{ color: aviso.erro ? VERMELHO : VERDE }}>{aviso.texto}</p>}
        {erroAoCarregar ? (
          <p role="alert" className="text-sm" style={{ color: VERMELHO }}>Não foi possível carregar o Mercado agora. Tente de novo em instantes.</p>
        ) : !estado ? (
          <p className="text-sm" style={{ color: colors.text.secondary }}>Carregando...</p>
        ) : (
          <>
            <p className="text-[11px]" style={{ color: colors.text.secondary }}>
              Seu saldo: {preco('ouro', estado.ouro)} · {preco('diamantes', estado.diamantes)}
            </p>
            {!estado.podeNegociar && <p role="status" className="text-xs font-semibold" style={{ color: '#E6C775' }}>{estado.motivo}</p>}
            <div role="tablist" aria-label="Mercado" className="flex gap-1.5">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={aba === a.id}
                  onClick={() => setAba(a.id)}
                  className="rounded-sm border px-2.5 py-1 text-xs font-bold font-cinzel"
                  style={{ borderColor: OURO, backgroundColor: aba === a.id ? OURO : '#221C16', color: aba === a.id ? '#1A140E' : '#F5E3B3' }}
                >
                  {a.nome}
                  {a.id === 'meus' ? ` (${estado.meus.length}/${estado.limiteDeAnuncios})` : ''}
                </button>
              ))}
            </div>

            {aba === 'comprar' && (
              <section className="flex flex-col gap-2" aria-label="Comprar">
                <form
                  className="flex gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setFiltro((f) => ({ ...f, busca, pagina: 1 }));
                  }}
                >
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" className={`${campo} flex-1`} style={estiloCampo} maxLength={40} />
                  <Botao><Search className="w-3.5 h-3.5" /></Botao>
                </form>
                <div className="grid grid-cols-3 gap-1.5">
                  <select aria-label="Categoria" value={filtro.categoria} onChange={(e) => setFiltro((f) => ({ ...f, categoria: e.target.value, pagina: 1 }))} className={campo} style={estiloCampo}>
                    <option value="">Tudo</option>
                    {CATEGORIAS_DO_MERCADO.map((c) => <option key={c} value={c}>{NOME_DA_CATEGORIA[c]}</option>)}
                  </select>
                  <select aria-label="Raridade" value={filtro.raridade} onChange={(e) => setFiltro((f) => ({ ...f, raridade: e.target.value, pagina: 1 }))} className={campo} style={estiloCampo}>
                    <option value="">Toda raridade</option>
                    {RARIDADES_DO_MERCADO.map((r) => <option key={r} value={r}>{EMBLEMA_RARIDADE_MAP[r]?.nome ?? r}</option>)}
                  </select>
                  <select aria-label="Ordem" value={filtro.ordem} onChange={(e) => setFiltro((f) => ({ ...f, ordem: e.target.value, pagina: 1 }))} className={campo} style={estiloCampo}>
                    <option value="menorPreco">Menor preço</option>
                    <option value="maiorPreco">Maior preço</option>
                    <option value="recentes">Mais recentes</option>
                  </select>
                </div>
                {estado.anuncios.length === 0 ? (
                  <p className="text-xs" style={{ color: colors.text.secondary }}>Nenhum anúncio com esses filtros.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {estado.anuncios.map((a) => (
                      <CartaoDoAnuncio
                        key={a.id}
                        a={a}
                        acao={a.meu ? null : <Botao disabled={ocupado || !estado.podeNegociar} onClick={() => void agir({ acao: 'comprar', id: a.id })}>Comprar</Botao>}
                      />
                    ))}
                  </ul>
                )}
                {estado.paginas > 1 && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <Botao disabled={estado.pagina <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: f.pagina - 1 }))}>Anterior</Botao>
                    <span>{estado.pagina} de {estado.paginas}</span>
                    <Botao disabled={estado.pagina >= estado.paginas} onClick={() => setFiltro((f) => ({ ...f, pagina: f.pagina + 1 }))}>Próxima</Botao>
                  </div>
                )}
              </section>
            )}

            {aba === 'vender' && <Vender estado={estado} ocupado={ocupado} anunciar={(corpo) => agir({ acao: 'anunciar', ...corpo })} />}

            {aba === 'meus' && (
              <section className="flex flex-col gap-2" aria-label="Meus anúncios">
                {estado.meus.length === 0 ? (
                  <p className="text-xs" style={{ color: colors.text.secondary }}>Você não tem anúncios no Mercado.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {estado.meus.map((a) => (
                      <CartaoDoAnuncio key={a.id} a={a} acao={<Botao perigo disabled={ocupado} onClick={() => void agir({ acao: 'cancelar', id: a.id })}>Cancelar</Botao>} />
                    ))}
                  </ul>
                )}
                <p className="text-[11px]" style={{ color: colors.text.secondary }}>
                  Quando alguém compra, o valor entra direto no seu saldo e chega um aviso no Correio. Depois de 7 dias sem venda, o item volta para a sua mochila.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Vender({ estado, ocupado, anunciar }: { estado: EstadoDoMercado; ocupado: boolean; anunciar: (corpo: Record<string, unknown>) => Promise<boolean> }) {
  const { colors } = NOCTHERA_THEME;
  const [categoria, setCategoria] = useState<CategoriaDoMercado | ''>('');
  const [escolhido, setEscolhido] = useState<ItemVendavel | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [moeda, setMoeda] = useState<MoedaDoMercado>('ouro');
  const [valor, setValor] = useState(100);
  const lista = useMemo(() => estado.vendaveis.filter((v) => !categoria || v.categoria === categoria), [estado.vendaveis, categoria]);
  const campo = 'rounded-sm border px-2 py-1 text-xs';
  const estiloCampo = { backgroundColor: '#221C16', borderColor: '#4A3F2A', color: colors.text.primary };
  const emLote = escolhido && (escolhido.ref.tipo === 'material' || escolhido.ref.tipo === 'recurso');
  const cheio = estado.meus.length >= estado.limiteDeAnuncios;

  return (
    <section className="flex flex-col gap-2" aria-label="Vender">
      {cheio && <p className="text-xs" style={{ color: '#E6C775' }}>Você já tem {estado.limiteDeAnuncios} anúncios. Cancele um ou espere vender.</p>}
      <select aria-label="Categoria" value={categoria} onChange={(e) => { setCategoria(e.target.value as CategoriaDoMercado | ''); setEscolhido(null); }} className={campo} style={estiloCampo}>
        <option value="">Tudo o que posso vender</option>
        {CATEGORIAS_DO_MERCADO.map((c) => <option key={c} value={c}>{NOME_DA_CATEGORIA[c]}</option>)}
      </select>
      {lista.length === 0 ? (
        <p className="text-xs" style={{ color: colors.text.secondary }}>Nada para vender aqui. Itens equipados, colecionáveis, ouro, Diamantes e Essência de Soberano não entram no Mercado.</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-[45vh] overflow-y-auto">
          {lista.map((v) => {
            const ativo = escolhido?.ref.tipo === v.ref.tipo && escolhido.ref.id === v.ref.id;
            return (
              <li key={`${v.ref.tipo}:${v.ref.id}`}>
                <button
                  type="button"
                  onClick={() => { setEscolhido(v); setQuantidade(1); }}
                  aria-pressed={ativo}
                  className="w-full text-left rounded-sm border px-2.5 py-1.5 flex justify-between gap-2"
                  style={{ borderColor: ativo ? OURO : '#4A3F2A', backgroundColor: colors.background.secondary }}
                >
                  <span className="text-xs font-semibold truncate" style={{ color: corDaRaridade(v.raridade) }}>{v.nome}</span>
                  <span className="text-[11px] shrink-0" style={{ color: colors.text.secondary }}>{[v.nomeDaRaridade, v.detalhe, v.quantidade > 1 ? `tem ${v.quantidade.toLocaleString('pt-BR')}` : ''].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {escolhido && (
        <form
          className="rounded-sm border-2 p-2.5 flex flex-col gap-2"
          style={{ borderColor: OURO, backgroundColor: colors.background.secondary }}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await anunciar({ item: escolhido.ref, quantidade: emLote ? quantidade : 1, moeda, preco: valor });
            if (ok) setEscolhido(null);
          }}
        >
          <span className="text-xs font-bold" style={{ color: corDaRaridade(escolhido.raridade) }}>{escolhido.nome}</span>
          {emLote && (
            <label className="text-[11px] flex flex-col gap-0.5">
              Quantidade do lote (de 1 a {escolhido.quantidade.toLocaleString('pt-BR')}): quem compra leva o lote inteiro
              <input type="number" min={1} max={escolhido.quantidade} value={quantidade} onChange={(e) => setQuantidade(Math.max(1, Math.min(escolhido.quantidade, Math.floor(Number(e.target.value) || 1))))} className={campo} style={estiloCampo} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <label className="text-[11px] flex flex-col gap-0.5">
              Moeda
              <select value={moeda} onChange={(e) => setMoeda(e.target.value as MoedaDoMercado)} className={campo} style={estiloCampo}>
                <option value="ouro">Ouro</option>
                <option value="diamantes">Diamantes</option>
              </select>
            </label>
            <label className="text-[11px] flex flex-col gap-0.5">
              Preço {emLote ? 'do lote' : ''}
              <input type="number" min={1} value={valor} onChange={(e) => setValor(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className={campo} style={estiloCampo} />
            </label>
          </div>
          <p className="text-[11px]" style={{ color: colors.text.secondary }}>O item sai da sua mochila e fica no Mercado por 7 dias. Sem taxa: você recebe o valor inteiro.</p>
          <Botao disabled={ocupado || cheio || !estado.podeNegociar}>Anunciar por {preco(moeda, valor)}</Botao>
        </form>
      )}
    </section>
  );
}
