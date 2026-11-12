'use client';

import React, { useState } from 'react';
import type { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { HUD_ICONS } from '@/assets/hud';
import { KIT_DA_FORJA } from '@/assets/forjaUi';
import { arteDaSubclasse, estandarteDaSubclasse } from '@/assets/subclassesUi';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { iconeDaHabilidadeSubclasse } from '@/rules/subclasseAssets';
import { TIER_POR_ESPACO_HABILIDADE } from '@/rules/subclasseTiers';
import { GAME_CONFIG } from '@/rules/config';
import { SUBCLASSES, type Subclasse } from '@/rules/subclasses';
import { AVATARES_DE_SUBCLASSE } from '@/rules/avatars';
import { textoDaFicha, TEXTOS_DA_FICHA } from '@/rules/textosDaFicha';
import {
  acaoDeEscolha,
  acaoDeReset,
  acaoDoTier,
  bonusDeAtributosDaSubclasse,
  estadoDaSubclasse,
  linhaDeTiers,
  modoDaTela,
  textoDaSubclasse,
  tierDaSubclasse,
  type AcaoSubclasse,
  type TierDaLinha,
} from '@/lib/subclasseTela';
import { SkillIcon } from '@/components/skills';
import { IconeDeMoeda } from '@/components/colecao/ArtesDaColecao';
import { BotaoDoKit, BotaoRedondo, PainelDaForja } from '@/components/forja/KitDaForja';
import { CONTORNO_PIXEL } from '@/components/ficha/PlacaPixel';

interface SubclassePanelProps {
  character: CharacterDocument;
  idToken: string | null;
  onCharacterChange: (character: CharacterDocument) => void;
  className?: string;
}

const SIGLAS: Record<string, string> = {
  vigor: 'Vig', sorte: 'Sor', forca: 'For', vitalidade: 'Vit', arcano: 'Arc', inteligencia: 'Int', agilidade: 'Agi',
};
const fmt = (n: number) => n.toLocaleString('pt-BR');
const pixel: React.CSSProperties = { imageRendering: 'pixelated' };

/** Só algumas subclasses já têm retrato e personagem para o perfil. */
const temAvatar = (subclasseId: string) => AVATARES_DE_SUBCLASSE.some((a) => a.subclasseId === subclasseId);

type Confirmacao = { titulo: string; aviso: string; acao: AcaoSubclasse; executar: () => Promise<void> };

/** Ícones das moedas da tela: os de sempre para ouro e diamante e o fragmento da Coleção (roxo para o da subclasse). */
const iconeOuro = <img src={HUD_ICONS.ouro} alt="" aria-hidden="true" className="w-[3.2cqw] h-[3.2cqw] object-contain" style={pixel} />; // eslint-disable-line @next/next/no-img-element
const iconeDiamante = <img src={HUD_ICONS.diamante} alt="" aria-hidden="true" className="w-[3.2cqw] h-[3.2cqw] object-contain" style={pixel} />; // eslint-disable-line @next/next/no-img-element
const iconeFragmentoDeAlma = <IconeDeMoeda moeda="fragmento" className="w-[3.2cqw] h-[3.2cqw]" />;
const iconeFragmentoDaSubclasse = (
  <span style={{ filter: 'hue-rotate(250deg) saturate(1.3)' }}>
    <IconeDeMoeda moeda="fragmento" className="w-[3.2cqw] h-[3.2cqw]" />
  </span>
);

/** A arte da subclasse: o estandarte (o próprio ou o padrão na cor da classe) e, se já tiver, o personagem ao lado dele. */
function ArteDaSubclasseTela({ subclasse, altura }: { subclasse: Subclasse; altura: string }) {
  const arte = arteDaSubclasse(subclasse.id);
  const estandarte = estandarteDaSubclasse(subclasse.id);
  return (
    <div className="relative flex items-end justify-center w-full" style={{ height: altura }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={estandarte.src} alt="" aria-hidden="true" draggable={false} className="h-full w-auto shrink-0 pointer-events-none select-none" style={{ aspectRatio: estandarte.proporcao, filter: estandarte.filtro, ...pixel }} />
      {arte && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={arte.personagem} alt="" aria-hidden="true" draggable={false} className="w-auto object-contain object-bottom pointer-events-none select-none min-w-0" style={{ height: '88%', maxWidth: '66%', marginLeft: '-2cqw', aspectRatio: arte.proporcaoDoPersonagem, ...pixel }} />
      )}
    </div>
  );
}

function Saldo({ icone, valor, rotulo }: { icone: React.ReactNode; valor: number; rotulo: string }) {
  return (
    <PainelDaForja borda="1.6cqw" role="group" aria-label={`${rotulo}: ${valor}`} className="flex items-center justify-center gap-[0.8cqw] py-[0.4cqw]">
      {icone}
      <span className="font-cinzel font-black text-[2.4cqw] leading-[1.4] tabular-nums text-[#F5F3E0]">{fmt(valor)}</span>
    </PainelDaForja>
  );
}

function Custo({ icone, valor, falta, rotulo }: { icone: React.ReactNode; valor: number; falta: boolean; rotulo: string }) {
  const t = TEXTOS_DA_FICHA.subclasseTela;
  return (
    <span title={rotulo} aria-label={`${rotulo}: ${valor}${falta ? ` (${t.insuficiente})` : ''}`} className={`inline-flex items-center gap-[0.6cqw] font-cinzel font-bold text-[2.1cqw] leading-[1.4] ${falta ? 'text-[#F5A6A6]' : 'text-[#E9DDC0]'}`}>
      {icone}
      {fmt(valor)}
    </span>
  );
}

function Custos({ acao }: { acao: AcaoSubclasse }) {
  const t = TEXTOS_DA_FICHA.subclasseTela;
  return (
    <div className="flex items-center justify-center gap-[1.6cqw] flex-wrap">
      {acao.custo.fragmentosAlma > 0 && <Custo icone={iconeFragmentoDeAlma} valor={acao.custo.fragmentosAlma} rotulo={t.fragmentosAlma} falta={acao.faltando.includes('fragmentos de alma')} />}
      {acao.custo.ouro > 0 && <Custo icone={iconeOuro} valor={acao.custo.ouro} rotulo={t.ouro} falta={acao.faltando.includes('ouro')} />}
      {acao.custo.fragmentosSubclasse > 0 && <Custo icone={iconeFragmentoDaSubclasse} valor={acao.custo.fragmentosSubclasse} rotulo={t.fragmentosSubclasse} falta={acao.faltando.includes('fragmentos da subclasse')} />}
      {acao.custo.diamantes > 0 && <Custo icone={iconeDiamante} valor={acao.custo.diamantes} rotulo={t.diamantes} falta={acao.faltando.includes('diamantes')} />}
    </div>
  );
}

function BotaoDaAcao({ acao, desligado, aoClicar }: { acao: AcaoSubclasse; desligado: boolean; aoClicar: () => void }) {
  return (
    <div className="flex flex-col items-stretch gap-[0.8cqw]">
      <BotaoDoKit onClick={aoClicar} disabled={!acao.habilitada || desligado} className="w-full !text-[2.3cqw]">{acao.rotulo}</BotaoDoKit>
      <Custos acao={acao} />
    </div>
  );
}

/** Os atributos que a subclasse soma, em quadrinhos com o ícone de sempre. */
function AtributosDaSubclasse({ subclasse, colunas = 2 }: { subclasse: Subclasse; colunas?: 2 | 4 }) {
  const t = TEXTOS_DA_FICHA.subclasseTela;
  return (
    <div className={`grid gap-[0.8cqw] ${colunas === 2 ? 'grid-cols-2' : 'grid-cols-4'}`} aria-label={textoDaFicha(t.atributosQueSoma, { nome: subclasse.nome })}>
      {bonusDeAtributosDaSubclasse(subclasse.id).map(({ atributo, valor }) => (
        <div key={atributo} title={ATTRIBUTE_DISPLAY_NAMES[atributo]} aria-label={`${ATTRIBUTE_DISPLAY_NAMES[atributo]}: +${valor}`} className="flex items-center justify-center gap-[0.6cqw] border border-[#2B3F5C] bg-[#080C16]/80 py-[0.6cqw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ATTRIBUTE_ICONS[atributo]} alt="" aria-hidden="true" draggable={false} className="w-[3.2cqw] h-[3.2cqw] object-contain shrink-0 pointer-events-none" />
          <span className="font-cinzel font-bold text-[2cqw] leading-[1.4] text-[#F5F3E0] whitespace-nowrap">
            +{valor} <span className="text-[#9CC4E0]">{SIGLAS[atributo]}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Tela de Subclasse (2.1.5) em pixel. Cada personagem tem uma subclasse só:
 * - sem subclasse: escolha, com o estandarte e o personagem de cada subclasse da classe (atributos, habilidades e Desbloquear);
 * - com subclasse: entra a evolução, uma linha T1 a T4 com a explicação e o botão do tier;
 * - Resetar a subclasse custa 100 diamantes e zera os tiers.
 * Desbloquear a subclasse libera o retrato e o personagem dela para o perfil.
 */
export function SubclassePanel({ character, idToken, onCharacterChange, className = '' }: SubclassePanelProps) {
  const t = TEXTOS_DA_FICHA.subclasseTela;
  const modo = modoDaTela(character);

  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);
  const [tierSelecionado, setTierSelecionado] = useState<number | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const chamar = async (url: string, corpo: Record<string, unknown> | undefined, sucesso: string): Promise<boolean> => {
    if (!idToken || ocupado) return false;
    setOcupado(true);
    setFeedback(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(corpo ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.erro);
      if (data.character) onCharacterChange(data.character);
      setFeedback({ type: 'success', message: sucesso });
      return true;
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : t.erroGeral });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  // ---------------------------------------------------------------- Escolha da subclasse
  const renderEscolha = (sub: Subclasse) => {
    const texto = textoDaSubclasse(sub.id);
    const estado = estadoDaSubclasse(character, sub.id);
    const { acao, aviso } = acaoDeEscolha(character, sub.id);
    const selo = estado === 'bloqueadaPorNivel' ? textoDaFicha(t.nivelMinimo, { n: GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO }) : t.disponivel;

    const habilidades: { chave: string; rotulo: string; id: string; nome: string; tipo: string; descricao: string; tier: number }[] = [
      { chave: 'passiva', rotulo: t.passiva, tipo: t.tipoPassiva, tier: 1, ...texto.passiva },
      { chave: 'basico', rotulo: t.basico, tipo: t.tipoBasico, tier: TIER_POR_ESPACO_HABILIDADE.basico, ...texto.basico },
      { chave: 'especial', rotulo: t.especial, tipo: t.tipoEspecial, tier: TIER_POR_ESPACO_HABILIDADE.especial, ...texto.especial },
      { chave: 'ultimate', rotulo: t.ultimate, tipo: t.tipoUltimate, tier: TIER_POR_ESPACO_HABILIDADE.ultimate, ...texto.ultimate },
    ];

    return (
      <div key={sub.id} className="flex-1 min-w-0 flex flex-col gap-[1.2cqw]" data-subclasse={sub.id}>
        <PainelDaForja borda="1.8cqw" role="group" aria-label={textoDaFicha(t.grupo, { nome: sub.nome, selo })} className="relative flex flex-col items-center gap-[0.8cqw]">
          <span className="absolute top-[0.4cqw] right-[0.4cqw] z-10 font-cinzel font-bold text-[1.8cqw] leading-[1.4] px-[1cqw] bg-[#05070D]/80 border border-[#2B3F5C] text-[#9CC4E0]">{selo}</span>
          <ArteDaSubclasseTela subclasse={sub} altura="38cqw" />
          <span className="font-cinzel font-black text-[2.8cqw] leading-[1.35] text-[#F5F3E0] text-center" style={{ textShadow: CONTORNO_PIXEL }}>{sub.nome}</span>
          <span className="font-cinzel text-[1.9cqw] leading-snug text-[#C9D6EA] text-center min-h-[5.4cqw]">{texto.tema}</span>
        </PainelDaForja>

        <AtributosDaSubclasse subclasse={sub} />

        <div className="grid grid-cols-2 gap-x-[1cqw] gap-y-[1.6cqw] justify-items-center border border-[#2B3F5C] bg-[#080C16]/70 py-[1.4cqw]">
          {habilidades.map((h) => {
            const chave = `${sub.id}-${h.chave}`;
            return (
              <div key={h.chave} className="flex flex-col items-center gap-[1cqw]">
                <SkillIcon
                  src={iconeDaHabilidadeSubclasse(h.id)}
                  nome={h.nome}
                  tipo={h.tipo}
                  descricao={textoDaFicha(t.libera, { n: h.tier, descricao: h.descricao })}
                  size="9cqw"
                  isOpen={popoverAberto === chave}
                  onToggle={() => setPopoverAberto((p) => (p === chave ? null : chave))}
                />
                <span className="font-cinzel font-bold text-[1.7cqw] leading-none text-[#9CC4E0]">{h.rotulo} · T{h.tier}</span>
              </div>
            );
          })}
        </div>

        {acao && (
          <BotaoDaAcao
            acao={acao}
            desligado={ocupado}
            aoClicar={() =>
              setConfirmacao({
                titulo: textoDaFicha(t.desbloquearTitulo, { nome: sub.nome }),
                aviso: t.desbloquearAviso + (temAvatar(sub.id) ? t.desbloquearAvisoAvatar : ''),
                acao,
                executar: async () => {
                  await chamar('/api/character/subclasse/escolher', { subclasseId: sub.id }, textoDaFicha(temAvatar(sub.id) ? t.desbloqueadaComAvatar : t.desbloqueada, { nome: sub.nome }));
                },
              })
            }
          />
        )}
        {aviso && <span className="font-cinzel font-bold text-[2cqw] leading-snug text-center text-[#9CC4E0]">{aviso}</span>}
      </div>
    );
  };

  // ---------------------------------------------------------------- Evolução (linha T1 a T4)
  const renderEvolucao = () => {
    const subId = character.subclasseAtualId as string;
    const sub = SUBCLASSES.find((s) => s.id === subId);
    const texto = textoDaSubclasse(subId);
    if (!sub || !texto) return null;

    const tierAtual = tierDaSubclasse(character, subId) ?? 0;
    const linha = linhaDeTiers(character);
    const proximo = linha.find((x) => x.estado === 'proximo')?.tier ?? 4;
    const tier = tierSelecionado ?? proximo;
    const item = linha.find((x) => x.tier === tier) as TierDaLinha;
    const hab = item.espaco === 'passiva' ? texto.passiva : texto[item.espaco];
    const { acao, aviso } = acaoDoTier(character, tier);
    const reset = acaoDeReset(character);

    return (
      <div className="flex flex-col gap-[1.8cqw]" data-subclasse-ativa={subId}>
        {/* cabeçalho: a arte, o nome, o tier atual, o tema e os atributos */}
        <PainelDaForja borda="2cqw" className="flex gap-[1.4cqw] items-end">
          <div className="shrink-0" style={{ width: '34cqw' }}>
            <ArteDaSubclasseTela subclasse={sub} altura="30cqw" />
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-[1cqw]">
            <div className="flex items-center justify-between gap-[1cqw]">
              <span className="font-cinzel font-black text-[3cqw] leading-[1.35] text-[#F5F3E0]" style={{ textShadow: CONTORNO_PIXEL }}>{sub.nome}</span>
              <span className="shrink-0 font-cinzel font-bold text-[2cqw] leading-[1.4] px-[1cqw] bg-[#05070D]/80 border border-[#B8862B] text-[#EDB44C]">{textoDaFicha(t.tierAtual, { n: tierAtual })}</span>
            </div>
            <span className="font-cinzel text-[1.9cqw] leading-snug text-[#C9D6EA]">{texto.tema}</span>
            <AtributosDaSubclasse subclasse={sub} />
          </div>
        </PainelDaForja>

        {/* a linha de tiers: T1 a T4 */}
        <div className="flex items-center px-[1cqw]" role="tablist" aria-label={t.tiers}>
          {linha.map((x, i) => {
            const selecionado = x.tier === tier;
            const comprado = x.estado === 'comprado';
            const ehProximo = x.estado === 'proximo';
            const estado = comprado ? t.comprado : ehProximo ? t.proximo : t.bloqueado;
            return (
              <React.Fragment key={x.tier}>
                {i > 0 && <div aria-hidden="true" className={`flex-1 h-[0.8cqw] ${linha[i - 1].estado === 'comprado' ? 'bg-[#EDB44C]' : 'bg-[#2B3F5C]'}`} />}
                <button
                  type="button"
                  role="tab"
                  aria-selected={selecionado}
                  aria-label={textoDaFicha(t.tierAria, { n: x.tier, rotulo: x.rotulo, estado })}
                  onClick={() => setTierSelecionado(x.tier)}
                  className={`relative shrink-0 w-[12cqw] font-cinzel font-black text-[2.8cqw] leading-[1.4] text-center cursor-pointer active:translate-y-px ${comprado ? 'text-[#0A1A22]' : ehProximo ? 'text-[#EDB44C] animate-pulse' : 'text-[#7C8AA0]'}`}
                  style={{ borderStyle: 'solid', borderWidth: '2cqw 1.6cqw', borderImage: `url(${comprado ? KIT_DA_FORJA.abaAtiva : KIT_DA_FORJA.aba}) 20 24 fill / 2cqw 1.6cqw stretch`, filter: selecionado ? 'drop-shadow(0 0 1.4cqw rgba(255,180,60,0.9))' : undefined, ...pixel }}
                >
                  T{x.tier}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* o que esse tier faz */}
        <PainelDaForja borda="2cqw" className="flex items-start gap-[1.6cqw]">
          <SkillIcon
            src={iconeDaHabilidadeSubclasse(hab.id)}
            nome={hab.nome}
            tipo={item.rotulo}
            descricao={hab.descricao}
            bloqueada={item.estado !== 'comprado'}
            size="11cqw"
            isOpen={popoverAberto === 'tier'}
            onToggle={() => setPopoverAberto((p) => (p === 'tier' ? null : 'tier'))}
          />
          <div className="min-w-0 flex flex-col gap-[0.6cqw]">
            <span className="font-cinzel font-bold text-[2.2cqw] leading-[1.4] text-[#EDB44C]">{textoDaFicha(t.tierLinha, { n: tier, rotulo: item.rotulo })}</span>
            <span className="font-cinzel font-black text-[2.6cqw] leading-[1.35] text-[#F5F3E0]">{hab.nome}</span>
            <span className="font-cinzel text-[2.1cqw] leading-snug text-[#E9DDC0]">{hab.descricao}</span>
          </div>
        </PainelDaForja>

        {/* o botão do tier */}
        {acao ? (
          <BotaoDaAcao
            acao={acao}
            desligado={ocupado}
            aoClicar={() =>
              setConfirmacao({
                titulo: textoDaFicha(t.tierTitulo, { n: tier }),
                aviso: t.tierAviso,
                acao,
                executar: async () => {
                  const ok = await chamar('/api/character/subclasse/tier', { subclasseId: subId }, textoDaFicha(t.tierComprado, { nome: sub.nome, n: tier }));
                  if (ok) setTierSelecionado(null);
                },
              })
            }
          />
        ) : (
          <p className={`font-cinzel font-extrabold uppercase text-[2.4cqw] leading-[1.4] text-center border border-[#2B3F5C] bg-[#080C16]/80 py-[1.4cqw] ${aviso === 'Comprado' ? 'text-[#EDB44C]' : 'text-[#9CC4E0]'}`}>{aviso}</p>
        )}

        {/* resetar */}
        {reset && (
          <div className="pt-[1cqw] border-t border-dashed border-[#2B3F5C]">
            <BotaoDaAcao
              acao={{ ...reset, rotulo: t.resetar }}
              desligado={ocupado}
              aoClicar={() =>
                setConfirmacao({
                  titulo: t.resetTitulo,
                  aviso: t.resetAviso + (temAvatar(subId) ? t.resetAvisoAvatar : ''),
                  acao: reset,
                  executar: async () => {
                    const ok = await chamar('/api/character/subclasse/resetar', undefined, t.resetFeito);
                    if (ok) setTierSelecionado(null);
                  },
                })
              }
            />
          </div>
        )}
      </div>
    );
  };

  const subclasses: Subclasse[] = SUBCLASSES.filter((s) => s.classeId === character.classeId);

  return (
    <div className={`flex flex-col gap-[1.8cqw] w-full select-none ${className}`}>
      {feedback && <p role="alert" className={`font-cinzel font-bold text-[2.4cqw] leading-snug text-center ${feedback.type === 'success' ? 'text-[#9BE3A0]' : 'text-[#FFB4B4]'}`}>{feedback.message}</p>}

      <div className="grid grid-cols-3 gap-[1cqw] shrink-0">
        <Saldo icone={iconeOuro} valor={character.ouro ?? 0} rotulo={t.ouro} />
        <Saldo icone={iconeFragmentoDeAlma} valor={character.fragmentosAlma ?? 0} rotulo={t.fragmentosAlma} />
        <Saldo icone={iconeDiamante} valor={character.diamantes ?? 0} rotulo={t.diamantes} />
      </div>

      {modo === 'escolha' ? <div className="flex items-start gap-[1.4cqw]">{subclasses.map(renderEscolha)}</div> : renderEvolucao()}

      {confirmacao && (
        <div role="dialog" aria-modal="true" aria-label={confirmacao.titulo} className="forja-palco !fixed inset-0 !z-[80] !items-center !justify-center px-[4cqw]" style={{ backgroundColor: 'rgba(3,6,14,0.7)', left: 0, right: 0 }}>
          <div className="relative w-full max-w-[88cqw]">
            <BotaoRedondo tipo="x" rotulo={t.cancelar} onClick={() => !ocupado && setConfirmacao(null)} className="absolute -top-[3.4cqw] -right-[2cqw] z-10 w-[9cqw] h-[9cqw]" />
            <PainelDaForja borda="3cqw">
              <div className="flex flex-col gap-[2.2cqw]">
                <h2 className="font-cinzel font-extrabold uppercase text-[3.2cqw] leading-[1.35] text-[#EDB44C]">{confirmacao.titulo}</h2>
                <p className="font-cinzel text-[2.4cqw] leading-snug text-[#E9DDC0]">{confirmacao.aviso}</p>
                <div className="flex flex-col gap-[0.8cqw] font-cinzel text-[2.4cqw] leading-[1.4] text-[#F5F3E0]">
                  {confirmacao.acao.custo.fragmentosAlma > 0 && <span>{t.fragmentosAlma}: <b>{fmt(confirmacao.acao.custo.fragmentosAlma)}</b> ({textoDaFicha(t.voceTem, { n: fmt(character.fragmentosAlma ?? 0) })})</span>}
                  {confirmacao.acao.custo.ouro > 0 && <span>{t.ouro}: <b>{fmt(confirmacao.acao.custo.ouro)}</b> ({textoDaFicha(t.voceTem, { n: fmt(character.ouro ?? 0) })})</span>}
                  {confirmacao.acao.custo.fragmentosSubclasse > 0 && <span>{t.fragmentosSubclasse}: <b>{fmt(confirmacao.acao.custo.fragmentosSubclasse)}</b> ({textoDaFicha(t.voceTem, { n: fmt(character.fragmentosSubclasse?.[character.subclasseAtualId ?? ''] ?? 0) })})</span>}
                  {confirmacao.acao.custo.diamantes > 0 && <span>{t.diamantes}: <b>{fmt(confirmacao.acao.custo.diamantes)}</b> ({textoDaFicha(t.voceTem, { n: fmt(character.diamantes ?? 0) })})</span>}
                </div>
                <div className="flex items-center gap-[2cqw]">
                  <BotaoDoKit onClick={() => setConfirmacao(null)} disabled={ocupado} className="flex-1">{t.cancelar}</BotaoDoKit>
                  <BotaoDoKit
                    onClick={async () => {
                      const c = confirmacao;
                      await c.executar();
                      setConfirmacao(null);
                    }}
                    disabled={ocupado}
                    className="flex-1"
                  >
                    {t.confirmar}
                  </BotaoDoKit>
                </div>
              </div>
            </PainelDaForja>
          </div>
        </div>
      )}
    </div>
  );
}
