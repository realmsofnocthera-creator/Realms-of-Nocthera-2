'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import type { CharacterDocument } from '@/server/characterService';
import type { ArmaduraPersonagem } from '@/game/armaduraForja';
import { percentualCustoReforja } from '@/rules/armas';
import { PECAS_ARMADURA_MAP } from '@/rules/armadurasCatalogo';
import {
  type ConjuntoTela,
  type DetalhePecaTela,
  type MinhaPecaTela,
  conjuntosVisiveis,
  detalheDaPeca,
  minhasPecasTela,
} from '@/lib/armaduraTela';
import { COR_RARIDADE_ARMA } from '@/lib/forjaTela';
import { Abas, BarraDeTitulo, BotaoDoKit, FundoDaForja, OuroDaForja, PainelDaForja, PalcoDaForja, SlotDeArma, TEXTO_PIXEL } from './KitDaForja';
import { IconeDePeca } from './IconeDoMaterial';
import { PainelDaMinhaPeca, PainelDaPeca } from './PainelDaPeca';

interface ArmaduraScreenProps {
  character: CharacterDocument;
  onCharacterChange: (c: CharacterDocument) => void;
  tokenFresco: () => Promise<string | null>;
}

/** Grau inferior (liberado), Grau superior (bloqueado até uma atualização futura) e as peças do personagem. */
type Aba = 'inferior' | 'superior' | 'minhas';

const estrelas = (n: number) => '★'.repeat(n);

/** Chama uma rota do Ferreiro e devolve a resposta (ou lança a mensagem de erro do servidor). */
async function chamar<T>(rota: string, corpo: unknown, tokenFresco: () => Promise<string | null>): Promise<T> {
  const token = await tokenFresco();
  if (!token) throw new Error('Sessão expirada. Faça login de novo.');
  const res = await fetch(rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(corpo),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Não foi possível concluir no Ferreiro.');
  return data as T;
}

/** A primeira peça que dá para fabricar agora, ou a primeira peça descoberta (a que o painel da direita mostra de início). */
function pecaInicial(conjuntos: readonly ConjuntoTela[]): string | null {
  const pecas = conjuntos.filter((c) => c.descoberto).flatMap((c) => c.pecas);
  return (pecas.find((p) => p.estado === 'disponivel') ?? pecas[0])?.pecaId ?? null;
}

/**
 * Forjar armadura em pixel (kit azul e dourado), na disposição da referência: a lista de conjuntos com as 5 peças de
 * cada um à esquerda e, à direita, a peça escolhida com os materiais, o custo e as informações; as abas Grau inferior,
 * Grau superior (bloqueado) e Minhas no topo e a barra de estado embaixo. Nas peças que o personagem tem, usar orbes de
 * armadura (nível 0 a 30) e reforjar. Toda regra é conferida no servidor.
 */
export function ArmaduraScreen({ character, onCharacterChange, tokenFresco }: ArmaduraScreenProps) {
  const [aba, setAba] = useState<Aba>('inferior');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [minhaSel, setMinhaSel] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const conjuntos = useMemo(() => conjuntosVisiveis(character), [character]);
  const minhas = useMemo(() => minhasPecasTela(character), [character]);
  const pecaSel = selecionada ?? pecaInicial(conjuntos);
  const detalhe = pecaSel && PECAS_ARMADURA_MAP[pecaSel] ? detalheDaPeca(pecaSel, character) : null;
  const minha = minhas.find((m) => m.id === minhaSel) ?? minhas[0] ?? null;
  const pecaDaMinha = minha ? PECAS_ARMADURA_MAP[minha.pecaId] : null;

  const mudarAba = useCallback((a: Aba) => {
    setAba(a);
    setErro(null);
    setAviso(null);
  }, []);
  const escolherPeca = (pecaId: string) => {
    setErro(null);
    setAviso(null);
    setSelecionada(pecaId);
  };

  const executar = async (acao: () => Promise<{ character: CharacterDocument; armadura: ArmaduraPersonagem }>, mensagem: (a: ArmaduraPersonagem) => string) => {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const r = await acao();
      onCharacterChange(r.character);
      setAviso(mensagem(r.armadura));
      setMinhaSel(r.armadura.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro no Ferreiro.');
    } finally {
      setOcupado(false);
    }
  };

  const fabricar = (d: DetalhePecaTela) =>
    executar(
      () => chamar('/api/armadura/fabricar', { pecaId: d.pecaId }, tokenFresco),
      (a) => `${d.nome} fabricada! Atributo sorteado: ${a.atributo === 'arcano' ? 'Arcano' : a.atributo === 'vigor' ? 'Vigor' : 'Vitalidade'} +${a.pontos}.`
    );
  const reforjar = (m: MinhaPecaTela) =>
    executar(() => chamar('/api/armadura/reforjar', { armaduraId: m.id }, tokenFresco), (a) => `${m.nome} reforjada: ${m.atributo} +${a.pontos}.`);
  const usarOrbes = (m: MinhaPecaTela, orbes: Record<string, number>) =>
    executar(() => chamar('/api/armadura/orbes', { armaduraId: m.id, orbes }, tokenFresco), () => `${m.nome} recebeu os orbes.`);

  const status =
    erro ??
    aviso ??
    (aba === 'superior'
      ? 'Grau superior: chega em uma atualização futura'
      : aba === 'minhas'
        ? minha
          ? 'Use orbes para subir o nível ou reforje a peça'
          : 'Você ainda não tem peças de armadura'
        : detalhe
          ? detalhe.podeFabricar
            ? detalhe.minhas.length > 0
              ? `Você tem ${detalhe.minhas.length}. Pode fabricar outra.`
              : 'Pode ser forjada.'
            : 'Falta material ou ouro'
          : conjuntos.length > 0
            ? 'Enfrente os monstros para descobrir as armaduras'
            : 'Libere uma ★ na Caçada');
  const podeFabricar = aba === 'inferior' && !!detalhe?.podeFabricar;
  const textoDoBotao = ocupado ? 'Forjando...' : !detalhe ? 'Forjar' : detalhe.podeFabricar ? (detalhe.minhas.length > 0 ? 'Fabricar outra' : 'Fabricar') : 'Falta material';

  return (
    <main className="fixed inset-0 overflow-hidden select-none bg-[#05070D]">
      <FundoDaForja />
      <PalcoDaForja>
        <header className="flex items-center gap-[1.4cqw] px-[2.4cqw] pt-[2.4cqw]">
          <Link href="/ferreiro" aria-label="Voltar ao Ferreiro" className="w-[9cqw] h-[9cqw] shrink-0 cursor-pointer active:translate-y-px">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.voltar} alt="" aria-hidden="true" className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
          </Link>
          <BarraDeTitulo titulo="Armaduras" className="w-[58cqw]" />
          <span className="ml-auto"><OuroDaForja ouro={character.ouro} /></span>
        </header>

        <div className="px-[2.4cqw] pt-[1cqw]">
          <Abas<Aba>
            rotulo="Abas das armaduras"
            ativa={aba}
            aoMudar={mudarAba}
            abas={[
              { id: 'inferior', nome: 'Grau inferior' },
              { id: 'superior', nome: 'G. superior', bloqueada: true, rotuloAcessivel: 'Grau superior (bloqueado)' },
              { id: 'minhas', nome: `Minhas (${minhas.length})`, rotuloAcessivel: `Minhas peças (${minhas.length})` },
            ]}
          />
        </div>

        {aba === 'superior' ? (
          <div className="flex-1 min-h-0 px-[2.4cqw] pt-[1.2cqw]">
            <PainelDaForja as="section" aria-label="Grau superior" className="h-full flex flex-col items-center justify-center gap-[3cqw] px-[4cqw] text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={KIT_DA_FORJA.proibido} alt="" aria-hidden="true" className="w-[16cqw] h-[16cqw] object-contain" style={{ imageRendering: 'pixelated' }} />
              <p className="font-cinzel font-extrabold uppercase text-[3.6cqw] leading-tight text-[#9CD8FF] [text-shadow:1px_1px_0_#05070D]">Grau superior bloqueado</p>
              <p className={`${TEXTO_PIXEL} text-[2.8cqw] text-[#8FB3D1] leading-snug`}>As armaduras do grau superior chegam em uma atualização futura.</p>
            </PainelDaForja>
          </div>
        ) : (
          <div className="flex-1 min-h-0 px-[2.4cqw] pt-[1.2cqw] grid gap-[1.6cqw]" style={{ gridTemplateColumns: '57fr 43fr' }}>
            {/* ESQUERDA: os conjuntos com as 5 peças de cada um (ou as peças do personagem) */}
            <PainelDaForja as="section" aria-label={aba === 'inferior' ? 'Conjuntos de armadura' : 'Minhas peças'} className="min-h-0 overflow-y-auto forja-rolagem">
              {aba === 'inferior' && conjuntos.length === 0 && (
                <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw] px-[2cqw] leading-snug`}>Nenhum conjunto ainda. Libere a 1★ na Caçada e enfrente os monstros para descobrir as armaduras.</p>
              )}
              {aba === 'inferior' && (
                <div className="flex flex-col gap-[1cqw]">
                  {conjuntos.map((c) => (
                    <LinhaDoConjunto key={c.conjuntoId} conjunto={c} selecionada={pecaSel} onEscolher={escolherPeca} />
                  ))}
                </div>
              )}
              {aba === 'minhas' &&
                (minhas.length === 0 ? (
                  <p role="status" className={`${TEXTO_PIXEL} text-[2.8cqw] text-center text-[#8FB3D1] py-[6cqw] px-[2cqw] leading-snug`}>Você ainda não tem peças. Fabrique a primeira no Grau inferior.</p>
                ) : (
                  <ul className="grid grid-cols-4 gap-x-[1.6cqw] gap-y-[2.4cqw]">
                    {minhas.map((m) => {
                      const peca = PECAS_ARMADURA_MAP[m.pecaId];
                      return (
                        <li key={m.id} className="flex flex-col items-center gap-[0.6cqw]">
                          <button type="button" aria-label={`${m.nome}, ${m.espacoNome}, nível ${m.nivel}`} onClick={() => { setErro(null); setAviso(null); setMinhaSel(m.id); }} className="cursor-pointer active:translate-y-px">
                            <SlotDeArma raridade={m.raridade} destaque={m.id === minha?.id} tamanho="10.4cqw">
                              <IconeDePeca espaco={peca.espaco} cor={m.cor} className="w-full h-full" />
                            </SlotDeArma>
                          </button>
                          <span className={`${TEXTO_PIXEL} text-[2.4cqw] font-bold text-[#7BE08C] tabular-nums leading-none`}>Nv. {m.nivel}</span>
                        </li>
                      );
                    })}
                  </ul>
                ))}
            </PainelDaForja>

            {/* DIREITA: a peça escolhida, os materiais, o custo e as informações */}
            <div className="min-h-0 overflow-y-auto forja-rolagem">
              {aba === 'inferior' && detalhe && <PainelDaPeca d={detalhe} />}
              {aba === 'minhas' && minha && pecaDaMinha && (
                <PainelDaMinhaPeca key={minha.id} m={minha} espaco={pecaDaMinha.espaco} estrela={pecaDaMinha.estrela} character={character} ocupado={ocupado} onUsarOrbes={(orbes) => void usarOrbes(minha, orbes)} />
              )}
            </div>
          </div>
        )}

        {/* EMBAIXO: a barra de estado e o botão da ação */}
        <div className="grid gap-[1.6cqw] px-[2.4cqw] pt-[1.4cqw] pb-[2.4cqw] items-center" style={{ gridTemplateColumns: '57fr 43fr' }}>
          <div className="relative w-full" style={{ aspectRatio: '415 / 64' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KIT_DA_FORJA.barraStatus} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated', objectFit: 'fill' }} />
            <p role={erro ? 'alert' : 'status'} className={`absolute inset-0 flex items-center justify-center px-[9%] text-center font-cinzel font-bold text-[2.7cqw] leading-tight [text-shadow:1px_1px_0_#05070D] ${erro ? 'text-[#FFB4B4]' : 'text-[#DFF3FF]'}`}>{status}</p>
          </div>
          {aba === 'minhas' ? (
            <BotaoDoKit disabled={!minha || ocupado} onClick={() => minha && void reforjar(minha)} className="w-full py-[1cqw]">{minha ? `Reforjar (${percentualCustoReforja(minha.reforjas)}%)` : 'Reforjar'}</BotaoDoKit>
          ) : (
            <BotaoDoKit disabled={aba === 'superior' || !podeFabricar || ocupado} onClick={() => detalhe && void fabricar(detalhe)} className="w-full py-[1cqw]">{aba === 'superior' ? 'Bloqueado' : textoDoBotao}</BotaoDoKit>
          )}
        </div>
      </PalcoDaForja>
    </main>
  );
}

/** Um conjunto como na referência: o nome à esquerda e as 5 peças em linha à direita (as que ainda são "???" ficam apagadas). */
function LinhaDoConjunto({ conjunto: c, selecionada, onEscolher }: { conjunto: ConjuntoTela; selecionada: string | null; onEscolher: (pecaId: string) => void }) {
  const cor = COR_RARIDADE_ARMA[c.raridade];
  return (
    <article aria-label={`Conjunto ${c.nome}`} className="grid items-center gap-[1cqw] px-[1cqw] py-[1.2cqw] bg-[#080C16]/75 border border-[#1F3550]" style={{ gridTemplateColumns: '14.5cqw 1fr' }}>
      <h2 className={`font-cinzel font-extrabold text-[2.1cqw] leading-tight [text-shadow:1px_1px_0_#05070D] [overflow-wrap:anywhere] hyphens-auto ${c.descoberto ? 'text-[#7FC8FF]' : 'text-[#5E7390]'}`} lang="pt-BR">
        {c.nome}
        <span className="block text-[1.9cqw] text-[#E7C46A]">{estrelas(c.estrela)}</span>
      </h2>
      <div className="grid grid-cols-5 gap-[0.6cqw]">
        {c.pecas.map((p) =>
          c.descoberto ? (
            <button
              key={p.pecaId}
              type="button"
              aria-label={`${p.nome} (${p.espacoNome}). ${p.estado === 'tenho' ? `Você tem ${p.quantas}` : p.estado === 'disponivel' ? 'Pronta para fabricar' : 'Falta material ou ouro'}`}
              aria-pressed={selecionada === p.pecaId}
              onClick={() => onEscolher(p.pecaId)}
              className="cursor-pointer active:translate-y-px"
            >
              <SlotDeArma raridade={p.raridade} destaque={selecionada === p.pecaId || p.estado === 'disponivel'} tamanho="6.4cqw" selo={p.estado === 'tenho' ? 'tenho' : p.estado === 'faltaMaterial' ? 'faltaMaterial' : null}>
                <IconeDePeca espaco={p.espaco} cor={cor} className="w-full h-full" />
              </SlotDeArma>
            </button>
          ) : (
            <span key={p.pecaId} role="img" aria-label="Peça ainda não descoberta" className="inline-flex">
              <SlotDeArma raridade="comum" apagado tamanho="6.4cqw">
                <span className={`${TEXTO_PIXEL} font-bold text-[#5E7390] leading-none`} style={{ fontSize: '2.8cqw' }}>?</span>
              </SlotDeArma>
            </span>
          )
        )}
      </div>
    </article>
  );
}
