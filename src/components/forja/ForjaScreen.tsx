'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import type { CharacterDocument } from '@/server/characterService';
import type { ArmaPersonagem } from '@/game/forja';
import { CATEGORIAS_ARMA_MAP, type CategoriaArma, type OpcaoCustomizacao } from '@/rules/armas';
import {
  type ArvoreForja,
  type DetalheArmaTela,
  type DetalheMinhaArmaTela,
  type NoForja,
  arvoresVisiveis,
  detalheDaArma,
  detalheDaMinhaArma,
  minhasArmasTela,
} from '@/lib/forjaTela';
import { AnimacaoDeForja, TEMPO_DA_MARTELADA_MS, semMovimento, type AnimacaoDeForjaProps, type LinhaDoResultado } from './AnimacaoDeForja';
import { Abas, BarraDeTitulo, BotaoDoKit, BotaoRedondo, FundoDaForja, OuroDaForja, PainelDaForja, PalcoDaForja, SlotDeArma, TEXTO_PIXEL } from './KitDaForja';
import { PainelDaArma, PainelDaMinhaArma } from './PainelDaArma';
import { FolhaMinhaArma, ROTULO_ESTADO, SlotComIcone, estrelas, nomeDaOpcao } from './PopupsDaForja';
import { SelecaoDeArma } from './SelecaoDeArma';

export { FolhaMinhaArma };

interface ForjaScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
  /** Abre direto na árvore desta categoria (sem passar pela grade). */
  categoriaInicial?: CategoriaArma;
}

interface RespostaForjaTela {
  character: CharacterDocument;
  arma: ArmaPersonagem;
}

type Aba = 'lista' | 'arvore' | 'minhas';
type Animacao = Omit<AnimacaoDeForjaProps, 'aoFechar'>;

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const NOME_ATRIBUTO: Readonly<Record<string, string>> = { vigor: 'Vigor', sorte: 'Sorte', forca: 'Força', vitalidade: 'Vitalidade', arcano: 'Arcano', inteligencia: 'Inteligência', agilidade: 'Agilidade' };

/** A primeira arma que dá para forjar agora, ou a primeira da primeira árvore (a arma que o painel da direita mostra de início). */
function armaInicial(arvores: readonly ArvoreForja[]): string | null {
  const nos = arvores.flatMap((a) => a.ramos.flatMap((r) => r.nos));
  return (nos.find((n) => n.estado === 'disponivel') ?? nos[0])?.baseId ?? null;
}

/**
 * A Forja de armas em pixel (kit azul e dourado), na disposição da referência: a lista de árvores à esquerda e, à
 * direita, a arma escolhida com os materiais, o custo e as informações dela; as abas Lista, Árvore e Minhas no topo e
 * a barra de estado embaixo. Primeiro vem a grade de categorias. Toda regra (receita, ouro, sorteio) é do servidor.
 */
export function ForjaScreen({ character, onCharacterChange, tokenFresco, categoriaInicial }: ForjaScreenProps) {
  const [categoria, setCategoria] = useState<CategoriaArma | null>(categoriaInicial ?? null);
  const [aba, setAba] = useState<Aba>('lista');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [minhaSel, setMinhaSel] = useState<string | null>(null);
  const [monstro, setMonstro] = useState(0);
  const [minhaAberta, setMinhaAberta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [animacao, setAnimacao] = useState<Animacao | null>(null);

  const cat = categoria ?? 'espadaGrande';
  const arvores = useMemo(() => (categoria ? arvoresVisiveis(cat, character) : []), [categoria, cat, character]);
  const minhas = useMemo(() => minhasArmasTela(character), [character]);
  const baseSel = selecionada ?? armaInicial(arvores);
  const detalhe = categoria && baseSel ? detalheDaArma(baseSel, cat, character) : null;
  const minhaId = minhaSel ?? minhas[0]?.id ?? null;
  const detalheMinha = minhaId ? detalheDaMinhaArma(minhaId, character) : null;
  const arvoreAtual = arvores[Math.min(monstro, Math.max(0, arvores.length - 1))];

  // Escolher a categoria entra no histórico: o voltar do celular volta para a grade
  useEffect(() => {
    const aoVoltar = () => {
      setCategoria((window.history.state?.forjaCategoria as CategoriaArma | undefined) ?? null);
      setSelecionada(null);
      setMinhaAberta(false);
    };
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);
  const escolher = (c: CategoriaArma) => {
    window.history.pushState({ forjaCategoria: c }, '');
    setCategoria(c);
    setAba('lista');
    setSelecionada(null);
    setMonstro(0);
    setAviso(null);
    setErro(null);
  };
  const voltarParaAGrade = () => {
    if (window.history.state?.forjaCategoria) window.history.back();
    else setCategoria(null);
  };
  const mudarAba = useCallback((a: Aba) => {
    setAba(a);
    setErro(null);
    setAviso(null);
  }, []);
  const escolherArma = (baseId: string) => {
    setErro(null);
    setAviso(null);
    setSelecionada(baseId);
    // na Lista, tocar numa arma mostra a árvore dela no zoom da aba Árvore ao trocar de aba
    const i = arvores.findIndex((a) => a.ramos.some((r) => r.nos.some((n) => n.baseId === baseId)));
    if (i >= 0) setMonstro(i);
  };

  const chamar = async <T,>(rota: string, corpo: unknown, minimo: number): Promise<T> => {
    const token = await tokenFresco();
    if (!token) throw new Error('Sessão expirada. Faça login de novo.');
    const [res] = await Promise.all([
      fetch(rota, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo) }),
      esperar(semMovimento() ? 0 : minimo),
    ]);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Não foi possível concluir na Forja.');
    return data as T;
  };

  const forjar = async (d: DetalheArmaTela) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    setAnimacao({ fase: 'martelando', titulo: d.acao === 'Evoluir' ? 'EVOLUINDO' : 'FORJANDO', nome: d.nome, raridade: d.raridade, categoria: cat, baseId: d.baseId, linhas: [] });
    try {
      const r = await chamar<RespostaForjaTela>('/api/forja/fabricar', { baseId: d.baseId, categoria: cat, armaAnteriorId: d.armaAnteriorId ?? undefined }, TEMPO_DA_MARTELADA_MS);
      onCharacterChange(r.character);
      const linhas: LinhaDoResultado[] = [
        { rotulo: NOME_ATRIBUTO[r.arma.atributo] ?? r.arma.atributo, depois: `+${r.arma.pontos}` },
        { rotulo: d.tipoDano, depois: `${d.danoFixo}` },
      ];
      setAnimacao({ fase: 'revelada', titulo: d.acao === 'Evoluir' ? 'ARMA EVOLUÍDA!' : 'ARMA FORJADA!', nome: d.nome, raridade: d.raridade, categoria: cat, baseId: d.baseId, linhas });
    } catch (e) {
      setAnimacao(null);
      setErro(e instanceof Error ? e.message : 'Erro ao forjar a arma.');
    } finally {
      setOcupado(false);
    }
  };

  const reforjarArma = async (d: DetalheMinhaArmaTela) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    setAnimacao({ fase: 'martelando', titulo: 'REFORJANDO', nome: d.nome, raridade: d.raridade, categoria: d.categoria, baseId: d.baseId, linhas: [] });
    try {
      const r = await chamar<RespostaForjaTela>('/api/forja/reforjar', { armaId: d.id }, TEMPO_DA_MARTELADA_MS);
      onCharacterChange(r.character);
      setMinhaAberta(false);
      setAnimacao({
        fase: 'revelada',
        titulo: 'ARMA REFORJADA!',
        nome: d.nome,
        raridade: d.raridade,
        categoria: d.categoria,
        baseId: d.baseId,
        linhas: [{ rotulo: NOME_ATRIBUTO[r.arma.atributo] ?? r.arma.atributo, antes: `+${d.pontos}`, depois: `+${r.arma.pontos}`, subiu: r.arma.pontos === d.pontos ? null : r.arma.pontos > d.pontos }],
      });
    } catch (e) {
      setAnimacao(null);
      setErro(e instanceof Error ? e.message : 'Erro na Forja.');
    } finally {
      setOcupado(false);
    }
  };

  const customizarArma = async (d: DetalheMinhaArmaTela, opcao: OpcaoCustomizacao) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const r = await chamar<RespostaForjaTela>('/api/forja/customizar', { armaId: d.id, opcao }, 0);
      onCharacterChange(r.character);
      setAviso(`${d.nome}: +1 ponto em ${nomeDaOpcao(opcao)}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro na Forja.');
    } finally {
      setOcupado(false);
    }
  };

  const status = erro ?? aviso ?? (aba === 'minhas' ? (detalheMinha ? 'Toque em Reforjar para mexer na arma' : 'Você ainda não tem armas') : detalhe ? ROTULO_ESTADO[detalhe.estado] : arvores.length > 0 ? 'Enfrente os monstros para descobrir as armas' : 'Libere uma ★ na Caçada');
  const podeForjar = detalhe?.estado === 'disponivel';
  const textoDoBotao = ocupado ? 'Forjando...' : !detalhe ? 'Forjar' : detalhe.estado === 'tenho' || detalhe.estado === 'superada' ? 'Você tem' : detalhe.estado === 'bloqueada' ? 'Bloqueada' : detalhe.estado === 'faltaMaterial' ? 'Falta material' : detalhe.acao;

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#05070D]">
      <FundoDaForja />
      <PalcoDaForja>
        <header className="flex items-center gap-[1.4cqw] px-[2.4cqw] pt-[2.4cqw]">
          {categoria ? (
            <BotaoRedondo tipo="voltar" rotulo="Voltar para a escolha da arma" onClick={voltarParaAGrade} className="w-[9cqw] h-[9cqw] shrink-0" />
          ) : (
            <Link href="/ferreiro" aria-label="Voltar ao Ferreiro" className="w-[9cqw] h-[9cqw] shrink-0 cursor-pointer active:translate-y-px">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
            </Link>
          )}
          <BarraDeTitulo titulo={categoria ? CATEGORIAS_ARMA_MAP[categoria].nome : 'Forjar arma'} className="w-[58cqw]" />
          <span className="ml-auto"><OuroDaForja ouro={character.ouro} /></span>
        </header>

        {!categoria ? (
          <div className="flex-1 min-h-0 px-[2.4cqw] pt-[1.4cqw] pb-[3cqw] flex flex-col">
            <PainelDaForja as="section" aria-label="Escolha a arma" className="flex-1 min-h-0 overflow-y-auto forja-rolagem">
              <SelecaoDeArma armas={character.armas} aoEscolher={escolher} />
            </PainelDaForja>
          </div>
        ) : (
          <>
            <div className="px-[2.4cqw] pt-[1cqw]">
              <Abas<Aba>
                rotulo="Abas da Forja"
                ativa={aba}
                aoMudar={mudarAba}
                abas={[
                  { id: 'lista', nome: 'Lista' },
                  { id: 'arvore', nome: 'Árvore' },
                  { id: 'minhas', nome: `Minhas (${minhas.length})`, rotuloAcessivel: `Minhas armas (${minhas.length})` },
                ]}
              />
            </div>

            <div className="flex-1 min-h-0 px-[2.4cqw] pt-[1.2cqw] grid gap-[1.6cqw]" style={{ gridTemplateColumns: '57fr 43fr' }}>
              {/* ESQUERDA: a lista de árvores (ou o zoom de uma árvore, ou as minhas armas) */}
              <PainelDaForja as="section" aria-label={aba === 'lista' ? 'Lista de árvores' : aba === 'arvore' ? 'Árvore da arma' : 'Minhas armas'} className="min-h-0 overflow-y-auto forja-rolagem">
                {aba !== 'minhas' && arvores.length === 0 && (
                  <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw] px-[2cqw] leading-snug`}>Nenhuma árvore ainda. Libere a 1★ na Caçada e enfrente os monstros para descobrir as armas.</p>
                )}
                {aba === 'lista' && (
                  <div className="flex flex-col gap-[1cqw]">
                    {arvores.map((a) => (
                      <LinhaDaArvore key={a.monstroId} arvore={a} categoria={cat} selecionada={baseSel} onEscolher={escolherArma} />
                    ))}
                  </div>
                )}

                {aba === 'arvore' && arvoreAtual && (
                  <div className="flex flex-col gap-[2cqw]">
                    <div className="flex items-center gap-[1cqw]">
                      <button type="button" aria-label="Monstro anterior" disabled={monstro <= 0} onClick={() => setMonstro((m) => Math.max(0, m - 1))} className="w-[7cqw] h-[7cqw] shrink-0 cursor-pointer disabled:opacity-30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                      </button>
                      <h2 className="flex-1 min-w-0 text-center font-cinzel font-extrabold text-[3cqw] leading-tight text-[#9CD8FF] [text-shadow:1px_1px_0_#05070D]">
                        <span className="text-[#E7C46A]">{estrelas(arvoreAtual.estrela)}</span> {arvoreAtual.nome}
                      </h2>
                      <button type="button" aria-label="Próximo monstro" disabled={monstro >= arvores.length - 1} onClick={() => setMonstro((m) => Math.min(arvores.length - 1, m + 1))} className="w-[7cqw] h-[7cqw] shrink-0 cursor-pointer disabled:opacity-30 rotate-180">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
                      </button>
                    </div>
                    <LinhaDaArvore arvore={arvoreAtual} categoria={cat} selecionada={baseSel} onEscolher={escolherArma} grande semNome />
                  </div>
                )}

                {aba === 'minhas' &&
                  (minhas.length === 0 ? (
                    <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw]`}>Você ainda não tem armas. Forje a primeira na Lista.</p>
                  ) : (
                    <ul className="grid grid-cols-4 gap-x-[1.6cqw] gap-y-[2.4cqw]">
                      {minhas.map((m) => (
                        <li key={m.id} className="flex flex-col items-center gap-[0.6cqw]">
                          <button type="button" aria-label={`${m.nome}, ${m.raridadeNome}, ${m.categoriaNome}, ${m.atributo} +${m.pontos}`} onClick={() => { setErro(null); setMinhaSel(m.id); }} className="cursor-pointer active:translate-y-px">
                            <SlotComIcone categoria={m.categoria} baseId={m.baseId} raridade={m.raridade} destaque={m.id === minhaId} tamanho="10.4cqw" />
                          </button>
                          <span className={`${TEXTO_PIXEL} text-[2.4cqw] font-bold text-[#7BE08C] tabular-nums leading-none`}>+{m.pontos}</span>
                        </li>
                      ))}
                    </ul>
                  ))}
              </PainelDaForja>

              {/* DIREITA: a arma escolhida, os materiais, o custo e as informações */}
              <div className="min-h-0 overflow-y-auto forja-rolagem">
                {aba === 'minhas' ? (detalheMinha ? <PainelDaMinhaArma d={detalheMinha} /> : null) : detalhe ? <PainelDaArma d={detalhe} categoria={cat} /> : null}
              </div>
            </div>

            {/* EMBAIXO: a barra de estado e o botão da ação */}
            <div className="grid gap-[1.6cqw] px-[2.4cqw] pt-[1.4cqw] pb-[2.4cqw] items-center" style={{ gridTemplateColumns: '57fr 43fr' }}>
              <div className="relative w-full" style={{ aspectRatio: '415 / 64' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={KIT_DA_FORJA.barraStatus} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated', objectFit: 'fill' }} />
                <p role={erro ? 'alert' : 'status'} className={`absolute inset-0 flex items-center justify-center px-[9%] text-center font-cinzel font-bold text-[2.7cqw] leading-tight [text-shadow:1px_1px_0_#05070D] ${erro ? 'text-[#FFB4B4]' : 'text-[#DFF3FF]'}`}>{status}</p>
              </div>
              {aba === 'minhas' ? (
                <BotaoDoKit disabled={!detalheMinha || ocupado} onClick={() => setMinhaAberta(true)} className="w-full py-[1cqw]">Reforjar</BotaoDoKit>
              ) : (
                <BotaoDoKit disabled={!podeForjar || ocupado} onClick={() => detalhe && void forjar(detalhe)} className="w-full py-[1cqw]">{textoDoBotao}</BotaoDoKit>
              )}
            </div>
          </>
        )}
      </PalcoDaForja>

      {minhaAberta && detalheMinha && (
        <FolhaMinhaArma
          detalhe={detalheMinha}
          ocupado={ocupado}
          erro={erro}
          onFechar={() => setMinhaAberta(false)}
          onReforjar={() => void reforjarArma(detalheMinha)}
          onCustomizar={(opcao) => void customizarArma(detalheMinha, opcao)}
        />
      )}
      {animacao && <AnimacaoDeForja {...animacao} aoFechar={() => setAnimacao(null)} />}
    </main>
  );
}

/**
 * Uma árvore de monstro como na referência: o nome à esquerda e as armas em linha à direita, ligadas por barras; o
 * ramo de cada subespécie vem logo abaixo, ligado à linha principal. No zoom os slots ficam maiores e sem o nome.
 */
function LinhaDaArvore({ arvore, categoria, selecionada, onEscolher, grande = false, semNome = false }: { arvore: ArvoreForja; categoria: CategoriaArma; selecionada: string | null; onEscolher: (id: string) => void; grande?: boolean; semNome?: boolean }) {
  const tamanho = grande ? '12.4cqw' : '7.4cqw';
  return (
    <article aria-label={`Árvore de ${arvore.nome}`} className="grid items-start gap-[1.2cqw] px-[1cqw] py-[1.2cqw] bg-[#080C16]/75 border border-[#1F3550]" style={{ gridTemplateColumns: semNome ? '1fr' : '16.5cqw 1fr' }}>
      {!semNome && (
        <h2 className={`font-cinzel font-extrabold text-[2.2cqw] leading-tight [text-shadow:1px_1px_0_#05070D] [overflow-wrap:anywhere] hyphens-auto ${arvore.descoberta ? 'text-[#7FC8FF]' : 'text-[#5E7390]'}`} lang="pt-BR">
          {arvore.nome}
          <span className="block text-[#E7C46A] text-[2.2cqw]">{estrelas(arvore.estrela)}</span>
        </h2>
      )}
      <div className="flex flex-col gap-[1.4cqw] min-w-0">
        {arvore.ramos.map((ramo, i) => (
          <div key={ramo.id} className={i === 0 ? '' : 'ml-[3cqw] pl-[1.4cqw] border-l-2 border-[#3A8FB0]/70'}>
            {ramo.nome && <span className={`block ${TEXTO_PIXEL} text-[2.1cqw] mb-[0.6cqw] ${ramo.descoberto ? 'text-[#8FB3D1]' : 'text-[#5E7390]'}`}>{ramo.nome}</span>}
            <div className="flex items-center flex-wrap gap-y-[1cqw]">
              {ramo.descoberto
                ? ramo.nos.map((no, j) => (
                    <React.Fragment key={no.baseId}>
                      {j > 0 && <span aria-hidden="true" className="w-[1.8cqw] h-[0.7cqw] shrink-0 bg-[#4FB4D4] shadow-[0_0_0_1px_#05070D]" />}
                      <No no={no} categoria={categoria} aberto={selecionada === no.baseId} onEscolher={onEscolher} tamanho={tamanho} />
                    </React.Fragment>
                  ))
                : Array.from({ length: ramo.quantidade }, (_, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <span aria-hidden="true" className="w-[1.8cqw] h-[0.7cqw] shrink-0 bg-[#2A3B52] shadow-[0_0_0_1px_#05070D]" />}
                      <SlotMisterioso tamanho={tamanho} />
                    </React.Fragment>
                  ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function No({ no, categoria, aberto, onEscolher, tamanho }: { no: NoForja; categoria: CategoriaArma; aberto: boolean; onEscolher: (id: string) => void; tamanho: string }) {
  const apagado = no.estado === 'bloqueada' || no.estado === 'superada';
  const selo = no.estado === 'tenho' || no.estado === 'superada' ? 'tenho' : no.estado === 'bloqueada' ? 'bloqueada' : no.estado === 'faltaMaterial' ? 'faltaMaterial' : null;
  return (
    <button type="button" aria-label={`${no.nome}, ${no.raridadeNome}. ${ROTULO_ESTADO[no.estado]}`} aria-pressed={aberto} onClick={() => onEscolher(no.baseId)} className="shrink-0 cursor-pointer active:translate-y-px">
      <SlotComIcone categoria={categoria} baseId={no.baseId} raridade={no.raridade} destaque={aberto || no.estado === 'disponivel'} apagado={apagado} tamanho={tamanho} selo={selo} />
    </button>
  );
}

/** Um espaço ainda não descoberto: a moldura apagada com "?" (não é tocável e não diz qual arma é). */
function SlotMisterioso({ tamanho }: { tamanho: string }) {
  return (
    <span role="img" aria-label="Arma ainda não descoberta" className="shrink-0 inline-flex">
      <SlotDeArma raridade="comum" apagado tamanho={tamanho}>
        <span className={`${TEXTO_PIXEL} font-bold text-[#5E7390] leading-none`} style={{ fontSize: `calc(${tamanho} * 0.45)` }}>?</span>
      </SlotDeArma>
    </span>
  );
}
