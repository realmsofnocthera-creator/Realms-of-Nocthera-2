'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CharacterDocument } from '@/server/characterService';
import { resolveAvatarSrc } from '@/assets/avatars';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { MOLDURAS_DO_EQUIPAMENTO } from '@/assets/equipamentoUi';
import { ICONE_DA_CATEGORIA } from '@/assets/forjaItens';
import { iconeDaHabilidade } from '@/assets/habilidadesArmadura';
import { ESPACOS_ARMADURA } from '@/rules/armaduras';
import { TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import {
  type ItemEquipamentoTela,
  type SlotEquipamento,
  type SlotTela,
  SLOTS_EQUIPAMENTO,
  armaParaTela,
  opcoesDoSlot,
  resumoDoEquipamento,
  slotsDaTela,
  tabelaDeHabilidades,
} from '@/lib/equipamentoTela';
import { BotaoDoKit, BotaoRedondo } from '@/components/forja/KitDaForja';
import { IconeDePeca } from '@/components/forja/IconeDoMaterial';
import { IconeCategoria } from '@/components/forja/IconeDeCategoria';

type Moldura = keyof Omit<typeof MOLDURAS_DO_EQUIPAMENTO, 'barra'>;
interface FichaEquipamentoPixelProps {
  character: CharacterDocument;
  /** Equipa o item no espaço. Devolve a mensagem de erro, se houver. */
  onEquiparItem?: (slot: SlotEquipamento, itemId: string) => Promise<string | null>;
  onDesequiparItem?: (slot: SlotEquipamento) => Promise<string | null>;
  className?: string;
}

const pixel: React.CSSProperties = { imageRendering: 'pixelated' };
const CONTORNO = '0.2cqw 0 0 #05070D, -0.2cqw 0 0 #05070D, 0 0.2cqw 0 #05070D, 0 -0.2cqw 0 #05070D';
const OURO = '#E7C46A';

const interiorEm = (m: Moldura): React.CSSProperties => {
  const i = MOLDURAS_DO_EQUIPAMENTO[m].interior;
  return { position: 'absolute', left: `${i.esquerda}%`, right: `${i.direita}%`, top: `${i.topo}%`, bottom: `${i.base}%` };
};

/** O título escrito no cabeçalho azul da moldura. */
function TituloDaMoldura({ moldura, children }: { moldura: Moldura; children: React.ReactNode }) {
  const t = MOLDURAS_DO_EQUIPAMENTO[moldura].titulo;
  return (
    <h2 className="absolute flex items-center justify-center font-cinzel font-extrabold uppercase tracking-wide leading-none text-[#DFF3FF] text-center" style={{ left: `${t.esquerda}%`, right: `${t.direita}%`, top: `${t.topo}%`, height: `${t.altura}%`, fontSize: '3.1cqw', textShadow: CONTORNO }}>
      <span className="truncate">{children}</span>
    </h2>
  );
}

/** A arte do item: a da arma (por criatura e categoria) ou a peça de armadura pintada pela raridade. */
function ArteDoItem({ character, item, className }: { character: CharacterDocument; item: ItemEquipamentoTela; className: string }) {
  if (item.slot === 'arma') {
    const a = (character.armas ?? []).find((x) => x.id === item.id);
    return a ? <IconeCategoria categoria={a.categoria} baseId={a.baseId} className={className} /> : null;
  }
  return <IconeDePeca espaco={item.slot} cor={item.cor} className={className} />;
}

/** O que aparece num espaço vazio: a silhueta apagada do tipo do espaço. */
function ArteDoVazio({ slot, className }: { slot: SlotEquipamento; className: string }) {
  if (slot === 'arma') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={ICONE_DA_CATEGORIA.espadaGrande} alt="" aria-hidden="true" draggable={false} className={`${className} object-contain opacity-25 grayscale`} />;
  }
  return <IconeDePeca espaco={slot} cor="#56637A" className={`${className} opacity-70`} />;
}

/** O quadrado de um espaço ou de um item da lista: moldura na cor da raridade (tracejada e cinza quando vazio). */
function Quadro({ cor, vazio = false, selecionado = false, marca, children }: { cor?: string; vazio?: boolean; selecionado?: boolean; marca?: string; children: React.ReactNode }) {
  return (
    <span className="relative flex items-center justify-center w-full aspect-square" style={{ background: 'linear-gradient(180deg, #0F1626 0%, #080C16 100%)', border: `0.5cqw ${vazio ? 'dashed' : 'solid'} ${vazio ? '#4A586E' : (cor ?? OURO)}`, borderRadius: '1.4cqw', boxShadow: selecionado ? '0 0 0 0.5cqw #6FE3EE, 0 0 2.4cqw rgba(111,227,238,0.7)' : vazio ? undefined : `0 0 1.6cqw ${cor}55` }}>
      <span className="block w-[72%] h-[72%]">{children}</span>
      {marca && <span className="absolute -top-[1cqw] -right-[1cqw] min-w-[4.2cqw] px-[0.8cqw] bg-[#0B3A52] border border-[#6FE3EE] text-[#DFF3FF] font-cinzel font-black text-[2cqw] leading-[1.6] text-center">{marca}</span>}
    </span>
  );
}

/** Uma coluna de 3 espaços: o quadrado e, embaixo, o nome do item (ou "Vazio"). */
function ColunaDeEspacos({ character, slots, aberto, aoAbrir }: { character: CharacterDocument; slots: SlotTela[]; aberto: SlotEquipamento | null; aoAbrir: (s: SlotEquipamento) => void }) {
  const t = TEXTOS_DA_FICHA.equipamentos;
  return (
    <div className="flex flex-col justify-between shrink-0" style={{ width: '19cqw' }}>
      {slots.map((s) => (
        <button key={s.id} type="button" onClick={() => aoAbrir(s.id)} aria-label={s.equipado ? `${s.nome}: ${s.equipado.nome}. Trocar` : `${s.nome}: vazio. ${s.disponiveis} disponíveis`} aria-pressed={aberto === s.id} className="flex flex-col items-center gap-[0.8cqw] cursor-pointer active:translate-y-px">
          <Quadro cor={s.equipado?.cor} vazio={!s.equipado} selecionado={aberto === s.id}>
            {s.equipado ? <ArteDoItem character={character} item={s.equipado} className="w-full h-full" /> : <ArteDoVazio slot={s.id} className="w-full h-full" />}
          </Quadro>
          <span className="block w-full text-center font-cinzel font-bold leading-tight text-[2.1cqw] h-[5.4cqw] overflow-hidden [overflow-wrap:anywhere]" style={{ color: s.equipado?.cor ?? '#6F7F96', textShadow: CONTORNO }}>{s.equipado ? s.equipado.nome : s.disponiveis > 0 ? `${t.vazioNoSlot} (${s.disponiveis})` : t.vazioNoSlot}</span>
        </button>
      ))}
    </div>
  );
}

/** Um pop-up sobre a tela com a moldura da folha do Yuri: o título no cabeçalho e o conteúdo dentro, com rolagem. */
function PopupComMoldura({ moldura, largura, titulo, rotulo, aoFechar, children }: { moldura: Moldura; largura: number; titulo: string; rotulo: string; aoFechar: () => void; children: React.ReactNode }) {
  const m = MOLDURAS_DO_EQUIPAMENTO[moldura];
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={rotulo} onClick={aoFechar} className="forja-palco !fixed inset-0 !z-[80] !items-center !justify-center" style={{ backgroundColor: 'rgba(3,6,14,0.62)', left: 0, right: 0 }}>
      <div onClick={(e) => e.stopPropagation()} className="relative" style={{ width: `${largura}cqw`, aspectRatio: `${m.largura} / ${m.altura}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.src} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
        <TituloDaMoldura moldura={moldura}>{titulo}</TituloDaMoldura>
        <BotaoRedondo tipo="x" rotulo={TEXTOS_DA_FICHA.conta.fechar} onClick={aoFechar} className="absolute -top-[3cqw] -right-[2cqw] z-10 w-[9cqw] h-[9cqw]" />
        <div className="overflow-y-auto forja-rolagem flex flex-col gap-[1.6cqw] px-[1.8cqw] py-[0.6cqw]" style={interiorEm(moldura)}>{children}</div>
      </div>
    </div>
  );
}

/** Escolha do item de um espaço: só os itens daquela categoria, o detalhe do escolhido e equipar ou desequipar. */
function EscolhaDeItem({ character, slot, aoFechar, onEquiparItem, onDesequiparItem }: { character: CharacterDocument; slot: SlotEquipamento; aoFechar: () => void; onEquiparItem?: FichaEquipamentoPixelProps['onEquiparItem']; onDesequiparItem?: FichaEquipamentoPixelProps['onDesequiparItem'] }) {
  const t = TEXTOS_DA_FICHA.equipamentos;
  const nome = SLOTS_EQUIPAMENTO.find((s) => s.id === slot)?.nome ?? '';
  const opcoes = useMemo(() => opcoesDoSlot(character, slot), [character, slot]);
  const [escolhido, setEscolhido] = useState<string | null>(opcoes.find((o) => o.equipado)?.id ?? opcoes[0]?.id ?? null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const item = opcoes.find((o) => o.id === escolhido) ?? null;

  const executar = async (acao: () => Promise<string | null> | undefined) => {
    setOcupado(true);
    setErro(null);
    const msg = (await acao()) ?? null;
    setOcupado(false);
    if (msg) setErro(msg);
    else aoFechar();
  };

  return (
    <PopupComMoldura moldura="tabela" largura={82} titulo={nome} rotulo={`Equipar: ${nome}`} aoFechar={aoFechar}>
      {opcoes.length === 0 ? (
        <p role="status" className="font-cinzel font-bold text-[2.8cqw] text-center leading-snug text-[#9CC4E0] py-[6cqw]">{t.semItens}</p>
      ) : (
        <>
          <ul aria-label={nome} className="grid grid-cols-4 gap-[1.8cqw] shrink-0">
            {opcoes.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => setEscolhido(o.id)} aria-pressed={o.id === escolhido} aria-label={`${o.nome}, ${o.raridadeNome}${o.equipado ? `, ${t.equipado}` : ''}`} className="block w-full cursor-pointer active:translate-y-px">
                  <Quadro cor={o.cor} selecionado={o.id === escolhido} marca={o.equipado ? 'E' : undefined}>
                    <ArteDoItem character={character} item={o} className="w-full h-full" />
                  </Quadro>
                </button>
              </li>
            ))}
          </ul>
          {item && (
            <div className="flex flex-col gap-[1cqw] pt-[1cqw] border-t border-[#2B5C80]">
              <p className="font-cinzel font-extrabold leading-tight text-[3cqw]" style={{ color: item.cor, textShadow: CONTORNO }}>{item.nome}</p>
              <p className="font-cinzel text-[2.2cqw] text-[#9CC4E0]">{item.raridadeNome}</p>
              <ul className="flex flex-col gap-[0.5cqw]">
                {item.linhas.map((l) => (
                  <li key={l} className="font-cinzel text-[2.3cqw] leading-snug text-[#E9DDC0] pl-[2.4cqw] relative before:content-['◆'] before:absolute before:left-0 before:text-[#4F6A8C] before:text-[1.6cqw]">{l}</li>
                ))}
              </ul>
            </div>
          )}
          {erro && <p role="alert" className="font-cinzel font-bold text-[2.4cqw] text-[#FFB4B4]">{erro}</p>}
          {item && (
            <div className="pt-[1cqw] mt-auto shrink-0">
              {item.equipado ? (
                <BotaoDoKit disabled={ocupado} onClick={() => void executar(() => onDesequiparItem?.(slot))} className="w-full py-[0.8cqw]">{t.desequipar}</BotaoDoKit>
              ) : (
                <BotaoDoKit disabled={ocupado} onClick={() => void executar(() => onEquiparItem?.(slot, item.id))} className="w-full py-[0.8cqw]">{t.equipar}</BotaoDoKit>
              )}
            </div>
          )}
        </>
      )}
    </PopupComMoldura>
  );
}

/** A barra azul de uma seção do status. */
function Secao({ children }: { children: React.ReactNode }) {
  return <h3 className="shrink-0 font-cinzel font-extrabold uppercase tracking-wide text-[2.5cqw] leading-none text-[#DFF3FF] py-[1cqw] px-[2cqw] text-center border-y border-[#2B5C80]" style={{ background: 'linear-gradient(180deg, #1E3A6B 0%, #14264A 100%)', textShadow: CONTORNO }}>{children}</h3>;
}

function LinhaDoStatus({ rotulo, valor, icone, cor }: { rotulo: string; valor: React.ReactNode; icone?: string; cor?: string }) {
  return (
    <div className="flex items-center gap-[1.6cqw] py-[0.8cqw] border-b border-dashed border-[#2B3F5C]">
      {icone ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icone} alt="" aria-hidden="true" draggable={false} className="w-[3.4cqw] h-[3.4cqw] object-contain shrink-0" style={pixel} />
      ) : (
        <span className="w-[3.4cqw] shrink-0" />
      )}
      <span className="flex-1 min-w-0 font-cinzel font-bold text-[2.4cqw] leading-snug text-[#E9DDC0]">{rotulo}</span>
      <span className="font-cinzel font-black text-[2.6cqw] tabular-nums shrink-0" style={{ color: cor ?? '#F5F3E0' }}>{valor}</span>
    </div>
  );
}

/** O status detalhado do equipamento (o botão de menu): a arma, o que o equipamento soma e os percentuais. */
function StatusDetalhado({ character, aoFechar }: { character: CharacterDocument; aoFechar: () => void }) {
  const t = TEXTOS_DA_FICHA.equipamentos.status;
  const resumo = useMemo(() => resumoDoEquipamento(character), [character]);
  const arma = useMemo(() => {
    const a = (character.armas ?? []).find((x) => x.id === character.equipamento?.armaId);
    return a ? armaParaTela(a, true) : null;
  }, [character]);
  const iconeDoAtributo = (nome: string) => Object.entries({ vigor: 'Vigor', sorte: 'Sorte', forca: 'Força', vitalidade: 'Vitalidade', arcano: 'Arcano', inteligencia: 'Inteligência', agilidade: 'Agilidade' }).find(([, n]) => n === nome)?.[0] as keyof typeof ATTRIBUTE_ICONS | undefined;
  return (
    <PopupComMoldura moldura="status" largura={80} titulo={t.titulo} rotulo={TEXTOS_DA_FICHA.equipamentos.menu} aoFechar={aoFechar}>
      {resumo.vazio && !arma ? (
        <p role="status" className="font-cinzel font-bold text-[2.8cqw] text-center text-[#9CC4E0] py-[6cqw]">{t.vazio}</p>
      ) : (
        <>
          {arma && (
            <>
              <Secao>{t.arma}</Secao>
              <p className="font-cinzel font-extrabold leading-tight text-[2.9cqw]" style={{ color: arma.cor, textShadow: CONTORNO }}>{arma.nome}</p>
              {arma.linhas.map((l) => <p key={l} className="font-cinzel text-[2.3cqw] leading-snug text-[#E9DDC0] border-b border-dashed border-[#2B3F5C] pb-[0.6cqw]">{l}</p>)}
            </>
          )}
          <Secao>{t.bonus}</Secao>
          <LinhaDoStatus rotulo={t.hp} valor={resumo.hp ? `+${resumo.hp}` : '—'} icone={ATTRIBUTE_ICONS.vitalidade} />
          <LinhaDoStatus rotulo={t.defesa} valor={resumo.defesa ? `+${resumo.defesa}` : '—'} />
          {resumo.atributos.map((a) => {
            const chave = iconeDoAtributo(a.nome);
            return <LinhaDoStatus key={a.nome} rotulo={a.nome} valor={a.valor} icone={chave ? ATTRIBUTE_ICONS[chave] : undefined} cor="#EDB44C" />;
          })}
          {resumo.percentuais.map((p) => <LinhaDoStatus key={p.rotulo} rotulo={p.rotulo} valor={p.valor} cor="#9BF0B2" />)}
        </>
      )}
    </PopupComMoldura>
  );
}

/** A tabela habilidade × peça: quais habilidades de armadura estão valendo e de qual peça equipada vem cada nível. */
function TabelaDeHabilidades({ character }: { character: CharacterDocument }) {
  const t = TEXTOS_DA_FICHA.equipamentos.tabela;
  const linhas = useMemo(() => tabelaDeHabilidades(character), [character]);
  const colunas = '1fr repeat(5, 8.2cqw) 10.6cqw';
  return (
    <section aria-label={t.titulo} className="relative w-full shrink-0" style={{ aspectRatio: `${MOLDURAS_DO_EQUIPAMENTO.escolha.largura} / ${MOLDURAS_DO_EQUIPAMENTO.escolha.altura}` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MOLDURAS_DO_EQUIPAMENTO.escolha.src} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
      <TituloDaMoldura moldura="escolha">{t.titulo}</TituloDaMoldura>
      <div className="flex flex-col overflow-y-auto forja-rolagem px-[1.2cqw]" style={interiorEm('escolha')}>
        <div aria-hidden="true" className="grid items-center gap-x-[0.4cqw] pb-[1cqw] border-b border-[#2B5C80]" style={{ gridTemplateColumns: colunas }}>
          <span />
          {ESPACOS_ARMADURA.map((e) => (
            <span key={e.id} className="flex justify-center"><IconeDePeca espaco={e.id} cor="#8FA3BF" className="w-[5.2cqw] h-[5.2cqw]" /></span>
          ))}
          <span className="font-cinzel font-extrabold uppercase text-[2cqw] text-center text-[#9CC4E0]">{t.total}</span>
        </div>
        {linhas.length === 0 ? (
          <p role="status" className="font-cinzel font-bold text-[2.6cqw] text-center leading-snug text-[#9CC4E0] py-[5cqw]">{t.semHabilidades}</p>
        ) : (
          <ul>
            {linhas.map((l) => (
              <li key={l.id} className="grid items-center gap-x-[0.4cqw] py-[0.9cqw] border-b border-dashed border-[#2B3F5C]" style={{ gridTemplateColumns: colunas, opacity: l.aplicada ? 1 : 0.7 }} title={l.aplicada ? undefined : t.naoVale}>
                <span className="flex items-center gap-[1.2cqw] min-w-0">
                  {iconeDaHabilidade(l.id) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={iconeDaHabilidade(l.id) as string} alt="" aria-hidden="true" draggable={false} className="w-[5.2cqw] h-[5.2cqw] object-contain shrink-0" style={pixel} />
                  )}
                  <span className="font-cinzel font-bold text-[2.1cqw] leading-tight text-[#E9DDC0] [overflow-wrap:anywhere]">{l.nome}{l.aplicada ? '' : ' •'}</span>
                </span>
                {ESPACOS_ARMADURA.map((e) => (
                  <span key={e.id} className="font-cinzel font-black text-[2.6cqw] text-center tabular-nums" style={{ color: l.porPeca[e.id] ? '#EDB44C' : '#34465F' }}>{l.porPeca[e.id] ?? '·'}</span>
                ))}
                <span className="font-cinzel font-black text-[2.6cqw] text-center tabular-nums" style={{ color: l.total >= l.nivelMaximo ? '#9BF0B2' : '#F5F3E0' }}>{l.total}/{l.nivelMaximo}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {linhas.some((l) => !l.aplicada) && (
        <p className="absolute font-cinzel text-[1.9cqw] text-[#8FA3BF] text-center" style={{ left: '9%', right: '9%', bottom: '2.6%' }}>• {t.naoVale}</p>
      )}
    </section>
  );
}

/**
 * A aba Equipamentos da ficha em pixel, na disposição do Monster Hunter: os 6 espaços (arma e 5 peças) ao redor do
 * personagem, o botão de menu (três linhas) com o status detalhado em pop-up e a tabela das habilidades de armadura por
 * peça. Tocar num espaço abre só os itens daquela categoria. Toda regra do equipamento continua a de antes.
 */
export function FichaEquipamentoPixel({ character, onEquiparItem, onDesequiparItem, className = '' }: FichaEquipamentoPixelProps) {
  const t = TEXTOS_DA_FICHA.equipamentos;
  const [slotAberto, setSlotAberto] = useState<SlotEquipamento | null>(null);
  const [statusAberto, setStatusAberto] = useState(false);
  const slots = slotsDaTela(character);
  const m = MOLDURAS_DO_EQUIPAMENTO.principal;
  const avatarSrc = resolveAvatarSrc(character.avatarId, character.classeId);

  return (
    <div className={`flex-1 min-h-0 overflow-y-auto forja-rolagem px-[3cqw] flex flex-col items-center gap-[2cqw] ${className}`}>
      <section aria-label="Espaços de equipamento" className="relative w-full shrink-0" style={{ aspectRatio: `${m.largura} / ${m.altura}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.src} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 w-full h-full pointer-events-none" style={pixel} />
        <TituloDaMoldura moldura="principal">{t.titulo}</TituloDaMoldura>
        <button type="button" onClick={() => setStatusAberto(true)} aria-label={t.menu} className="absolute flex flex-col items-center justify-center gap-[0.9cqw] cursor-pointer active:translate-y-px" style={{ left: '82%', top: '3.4%', width: '8cqw', height: '8cqw', background: 'linear-gradient(180deg, #14264A 0%, #0B1220 100%)', border: '0.5cqw solid #B8862B', borderRadius: '1.2cqw', boxShadow: '0 0 0 0.3cqw #05070D' }}>
          {[0, 1, 2].map((i) => <span key={i} className="block bg-[#E7C46A]" style={{ width: '4.2cqw', height: '0.6cqw' }} />)}
        </button>
        <div className="flex items-stretch justify-between" style={interiorEm('principal')}>
          <ColunaDeEspacos character={character} slots={slots.slice(0, 3)} aberto={slotAberto} aoAbrir={setSlotAberto} />
          <div className="flex-1 min-w-0 flex items-end justify-center pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc} alt={`Arte de corpo inteiro de ${character.nome}`} draggable={false} className="h-[96%] w-auto max-w-full object-contain object-bottom select-none drop-shadow-[0_1.4cqw_2cqw_rgba(0,0,0,0.9)]" />
          </div>
          <ColunaDeEspacos character={character} slots={slots.slice(3)} aberto={slotAberto} aoAbrir={setSlotAberto} />
        </div>
      </section>

      <TabelaDeHabilidades character={character} />

      {slotAberto && <EscolhaDeItem character={character} slot={slotAberto} aoFechar={() => setSlotAberto(null)} onEquiparItem={onEquiparItem} onDesequiparItem={onDesequiparItem} />}
      {statusAberto && <StatusDetalhado character={character} aoFechar={() => setStatusAberto(false)} />}
    </div>
  );
}
