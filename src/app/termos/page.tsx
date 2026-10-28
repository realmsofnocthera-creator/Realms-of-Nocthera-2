import type { Metadata } from 'next';
import { PaginaLegal } from '@/components/login/PaginaLegal';
import { TERMOS_DE_USO } from '@/content/termos';

export const metadata: Metadata = { title: 'Termos de Uso · Realms of Nocthera' };

export default function TermosPage() {
  return <PaginaLegal titulo="Termos de Uso" secoes={TERMOS_DE_USO} />;
}
