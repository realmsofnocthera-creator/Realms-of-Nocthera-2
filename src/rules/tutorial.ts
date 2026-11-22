import { mapaDeEntradas } from '@/lib/mapaSeguro';
/**
 * O tutorial (do nível 1 ao 25): capítulos que aparecem quando o jogador chega ao nível de cada modo. Cada passo mostra um texto e, quando tem
 * `alvo`, destaca na tela onde tocar (o elemento com `data-tutorial="<alvo>"`). Um passo `tocar` só avança quando o jogador toca no destaque (é o
 * caminho de verdade: ele mesmo abre a tela seguinte); os outros avançam no botão "Próximo". O jogador pode pular um capítulo ou todos.
 * Os textos são proposta do Claude, a confirmar pelo Yuri.
 */
export interface PassoDoTutorial {
  /** O começo do caminho da tela em que o passo aparece ("/hub", "/cacada"...); '*' em qualquer tela. */
  rota: string;
  titulo: string;
  texto: string;
  /** O elemento destacado (data-tutorial). Sem alvo, o texto aparece no meio da tela. */
  alvo?: string;
  /** Só avança quando o jogador toca no destaque. */
  tocar?: boolean;
}

export interface CapituloDoTutorial {
  id: string;
  /** O nível em que o capítulo aparece. */
  nivel: number;
  nome: string;
  /** Capítulo de contexto: só aparece quando este elemento está na tela (a primeira luta), sem esperar a fila. */
  quando?: string;
  passos: readonly PassoDoTutorial[];
}

/** Os passos para abrir uma provação a partir do Hub. */
const abrirProvacao = (id: string, nome: string, texto: string): PassoDoTutorial[] => [
  { rota: '/hub', alvo: 'hub-provacoes', tocar: true, titulo: `${nome} liberada!`, texto: `${texto} Toque em Provações para ir até ela.` },
  { rota: '/provacoes', alvo: `provacao-${id}`, tocar: true, titulo: nome, texto: 'Aqui ficam todas as Provações, em ordem de nível (vire as páginas do livro se não a encontrar). Toque nela para entrar.' },
];

export const CAPITULOS_DO_TUTORIAL: readonly CapituloDoTutorial[] = [
  {
    id: 'boas-vindas',
    nivel: 1,
    nome: 'Boas-vindas',
    passos: [
      { rota: '/hub', titulo: 'Bem-vindo a Nocthera!', texto: 'Este guia mostra onde tocar e o que cada modo faz, conforme você sobe de nível (até o 25). Você pode pular um tutorial, ou todos, a qualquer momento.' },
      { rota: '/hub', alvo: 'hub-perfil', titulo: 'Seu retrato', texto: 'Toque no retrato para ver o seu perfil e trocar o avatar, o título e a moldura. Ao lado ficam o nível e a barra de XP: vencer lutas dá XP, e cada nível abre coisas novas.' },
      { rota: '/hub', alvo: 'hub-ouro', titulo: 'Ouro e Diamantes', texto: 'O ouro compra e forja equipamentos. Os Diamantes, logo ao lado, são a moeda rara: vêm das missões, das conquistas e das provações.' },
      { rota: '/hub', alvo: 'hub-correio', titulo: 'Correio', texto: 'As recompensas de ranking, eventos e do Mestre chegam pelo Correio. Cada mensagem fica 30 dias: resgate antes que suma.' },
      { rota: '/hub', alvo: 'hub-missoes', titulo: 'Missões', texto: 'Missões diárias e semanais: cada uma concluída enche o baú, que dá Diamantes.' },
      { rota: '/hub', alvo: 'hub-personagem', tocar: true, titulo: 'Sua ficha', texto: 'Em Personagem ficam seus atributos, equipamentos e habilidades. Toque para abrir.' },
    ],
  },
  {
    id: 'ficha',
    nivel: 1,
    nome: 'A ficha',
    passos: [
      { rota: '/personagem', titulo: 'A ficha do personagem', texto: 'Aqui você vê tudo do seu herói: vida, sobreescudo, dano e defesa.' },
      { rota: '/personagem', alvo: 'ficha-abas', titulo: 'As abas', texto: 'Cada aba mostra uma parte: o personagem, os equipamentos, os emblemas e a Alma (as cartas, a partir do nível 25).' },
      { rota: '/personagem', alvo: 'ficha-desenvolvimento', titulo: 'Desenvolvimento', texto: 'A cada nível você ganha pontos de atributo: distribua aqui. Também ficam aqui o reforço e a ascensão das habilidades, as maestrias e, no nível 20, as subclasses.' },
      { rota: '/personagem', titulo: 'Pronto!', texto: 'Use a seta do canto para voltar ao Hub. No nível 2 abre a primeira Provação: a Caçada.' },
    ],
  },
  {
    id: 'combate',
    nivel: 1,
    nome: 'A luta',
    quando: 'combate-pronto',
    passos: [
      { rota: '*', titulo: 'A luta é automática', texto: 'Seu herói e o inimigo trocam golpes sozinhos, usando seus atributos, equipamentos e habilidades. Você acompanha e aprende com cada luta.' },
      { rota: '*', alvo: 'combate-inimigo', titulo: 'O inimigo', texto: 'A vida do inimigo (vermelha) e o sobreescudo (azul), que cai primeiro. Os ícones embaixo são os efeitos sobre ele (veneno, sangramento...).' },
      { rota: '*', alvo: 'combate-jogador', titulo: 'Você', texto: 'A sua vida e o seu sobreescudo. Se a vida zerar, você perde a luta e um pouco de ouro, e volta com a vida cheia.' },
      { rota: '*', alvo: 'combate-habilidades', titulo: 'Habilidades', texto: 'O número em cada ícone é quantos ataques faltam: a habilidade especial ativa a cada 3 ataques e a suprema a cada 7.' },
      { rota: '*', alvo: 'combate-controles', titulo: 'Velocidade', texto: 'O 2x acelera a luta e o outro botão pula direto para o resultado. Ao vencer: XP, ouro e materiais.' },
    ],
  },
  {
    id: 'cacada',
    nivel: 2,
    nome: 'Caçada',
    passos: [
      ...abrirProvacao('cacada', 'Caçada', 'A Caçada é onde você ganha XP, ouro e materiais para forjar.'),
      { rota: '/cacada', alvo: 'cacada-estrelas', titulo: 'As estrelas', texto: 'Os monstros vêm em 9 estrelas: cada estrela abre num nível e tem monstros mais fortes e melhores espólios.' },
      { rota: '/cacada', alvo: 'cacada-monstros', titulo: 'Os monstros', texto: 'Escolha um monstro para ver a ficha dele (vida, dano, fraquezas e espólios). O monstro-chave, com a coroa, abre a estrela seguinte quando vencido.' },
      { rota: '/cacada', alvo: 'cacada-cacar', titulo: 'Caçar', texto: 'Com o monstro escolhido, toque em Caçar para lutar. Boa caçada!' },
    ],
  },
  {
    id: 'menu',
    nivel: 2,
    nome: 'O Menu',
    passos: [
      { rota: '/hub', alvo: 'hub-menu', tocar: true, titulo: 'O Menu', texto: 'O Menu guarda o resto do jogo: mochila, forja, coleção, conquistas e mais. Toque para abrir.' },
      { rota: '/hub', alvo: 'menu-mochila', titulo: 'Mochila', texto: 'Os materiais, poções e itens que você ganhou.' },
      { rota: '/hub', alvo: 'menu-producao', titulo: 'Produção', texto: 'O Ferreiro e a Forja: fabrique armas e armaduras com os materiais da Caçada.' },
      { rota: '/hub', alvo: 'menu-checkin', titulo: 'Check-in', texto: 'Entre todo dia e marque o check-in: recompensas de 30 dias.' },
      { rota: '/hub', alvo: 'menu-conquistas', titulo: 'Conquistas', texto: 'Metas de todo o jogo, em 5 degraus. O último degrau de algumas dá um título, e as conquistas também liberam molduras.' },
      { rota: '/hub', alvo: 'menu-buscar', titulo: 'Buscar e Coleção', texto: 'Use selos de busca para encontrar colecionáveis; ativados, eles dão bônus permanentes.' },
    ],
  },
  {
    id: 'arena',
    nivel: 4,
    nome: 'Arena',
    passos: [
      { rota: '/hub', alvo: 'hub-combate', tocar: true, titulo: 'Arena liberada!', texto: 'A Arena é o PvP: lute contra a ficha de outros jogadores. Toque em Arena.' },
      { rota: '/combate', alvo: 'arena-modo-arena', titulo: 'Arena', texto: 'Duelos livres: 5 lutas grátis por dia (e mais 5 por Diamantes). Cada vitória dá pontos; o pódio da semana ganha prêmios.' },
      { rota: '/combate', alvo: 'arena-modo-ranqueada', titulo: 'Ranqueada', texto: '10 ranques, de Recruta a Eterno. O ranque em que você termina a semana dá recompensa, título e moldura.' },
      { rota: '/combate', alvo: 'arena-modo-campeonato', titulo: 'Campeonato', texto: 'A cada 15 dias, quem é Ascendente ou mais na Ranqueada entra sozinho numa chave automática. O campeão ganha o título e a moldura de Campeão de Nocthera.' },
    ],
  },
  {
    id: 'torre',
    nivel: 5,
    nome: 'Torre Celestial',
    passos: [
      ...abrirProvacao('torre-celestial', 'Torre Celestial', 'A Torre tem 300 andares para subir, um por vez.'),
      { rota: '/torre-celestial', titulo: 'Torre Celestial', texto: 'Cada andar vencido abre o próximo e dá recompensa; a cada 10 andares há um chefe. Não há limite por dia: suba até onde sua força deixar. O chat global também abriu no nível 5 (o balão no canto da tela).' },
    ],
  },
  {
    id: 'guilda-mercado',
    nivel: 10,
    nome: 'Guilda e Mercado',
    passos: [
      { rota: '/hub', alvo: 'hub-guilda', titulo: 'Guilda', texto: 'No nível 10 você pode criar uma guilda, ou entrar em uma: contratos diários, Incursões contra chefes, pesquisa e o chefe semanal.' },
      { rota: '/hub', alvo: 'hub-menu', titulo: 'Mercado', texto: 'No Menu, o card do Leilão leva ao Mercado: compre e venda itens com outros jogadores, por ouro ou Diamantes.' },
    ],
  },
  {
    id: 'guerreiro',
    nivel: 12,
    nome: 'Provação do Guerreiro',
    passos: [
      ...abrirProvacao('guerreiro', 'Provação do Guerreiro', 'A Provação do Guerreiro é a fonte dos emblemas.'),
      { rota: '/guerreiro', titulo: 'A mesa de tarô', texto: 'As 10 dificuldades são as cartas I a X, cada uma com um chefe e uma mecânica própria. Vencer dá emblemas: equipe-os na ficha para ganhar bônus.' },
    ],
  },
  {
    id: 'expedicao',
    nivel: 15,
    nome: 'Expedição',
    passos: [
      ...abrirProvacao('expedicao', 'Expedição', 'A Expedição trabalha por você enquanto você está fora.'),
      { rota: '/expedicao', titulo: 'Expedição', texto: 'Envie seu herói em missões de 2 a 12 horas (3 vagas) e recolha as recompensas na volta. Os Avanços de expedição adiantam o tempo: escolha na barra quantas horas.' },
    ],
  },
  {
    id: 'chefe-mundial',
    nivel: 18,
    nome: 'Chefe Mundial',
    passos: [
      ...abrirProvacao('chefe-mundial', 'Chefe Mundial', 'Um chefe por dia, o mesmo para todos os jogadores.'),
      { rota: '/chefe-mundial', titulo: 'Chefe Mundial', texto: 'O chefe não cai: vale o maior dano que você causar no dia, e você pode lutar quantas vezes quiser. À meia-noite o ranking fecha e as recompensas chegam pelo Correio.' },
    ],
  },
  {
    id: 'batalha-sangrenta',
    nivel: 20,
    nome: 'Batalha Sangrenta',
    passos: [
      ...abrirProvacao('batalha-sangrenta', 'Batalha Sangrenta', 'A Batalha Sangrenta é a fonte dos fragmentos de alma.'),
      { rota: '/batalha-sangrenta', titulo: 'Batalha Sangrenta', texto: '5 dificuldades: 4 lutas seguidas e o chefe no fim, com a vida passando de uma luta para a outra. 3 tentativas por dia.' },
    ],
  },
  {
    id: 'subclasses',
    nivel: 20,
    nome: 'Subclasses',
    passos: [
      { rota: '/hub', alvo: 'hub-personagem', tocar: true, titulo: 'Subclasses!', texto: 'No nível 20 sua classe pode escolher uma subclasse, com habilidades novas. Toque em Personagem.' },
      { rota: '/personagem', alvo: 'ficha-desenvolvimento', titulo: 'Subclasses', texto: 'Em Desenvolvimento, abra Subclasses para desbloquear e equipar a sua.' },
    ],
  },
  {
    id: 'teste-equipe',
    nivel: 25,
    nome: 'Teste de Equipe',
    passos: [
      ...abrirProvacao('teste-equipe', 'Teste de Equipe', 'O Teste de Equipe é a primeira luta em grupo.'),
      { rota: '/teste-equipe', titulo: 'Teste de Equipe', texto: 'Forme uma party de até 3 jogadores (sem precisar de guilda), escolha o teste (Alma, Corpo ou Mente) e a dificuldade. Cada um gasta 1 chave da provação; vencer dá cartas da Alma.' },
      { rota: '/teste-equipe', titulo: 'A Alma', texto: 'As cartas vão para a aba Alma da sua ficha: equipe-as para ganhar efeitos. Com isso, você conhece todo o jogo. Boa jornada, herói!' },
    ],
  },
];

export const CAPITULO_MAP: Readonly<Record<string, CapituloDoTutorial>> = mapaDeEntradas(CAPITULOS_DO_TUTORIAL.map((c) => [c.id, c]));
