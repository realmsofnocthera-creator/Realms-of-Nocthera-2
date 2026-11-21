'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ARENA_UI } from '@/assets/arenaUi';
import { GEMA_DA_RARIDADE, TELAS_UI } from '@/assets/telasSociaisUi';
import { Janela } from '@/components/arena/PecasDaArena';
import { PalcoPixel } from '@/components/pixel/GradePixel';
import { Abas, AreaQueRola, AvisoDaTela, BotaoLargo, BotaoPequeno, Cabecalho, CAMPO, CREME, DOURADO, FaixaDeArte, Icone, Recado, Rotulo, SUB, SOMBRA_DO_TEXTO, pixel, u } from '@/components/pixel/PecasDeTela';
import { LeilaoPainel } from '@/components/mercado/LeilaoPainel';
import { CATEGORIAS_DO_MERCADO, NOME_DA_CATEGORIA, RARIDADES_DO_MERCADO, type CategoriaDoMercado, type MoedaDoMercado } from '@/rules/mercado';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { TEXTOS_DAS_TELAS as TT } from '@/rules/textosDasTelasSociais';
import type { AnuncioNaTela, EstadoDoMercado, ItemVendavel } from '@/server/mercado';

type Token = () => Promise<string | null>;
const T = TT.mercado;
type Aba = 'comprar' | 'vender' | 'meus' | 'leilao';

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
    return { ok: false, dados: { error: TT.semConexao } };
  }
}

export const precoEmTexto = (moeda: MoedaDoMercado, n: number) => `${n.toLocaleString('pt-BR')} ${moeda === 'ouro' ? 'de ouro' : n === 1 ? 'Diamante' : 'Diamantes'}`;
export const corDaRaridade = (r: string) => EMBLEMA_RARIDADE_MAP[r as keyof typeof EMBLEMA_RARIDADE_MAP]?.cor ?? CREME;
/** O cartão da linha pela raridade: dourado (épico para cima), prateado (raro e muito raro) ou cinza (comum). */
export const cartaoDaRaridade = (r: string) => (r === 'epico' || r === 'lendario' || r === 'mitico' ? ARENA_UI.card.forte : r === 'raro' || r === 'muitoRaro' ? ARENA_UI.card.neutro : ARENA_UI.card.fraco);

/** O preço com o ícone da moeda (a moeda ou o diamante do kit da Arena). */
export function Preco({ moeda, valor, direita, y }: { moeda: MoedaDoMercado; valor: number; direita: number; y: number }) {
  return (
    <span className="absolute flex items-center font-cinzel font-black leading-none" style={{ right: u(direita), top: u(y), gap: u(2), fontSize: u(7), color: DOURADO, textShadow: SOMBRA_DO_TEXTO }} aria-label={precoEmTexto(moeda, valor)}>
      {valor.toLocaleString('pt-BR')}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={moeda === 'ouro' ? ARENA_UI.moeda : ARENA_UI.diamante} alt="" aria-hidden draggable={false} style={{ width: u(moeda === 'ouro' ? 9 : 10), height: u(moeda === 'ouro' ? 9 : 8), ...pixel }} />
    </span>
  );
}

function LinhaDoAnuncio({ a, acao }: { a: AnuncioNaTela; acao: React.ReactNode }) {
  return (
    <FaixaDeArte src={cartaoDaRaridade(a.raridade)} a={50} esq={85} dir={22}>
      <Icone src={GEMA_DA_RARIDADE[a.raridade] ?? GEMA_DA_RARIDADE.comum} x={13} y={13} l={24} a={24} alt={a.nomeDaRaridade} />
      <Rotulo x={56} y={19} tamanho={7} largura={170} cor={corDaRaridade(a.raridade)}>{`${a.quantidade > 1 ? `${a.quantidade.toLocaleString('pt-BR')}× ` : ''}${a.nome}`}</Rotulo>
      <Rotulo x={56} y={28.5} tamanho={5} largura={180} cor="#D9CBB0" negrito={false}>{[NOME_DA_CATEGORIA[a.categoria], a.nomeDaRaridade, a.detalhe].filter(Boolean).join(' · ')}</Rotulo>
      <Rotulo x={56} y={36.5} tamanho={5} largura={180} cor={SUB} negrito={false}>{`${a.meu ? T.seuAnuncio : T.vendedor(a.vendedor)} · ${T.expira(new Date(a.expiraEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}`}</Rotulo>
      <Preco moeda={a.moeda} valor={a.preco} direita={30} y={15} />
      {acao}
    </FaixaDeArte>
  );
}

/**
 * Mercado (7.2), sobre a cidade do Hub: a Troca entre jogadores (comprar com filtros, vender o que está na mochila por ouro ou Diamantes, ver ou
 * cancelar os próprios anúncios) e o Leilão. As linhas são os cartões do kit da Arena, na cor da raridade, com a gema da raridade da Coleção.
 */
export function MercadoScreen({ tokenFresco }: { tokenFresco: Token }) {
  const [estado, setEstado] = useState<EstadoDoMercado | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<Aba>('comprar');
  const [regras, setRegras] = useState(false);
  // o card Leilão do Menu abre direto na aba do leilão (?aba=leilao)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('aba') === 'leilao') setAba('leilao');
  }, []);
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
    setAviso({ texto: String(r.dados.mensagem ?? r.dados.error ?? (r.ok ? TT.feito : TT.naoFoiPossivel)), erro: !r.ok });
    await carregar();
    return r.ok;
  }

  const abas = [
    { id: 'comprar' as const, nome: T.abas.comprar },
    { id: 'vender' as const, nome: T.abas.vender },
    { id: 'meus' as const, nome: estado ? `${T.abas.meus} ${estado.meus.length}/${estado.limiteDeAnuncios}` : T.abas.meus },
    { id: 'leilao' as const, nome: T.abas.leilao },
  ];

  return (
    <PalcoPixel fundo={TELAS_UI.fundoMercado}>
      <Cabecalho titulo={T.titulo} voltar="/menu" aoAbrirLivro={() => setRegras(true)} rotuloVoltar={TT.voltarAoMenu} rotuloLivro={TT.comoFunciona} />
      <AvisoDaTela aviso={aviso} y={66} />
      {erroAoCarregar ? <Recado erro>{TT.erroAoCarregar}</Recado>
        : !estado ? <Recado>{TT.carregando}</Recado>
        : (
          <>
            <Abas rotulo={T.titulo} y={70} ativa={aba} aoMudar={setAba} abas={abas} />
            {/* o saldo */}
            <div className="absolute flex items-center justify-center font-cinzel font-black" style={{ left: 0, right: 0, top: u(113), gap: u(10), fontSize: u(7.4), color: CREME, textShadow: SOMBRA_DO_TEXTO }} aria-label={`${T.saldo}: ${precoEmTexto('ouro', estado.ouro)}, ${precoEmTexto('diamantes', estado.diamantes)}`}>
              <span className="flex items-center" style={{ gap: u(3) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ARENA_UI.moeda} alt="" aria-hidden style={{ width: u(11), height: u(11), ...pixel }} />{estado.ouro.toLocaleString('pt-BR')}
              </span>
              <span className="flex items-center" style={{ gap: u(3) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ARENA_UI.diamante} alt="" aria-hidden style={{ width: u(12), height: u(9), ...pixel }} />{estado.diamantes.toLocaleString('pt-BR')}
              </span>
            </div>
            {!estado.podeNegociar && aba !== 'leilao' && <p role="status" className="absolute font-cinzel font-bold text-center" style={{ left: u(20), right: u(20), top: u(126), fontSize: u(6), color: '#E6C775', textShadow: SOMBRA_DO_TEXTO }}>{estado.motivo}</p>}

            {aba === 'comprar' && (
              <AreaQueRola topo={136} base={532} rotulo={T.abas.comprar}>
                <form className="flex shrink-0" style={{ gap: u(4) }} onSubmit={(e) => { e.preventDefault(); setFiltro((f) => ({ ...f, busca, pagina: 1 })); }}>
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={T.buscar} aria-label={T.buscar} className="flex-1 font-cinzel" style={CAMPO} maxLength={40} />
                  <button type="submit" className="font-cinzel font-black uppercase shrink-0 cursor-pointer" style={{ ...CAMPO, color: DOURADO }}>{T.buscar.split(' ')[0]}</button>
                </form>
                <div className="grid grid-cols-3 shrink-0" style={{ gap: u(4) }}>
                  <select aria-label={T.categoria} value={filtro.categoria} onChange={(e) => setFiltro((f) => ({ ...f, categoria: e.target.value, pagina: 1 }))} className="font-cinzel" style={CAMPO}>
                    <option value="">{T.tudo}</option>
                    {CATEGORIAS_DO_MERCADO.map((c) => <option key={c} value={c}>{NOME_DA_CATEGORIA[c]}</option>)}
                  </select>
                  <select aria-label={T.raridade} value={filtro.raridade} onChange={(e) => setFiltro((f) => ({ ...f, raridade: e.target.value, pagina: 1 }))} className="font-cinzel" style={CAMPO}>
                    <option value="">{T.todaRaridade}</option>
                    {RARIDADES_DO_MERCADO.map((r) => <option key={r} value={r}>{EMBLEMA_RARIDADE_MAP[r]?.nome ?? r}</option>)}
                  </select>
                  <select aria-label={T.ordem} value={filtro.ordem} onChange={(e) => setFiltro((f) => ({ ...f, ordem: e.target.value, pagina: 1 }))} className="font-cinzel" style={CAMPO}>
                    <option value="menorPreco">{T.menorPreco}</option>
                    <option value="maiorPreco">{T.maiorPreco}</option>
                    <option value="recentes">{T.recentes}</option>
                  </select>
                </div>
                {estado.anuncios.length === 0 ? (
                  <p className="font-cinzel font-bold text-center" style={{ fontSize: u(7.4), color: CREME, textShadow: SOMBRA_DO_TEXTO, marginTop: u(20) }}>{T.nenhumAnuncio}</p>
                ) : estado.anuncios.map((a) => (
                  <LinhaDoAnuncio key={a.id} a={a} acao={a.meu ? null : <BotaoPequeno direita={26} y={26} desligado={ocupado || !estado.podeNegociar} onClick={() => void agir({ acao: 'comprar', id: a.id })} rotulo={`${T.comprar} ${a.nome}`}>{T.comprar}</BotaoPequeno>} />
                ))}
                {estado.paginas > 1 && (
                  <div className="flex items-center justify-center shrink-0 font-cinzel font-black" style={{ gap: u(8), fontSize: u(7), color: CREME, textShadow: SOMBRA_DO_TEXTO, padding: `${u(4)} 0` }}>
                    <BotaoLargo largura={80} desligado={estado.pagina <= 1} onClick={() => setFiltro((f) => ({ ...f, pagina: f.pagina - 1 }))}>{T.anterior}</BotaoLargo>
                    <span>{T.pagina(estado.pagina, estado.paginas)}</span>
                    <BotaoLargo largura={80} desligado={estado.pagina >= estado.paginas} onClick={() => setFiltro((f) => ({ ...f, pagina: f.pagina + 1 }))}>{T.proxima}</BotaoLargo>
                  </div>
                )}
              </AreaQueRola>
            )}

            {aba === 'leilao' && (
              <AreaQueRola topo={128} base={532} rotulo={T.abas.leilao}>
                <LeilaoPainel tokenFresco={tokenFresco} />
              </AreaQueRola>
            )}

            {aba === 'vender' && <Vender estado={estado} ocupado={ocupado} anunciar={(corpo) => agir({ acao: 'anunciar', ...corpo })} />}

            {aba === 'meus' && (
              <AreaQueRola topo={136} base={532} rotulo={T.abas.meus}>
                {estado.meus.length === 0 && <p className="font-cinzel font-bold text-center" style={{ fontSize: u(7.4), color: CREME, textShadow: SOMBRA_DO_TEXTO, marginTop: u(20) }}>{T.semAnuncios}</p>}
                {estado.meus.map((a) => (
                  <LinhaDoAnuncio key={a.id} a={a} acao={<BotaoPequeno direita={26} y={26} perigo desligado={ocupado} onClick={() => void agir({ acao: 'cancelar', id: a.id })} rotulo={`${T.cancelar} ${a.nome}`}>{T.cancelar}</BotaoPequeno>} />
                ))}
                <p className="font-cinzel text-center shrink-0" style={{ fontSize: u(6), lineHeight: 1.45, color: SUB, textShadow: SOMBRA_DO_TEXTO, padding: `${u(4)} ${u(6)}` }}>{T.meusRodape}</p>
              </AreaQueRola>
            )}
          </>
        )}
      {regras && <Janela titulo={T.titulo} aoFechar={() => setRegras(false)} fechar={TT.fechar}><p>{T.regras}</p></Janela>}
    </PalcoPixel>
  );
}

function Vender({ estado, ocupado, anunciar }: { estado: EstadoDoMercado; ocupado: boolean; anunciar: (corpo: Record<string, unknown>) => Promise<boolean> }) {
  const [categoria, setCategoria] = useState<CategoriaDoMercado | ''>('');
  const [escolhido, setEscolhido] = useState<ItemVendavel | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [moeda, setMoeda] = useState<MoedaDoMercado>('ouro');
  const [valor, setValor] = useState(100);
  const lista = useMemo(() => estado.vendaveis.filter((v) => !categoria || v.categoria === categoria), [estado.vendaveis, categoria]);
  const emLote = escolhido && (escolhido.ref.tipo === 'material' || escolhido.ref.tipo === 'recurso');
  const cheio = estado.meus.length >= estado.limiteDeAnuncios;
  const rotuloCampo: React.CSSProperties = { fontSize: u(6.4), color: SUB, display: 'flex', flexDirection: 'column', gap: u(2) };

  return (
    <>
      <AreaQueRola topo={136} base={532} rotulo={T.abas.vender}>
        {cheio && <p className="font-cinzel font-bold text-center shrink-0" style={{ fontSize: u(6.6), color: '#E6C775', textShadow: SOMBRA_DO_TEXTO }}>{T.cheio(estado.limiteDeAnuncios)}</p>}
        <select aria-label={T.categoria} value={categoria} onChange={(e) => { setCategoria(e.target.value as CategoriaDoMercado | ''); setEscolhido(null); }} className="font-cinzel shrink-0" style={CAMPO}>
          <option value="">{T.tudoQuePosso}</option>
          {CATEGORIAS_DO_MERCADO.map((c) => <option key={c} value={c}>{NOME_DA_CATEGORIA[c]}</option>)}
        </select>
        {lista.length === 0 ? (
          <p className="font-cinzel font-bold text-center" style={{ fontSize: u(7), lineHeight: 1.4, color: CREME, textShadow: SOMBRA_DO_TEXTO, marginTop: u(16) }}>{T.nadaParaVender}</p>
        ) : lista.map((v) => (
          <FaixaDeArte key={`${v.ref.tipo}:${v.ref.id}`} src={cartaoDaRaridade(v.raridade)} a={40} esq={85} dir={22} onClick={() => { setEscolhido(v); setQuantidade(1); }} rotulo={`${T.vender} ${v.nome}`}>
            <Icone src={GEMA_DA_RARIDADE[v.raridade] ?? GEMA_DA_RARIDADE.comum} x={13} y={9} l={22} a={22} alt={v.nomeDaRaridade} />
            <Rotulo x={56} y={16} tamanho={7} largura={230} cor={corDaRaridade(v.raridade)}>{v.nome}</Rotulo>
            <Rotulo x={56} y={27} tamanho={5} largura={230} cor="#D9CBB0" negrito={false}>{[v.nomeDaRaridade, v.detalhe, v.quantidade > 1 ? T.tem(v.quantidade.toLocaleString('pt-BR')) : ''].filter(Boolean).join(' · ')}</Rotulo>
          </FaixaDeArte>
        ))}
      </AreaQueRola>
      {escolhido && (
        <Janela titulo={escolhido.nome} aoFechar={() => setEscolhido(null)} fechar={TT.fechar}>
          <form className="flex flex-col font-cinzel" style={{ gap: u(6) }} onSubmit={async (e) => {
            e.preventDefault();
            const ok = await anunciar({ item: escolhido.ref, quantidade: emLote ? quantidade : 1, moeda, preco: valor });
            if (ok) setEscolhido(null);
          }}>
            <p style={{ color: corDaRaridade(escolhido.raridade), fontWeight: 800 }}>{[EMBLEMA_RARIDADE_MAP[escolhido.raridade as keyof typeof EMBLEMA_RARIDADE_MAP]?.nome, escolhido.detalhe].filter(Boolean).join(' · ')}</p>
            {emLote && (
              <label style={rotuloCampo}>
                {T.quantidade(escolhido.quantidade.toLocaleString('pt-BR'))}
                <input type="number" min={1} max={escolhido.quantidade} value={quantidade} onChange={(e) => setQuantidade(Math.max(1, Math.min(escolhido.quantidade, Math.floor(Number(e.target.value) || 1))))} style={CAMPO} />
              </label>
            )}
            <div className="grid grid-cols-2" style={{ gap: u(5) }}>
              <label style={rotuloCampo}>
                {T.moeda}
                <select value={moeda} onChange={(e) => setMoeda(e.target.value as MoedaDoMercado)} style={CAMPO}>
                  <option value="ouro">{T.ouro}</option>
                  <option value="diamantes">{T.diamantes}</option>
                </select>
              </label>
              <label style={rotuloCampo}>
                {T.preco(!!emLote)}
                <input type="number" min={1} value={valor} onChange={(e) => setValor(Math.max(1, Math.floor(Number(e.target.value) || 1)))} style={CAMPO} />
              </label>
            </div>
            <p style={{ color: SUB }}>{T.semTaxa}</p>
            <button type="submit" disabled={ocupado || cheio || !estado.podeNegociar} className="self-center relative cursor-pointer disabled:cursor-not-allowed" style={{ width: u(200), height: u(30), backgroundImage: `url(${ocupado || cheio || !estado.podeNegociar ? ARENA_UI.botaoOff : ARENA_UI.botao})`, backgroundSize: '100% 100%', ...pixel }}>
              <span className="absolute inset-0 flex items-center justify-center font-black uppercase" style={{ fontSize: u(7), color: '#2A1A0E' }}>{T.anunciar(precoEmTexto(moeda, valor))}</span>
            </button>
          </form>
        </Janela>
      )}
    </>
  );
}
