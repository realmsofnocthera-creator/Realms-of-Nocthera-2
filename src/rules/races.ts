import { Attributes } from './attributes';
import { GAME_CONFIG } from './config';

export type DraconianLineage = 'fogo' | 'gelo' | 'relampago' | 'terra' | 'vento';

export interface RacialPassive {
  nome: string;
  descricao?: string;
  // aguardando sistema de efeitos/resistências para 'resistenciaEfeitosFisicos' e 'instintoDeGuerraAbaixo30Hp'
  efeito:
    | 'bonusXpPercentual'
    | 'resistenciaEfeitosFisicos'
    | 'bonusSorte'
    | 'instintoDeGuerraAbaixo30Hp'
    | 'roubarVidaDanoFisico'
    | 'resistenciaElementoLinhagem'
    | string;
  valor: number;
}

export interface RacialSkill {
  nome: string;
  tipo: 'ativa';
  /** Recarga em rodadas (todas as raciais ativas: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS). */
  recargaTurnos: number;
  duracaoTurnos?: number;
  // aguardando sistema de efeitos/resistências
  efeito: string;
}

/** Teto da resistência racial de dano recebido por tipo (decisão 1.4.1). */
export const RESISTENCIA_RACIAL_DANO_MAXIMA_PERCENTUAL = 5;

export interface RaceModifier {
  // aguardando sistema de efeitos/resistências
  tipo: string;
  valor?: number;
  efeito?: string;
}

export interface RaceRelations {
  humanos?: string;
  anoes?: string;
  elfos?: string;
  orcs?: string;
  vampiros?: string;
  draconianos?: string;
}

export interface RaceDefinition {
  id: string;
  nome: string;
  descricao: string;
  origem: string;
  cultura: string;
  aparencia: string;
  bonusAtributos: Attributes;
  linhagens?: readonly DraconianLineage[];
  passivaRacial: RacialPassive;
  habilidadeRacial: RacialSkill;
  resistencias?: readonly RaceModifier[];
  fraquezas?: readonly RaceModifier[];
  fraquezaElementoOposto?: Readonly<Record<DraconianLineage, DraconianLineage>>;
  relacoes: RaceRelations;
  iconeUrl: string | null;
}

export const RACES: readonly RaceDefinition[] = [
  {
    id: 'humano',
    nome: 'Humano',
    descricao:
      'Os humanos são a raça mais numerosa e espalhada pelos mundos de Nocthera. Não possuem uma característica física ou mágica extremamente especializada — sua marca é a adaptabilidade.',
    origem:
      'Surgiram em Midgard, o Antigo Mundo. Durante a Era de Bronze, migrações os levaram principalmente ao Novo Mundo e a O Continente.',
    cultura:
      'Não existe uma única cultura humana: comércio, exploração, religião, guildas e exércitos variam de reino para reino.',
    aparencia:
      'Grande variedade física, sem características sobrenaturais obrigatórias.',
    bonusAtributos: {
      vigor: 1,
      sorte: 1,
      forca: 1,
      vitalidade: 1,
      arcano: 0,
      inteligencia: 0,
      agilidade: 1,
    },
    passivaRacial: {
      nome: 'Adaptabilidade',
      descricao: '+5% de XP de todas as fontes (arredondado para baixo).',
      efeito: 'bonusXpPercentual',
      valor: 5,
    },
    habilidadeRacial: {
      nome: 'Instinto de Sobrevivência',
      tipo: 'ativa',
      recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS,
      efeito: '+2 Força, +2 Vitalidade, +1 Agilidade por 2 turnos',
    },
    resistencias: [],
    fraquezas: [],
    relacoes: {
      anoes: 'Alianças comerciais e cooperação na forja e mineração, variando conforme cada reino.',
      elfos: 'Diplomacia cautelosa e respeito antigo, apesar da diferença de longevidade.',
      orcs: 'Conflitos frequentes por fronteiras e recursos, com tréguas ocasionais.',
      vampiros: 'Desconfiança profunda e vigilância constante contra incursões noturnas.',
      draconianos: 'Relações raras e formais, pautadas pelo respeito à força e à honra marcial.',
    },
    iconeUrl:
      'https://i.supaimg.com/833eafd4-e7d2-4d38-abe3-4e18a55991dd/be7a60ea-e6f7-4ec8-923a-a088055fc30e.png',
  },
  {
    id: 'anao',
    nome: 'Anão',
    descricao:
      'Os anões são uma das raças mais resistentes de Nocthera, famosos por sua força física, disciplina e domínio da metalurgia, vivendo em grandes reinos dentro de montanhas.',
    origem:
      'Nasceram em Nidavellir, mundo de montanhas onde transformaram cavernas em reinos subterrâneos com forjas, minas e fortalezas.',
    cultura:
      'Construída sobre tradição, trabalho e honra; profissões como ferreiro e minerador têm grande importância social, e linhagens são registradas com cuidado.',
    aparencia:
      'Corpos compactos e robustos, baixa estatura, grande força física, barbas e cabelos densos; a barba carrega importância cultural.',
    bonusAtributos: {
      vigor: 2,
      sorte: 0,
      forca: 1,
      vitalidade: 2,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    },
    // aguardando sistema de efeitos/resistências
    passivaRacial: {
      nome: 'Resistência Ancestral',
      descricao: '-10% de dano físico recebido e -10% de chance de sofrer status físicos (Sangramento, Veneno).',
      efeito: 'resistenciaEfeitosFisicos',
      valor: 10,
    },
    // aguardando sistema de efeitos/resistências
    habilidadeRacial: {
      nome: 'Fúria da Forja',
      tipo: 'ativa',
      recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS,
      duracaoTurnos: 3,
      efeito: '+3 Força, +2 Vitalidade, -20% dano físico recebido, -2 Agilidade',
    },
    // aguardando sistema de efeitos/resistências
    // Roadmap 1.4.1: resistência racial de dano recebido, no máximo 5% por raça (a Resistência Ancestral soma +10% de dano físico no motor)
    resistencias: [{ tipo: 'danoFisico', valor: 5 }],
    // aguardando sistema de efeitos/resistências
    fraquezas: [{ tipo: 'resistenciaReducaoAgilidade', valor: -10 }],
    relacoes: {
      humanos: 'Relação amigável, com longa história de comércio de armas e ferramentas.',
      elfos: 'Relação historicamente complicada, mas com alianças antigas.',
      orcs: 'Relação frequentemente hostil por disputas territoriais.',
      vampiros: 'Relação extremamente desconfiada.',
      draconianos: 'Relação de respeito mútuo.',
    },
    iconeUrl: null,
  },
  {
    id: 'elfo',
    nome: 'Elfo',
    descricao:
      'Os elfos são uma das raças mais antigas de Nocthera, conhecidos por longevidade, afinidade com a magia e conexão profunda com a natureza.',
    origem:
      'Originários de Alfheim, o mundo da luz, onde nunca existe uma noite verdadeira, entre florestas e rios luminosos.',
    cultura:
      'Valoriza conhecimento, magia, natureza, arte e espiritualidade; a longevidade élfica molda uma noção de tempo muito diferente da humana.',
    aparencia:
      'Esbelta e elegante, orelhas pontudas, traços faciais delicados, movimentos rápidos e precisos.',
    bonusAtributos: {
      vigor: 0,
      sorte: 1,
      forca: 0,
      vitalidade: 0,
      arcano: 1,
      inteligencia: 2,
      agilidade: 1,
    },
    passivaRacial: {
      nome: 'Herança Arcana',
      descricao: '+1 de Sorte.',
      efeito: 'bonusSorte',
      valor: 1,
    },
    // aguardando sistema de efeitos/resistências
    habilidadeRacial: {
      nome: 'Graça de Alfheim',
      tipo: 'ativa',
      recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS,
      duracaoTurnos: 3,
      efeito:
        '+3 Inteligência, +2 Agilidade, +2 Arcano; próximo ataque/habilidade mágica no efeito recebe +15% de dano mágico',
    },
    // aguardando sistema de efeitos/resistências
    resistencias: [{ tipo: 'danoMagico', valor: 5 }],
    // aguardando sistema de efeitos/resistências
    fraquezas: [{ tipo: 'resistenciaDanoFisico', valor: -10 }],
    relacoes: {
      humanos:
        'Relação geralmente neutra; os elfos veem a vida humana como breve demais para certas compreensões.',
      anoes: 'Rivalidade histórica sobre natureza e mineração.',
      orcs: 'Relação frequentemente hostil por conflitos territoriais e culturais.',
      vampiros: 'Grande desconfiança; veem a transformação vampírica como corrupção da vida.',
      draconianos: 'Relação de respeito por sua ligação com forças antigas.',
    },
    iconeUrl: null,
  },
  {
    id: 'orc',
    nome: 'Orc',
    descricao:
      'Os orcs são uma raça conhecida por sua força, resistência e espírito de sobrevivência. Suas sociedades possuem tradições próprias, códigos de honra e estruturas sociais divididas em clãs.',
    origem:
      'Os primeiros grandes clãs orcs se estabeleceram em regiões selvagens de diversos mundos de Yggdrasil e no Continente, dividindo-se em clãs com culturas adaptadas ao ambiente onde viviam.',
    cultura:
      'Baseada em força, honra, lealdade ao clã, sobrevivência, coragem e conquista; além de guerreiros e líderes políticos, há comerciantes, caçadores, ferreiros, xamãs, agricultores e estudiosos.',
    aparencia:
      'Constituição física naturalmente forte e musculosa, presas inferiores proeminentes, pele em diferentes tons de verde, cinza ou marrom, cabelos geralmente escuros e grande resistência física.',
    bonusAtributos: {
      vigor: 2,
      sorte: 0,
      forca: 2,
      vitalidade: 1,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    },
    // aguardando sistema de efeitos/resistências (abaixo de 30% de HP: +10% dano físico e +10% Defesa Física)
    passivaRacial: {
      nome: 'Instinto de Guerra',
      descricao: 'Abaixo de 30% de HP, +10% de dano físico e +10% de Defesa Física.',
      efeito: 'instintoDeGuerraAbaixo30Hp',
      valor: 10,
    },
    // aguardando sistema de efeitos/resistências
    habilidadeRacial: {
      nome: 'Fúria Orc',
      tipo: 'ativa',
      recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS,
      duracaoTurnos: 3,
      efeito: '+4 Força, +2 Vigor, +10% de dano físico, -2 Agilidade',
    },
    // aguardando sistema de efeitos/resistências
    resistencias: [{ tipo: 'danoFisico', valor: 5 }],
    // aguardando sistema de efeitos/resistências
    fraquezas: [{ tipo: 'resistenciaControleMagico', valor: -10 }],
    relacoes: {
      humanos:
        'Relação variável; alguns reinos humanos possuem tratados com clãs orcs, enquanto outros travaram guerras durante gerações.',
      anoes:
        'Relação frequentemente hostil por disputas por montanhas, minas e territórios subterrâneos.',
      elfos:
        'Relação geralmente tensa; os conflitos territoriais entre clãs orcs e comunidades élficas são antigos.',
      vampiros:
        'Relação hostil; muitos clãs consideram os vampiros criaturas que abandonaram sua própria natureza para obter poder.',
      draconianos:
        'Relação de respeito pela força e ancestralidade dos draconianos, embora não sejam aliados.',
    },
    iconeUrl: null,
  },
  {
    id: 'vampiro',
    nome: 'Vampiro',
    descricao:
      'Os vampiros são uma das raças mais antigas e temidas de Nocthera, com inteligência, cultura e organização próprias, ligados à Zona do Caos.',
    origem:
      'Surgiram entre as criaturas ancestrais do Caos; os mais antigos, os Vampiros Superiores, formaram linhagens que existem até a Era de Bronze.',
    cultura:
      'Sociedade extremamente hierárquica, onde idade e linhagem definem prestígio; algumas famílias vivem escondidas entre humanos, outras em domínios próprios.',
    aparencia:
      'Pele pálida, olhos de tonalidades incomuns, presas, temperatura corporal reduzida, sentidos aguçados e grande velocidade.',
    bonusAtributos: {
      vigor: 1,
      sorte: 1,
      forca: 1,
      vitalidade: 0,
      arcano: 1,
      inteligencia: 0,
      agilidade: 1,
    },
    passivaRacial: {
      nome: 'Sede de Sangue',
      descricao: 'Recupera 5% do dano físico causado como HP, sem passar do máximo.',
      efeito: 'roubarVidaDanoFisico',
      valor: 5,
    },
    // aguardando sistema de efeitos/resistências
    habilidadeRacial: {
      nome: 'Drenar Sangue',
      tipo: 'ativa',
      recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS,
      efeito:
        'dano mágico por Inteligência; cura 50% do dano causado, ou 75% se o alvo estiver abaixo de 30% HP',
    },
    resistencias: [
      { tipo: 'danoTrevas', valor: 5 },
      // aguardando sistema de efeitos/resistências
      { tipo: 'drenagemVida', valor: 10 },
    ],
    fraquezas: [
      // aguardando sistema de efeitos/resistências
      { tipo: 'luzSolar', efeito: 'dano contínuo e bloqueia a passiva enquanto exposto' },
      { tipo: 'resistenciaDanoFogo', valor: -10 },
    ],
    relacoes: {
      humanos:
        'Hostilidade e medo mútuos; humanos são fonte de alimento e também caçadores de vampiros.',
      elfos: 'Hostilidade; muitos elfos veem o vampirismo como corrupção da vida.',
      anoes: 'Desconfiança; anões usam armas preparadas contra vampiros.',
      orcs: 'Relação variável, entre respeito e desprezo pela dependência de outros.',
      draconianos: 'Respeito e cautela mútuos.',
    },
    iconeUrl: null,
  },
  {
    id: 'draconiano',
    nome: 'Draconiano',
    descricao:
      'Os draconianos são uma das raças mais antigas de Nocthera, descendentes de antigos seres dracônicos, carregando fragmentos do poder dos grandes dragões.',
    origem:
      'Remonta aos antigos dragões dos primeiros períodos de Yggdrasil; hoje vivem principalmente no Continente e em regiões remotas de Nidavellir.',
    cultura:
      'Valoriza honra, ancestralidade, força e disciplina; a linhagem e os feitos dos ancestrais moldam a reputação por gerações.',
    aparencia:
      'Traços humanoides combinados com escamas, olhos répteis, garras, dentes afiados e cauda; cor e padrão das escamas variam pela linhagem elemental.',
    bonusAtributos: {
      vigor: 1,
      sorte: 0,
      forca: 2,
      vitalidade: 1,
      arcano: 1,
      inteligencia: 0,
      agilidade: 0,
    },
    linhagens: ['fogo', 'gelo', 'relampago', 'terra', 'vento'],
    passivaRacial: {
      nome: 'Sangue Dracônico',
      descricao:
        '25% de resistência ao elemento da linhagem escolhida. Fraqueza: +10% de dano do elemento oposto.',
      efeito: 'resistenciaElementoLinhagem',
      valor: 25,
    },
    // aguardando sistema de habilidades ativas e efeitos de status
    habilidadeRacial: {
      nome: 'Sopro Dracônico',
      tipo: 'ativa',
      recargaTurnos: GAME_CONFIG.RECARGA_HABILIDADE_RACIAL_RODADAS,
      efeito:
        'dano elemental por Inteligência; efeito extra varia por linhagem (fogo: queimadura; gelo: reduz Agilidade do alvo; relâmpago: atinge um segundo alvo; terra: reduz Defesa Física do alvo; vento: aumenta a Agilidade do draconiano)',
    },
    fraquezaElementoOposto: {
      fogo: 'gelo',
      gelo: 'fogo',
      relampago: 'terra',
      terra: 'vento',
      vento: 'relampago',
    },
    relacoes: {
      humanos: 'Relação neutra, entre admiração e receio.',
      anoes: 'Respeito, com admiração por armas feitas de materiais dracônicos.',
      elfos: 'Respeito mútuo por sua ligação com forças antigas de Yggdrasil.',
      orcs: 'Respeito pela força física, considerados guerreiros dignos.',
      vampiros: 'Desconfiança mútua.',
    },
    iconeUrl: null,
  },
] as const;

export const RACES_MAP: Readonly<Record<string, RaceDefinition>> = Object.fromEntries(
  RACES.map((r) => [r.id, r])
);

/**
 * Busca uma raça cadastrada pelo seu id (ex: "humano" ou "Humano").
 */
export function getRaceById(racaId: string): RaceDefinition | undefined {
  if (!racaId || typeof racaId !== 'string') {
    return undefined;
  }
  const normalized = racaId.trim().toLowerCase();
  return RACES_MAP[normalized];
}

/** Sorte extra dada pela passiva racial (Herança Arcana do Elfo: +1). Somada aos atributos na criação. */
export function bonusSortePassivaRacial(raca: Pick<RaceDefinition, 'passivaRacial'>): number {
  return raca.passivaRacial.efeito === 'bonusSorte' ? raca.passivaRacial.valor : 0;
}
