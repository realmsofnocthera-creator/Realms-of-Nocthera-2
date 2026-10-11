'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, Gem, Lock } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { HUD_ICONS } from '@/assets/hud';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import { COR_DA_CLASSE, bannerDaSubclasse, iconeDaHabilidadeSubclasse } from '@/rules/subclasseAssets';
import { TIER_POR_ESPACO_HABILIDADE } from '@/rules/subclasseTiers';
import { GAME_CONFIG } from '@/rules/config';
import { SUBCLASSES, type Subclasse } from '@/rules/subclasses';
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
import { NOCTHERA_THEME } from '@/theme/theme';

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

type Confirmacao = { titulo: string; aviso: string; acao: AcaoSubclasse; executar: () => Promise<void> };

/**
 * Tela de Subclasse (2.1.5). Cada personagem tem uma subclasse só:
 * - sem subclasse: escolha, com um banner por subclasse da classe (atributos, habilidades e Desbloquear);
 * - com subclasse: os banners somem e entra a evolução, uma linha T1 a T4 com a explicação e o botão do tier;
 * - Resetar a subclasse custa 100 diamantes e zera os tiers.
 */
export function SubclassePanel({ character, idToken, onCharacterChange, className = '' }: SubclassePanelProps) {
  const { colors } = NOCTHERA_THEME;
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
      if (!res.ok) throw new Error(data.error || 'Não foi possível concluir a ação.');
      if (data.character) onCharacterChange(data.character);
      setFeedback({ type: 'success', message: sucesso });
      return true;
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao processar a ação.' });
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const iconeOuro = <img src={HUD_ICONS.ouro} alt="" aria-hidden="true" className="w-3 h-3 object-contain" />; // eslint-disable-line @next/next/no-img-element
  const iconeDiamante = <img src={HUD_ICONS.diamante} alt="" aria-hidden="true" className="w-3 h-3 object-contain" />; // eslint-disable-line @next/next/no-img-element
  const iconeFragmento = <Gem className="w-3 h-3 text-cyan-300" aria-hidden="true" />;

  const Saldo = ({ icone, valor, rotulo }: { icone: React.ReactNode; valor: number; rotulo: string }) => (
    <div
      role="group"
      aria-label={`${rotulo}: ${valor}`}
      className="rounded px-1.5 py-1 flex items-center justify-center gap-1 shadow-sm"
      style={{ backgroundColor: `${colors.background.card}ee`, border: `1px solid ${colors.border.default}44` }}
    >
      {icone}
      <span className="text-[11px] font-bold font-cinzel" style={{ color: colors.text.primary }}>{fmt(valor)}</span>
    </div>
  );

  const Custo = ({ icone, valor, falta, rotulo }: { icone: React.ReactNode; valor: number; falta: boolean; rotulo: string }) => (
    <span
      title={rotulo}
      aria-label={`${rotulo}: ${valor}${falta ? ' (insuficiente)' : ''}`}
      className="inline-flex items-center gap-0.5 text-[10px] font-bold font-cinzel"
      style={{ color: falta ? '#F5A6A6' : colors.text.primary }}
    >
      {icone}
      {fmt(valor)}
    </span>
  );

  const Custos = ({ acao }: { acao: AcaoSubclasse }) => (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {acao.custo.fragmentosAlma > 0 && (
        <Custo icone={iconeFragmento} valor={acao.custo.fragmentosAlma} rotulo="Fragmentos de alma" falta={acao.faltando.includes('fragmentos de alma')} />
      )}
      {acao.custo.ouro > 0 && <Custo icone={iconeOuro} valor={acao.custo.ouro} rotulo="Ouro" falta={acao.faltando.includes('ouro')} />}
      {acao.custo.fragmentosSubclasse > 0 && (
        <Custo icone={<Gem className="w-3 h-3 text-fuchsia-300" aria-hidden="true" />} valor={acao.custo.fragmentosSubclasse} rotulo="Fragmentos da subclasse" falta={acao.faltando.includes('fragmentos da subclasse')} />
      )}
      {acao.custo.diamantes > 0 && <Custo icone={iconeDiamante} valor={acao.custo.diamantes} rotulo="Diamantes" falta={acao.faltando.includes('diamantes')} />}
    </div>
  );

  const Botao = ({ acao, principal, aoClicar }: { acao: AcaoSubclasse; principal: boolean; aoClicar: () => void }) => (
    <div className="flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        disabled={!acao.habilitada || ocupado}
        onClick={aoClicar}
        className="w-full rounded py-1.5 px-1 text-[11px] font-bold font-cinzel leading-tight transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        style={{
          backgroundColor: principal ? colors.accent.primary : colors.background.cardElevated,
          color: principal ? colors.background.secondary : colors.text.primary,
          border: `1px solid ${principal ? colors.accent.primary : `${colors.border.default}66`}`,
        }}
      >
        {acao.rotulo}
      </button>
      <Custos acao={acao} />
    </div>
  );

  // ---------------------------------------------------------------- Escolha da subclasse
  const renderEscolha = (sub: Subclasse) => {
    const texto = textoDaSubclasse(sub.id);
    const estado = estadoDaSubclasse(character, sub.id);
    const { acao, aviso } = acaoDeEscolha(character, sub.id);
    const cor = COR_DA_CLASSE[sub.classeId] ?? colors.accent.primary;
    const arte = bannerDaSubclasse(sub.id);
    const selo = estado === 'bloqueadaPorNivel' ? `Nv ${GAME_CONFIG.SUBCLASSE_NIVEL_MINIMO}` : 'Disponível';

    const habilidades: { chave: string; rotulo: string; id: string; nome: string; tipo: string; descricao: string; tier: number }[] = [
      { chave: 'passiva', rotulo: 'Passiva', tipo: 'Passiva', tier: 1, ...texto.passiva },
      { chave: 'basico', rotulo: 'Básico', tipo: 'Ataque Básico', tier: TIER_POR_ESPACO_HABILIDADE.basico, ...texto.basico },
      { chave: 'especial', rotulo: 'Especial', tipo: 'Habilidade Especial', tier: TIER_POR_ESPACO_HABILIDADE.especial, ...texto.especial },
      { chave: 'ultimate', rotulo: 'Ultimate', tipo: 'Ultimate', tier: TIER_POR_ESPACO_HABILIDADE.ultimate, ...texto.ultimate },
    ];

    return (
      <div key={sub.id} className="flex-1 min-w-0 flex flex-col gap-1.5" data-subclasse={sub.id}>
        <div
          role="group"
          aria-label={`Subclasse ${sub.nome}: ${selo}`}
          className="relative rounded-md overflow-hidden px-1.5 py-1.5 min-h-[78px] flex flex-col justify-end shadow-md"
          style={{
            background: arte ? `url('${arte}') center/cover` : `linear-gradient(165deg, ${cor} 0%, ${colors.background.secondary} 100%)`,
            border: `1.5px solid ${colors.border.default}77`,
          }}
        >
          <span
            className="absolute top-1 right-1 text-[9px] font-bold font-cinzel px-1 py-0.5 rounded flex items-center gap-0.5"
            style={{ backgroundColor: '#000000bb', color: colors.text.secondary }}
          >
            {estado === 'bloqueadaPorNivel' && <Lock className="w-2.5 h-2.5" aria-hidden="true" />}
            {selo}
          </span>
          <span className="text-[13px] font-black font-cinzel leading-tight" style={{ color: colors.text.primary, textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}>
            {sub.nome}
          </span>
          <span className="text-[9px] leading-tight line-clamp-2" style={{ color: colors.text.secondary, textShadow: '0 1px 2px rgba(0,0,0,0.95)' }}>
            {texto.tema}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1" aria-label={`Atributos que ${sub.nome} soma`}>
          {bonusDeAtributosDaSubclasse(sub.id).map(({ atributo, valor }) => (
            <div
              key={atributo}
              title={ATTRIBUTE_DISPLAY_NAMES[atributo]}
              aria-label={`${ATTRIBUTE_DISPLAY_NAMES[atributo]}: +${valor}`}
              className="rounded px-1 py-0.5 flex items-center justify-center gap-1"
              style={{ backgroundColor: `${colors.background.card}ee`, border: `1px solid ${colors.border.default}44` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ATTRIBUTE_ICONS[atributo]} alt="" aria-hidden="true" className="w-3.5 h-3.5 object-contain shrink-0" />
              <span className="text-[10px] font-bold font-cinzel" style={{ color: colors.text.primary }}>
                +{valor} <span style={{ color: colors.text.secondary }}>{SIGLAS[atributo]}</span>
              </span>
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-2 gap-x-1 gap-y-2 justify-items-center rounded py-1.5"
          style={{ backgroundColor: `${colors.background.card}99`, border: `1px solid ${colors.border.default}33` }}
        >
          {habilidades.map((h) => {
            const chave = `${sub.id}-${h.chave}`;
            return (
              <div key={h.chave} className="flex flex-col items-center gap-2">
                <SkillIcon
                  src={iconeDaHabilidadeSubclasse(h.id)}
                  nome={h.nome}
                  tipo={h.tipo}
                  descricao={`Libera no tier ${h.tier}. ${h.descricao}`}
                  size={44}
                  isOpen={popoverAberto === chave}
                  onToggle={() => setPopoverAberto((p) => (p === chave ? null : chave))}
                />
                <span className="text-[8.5px] font-cinzel font-bold leading-none" style={{ color: colors.text.secondary }}>
                  {h.rotulo} · T{h.tier}
                </span>
              </div>
            );
          })}
        </div>

        {acao && (
          <Botao
            acao={acao}
            principal
            aoClicar={() =>
              setConfirmacao({
                titulo: `Desbloquear ${sub.nome}?`,
                aviso: 'Cada personagem tem uma subclasse só: trocar depois exige resetar (100 diamantes) e perder os tiers. Os recursos abaixo serão gastos agora.',
                acao,
                executar: async () => {
                  await chamar('/api/character/subclasse/escolher', { subclasseId: sub.id }, `${sub.nome} desbloqueada!`);
                },
              })
            }
          />
        )}
        {aviso && (
          <span className="text-[10px] text-center font-semibold" style={{ color: colors.text.secondary }}>
            {aviso}
          </span>
        )}
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
    const proximo = linha.find((t) => t.estado === 'proximo')?.tier ?? 4;
    const tier = tierSelecionado ?? proximo;
    const item = linha.find((t) => t.tier === tier) as TierDaLinha;
    const hab = item.espaco === 'passiva' ? texto.passiva : texto[item.espaco];
    const { acao, aviso } = acaoDoTier(character, tier);
    const reset = acaoDeReset(character);
    const cor = COR_DA_CLASSE[sub.classeId] ?? colors.accent.primary;

    return (
      <div className="flex flex-col gap-2" data-subclasse-ativa={subId}>
        {/* Cabeçalho: nome, tier atual, tema e atributos */}
        <div
          className="rounded-md px-2 py-1.5 flex flex-col gap-1"
          style={{ background: `linear-gradient(165deg, ${cor}99 0%, ${colors.background.card} 100%)`, border: `1.5px solid ${colors.accent.primary}88` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-black font-cinzel leading-tight" style={{ color: colors.text.primary }}>{sub.nome}</span>
            <span className="text-[10px] font-bold font-cinzel px-1.5 py-0.5 rounded" style={{ backgroundColor: '#000000bb', color: colors.accent.primary }}>
              Tier {tierAtual}
            </span>
          </div>
          <span className="text-[10px] leading-tight" style={{ color: colors.text.secondary }}>{texto.tema}</span>
          <div className="flex flex-wrap gap-1" aria-label={`Atributos que ${sub.nome} soma`}>
            {bonusDeAtributosDaSubclasse(subId).map(({ atributo, valor }) => (
              <span key={atributo} title={ATTRIBUTE_DISPLAY_NAMES[atributo]} aria-label={`${ATTRIBUTE_DISPLAY_NAMES[atributo]}: +${valor}`} className="inline-flex items-center gap-0.5 text-[10px] font-bold font-cinzel" style={{ color: colors.text.primary }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ATTRIBUTE_ICONS[atributo]} alt="" aria-hidden="true" className="w-3 h-3 object-contain" />
                +{valor} {SIGLAS[atributo]}
              </span>
            ))}
          </div>
        </div>

        {/* Linha de círculos: •--•---•---• */}
        <div className="flex items-center px-2 py-2" role="tablist" aria-label="Tiers da subclasse">
          {linha.map((t, i) => {
            const selecionado = t.tier === tier;
            const comprado = t.estado === 'comprado';
            const ehProximo = t.estado === 'proximo';
            return (
              <React.Fragment key={t.tier}>
                {i > 0 && (
                  <div
                    aria-hidden="true"
                    className="flex-1 h-0.5"
                    style={{ backgroundColor: linha[i - 1].estado === 'comprado' ? colors.accent.primary : `${colors.border.default}55` }}
                  />
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={selecionado}
                  aria-label={`Tier ${t.tier}: ${t.rotulo} (${comprado ? 'comprado' : ehProximo ? 'próximo' : 'bloqueado'})`}
                  onClick={() => setTierSelecionado(t.tier)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black font-cinzel shrink-0 cursor-pointer transition-all active:scale-95 ${ehProximo ? 'animate-pulse' : ''}`}
                  style={{
                    backgroundColor: comprado ? colors.accent.primary : colors.background.cardElevated,
                    color: comprado ? colors.background.secondary : ehProximo ? colors.accent.primary : colors.text.secondary,
                    border: `2px solid ${comprado || ehProximo ? colors.accent.primary : `${colors.border.default}66`}`,
                    boxShadow: selecionado ? `0 0 0 3px ${colors.accent.primary}55, 0 0 10px ${colors.accent.primary}88` : 'none',
                    opacity: t.estado === 'bloqueado' ? 0.7 : 1,
                  }}
                >
                  T{t.tier}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* O que esse tier faz */}
        <div
          className="rounded-md p-2 flex items-start gap-2"
          style={{ backgroundColor: `${colors.background.card}ee`, border: `1px solid ${colors.border.default}55` }}
        >
          <SkillIcon
            src={iconeDaHabilidadeSubclasse(hab.id)}
            nome={hab.nome}
            tipo={item.rotulo}
            descricao={hab.descricao}
            bloqueada={item.estado !== 'comprado'}
            size={44}
            isOpen={popoverAberto === 'tier'}
            onToggle={() => setPopoverAberto((p) => (p === 'tier' ? null : 'tier'))}
          />
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="text-[11px] font-bold font-cinzel leading-tight" style={{ color: colors.accent.primary }}>
              T{tier} · {item.rotulo}
            </span>
            <span className="text-[12px] font-black font-cinzel leading-tight" style={{ color: colors.text.primary }}>{hab.nome}</span>
            <span className="text-[11px] leading-snug" style={{ color: colors.text.secondary }}>{hab.descricao}</span>
          </div>
        </div>

        {/* Botão do tier */}
        {acao ? (
          <Botao
            acao={acao}
            principal
            aoClicar={() =>
              setConfirmacao({
                titulo: `Subir para o tier ${tier}?`,
                aviso: 'Os recursos abaixo serão gastos agora e não voltam.',
                acao,
                executar: async () => {
                  const ok = await chamar('/api/character/subclasse/tier', { subclasseId: subId }, `${sub.nome}: tier ${tier} comprado!`);
                  if (ok) setTierSelecionado(null);
                },
              })
            }
          />
        ) : (
          <div
            className="w-full rounded py-1.5 text-[11px] text-center font-bold font-cinzel"
            style={{ backgroundColor: colors.background.cardElevated, border: `1px solid ${colors.border.default}55`, color: aviso === 'Comprado' ? colors.accent.primary : colors.text.secondary }}
          >
            {aviso === 'Comprado' && <Check className="inline w-3 h-3 mr-1 -mt-0.5" aria-hidden="true" />}
            {aviso}
          </div>
        )}

        {/* Resetar */}
        {reset && (
          <div className="pt-1 border-t" style={{ borderColor: `${colors.border.default}33` }}>
            <Botao
              acao={reset}
              principal={false}
              aoClicar={() =>
                setConfirmacao({
                  titulo: 'Resetar a subclasse?',
                  aviso: 'Você perde a subclasse, o bônus de atributos e todos os tiers. Para ter uma subclasse de novo, paga tudo outra vez (tier 0 em diante). O custo em diamantes não volta.',
                  acao: reset,
                  executar: async () => {
                    const ok = await chamar('/api/character/subclasse/resetar', undefined, 'Subclasse resetada.');
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
    <div className={`h-full flex flex-col gap-1.5 w-full max-w-[320px] select-none overflow-y-auto overflow-x-hidden pr-0.5 ${className}`}>
      {feedback && (
        <div
          role="alert"
          className="rounded px-2 py-1 text-[11px] flex items-center gap-1.5 shadow-md font-medium leading-tight shrink-0"
          style={{
            backgroundColor: feedback.type === 'success' ? colors.status.success : colors.status.danger,
            border: `1px solid ${feedback.type === 'success' ? colors.status.successText : colors.status.danger}`,
            color: feedback.type === 'success' ? colors.status.successText : colors.text.primary,
          }}
        >
          {feedback.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0 text-green-400" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 shrink-0">
        <Saldo icone={iconeOuro} valor={character.ouro ?? 0} rotulo="Ouro" />
        <Saldo icone={iconeFragmento} valor={character.fragmentosAlma ?? 0} rotulo="Fragmentos de alma" />
        <Saldo icone={iconeDiamante} valor={character.diamantes ?? 0} rotulo="Diamantes" />
      </div>

      {modo === 'escolha' ? <div className="flex items-start gap-1.5">{subclasses.map(renderEscolha)}</div> : renderEvolucao()}

      {confirmacao && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-subclasse-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto"
        >
          <div className="w-full max-w-sm rounded-lg p-5 flex flex-col gap-3 shadow-2xl border" style={{ backgroundColor: colors.background.card, borderColor: colors.accent.primary }}>
            <h3 id="modal-subclasse-title" className="text-base font-bold uppercase tracking-wider font-cinzel" style={{ color: colors.text.primary }}>
              {confirmacao.titulo}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: colors.text.secondary }}>{confirmacao.aviso}</p>
            <div className="flex flex-col gap-1 text-xs" style={{ color: colors.text.primary }}>
              {confirmacao.acao.custo.fragmentosAlma > 0 && (
                <span>Fragmentos de alma: <b>{fmt(confirmacao.acao.custo.fragmentosAlma)}</b> (você tem {fmt(character.fragmentosAlma ?? 0)})</span>
              )}
              {confirmacao.acao.custo.ouro > 0 && <span>Ouro: <b>{fmt(confirmacao.acao.custo.ouro)}</b> (você tem {fmt(character.ouro ?? 0)})</span>}
              {confirmacao.acao.custo.fragmentosSubclasse > 0 && (
                <span>Fragmentos da subclasse: <b>{fmt(confirmacao.acao.custo.fragmentosSubclasse)}</b> (você tem {fmt(character.fragmentosSubclasse?.[character.subclasseAtualId ?? ''] ?? 0)})</span>
              )}
              {confirmacao.acao.custo.diamantes > 0 && <span>Diamantes: <b>{fmt(confirmacao.acao.custo.diamantes)}</b> (você tem {fmt(character.diamantes ?? 0)})</span>}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmacao(null)}
                disabled={ocupado}
                className="flex-1 py-2 px-3 rounded text-xs sm:text-sm font-semibold disabled:opacity-40 cursor-pointer"
                style={{ backgroundColor: colors.background.cardElevated, border: `1px solid ${colors.border.default}55`, color: colors.text.secondary }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const c = confirmacao;
                  await c.executar();
                  setConfirmacao(null);
                }}
                disabled={ocupado}
                className="flex-1 py-2 px-3 rounded text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md"
                style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}
              >
                {ocupado ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <span>Confirmar</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
