'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, Gem, Lock, RefreshCw } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import { getClassById } from '@/rules/classes';
import { getClassSkillIcon } from '@/rules/skillIcons';
import { ATTRIBUTE_ICONS } from '@/assets/icons';
import { HUD_ICONS } from '@/assets/hud';
import { ATTRIBUTE_DISPLAY_NAMES } from '@/rules/attributeInfo';
import type { SlotHabilidade } from '@/rules/habilidadesEquipadas';
import { COR_DA_CLASSE, bannerDaSubclasse, iconeDaHabilidadeSubclasse } from '@/rules/subclasseAssets';
import { TIER_POR_ESPACO_HABILIDADE } from '@/rules/subclasseTiers';
import { GAME_CONFIG } from '@/rules/config';
import { SUBCLASSES, type Subclasse } from '@/rules/subclasses';
import {
  ESPACOS_DO_KIT,
  acoesDaSubclasse,
  bonusDeAtributosDaSubclasse,
  estadoDaSubclasse,
  habilidadeDoKitLiberada,
  passivaDaSubclasseLiberada,
  textoDaSubclasse,
  tierDaSubclasse,
  type AcaoSubclasse,
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
const TIPO_DO_SLOT: Record<SlotHabilidade, string> = {
  ataqueBasico: 'Ataque Básico',
  habilidadeEspecial: 'Habilidade Especial',
  ultimate: 'Ultimate',
};
const INDICE_ICONE_CLASSE: Record<SlotHabilidade, number> = { ataqueBasico: 0, habilidadeEspecial: 1, ultimate: 4 };
const ROTULO_ESPACO = { basico: 'Ataque básico', especial: 'Habilidade especial', ultimate: 'Ultimate' } as const;

const fmt = (n: number) => n.toLocaleString('pt-BR');
const rotuloCelula = (espaco: keyof typeof TIER_POR_ESPACO_HABILIDADE) =>
  `${espaco === 'basico' ? 'Básico' : espaco === 'especial' ? 'Especial' : 'Ultimate'} · T${TIER_POR_ESPACO_HABILIDADE[espaco]}`;

export function SubclassePanel({ character, idToken, onCharacterChange, className = '' }: SubclassePanelProps) {
  const { colors } = NOCTHERA_THEME;
  const classe = getClassById(character.classeId);
  const subclasses: Subclasse[] = SUBCLASSES.filter((s) => s.classeId === character.classeId);

  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ subclasse: Subclasse; acao: AcaoSubclasse } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const chamar = async (url: string, corpo: Record<string, unknown>, sucesso: string): Promise<boolean> => {
    if (!idToken || ocupado) return false;
    setOcupado(true);
    setFeedback(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(corpo),
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

  const executarAcao = async (subclasse: Subclasse, acao: AcaoSubclasse) => {
    const url = acao.tipo === 'subirTier' ? '/api/character/subclasse/tier' : '/api/character/subclasse/escolher';
    const msg =
      acao.tipo === 'desbloquear' ? `${subclasse.nome} desbloqueada!`
      : acao.tipo === 'ativar' ? `${subclasse.nome} ativada!`
      : `${subclasse.nome}: tier ${(tierDaSubclasse(character, subclasse.id) ?? 0) + 1} comprado!`;
    await chamar(url, { subclasseId: subclasse.id }, msg);
    setConfirmacao(null);
  };

  const trocarHabilidade = (slot: SlotHabilidade, habilidadeId: string) =>
    chamar('/api/character/habilidades/equipar', { slot, habilidadeId }, 'Habilidade trocada!');

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

  const iconeOuro = <img src={HUD_ICONS.ouro} alt="" aria-hidden="true" className="w-3 h-3 object-contain" />; // eslint-disable-line @next/next/no-img-element
  const iconeDiamante = <img src={HUD_ICONS.diamante} alt="" aria-hidden="true" className="w-3 h-3 object-contain" />; // eslint-disable-line @next/next/no-img-element
  const iconeFragmento = <Gem className="w-3 h-3 text-cyan-300" aria-hidden="true" />;

  const Botao = ({ subclasse, acao, principal }: { subclasse: Subclasse; acao: AcaoSubclasse; principal: boolean }) => (
    <div className="flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        disabled={!acao.habilitada || ocupado}
        onClick={() => setConfirmacao({ subclasse, acao })}
        className="w-full rounded py-1 px-1 text-[10.5px] font-bold font-cinzel leading-tight transition-all active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        style={{
          backgroundColor: principal ? colors.accent.primary : colors.background.cardElevated,
          color: principal ? colors.background.secondary : colors.text.primary,
          border: `1px solid ${principal ? colors.accent.primary : `${colors.border.default}66`}`,
        }}
      >
        {acao.rotulo}
      </button>
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {acao.custo.fragmentosAlma > 0 && (
          <Custo icone={iconeFragmento} valor={acao.custo.fragmentosAlma} rotulo="Fragmentos de alma" falta={acao.faltando.includes('fragmentos de alma')} />
        )}
        {acao.custo.ouro > 0 && (
          <Custo icone={iconeOuro} valor={acao.custo.ouro} rotulo="Ouro" falta={acao.faltando.includes('ouro')} />
        )}
        {acao.custo.fragmentosSubclasse > 0 && (
          <Custo icone={<Gem className="w-3 h-3 text-fuchsia-300" aria-hidden="true" />} valor={acao.custo.fragmentosSubclasse} rotulo="Fragmentos da subclasse" falta={acao.faltando.includes('fragmentos da subclasse')} />
        )}
        {acao.custo.diamantes > 0 && (
          <Custo icone={iconeDiamante} valor={acao.custo.diamantes} rotulo="Diamantes" falta={acao.faltando.includes('diamantes')} />
        )}
      </div>
    </div>
  );

  const renderColuna = (sub: Subclasse) => {
    const texto = textoDaSubclasse(sub.id);
    const estado = estadoDaSubclasse(character, sub.id);
    const tier = tierDaSubclasse(character, sub.id);
    const acoes = acoesDaSubclasse(character, sub.id);
    const cor = COR_DA_CLASSE[sub.classeId] ?? colors.accent.primary;
    const arte = bannerDaSubclasse(sub.id);
    const ativa = estado === 'ativa';
    const selo = ativa ? `Ativa · T${tier ?? 0}` : tier !== null ? `T${tier}` : estado === 'bloqueadaPorNivel' ? 'Nv 20' : 'Bloqueada';

    const quadros: React.ReactNode[] = [];
    const celula = (chave: string, rotulo: string, no: React.ReactNode) => (
      <div key={chave} className="flex flex-col items-center gap-2">
        {no}
        <span className="text-[8.5px] font-cinzel font-bold leading-none" style={{ color: colors.text.secondary }}>
          {rotulo}
        </span>
      </div>
    );

    // Passiva
    const passivaOk = passivaDaSubclasseLiberada(character, sub.id);
    quadros.push(celula('passiva', 'Passiva · T1',
      <SkillIcon
        src={iconeDaHabilidadeSubclasse(texto.passiva.id)}
        nome={texto.passiva.nome}
        tipo="Passiva"
        descricao={`${passivaOk ? '' : 'Libera no tier 1. '}${texto.passiva.descricao}${passivaOk && !ativa ? ' Vale com a subclasse ativa.' : ''}`}
        bloqueada={!passivaOk}
        size={44}
        isOpen={popoverAberto === `${sub.id}-passiva`}
        onToggle={() => setPopoverAberto((p) => (p === `${sub.id}-passiva` ? null : `${sub.id}-passiva`))}
      />
    ));

    for (const { slot, espaco } of ESPACOS_DO_KIT) {
      const kit = texto[espaco];
      const liberada = habilidadeDoKitLiberada(character, sub.id, espaco);
      const chave = `${sub.id}-${slot}`;
      const alternar = () => setPopoverAberto((p) => (p === chave ? null : chave));
      if (!liberada || !classe) {
        const motivo =
          (tier ?? -1) >= TIER_POR_ESPACO_HABILIDADE[espaco]
            ? 'Ative a subclasse para usar.'
            : `Libera no tier ${TIER_POR_ESPACO_HABILIDADE[espaco]}.`;
        quadros.push(celula(slot, rotuloCelula(espaco),
          <SkillIcon
            src={iconeDaHabilidadeSubclasse(kit.id)}
            nome={kit.nome}
            tipo={ROTULO_ESPACO[espaco]}
            descricao={`${motivo} ${kit.descricao}`}
            bloqueada
            size={44}
            isOpen={popoverAberto === chave}
            onToggle={alternar}
          />
        ));
        continue;
      }
      const equipadaDaSubclasse = character.habilidadesEquipadas?.[slot] === kit.id;
      const daClasse = classe.progressao[slot];
      const escolhida = equipadaDaSubclasse
        ? { src: iconeDaHabilidadeSubclasse(kit.id), nome: kit.nome, descricao: kit.descricao }
        : { src: getClassSkillIcon(classe.id, INDICE_ICONE_CLASSE[slot]), nome: daClasse.nome, descricao: daClasse.descricao };
      const alvoId = equipadaDaSubclasse ? daClasse.id : kit.id;
      quadros.push(celula(slot, rotuloCelula(espaco),
        <div className="relative">
          <SkillIcon
            src={escolhida.src}
            nome={escolhida.nome}
            tipo={`${TIPO_DO_SLOT[slot]} · ${equipadaDaSubclasse ? 'da subclasse' : 'da classe'}`}
            descricao={escolhida.descricao}
            size={44}
            isOpen={popoverAberto === chave}
            onToggle={alternar}
          />
          <button
            type="button"
            aria-label={`Trocar ${escolhida.nome} pela habilidade ${equipadaDaSubclasse ? 'da classe' : 'da subclasse'}`}
            title={`Usar a ${equipadaDaSubclasse ? 'da classe' : 'da subclasse'}`}
            disabled={ocupado}
            onClick={(e) => {
              e.stopPropagation();
              trocarHabilidade(slot, alvoId);
            }}
            className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer active:scale-90 disabled:opacity-50 z-10"
            style={{
              backgroundColor: colors.background.cardElevated,
              border: `1px solid ${colors.accent.primary}`,
              color: colors.accent.primary,
            }}
          >
            <RefreshCw className="w-2.5 h-2.5" aria-hidden="true" />
          </button>
        </div>
      ));
    }

    return (
      <div key={sub.id} className="flex-1 min-w-0 flex flex-col gap-1.5" data-subclasse={sub.id}>
        {/* Banner */}
        <div
          role="group"
          aria-label={`Subclasse ${sub.nome}: ${selo}`}
          className="relative rounded-md overflow-hidden px-1.5 py-1.5 min-h-[78px] flex flex-col justify-end shadow-md"
          style={{
            background: arte ? `url('${arte}') center/cover` : `linear-gradient(165deg, ${cor} 0%, ${colors.background.secondary} 100%)`,
            border: `1.5px solid ${ativa ? colors.accent.primary : `${colors.border.default}77`}`,
            boxShadow: ativa ? `0 0 10px ${colors.accent.primary}66` : undefined,
          }}
        >
          <span
            className="absolute top-1 right-1 text-[9px] font-bold font-cinzel px-1 py-0.5 rounded flex items-center gap-0.5"
            style={{ backgroundColor: '#000000bb', color: ativa ? colors.accent.primary : colors.text.secondary }}
          >
            {estado === 'bloqueadaPorNivel' && <Lock className="w-2.5 h-2.5" aria-hidden="true" />}
            {selo}
          </span>
          <span
            className="text-[13px] font-black font-cinzel leading-tight"
            style={{ color: colors.text.primary, textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
          >
            {sub.nome}
          </span>
          <span className="text-[9px] leading-tight line-clamp-2" style={{ color: colors.text.secondary, textShadow: '0 1px 2px rgba(0,0,0,0.95)' }}>
            {texto.tema}
          </span>
        </div>

        {/* Atributos */}
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

        {/* Habilidades (clicáveis) */}
        <div
          className="grid grid-cols-2 gap-x-1 gap-y-2 justify-items-center rounded py-1.5"
          style={{ backgroundColor: `${colors.background.card}99`, border: `1px solid ${colors.border.default}33` }}
        >
          {quadros}
        </div>

        {/* Botões */}
        <div className="flex flex-col gap-1.5">
          {acoes.principal && <Botao subclasse={sub} acao={acoes.principal} principal />}
          {acoes.secundaria && <Botao subclasse={sub} acao={acoes.secundaria} principal={false} />}
          {acoes.aviso && (
            <span className="text-[10px] text-center font-semibold" style={{ color: colors.text.secondary }}>
              {acoes.aviso}
            </span>
          )}
        </div>
      </div>
    );
  };

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
          {feedback.type === 'success' ? (
            <Check className="w-3.5 h-3.5 shrink-0 text-green-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Saldos */}
      <div className="grid grid-cols-3 gap-1 shrink-0">
        <Saldo icone={iconeOuro} valor={character.ouro ?? 0} rotulo="Ouro" />
        <Saldo icone={iconeFragmento} valor={character.fragmentosAlma ?? 0} rotulo="Fragmentos de alma" />
        <Saldo icone={iconeDiamante} valor={character.diamantes ?? 0} rotulo="Diamantes" />
      </div>

      {/* Os dois banners das subclasses da classe */}
      <div className="flex items-start gap-1.5">{subclasses.map(renderColuna)}</div>

      {/* Confirmação */}
      {confirmacao && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-subclasse-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in pointer-events-auto"
        >
          <div
            className="w-full max-w-sm rounded-lg p-5 flex flex-col gap-3 shadow-2xl border"
            style={{ backgroundColor: colors.background.card, borderColor: colors.accent.primary }}
          >
            <h3 id="modal-subclasse-title" className="text-base font-bold uppercase tracking-wider font-cinzel" style={{ color: colors.text.primary }}>
              {confirmacao.acao.rotulo}: {confirmacao.subclasse.nome}?
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: colors.text.secondary }}>
              {confirmacao.acao.tipo === 'ativar'
                ? `Ativar custa ${GAME_CONFIG.SUBCLASSE_CUSTO_TROCA_DIAMANTES} diamantes. As habilidades de outra subclasse voltam para as da classe.`
                : 'Os recursos abaixo serão gastos agora e não voltam.'}
            </p>
            <div className="flex flex-col gap-1 text-xs" style={{ color: colors.text.primary }}>
              {confirmacao.acao.custo.fragmentosAlma > 0 && (
                <span>Fragmentos de alma: <b>{fmt(confirmacao.acao.custo.fragmentosAlma)}</b> (você tem {fmt(character.fragmentosAlma ?? 0)})</span>
              )}
              {confirmacao.acao.custo.ouro > 0 && (
                <span>Ouro: <b>{fmt(confirmacao.acao.custo.ouro)}</b> (você tem {fmt(character.ouro ?? 0)})</span>
              )}
              {confirmacao.acao.custo.fragmentosSubclasse > 0 && (
                <span>Fragmentos da subclasse: <b>{fmt(confirmacao.acao.custo.fragmentosSubclasse)}</b> (você tem {fmt(character.fragmentosSubclasse?.[confirmacao.subclasse.id] ?? 0)})</span>
              )}
              {confirmacao.acao.custo.diamantes > 0 && (
                <span>Diamantes: <b>{fmt(confirmacao.acao.custo.diamantes)}</b> (você tem {fmt(character.diamantes ?? 0)})</span>
              )}
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
                onClick={() => executarAcao(confirmacao.subclasse, confirmacao.acao)}
                disabled={ocupado}
                className="flex-1 py-2 px-3 rounded text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md"
                style={{ backgroundColor: colors.accent.primary, color: colors.background.secondary }}
              >
                {ocupado ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Confirmar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
