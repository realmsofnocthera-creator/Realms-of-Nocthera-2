import { Elemento } from '@/rules/elements';
import { AplicacaoBuff } from './efeitosBuffs';
import { AplicacaoEfeitoDefensivo } from './efeitosDefensivos';
import { ResultadoHabilidade } from './habilidades/tipos';

/**
 * Catálogo 1.2 — "Bônus por elemento ativo no atacante" (1.9.1).
 * A habilidade declara `elemento` e `bonusElemental`; o elemento dela concede um pacote de bônus que dura
 * 2 rodadas (decisão do Yuri, 09/10/2026). Os bônus entram pelos efeitos que o motor já tem:
 * Fogo +5% de dano; Gelo +3% de dano e −3% de dano recebido; Relâmpago +5% de dano e +5% de chance de Paralisia;
 * Terra +7% de Sobreescudo (Escudo Temporário); Vento +2 de Agilidade; Sagrado e Sombrio +5% de dano contra
 * quem é do elemento oposto (Sombrio e Sagrado).
 */
export const BONUS_ELEMENTO_RODADAS = 2;
export const BONUS_RELAMPAGO_CHANCE_PARALISIA_EXTRA = 5;

const dano = (percentual: number): AplicacaoBuff[] => [
  { tipo: 'bonusDano', percentual, tipoDano: 'fisico', rodadas: BONUS_ELEMENTO_RODADAS },
  { tipo: 'bonusDano', percentual, tipoDano: 'magico', rodadas: BONUS_ELEMENTO_RODADAS },
];

interface PacoteElemento {
  buffs: AplicacaoBuff[];
  efeitosNoUsuario: AplicacaoEfeitoDefensivo[];
  chanceExtraParalisia: number;
  bonusContraElementoAlvo?: { elemento: Elemento; percentual: number };
}

export function pacoteDoElemento(elemento: Elemento): PacoteElemento {
  const vazio: PacoteElemento = { buffs: [], efeitosNoUsuario: [], chanceExtraParalisia: 0 };
  switch (elemento) {
    case 'fogo':
      return { ...vazio, buffs: dano(5) };
    case 'gelo':
      return {
        ...vazio,
        buffs: dano(3),
        efeitosNoUsuario: [
          { efeito: 'resistenciaFisica', valorPercentual: 3, duracaoRodadas: BONUS_ELEMENTO_RODADAS },
          { efeito: 'resistenciaMagica', valorPercentual: 3, duracaoRodadas: BONUS_ELEMENTO_RODADAS },
        ],
      };
    case 'relampago':
      return { ...vazio, buffs: dano(5), chanceExtraParalisia: BONUS_RELAMPAGO_CHANCE_PARALISIA_EXTRA };
    case 'terra':
      return {
        ...vazio,
        efeitosNoUsuario: [{ efeito: 'escudoTemporario', valorPercentual: 7, duracaoRodadas: BONUS_ELEMENTO_RODADAS }],
      };
    case 'vento':
      return {
        ...vazio,
        buffs: [{ tipo: 'atributo', atributo: 'agilidade', valor: 2, rodadas: BONUS_ELEMENTO_RODADAS }],
      };
    case 'sagrado':
      return { ...vazio, bonusContraElementoAlvo: { elemento: 'sombrio', percentual: 5 } };
    case 'sombrio':
      return { ...vazio, bonusContraElementoAlvo: { elemento: 'sagrado', percentual: 5 } };
    default:
      return vazio;
  }
}

/** Soma ao resultado da habilidade o pacote do elemento dela (só se declarar `elemento` e `bonusElemental`). */
export function aplicarBonusElemental(r: ResultadoHabilidade): ResultadoHabilidade {
  if (!r.bonusElemental || !r.elemento) return r;
  const pacote = pacoteDoElemento(r.elemento);
  return {
    ...r,
    buffs: [...(r.buffs ?? []), ...pacote.buffs],
    efeitosNoUsuario: [...(r.efeitosNoUsuario ?? []), ...pacote.efeitosNoUsuario],
    statusComChanceNoAlvo: (r.statusComChanceNoAlvo ?? []).map((s) =>
      s.status === 'paralisia'
        ? { ...s, chanceExtraPercentual: (s.chanceExtraPercentual ?? 0) + pacote.chanceExtraParalisia }
        : s
    ),
    bonusContraElementoAlvo: r.bonusContraElementoAlvo ?? pacote.bonusContraElementoAlvo,
  };
}
