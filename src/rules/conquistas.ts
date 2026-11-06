import { estaAtivo, NOME_DO_SELO, type ColecionaveisDoJogador, type SeloDeBusca } from './colecionaveis';
import { nivelDaTrilha, TRILHAS_DE_MAESTRIA, type MaestriasDoJogador } from './maestrias';
import { TIPOS_DE_CARTA } from './almas';
import { CATEGORIAS_DO_TESTE, DIFICULDADES_DO_TESTE } from './testeEquipe';
import { TITULO_MAP } from './titulos';
import type { Elemento } from './elements';
import { CHEFES_ESPECIAIS_MAP } from './chefesEspeciais';
import { SUBESPECIES_CACADA } from './cacadaSubespecies';

/**
 * Conquistas (decididas pelo Yuri em 23/10/2026): metas com progresso e resgate. Cada conquista tem 5 degraus; o
 * progresso sobe sozinho jogando e o jogador resgata a recompensa de cada degrau batido. O que já está no personagem
 * (nível, andar da Torre, colecionáveis…) vale desde já; os totais novos (vitórias, forjas, expedições, buscas e dias
 * de Chefe Mundial) só contam daqui para frente. Metas, recompensas e títulos: proposta aprovada pelo Yuri em
 * 23/10/2026 (os nomes dos títulos são provisórios).
 *
 * Em 06/11/2026 o Yuri aprovou a lista nova (cerca de 100 conquistas em 7 categorias, a raridade muda com o degrau e as
 * recompensas caem). Esta é a fase 1: só as conquistas cujo dado o jogo já guarda; as que dependem de contador novo
 * (Comunidade, PvP, dano, vitórias por elemento…) entram categoria a categoria nas próximas fases.
 */

export const DEGRAUS = 5;

/** Os totais que o jogo passa a contar (ficam em `estatisticas` no personagem). */
export const CONTADORES = [
  'vitorias',
  'vitoriasContraChefes',
  'forjas',
  'expedicoes',
  'buscas',
  'diasDeChefeMundial',
  // Combate (fase 2): vitórias por elemento do monstro, vitórias sem perder vida e no limite, golpes críticos, dano e status
  'vitoriasFogo',
  'vitoriasGelo',
  'vitoriasRelampago',
  'vitoriasTerra',
  'vitoriasVento',
  'vitoriasSagrado',
  'vitoriasSombrio',
  'vitoriasVidaCheia',
  'vitoriasNoLimite',
  'golpesCriticos',
  'danoCausado',
  'statusAplicados',
  // Comunidade (fase 3): o que o jogador fez com os outros
  'contratosDeGuilda',
  'incursoesDeGuilda',
  'semanasDeChefeDeGuilda',
  'doacoesDePesquisa',
  'lutasEmParty',
  'vendasNoMercado',
  'comprasNoMercado',
  'presentesDoCorreio',
  // Provações e Forja (fase 4)
  'danoNoChefeMundial',
  'topsDoChefeMundial',
  'vitoriasBatalhaSangrenta',
  'vitoriasDoGuerreiro',
  'chavesDeProvacaoUsadas',
  'armasForjadas',
  'armadurasForjadas',
  'reforjas',
  'emblemasFundidos',
  'ouroNaForja',
  'materiaisNaForja',
  // PvP (fase 5)
  'lutasPvp',
  'vitoriasPvp',
  'sequenciaAtualPvp',
  'maiorSequenciaPvp',
  'vitoriasContraNivelMaior',
  'danoPvp',
  'viradasPvp',
  // o maior número de pontos que o jogador já fez na Arena ranqueada (um valor, não uma soma)
  'maiorPontuacaoRanqueada',
  // Personagem (fase 6)
  'pontosDeAtributo',
  'checkins',
  'bausDeMissao',
  'habilidadesUsadas',
  'poeiraGasta',
] as const;
export type Contador = (typeof CONTADORES)[number];
export type EstatisticasDoJogador = Partial<Record<Contador, number>>;

/** O contador de vitórias de cada elemento do monstro. */
export const CONTADOR_DO_ELEMENTO: Readonly<Record<Elemento, Contador>> = {
  fogo: 'vitoriasFogo',
  gelo: 'vitoriasGelo',
  relampago: 'vitoriasRelampago',
  terra: 'vitoriasTerra',
  vento: 'vitoriasVento',
  sagrado: 'vitoriasSagrado',
  sombrio: 'vitoriasSombrio',
};

/** As 7 categorias, na ordem da mesa: roupa, ovo, bigorna, mapa, banner de gato, escultura do dragão e cabana. */
export const CATEGORIAS_DE_CONQUISTA = ['personagem', 'monstros', 'forja', 'mundo', 'comunidade', 'provacoes', 'pvp'] as const;
export type CategoriaDeConquista = (typeof CATEGORIAS_DE_CONQUISTA)[number];
export const NOME_DA_CATEGORIA: Readonly<Record<CategoriaDeConquista, string>> = {
  personagem: 'Personagem',
  monstros: 'Monstros',
  forja: 'Forja',
  mundo: 'Mundo aberto',
  comunidade: 'Comunidade',
  provacoes: 'Provações',
  pvp: 'PvP',
};

/** A raridade muda com o degrau (proposta aprovada em 06/11/2026): 1º e 2º Bronze, 3º Prata, 4º Ouro e 5º Diamante. */
export type RaridadeDeConquista = 'bronze' | 'prata' | 'ouro' | 'diamante';
export const RARIDADE_DO_DEGRAU: readonly RaridadeDeConquista[] = ['bronze', 'bronze', 'prata', 'ouro', 'diamante'];
export const NOME_DA_RARIDADE_DE_CONQUISTA: Readonly<Record<RaridadeDeConquista, string>> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', diamante: 'Diamante' };

/** O que o progresso de uma conquista lê do personagem. */
export interface FichaDeConquistas {
  nivel: number;
  torreAndar?: number;
  guerreiroVencidas?: number[];
  batalhaSangrentaVencidas?: string[];
  testeEquipeConcluidas?: string[];
  colecionaveis?: ColecionaveisDoJogador;
  maestrias?: MaestriasDoJogador;
  cartasDescobertas?: string[];
  estatisticas?: EstatisticasDoJogador;
  reforcoHabilidade?: number;
  ascensaoHabilidade?: number;
  subclasseTiers?: Readonly<Record<string, number>>;
  emblemasItens?: readonly unknown[];
  titulos?: readonly string[];
  armas?: readonly unknown[];
  armaduras?: readonly unknown[];
  inventario?: Readonly<Record<string, number>>;
  campanha?: { baus?: readonly string[]; cenas?: readonly string[]; missoes?: Readonly<Record<string, { estado: string }>> };
  selosDoAbismo?: number;
  arena?: readonly { premiada?: boolean }[];
  ranqueada?: readonly { premiada?: boolean }[];
  campeonatos?: readonly string[];
  campeonatosVencidos?: number;
  cacadaChavesVencidas?: readonly number[];
  monstrosDerrotados?: readonly string[];
  /** Quando o jogador entrou na guilda de agora (ISO). */
  guildaDesde?: string;
  chefeSemanal?: readonly unknown[];
  vocacoesDerrotadasPvp?: readonly string[];
}

export interface Conquista {
  id: string;
  nome: string;
  categoria: CategoriaDeConquista;
  /** A meta em texto, com {n} no lugar do número. */
  meta: string;
  /** A meta no singular, quando o degrau pede só 1. */
  metaDeUm?: string;
  metas: readonly [number, number, number, number, number];
  progresso: (f: FichaDeConquistas) => number;
  /** Título ganho no último degrau. */
  titulo?: string;
  /** Recompensas com Avanços de expedição (Expedição e Buscas). */
  comAvancos?: boolean;
}

const contador = (c: Contador) => (f: FichaDeConquistas) => f.estatisticas?.[c] ?? 0;

export const TOTAL_DE_TESTES = CATEGORIAS_DO_TESTE.length * DIFICULDADES_DO_TESTE;
export const TOTAL_DE_CARTAS = TIPOS_DE_CARTA.length;

/** Dias inteiros desde uma data ISO (0 se não há data ou ela é inválida). */
const diasDesde = (iso: string | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / 86_400_000)) : 0;
};

const IDS_DE_SUBESPECIES: ReadonlySet<string> = new Set(SUBESPECIES_CACADA.map((x) => x.id));

const semanasPremiadas = (l: readonly { premiada?: boolean }[] | undefined) => (l ?? []).filter((x) => x.premiada).length;

export const CONQUISTAS: readonly Conquista[] = [
  // Personagem
  { id: 'nivel', nome: 'Nível', categoria: 'personagem', meta: 'Chegue ao nível {n}', metas: [5, 10, 15, 20, 30], progresso: (f) => f.nivel },
  {
    id: 'maestria',
    nome: 'Maestria',
    categoria: 'personagem',
    meta: 'Leve uma maestria ao nível {n}',
    metas: [10, 25, 50, 75, 100],
    progresso: (f) => Math.max(0, ...TRILHAS_DE_MAESTRIA.map((t) => nivelDaTrilha(f.maestrias, t.id))),
    titulo: 'maestre',
  },
  { id: 'reforco', nome: 'Reforço de Habilidade', categoria: 'personagem', meta: 'Leve o Reforço de Habilidade a {n}', metas: [3, 8, 15, 22, 30], progresso: (f) => f.reforcoHabilidade ?? 0 },
  { id: 'ascensao', nome: 'Ascensão de Habilidade', categoria: 'personagem', meta: 'Chegue à Ascensão A{n}', metas: [1, 2, 4, 7, 10], progresso: (f) => f.ascensaoHabilidade ?? 0 },
  { id: 'subclasses', nome: 'Subclasses', categoria: 'personagem', meta: 'Desbloqueie {n} subclasses', metaDeUm: 'Desbloqueie 1 subclasse', metas: [1, 2, 4, 8, 12], progresso: (f) => Object.values(f.subclasseTiers ?? {}).filter((t) => t > 0).length },
  { id: 'emblemas', nome: 'Emblemas', categoria: 'personagem', meta: 'Tenha {n} emblemas', metaDeUm: 'Tenha 1 emblema', metas: [1, 5, 15, 40, 100], progresso: (f) => f.emblemasItens?.length ?? 0 },
  { id: 'colecionaveis', nome: 'Colecionáveis', categoria: 'personagem', meta: 'Ative {n} colecionáveis', metaDeUm: 'Ative 1 colecionável', metas: [1, 10, 30, 60, 120], progresso: (f) => Object.values(f.colecionaveis ?? {}).filter(estaAtivo).length, titulo: 'colecionador-supremo' },
  { id: 'alma', nome: 'Alma', categoria: 'personagem', meta: 'Descubra {n} cartas da Alma', metas: [5, 15, 30, 45, TOTAL_DE_CARTAS], progresso: (f) => f.cartasDescobertas?.length ?? 0, titulo: 'guardiao-de-almas' },
  { id: 'titulos', nome: 'Títulos', categoria: 'personagem', meta: 'Tenha {n} títulos', metaDeUm: 'Tenha 1 título', metas: [1, 3, 6, 10, 15], progresso: (f) => f.titulos?.length ?? 0 },
  { id: 'atributos', nome: 'Atributos', categoria: 'personagem', meta: 'Distribua {n} pontos de atributo', metaDeUm: 'Distribua 1 ponto de atributo', metas: [10, 50, 150, 400, 1000], progresso: contador('pontosDeAtributo') },
  { id: 'checkin', nome: 'Check-in', categoria: 'personagem', meta: 'Faça {n} check-ins diários', metaDeUm: 'Faça 1 check-in diário', metas: [3, 7, 15, 30, 60], progresso: contador('checkins') },
  { id: 'baus-de-missao', nome: 'Baús de Missão', categoria: 'personagem', meta: 'Abra {n} degraus de baús de missão', metaDeUm: 'Abra 1 degrau de baú de missão', metas: [3, 15, 50, 120, 300], progresso: contador('bausDeMissao') },
  { id: 'habilidades-usadas', nome: 'Habilidades', categoria: 'personagem', meta: 'Use {n} habilidades em combate', metaDeUm: 'Use 1 habilidade em combate', metas: [50, 300, 1500, 6000, 20000], progresso: contador('habilidadesUsadas') },
  { id: 'poeira-gasta', nome: 'Poeira de Alma', categoria: 'personagem', meta: 'Gaste {n} de Poeira de Alma', metas: [10, 100, 500, 2000, 8000], progresso: contador('poeiraGasta') },
  // Monstros
  { id: 'vitorias', nome: 'Vitórias', categoria: 'monstros', meta: 'Vença {n} lutas', metas: [10, 100, 500, 2000, 10000], progresso: contador('vitorias'), titulo: 'veterano-de-guerra' },
  { id: 'chefes', nome: 'Vitórias contra chefes', categoria: 'monstros', meta: 'Vença {n} chefes', metas: [5, 25, 100, 300, 1000], progresso: contador('vitoriasContraChefes'), titulo: 'matador-de-chefes' },
  { id: 'cacada', nome: 'Caçada', categoria: 'monstros', meta: 'Abra a estrela {n} da Caçada', metas: [1, 3, 5, 8, 10], progresso: (f) => f.cacadaChavesVencidas?.length ?? 0 },
  { id: 'bestiario', nome: 'Bestiário', categoria: 'monstros', meta: 'Derrote {n} monstros diferentes', metas: [3, 8, 15, 30, 50], progresso: (f) => f.monstrosDerrotados?.length ?? 0 },
  { id: 'subespecies', nome: 'Subespécies', categoria: 'monstros', meta: 'Derrote {n} subespécies diferentes', metaDeUm: 'Derrote 1 subespécie', metas: [1, 3, 6, 10, 15], progresso: (f) => (f.monstrosDerrotados ?? []).filter((id) => IDS_DE_SUBESPECIES.has(id)).length },
  { id: 'chefesEspeciais', nome: 'Chefes especiais', categoria: 'monstros', meta: 'Derrote {n} chefes especiais diferentes', metaDeUm: 'Derrote 1 chefe especial', metas: [1, 3, 6, 10, 15], progresso: (f) => (f.monstrosDerrotados ?? []).filter((id) => id in CHEFES_ESPECIAIS_MAP).length },
  { id: 'elemento_fogo', nome: 'Caçador de Fogo', categoria: 'monstros', meta: 'Vença {n} lutas contra monstros de Fogo', metas: [10, 50, 150, 400, 1000], progresso: contador('vitoriasFogo') },
  { id: 'elemento_gelo', nome: 'Caçador de Gelo', categoria: 'monstros', meta: 'Vença {n} lutas contra monstros de Gelo', metas: [10, 50, 150, 400, 1000], progresso: contador('vitoriasGelo') },
  { id: 'elemento_relampago', nome: 'Caçador de Relâmpago', categoria: 'monstros', meta: 'Vença {n} lutas contra monstros de Relâmpago', metas: [10, 50, 150, 400, 1000], progresso: contador('vitoriasRelampago') },
  { id: 'elemento_terra', nome: 'Caçador de Terra', categoria: 'monstros', meta: 'Vença {n} lutas contra monstros de Terra', metas: [10, 50, 150, 400, 1000], progresso: contador('vitoriasTerra') },
  { id: 'elemento_vento', nome: 'Caçador de Vento', categoria: 'monstros', meta: 'Vença {n} lutas contra monstros de Vento', metas: [10, 50, 150, 400, 1000], progresso: contador('vitoriasVento') },
  { id: 'elemento_sagrado', nome: 'Caçador de Sagrado', categoria: 'monstros', meta: 'Vença {n} lutas contra monstros Sagrados', metas: [10, 50, 150, 400, 1000], progresso: contador('vitoriasSagrado') },
  { id: 'elemento_sombrio', nome: 'Caçador de Sombrio', categoria: 'monstros', meta: 'Vença {n} lutas contra monstros Sombrios', metas: [10, 50, 150, 400, 1000], progresso: contador('vitoriasSombrio') },
  { id: 'intocavel', nome: 'Intocável', categoria: 'monstros', meta: 'Vença {n} lutas sem perder vida', metaDeUm: 'Vença 1 luta sem perder vida', metas: [1, 10, 40, 120, 300], progresso: contador('vitoriasVidaCheia') },
  { id: 'noLimite', nome: 'No limite', categoria: 'monstros', meta: 'Vença {n} lutas com menos de 10% de vida', metaDeUm: 'Vença 1 luta com menos de 10% de vida', metas: [1, 5, 20, 60, 150], progresso: contador('vitoriasNoLimite') },
  { id: 'criticos', nome: 'Golpe crítico', categoria: 'monstros', meta: 'Acerte {n} golpes críticos', metas: [25, 200, 1000, 5000, 20000], progresso: contador('golpesCriticos') },
  { id: 'destruidor', nome: 'Destruidor', categoria: 'monstros', meta: 'Cause {n} de dano nas lutas que vencer', metas: [5000, 100000, 1000000, 10000000, 100000000], progresso: contador('danoCausado') },
  { id: 'statusAplicados', nome: 'Efeitos de status', categoria: 'monstros', meta: 'Aplique {n} efeitos de status nas lutas que vencer', metas: [10, 100, 500, 2000, 8000], progresso: contador('statusAplicados') },
  // Forja
  { id: 'forja', nome: 'Forja', categoria: 'forja', meta: 'Fabrique {n} itens', metaDeUm: 'Fabrique 1 item', metas: [1, 5, 25, 100, 300], progresso: contador('forjas'), titulo: 'mestre-ferreiro' },
  { id: 'arsenal', nome: 'Arsenal', categoria: 'forja', meta: 'Tenha {n} armas', metaDeUm: 'Tenha 1 arma', metas: [1, 5, 15, 30, 60], progresso: (f) => f.armas?.length ?? 0 },
  { id: 'guardaRoupa', nome: 'Guarda-roupa', categoria: 'forja', meta: 'Tenha {n} armaduras', metaDeUm: 'Tenha 1 armadura', metas: [1, 5, 15, 30, 60], progresso: (f) => f.armaduras?.length ?? 0 },
  { id: 'materiais', nome: 'Materiais', categoria: 'forja', meta: 'Reúna {n} tipos de material', metas: [3, 8, 15, 25, 40], progresso: (f) => Object.values(f.inventario ?? {}).filter((q) => q > 0).length },
  // Comunidade
  { id: 'guildaDias', nome: 'Membro de guilda', categoria: 'comunidade', meta: 'Fique {n} dias em uma guilda', metaDeUm: 'Fique 1 dia em uma guilda', metas: [1, 7, 30, 90, 180], progresso: (f) => diasDesde(f.guildaDesde) },
  { id: 'contratos', nome: 'Contratos', categoria: 'comunidade', meta: 'Conclua {n} contratos de guilda', metaDeUm: 'Conclua 1 contrato de guilda', metas: [1, 10, 40, 120, 300], progresso: contador('contratosDeGuilda') },
  { id: 'incursoes', nome: 'Incursões', categoria: 'comunidade', meta: 'Faça {n} incursões de guilda', metaDeUm: 'Faça 1 incursão de guilda', metas: [1, 5, 20, 60, 150], progresso: contador('incursoesDeGuilda') },
  // o histórico guarda só as últimas 4 semanas: vale o maior entre ele e o contador
  { id: 'chefeDaGuilda', nome: 'Chefe da guilda', categoria: 'comunidade', meta: 'Lute em {n} chefes semanais de guilda', metaDeUm: 'Lute em 1 chefe semanal de guilda', metas: [1, 3, 8, 20, 50], progresso: (f) => Math.max(f.estatisticas?.semanasDeChefeDeGuilda ?? 0, f.chefeSemanal?.length ?? 0) },
  { id: 'pesquisa', nome: 'Pesquisa', categoria: 'comunidade', meta: 'Contribua com {n} pesquisas da guilda', metaDeUm: 'Contribua com 1 pesquisa da guilda', metas: [1, 5, 20, 60, 150], progresso: contador('doacoesDePesquisa') },
  { id: 'party', nome: 'Em grupo', categoria: 'comunidade', meta: 'Jogue {n} lutas em party', metaDeUm: 'Jogue 1 luta em party', metas: [1, 10, 40, 120, 300], progresso: contador('lutasEmParty') },
  { id: 'vendas', nome: 'Comerciante', categoria: 'comunidade', meta: 'Venda {n} itens no Mercado', metaDeUm: 'Venda 1 item no Mercado', metas: [1, 5, 20, 60, 150], progresso: contador('vendasNoMercado') },
  { id: 'compras', nome: 'Cliente', categoria: 'comunidade', meta: 'Compre {n} itens no Mercado', metaDeUm: 'Compre 1 item no Mercado', metas: [1, 5, 20, 60, 150], progresso: contador('comprasNoMercado') },
  { id: 'correio', nome: 'Correio', categoria: 'comunidade', meta: 'Resgate {n} presentes do Correio', metaDeUm: 'Resgate 1 presente do Correio', metas: [1, 10, 40, 120, 300], progresso: contador('presentesDoCorreio') },
  { id: 'armeiro', nome: 'Armeiro', categoria: 'forja', meta: 'Fabrique {n} armas', metaDeUm: 'Fabrique 1 arma', metas: [1, 5, 20, 60, 150], progresso: contador('armasForjadas') },
  { id: 'armadureiro', nome: 'Armadureiro', categoria: 'forja', meta: 'Fabrique {n} armaduras', metaDeUm: 'Fabrique 1 armadura', metas: [1, 5, 20, 60, 150], progresso: contador('armadurasForjadas') },
  { id: 'reforjas', nome: 'Reforjas', categoria: 'forja', meta: 'Reforje itens {n} vezes', metaDeUm: 'Reforje um item 1 vez', metas: [1, 10, 40, 120, 300], progresso: contador('reforjas') },
  { id: 'fusaoDeEmblemas', nome: 'Fusão de emblemas', categoria: 'forja', meta: 'Funda {n} emblemas', metaDeUm: 'Funda 1 emblema', metas: [1, 5, 20, 50, 120], progresso: contador('emblemasFundidos') },
  { id: 'maoDeObra', nome: 'Mão de obra', categoria: 'forja', meta: 'Gaste {n} de ouro na Forja', metas: [1000, 20000, 200000, 2000000, 20000000], progresso: contador('ouroNaForja') },
  { id: 'fornalha', nome: 'Fornalha', categoria: 'forja', meta: 'Gaste {n} materiais na Forja', metas: [10, 100, 500, 2000, 8000], progresso: contador('materiaisNaForja') },
  // Mundo aberto
  { id: 'expedicao', nome: 'Expedição', categoria: 'mundo', meta: 'Colete {n} expedições', metaDeUm: 'Colete 1 expedição', metas: [1, 10, 50, 150, 500], progresso: contador('expedicoes'), titulo: 'explorador-incansavel', comAvancos: true },
  { id: 'buscas', nome: 'Buscas', categoria: 'mundo', meta: 'Faça {n} buscas', metas: [10, 50, 200, 500, 1000], progresso: contador('buscas'), comAvancos: true },
  { id: 'baus', nome: 'Caçador de baús', categoria: 'mundo', meta: 'Abra {n} baús do mundo', metas: [3, 10, 30, 60, 100], progresso: (f) => f.campanha?.baus?.length ?? 0 },
  { id: 'cenas', nome: 'Contador de histórias', categoria: 'mundo', meta: 'Veja {n} cenas', metaDeUm: 'Veja 1 cena', metas: [1, 5, 15, 30, 60], progresso: (f) => f.campanha?.cenas?.length ?? 0 },
  {
    id: 'missoesCampanha',
    nome: 'Missões da Campanha',
    categoria: 'mundo',
    meta: 'Conclua {n} missões da Campanha',
    metaDeUm: 'Conclua 1 missão da Campanha',
    metas: [1, 5, 15, 30, 60],
    progresso: (f) => Object.values(f.campanha?.missoes ?? {}).filter((m) => m.estado === 'concluida').length,
  },
  // Provações
  { id: 'torre', nome: 'Torre Celestial', categoria: 'provacoes', meta: 'Vença o andar {n}', metas: [10, 50, 100, 200, 300], progresso: (f) => f.torreAndar ?? 0, titulo: 'conquistador-da-torre' },
  { id: 'guerreiro', nome: 'Provação do Guerreiro', categoria: 'provacoes', meta: 'Vença {n} dificuldades', metaDeUm: 'Vença 1 dificuldade', metas: [1, 3, 5, 8, 10], progresso: (f) => f.guerreiroVencidas?.length ?? 0, titulo: 'mestre-guerreiro' },
  { id: 'batalhaSangrenta', nome: 'Batalha Sangrenta', categoria: 'provacoes', meta: 'Vença {n} dificuldades', metaDeUm: 'Vença 1 dificuldade', metas: [1, 2, 3, 4, 5], progresso: (f) => f.batalhaSangrentaVencidas?.length ?? 0, titulo: 'sanguinario' },
  { id: 'testeEquipe', nome: 'Teste de Equipe', categoria: 'provacoes', meta: 'Conclua {n} testes', metaDeUm: 'Conclua 1 teste', metas: [1, 3, 6, 12, TOTAL_DE_TESTES], progresso: (f) => f.testeEquipeConcluidas?.length ?? 0, titulo: 'provado-em-equipe' },
  { id: 'chefeMundial', nome: 'Chefe Mundial', categoria: 'provacoes', meta: 'Lute em {n} dias', metaDeUm: 'Lute em 1 dia', metas: [1, 5, 15, 30, 60], progresso: contador('diasDeChefeMundial'), titulo: 'cacador-de-soberanos' },
  {
    id: 'provacoesDiferentes',
    nome: 'Provado em tudo',
    categoria: 'provacoes',
    meta: 'Vença em {n} Provações diferentes',
    metaDeUm: 'Vença em 1 Provação',
    metas: [1, 2, 3, 4, 5],
    progresso: (f) =>
      [(f.torreAndar ?? 0) > 0, (f.guerreiroVencidas?.length ?? 0) > 0, (f.batalhaSangrentaVencidas?.length ?? 0) > 0, (f.testeEquipeConcluidas?.length ?? 0) > 0, (f.estatisticas?.diasDeChefeMundial ?? 0) > 0].filter(Boolean).length,
  },
  { id: 'abismo', nome: 'Selos do Abismo', categoria: 'provacoes', meta: 'Reúna {n} Selos do Abismo', metaDeUm: 'Reúna 1 Selo do Abismo', metas: [1, 5, 15, 30, 60], progresso: (f) => f.selosDoAbismo ?? 0 },
  { id: 'golpeDeSoberano', nome: 'Golpe de soberano', categoria: 'provacoes', meta: 'Cause {n} de dano em Chefes Mundiais (a soma do seu melhor de cada dia)', metas: [1000, 50000, 500000, 5000000, 50000000], progresso: contador('danoNoChefeMundial') },
  { id: 'destaqueMundial', nome: 'Destaque', categoria: 'provacoes', meta: 'Fique no Top 10 de {n} Chefes Mundiais', metaDeUm: 'Fique no Top 10 de 1 Chefe Mundial', metas: [1, 3, 6, 12, 24], progresso: contador('topsDoChefeMundial') },
  { id: 'sedeDeSangue', nome: 'Sede de sangue', categoria: 'provacoes', meta: 'Vença a Batalha Sangrenta {n} vezes', metaDeUm: 'Vença a Batalha Sangrenta 1 vez', metas: [1, 10, 40, 120, 300], progresso: contador('vitoriasBatalhaSangrenta') },
  { id: 'duelista', nome: 'Duelista', categoria: 'provacoes', meta: 'Vença o Guerreiro {n} vezes', metaDeUm: 'Vença o Guerreiro 1 vez', metas: [1, 10, 40, 120, 300], progresso: contador('vitoriasDoGuerreiro') },
  { id: 'chavesDaProvacao', nome: 'Chaves da Provação', categoria: 'provacoes', meta: 'Use {n} chaves de Provação', metaDeUm: 'Use 1 chave de Provação', metas: [1, 5, 20, 60, 150], progresso: contador('chavesDeProvacaoUsadas') },
  // PvP
  { id: 'gladiador', nome: 'Gladiador', categoria: 'pvp', meta: 'Lute {n} vezes no PvP', metas: [5, 30, 120, 400, 1000], progresso: contador('lutasPvp') },
  { id: 'vitoriasPvp', nome: 'Vitórias no PvP', categoria: 'pvp', meta: 'Vença {n} lutas no PvP', metaDeUm: 'Vença 1 luta no PvP', metas: [1, 10, 50, 200, 600], progresso: contador('vitoriasPvp') },
  { id: 'sequenciaPvp', nome: 'Sequência', categoria: 'pvp', meta: 'Vença {n} lutas seguidas no PvP', metas: [2, 3, 5, 8, 12], progresso: contador('maiorSequenciaPvp') },
  { id: 'zebra', nome: 'Zebra', categoria: 'pvp', meta: 'Vença {n} jogadores de nível maior', metaDeUm: 'Vença 1 jogador de nível maior', metas: [1, 5, 20, 60, 150], progresso: contador('vitoriasContraNivelMaior') },
  { id: 'todasAsVocacoes', nome: 'Todas as vocações', categoria: 'pvp', meta: 'Vença jogadores de {n} vocações diferentes', metaDeUm: 'Vença um jogador de 1 vocação', metas: [1, 3, 4, 5, 6], progresso: (f) => f.vocacoesDerrotadasPvp?.length ?? 0 },
  { id: 'danoPvp', nome: 'Dano em PvP', categoria: 'pvp', meta: 'Cause {n} de dano no PvP', metas: [5000, 100000, 1000000, 10000000, 100000000], progresso: contador('danoPvp') },
  { id: 'virada', nome: 'Virada', categoria: 'pvp', meta: 'Vença {n} lutas de PvP com menos de 10% de vida', metaDeUm: 'Vença 1 luta de PvP com menos de 10% de vida', metas: [1, 5, 20, 60, 150], progresso: contador('viradasPvp') },
  { id: 'ranqueadaPontos', nome: 'Ranqueada', categoria: 'pvp', meta: 'Chegue a {n} pontos na Arena ranqueada', metas: [250, 700, 1350, 2200, 2700], progresso: contador('maiorPontuacaoRanqueada') },
  { id: 'arenaSemanas', nome: 'Prêmio da Arena', categoria: 'pvp', meta: 'Receba o prêmio de {n} semanas da Arena', metaDeUm: 'Receba o prêmio de 1 semana da Arena', metas: [1, 3, 8, 20, 50], progresso: (f) => semanasPremiadas(f.arena) },
  { id: 'ranqueadaSemanas', nome: 'Prêmio da Ranqueada', categoria: 'pvp', meta: 'Receba o prêmio de {n} semanas da Ranqueada', metaDeUm: 'Receba o prêmio de 1 semana da Ranqueada', metas: [1, 3, 8, 20, 50], progresso: (f) => semanasPremiadas(f.ranqueada) },
  { id: 'campeonatos', nome: 'Campeonatos', categoria: 'pvp', meta: 'Participe de {n} campeonatos', metaDeUm: 'Participe de 1 campeonato', metas: [1, 2, 4, 8, 16], progresso: (f) => f.campeonatos?.length ?? 0 },
  { id: 'campeonatosVencidos', nome: 'Campeão', categoria: 'pvp', meta: 'Vença {n} campeonatos', metaDeUm: 'Vença 1 campeonato', metas: [1, 2, 3, 5, 10], progresso: (f) => f.campeonatosVencidos ?? 0 },
];

export const CONQUISTA_MAP: Readonly<Record<string, Conquista>> = Object.fromEntries(CONQUISTAS.map((c) => [c.id, c]));

export const textoDaMeta = (c: Conquista, degrau: number) =>
  c.metas[degrau] === 1 && c.metaDeUm ? c.metaDeUm : c.meta.replace('{n}', c.metas[degrau].toLocaleString('pt-BR'));

// ---------------------------------------------------------------------------------------------------------------
// Recompensas
// ---------------------------------------------------------------------------------------------------------------

export interface RecompensaDeConquista {
  diamantes: number;
  selos: Partial<Record<SeloDeBusca, number>>;
  avancosDeExpedicao: number;
  titulo?: string;
}

/** Recompensas bem menores que as de antes (3/5/10/20/40 Diamantes e selos grandes): proposta aprovada em 06/11/2026. */
const DIAMANTES_POR_DEGRAU = [1, 1, 2, 3, 5] as const;
const SELOS_POR_DEGRAU: readonly Partial<Record<SeloDeBusca, number>>[] = [{}, {}, {}, { desgastado: 2 }, { encantado: 1 }];
const AVANCOS_POR_DEGRAU = [1, 1, 1, 2, 3] as const;

/**
 * A recompensa de um degrau (0 a 4): Diamantes que crescem com o degrau e, nos dois últimos, selos. A Expedição e as
 * Buscas dão Avanços de expedição em todos os degraus (e os selos só do 4º em diante). O último degrau dá o título.
 */
export function recompensaDoDegrau(c: Conquista, degrau: number): RecompensaDeConquista {
  const selos = { ...SELOS_POR_DEGRAU[degrau] };
  return {
    diamantes: DIAMANTES_POR_DEGRAU[degrau],
    selos,
    avancosDeExpedicao: c.comAvancos ? AVANCOS_POR_DEGRAU[degrau] : 0,
    ...(degrau === DEGRAUS - 1 && c.titulo ? { titulo: c.titulo } : {}),
  };
}

/** Soma recompensas (para resgatar vários degraus de uma vez). */
export function somarRecompensas(lista: readonly RecompensaDeConquista[]): RecompensaDeConquista & { titulos: string[] } {
  const total = { diamantes: 0, selos: {} as Partial<Record<SeloDeBusca, number>>, avancosDeExpedicao: 0, titulos: [] as string[] };
  for (const r of lista) {
    total.diamantes += r.diamantes;
    total.avancosDeExpedicao += r.avancosDeExpedicao;
    for (const [s, q] of Object.entries(r.selos) as [SeloDeBusca, number][]) total.selos[s] = (total.selos[s] ?? 0) + q;
    if (r.titulo) total.titulos.push(r.titulo);
  }
  return total;
}

// ---------------------------------------------------------------------------------------------------------------
// O que fica no personagem
// ---------------------------------------------------------------------------------------------------------------

/** Quantos degraus de cada conquista o jogador já resgatou. */
export type ConquistasDoJogador = Record<string, number>;

const inteiroPositivo = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function conquistasDoDocumento(bruto: unknown): ConquistasDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const saida: ConquistasDoJogador = {};
  for (const [id, v] of Object.entries(bruto as Record<string, unknown>)) {
    const n = Math.min(DEGRAUS, inteiroPositivo(v));
    if (CONQUISTA_MAP[id] && n) saida[id] = n;
  }
  return Object.keys(saida).length ? saida : undefined;
}

/** Quantos monstros derrotados guardamos por personagem (o documento do banco tem tamanho máximo). */
export const MAXIMO_DE_MONSTROS_DERROTADOS = 1000;

/** Lê do banco as vocações já derrotadas no PvP: só textos curtos, sem repetir, no máximo 12. */
export function vocacoesDerrotadasDoDocumento(bruto: unknown): string[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = [...new Set(bruto.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 40))].slice(0, 12);
  return lista.length ? lista : undefined;
}

/** Lê do banco a lista de monstros derrotados: só textos, sem repetir e dentro do limite. */
export function monstrosDerrotadosDoDocumento(bruto: unknown): string[] | undefined {
  if (!Array.isArray(bruto)) return undefined;
  const lista = [...new Set(bruto.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 80))].slice(0, MAXIMO_DE_MONSTROS_DERROTADOS);
  return lista.length ? lista : undefined;
}

export function estatisticasDoDocumento(bruto: unknown): EstatisticasDoJogador | undefined {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return undefined;
  const o = bruto as Record<string, unknown>;
  const saida: EstatisticasDoJogador = {};
  for (const c of CONTADORES) {
    const n = inteiroPositivo(o[c]);
    if (n) saida[c] = n;
  }
  return Object.keys(saida).length ? saida : undefined;
}

/** Soma aos totais do jogador (devolve um objeto novo). */
export function somarEstatisticas(atuais: EstatisticasDoJogador | undefined, ganhos: Partial<Record<Contador, number>>): EstatisticasDoJogador {
  const novas: EstatisticasDoJogador = { ...(atuais ?? {}) };
  for (const [c, n] of Object.entries(ganhos) as [Contador, number][]) if (n > 0) novas[c] = (novas[c] ?? 0) + Math.floor(n);
  return novas;
}

/** Degraus batidos de uma conquista (0 a 5), pela meta. */
export const degrausBatidos = (c: Conquista, progresso: number) => c.metas.filter((m) => progresso >= m).length;

/** Quantos degraus estão prontos para resgatar em todas as conquistas (o ponto do Menu). */
export function degrausProntos(f: FichaDeConquistas, resgatados: ConquistasDoJogador | undefined): number {
  return CONQUISTAS.reduce((t, c) => t + Math.max(0, degrausBatidos(c, c.progresso(f)) - (resgatados?.[c.id] ?? 0)), 0);
}

/** A recompensa de um degrau em partes curtas, para a tela. */
export function textoDaRecompensaDeConquista(r: RecompensaDeConquista): string[] {
  const partes: string[] = [];
  if (r.diamantes) partes.push(`${r.diamantes} Diamantes`);
  for (const [s, q] of Object.entries(r.selos) as [SeloDeBusca, number][]) partes.push(`${q}× ${NOME_DO_SELO[s]}`);
  if (r.avancosDeExpedicao) partes.push(`${r.avancosDeExpedicao} ${r.avancosDeExpedicao === 1 ? 'Avanço' : 'Avanços'} de expedição`);
  if (r.titulo) partes.push(`Título: ${TITULO_MAP[r.titulo]?.nome ?? r.titulo}`);
  return partes;
}

/** As 4 conquistas mais avançadas (mais degraus resgatados), para a vitrine do perfil. */
export function conquistasEmDestaque(resgatados: ConquistasDoJogador | undefined): { nome: string; degraus: number }[] {
  return CONQUISTAS.map((c) => ({ nome: c.nome, degraus: Math.min(DEGRAUS, resgatados?.[c.id] ?? 0) }))
    .filter((c) => c.degraus > 0)
    .sort((a, b) => b.degraus - a.degraus)
    .slice(0, 4);
}
