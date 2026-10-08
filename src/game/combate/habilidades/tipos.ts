import type { AplicacaoEfeitoDefensivo } from '@/game/combate/efeitosDefensivos';
import type { AplicacaoCura } from '@/game/combate/efeitosCura';

export type EspacoHabilidade = 'basico' | 'especial' | 'ultimate';
export type TipoDanoHabilidade = 'fisico' | 'magico';

export interface AlvoHabilidade {
  hp: number;
  hpMax: number;
  sobreescudo: number;
  mitigacaoFisica: number;
  mitigacaoMagica: number;
}

export interface AtacanteHabilidade {
  hp: number;
  hpMax: number;
  nivel: number;
}

export interface ContextoHabilidade {
  atacante: AtacanteHabilidade;
  alvo: AlvoHabilidade;
  danoBase: number;
  /** Bônus de dano em %, vindos de passivas (Instinto, Frenesi...), somados no mesmo grupo do bônus da habilidade. */
  bonusDanoExtraPercentual?: number;
}

export interface ResultadoHabilidade {
  nome: string;
  tipoDano: TipoDanoHabilidade;
  percentualDano: number; // 115 = 115% do danoBase
  ignorarDefesaPercentual: number; // 0 a 100
  bonusDanoPercentual: number; // bônus condicional somado (ex.: +30)
  bonusContraSobreescudoPercentual: number; // só vale se alvo.sobreescudo > 0
  curaPercentualDanoCausado: number;
  curaPercentualHpMax: number;
  /** Efeitos de Mitigação e defesa (catálogo 1.2) que a habilidade coloca em quem a usa. */
  efeitosNoUsuario?: AplicacaoEfeitoDefensivo[];
  /** Efeitos de Cura e restauração (catálogo 1.2) em quem usa a habilidade, aplicados depois do golpe. */
  efeitosCura?: AplicacaoCura[];

  // ---- Dano ofensivo (catálogo 1.2, categoria da 1.2.4) ----
  /** Golpes na mesma ação, cada um com o percentualDano da habilidade (Golpe Duplo = 2, Dano Replicado = 3). */
  numeroGolpes?: number;
  /** Dano Escalado: o dano parte de X% do HP que o usuário perdeu, no lugar do dano base. */
  danoEscalado?: { percentualHpPerdido: number };
  /** Dano Invertido: +percentualPorPasso de dano para cada pontosEscudoPorPasso de Sobreescudo do alvo, até o teto. */
  danoInvertido?: { percentualPorPasso: number; pontosEscudoPorPasso: number; tetoPercentual: number };
  /** Dano Elemental Forçado: ignora resistências e imunidades elementais do alvo (fraquezas continuam valendo). */
  ignorarResistenciaElemental?: boolean;
  /** Dano Acumulativo: cada uso soma percentualPorAtaque ao bônus das próximas vezes, até o limite. */
  acumulativo?: { percentualPorAtaque: number; limitePercentual: number };
  /** Ímpeto Imprudente: nos próximos N ataques, +% de dano e −% de defesa. */
  impeto?: { ataques: number; bonusDanoPercentual: number; reducaoDefesaPercentual: number };
}

export interface DefinicaoHabilidade {
  id: string;
  espaco: EspacoHabilidade;
  tipoDano?: TipoDanoHabilidade;
  executar(ctx: ContextoHabilidade): ResultadoHabilidade;
}

export interface ModificadoresPassiva {
  bonusDanoFisicoPercentual: number;
  reducaoDanoFisicoRecebidoPercentual: number;
  bonusSobreescudoMaxPercentual: number;
}

export interface DefinicaoPassiva {
  id: string;
  modificadores(ctx: { hp: number; hpMax: number; nivel: number }): ModificadoresPassiva;
}
