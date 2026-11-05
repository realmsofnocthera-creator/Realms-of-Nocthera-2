import backgroundHubImg from './images/hud/background-hub.webp';
import molduraPerfilImg from './images/hud/moldura-perfil.webp';

import ouroIcon from './icons/hud/ouro.webp';
import diamanteIcon from './icons/hud/diamante.webp';
import notificacaoIcon from './icons/hud/notificacao.webp';
import configuracoesIcon from './icons/hud/configuracoes.webp';
import mailIcon from './icons/hud/mail.webp';
import menuArenaIcon from './icons/hud/menu-arena.webp';
import menuProvacoesIcon from './icons/hud/menu-provacoes.webp';
import menuGuildaIcon from './icons/hud/menu-guilda.webp';
import menuLojaIcon from './icons/hud/menu-loja.webp';
import menuPersonagemIcon from './icons/hud/menu-personagem.webp';
import menuMenuIcon from './icons/hud/menu-menu.webp';
import menuEventosIcon from './icons/hud/menu-eventos.png';
import menuHistoriaIcon from './icons/hud/menu-historia.webp';
import menuMissoesIcon from './icons/hud/menu-missoes.webp';
import menuPasseBatalhaIcon from './icons/hud/menu-passe-batalha.webp';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const HUD_IMAGES = {
  backgroundHub: srcDaImagem(backgroundHubImg),
  molduraPerfil: srcDaImagem(molduraPerfilImg),
} as const;

export const HUD_ICONS = {
  ouro: srcDaImagem(ouroIcon),
  diamante: srcDaImagem(diamanteIcon),
  notificacao: srcDaImagem(notificacaoIcon),
  configuracoes: srcDaImagem(configuracoesIcon),
  mail: srcDaImagem(mailIcon),
  menuArena: srcDaImagem(menuArenaIcon),
  menuProvacoes: srcDaImagem(menuProvacoesIcon),
  menuGuilda: srcDaImagem(menuGuildaIcon),
  menuLoja: srcDaImagem(menuLojaIcon),
  menuPersonagem: srcDaImagem(menuPersonagemIcon),
  menuMenu: srcDaImagem(menuMenuIcon),
  menuEventos: srcDaImagem(menuEventosIcon),
  menuHistoria: srcDaImagem(menuHistoriaIcon),
  menuMissoes: srcDaImagem(menuMissoesIcon),
  menuPasseBatalha: srcDaImagem(menuPasseBatalhaIcon),
} as const;
