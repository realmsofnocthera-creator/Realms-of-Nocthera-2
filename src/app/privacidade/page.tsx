import type { Metadata } from 'next';
import { PaginaLegal } from '@/components/login/PaginaLegal';
import { POLITICA_DE_PRIVACIDADE } from '@/content/privacidade';

export const metadata: Metadata = { title: 'Política de Privacidade · Realms of Nocthera' };

export default function PrivacidadePage() {
  return <PaginaLegal titulo="Política de Privacidade" secoes={POLITICA_DE_PRIVACIDADE} />;
}
