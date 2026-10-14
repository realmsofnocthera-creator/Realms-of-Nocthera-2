import type { AttributeName } from './attributes';
import type { EmblemaRaridade } from './emblemas';

/**
 * Os 25 emblemas de Realms of Nocthera (catálogo do Yuri, 14/10/2026): 2 Comuns, 3 Raros, 4 Muito raros, 6 Épicos,
 * 5 Lendários e 5 Míticos. Todas as habilidades são passivas. Cada estrela desbloqueia uma habilidade nova (1★ a
 * primeira, 2★ a segunda, 3★ a terceira); os Míticos têm uma quarta estrela (★ vermelha) com a quarta habilidade.
 * Os textos de habilidade são do Yuri; os efeitos no combate entram aos poucos (ver `emblemasEfeitos`).
 */
export interface HabilidadeEmblema {
  nome: string;
  descricao: string;
}

export interface TipoEmblema {
  id: string;
  /** Nome do chefe/entidade do emblema; a tela mostra "Emblema {nome}". */
  nome: string;
  raridade: EmblemaRaridade;
  /** 3 para todos, 4 para os Míticos. */
  estrelasMax: 3 | 4;
  /** Os 3 atributos que o emblema soma (escolhidos pelo tema do emblema); os pontos crescem com a estrela e a raridade. */
  atributos: readonly [AttributeName, AttributeName, AttributeName];
  lore: string;
  /** Uma habilidade por estrela, na ordem em que são desbloqueadas. */
  habilidades: readonly HabilidadeEmblema[];
}

export const TIPOS_EMBLEMA: readonly TipoEmblema[] = [
  // ---- Comum ----
  {
    id: 'dargan', nome: 'Dargan, o Saqueador Pálido', raridade: 'comum', estrelasMax: 3, atributos: ['forca', 'sorte', 'agilidade'],
    lore: 'Um saqueador brutal que aprendeu a explorar as fraquezas dos inimigos feridos. Seu poder favorece combatentes agressivos.',
    habilidades: [
      { nome: 'Instinto de Carniceiro', descricao: 'Causa 8% de dano adicional contra inimigos com menos de 40% de HP.' },
      { nome: 'Lâmina Ensanguentada', descricao: 'Aumenta o ATQ em 6% enquanto houver pelo menos um inimigo com sangramento em combate.' },
      { nome: 'Último Saque', descricao: 'Ao derrotar um inimigo, recupera 4% do HP máximo. Esse efeito pode ocorrer até duas vezes por combate.' },
    ],
  },
  {
    id: 'vesper', nome: 'Vesper, a Portadora da Peste', raridade: 'comum', estrelasMax: 3, atributos: ['inteligencia', 'arcano', 'vigor'],
    lore: 'Uma cultista que contaminava seus inimigos com substâncias proibidas. Suas habilidades favorecem o desgaste gradual dos adversários.',
    habilidades: [
      { nome: 'Seiva Pestilenta', descricao: 'Aumenta em 8% o dano causado por veneno.' },
      { nome: 'Contaminação Persistente', descricao: 'Aumenta em 10% a duração do veneno aplicado pelo personagem.' },
      { nome: 'Febre Devoradora', descricao: 'Inimigos envenenados causam 5% menos dano.' },
    ],
  },
  // ---- Raro ----
  {
    id: 'kael-draven', nome: 'Kael Draven, o Cavaleiro Decaído', raridade: 'raro', estrelasMax: 3, atributos: ['vitalidade', 'vigor', 'forca'],
    lore: 'Um antigo cavaleiro que abandonou seus juramentos. Sua experiência defensiva permanece intacta.',
    habilidades: [
      { nome: 'Juramento Quebrado', descricao: 'Aumenta a DEF em 8%.' },
      { nome: 'Postura do Renegado', descricao: 'Reduz em 6% o dano recebido de ataques físicos.' },
      { nome: 'Retaliação Profana', descricao: 'Após sobreviver a um ataque que retire pelo menos 15% do HP máximo, o próximo ataque causa 12% de dano adicional. Pode ativar uma vez por rodada.' },
    ],
  },
  {
    id: 'elyss', nome: 'Elyss, a Noiva sem Túmulo', raridade: 'raro', estrelasMax: 3, atributos: ['arcano', 'vitalidade', 'inteligencia'],
    lore: 'Um espírito preso entre o luto e a vingança, capaz de enfraquecer aqueles que ousam perturbar seu descanso.',
    habilidades: [
      { nome: 'Presença Espectral', descricao: 'Aumenta em 8% a resistência a efeitos de estado negativos.' },
      { nome: 'Lamento Eterno', descricao: 'Aumenta em 10% a duração dos efeitos de sono e lentidão aplicados pelo personagem.' },
      { nome: 'Véu dos Mortos', descricao: 'Quando o HP fica abaixo de 30%, reduz em 12% o dano recebido durante duas rodadas. Ativa uma vez por combate.' },
    ],
  },
  {
    id: 'grimhall', nome: 'Grimhall, o Devorador de Trilhas', raridade: 'raro', estrelasMax: 3, atributos: ['sorte', 'agilidade', 'vigor'],
    lore: 'Uma besta que jamais abandona uma presa ferida. Sua força aumenta à medida que o inimigo se aproxima da derrota.',
    habilidades: [
      { nome: 'Faro Predatório', descricao: 'Aumenta em 6% a chance de acerto crítico.' },
      { nome: 'Perseguição Implacável', descricao: 'Causa 10% de dano adicional contra inimigos com menos de 50% de HP.' },
      { nome: 'Caçada Sangrenta', descricao: 'Acertos críticos causam 8% de dano adicional contra inimigos afetados por sangramento.' },
    ],
  },
  // ---- Muito raro ----
  {
    id: 'lutero', nome: 'Lutero, o Louco', raridade: 'muitoRaro', estrelasMax: 3, atributos: ['forca', 'agilidade', 'sorte'],
    lore: 'Um assassino imprevisível cuja loucura transforma cada batalha em uma sequência de violência. Suas passivas recompensam o combate agressivo.',
    habilidades: [
      { nome: 'Riso Macabro', descricao: 'Aumenta o ATQ em 8%.' },
      { nome: 'Frenesi Insano', descricao: 'Após realizar um acerto crítico, aumenta o ATQ em 5% por duas rodadas. O efeito acumula até três vezes.' },
      { nome: 'Delírio Carniceiro', descricao: 'Ao atingir um inimigo com menos de 25% de HP, aumenta em 15% a chance de acerto crítico contra ele.' },
    ],
  },
  {
    id: 'morvath', nome: 'Morvath, o Rei das Cinzas', raridade: 'muitoRaro', estrelasMax: 3, atributos: ['inteligencia', 'vigor', 'arcano'],
    lore: 'Um monarca morto que continua comandando as cinzas de seu reino perdido.',
    habilidades: [
      { nome: 'Coroa Sepulcral', descricao: 'Aumenta em 10% o dano sombrio causado.' },
      { nome: 'Legião Silenciosa', descricao: 'Aumenta em 8% o HP máximo.' },
      { nome: 'Trono dos Caídos', descricao: 'Quando um inimigo morre, recupera 3% do HP máximo e aumenta a DEF em 5% por duas rodadas. Pode ativar até duas vezes por combate.' },
    ],
  },
  {
    id: 'grizzham', nome: 'Grizzham, o Trono das Feras', raridade: 'muitoRaro', estrelasMax: 3, atributos: ['vitalidade', 'forca', 'vigor'],
    lore: 'Uma besta colossal que domina seu território pela força. Seu emblema favorece personagens resistentes.',
    habilidades: [
      { nome: 'Couraça Primordial', descricao: 'Aumenta a DEF em 10%.' },
      { nome: 'Fúria Territorial', descricao: 'Aumenta o ATQ em 8% enquanto o HP estiver acima de 70%.' },
      { nome: 'Rugido Dominante', descricao: 'Reduz em 10% o dano recebido de chefes.' },
    ],
  },
  {
    id: 'rhazkida', nome: 'Rhazkida, a Lâmina Exilada', raridade: 'muitoRaro', estrelasMax: 3, atributos: ['agilidade', 'forca', 'sorte'],
    lore: 'Uma predadora de movimentos precisos, especializada em abrir feridas que não cicatrizam.',
    habilidades: [
      { nome: 'Corte Cirúrgico', descricao: 'Aumenta em 10% o dano de sangramento causado.' },
      { nome: 'Reflexos da Caçadora', descricao: 'Aumenta a iniciativa em 8%.' },
      { nome: 'Ferida Irreversível', descricao: 'Ataques contra inimigos sangrando ignoram 8% da DEF deles.' },
    ],
  },
  // ---- Épico ----
  {
    id: 'vharok', nome: 'Vharok, o Devorador de Almas', raridade: 'epico', estrelasMax: 3, atributos: ['inteligencia', 'arcano', 'vigor'],
    lore: 'Uma entidade que consome a essência dos derrotados para ampliar sua própria existência.',
    habilidades: [
      { nome: 'Fome Espiritual', descricao: 'Aumenta em 10% o dano sombrio causado.' },
      { nome: 'Drenagem da Essência', descricao: 'Recupera HP equivalente a 3% do dano causado por ataques sombrios, limitado a 5% do HP máximo por rodada.' },
      { nome: 'Banquete das Almas', descricao: 'Ao derrotar um inimigo, aumenta o ATQ em 8% por duas rodadas. Acumula até duas vezes.' },
    ],
  },
  {
    id: 'vargheist', nome: 'Vargheist, o Terror de Duas Faces', raridade: 'epico', estrelasMax: 3, atributos: ['forca', 'agilidade', 'sorte'],
    lore: 'Um predador alado que alterna entre fúria descontrolada e precisão mortal.',
    habilidades: [
      { nome: 'Dupla Natureza', descricao: 'Aumenta o ATQ em 7% e a iniciativa em 5%.' },
      { nome: 'Investida Voraz', descricao: 'Aumenta em 10% o dano causado por ataques consecutivos.' },
      { nome: 'Duas Faces da Morte', descricao: 'Após um acerto crítico, o próximo ataque causa 12% de dano adicional. Pode ativar uma vez por rodada.' },
    ],
  },
  {
    id: 'floragoth', nome: 'Floragoth, o Jardim Faminto', raridade: 'epico', estrelasMax: 3, atributos: ['inteligencia', 'arcano', 'vitalidade'],
    lore: 'Uma entidade vegetal que transforma o campo de batalha em um jardim de espinhos e raízes devoradoras.',
    habilidades: [
      { nome: 'Raízes Sufocantes', descricao: 'Aumenta em 10% o dano causado por efeitos de veneno.' },
      { nome: 'Espinhos Predatórios', descricao: 'Inimigos que atacam o personagem têm 10% de chance de receber sangramento por duas rodadas. Não ativa mais de uma vez por rodada.' },
      { nome: 'Jardim da Agonia', descricao: 'Inimigos afetados por veneno ou sangramento recebem 8% de dano adicional do personagem.' },
    ],
  },
  {
    id: 'nharzuel', nome: 'Nharzuel, o Dragão Sepulcral', raridade: 'epico', estrelasMax: 3, atributos: ['inteligencia', 'vitalidade', 'arcano'],
    lore: 'Um dragão morto cuja maldição mantém seus ossos em movimento.',
    habilidades: [
      { nome: 'Sopro Funéreo', descricao: 'Aumenta em 10% o dano sombrio.' },
      { nome: 'Escamas Sepulcrais', descricao: 'Reduz em 8% o dano recebido de ataques mágicos.' },
      { nome: 'Imortalidade Profanada', descricao: 'A primeira vez que o HP fica abaixo de 20% em um combate, recebe um escudo equivalente a 8% do HP máximo por duas rodadas.' },
    ],
  },
  {
    id: 'seraphel', nome: 'Seraphel, o Santo Corrompido', raridade: 'epico', estrelasMax: 3, atributos: ['inteligencia', 'arcano', 'sorte'],
    lore: 'Um antigo guardião sagrado que converteu sua fé em um instrumento de punição.',
    habilidades: [
      { nome: 'Luz Condenatória', descricao: 'Aumenta em 10% o dano sagrado.' },
      { nome: 'Veredito Celestial', descricao: 'Causa 10% de dano adicional contra inimigos que possuam escudos.' },
      { nome: 'Punição dos Ímpios', descricao: 'Causa 8% de dano adicional contra inimigos com bônus de atributos ativos.' },
    ],
  },
  {
    id: 'akumetsu', nome: 'Akumetsu, o Último Shogun', raridade: 'epico', estrelasMax: 3, atributos: ['forca', 'sorte', 'vitalidade'],
    lore: 'Um senhor da guerra que continuou lutando mesmo depois da queda de seu império.',
    habilidades: [
      { nome: 'Disciplina da Lâmina', descricao: 'Aumenta o ATQ em 8%.' },
      { nome: 'Corte Perfeito', descricao: 'Aumenta em 12% o dano de acertos críticos.' },
      { nome: 'Último Duelo', descricao: 'Causa 12% de dano adicional contra chefes quando o personagem possui menos de 50% de HP.' },
    ],
  },
  // ---- Lendário ----
  {
    id: 'azhrak', nome: 'Azhrak, o Imperador Escarlate', raridade: 'lendario', estrelasMax: 3, atributos: ['inteligencia', 'forca', 'vigor'],
    lore: 'Um dragão soberano que reduziu reinos inteiros a campos de cinzas.',
    habilidades: [
      { nome: 'Sangue Vulcânico', descricao: 'Aumenta em 12% o dano de fogo.' },
      { nome: 'Coração de Magma', descricao: 'Reduz em 15% o dano de fogo recebido.' },
      { nome: 'Cataclismo Escarlate', descricao: 'Causa 15% de dano adicional contra inimigos queimando.' },
    ],
  },
  {
    id: 'nyxara', nome: 'Nyxara, a Rainha do Véu', raridade: 'lendario', estrelasMax: 3, atributos: ['arcano', 'vitalidade', 'agilidade'],
    lore: 'Uma soberana que ocultou sua existência em um véu entre a vida e a morte.',
    habilidades: [
      { nome: 'Véu Imortal', descricao: 'Aumenta em 10% a resistência a efeitos negativos.' },
      { nome: 'Presença Intangível', descricao: 'Reduz em 10% o dano mágico recebido.' },
      { nome: 'Fronteira Espectral', descricao: 'Ao resistir a um efeito de estado negativo, aumenta a DEF em 8% por duas rodadas. Pode ativar uma vez por rodada.' },
    ],
  },
  {
    id: 'odrak', nome: 'Odrak, o Colosso Imortal', raridade: 'lendario', estrelasMax: 3, atributos: ['vigor', 'vitalidade', 'forca'],
    lore: 'Uma arma viva concebida para resistir a guerras intermináveis.',
    habilidades: [
      { nome: 'Estrutura Inquebrável', descricao: 'Aumenta o HP máximo em 12%.' },
      { nome: 'Núcleo de Obsidiana', descricao: 'Reduz em 10% todo o dano recebido.' },
      { nome: 'Persistência Colossal', descricao: 'Quando o HP fica abaixo de 30%, reduz em mais 10% o dano recebido durante duas rodadas. Ativa uma vez por combate.' },
    ],
  },
  {
    id: 'vaelgrim', nome: 'Vaelgrim, o Rei do Inverno Eterno', raridade: 'lendario', estrelasMax: 3, atributos: ['inteligencia', 'arcano', 'vitalidade'],
    lore: 'Uma besta ancestral cuja presença congela tudo ao seu redor.',
    habilidades: [
      { nome: 'Sangue Glacial', descricao: 'Aumenta em 12% o dano de gelo.' },
      { nome: 'Frio Paralisante', descricao: 'Aumenta em 10% a chance de aplicar congelamento.' },
      { nome: 'Inverno Sem Fim', descricao: 'Inimigos congelados recebem 12% de dano adicional de gelo.' },
    ],
  },
  {
    id: 'malachar', nome: 'Malachar, o Carrasco dos Mil Juramentos', raridade: 'lendario', estrelasMax: 3, atributos: ['forca', 'inteligencia', 'sorte'],
    lore: 'Um executor que transforma promessas quebradas em maldições mortais.',
    habilidades: [
      { nome: 'Marca do Condenado', descricao: 'Aumenta em 10% o dano contra inimigos amaldiçoados.' },
      { nome: 'Sentença Irrevogável', descricao: 'Reduz em 10% a DEF de inimigos amaldiçoados contra os ataques do personagem.' },
      { nome: 'Execução dos Juramentos', descricao: 'Causa 15% de dano adicional contra inimigos com menos de 25% de HP que estejam amaldiçoados.' },
    ],
  },
  // ---- Mítico ----
  {
    id: 'lautrec', nome: 'Lautrec, o Soberano do Tormento', raridade: 'mitico', estrelasMax: 4, atributos: ['forca', 'vigor', 'vitalidade'],
    lore: 'Uma divindade do tormento que transforma a dor em poder e a resistência em condenação.',
    habilidades: [
      { nome: 'Trono da Agonia', descricao: 'Aumenta em 10% o ATQ.' },
      { nome: 'Dor Transfigurada', descricao: 'Quando o personagem recebe dano, ganha 3% de ATQ por duas rodadas. Acumula até três vezes.' },
      { nome: 'Punição do Soberano', descricao: 'Causa 12% de dano adicional contra inimigos que possuam efeitos negativos.' },
      { nome: 'Apoteose do Tormento', descricao: 'Quando o HP fica abaixo de 50%, aumenta em 20% o dano causado e reduz em 10% o dano recebido por duas rodadas. Ativa uma vez por combate.' },
    ],
  },
  {
    id: 'nimb', nome: 'Nimb, o Senhor das Tempestades', raridade: 'mitico', estrelasMax: 4, atributos: ['agilidade', 'inteligencia', 'sorte'],
    lore: 'Um deus das tempestades cuja velocidade e poder elétrico ultrapassam os limites dos mortais.',
    habilidades: [
      { nome: 'Coração Trovejante', descricao: 'Aumenta a iniciativa em 10%.' },
      { nome: 'Descarga Celestial', descricao: 'Aumenta em 12% o dano elétrico.' },
      { nome: 'Ritmo da Tempestade', descricao: 'Aumenta em 10% a chance de causar um ataque adicional quando a iniciativa ativa esse efeito no sistema de combate.' },
      { nome: 'Cólera dos Céus', descricao: 'Uma vez por combate, quando o personagem realiza um acerto crítico, tem 30% de chance de desencadear uma descarga elétrica adicional que causa 100% do ATQ como dano elétrico.' },
    ],
  },
  {
    id: 'lana', nome: 'Lana, a Deusa do Luar Silencioso', raridade: 'mitico', estrelasMax: 4, atributos: ['arcano', 'inteligencia', 'agilidade'],
    lore: 'Uma deusa enigmática associada à noite, ao silêncio e aos segredos ocultos na escuridão.',
    habilidades: [
      { nome: 'Manto Lunar', descricao: 'Aumenta em 10% a resistência a efeitos negativos.' },
      { nome: 'Sono das Estrelas', descricao: 'Aumenta em 15% a chance de aplicar sono.' },
      { nome: 'Reflexo da Lua', descricao: 'Reduz em 10% o dano recebido de inimigos afetados por efeitos negativos.' },
      { nome: 'Eclipse Silencioso', descricao: 'Uma vez por combate, ao aplicar sono, congelamento ou outro efeito incapacitante, aumenta em 20% o dano causado pelo personagem por duas rodadas.' },
    ],
  },
  {
    id: 'aurelion', nome: 'Aurelion, o Arquiteto da Origem', raridade: 'mitico', estrelasMax: 4, atributos: ['vigor', 'forca', 'vitalidade'],
    lore: 'Uma divindade primordial proposta, associada às leis fundamentais que sustentam a existência.',
    habilidades: [
      { nome: 'Lei Primordial', descricao: 'Aumenta em 5% o ATQ, a DEF e o HP máximo.' },
      { nome: 'Geometria Divina', descricao: 'Aumenta em 10% a resistência a dano elemental.' },
      { nome: 'Equilíbrio da Criação', descricao: 'Quando o HP fica abaixo de 50%, aumenta em 10% o ATQ e a DEF por duas rodadas. Ativa uma vez por combate.' },
      { nome: 'Decreto da Origem', descricao: 'Uma vez por combate, quando o HP fica abaixo de 20%, remove os efeitos negativos do personagem e concede um escudo equivalente a 15% do HP máximo por duas rodadas.' },
    ],
  },
  {
    id: 'nymeris', nome: 'Nymeris, a Mãe do Abismo', raridade: 'mitico', estrelasMax: 4, atributos: ['inteligencia', 'arcano', 'vigor'],
    lore: 'Uma entidade primordial proposta, associada ao vazio anterior à luz e às forças que existem além da compreensão mortal.',
    habilidades: [
      { nome: 'Essência do Vazio', descricao: 'Aumenta em 12% o dano sombrio.' },
      { nome: 'Fome Abissal', descricao: 'Recupera HP equivalente a 4% do dano sombrio causado, limitado a 6% do HP máximo por rodada.' },
      { nome: 'Gravidade do Abismo', descricao: 'Reduz em 10% a DEF dos inimigos atingidos por dano sombrio, por duas rodadas. Não acumula.' },
      { nome: 'Devoradora da Existência', descricao: 'Uma vez por combate, ao atingir um inimigo com menos de 25% de HP com um ataque sombrio, causa dano adicional equivalente a 15% do HP atual do alvo, limitado a 10% do HP máximo do personagem como dano adicional.' },
    ],
  },
];

export const TIPO_EMBLEMA_MAP: Readonly<Record<string, TipoEmblema>> = Object.fromEntries(TIPOS_EMBLEMA.map((t) => [t.id, t]));

export function tiposDaRaridade(raridade: EmblemaRaridade): TipoEmblema[] {
  return TIPOS_EMBLEMA.filter((t) => t.raridade === raridade);
}
