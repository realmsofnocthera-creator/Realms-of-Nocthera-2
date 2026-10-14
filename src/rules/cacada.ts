import { Attributes } from './attributes';
import {
  Elemento,
  MODIFICADOR_FRAQUEZA,
  ModificadoresElementais,
} from './elements';
import { EfeitoStatus } from './statusEffects';
import { CategoriaCorporal, TipoGolpe } from './corposMonstros';
import { HabilidadeMonstro, MonsterDefinition } from './monsters';
import { SUBESPECIES_CACADA, SubespecieCacada } from './cacadaSubespecies';
import { XP_TABLE } from './xpTable';

/**
 * Provação da Caçada (estilo Monster Hunter), decidida pelo Yuri em 12/10/2026.
 * Ranque baixo: 1★ a 5★ (abre no nível 2). Ranque alto: 6★ a 9★ (nível 20 e o monstro-chave da 5★).
 * Cada estrela abre ao vencer o monstro-chave da anterior, com o nível mínimo da tabela. A 9★ não tem chave.
 */
export type RanqueCacada = 'baixo' | 'alto';

export interface EstrelaCacada {
  estrela: number;
  ranque: RanqueCacada;
  /** Nível mínimo do caçador e nível dos monstros comuns da estrela (o chave tem +1). */
  nivelMinimo: number;
}

export const ESTRELAS_CACADA: readonly EstrelaCacada[] = [
  { estrela: 1, ranque: 'baixo', nivelMinimo: 2 },
  { estrela: 2, ranque: 'baixo', nivelMinimo: 5 },
  { estrela: 3, ranque: 'baixo', nivelMinimo: 8 },
  { estrela: 4, ranque: 'baixo', nivelMinimo: 12 },
  { estrela: 5, ranque: 'baixo', nivelMinimo: 16 },
  { estrela: 6, ranque: 'alto', nivelMinimo: 20 },
  { estrela: 7, ranque: 'alto', nivelMinimo: 23 },
  { estrela: 8, ranque: 'alto', nivelMinimo: 26 },
  { estrela: 9, ranque: 'alto', nivelMinimo: 30 },
];

/** Perfil de luta do monstro: muda a distribuição dos atributos (ágil ataca duas vezes; blindado aguenta mais; lento bate mais forte). */
export type PerfilMonstro = 'normal' | 'agil' | 'blindado' | 'lento';

/** Dados de um monstro da Caçada, como no bestiário v2. Vida e atributos saem da estrela e do perfil (montarMonstroCacada). */
export interface MonstroCacadaDados {
  id: string;
  nome: string;
  estrela: number;
  /** Monstro-chave: vencê-lo abre a estrela seguinte; é chefe (imune a Sono, Paralisia e Congelamento). */
  chave?: boolean;
  /** Variante (subespécie) de outro monstro: divide o material Comum da espécie. */
  varianteDe?: string;
  tipo: string;
  regiao?: string;
  descricao: string;
  categoriaCorporal: CategoriaCorporal;
  fraquezasProprias?: TipoGolpe[];
  resistenciasProprias?: TipoGolpe[];
  elementoAtaque?: Elemento;
  fracoA?: Elemento[];
  resisteA?: Elemento[];
  efeitosAplicados?: EfeitoStatus[];
  perfil?: PerfilMonstro;
  habilidades?: HabilidadeMonstro[];
  enfurecido?: boolean;
  imunidadesStatus?: EfeitoStatus[];
  /** Subespécie (das 43 de `cacadaSubespecies.ts`): monstro normal, derivado do original em `varianteDe`. */
  subespecie?: boolean;
  /** Ajuste da subespécie sobre a Força e a Vitalidade da estrela (%). */
  forcaPercentual?: number;
  vitalidadePercentual?: number;
  /** Materiais que o monstro dropa (ids de MATERIAIS); a raridade de cada um define a chance. */
  drops: string[];
}

/** Resistência elemental dos monstros da Caçada (−20%); a fraqueza usa o padrão do jogo (+40%). */
export const MODIFICADOR_RESISTENCIA_CACADA = -20;

/**
 * Pontos de atributo de referência de um caçador no nível L (10 iniciais + 3 por nível + 40 da subclasse a partir do 20).
 * Base do cálculo dos monstros: primeira versão, para ajustar em teste.
 */
export function pontosDeReferencia(nivel: number): number {
  return 14 + 3 * (nivel - 1) + (nivel >= 20 ? 40 : 0);
}

export const PERFIS: Readonly<
  Record<
    PerfilMonstro,
    { hp: number; forca: number; vitalidade: number; agilidade: number }
  >
> = {
  normal: { hp: 2.5, forca: 0.27, vitalidade: 0.1, agilidade: 0.1 },
  agil: { hp: 2.1, forca: 0.25, vitalidade: 0.08, agilidade: 0.28 },
  blindado: { hp: 2.75, forca: 0.24, vitalidade: 0.2, agilidade: 0.08 },
  lento: { hp: 3.1, forca: 0.31, vitalidade: 0.12, agilidade: 0 },
};

/** Monstro-chave: 20% mais vida e 8% mais força que os comuns da estrela (as habilidades e o Enfurecido fazem o resto). */
export const MULT_CHAVE = { hp: 1.2, forca: 1.08 };

/** Os 35 monstros originais do bestiário v2. */
const MONSTROS_ORIGINAIS: readonly MonstroCacadaDados[] = [
  {
    id: 'rato-da-floresta',
    nome: 'Rato da Floresta',
    estrela: 1,
    tipo: 'Fera pequena',
    regiao: 'Florestas',
    descricao: 'Roedor ágil que ataca em sequência rápida.',
    categoriaCorporal: 'feral',
    fracoA: ['fogo'],
    perfil: 'agil',
    drops: ['pelo-de-rato', 'cauda-de-rato', 'dente-afiado'],
  },
  {
    id: 'lobo-cinzento',
    nome: 'Lobo Cinzento',
    estrela: 1,
    tipo: 'Fera',
    regiao: 'Florestas',
    descricao: 'Caçador solitário de mordida profunda.',
    categoriaCorporal: 'feral',
    fracoA: ['fogo'],
    efeitosAplicados: ['sangramento'],
    drops: ['pele-de-lobo-cinzento', 'presa-de-lobo', 'olho-de-lobo'],
  },
  {
    id: 'esqueleto',
    nome: 'Esqueleto',
    estrela: 1,
    tipo: 'Morto-vivo',
    regiao: 'Ruínas',
    descricao: 'Guerreiro antigo reerguido; não sangra nem se envenena.',
    categoriaCorporal: 'aberrante',
    fraquezasProprias: ['contusao'],
    resistenciasProprias: ['corte', 'perfuracao'],
    elementoAtaque: 'sombrio',
    fracoA: ['sagrado'],
    resisteA: ['sombrio'],
    perfil: 'blindado',
    imunidadesStatus: ['sangramento', 'veneno'],
    drops: ['osso-velho', 'cranio-rachado', 'po-de-ossos-antigos'],
  },
  {
    id: 'urso-gigante',
    nome: 'Urso Gigante',
    estrela: 1,
    chave: true,
    tipo: 'Fera',
    regiao: 'Florestas',
    descricao: 'O maior predador da floresta; golpes lentos e pesados.',
    categoriaCorporal: 'feral',
    elementoAtaque: 'terra',
    fracoA: ['fogo'],
    efeitosAplicados: ['sangramento'],
    habilidades: [
      {
        aCada: 3,
        acoes: [{ nome: 'Patada Pesada', efeito: { percentualDano: 180 } }],
      },
    ],
    enfurecido: true,
    drops: [
      'pele-grossa-de-urso',
      'garra-de-urso',
      'gordura-densa',
      'coracao-de-urso-gigante',
    ],
  },
  {
    id: 'vargheist',
    nome: 'Vargheist',
    estrela: 2,
    tipo: 'Fera',
    regiao: 'Savanas',
    descricao: 'Caça em grupos e concentra ataques nos alvos feridos.',
    categoriaCorporal: 'feral',
    fracoA: ['gelo'],
    efeitosAplicados: ['sangramento'],
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Caça em Grupo',
            efeito: {
              efeitosNoAlvo: [
                {
                  tipo: 'pressao',
                  percentualDefesa: 20,
                  limiteHpPercentual: 50,
                  rodadas: 3,
                },
              ],
            },
          },
        ],
      },
    ],
    drops: ['couro-de-vargheist', 'presa-serrilhada', 'juba-aspera'],
  },
  {
    id: 'noctyrr',
    nome: 'Noctyrr',
    estrela: 2,
    tipo: 'Voador',
    regiao: 'Grutas',
    descricao: 'Usa ondas sonoras para desorientar os caçadores.',
    categoriaCorporal: 'organicoDesprotegido',
    elementoAtaque: 'vento',
    fracoA: ['fogo'],
    perfil: 'agil',
    habilidades: [
      {
        aCada: 4,
        acoes: [
          {
            nome: 'Onda Sonora',
            efeito: { efeitosNoAlvo: [{ tipo: 'distracao', acoes: 1 }] },
          },
        ],
      },
    ],
    drops: ['membrana-de-asa', 'orelha-de-eco', 'cristal-de-eco'],
  },
  {
    id: 'murdrax',
    nome: 'Murdrax',
    estrela: 2,
    tipo: 'Réptil',
    regiao: 'Pântanos',
    descricao: 'Enterra-se na lama e ataca por baixo.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'terra',
    fracoA: ['gelo'],
    resisteA: ['terra'],
    efeitosAplicados: ['veneno'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Emboscada da Lama',
            efeito: { ignorarDefesaPercentual: 30, percentualDano: 130 },
          },
        ],
      },
    ],
    drops: ['escama-de-lama', 'garra-lodosa', 'glandula-do-pantano'],
  },
  {
    id: 'vargheist-alfa',
    nome: 'Vargheist Alfa, Gêmeo Devorador',
    estrela: 2,
    chave: true,
    varianteDe: 'vargheist',
    tipo: 'Fera',
    regiao: 'Savanas',
    descricao:
      'Duas cabeças atacam em ritmos diferentes. Ferir uma delas aumenta a agressividade da outra.',
    categoriaCorporal: 'feral',
    fracoA: ['gelo'],
    efeitosAplicados: ['sangramento'],
    habilidades: [
      {
        aCada: 2,
        acoes: [
          {
            nome: 'Mordida Gêmea',
            efeito: { numeroGolpes: 2, percentualDano: 70 },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'couro-de-vargheist',
      'cranio-gemeo',
      'presa-do-alfa',
      'coracao-bicefalo',
    ],
  },
  {
    id: 'grizzharn',
    nome: 'Grizzharn',
    estrela: 3,
    tipo: 'Fera',
    regiao: 'Florestas antigas',
    descricao: 'Alterna golpes pesados, agarrões e ataques de esmagamento.',
    categoriaCorporal: 'feral',
    elementoAtaque: 'terra',
    fracoA: ['fogo'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Agarrão',
            efeito: {
              efeitosNoAlvo: [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }],
            },
          },
          { nome: 'Esmagamento', efeito: { percentualDano: 180 } },
        ],
      },
    ],
    drops: [
      'pelo-de-grizzharn',
      'garra-esmagadora',
      'placa-de-ombro',
      'ambar-ancestral',
    ],
  },
  {
    id: 'rhazkida',
    nome: 'Rhazkida',
    estrela: 3,
    tipo: 'Insetoide',
    regiao: 'Túneis',
    descricao: 'Acumula veneno nos ataques consecutivos.',
    categoriaCorporal: 'quitinoso',
    fracoA: ['fogo'],
    efeitosAplicados: ['veneno'],
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Ferrão Acumulado',
            efeito: {
              acumulativo: { percentualPorAtaque: 5, limitePercentual: 30 },
            },
          },
        ],
      },
    ],
    drops: [
      'carapaca-de-rhazkida',
      'ferrao-venenoso',
      'bolsa-de-veneno',
      'nucleo-toxico',
    ],
  },
  {
    id: 'floragoth',
    nome: 'Floragoth',
    estrela: 3,
    tipo: 'Planta predatória',
    regiao: 'Pântanos',
    descricao:
      'Prende vítimas com raízes e libera esporos debilitantes. Fraqueza: Fogo.',
    categoriaCorporal: 'organicoDesprotegido',
    elementoAtaque: 'terra',
    fracoA: ['fogo'],
    resisteA: ['terra'],
    efeitosAplicados: ['veneno'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Raízes',
            efeito: {
              efeitosNoAlvo: [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }],
            },
          },
          {
            nome: 'Esporos',
            efeito: {
              efeitosNoAlvo: [
                { tipo: 'enfraquecimento', percentual: 20, rodadas: 2 },
              ],
            },
          },
        ],
      },
    ],
    drops: [
      'fibra-vegetal',
      'raiz-constritora',
      'saco-de-esporos',
      'flor-carnivora',
    ],
  },
  {
    id: 'cryovarn',
    nome: 'Cryovarn, o Crisol',
    estrela: 3,
    chave: true,
    tipo: 'Fera',
    regiao: 'Tundra',
    descricao: 'Congela os chifres e executa investidas devastadoras.',
    categoriaCorporal: 'feral',
    elementoAtaque: 'gelo',
    fracoA: ['fogo'],
    resisteA: ['gelo'],
    efeitosAplicados: ['congelamento'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Investida Glacial',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 150 },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'pelagem-gelida',
      'chifre-congelado',
      'cristal-de-gelo-eterno',
      'coracao-do-crisol',
    ],
  },
  {
    id: 'zaryth',
    nome: 'Zaryth',
    estrela: 4,
    tipo: 'Serpe',
    regiao: 'Penhascos',
    descricao: 'Acumula eletricidade nas espinhas e libera descargas.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'relampago',
    fracoA: ['terra'],
    resisteA: ['relampago'],
    efeitosAplicados: ['paralisia'],
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Carga Elétrica',
            efeito: {
              acumulativo: { percentualPorAtaque: 5, limitePercentual: 30 },
            },
          },
        ],
      },
      {
        aCada: 4,
        acoes: [
          {
            nome: 'Descarga',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 160 },
          },
        ],
      },
    ],
    drops: [
      'escama-condutora',
      'espinho-eletrico',
      'glandula-de-raio',
      'gema-de-tempestade',
    ],
  },
  {
    id: 'drazhkar',
    nome: 'Drazhkar',
    estrela: 4,
    tipo: 'Colosso subterrâneo',
    regiao: 'Deserto',
    descricao: 'Enterra-se e emerge sob os jogadores.',
    categoriaCorporal: 'rochoso',
    elementoAtaque: 'terra',
    fracoA: ['vento'],
    resisteA: ['terra'],
    perfil: 'blindado',
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Enterrar',
            efeito: {
              percentualDano: 60,
              efeitosNoUsuario: [
                {
                  efeito: 'escudoTemporario',
                  valorPercentual: 40,
                  duracaoRodadas: 2,
                },
              ],
            },
          },
          {
            nome: 'Emergir',
            efeito: { ignorarDefesaPercentual: 40, percentualDano: 170 },
          },
        ],
      },
    ],
    drops: [
      'casca-arenosa',
      'garra-escavadora',
      'placa-de-arenito',
      'nucleo-do-deserto',
    ],
  },
  {
    id: 'pesthyr',
    nome: 'Pesthyr',
    estrela: 4,
    tipo: 'Voador',
    regiao: 'Terras contaminadas',
    descricao:
      'Espalha nuvens de praga e ataca por mergulho. Fraqueza: Sagrado.',
    categoriaCorporal: 'organicoDesprotegido',
    elementoAtaque: 'sombrio',
    fracoA: ['sagrado'],
    resisteA: ['sombrio'],
    efeitosAplicados: ['podridaoEscarlate'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Mergulho',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 150 },
          },
        ],
      },
    ],
    drops: [
      'pena-contaminada',
      'bico-pestilento',
      'bolsa-de-praga',
      'esporo-negro',
    ],
  },
  {
    id: 'nythrakka',
    nome: 'Nythrakka, a Matriz',
    estrela: 4,
    chave: true,
    tipo: 'Aracnídeo',
    regiao: 'Catacumbas',
    descricao: 'Cria redes endurecidas que imobilizam caçadores.',
    categoriaCorporal: 'quitinoso',
    elementoAtaque: 'sombrio',
    fracoA: ['fogo'],
    resisteA: ['sombrio'],
    efeitosAplicados: ['paralisia'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Rede Endurecida',
            efeito: {
              efeitosNoAlvo: [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }],
              statusComChanceNoAlvo: [
                { status: 'paralisia', chanceExtraPercentual: 30 },
              ],
            },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'quitina-escura',
      'fio-endurecido',
      'glandula-de-seda',
      'ovo-da-matriz',
    ],
  },
  {
    id: 'abysskar',
    nome: 'Abysskar',
    estrela: 5,
    tipo: 'Aquático',
    regiao: 'Lagos subterrâneos',
    descricao: 'Paralisa os alvos com descargas elétricas.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'relampago',
    fracoA: ['terra'],
    resisteA: ['relampago'],
    efeitosAplicados: ['paralisia'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          { nome: 'Descarga', efeito: { statusComChanceNoAlvo: [{ status: 'paralisia', chanceExtraPercentual: 30 }] } },
        ],
      },
    ],
    drops: [
      'escama-abissal',
      'barbatana-eletrica',
      'orgao-voltaico',
      'perola-das-profundezas',
    ],
  },
  {
    id: 'vorthak',
    nome: 'Vorthak',
    estrela: 5,
    tipo: 'Dracônico',
    regiao: 'Abismos',
    descricao: 'Rastreia vibrações e contra-ataca movimentos bruscos.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'sombrio',
    fracoA: ['sagrado'],
    resisteA: ['sombrio'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Contra-ataque',
            efeito: {
              efeitosNoUsuario: [
                {
                  efeito: 'redirecionamento',
                  valorPercentual: 30,
                  duracaoRodadas: 1,
                },
              ],
            },
          },
        ],
      },
    ],
    drops: [
      'escama-draconica-escura',
      'garra-do-abismo',
      'orgao-sensorial',
      'sangue-draconico',
    ],
  },
  {
    id: 'nythrakka-matriarca-do-casulo',
    nome: 'Nythrakka, Matriarca do Casulo',
    estrela: 5,
    chave: true,
    varianteDe: 'nythrakka',
    tipo: 'Aracnídeo',
    regiao: 'Catacumbas (ver ponto 2)',
    descricao:
      'Gera filhotes durante o combate. Destruir o abdômen reduz a reprodução, mas aumenta a agressividade da matriarca.',
    categoriaCorporal: 'quitinoso',
    elementoAtaque: 'sombrio',
    fracoA: ['fogo'],
    resisteA: ['sombrio'],
    efeitosAplicados: ['paralisia'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          { nome: 'Ninhada', efeito: { numeroGolpes: 3, percentualDano: 60 } },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'quitina-escura',
      'casulo-vivo',
      'abdomen-da-matriarca',
      'coroa-da-matriarca',
    ],
  },
  {
    id: 'dravoryx',
    nome: 'Dravoryx',
    estrela: 6,
    tipo: 'Wyvern',
    regiao: 'Montanhas',
    descricao: 'Alterna mergulhos aéreos e ataques de cauda.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'vento',
    fracoA: ['relampago'],
    resisteA: ['vento'],
    efeitosAplicados: ['sangramento'],
    perfil: 'agil',
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Mergulho e Cauda',
            efeito: { numeroGolpes: 2, percentualDano: 80 },
          },
        ],
      },
    ],
    drops: [
      'escama-de-wyvern',
      'membrana-aerea',
      'cauda-afiada',
      'gema-das-alturas',
    ],
  },
  {
    id: 'thalassyr',
    nome: 'Thalassyr',
    estrela: 6,
    tipo: 'Leviatã',
    regiao: 'Rios profundos',
    descricao: 'Controla correntes e tenta arrastar os caçadores para a água.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'gelo',
    fracoA: ['relampago'],
    resisteA: ['gelo'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Correnteza',
            efeito: {
              efeitosNoAlvo: [
                { tipo: 'exaustao', percentual: 30, rodadas: 2 },
                { tipo: 'enfraquecimento', percentual: 20, rodadas: 2 },
              ],
            },
          },
        ],
      },
    ],
    drops: [
      'escama-fluvial',
      'barbatana-de-leviata',
      'glandula-de-corrente',
      'perola-do-leviata',
    ],
  },
  {
    id: 'gravorn',
    nome: 'Gravorn',
    estrela: 6,
    tipo: 'Wyvern brutal',
    regiao: 'Montanhas rochosas',
    descricao:
      'Um predador de mandíbula poderosa e três chifres curvados. Usa o peso do corpo para esmagar presas contra paredões.',
    categoriaCorporal: 'blindadoPesado',
    elementoAtaque: 'terra',
    fracoA: ['vento'],
    resisteA: ['terra'],
    perfil: 'blindado',
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Mandíbula',
            efeito: { bonusContraSobreescudoPercentual: 25 },
          },
        ],
      },
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Esmagar',
            efeito: {
              percentualDano: 180,
              bonusContraSobreescudoPercentual: 25,
            },
          },
        ],
      },
    ],
    drops: [
      'casco-rochoso',
      'chifre-curvo',
      'mandibula-esmagadora',
      'medula-de-gravorn',
    ],
  },
  {
    id: 'raizark',
    nome: 'Raizark, o Trovão das Escarpas',
    estrela: 6,
    chave: true,
    tipo: 'Wyvern',
    regiao: 'Escarpas',
    descricao:
      'Uma wyvern dominante que armazena energia elétrica nos chifres e a descarrega ao golpear o solo. A quebra dos chifres altera seu padrão de combate.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'relampago',
    fracoA: ['gelo'],
    resisteA: ['relampago'],
    efeitosAplicados: ['paralisia'],
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Chifres Carregados',
            efeito: {
              acumulativo: { percentualPorAtaque: 5, limitePercentual: 20 },
            },
          },
        ],
      },
      {
        aCada: 4,
        acoes: [
          {
            nome: 'Golpe no Solo',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 170 },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'escama-do-trovao',
      'chifre-carregado',
      'pelo-estatico',
      'gema-do-trovao',
      'coracao-da-tempestade',
    ],
  },
  {
    id: 'rathmorn',
    nome: 'Rathmorn',
    estrela: 7,
    tipo: 'Wyvern',
    regiao: 'Ermos vulcânicos',
    descricao:
      'Caçador aéreo de asas largas, capaz de mergulhar e liberar rajadas de fogo concentrado.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'fogo',
    fracoA: ['gelo'],
    resisteA: ['fogo'],
    efeitosAplicados: ['queimadura'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Rajada de Fogo',
            efeito: {
              ignorarDefesaPercentual: 100,
              percentualDano: 150,
              statusForcadosNoAlvo: ['queimadura'],
            },
          },
        ],
      },
    ],
    drops: [
      'escama-vulcanica',
      'asa-ignea',
      'bolsa-de-chamas',
      'placa-incandescente',
    ],
  },
  {
    id: 'kharvok',
    nome: 'Kharvok',
    estrela: 7,
    tipo: 'Colosso mineral',
    regiao: 'Caldeiras vulcânicas',
    descricao:
      'Criatura revestida por basalto. Expõe o núcleo incandescente quando a armadura se parte.',
    categoriaCorporal: 'rochoso',
    elementoAtaque: 'fogo',
    fracoA: ['gelo'],
    resisteA: ['fogo'],
    efeitosAplicados: ['queimadura'],
    perfil: 'blindado',
    habilidades: [
      {
        aCada: 4,
        acoes: [
          {
            nome: 'Armadura de Basalto',
            efeito: {
              percentualDano: 60,
              efeitosNoUsuario: [
                {
                  efeito: 'escudoTemporario',
                  valorPercentual: 50,
                  duracaoRodadas: 3,
                },
              ],
            },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'basalto-bruto',
      'fragmento-de-armadura',
      'magma-solidificado',
      'nucleo-incandescente',
    ],
  },
  {
    id: 'zyrak',
    nome: 'Zyrak',
    estrela: 7,
    tipo: 'Wyvern voadora',
    regiao: 'Cânions',
    descricao:
      'Caçador aéreo: ataca com mergulhos rápidos, garras venenosas e sopros de fogo. Quando ferido nas asas, passa a lutar mais agressivamente no solo.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'fogo',
    fracoA: ['relampago'],
    resisteA: ['fogo'],
    efeitosAplicados: ['veneno'],
    perfil: 'agil',
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Mergulho',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 150 },
          },
          {
            nome: 'Sopro de Fogo',
            efeito: { statusForcadosNoAlvo: ['queimadura'] },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'escama-de-zyrak',
      'garra-venenosa',
      'asa-de-canion',
      'glandula-ignea',
    ],
  },
  {
    id: 'dromvark',
    nome: 'Dromvark, Mandíbula de Ferro',
    estrela: 7,
    chave: true,
    tipo: 'Wyvern bruta',
    regiao: 'Desfiladeiros',
    descricao:
      'Predador voraz que agarra presas e usa a força do pescoço para arremessá-las. Quanto mais tempo luta, mais agressivo se torna.',
    categoriaCorporal: 'blindagemMedia',
    elementoAtaque: 'sombrio',
    fracoA: ['relampago', 'sagrado'],
    resisteA: ['sombrio'],
    efeitosAplicados: ['sangramento'],
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Voracidade',
            efeito: {
              acumulativo: { percentualPorAtaque: 5, limitePercentual: 25 },
            },
          },
        ],
      },
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Agarrão e Arremesso',
            efeito: {
              ignorarDefesaPercentual: 100,
              percentualDano: 150,
              efeitosNoAlvo: [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }],
            },
          },
        ],
      },
    ],
    drops: [
      'couro-de-ferro',
      'dente-voraz',
      'mandibula-de-ferro',
      'saliva-corrosiva',
      'coracao-insaciavel',
    ],
  },
  {
    id: 'vaelgrun',
    nome: 'Vaelgrun',
    estrela: 8,
    tipo: 'Dragão Ancião',
    regiao: 'Cordilheiras tempestuosas',
    descricao:
      'Elemento: Vento • Carapaça: escamas metálicas. Gera correntes de ar ao bater as asas; sua presença torna perigosa toda a área.',
    categoriaCorporal: 'blindadoPesado',
    elementoAtaque: 'vento',
    fracoA: ['relampago'],
    resisteA: ['vento'],
    perfil: 'blindado',
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Vendaval',
            efeito: {
              efeitosNoAlvo: [{ tipo: 'exaustao', percentual: 30, rodadas: 2 }],
              efeitosNoUsuario: [
                {
                  efeito: 'resistenciaFisica',
                  valorPercentual: 20,
                  duracaoRodadas: 3,
                },
              ],
            },
          },
        ],
      },
    ],
    drops: [
      'escama-metalica',
      'placa-sobreposta',
      'asa-do-vendaval',
      'gema-do-ceu',
      'folego-do-anciao',
    ],
  },
  {
    id: 'nershaga',
    nome: 'Nershaga',
    estrela: 8,
    tipo: 'Dragão Ancião',
    regiao: 'Florestas úmidas e ruínas',
    descricao:
      'Elemento: Trevas • Camuflagem e miasma. Altera a cor do corpo e libera uma névoa que confunde os caçadores; desgasta a presa antes de se aproximar.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'sombrio',
    fracoA: ['sagrado'],
    resisteA: ['sombrio'],
    efeitosAplicados: ['loucura'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Miasma',
            efeito: {
              efeitosNoAlvo: [
                { tipo: 'enfraquecimento', percentual: 20, rodadas: 2 },
              ],
              statusComChanceNoAlvo: [
                { status: 'loucura', chanceExtraPercentual: 30 },
              ],
            },
          },
        ],
      },
    ],
    drops: [
      'pele-mimetica',
      'glandula-de-miasma',
      'olho-mutavel',
      'nevoa-cristalizada',
      'essencia-das-sombras',
    ],
  },
  {
    id: 'ghorvazul',
    nome: 'Ghorvazul',
    estrela: 8,
    tipo: 'Dragão Ancião do Piche Negro',
    descricao:
      'Um colosso de corpo maciço, coberto por uma substância negra espessa que adere ao terreno. Movimentos lentos, mas cada ataque altera grandes partes da arena.',
    categoriaCorporal: 'amorfo',
    elementoAtaque: 'fogo',
    fracoA: ['gelo'],
    resisteA: ['fogo'],
    efeitosAplicados: ['queimadura'],
    perfil: 'lento',
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Piche Aderente',
            efeito: {
              efeitosNoAlvo: [
                {
                  tipo: 'pressao',
                  percentualDefesa: 20,
                  limiteHpPercentual: 50,
                  rodadas: 3,
                },
              ],
            },
          },
        ],
      },
      {
        aCada: 4,
        acoes: [
          {
            nome: 'Explosão de Piche',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 200 },
          },
        ],
      },
    ],
    drops: [
      'piche-endurecido',
      'escama-betumada',
      'glandula-de-piche',
      'coracao-de-piche',
      'chama-negra-eterna',
    ],
  },
  {
    id: 'tharvok',
    nome: 'Tharvok, Leão das Cinzas',
    estrela: 8,
    chave: true,
    tipo: 'Dragão Ancião',
    descricao:
      'Um dragão leonino que espalha partículas combustíveis e provoca explosões ao sacudir a juba. Quando enfurecido, transforma o campo de batalha numa zona de detonações.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'fogo',
    fracoA: ['gelo'],
    resisteA: ['fogo'],
    efeitosAplicados: ['queimadura'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Explosão de Cinzas',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 150 },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'juba-cinzenta',
      'po-explosivo',
      'garra-flamejante',
      'chifre-do-leao',
      'coroa-das-cinzas',
    ],
  },
  {
    id: 'oryndrak',
    nome: 'Oryndrak, Serpe dos Céus',
    estrela: 9,
    tipo: 'Leviatã aéreo',
    descricao:
      'Manipula correntes de ar para levitar rochas e atacar de posições elevadas. A arena muda conforme seus movimentos.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'vento',
    fracoA: ['relampago'],
    resisteA: ['vento'],
    perfil: 'agil',
    habilidades: [
      {
        aCada: 2,
        acoes: [
          {
            nome: 'Rajada Aérea',
            efeito: { numeroGolpes: 2, percentualDano: 70 },
          },
        ],
      },
      {
        aCada: 4,
        acoes: [
          {
            nome: 'Chuva de Rochas',
            efeito: { ignorarDefesaPercentual: 100, percentualDano: 170 },
          },
        ],
      },
    ],
    drops: [
      'escama-celeste',
      'pena-de-vento',
      'pedra-levitante',
      'olho-do-ceu',
      'coracao-celeste',
    ],
  },
  {
    id: 'reydras',
    nome: 'Reydras, Chifre da Tormenta',
    estrela: 9,
    tipo: 'Predador das tempestades',
    descricao:
      'Adaptado a tempestades elétricas. Seus chifres concentram descargas que percorrem o solo e explodem em pontos específicos.',
    categoriaCorporal: 'escamoso',
    elementoAtaque: 'relampago',
    fracoA: ['terra'],
    resisteA: ['relampago'],
    efeitosAplicados: ['paralisia'],
    habilidades: [
      {
        aCada: 3,
        acoes: [
          {
            nome: 'Descarga no Solo',
            efeito: {
              ignorarDefesaPercentual: 100,
              percentualDano: 150,
              statusComChanceNoAlvo: [{ status: 'paralisia', chanceExtraPercentual: 30 }],
            },
          },
        ],
      },
    ],
    drops: [
      'escama-tempestuosa',
      'chifre-condutor',
      'membrana-carregada',
      'gema-da-tormenta',
      'alma-do-trovao',
    ],
  },
  {
    id: 'dravakhar',
    nome: 'Dravakhar, Espinho Soberano',
    estrela: 9,
    tipo: 'Dragão Ancião',
    descricao:
      'Predador de força brutal cujos espinhos crescem e endurecem durante a luta. Quanto mais tempo passa sem interrupções, mais agressivo se torna.',
    categoriaCorporal: 'blindadoPesado',
    fracoA: ['relampago'],
    efeitosAplicados: ['sangramento'],
    perfil: 'blindado',
    habilidades: [
      {
        aCada: 1,
        acoes: [
          {
            nome: 'Espinhos Crescentes',
            efeito: {
              acumulativo: { percentualPorAtaque: 6, limitePercentual: 60 },
            },
          },
        ],
      },
      {
        aCada: 4,
        acoes: [
          {
            nome: 'Espinhos Endurecidos',
            efeito: {
              percentualDano: 80,
              efeitosNoUsuario: [
                {
                  efeito: 'resistenciaFisica',
                  valorPercentual: 20,
                  duracaoRodadas: 3,
                },
              ],
            },
          },
        ],
      },
    ],
    drops: [
      'espinho-endurecido',
      'couro-espinhoso',
      'garra-soberana',
      'espinho-ancestral',
      'coracao-soberano',
    ],
  },
  {
    id: 'urdumor',
    nome: 'Urdumor, Manto Devorador',
    estrela: 9,
    tipo: 'Leviatã de tentáculos',
    descricao:
      'Reveste o corpo com uma substância inflamável. O combate alterna entre tentáculos, manto protetor e exposição do núcleo.',
    categoriaCorporal: 'amorfo',
    elementoAtaque: 'fogo',
    fracoA: ['gelo'],
    resisteA: ['fogo'],
    efeitosAplicados: ['queimadura'],
    habilidades: [
      {
        aCada: 2,
        acoes: [
          {
            nome: 'Tentáculos',
            efeito: { numeroGolpes: 3, percentualDano: 60 },
          },
          {
            nome: 'Manto Inflamável',
            efeito: {
              percentualDano: 60,
              efeitosNoUsuario: [
                {
                  efeito: 'escudoTemporario',
                  valorPercentual: 40,
                  duracaoRodadas: 2,
                },
              ],
            },
          },
        ],
      },
    ],
    enfurecido: true,
    drops: [
      'tentaculo-queimado',
      'manto-inflamavel',
      'ventosa-gigante',
      'nucleo-do-devorador',
      'coracao-primordial',
    ],
  },
];

/** Fraqueza que a subespécie ganha ao trocar de elemento (o oposto de cada elemento). */
const ELEMENTO_OPOSTO: Readonly<Record<Elemento, Elemento>> = {
  fogo: 'gelo',
  gelo: 'fogo',
  relampago: 'terra',
  terra: 'vento',
  vento: 'relampago',
  sagrado: 'sombrio',
  sombrio: 'sagrado',
};

/**
 * Monta os dados de uma subespécie a partir do original: herda tipo, região, perfil, categoria corporal,
 * habilidades, Enfurecido e imunidades. Com elementos novos, resiste a eles e fica fraca aos opostos;
 * sem elemento novo, mantém as fraquezas e resistências do original. Nunca é monstro-chave.
 */
export function montarSubespecie(original: MonstroCacadaDados, s: SubespecieCacada): MonstroCacadaDados {
  const efeitos = [...(original.efeitosAplicados ?? [])];
  if (s.status && !efeitos.includes(s.status)) efeitos.push(s.status);
  const elementos = s.elementos ?? [];
  const elementoAtaque = elementos[0] ?? original.elementoAtaque;
  const fracoA =
    elementos.length > 0
      ? [...new Set(elementos.map((e) => ELEMENTO_OPOSTO[e]))].filter((e) => !elementos.includes(e))
      : original.fracoA;
  const resisteA = elementos.length > 0 ? [...elementos] : original.resisteA;
  return {
    id: s.id,
    nome: s.nome,
    estrela: s.estrela,
    varianteDe: original.id,
    subespecie: true,
    tipo: original.tipo,
    ...(original.regiao ? { regiao: original.regiao } : {}),
    descricao: s.descricao,
    categoriaCorporal: original.categoriaCorporal,
    ...(original.fraquezasProprias ? { fraquezasProprias: original.fraquezasProprias } : {}),
    ...(original.resistenciasProprias ? { resistenciasProprias: original.resistenciasProprias } : {}),
    ...(elementoAtaque ? { elementoAtaque } : {}),
    ...(fracoA && fracoA.length > 0 ? { fracoA } : {}),
    ...(resisteA && resisteA.length > 0 ? { resisteA } : {}),
    ...(efeitos.length > 0 ? { efeitosAplicados: efeitos } : {}),
    ...(original.perfil ? { perfil: original.perfil } : {}),
    ...(original.habilidades ? { habilidades: original.habilidades } : {}),
    ...(original.enfurecido ? { enfurecido: true } : {}),
    ...(original.imunidadesStatus ? { imunidadesStatus: original.imunidadesStatus } : {}),
    ...(s.forcaPercentual ? { forcaPercentual: s.forcaPercentual } : {}),
    ...(s.vitalidadePercentual ? { vitalidadePercentual: s.vitalidadePercentual } : {}),
    drops: [original.drops[0], ...s.drops],
  };
}

/** Os 78 monstros da Caçada: os 35 originais e as 43 subespécies. */
export const MONSTROS_CACADA_DADOS: readonly MonstroCacadaDados[] = [
  ...MONSTROS_ORIGINAIS,
  ...SUBESPECIES_CACADA.map((s) => {
    const original = MONSTROS_ORIGINAIS.find((m) => m.id === s.varianteDe);
    if (!original) throw new Error(`Subespécie sem original: ${s.id} (${s.varianteDe})`);
    return montarSubespecie(original, s);
  }),
];

/** Monta a definição de combate de um monstro da Caçada (vida, atributos, XP e ouro a partir da estrela e do perfil). */
export function montarMonstroCacada(d: MonstroCacadaDados): MonsterDefinition {
  const estrela = ESTRELAS_CACADA.find((e) => e.estrela === d.estrela);
  if (!estrela)
    throw new Error(`Estrela inválida no monstro ${d.id}: ${d.estrela}`);
  const nivel = Math.min(30, estrela.nivelMinimo + (d.chave ? 1 : 0));
  const p = pontosDeReferencia(nivel);
  const perfil = PERFIS[d.perfil ?? 'normal'];
  const multHp = d.chave ? MULT_CHAVE.hp : 1;
  const multForca = d.chave ? MULT_CHAVE.forca : 1;
  const atributos: Attributes = {
    vigor: Math.round(p * 0.2),
    sorte: 0,
    forca: Math.max(1, Math.round(p * perfil.forca * multForca * (1 + (d.forcaPercentual ?? 0) / 100))),
    vitalidade: Math.round(p * perfil.vitalidade * (1 + (d.vitalidadePercentual ?? 0) / 100)),
    arcano: 0,
    inteligencia: 0,
    agilidade: Math.max(1, Math.round(p * perfil.agilidade)),
  };
  const modificadoresElementais: ModificadoresElementais = {};
  for (const e of d.fracoA ?? [])
    modificadoresElementais[e] = MODIFICADOR_FRAQUEZA;
  for (const e of d.resisteA ?? [])
    modificadoresElementais[e] = MODIFICADOR_RESISTENCIA_CACADA;
  return {
    id: d.id,
    nome: d.nome,
    nivel,
    hp: Math.round(p * perfil.hp * multHp),
    chefe: d.chave === true,
    categoriaCorporal: d.categoriaCorporal,
    ...(d.fraquezasProprias ? { fraquezasProprias: d.fraquezasProprias } : {}),
    ...(d.resistenciasProprias
      ? { resistenciasProprias: d.resistenciasProprias }
      : {}),
    atributos,
    // XP curto: 5% do XP do próximo nível no nível mínimo da estrela (a trava contra farm entra ao premiar)
    xpConcedido: Math.max(
      1,
      Math.round((XP_TABLE[estrela.nivelMinimo] ?? 0) * 0.05),
    ),
    ouroConcedido: { min: 8 * nivel, max: 15 * nivel },
    modificadoresElementais,
    ...(d.elementoAtaque ? { elementoAtaque: d.elementoAtaque } : {}),
    ...(d.efeitosAplicados ? { efeitosAplicados: d.efeitosAplicados } : {}),
    ...(d.habilidades ? { habilidades: d.habilidades } : {}),
    ...(d.enfurecido ? { enfurecido: true } : {}),
    ...(d.imunidadesStatus ? { imunidadesStatus: d.imunidadesStatus } : {}),
  };
}

/** Monstros da Caçada prontos para o combate. Ficam fora de MONSTERS_MAP: só entram pela Caçada (estrela e nível validados). */
export const MONSTROS_CACADA: readonly MonsterDefinition[] =
  MONSTROS_CACADA_DADOS.map(montarMonstroCacada);

export const MONSTROS_CACADA_MAP: Readonly<Record<string, MonsterDefinition>> =
  Object.fromEntries(MONSTROS_CACADA.map((m) => [m.id, m]));

export const DADOS_CACADA_MAP: Readonly<Record<string, MonstroCacadaDados>> =
  Object.fromEntries(MONSTROS_CACADA_DADOS.map((m) => [m.id, m]));
