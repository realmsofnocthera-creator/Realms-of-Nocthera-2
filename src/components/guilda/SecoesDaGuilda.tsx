'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CLASSES_MAP } from '@/rules/classes';
import { DESCRICAO_MAXIMA_DA_GUILDA, NIVEIS_DA_GUILDA, nivelDaGuilda, NOME_DO_CARGO, NOME_MAXIMO_DA_GUILDA, podeExpulsar, administraEntrada, type CargoDaGuilda, type ResumoDaGuilda } from '@/rules/guilda';
import type { ChefeSemanalNaTela, ContratoNaTela, EstadoDaGuilda, GuildaPublica, IncursaoNaTela, MinhaGuilda, PesquisaNaTela } from '@/server/guildas';
import { EMBLEMA_RARIDADE_MAP } from '@/rules/emblemas';
import { PONTOS_POR_RARIDADE } from '@/rules/pesquisa';
import type { RaridadeMaterial } from '@/rules/raridades';
import { textoDaFicha } from '@/rules/textosDaFicha';
import { TEXTOS_DA_GUILDA as T } from '@/rules/textosDaGuilda';
import { BotaoRedondo, PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';

export type Token = () => Promise<string | null>;
export type Agir = (acao: string, extra?: Record<string, unknown>) => Promise<boolean>;

/** Chama a rota da guilda (GET sem corpo, POST com corpo) e devolve se deu certo e os dados. */
export async function chamar(tokenFresco: Token, url: string, corpo?: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const token = await tokenFresco();
    const res = await fetch(url, {
      method: corpo ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token ?? ''}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const dados = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, dados };
  } catch {
    return { ok: false, dados: { error: T.semConexao } };
  }
}

// ---------------------------------------------------------------- peças do visual

const botaoBase = 'font-cinzel font-extrabold uppercase text-[2.1cqw] leading-[1.4] px-[2cqw] py-[1cqw] border cursor-pointer active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed';
const campoBase = 'flex-1 min-w-0 border border-[#2B3F5C] bg-[#080C16] px-[2cqw] py-[1.2cqw] font-cinzel text-[16px] leading-[1.4] text-[#F5F3E0] placeholder:text-[#6E7F99] focus:border-[#6FE3EE] focus:outline-none';

/** Botão pequeno do pop-up: normal (dourado), principal (ciano) ou perigo (vermelho). */
export function BotaoG({ children, onClick, disabled, tipo = 'normal', type = 'button' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tipo?: 'normal' | 'principal' | 'perigo'; type?: 'button' | 'submit' }) {
  const cor = tipo === 'principal' ? 'border-[#6FE3EE] text-[#DFF3FF] bg-[#0F5A6E]' : tipo === 'perigo' ? 'border-[#E5484D] text-[#FFB4B4] bg-[#0B1220]' : 'border-[#B8862B] text-[#E9DDC0] bg-[#0B1220]';
  return <button type={type} onClick={onClick} disabled={disabled} className={`${botaoBase} ${cor}`}>{children}</button>;
}

/** Uma barra de progresso em pixel: moldura dourada e enchimento em listras. */
export function BarraG({ valor, maximo, rotulo, cor = 'ouro' }: { valor: number; maximo: number; rotulo: string; cor?: 'ouro' | 'vermelho' | 'azul' }) {
  const pct = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 100;
  const fundo = cor === 'vermelho' ? 'repeating-linear-gradient(90deg, #E5484D 0 1.1cqw, #A12F34 1.1cqw 1.4cqw)' : cor === 'azul' ? 'repeating-linear-gradient(90deg, #5AA7F0 0 1.1cqw, #2F6FB8 1.1cqw 1.4cqw)' : 'repeating-linear-gradient(90deg, #F5C86A 0 1.1cqw, #C8962E 1.1cqw 1.4cqw)';
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo} className="h-[2.8cqw] border-[0.5cqw] border-[#B8862B] bg-[#05070D] p-[0.3cqw]">
      <div className="h-full" style={{ width: `${pct}%`, backgroundImage: fundo }} />
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-[1.6cqw]">
      <h3 className="font-cinzel font-bold uppercase tracking-wider text-[2.1cqw] leading-[1.4] text-[#9CC4E0] pb-[0.8cqw] border-b border-[#2B3F5C]">{titulo}</h3>
      {children}
    </section>
  );
}

const Fraco = ({ children }: { children: React.ReactNode }) => <p className="font-cinzel text-[2.1cqw] leading-snug text-[#9CC4E0]">{children}</p>;
const Item = ({ children, destaque }: { children: React.ReactNode; destaque?: 'verde' }) => (
  <li className={`flex flex-col gap-[0.8cqw] border bg-[#080C16]/80 px-[2cqw] py-[1.6cqw] ${destaque === 'verde' ? 'border-[#7BC47F]' : 'border-[#2B3F5C]'}`}>{children}</li>
);

/** A janela sobre a praça: o título, o X e o conteúdo rolável. */
export function JanelaDaGuilda({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={titulo} onClick={aoFechar} className="forja-palco !fixed inset-0 !z-[80] !items-center !justify-center px-[4cqw]" style={{ backgroundColor: 'rgba(3,6,14,0.66)', left: 0, right: 0 }}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[92cqw]">
        <BotaoRedondo tipo="x" rotulo={T.fechar} onClick={aoFechar} className="absolute -top-[3.4cqw] -right-[2cqw] z-10 w-[9cqw] h-[9cqw]" />
        <PainelDaForja borda="3cqw" className="max-h-[86dvh] overflow-y-auto forja-rolagem">
          <div className="flex flex-col gap-[2cqw]">
            <h2 className="font-cinzel font-extrabold uppercase text-[3.2cqw] leading-[1.35] text-[#EDB44C]" style={{ textShadow: CONTORNO_PIXEL }}>{titulo}</h2>
            {children}
          </div>
        </PainelDaForja>
      </div>
    </div>
  );
}

const dataCurta = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;

// ---------------------------------------------------------------- guilda do jogador

/** Nossa guilda (o quadro do centro): o nível, a barra de XP, o que o próximo nível libera, o cargo e a descrição. */
export function SecaoNossaGuilda({ guilda, agir, ocupado }: { guilda: MinhaGuilda; agir: Agir; ocupado: boolean }) {
  const t = T.nivel;
  const { nivel } = guilda;
  const proximo = NIVEIS_DA_GUILDA[nivel.nivel];
  const lider = guilda.meuCargo === 'lider';
  const [descricao, setDescricao] = useState(guilda.descricao);
  return (
    <>
      <Secao titulo={t.titulo}>
        <p className="font-cinzel font-extrabold text-[2.7cqw] leading-snug text-[#EDB44C]">{textoDaFicha(t.linha, { nome: nivel.nome, n: nivel.nivel, max: NIVEIS_DA_GUILDA.length })}</p>
        <BarraG valor={nivel.xpNoNivel} maximo={nivel.xpDoNivel || 1} rotulo={t.xpAria} />
        <Fraco>
          {nivel.xpDoNivel
            ? `${textoDaFicha(t.xp, { atual: nivel.xpNoNivel, total: nivel.xpDoNivel, proximo: proximo.nome })}${proximo.desbloqueia ? textoDaFicha(t.desbloqueia, { x: proximo.desbloqueia }) : ''}`
            : t.maximo}
        </Fraco>
        <Fraco>{textoDaFicha(t.cargo, { cargo: NOME_DO_CARGO[guilda.meuCargo], n: guilda.membros.length, max: guilda.maxMembros })}</Fraco>
      </Secao>
      {lider ? (
        <form
          className="flex flex-col gap-[1.4cqw]"
          onSubmit={(e) => {
            e.preventDefault();
            void agir('editarDescricao', { descricao });
          }}
        >
          <label className="flex flex-col gap-[0.8cqw] font-cinzel text-[2.1cqw] text-[#9CC4E0]">{t.descricao}
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={DESCRICAO_MAXIMA_DA_GUILDA} rows={3} className={`${campoBase} w-full`} />
          </label>
          {descricao !== guilda.descricao && <div><BotaoG type="submit" disabled={ocupado} tipo="principal">{t.salvarDescricao}</BotaoG></div>}
        </form>
      ) : (
        guilda.descricao && <p className="font-cinzel text-[2.3cqw] leading-snug whitespace-pre-wrap text-[#E9DDC0]">{guilda.descricao}</p>
      )}
    </>
  );
}

const NOME_DO_TIPO_DE_CONTRATO = { derrotar: T.contratos.derrotar, entregar: T.contratos.entregar } as const;

/** Quadro de contratos: os 3 contratos do dia do jogador. As vitórias contam em qualquer luta contra monstros. */
export function SecaoContratos({ contratos, agir, ocupado }: { contratos: ContratoNaTela[]; agir: Agir; ocupado: boolean }) {
  const t = T.contratos;
  return (
    <>
      <Fraco>{t.ajuda}</Fraco>
      <ul className="flex flex-col gap-[1.4cqw]">
        {contratos.map((c) => (
          <Item key={c.id} destaque={c.pronto ? 'verde' : undefined}>
            <span className={`font-cinzel font-bold text-[2.5cqw] leading-snug text-[#F5F3E0] ${c.entregue ? 'opacity-60' : ''}`}>
              {c.tipo === 'vencer' ? textoDaFicha(t.vencer, { n: c.quantidade }) : textoDaFicha(NOME_DO_TIPO_DE_CONTRATO[c.tipo], { n: c.quantidade, alvo: c.nomeAlvo })}
            </span>
            <span className="font-cinzel text-[2cqw] leading-snug text-[#9CC4E0]">
              {textoDaFicha(t.progresso, { feito: c.feito, n: c.quantidade, ouro: c.recompensa.ouro, xp: c.recompensa.xpGuilda })}
              {c.recompensa.materiais.length ? t.materialRaro : ''}
            </span>
            {c.entregue ? (
              <span className="font-cinzel font-bold text-[2.2cqw] text-[#7BC47F]">{t.entregue}</span>
            ) : (
              <div><BotaoG disabled={ocupado || !c.pronto} tipo={c.pronto ? 'principal' : 'normal'} onClick={() => void agir('entregarContrato', { contratoId: c.id })}>{c.pronto ? t.entregarBotao : t.emAndamento}</BotaoG></div>
            )}
          </Item>
        ))}
      </ul>
    </>
  );
}

/** Incursão: o chefe atual, a vida global, quem lutou e o botão de lutar (3 por dia). */
export function SecaoIncursoes({ incursao: inc, agir, ocupado }: { incursao: IncursaoNaTela; agir: Agir; ocupado: boolean }) {
  const t = T.incursoes;
  if (!inc.liberada) return <Fraco>{textoDaFicha(t.abreNoNivel, { nome: NIVEIS_DA_GUILDA[inc.nivelDaGuildaParaLiberar - 1].nome })}</Fraco>;
  const restantes = inc.lutasPorDia - inc.minhasLutasHoje;
  return (
    <>
      <p className="font-cinzel font-extrabold text-[3cqw] leading-snug text-[#F5F3E0]">{inc.chefe}</p>
      <Fraco>{textoDaFicha(t.nivelEDificuldade, { n: inc.nivel, dificuldade: inc.dificuldade })}</Fraco>
      <BarraG valor={inc.hp} maximo={inc.hpMax} rotulo={t.vidaAria} cor="vermelho" />
      <Fraco>{textoDaFicha(t.vida, { hp: inc.hp, hpMax: inc.hpMax })}</Fraco>
      {inc.ultima && <p className="font-cinzel text-[2.1cqw] text-[#7BC47F]">{textoDaFicha(t.ultima, { chefe: inc.ultima.chefe, dificuldade: inc.ultima.dificuldade })}</p>}
      <div className="flex items-center gap-[2cqw] flex-wrap">
        <BotaoG disabled={ocupado || restantes <= 0} tipo="principal" onClick={() => void agir('lutarIncursao')}>{restantes > 0 ? t.lutar : t.semLutas}</BotaoG>
        <Fraco>{textoDaFicha(t.lutasDeHoje, { restantes, total: inc.lutasPorDia })}</Fraco>
      </div>
      {inc.participantes.length > 0 && (
        <Secao titulo={t.danoCausado}>
          <ol className="flex flex-col gap-[0.6cqw] font-cinzel text-[2.2cqw] text-[#E9DDC0]">
            {inc.participantes.map((p, i) => (
              <li key={p.nome} className="flex justify-between gap-[2cqw]">
                <span>{textoDaFicha(t.posicao, { i: i + 1, nome: p.nome })}</span>
                <span className="text-[#9CC4E0]">{textoDaFicha(t.danoELutas, { dano: p.dano, n: p.lutas, lutas: p.lutas === 1 ? t.luta : t.lutas })}</span>
              </li>
            ))}
          </ol>
        </Secao>
      )}
      <Fraco>{t.recompensa}</Fraco>
    </>
  );
}

/** Pesquisa: os ramos com o nível, o bônus e as duas barras (ouro e materiais); cada membro doa no ramo que quiser. */
export function SecaoPesquisa({ pesquisa, eu, agir, ocupado }: { pesquisa: PesquisaNaTela; eu: EstadoDaGuilda['eu']; agir: Agir; ocupado: boolean }) {
  const t = T.pesquisa;
  const [aberto, setAberto] = useState<string | null>(null);
  const [ouro, setOuro] = useState('');
  const [material, setMaterial] = useState('');
  const [qtd, setQtd] = useState('');
  if (!pesquisa.liberada) return <Fraco>{textoDaFicha(t.abreNoNivel, { nome: NIVEIS_DA_GUILDA[pesquisa.nivelDaGuildaParaLiberar - 1].nome })}</Fraco>;
  return (
    <>
      <Fraco>{t.ajuda}</Fraco>
      <ul className="flex flex-col gap-[1.4cqw]">
        {pesquisa.ramos.map((r) => (
          <Item key={r.id}>
            <button type="button" onClick={() => setAberto(aberto === r.id ? null : r.id)} aria-expanded={aberto === r.id} className="text-left flex justify-between gap-[2cqw] cursor-pointer">
              <span className="font-cinzel font-bold text-[2.6cqw] leading-snug text-[#F5F3E0]">{r.nome} <span className="text-[2cqw] font-normal text-[#9CC4E0]">{textoDaFicha(t.nivelDoRamo, { n: r.nivel, max: r.nivelMaximo })}</span></span>
              <span className={`font-cinzel font-bold text-[2.2cqw] shrink-0 ${r.bonus ? 'text-[#7BC47F]' : 'text-[#9CC4E0]'}`}>{textoDaFicha(t.bonus, { n: r.bonus, unidade: r.unidade })}</span>
            </button>
            <span className="font-cinzel text-[2cqw] leading-snug text-[#9CC4E0]">{r.descricao}</span>
            {r.custo ? (
              <>
                <BarraG valor={r.ouro} maximo={r.custo.ouro} rotulo={textoDaFicha(t.ouroAria, { nome: r.nome })} />
                <span className="font-cinzel text-[2cqw] text-[#9CC4E0]">{textoDaFicha(t.ouroDoRamo, { atual: r.ouro, total: r.custo.ouro })}</span>
                <BarraG valor={r.materiais} maximo={r.custo.materiais} rotulo={textoDaFicha(t.materiaisAria, { nome: r.nome })} cor="azul" />
                <span className="font-cinzel text-[2cqw] text-[#9CC4E0]">{textoDaFicha(t.materiaisDoRamo, { atual: r.materiais, total: r.custo.materiais })}</span>
              </>
            ) : (
              <span className="font-cinzel font-bold text-[2.2cqw] text-[#7BC47F]">{t.nivelMaximo}</span>
            )}
            {aberto === r.id && r.custo && (
              <div className="flex flex-col gap-[1.4cqw] mt-[0.8cqw]">
                <div className="flex gap-[1.6cqw]">
                  <input type="number" min={1} value={ouro} onChange={(e) => setOuro(e.target.value)} placeholder={textoDaFicha(t.ouroPlaceholder, { n: eu.ouro })} aria-label={textoDaFicha(t.ouroPara, { nome: r.nome })} className={campoBase} />
                  <BotaoG disabled={ocupado || !(Number(ouro) > 0)} onClick={async () => { if (await agir('doarPesquisa', { ramo: r.id, ouro: Number(ouro) })) setOuro(''); }}>{t.doarOuro}</BotaoG>
                </div>
                <div className="flex gap-[1.6cqw]">
                  <select value={material} onChange={(e) => setMaterial(e.target.value)} aria-label={textoDaFicha(t.materialPara, { nome: r.nome })} className={campoBase}>
                    <option value="">{t.material}</option>
                    {eu.materiais.map((m) => <option key={m.id} value={m.id}>{textoDaFicha(t.opcaoDeMaterial, { nome: m.nome, qtd: m.qtd, pt: PONTOS_POR_RARIDADE[m.raridade as RaridadeMaterial] ?? 0 })}</option>)}
                  </select>
                  <input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder={t.quantidade} aria-label={t.quantidadeAria} className={`${campoBase} !flex-none w-[14cqw]`} />
                  <BotaoG disabled={ocupado || !material || !(Number(qtd) > 0)} onClick={async () => { if (await agir('doarPesquisa', { ramo: r.id, materiais: { [material]: Number(qtd) } })) setQtd(''); }}>{t.doar}</BotaoG>
                </div>
              </div>
            )}
          </Item>
        ))}
      </ul>
    </>
  );
}

/** Chefe de guildas: o chefe da semana, o melhor do jogador, a posição da guilda, o top 10, as faixas e os resgates. */
export function SecaoChefe({ chefe: c, agir, ocupado }: { chefe: ChefeSemanalNaTela; agir: Agir; ocupado: boolean }) {
  const t = T.chefe;
  const [verFaixas, setVerFaixas] = useState(false);
  if (!c.liberado) return <Fraco>{textoDaFicha(t.abreNoNivel, { nome: NIVEIS_DA_GUILDA[c.nivelDaGuildaParaLiberar - 1].nome })}</Fraco>;
  return (
    <>
      {c.pendentes.map((semana) => (
        <Item key={semana} destaque="verde">
          <span className="flex items-center justify-between gap-[2cqw]">
            <span className="font-cinzel font-bold text-[2.2cqw] text-[#7BC47F]">{textoDaFicha(t.recompensaDaSemana, { data: dataCurta(semana) })}</span>
            <BotaoG disabled={ocupado} tipo="principal" onClick={() => void agir('resgatarChefeSemanal', { semana })}>{t.resgatar}</BotaoG>
          </span>
        </Item>
      ))}
      <p className="font-cinzel font-extrabold text-[3cqw] leading-snug text-[#F5F3E0]">{c.chefe}</p>
      <Fraco>{textoDaFicha(t.semanaAte, { data: dataCurta(c.termina) })}</Fraco>
      <p className="font-cinzel text-[2.5cqw] leading-snug text-[#F5F3E0]">{textoDaFicha(t.seuMelhor, { meu: c.meuMelhor, guilda: c.totalDaGuilda, posicao: c.posicao ? textoDaFicha(t.posicao, { n: c.posicao }) : '' })}</p>
      <div><BotaoG disabled={ocupado} tipo="principal" onClick={() => void agir('lutarChefeSemanal')}>{t.lutar}</BotaoG></div>
      {c.top.length > 0 && (
        <Secao titulo={t.ranking}>
          <ol className="flex flex-col gap-[0.6cqw] font-cinzel text-[2.2cqw]">
            {c.top.map((x) => (
              <li key={`${x.posicao}-${x.nome}`} className={`flex justify-between gap-[2cqw] ${x.minha ? 'font-extrabold text-[#EDB44C]' : 'text-[#E9DDC0]'}`}>
                <span>{textoDaFicha(T.incursoes.posicao, { i: x.posicao, nome: x.nome })}</span>
                <span>{x.total}</span>
              </li>
            ))}
          </ol>
        </Secao>
      )}
      <button type="button" onClick={() => setVerFaixas(!verFaixas)} aria-expanded={verFaixas} className="self-start font-cinzel text-[2.1cqw] underline text-[#9CC4E0] cursor-pointer">{verFaixas ? t.esconderFaixas : t.verFaixas}</button>
      {verFaixas && (
        <ul className="flex flex-col gap-[0.8cqw] font-cinzel text-[2cqw] leading-snug text-[#9CC4E0]">
          {c.faixas.map((f) => (
            <li key={f.nome}>
              {textoDaFicha(t.faixa, { nome: f.nome, ouro: f.ouro, xp: f.xpGuilda })}
              {f.baus.map((b) => textoDaFicha(t.bau, { n: b.quantidade, raridade: EMBLEMA_RARIDADE_MAP[b.raridade].nome.toLowerCase() })).join('')}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Membros: a lista com o cargo, o XP dado e as ações do líder e dos oficiais. */
export function SecaoMembros({ guilda, agir, ocupado }: { guilda: MinhaGuilda; agir: Agir; ocupado: boolean }) {
  const t = T.membros;
  const lider = guilda.meuCargo === 'lider';
  const acoesDoMembro = (uid: string, nome: string, cargo: CargoDaGuilda) => {
    const botoes: React.ReactNode[] = [];
    if (lider && cargo === 'membro') botoes.push(<BotaoG key="p" disabled={ocupado} onClick={() => void agir('promover', { uid })}>{t.promover}</BotaoG>);
    if (lider && cargo === 'oficial') botoes.push(<BotaoG key="r" disabled={ocupado} onClick={() => void agir('rebaixar', { uid })}>{t.rebaixar}</BotaoG>);
    if (lider && cargo !== 'lider')
      botoes.push(
        <BotaoG key="t" disabled={ocupado} onClick={() => window.confirm(textoDaFicha(t.confirmarLideranca, { nome })) && void agir('transferir', { uid })}>{t.tornarLider}</BotaoG>
      );
    if (podeExpulsar(guilda.meuCargo, cargo))
      botoes.push(
        <BotaoG key="e" tipo="perigo" disabled={ocupado} onClick={() => window.confirm(textoDaFicha(t.confirmarExpulsar, { nome })) && void agir('expulsar', { uid })}>{t.expulsar}</BotaoG>
      );
    return botoes;
  };
  return (
    <ul className="flex flex-col gap-[1.4cqw]">
      {guilda.membros.map((m) => {
        const acoes = acoesDoMembro(m.uid, m.nome, m.cargo);
        return (
          <Item key={m.uid}>
            <span className="flex items-center justify-between gap-[2cqw]">
              <span className="font-cinzel font-bold text-[2.6cqw] text-[#F5F3E0] truncate">{m.nome}</span>
              <span className={`font-cinzel text-[1.9cqw] uppercase tracking-wide ${m.cargo === 'lider' ? 'text-[#EDB44C]' : 'text-[#9CC4E0]'}`}>{NOME_DO_CARGO[m.cargo]}</span>
            </span>
            <span className="font-cinzel text-[2cqw] text-[#9CC4E0]">{textoDaFicha(t.contribuiu, { n: m.xpContribuido ?? 0 })}</span>
            {acoes.length > 0 && <span className="flex flex-wrap gap-[1.4cqw]">{acoes}</span>}
          </Item>
        );
      })}
    </ul>
  );
}

/** Opções: a entrada de membros (líder e oficiais), sair da guilda e desfazer a guilda (só o líder). */
export function SecaoOpcoes({ guilda, agir, ocupado }: { guilda: MinhaGuilda; agir: Agir; ocupado: boolean }) {
  const t = T.opcoes;
  const lider = guilda.meuCargo === 'lider';
  const admin = administraEntrada(guilda.meuCargo);
  const [convidado, setConvidado] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  return (
    <>
      {admin && (
        <Secao titulo={t.entrada}>
          <form
            className="flex gap-[1.6cqw]"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await agir('convidar', { nome: convidado })) setConvidado('');
            }}
          >
            <input value={convidado} onChange={(e) => setConvidado(e.target.value)} maxLength={32} placeholder={t.nomeParaConvidar} aria-label={t.nomeParaConvidarAria} className={campoBase} />
            <BotaoG type="submit" tipo="principal" disabled={ocupado || convidado.trim().length < 2}>{t.convidar}</BotaoG>
          </form>
          <h4 className="font-cinzel font-bold text-[2.4cqw] text-[#F5F3E0]">{t.pedidosParaEntrar}</h4>
          {guilda.pedidos.length === 0 ? (
            <Fraco>{t.nenhumPedido}</Fraco>
          ) : (
            <ul className="flex flex-col gap-[1.2cqw]">
              {guilda.pedidos.map((p) => (
                <Item key={p.uid}>
                  <span className="font-cinzel text-[2.4cqw] text-[#F5F3E0]">{p.nome} <span className="text-[2cqw] text-[#9CC4E0]">· {textoDaFicha(t.pedidoLinha, { classe: CLASSES_MAP[p.classeId]?.nome ?? p.classeId, n: p.nivel })}</span></span>
                  <span className="flex gap-[1.4cqw]">
                    <BotaoG tipo="principal" disabled={ocupado} onClick={() => void agir('aceitarPedido', { uid: p.uid })}>{t.aceitar}</BotaoG>
                    <BotaoG tipo="perigo" disabled={ocupado} onClick={() => void agir('recusarPedido', { uid: p.uid })}>{t.recusar}</BotaoG>
                  </span>
                </Item>
              ))}
            </ul>
          )}
          <h4 className="font-cinzel font-bold text-[2.4cqw] text-[#F5F3E0]">{t.convitesEnviados}</h4>
          {guilda.convites.length === 0 ? (
            <Fraco>{t.nenhumConvite}</Fraco>
          ) : (
            <ul className="flex flex-col gap-[1.2cqw]">
              {guilda.convites.map((c) => (
                <Item key={c.uid}>
                  <span className="flex items-center justify-between gap-[2cqw]">
                    <span className="font-cinzel text-[2.4cqw] text-[#F5F3E0] truncate">{c.nome} <span className="text-[2cqw] text-[#9CC4E0]">· {textoDaFicha(t.convitePor, { nome: c.por })}</span></span>
                    <BotaoG tipo="perigo" disabled={ocupado} onClick={() => void agir('cancelarConvite', { uid: c.uid })}>{t.cancelar}</BotaoG>
                  </span>
                </Item>
              ))}
            </ul>
          )}
        </Secao>
      )}

      {lider && guilda.membros.length > 1 ? (
        <Fraco>{t.sairComLider}</Fraco>
      ) : (
        <div>
          <BotaoG tipo="perigo" disabled={ocupado} onClick={() => window.confirm(lider ? t.confirmarSairLider : textoDaFicha(t.confirmarSair, { nome: guilda.nome })) && void agir('sair')}>{t.sair}</BotaoG>
        </div>
      )}

      {lider && (
        <Secao titulo={t.desfazer}>
          <Fraco>{t.desfazerAjuda}</Fraco>
          <form
            className="flex gap-[1.6cqw]"
            onSubmit={(e) => {
              e.preventDefault();
              void agir('desfazer', { nome: confirmacao });
            }}
          >
            <input value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} maxLength={NOME_MAXIMO_DA_GUILDA} placeholder={guilda.nome} aria-label={t.desfazerAria} className={`${campoBase} !border-[#E5484D]`} />
            <BotaoG type="submit" tipo="perigo" disabled={ocupado || !confirmacao.trim()}>{t.desfazerBotao}</BotaoG>
          </form>
        </Secao>
      )}
    </>
  );
}

// ---------------------------------------------------------------- quem ainda não tem guilda

/** Convites recebidos: aceitar ou recusar. */
export function SecaoConvites({ estado, agir, ocupado }: { estado: EstadoDaGuilda; agir: Agir; ocupado: boolean }) {
  const t = T.semGuilda;
  const { regras } = estado;
  if (estado.convites.length === 0) return <Fraco>{t.nenhumConvite}</Fraco>;
  return (
    <ul className="flex flex-col gap-[1.4cqw]">
      {estado.convites.map((g) => (
        <Item key={g.id}>
          <span className="font-cinzel text-[2.6cqw] text-[#F5F3E0]">{g.nome} <span className="text-[2cqw] text-[#9CC4E0]">· {textoDaFicha(t.convitePerfil, { nivel: nivelDaGuilda(g.xp, regras).nome, n: g.quantidadeMembros })}</span></span>
          <span className="flex gap-[1.4cqw]">
            <BotaoG tipo="principal" disabled={ocupado} onClick={() => void agir('aceitarConvite', { guildaId: g.id })}>{T.opcoes.aceitar}</BotaoG>
            <BotaoG tipo="perigo" disabled={ocupado} onClick={() => void agir('recusarConvite', { guildaId: g.id })}>{T.opcoes.recusar}</BotaoG>
          </span>
        </Item>
      ))}
    </ul>
  );
}

/** Pedidos feitos: esperando resposta, com a opção de cancelar. */
export function SecaoPedidos({ estado, agir, ocupado }: { estado: EstadoDaGuilda; agir: Agir; ocupado: boolean }) {
  const t = T.semGuilda;
  if (estado.pedidos.length === 0) return <Fraco>{t.nenhumPedido}</Fraco>;
  return (
    <ul className="flex flex-col gap-[1.4cqw]">
      {estado.pedidos.map((g) => (
        <Item key={g.id}>
          <span className="flex items-center justify-between gap-[2cqw]">
            <span className="font-cinzel text-[2.6cqw] text-[#F5F3E0] truncate">{g.nome} <span className="text-[2cqw] text-[#9CC4E0]">· {t.esperandoResposta}</span></span>
            <BotaoG tipo="perigo" disabled={ocupado} onClick={() => void agir('cancelarPedido', { guildaId: g.id })}>{T.opcoes.cancelar}</BotaoG>
          </span>
        </Item>
      ))}
    </ul>
  );
}

/** Procurar guildas pelo começo do nome, abrir uma para ver os membros e pedir para entrar. */
export function SecaoProcurar({ estado, agir, ocupado, tokenFresco }: { estado: EstadoDaGuilda; agir: Agir; ocupado: boolean; tokenFresco: Token }) {
  const t = T.semGuilda;
  const { regras } = estado;
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState<ResumoDaGuilda[] | null>(null);
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const [aberta, setAberta] = useState<GuildaPublica | null>(null);

  const procurar = useCallback(
    async (texto: string) => {
      setErroDaLista(null);
      const r = await chamar(tokenFresco, `/api/guildas?q=${encodeURIComponent(texto)}`);
      if (r.ok) setLista(r.dados.guildas as ResumoDaGuilda[]);
      else setErroDaLista(String(r.dados.error ?? t.erroDaLista));
    },
    [tokenFresco, t.erroDaLista]
  );

  useEffect(() => {
    void procurar('');
  }, [procurar]);

  async function abrir(id: string) {
    const r = await chamar(tokenFresco, `/api/guildas/${encodeURIComponent(id)}`);
    if (r.ok) setAberta(r.dados.guilda as GuildaPublica);
    else setErroDaLista(String(r.dados.error ?? t.erroAoAbrir));
  }

  const pedidoFeito = (id: string) => estado.pedidos.some((p) => p.id === id);
  const convidado = (id: string) => estado.convites.some((c) => c.id === id);

  return (
    <>
      <form
        className="flex gap-[1.6cqw]"
        onSubmit={(e) => {
          e.preventDefault();
          setAberta(null);
          void procurar(busca);
        }}
      >
        <input value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={24} placeholder={t.placeholderDaBusca} aria-label={t.nomeDaGuilda} className={campoBase} />
        <BotaoG type="submit" tipo="principal">{t.buscar}</BotaoG>
      </form>
      {erroDaLista && <p role="alert" className="font-cinzel font-bold text-[2.3cqw] text-[#FFB4B4]">{erroDaLista}</p>}
      {lista && lista.length === 0 && <Fraco>{t.nenhuma}</Fraco>}
      {lista && lista.length > 0 && (
        <ul className="flex flex-col gap-[1.2cqw]">
          {lista.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => void abrir(g.id)} className="w-full text-left flex flex-col gap-[0.6cqw] border border-[#2B3F5C] bg-[#080C16]/80 px-[2cqw] py-[1.6cqw] cursor-pointer active:translate-y-px">
                <span className="font-cinzel font-bold text-[2.6cqw] text-[#F5F3E0]">{g.nome}</span>
                <span className="font-cinzel text-[2cqw] text-[#9CC4E0]">{textoDaFicha(t.resumo, { nivel: nivelDaGuilda(g.xp, regras).nome, lider: g.lider, n: g.quantidadeMembros, max: nivelDaGuilda(g.xp, regras).maxMembros })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {aberta && (
        <section aria-label={textoDaFicha(t.guildaAria, { nome: aberta.nome })} className="flex flex-col gap-[1.2cqw] border-2 border-[#B8862B] bg-[#080C16]/90 px-[2cqw] py-[1.8cqw]">
          <h4 className="font-cinzel font-extrabold text-[3cqw] text-[#EDB44C]">{aberta.nome}</h4>
          {aberta.descricao && <p className="font-cinzel text-[2.3cqw] leading-snug whitespace-pre-wrap text-[#E9DDC0]">{aberta.descricao}</p>}
          <Fraco>{textoDaFicha(t.nivelEMembros, { nivel: aberta.nivel.nome, n: aberta.quantidadeMembros, max: aberta.maxMembros })}</Fraco>
          <ul className="flex flex-col gap-[0.4cqw] font-cinzel text-[2.1cqw] text-[#E9DDC0]">
            {aberta.membros.map((m) => <li key={m.nome}>{m.nome} <span className="text-[#9CC4E0]">· {NOME_DO_CARGO[m.cargo]}</span></li>)}
          </ul>
          {convidado(aberta.id) ? (
            <p className="font-cinzel font-bold text-[2.1cqw] text-[#7BC47F]">{t.conviteDaGuilda}</p>
          ) : pedidoFeito(aberta.id) ? (
            <p className="font-cinzel font-bold text-[2.1cqw] text-[#9CC4E0]">{t.pedidoEnviado}</p>
          ) : (
            <div><BotaoG tipo="principal" disabled={ocupado || aberta.quantidadeMembros >= aberta.maxMembros} onClick={() => void agir('pedir', { guildaId: aberta.id })}>{aberta.quantidadeMembros >= aberta.maxMembros ? t.guildaCheia : t.pedir}</BotaoG></div>
          )}
        </section>
      )}
    </>
  );
}

/** Criar uma guilda: o nome, a descrição e o botão, com o nível e o ouro que faltam. */
export function SecaoCriar({ estado, agir, ocupado }: { estado: EstadoDaGuilda; agir: Agir; ocupado: boolean }) {
  const t = T.semGuilda;
  const { regras, eu } = estado;
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const faltaNivel = eu.nivel < regras.nivelMinimo;
  const faltaOuro = eu.ouro < regras.custoOuro;
  return (
    <>
      <Fraco>{textoDaFicha(t.criarRegras, { nivel: regras.nivelMinimo, custo: regras.custoOuro > 0 ? textoDaFicha(t.custoEmOuro, { n: regras.custoOuro }) : '', meuNivel: eu.nivel, ouro: eu.ouro })}</Fraco>
      <form
        className="flex flex-col gap-[1.6cqw]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await agir('criar', { nome, descricao })) {
            setNome('');
            setDescricao('');
          }
        }}
      >
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={NOME_MAXIMO_DA_GUILDA} placeholder={t.placeholderDoNome} aria-label={t.nomeDaNova} className={`${campoBase} w-full`} />
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={DESCRICAO_MAXIMA_DA_GUILDA} rows={3} placeholder={t.placeholderDaDescricao} aria-label={t.descricaoDaNova} className={`${campoBase} w-full`} />
        <div>
          <BotaoG type="submit" tipo="principal" disabled={ocupado || faltaNivel || faltaOuro || nome.trim().length < 3}>
            {faltaNivel ? textoDaFicha(t.precisaNivel, { n: regras.nivelMinimo }) : faltaOuro ? t.ouroInsuficiente : t.criarBotao}
          </BotaoG>
        </div>
      </form>
    </>
  );
}
