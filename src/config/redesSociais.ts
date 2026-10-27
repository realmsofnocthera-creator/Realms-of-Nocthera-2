/**
 * Redes sociais do rodapé da página inicial. Enquanto o `url` estiver vazio o botão aparece apagado, com "em breve".
 * Para ligar uma rede, é só colocar o endereço dela aqui.
 */
export interface RedeSocial {
  id: string;
  nome: string;
  url: string;
}

export const REDES_SOCIAIS: readonly RedeSocial[] = [
  { id: 'instagram', nome: 'Instagram', url: '' },
  { id: 'whatsapp', nome: 'WhatsApp', url: '' },
  { id: 'discord', nome: 'Discord', url: '' },
  { id: 'youtube', nome: 'YouTube', url: '' },
  { id: 'facebook', nome: 'Facebook', url: '' },
  { id: 'tiktok', nome: 'TikTok', url: '' },
];
