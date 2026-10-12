'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bug, Droplet, Flame, Ghost, Moon, Skull, SkipForward, Snowflake, Sparkles, Swords, Zap, Shield, Heart, Info } from 'lucide-react';
import type { CharacterDocument } from '@/server/characterService';
import type { ResultadoCombate } from '@/game/combat';
import type { MonsterDefinition } from '@/rules/monsters';
import type { EfeitoStatus } from '@/rules/statusEffects';
import { EFEITOS_STATUS } from '@/rules/statusEffects';
import { resolveAvatarSrc } from '@/assets/avatars';
import { larguraDasBarras, montarQuadros, PainelLuta, QuadroLuta, TipoLinha } from '@/lib/cacadaReplay';

interface CombateCacadaProps {
  resultado: ResultadoCombate;
  personagem: CharacterDocument;
  monstro: MonsterDefinition;
  titulo: string;
  onFim: () => void;
}

const OURO = '#C8A656';
const FUNDO_PAINEL = 'rgba(14, 11, 14, 0.9)';

const ICONE_STATUS: Record<EfeitoStatus, { Icone: typeof Flame; cor: string }> = {
  sangramento: { Icone: Droplet, cor: '#E5484D' },
  veneno: { Icone: Skull, cor: '#7DCB55' },
  podridaoEscarlate: { Icone: Bug, cor: '#C0392B' },
  congelamento: { Icone: Snowflake, cor: '#7FD3F5' },
  sono: { Icone: Moon, cor: '#A6A6F5' },
  loucura: { Icone: Sparkles, cor: '#D07CF0' },
  maldicao: { Icone: Ghost, cor: '#9B6CF0' },
  paralisia: { Icone: Zap, cor: '#F5D547' },
  queimadura: { Icone: Flame, cor: '#F58A3C' },
};

const ICONE_LINHA: Record<TipoLinha, { Icone: typeof Flame; cor: string }> = {
  ataque: { Icone: Swords, cor: '#D9D9D9' },
  habilidade: { Icone: Sparkles, cor: '#F3C769' },
  dano: { Icone: Zap, cor: '#E5484D' },
  status: { Icone: Droplet, cor: '#E5484D' },
  cura: { Icone: Heart, cor: '#5FCB6A' },
  info: { Icone: Info, cor: '#9A9A9A' },
};

/** Barra única: vermelha por baixo (vida) e azul por cima (Sobreescudo); a vida aparece conforme o escudo cai. */
export function BarraVidaEscudo({ painel }: { painel: PainelLuta }) {
  const { vida, escudo } = larguraDasBarras(painel);
  return (
    <div className="relative h-5 rounded-sm overflow-hidden border" style={{ borderColor: '#000', backgroundColor: '#2a1214' }} role="group"
      aria-label={`Vida ${Math.round(painel.hp)} de ${painel.hpMax}${painel.escudo > 0 ? `, escudo ${Math.round(painel.escudo)}` : ''}`}>
      <div className="absolute inset-y-0 left-0 transition-all duration-300" style={{ width: `${vida}%`, background: 'linear-gradient(180deg,#E5484D,#9B1B22)' }} />
      {escudo > 0 && (
        <div className="absolute inset-y-0 left-0 transition-all duration-300" style={{ width: `${escudo}%`, background: 'linear-gradient(180deg,#5AA7F0,#1F5FA8)', opacity: 0.92 }} />
      )}
      <div className="absolute inset-0 flex items-center justify-end gap-1.5 px-1.5 text-[11px] font-bold font-cinzel text-white" style={{ textShadow: '0 1px 2px #000' }}>
        {painel.escudo > 0 && <span style={{ color: '#BFE0FF' }}>+{Math.round(painel.escudo)}</span>}
        <span>{Math.round(painel.hp)} / {painel.hpMax}</span>
      </div>
    </div>
  );
}

function Status({ status, enfurecido }: { status: EfeitoStatus[]; enfurecido?: boolean }) {
  return (
    <div className="flex items-center gap-1 min-h-[22px] flex-wrap">
      {enfurecido && (
        <span title="Enfurecido" className="w-[22px] h-[22px] rounded-sm flex items-center justify-center border" style={{ backgroundColor: '#3a0d0d', borderColor: '#E5484D' }}>
          <Flame className="w-3.5 h-3.5" style={{ color: '#FF6B4A' }} aria-label="Enfurecido" />
        </span>
      )}
      {status.map((s) => {
        const { Icone, cor } = ICONE_STATUS[s];
        return (
          <span key={s} title={EFEITOS_STATUS[s]?.nome ?? s} className="w-[22px] h-[22px] rounded-sm flex items-center justify-center border" style={{ backgroundColor: '#1a1416', borderColor: `${cor}99` }}>
            <Icone className="w-3.5 h-3.5" style={{ color: cor }} aria-label={EFEITOS_STATUS[s]?.nome ?? s} />
          </span>
        );
      })}
    </div>
  );
}

function Painel({ painel, retrato }: { painel: PainelLuta; retrato?: string }) {
  return (
    <div className="flex items-stretch gap-1.5">
      {retrato && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={retrato} alt="" aria-hidden="true" className="w-14 h-14 rounded-sm object-cover border-2" style={{ borderColor: OURO }} />
      )}
      <div className="flex-1 min-w-0 rounded-sm border-2 px-2 py-1 flex flex-col gap-1" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
        <div className="flex items-center justify-between font-cinzel text-[13px] text-[#F3E6CC]">
          <span className="truncate font-bold">{painel.nome}</span>
          <span className="shrink-0">Nv. {painel.nivel}</span>
        </div>
        <BarraVidaEscudo painel={painel} />
        <Status status={painel.status} enfurecido={painel.enfurecido} />
      </div>
    </div>
  );
}

/**
 * Tela de combate da Caçada: reprodução automática da luta resolvida no servidor (×1 / ×2), com barras únicas de
 * vida e escudo, status, log e as 5 habilidades com o quanto falta para cada uma ativar.
 */
export function CombateCacada({ resultado, personagem, monstro, titulo, onFim }: CombateCacadaProps) {
  const quadros: QuadroLuta[] = useMemo(() => montarQuadros(resultado, personagem, monstro), [resultado, personagem, monstro]);
  const [indice, setIndice] = useState(0);
  const [rapido, setRapido] = useState(false);
  const fim = indice >= quadros.length - 1;

  useEffect(() => {
    if (fim) {
      const t = setTimeout(onFim, 1200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndice((i) => Math.min(quadros.length - 1, i + 1)), rapido ? 450 : 900);
    return () => clearTimeout(t);
  }, [indice, fim, rapido, quadros.length, onFim]);

  const q = quadros[indice];

  return (
    <div className="relative w-full h-dvh max-h-dvh flex flex-col overflow-hidden select-none" style={{ backgroundColor: '#07050a' }}>
      {/* Cenário */}
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/landing-bg.webp')", filter: 'brightness(0.45) saturate(1.1)' }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(40,8,20,0.55) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)' }} />

      <div className="relative z-10 flex flex-col h-full px-2 pt-2 pb-2 gap-1.5 max-w-[480px] w-full mx-auto">
        {/* Topo */}
        <div className="flex items-center gap-1.5">
          <div className="px-2 py-1 rounded-sm border-2 text-center font-cinzel text-[#F3E6CC] leading-tight" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
            <div className="text-[10px]">Turno</div>
            <div className="text-sm font-bold">{q.turno}</div>
          </div>
          <div className="flex-1 px-2 py-1 rounded-sm border-2 text-center font-cinzel text-[#F3E6CC] leading-tight" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
            <div className="text-[13px] font-bold truncate">{titulo}</div>
            <div className="text-[11px]">1 / 1</div>
          </div>
          <button type="button" onClick={() => setRapido((r) => !r)} aria-label={rapido ? 'Velocidade normal' : 'Velocidade dobrada'}
            className="px-2.5 py-2 rounded-sm border-2 font-cinzel font-bold text-sm cursor-pointer active:scale-95" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO, color: rapido ? '#F3C769' : '#BFAF8F' }}>
            »» ×2
          </button>
          <button type="button" onClick={() => setIndice(quadros.length - 1)} aria-label="Pular para o fim"
            className="p-2 rounded-sm border-2 cursor-pointer active:scale-95" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO, color: '#BFAF8F' }}>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Monstro */}
        <div className="flex justify-end">
          <div className="w-[78%]"><Painel painel={q.monstro} /></div>
        </div>

        {/* Arena */}
        <div className="flex-1 min-h-0 relative">
          <div className="absolute right-[6%] top-[8%] w-[46%] aspect-square rounded-full flex items-center justify-center border-2"
            style={{ borderColor: `${OURO}66`, background: 'radial-gradient(circle, rgba(120,20,30,0.55), rgba(0,0,0,0.2) 70%)', opacity: q.monstro.hp > 0 ? 1 : 0.25, transition: 'opacity 0.6s' }}>
            <span className="font-cinzel font-black text-5xl" style={{ color: '#F3E6CC', textShadow: '0 0 18px rgba(229,72,77,0.8)' }}>{monstro.nome.charAt(0)}</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveAvatarSrc(personagem.avatarId, personagem.classeId)} alt="" aria-hidden="true"
            className="absolute left-[6%] bottom-[4%] w-[38%] aspect-square object-cover rounded-full border-2"
            style={{ borderColor: `${OURO}88`, opacity: q.jogador.hp > 0 ? 1 : 0.3, transition: 'opacity 0.6s' }} />
        </div>

        {/* Jogador */}
        <Painel painel={q.jogador} retrato={resolveAvatarSrc(personagem.avatarId, personagem.classeId)} />

        {/* Log */}
        <div className="rounded-sm border-2 px-2 py-1.5 flex flex-col gap-1 h-[148px] overflow-hidden" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }} aria-live="polite">
          {q.linhas.map((l, i) => {
            const { Icone, cor } = ICONE_LINHA[l.tipo];
            return (
              <div key={`${indice}-${i}`} className="flex items-center gap-2 text-[12.5px] leading-tight text-[#EDE3CF]">
                <Icone className="w-3.5 h-3.5 shrink-0" style={{ color: cor }} aria-hidden="true" />
                <span className="truncate">{l.texto}</span>
              </div>
            );
          })}
        </div>

        {/* Habilidades */}
        <div className="grid grid-cols-5 gap-1.5 rounded-sm border-2 p-1.5" style={{ backgroundColor: FUNDO_PAINEL, borderColor: OURO }}>
          {q.habilidades.map((h) => (
            <div key={h.espaco} className="flex flex-col items-center gap-1" title={`${h.nome}: ${h.texto}`}>
              <div className="relative w-full aspect-square rounded-sm overflow-hidden border-2"
                style={{ borderColor: h.ativandoAgora ? '#F3C769' : '#3a3030', boxShadow: h.ativandoAgora ? '0 0 10px #F3C769' : 'none', opacity: h.bloqueada ? 0.4 : 1 }}>
                {h.icone ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.icone} alt={h.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1a1416]"><Shield className="w-5 h-5 text-[#8a7a5a]" /></div>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#2b2424]" aria-label={`${h.nome}: ${h.texto}`}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.round(h.progresso * 100)}%`, backgroundColor: h.ativandoAgora ? '#F3C769' : '#C08A3E' }} />
              </div>
              <span className="text-[9px] leading-none font-cinzel text-[#BFAF8F] whitespace-nowrap">{h.texto}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
