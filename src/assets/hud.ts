import backgroundHubImg from './images/hud/background-hub.webp';
import avatarPersonagemImg from './images/hud/avatar-personagem.png';
import molduraPerfilImg from './images/hud/moldura-perfil.png';

import ouroIcon from './icons/hud/ouro.png';
import diamanteIcon from './icons/hud/diamante.png';
import notificacaoIcon from './icons/hud/notificacao.png';
import configuracoesIcon from './icons/hud/configuracoes.png';
import mailIcon from './icons/hud/mail.png';
import menuArenaIcon from './icons/hud/menu-arena.webp';
import menuProvacoesIcon from './icons/hud/menu-provacoes.webp';
import menuGuildaIcon from './icons/hud/menu-guilda.webp';
import menuLojaIcon from './icons/hud/menu-loja.webp';
import menuPersonagemIcon from './icons/hud/menu-personagem.webp';
import menuMenuIcon from './icons/hud/menu-menu.webp';
import menuEventosIcon from './icons/hud/menu-eventos.png';
import menuHistoriaIcon from './icons/hud/menu-historia.webp';
import menuPasseBatalhaIcon from './icons/hud/menu-passe-batalha.png';
import { srcDaImagem } from '@/assets/srcDaImagem';

export const HUD_IMAGES = {
  backgroundHub: srcDaImagem(backgroundHubImg),
  avatarPersonagem: srcDaImagem(avatarPersonagemImg),
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
  menuPasseBatalha: srcDaImagem(menuPasseBatalhaIcon),
} as const;
