import { Attributes } from './attributes';
import { Elemento } from './elements';

export interface ClassAbilityMilestone {
  id: string;
  nivel: number;
  tipo: 'ataqueBasico' | 'habilidadeEspecial' | 'passivaI' | 'passivaII' | 'ultimate';
  nome: string;
  descricao: string;
  elemento?: Elemento;
}

export interface ClassProgression {
  ataqueBasico: ClassAbilityMilestone;
  habilidadeEspecial: ClassAbilityMilestone;
  passivaI: ClassAbilityMilestone;
  passivaII: ClassAbilityMilestone;
  ultimate: ClassAbilityMilestone;
}

export interface ClassDefinition {
  id: string;
  nome: string;
  descricao: string;
  lore: string;
  bonusAtributos: Attributes;
  progressao: ClassProgression;
}

export const CLASSES: readonly ClassDefinition[] = [
  {
    id: 'barbaro',
    nome: 'Bárbaro',
    descricao:
      'O Bárbaro transforma força física, resistência e instinto de sobrevivência em poder de combate; seu estilo é direto e agressivo, ficando mais perigoso quanto mais próximo da derrota.',
    lore:
      'Surgiu nas regiões selvagens de Yggdrasil, onde monstros e forças do Caos exigiam força para sobreviver; hoje encontrado entre diferentes povos, unidos pela filosofia de que quem permanece de pé é quem sobreviveu.',
    bonusAtributos: {
      vigor: 1,
      mente: 0,
      forca: 1,
      vitalidade: 1,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    },
    progressao: {
      ataqueBasico: {
        id: 'barbaro_golpe_barbaro',
        nivel: 1,
        tipo: 'ataqueBasico',
        nome: 'Golpe Bárbaro',
        descricao: 'Ataque físico direto baseado na Força do Bárbaro.',
      },
      habilidadeEspecial: {
        id: 'barbaro_furia_selvagem',
        nivel: 5,
        tipo: 'habilidadeEspecial',
        nome: 'Fúria Selvagem',
        descricao:
          'Acionada automaticamente no 3º ataque básico consecutivo: concede bônus temporário de Força e dano adicional naquele golpe, reiniciando o contador.',
      },
      passivaI: {
        id: 'barbaro_instinto_de_sobrevivencia',
        nivel: 12,
        tipo: 'passivaI',
        nome: 'Instinto de Sobrevivência',
        descricao:
          'Bônus dinâmico de dano físico e Força quando o HP atual está abaixo de 50% ou abaixo de 25% (sem acumular).',
      },
      passivaII: {
        id: 'barbaro_resistencia_barbara',
        nivel: 20,
        tipo: 'passivaII',
        nome: 'Resistência Bárbara',
        descricao: 'Aumenta permanentemente o HP máximo em +10% e o Sobreescudo máximo em +5%.',
      },
      ultimate: {
        id: 'barbaro_ira_do_barbaro',
        nivel: 30,
        tipo: 'ultimate',
        nome: 'Ira do Bárbaro',
        descricao:
          'Acionada automaticamente no 7º ataque básico: concede bônus fixo de Força, Vigor, Vitalidade e % de dano no golpe, com bônus extra se o HP estiver abaixo de 30%.',
      },
    },
  },
  {
    id: 'cavaleiro',
    nome: 'Cavaleiro',
    descricao:
      'O Cavaleiro é um combatente especializado em defesa, proteção e resistência, transformando sua capacidade de suportar dano em vantagem estratégica.',
    lore:
      'Surgiu na Era de Prata, quando ordens de guerreiros juraram proteger reinos, cidades e viajantes; apesar de servirem a diferentes causas, todos seguem o princípio de proteger quem está atrás deles.',
    bonusAtributos: {
      vigor: 1,
      mente: 0,
      forca: 0,
      vitalidade: 2,
      arcano: 0,
      inteligencia: 0,
      agilidade: 0,
    },
    progressao: {
      ataqueBasico: {
        id: 'cavaleiro_golpe_do_guardiao',
        nivel: 1,
        tipo: 'ataqueBasico',
        nome: 'Golpe do Guardião',
        descricao: 'Ataque físico firme do Cavaleiro.',
      },
      habilidadeEspecial: {
        id: 'cavaleiro_postura_do_guardiao',
        nivel: 5,
        tipo: 'habilidadeEspecial',
        nome: 'Postura do Guardião',
        descricao:
          'Acionada após realizar 3 ataques básicos: no próximo turno defensivo concede bônus temporário de Vitalidade e Sobreescudo, reduzindo o dano recebido e direcionando parte adicional do dano ao Sobreescudo antes do HP.',
      },
      passivaI: {
        id: 'cavaleiro_muralha_de_ferro',
        nivel: 12,
        tipo: 'passivaI',
        nome: 'Muralha de Ferro',
        descricao:
          'Aumenta permanentemente a Defesa Física em +10% e o Sobreescudo máximo em +10%.',
      },
      passivaII: {
        id: 'cavaleiro_ultimo_bastiao',
        nivel: 20,
        tipo: 'passivaII',
        nome: 'Último Bastião',
        descricao:
          'Quando o HP do Cavaleiro está abaixo de 30% ao receber dano, concede +15% Defesa Física, +15% Sobreescudo e reduz o dano físico recebido em 10%.',
      },
      // aguardando sistema de grupo/aliados (combate atual é 1x1)
      ultimate: {
        id: 'cavaleiro_juramento_do_guardiao',
        nivel: 30,
        tipo: 'ultimate',
        nome: 'Juramento do Guardião',
        descricao:
          'Acionada a cada 7 ataques básicos para o próximo turno defensivo: concede +5 Vitalidade, +3 Vigor, +20% Defesa Física, +20% Sobreescudo, -25% dano recebido e absorve parte do dano direcionado a aliados (aguardando sistema de grupo/aliados — combate atual é 1x1).',
      },
    },
  },
  {
    id: 'feiticeiro',
    nome: 'Feiticeiro',
    descricao:
      'O Feiticeiro possui conexão inata com as forças arcanas, manifestando seu poder através de dano mágico e explosões de energia, sem precisar de anos de estudo formal.',
    lore:
      'Surgiu na Era de Prata, quando mortais descobriram forças remanescentes dos antigos deuses; até hoje debate-se se o poder dos Feiticeiros vem dos deuses ou do próprio Caos.',
    bonusAtributos: {
      vigor: 0,
      mente: 1,
      forca: 0,
      vitalidade: 0,
      arcano: 1,
      inteligencia: 1,
      agilidade: 0,
    },
    progressao: {
      ataqueBasico: {
        id: 'feiticeiro_faisca_arcana',
        nivel: 1,
        tipo: 'ataqueBasico',
        nome: 'Faísca Arcana',
        descricao: 'Ataque mágico básico canalizado pela Inteligência do Feiticeiro.',
      },
      habilidadeEspecial: {
        id: 'feiticeiro_explosao_arcana',
        nivel: 5,
        tipo: 'habilidadeEspecial',
        nome: 'Explosão Arcana',
        descricao:
          'A cada 3 ataques básicos (contador A), o ataque causa 200% do dano mágico normal e ignora 10% da Defesa Mágica do alvo.',
      },
      passivaI: {
        id: 'feiticeiro_fluxo_arcano',
        nivel: 12,
        tipo: 'passivaI',
        nome: 'Fluxo Arcano',
        descricao:
          'Aumenta permanentemente a Mana máxima em +10% e o dano mágico base em +10%.',
      },
      passivaII: {
        id: 'feiticeiro_acumulo_arcano',
        nivel: 20,
        tipo: 'passivaII',
        nome: 'Acúmulo Arcano',
        descricao:
          'A cada 3 ataques básicos (contador B independente), acumula 1 carga de Acúmulo Arcano (até 3 cargas). Cada carga concede +10% de dano mágico ao próximo ataque, consumindo todas as cargas.',
      },
      ultimate: {
        id: 'feiticeiro_cataclismo_arcano',
        nivel: 30,
        tipo: 'ultimate',
        nome: 'Cataclismo Arcano',
        descricao:
          'A cada 7 ataques básicos (contador C independente), causa 400% do dano mágico normal, ignora 20% da Defesa Mágica e causa +25% de dano quando atingir o Sobreescudo do alvo.',
      },
    },
  },
  {
    id: 'bandido',
    nome: 'Bandido',
    descricao:
      'O Bandido é especializado em velocidade, dano físico e ataques consecutivos, explorando brechas dos inimigos ao invés de força bruta ou resistência.',
    lore:
      'Surgiu nas estradas da Era de Bronze, entre ladrões, mercenários e sobreviventes fora das leis dos reinos; muitos abandonaram esse caminho e viraram caçadores, exploradores ou aventureiros, mas a reputação de serem vistos primeiro pelo Bandido permaneceu.',
    bonusAtributos: {
      vigor: 0,
      mente: 0,
      forca: 1,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 2,
    },
    progressao: {
      ataqueBasico: {
        id: 'bandido_golpe_rapido',
        nivel: 1,
        tipo: 'ataqueBasico',
        nome: 'Golpe Rápido',
        descricao: 'Ataque físico veloz baseado na Força do Bandido.',
      },
      habilidadeEspecial: {
        id: 'bandido_rajada_de_golpes',
        nivel: 5,
        tipo: 'habilidadeEspecial',
        nome: 'Rajada de Golpes',
        descricao:
          'A cada 3 ataques básicos (contador A), desfere 2 ataques consecutivos de 80% do dano físico normal cada (160% total), consumindo qualquer acúmulo pendente de Sede de Sangue (Bandido).',
      },
      passivaI: {
        id: 'bandido_passos_rapidos',
        nivel: 12,
        tipo: 'passivaI',
        nome: 'Passos Rápidos',
        descricao:
          'Aumenta permanentemente a Agilidade em +2 e o dano físico base em +5%.',
      },
      // Nota: Nome interno "Sede de Sangue (Bandido)" para diferenciar nos logs da passiva racial
      // "Sede de Sangue" do Vampiro (que cura 5% do dano físico causado, enquanto a do Bandido acumula cargas de +5% de dano físico).
      passivaII: {
        id: 'bandido_sede_de_sangue_bandido',
        nivel: 20,
        tipo: 'passivaII',
        nome: 'Sede de Sangue (Bandido)',
        descricao:
          'A cada 3 ataques básicos (contador B independente), acumula 1 carga de +5% de dano físico (até 3 cargas). As cargas só são aplicadas e consumidas quando Rajada de Golpes ou Dança das Lâminas disparam.',
      },
      ultimate: {
        id: 'bandido_danca_das_laminas',
        nivel: 30,
        tipo: 'ultimate',
        nome: 'Dança das Lâminas',
        descricao:
          'A cada 7 ataques básicos (contador C independente), desfere 5 ataques consecutivos de 75% do dano físico normal cada (375% total), ignorando 5% da Defesa Física do alvo em cada golpe e consumindo qualquer acúmulo pendente de Sede de Sangue (Bandido).',
      },
    },
  },
  {
    id: 'profeta',
    nome: 'Profeta',
    descricao:
      'O Profeta canaliza forças divinas e espirituais de Yggdrasil para restaurar sua energia, fortalecer-se e enfraquecer inimigos, funcionando como uma classe híbrida de suporte, cura e poder sagrado.',
    lore:
      'Surgiu na transição entre a Era de Ouro e a Era de Prata, quando seguidores dos deuses ausentes passaram a receber visões e sinais; nunca houve resposta definitiva se essas mensagens vêm realmente dos deuses ou de algo além deles.',
    bonusAtributos: {
      vigor: 0,
      mente: 1,
      forca: 0,
      vitalidade: 0,
      arcano: 1,
      inteligencia: 1,
      agilidade: 0,
    },
    progressao: {
      ataqueBasico: {
        id: 'profeta_luz_sagrada',
        nivel: 1,
        tipo: 'ataqueBasico',
        nome: 'Luz Sagrada',
        descricao: 'Ataque mágico sagrado baseado na Inteligência do Profeta.',
        elemento: 'sagrado',
      },
      habilidadeEspecial: {
        id: 'profeta_bencao_divina',
        nivel: 5,
        tipo: 'habilidadeEspecial',
        nome: 'Bênção Divina',
        descricao:
          'A cada 3 ataques básicos (contador A), ao invés de atacar, recupera 15% do HP máximo e 10% do MP máximo sem ultrapassar os tetos e remove 1 efeito negativo ativo.',
      },
      passivaI: {
        id: 'profeta_graca_divina',
        nivel: 12,
        tipo: 'passivaI',
        nome: 'Graça Divina',
        descricao:
          'Aumenta permanentemente o HP máximo em +10% e o MP máximo em +10%.',
      },
      passivaII: {
        id: 'profeta_fe_inabalavel',
        nivel: 20,
        tipo: 'passivaII',
        nome: 'Fé Inabalável',
        descricao:
          'A cada 3 ataques básicos (contador B independente), acumula 1 carga de +15% de eficácia de cura (até 2 cargas), aplicada e consumida no próximo efeito de cura/recuperação do Profeta.',
      },
      // aguardando sistema de efeitos/resistências (bônus temporário de dano/Defesa nos turnos seguintes)
      ultimate: {
        id: 'profeta_milagre_divino',
        nivel: 30,
        tipo: 'ultimate',
        nome: 'Milagre Divino',
        descricao:
          'A cada 7 ataques básicos (contador C independente), recupera 30% do HP máximo e 25% do MP máximo (sem ultrapassar tetos), remove todos os efeitos negativos ativos e causa 150% do dano mágico normal no mesmo turno (bônus temporário de dano/Defesa nos turnos seguintes: aguardando sistema de efeitos/resistências).',
        elemento: 'sagrado',
      },
    },
  },
  {
    id: 'samurai',
    nome: 'Samurai',
    descricao:
      'O Samurai combina Força e Agilidade em ataques controlados e devastadores, acumulando golpes para liberar técnicas poderosas no momento certo.',
    lore:
      'Surgiu em clãs isolados de Yggdrasil na Era de Prata, onde disciplina era tão valorizada quanto força; com a queda de muitos reinos, os Samurais se espalharam, mas todos carregam a ideia de que força sem disciplina é apenas destruição.',
    bonusAtributos: {
      vigor: 0,
      mente: 0,
      forca: 1,
      vitalidade: 0,
      arcano: 0,
      inteligencia: 0,
      agilidade: 2,
    },
    progressao: {
      ataqueBasico: {
        id: 'samurai_corte_preciso',
        nivel: 1,
        tipo: 'ataqueBasico',
        nome: 'Corte Preciso',
        descricao: 'Ataque físico controlado baseado na Força do Samurai.',
      },
      habilidadeEspecial: {
        id: 'samurai_iaijutsu',
        nivel: 5,
        tipo: 'habilidadeEspecial',
        nome: 'Iaijutsu',
        descricao:
          'A cada 3 ataques básicos (contador A), causa 220% do dano físico normal, ignora 10% da Defesa Física do alvo e consome qualquer carga pendente de Foco Absoluto.',
      },
      passivaI: {
        id: 'samurai_disciplina_do_guerreiro',
        nivel: 12,
        tipo: 'passivaI',
        nome: 'Disciplina do Guerreiro',
        descricao:
          'Aumenta permanentemente a Agilidade em +2 e o dano físico base em +5%.',
      },
      passivaII: {
        id: 'samurai_foco_absoluto',
        nivel: 20,
        tipo: 'passivaII',
        nome: 'Foco Absoluto',
        descricao:
          'A cada 3 ataques básicos (contador B independente), acumula 1 carga de +5% de dano físico (até 3 cargas). As cargas só se aplicam e se consomem quando Iaijutsu ou Corte do Vazio disparam.',
      },
      ultimate: {
        id: 'samurai_corte_do_vazio',
        nivel: 30,
        tipo: 'ultimate',
        nome: 'Corte do Vazio',
        descricao:
          'A cada 7 ataques básicos (contador C independente), causa 450% do dano físico normal, ignora 25% da Defesa Física, causa +25% de dano quando atingir o Sobreescudo do alvo e, se o inimigo ficar com 20% ou menos do HP máximo após o golpe, aplica automaticamente um golpe adicional de 100% do dano físico normal.',
      },
    },
  },
];

export const CLASSES_MAP: Readonly<Record<string, ClassDefinition>> = Object.fromEntries(
  CLASSES.map((c) => [c.id, c])
);

/**
 * Busca uma classe cadastrada pelo seu id (ex: "barbaro" ou "Bárbaro").
 */
export function getClassById(classeId: string): ClassDefinition | undefined {
  if (!classeId || typeof classeId !== 'string') {
    return undefined;
  }
  const normalized = classeId
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return CLASSES_MAP[normalized];
}
