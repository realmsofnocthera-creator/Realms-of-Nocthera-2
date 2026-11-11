'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** A Alma agora é uma aba da ficha: quem chega pelo endereço antigo vai para a aba dela. */
export default function AlmaPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/personagem?aba=alma');
  }, [router]);
  return null;
}
