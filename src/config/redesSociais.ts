/**
 * Redes sociais do rodapé da página inicial. Enquanto o `url` estiver vazio o botão aparece apagado, com "em breve".
 * Os ícones (16×16, pixel art) estão em /images/redes/ e vêm do "Social Icons Pack" da Boxpix Studio (pacote grátis).
 * Os endereços abaixo vieram do Yuri; os parâmetros de rastreio dos links de compartilhamento foram removidos.
 */
export interface RedeSocial {
  id: string;
  nome: string;
  url: string;
}

export const REDES_SOCIAIS: readonly RedeSocial[] = [
  { id: 'instagram', nome: 'Instagram', url: 'https://www.instagram.com/realmsofnocthera' },
  { id: 'whatsapp', nome: 'WhatsApp', url: 'https://chat.whatsapp.com/JIet02GMOMV6xR9YXnzb57' },
  { id: 'discord', nome: 'Discord', url: 'https://discord.gg/rTPWZwUbG' },
  { id: 'youtube', nome: 'YouTube', url: 'https://youtube.com/@realmsofnocthera' },
  { id: 'facebook', nome: 'Facebook', url: 'https://www.facebook.com/share/1FaWiqKpdP/' },
  { id: 'tiktok', nome: 'TikTok', url: 'https://www.tiktok.com/@realms.of.nocther' },
];
