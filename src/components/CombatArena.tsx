'use client';

import React, { useState } from 'react';
import { MONSTERS, MonsterDefinition } from '@/rules/monsters';
import { CharacterDocument } from '@/server/characterService';
import { ResultadoCombate } from '@/game/combat';
import { formatarEventoEfeito } from '@/game/statusEffects';

interface CombatArenaProps {
  idToken: string;
  character: CharacterDocument;
  onCombatComplete: (updatedChar: CharacterDocument) => void;
}

function novoCombateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function CombatArena({ idToken, character, onCombatComplete }: CombatArenaProps) {
  const [combating, setCombating] = useState<string | null>(null);
  const [combatResult, setCombatResult] = useState<ResultadoCombate | null>(null);
  const [mensagens, setMensagens] = useState<string[]>([]);
  const [levelUps, setLevelUps] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleFight = async (monster: MonsterDefinition) => {
    setError(null);
    setCombating(monster.id);
    setCombatResult(null);
    setMensagens([]);
    setLevelUps(0);

    // Um id por batalha: se a resposta se perder e o pedido for repetido,
    // o servidor devolve o mesmo resultado sem dar XP/ouro de novo (0.5-B3)
    const combateId = novoCombateId();
    const enviar = () =>
      fetch('/api/combat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          monsterId: monster.id,
          combateId,
        }),
      });

    try {
      let res: Response;
      try {
        res = await enviar();
        if (res.status === 503) res = await enviar();
      } catch {
        res = await enviar();
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar combate no servidor.');
      }

      setCombatResult(data.resultado);
      setMensagens(data.mensagens || []);
      setLevelUps(data.levelUps || 0);

      if (data.character) {
        onCombatComplete(data.character);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar combate.');
    } finally {
      setCombating(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mt-6 bg-stone-900/90 border border-stone-800 rounded-xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
      <div className="pb-4 mb-6 border-b border-stone-800">
        <span className="text-xs font-serif uppercase tracking-widest text-amber-500 block">
          Campos de Batalha de Nocthera
        </span>
        <h3 className="text-2xl font-serif text-stone-100 tracking-wide">
          Desafiar Criaturas das Trevas
        </h3>
        <p className="text-xs text-stone-400 mt-1">
          O servidor calcula cada golpe, iniciativa e recompensa com base nos atributos do seu personagem.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-950/70 border border-red-800 rounded text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Lista dos 3 Monstros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {MONSTERS.map((m) => {
          const isSelected = combating === m.id;
          const diffHp = m.hp;
          const diffForca = m.atributos.forca;

          return (
            <div
              key={m.id}
              className="bg-stone-950/70 border border-stone-800/90 hover:border-amber-700/60 rounded-lg p-4 flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-serif font-bold text-stone-200 leading-tight">
                    {m.nome}
                  </span>
                  <span className="text-[10px] bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded font-mono">
                    Nv.{m.nivel}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-stone-400 mb-4">
                  <div className="flex justify-between">
                    <span>HP:</span>
                    <span className="text-red-400 font-semibold">{diffHp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Força:</span>
                    <span className="text-amber-300 font-semibold">{diffForca}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Agilidade:</span>
                    <span className="text-emerald-300 font-semibold">{m.atributos.agilidade}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-800/60 text-[11px] text-stone-500">
                    <div>XP: <span className="text-stone-300">+{m.xpConcedido}</span></div>
                    <div>Ouro: <span className="text-yellow-400">{m.ouroConcedido.min}-{m.ouroConcedido.max}</span></div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleFight(m)}
                disabled={combating !== null}
                className="w-full py-2 px-3 bg-red-950 hover:bg-red-900 border border-red-800/60 hover:border-red-600 disabled:bg-stone-800 disabled:border-stone-700 disabled:text-stone-600 text-stone-100 font-serif tracking-wider uppercase text-xs font-bold rounded transition-colors"
              >
                {isSelected ? 'Lutando...' : 'Lutar'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Exibição do Resultado e Log do Combate */}
      {combatResult && (
        <div className="mt-6 pt-6 border-t border-stone-800">
          {/* Banner de Vitória / Derrota */}
          <div
            className={`p-4 rounded-lg border mb-4 ${
              combatResult.vencedor === 'personagem'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : 'bg-red-950/40 border-red-800/80 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-serif font-bold uppercase tracking-wider">
                {combatResult.vencedor === 'personagem' ? 'Vitória nos Reinos!' : 'Derrota em Combate!'}
              </span>
            </div>

            <div className="text-xs space-y-1">
              {mensagens.map((msg, i) => (
                <p key={`msg-${i}`} className="leading-relaxed">
                  {msg}
                </p>
              ))}
            </div>

            {levelUps > 0 && (
              <div className="mt-3 p-2 bg-amber-900/40 border border-amber-700/60 rounded text-amber-200 text-xs font-serif font-bold">
                ▲ Parabéns! Você subiu {levelUps} nível(is)! Pontos disponíveis para alocar: {character.pontosDisponiveis}.
              </div>
            )}
          </div>

          {/* Log de Turnos Detalhado */}
          <div>
            <span className="text-xs uppercase tracking-wider text-stone-400 block mb-2 font-serif">
              Relatório Turno a Turno ({combatResult.logTurnos.length} turnos)
            </span>
            <div className="max-h-60 overflow-y-auto space-y-2 bg-stone-950/80 border border-stone-800/80 rounded-lg p-3 text-xs font-mono text-stone-300">
              {combatResult.logTurnos.map((turno, tIdx) => (
                <div key={`turno-${turno.numeroTurno}-${tIdx}`} className="border-b border-stone-900 pb-2 mb-2 last:border-none last:pb-0 last:mb-0">
                  <span className="text-amber-500 font-bold block mb-1">
                    [Turno {turno.numeroTurno}]
                  </span>
                  {turno.ataques.map((atq, aIdx) => {
                    const jaContemElementoNaMensagem =
                      atq.elemento !== undefined &&
                      atq.mensagem.includes(`elemento: ${atq.elemento}`);
                    const sufixoElementalLog =
                      atq.elemento !== undefined && !jaContemElementoNaMensagem
                        ? atq.reacaoElemental
                          ? ` (elemento: ${atq.elemento} — ${atq.reacaoElemental})`
                          : ` (elemento: ${atq.elemento})`
                        : '';

                    return (
                      <div
                        key={`atq-${turno.numeroTurno}-${tIdx}-${aIdx}`}
                        className="pl-2 text-stone-400"
                      >
                        • {atq.mensagem}
                        {sufixoElementalLog}
                      </div>
                    );
                  })}
                  {(turno.eventosEfeitos ?? []).map((ev, evIdx) => {
                    const nomeInimigo =
                      turno.ataques.find((a) => a.atacante !== character.nome)?.atacante ||
                      turno.ataques.find((a) => a.defensor !== character.nome)?.defensor ||
                      'monstro';
                    return (
                      <div
                        key={`ev-${turno.numeroTurno}-${tIdx}-${evIdx}`}
                        className="pl-2 text-stone-400"
                      >
                        • {formatarEventoEfeito(ev, nomeInimigo)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
