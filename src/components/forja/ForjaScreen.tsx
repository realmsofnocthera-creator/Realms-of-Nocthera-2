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
  arvoresDaForja,
  detalheDaArma,
  detalheDaMinhaArma,
  listaDeForja,
  minhasArmasTela,
} from '@/lib/forjaTela';
import { AnimacaoDeForja, TEMPO_DA_MARTELADA_MS, semMovimento, type AnimacaoDeForjaProps, type LinhaDoResultado } from './AnimacaoDeForja';
import { Abas, BarraDeTitulo, BotaoRedondo, FundoDaForja, PainelDaForja, TEXTO_PIXEL } from './KitDaForja';
import { FolhaDetalhe, FolhaMinhaArma, SlotComIcone, estrelas, nomeDaOpcao } from './PopupsDaForja';
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

type Aba = 'arvore' | 'lista' | 'minhas';
type Animacao = Omit<AnimacaoDeForjaProps, 'aoFechar'>;

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const NOME_ATRIBUTO: Readonly<Record<string, string>> = { vigor: 'Vigor', sorte: 'Sorte', forca: 'Força', vitalidade: 'Vitalidade', arcano: 'Arcano', inteligencia: 'Inteligência', agilidade: 'Agilidade' };

const ROTULO_DO_NO = (no: NoForja, texto: string) => `${no.nome}, ${no.raridadeNome}. ${texto}`;
const TEXTO_DO_ESTADO: Readonly<Record<NoForja['estado'], string>> = {
  tenho: 'Você tem esta arma',
  superada: 'Você já evoluiu além desta arma',
  disponivel: 'Pronta para forjar',
  faltaMaterial: 'Falta material ou ouro',
  bloqueada: 'Falta a arma anterior da árvore',
};

/**
 * A Forja de armas em pixel (kit azul e dourado): primeiro a grade com as categorias; depois a árvore da categoria
 * (abas Árvore, Lista e Minhas armas), com um pop-up para cada arma e a animação do ferreiro ao forjar. Toda regra
 * (receita, ouro, sorteio) é conferida no servidor.
 */
export function ForjaScreen({ character, onCharacterChange, tokenFresco, categoriaInicial }: ForjaScreenProps) {
  const [categoria, setCategoria] = useState<CategoriaArma | null>(categoriaInicial ?? null);
  const [aba, setAba] = useState<Aba>('arvore');
  const [estrela, setEstrela] = useState(1);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [minhaAberta, setMinhaAberta] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [animacao, setAnimacao] = useState<Animacao | null>(null);

  const cat = categoria ?? 'espadaGrande';
  const arvores = useMemo(() => (categoria ? arvoresDaForja(cat, character) : []), [categoria, cat, character]);
  const lista = useMemo(() => (categoria ? listaDeForja(cat, character) : []), [categoria, cat, character]);
  const minhas = useMemo(() => minhasArmasTela(character), [character]);
  const detalhe = categoria && selecionada ? detalheDaArma(selecionada, cat, character) : null;
  const detalheMinha = minhaAberta ? detalheDaMinhaArma(minhaAberta, character) : null;
  const estrelasComArvore = [...new Set(arvores.map((a) => a.estrela))];
  const estrelaAtual = estrelasComArvore.includes(estrela) ? estrela : (estrelasComArvore[0] ?? 1);

  // Escolher a categoria entra no histórico: o voltar do celular volta para a grade
  useEffect(() => {
    const aoVoltar = () => {
      setCategoria((window.history.state?.forjaCategoria as CategoriaArma | undefined) ?? null);
      setSelecionada(null);
      setMinhaAberta(null);
    };
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, []);
  const escolher = (c: CategoriaArma) => {
    window.history.pushState({ forjaCategoria: c }, '');
    setCategoria(c);
    setAba('arvore');
    setEstrela(1);
    setAviso(null);
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

  const abrir = (baseId: string) => {
    setErro(null);
    setSelecionada(baseId);
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
    setAnimacao({ fase: 'martelando', titulo: d.acao === 'Evoluir' ? 'EVOLUINDO' : 'FORJANDO', nome: d.nome, raridade: d.raridade, categoria: cat, linhas: [] });
    try {
      const r = await chamar<RespostaForjaTela>('/api/forja/fabricar', { baseId: d.baseId, categoria: cat, armaAnteriorId: d.armaAnteriorId ?? undefined }, TEMPO_DA_MARTELADA_MS);
      onCharacterChange(r.character);
      setSelecionada(null);
      const linhas: LinhaDoResultado[] = [
        { rotulo: NOME_ATRIBUTO[r.arma.atributo] ?? r.arma.atributo, depois: `+${r.arma.pontos}` },
        { rotulo: d.tipoDano, depois: `${d.danoFixo}` },
      ];
      setAnimacao({ fase: 'revelada', titulo: d.acao === 'Evoluir' ? 'ARMA EVOLUÍDA!' : 'ARMA FORJADA!', nome: d.nome, raridade: d.raridade, categoria: cat, linhas });
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
    setAnimacao({ fase: 'martelando', titulo: 'REFORJANDO', nome: d.nome, raridade: d.raridade, categoria: d.categoria, linhas: [] });
    try {
      const r = await chamar<RespostaForjaTela>('/api/forja/reforjar', { armaId: d.id }, TEMPO_DA_MARTELADA_MS);
      onCharacterChange(r.character);
      setMinhaAberta(null);
      setAnimacao({
        fase: 'revelada',
        titulo: 'ARMA REFORJADA!',
        nome: d.nome,
        raridade: d.raridade,
        categoria: d.categoria,
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

  const status =
    aviso ??
    (aba === 'arvore' ? 'Toque numa arma' : aba === 'lista' ? `Prontas para forjar: ${lista.length}` : `Suas armas: ${minhas.length}`);

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#05070D] flex flex-col">
      <FundoDaForja />

      <header className="relative z-10 flex items-center gap-1 px-2.5 pt-2.5 sm:px-5">
        {categoria ? (
          <BotaoRedondo tipo="voltar" rotulo="Voltar para a escolha da arma" onClick={voltarParaAGrade} className="w-10 h-10 shrink-0" />
        ) : (
          <Link href="/ferreiro" aria-label="Voltar ao Ferreiro" className="w-10 h-10 shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
          </Link>
        )}
        <BarraDeTitulo titulo={categoria ? CATEGORIAS_ARMA_MAP[categoria].nome : 'Forjar arma'} ouro={character.ouro} className="flex-1" />
      </header>

      {!categoria ? (
        <div className="relative z-10 flex-1 min-h-0 px-2.5 pt-1 pb-3 sm:px-5 flex flex-col">
          <PainelDaForja as="section" aria-label="Escolha a arma" className="flex-1 min-h-0 overflow-y-auto">
            <div className="px-1 py-1">
              <SelecaoDeArma armas={character.armas} aoEscolher={escolher} />
            </div>
          </PainelDaForja>
        </div>
      ) : (
        <>
          <div className="relative z-10 px-2.5 pt-1 sm:px-5">
            <Abas<Aba>
              rotulo="Abas da Forja"
              ativa={aba}
              aoMudar={mudarAba}
              abas={[
                { id: 'arvore', nome: 'Árvore' },
                { id: 'lista', nome: `Lista (${lista.length})` },
                { id: 'minhas', nome: `Minhas (${minhas.length})`, rotuloAcessivel: `Minhas armas (${minhas.length})` },
              ]}
            />
          </div>

          <div className="relative z-10 flex-1 min-h-0 px-2.5 pt-1 pb-1 sm:px-5 flex flex-col">
            <PainelDaForja as="section" aria-label={aba === 'arvore' ? 'Árvores de armas' : aba === 'lista' ? 'Lista de forja' : 'Minhas armas'} className="flex-1 min-h-0 overflow-y-auto forja-rolagem">
              {aba === 'arvore' && (
                <>
                  <div role="group" aria-label="Estrela do monstro" className="flex gap-1 overflow-x-auto pb-2">
                    {estrelasComArvore.map((e) => (
                      <button
                        key={e}
                        type="button"
                        aria-pressed={estrelaAtual === e}
                        onClick={() => setEstrela(e)}
                        className={`shrink-0 px-2.5 py-1 border ${TEXTO_PIXEL} text-[11px] font-bold cursor-pointer ${estrelaAtual === e ? 'bg-[#2EC6D4] border-[#9CF3FA] text-[#06222A]' : 'bg-[#0B0F1A] border-[#3A5B7A] text-[#9CC4E0]'}`}
                      >
                        {e}★
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {arvores.filter((a) => a.estrela === estrelaAtual).map((a) => (
                      <ArvoreMonstro key={a.monstroId} arvore={a} categoria={cat} selecionada={selecionada} onAbrir={abrir} />
                    ))}
                  </div>
                </>
              )}

              {aba === 'lista' &&
                (lista.length === 0 ? (
                  <p role="status" className={`${TEXTO_PIXEL} text-[12px] text-center text-[#8FB3D1] py-6`}>Nenhuma arma pronta agora. Cace monstros para juntar materiais.</p>
                ) : (
                  <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
                    {lista.map((i) => (
                      <li key={i.baseId} className="flex flex-col items-center gap-1">
                        <button type="button" aria-label={`${i.nome}, ${i.raridadeNome}. ${estrelas(i.estrela)} ${i.monstroNome}`} onClick={() => abrir(i.baseId)} className="cursor-pointer active:translate-y-px">
                          <SlotComIcone categoria={cat} raridade={i.raridade} destaque tamanho={56} />
                        </button>
                        <span className={`${TEXTO_PIXEL} text-[9px] leading-tight text-center text-[#E7C46A]`}>{estrelas(i.estrela)}</span>
                      </li>
                    ))}
                  </ul>
                ))}

              {aba === 'minhas' &&
                (minhas.length === 0 ? (
                  <p role="status" className={`${TEXTO_PIXEL} text-[12px] text-center text-[#8FB3D1] py-6`}>Você ainda não tem armas. Forje a primeira na Árvore.</p>
                ) : (
                  <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
                    {minhas.map((m) => (
                      <li key={m.id} className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          aria-label={`${m.nome}, ${m.raridadeNome}, ${m.categoriaNome}, ${m.atributo} +${m.pontos}`}
                          onClick={() => {
                            setErro(null);
                            setMinhaAberta(m.id);
                          }}
                          className="cursor-pointer active:translate-y-px"
                        >
                          <SlotComIcone categoria={m.categoria} raridade={m.raridade} tamanho={56} />
                        </button>
                        <span className={`${TEXTO_PIXEL} text-[10px] font-bold text-[#7BE08C] tabular-nums leading-none`}>+{m.pontos}</span>
                      </li>
                    ))}
                  </ul>
                ))}
            </PainelDaForja>
          </div>
        </>
      )}

      {categoria && (
        <div className="relative z-10 px-2.5 pb-3 pt-1 sm:px-5">
          <div className="relative w-full" style={{ aspectRatio: '415 / 64', maxHeight: 54 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.barraStatus} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated', objectFit: 'fill' }} />
            <p role="status" className="absolute inset-0 flex items-center justify-center px-12 font-cinzel font-bold text-[13px] text-[#DFF3FF] [text-shadow:1px_1px_0_#05070D] truncate">{status}</p>
          </div>
        </div>
      )}

      {detalheMinha && (
        <FolhaMinhaArma
          detalhe={detalheMinha}
          ocupado={ocupado}
          erro={erro}
          onFechar={() => setMinhaAberta(null)}
          onReforjar={() => void reforjarArma(detalheMinha)}
          onCustomizar={(opcao) => void customizarArma(detalheMinha, opcao)}
        />
      )}
      {detalhe && <FolhaDetalhe detalhe={detalhe} categoria={cat} ocupado={ocupado} erro={erro} onFechar={() => setSelecionada(null)} onForjar={() => void forjar(detalhe)} />}
      {animacao && <AnimacaoDeForja {...animacao} aoFechar={() => setAnimacao(null)} />}
    </main>
  );
}

/** A árvore de um monstro: a linha principal de armas ligadas e o ramo de cada subespécie logo abaixo. */
function ArvoreMonstro({ arvore, categoria, selecionada, onAbrir }: { arvore: ArvoreForja; categoria: CategoriaArma; selecionada: string | null; onAbrir: (id: string) => void }) {
  return (
    <article aria-label={`Árvore de ${arvore.nome}`} className="bg-[#080C16]/70 border border-[#243B55] px-2 py-1.5 flex flex-col gap-1.5">
      <h2 className="font-cinzel font-extrabold text-[12px] leading-none text-[#9CD8FF] [text-shadow:1px_1px_0_#05070D]">
        <span className="text-[#E7C46A]">{estrelas(arvore.estrela)}</span> {arvore.nome}
      </h2>
      {arvore.ramos.map((ramo, i) => (
        <div key={ramo.id} className={i === 0 ? '' : 'ml-4 pl-2 border-l-2 border-[#3A8FB0]/70'}>
          {ramo.nome && <span className={`block ${TEXTO_PIXEL} text-[10px] mb-1 text-[#8FB3D1]`}>{ramo.nome}</span>}
          <div className="flex items-center overflow-x-auto pb-0.5">
            {ramo.nos.map((no, j) => (
              <React.Fragment key={no.baseId}>
                {j > 0 && <span aria-hidden="true" className="w-3 h-[3px] shrink-0 bg-[#4FB4D4] shadow-[0_0_0_1px_#05070D]" />}
                <No no={no} categoria={categoria} aberto={selecionada === no.baseId} onAbrir={onAbrir} />
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </article>
  );
}

function No({ no, categoria, aberto, onAbrir }: { no: NoForja; categoria: CategoriaArma; aberto: boolean; onAbrir: (id: string) => void }) {
  const apagado = no.estado === 'bloqueada' || no.estado === 'superada';
  const selo = no.estado === 'tenho' || no.estado === 'superada' ? 'tenho' : no.estado === 'bloqueada' ? 'bloqueada' : no.estado === 'faltaMaterial' ? 'faltaMaterial' : null;
  return (
    <button type="button" aria-label={ROTULO_DO_NO(no, TEXTO_DO_ESTADO[no.estado])} onClick={() => onAbrir(no.baseId)} className="shrink-0 cursor-pointer active:translate-y-px">
      <SlotComIcone categoria={categoria} raridade={no.raridade} destaque={aberto || no.estado === 'disponivel'} apagado={apagado} tamanho={46} selo={selo} />
    </button>
  );
}
