import backgroundHubImg from './images/hud/background-hub.png';
import avatarPersonagemImg from './images/hud/avatar-personagem.png';
import molduraPerfilImg from './images/hud/moldura-perfil.png';

import ouroIcon from './icons/hud/ouro.png';
import diamanteIcon from './icons/hud/diamante.png';
import notificacaoIcon from './icons/hud/notificacao.png';
import configuracoesIcon from './icons/hud/configuracoes.png';
import mailIcon from './icons/hud/mail.png';
import menuArenaIcon from './icons/hud/menu-arena.png';
import menuProvacoesIcon from './icons/hud/menu-provacoes.png';
import menuGuildaIcon from './icons/hud/menu-guilda.png';
import menuLojaIcon from './icons/hud/menu-loja.png';
import menuPersonagemIcon from './icons/hud/menu-personagem.png';
import menuMenuIcon from './icons/hud/menu-menu.png';
import menuEventosIcon from './icons/hud/menu-eventos.png';
import menuHistoriaIcon from './icons/hud/menu-historia.png';
import menuPasseBatalhaIcon from './icons/hud/menu-passe-batalha.png';

type ImportedAsset = string | { src: string };

function resolveAssetSrc(imported: ImportedAsset, publicFallback: string): string {
  if (!imported) return publicFallback;
  if (typeof imported === 'string') return imported;
  if (typeof imported === 'object' && typeof imported.src === 'string') {
    return imported.src;
  }
  return publicFallback;
}

export const HUD_IMAGES = {
  backgroundHub: resolveAssetSrc(backgroundHubImg, '/images/hud/background-hub.png'),
  avatarPersonagem: resolveAssetSrc(avatarPersonagemImg, '/images/hud/avatar-personagem.png'),
  molduraPerfil: resolveAssetSrc(molduraPerfilImg, '/images/hud/moldura-perfil.png'),
} as const;

export const HUD_ICONS = {
  ouro: resolveAssetSrc(ouroIcon, '/icons/hud/ouro.png'),
  diamante: resolveAssetSrc(diamanteIcon, '/icons/hud/diamante.png'),
  notificacao: resolveAssetSrc(notificacaoIcon, '/icons/hud/notificacao.png'),
  configuracoes: resolveAssetSrc(configuracoesIcon, '/icons/hud/configuracoes.png'),
  mail: resolveAssetSrc(mailIcon, '/icons/hud/mail.png'),
  menuArena: resolveAssetSrc(menuArenaIcon, '/icons/hud/menu-arena.png'),
  menuProvacoes: resolveAssetSrc(menuProvacoesIcon, '/icons/hud/menu-provacoes.png'),
  menuGuilda: resolveAssetSrc(menuGuildaIcon, '/icons/hud/menu-guilda.png'),
  menuLoja: resolveAssetSrc(menuLojaIcon, '/icons/hud/menu-loja.png'),
  menuPersonagem: resolveAssetSrc(menuPersonagemIcon, '/icons/hud/menu-personagem.png'),
  menuMenu: resolveAssetSrc(menuMenuIcon, '/icons/hud/menu-menu.png'),
  menuEventos: resolveAssetSrc(menuEventosIcon, '/icons/hud/menu-eventos.png'),
  menuHistoria: resolveAssetSrc(menuHistoriaIcon, '/icons/hud/menu-historia.png'),
  menuPasseBatalha: resolveAssetSrc(menuPasseBatalhaIcon, '/icons/hud/menu-passe-batalha.png'),
} as const;
