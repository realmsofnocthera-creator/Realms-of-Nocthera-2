import type { AplicacaoEfeitoDefensivo } from '@/game/combate/efeitosDefensivos';
import type { AplicacaoCura } from '@/game/combate/efeitosCura';
import type { AplicacaoBuff } from '@/game/combate/efeitosBuffs';
import type { AplicacaoDebuff } from '@/game/combate/efeitosDebuffs';
import type { EfeitoStatus } from '@/rules/statusEffects';
import type { CondicaoAlvo } from '@/game/combate/bonusStatusAlvo';
import type { Elemento } from '@/rules/elements';

export type EspacoHabilidade = 'basico' | 'especial' | 'ultimate';
export type TipoDanoHabilidade = 'fisico' | 'magico';

export interface AlvoHabilidade {
  hp: number;
  hpMax: number;
  sobreescudo: number;
  mitigacaoFisica: number;
  mitigacaoMagica: number;
  /** Condições da lista de bônus por status que estão valendo no alvo (Sangramento, Congelado, Dormindo...). */
  condicoes?: readonly CondicaoAlvo[];
  /** Marcas que o alvo tem. */
  marcas?: number;
  /** Elemento do alvo (o elemento com que ele ataca), base do bônus de Sagrado e Sombrio. */
  elemento?: Elemento;
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

  // ---- Atributos e buffs (catálogo 1.2, categoria da 1.2.4) ----
  /** Buffs temporários em quem usa a habilidade (Aumento de Força/Sorte/Agilidade/Geral, Sincronismo, Delírio Controlado). */
  buffs?: AplicacaoBuff[];
  /** Buffs que só entram com uma chance (sorteio determinístico por golpe; sem sorteio de crítico na luta, não entram). */
  buffsComChance?: { buff: AplicacaoBuff; chancePercentual: number }[];
  /** Foco: o próximo ataque de quem usa a habilidade ignora X% da defesa do inimigo. */
  foco?: { ignorarDefesaPercentual: number };
  /** Aceleração: +1 ação extra neste round (uma ação a mais, além das do turno). */
  acaoExtra?: boolean;

  // ---- Debuffs e controle (catálogo 1.2, categoria da 1.2.4) ----
  /** Debuffs que a habilidade coloca no inimigo atingido (Enfraquecimento, Cicatrização, Ponto Fraco, Pressão, Exaustão, Distração). */
  efeitosNoAlvo?: AplicacaoDebuff[];
  /** Sangramento Forçado (e outros status de dano contínuo): aplicados no alvo sem sorteio de chance. */
  statusForcadosNoAlvo?: EfeitoStatus[];
  // ---- Bônus por status no alvo e Marca (catálogo 1.2, 1.9.1) ----
  /** Bônus por status no alvo: soma a % de cada condição listada que estiver ativa no alvo (valores da lista do Yuri). */
  bonusPorStatusAlvo?: CondicaoAlvo[];
  /** Elemento da habilidade (vale para o cálculo elemental do golpe e para o bônus por elemento). */
  elemento?: Elemento;
  /** Bônus por elemento ativo: o elemento da habilidade concede o seu pacote de bônus por 2 rodadas. */
  bonusElemental?: boolean;
  /** +% de dano contra alvo do elemento indicado (Sagrado contra Sombrio e Sombrio contra Sagrado). */
  bonusContraElementoAlvo?: { elemento: Elemento; percentual: number };
  /** Status aplicado no alvo com sorteio de chance (chance do status + chanceExtraPercentual, em pontos). */
  statusComChanceNoAlvo?: { status: EfeitoStatus; chanceExtraPercentual?: number }[];
  /** Marca: cada golpe desta habilidade coloca 1 marca no alvo (até 5; dura até o fim da luta). */
  marcar?: boolean;
  /** Marca: o dano ganha +3% por marca que o alvo já tem, no máximo +15%. */
  bonusPorMarca?: boolean;
  /** Inversão de Sorte: se a Agilidade do alvo for menor ou igual à de quem usa, o alvo sofre X% do HP máximo dele (ignora defesa). */
  inversaoDeSorte?: { percentualHpMaxAlvo: number };
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
  /** −% de dano mágico recebido (soma com as demais reduções, teto de 80%). */
  reducaoDanoMagicoRecebidoPercentual?: number;
  /** +% de dano mágico causado, sempre. */
  bonusDanoMagicoPercentual?: number;
  /** +% de dano mágico causado a mais contra alvo com status negativo. */
  bonusDanoMagicoContraStatusPercentual?: number;
  /** +% de eficácia de cura (soma com Fé Inabalável e Cicatrização). */
  bonusEficaciaCuraPercentual?: number;
}

export interface DefinicaoPassiva {
  id: string;
  modificadores(ctx: { hp: number; hpMax: number; nivel: number }): ModificadoresPassiva;
}
