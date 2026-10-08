# Realms of Nocthera

RPG online de dark fantasy construído com Next.js, TypeScript e Firebase.

O servidor é a fonte da verdade para o estado e as mecânicas; o navegador apenas apresenta os resultados visuais ao jogador. Nenhuma lógica de regras de jogo reside dentro de componentes React.

## Estrutura do Projeto

```text
├── .github/workflows/ci.yml   # CI: npm ci, audit, lint, tsc, testes e build em cada push/PR
├── scripts/
│   ├── dev.mjs                         # Servidor de desenvolvimento (npm run dev)
│   ├── configurar-backup-firestore.sh  # Agenda backup diário do Firestore
│   └── otimizar-imagens.mjs            # Converte imagens grandes para WebP no tamanho de uso
├── src/
│   ├── app/                   # Páginas e rotas de API (Next.js App Router)
│   │   ├── api/auth/logout/   # Revoga as sessões do usuário no servidor
│   │   ├── api/character/     # create, me, public/[nome], avatar, sobre, atributos, subclasse
│   │   ├── api/combat/start/  # Combate resolvido no servidor (semente do servidor, idempotente)
│   │   └── hub, login, menu, personagem, desenvolvimento, combate, provacoes
│   ├── assets/                # Imagens, ícones e fontes importados pelo bundler
│   ├── components/            # Componentes visuais (hud, ficha, desenvolvimento, perfil...)
│   ├── game/                  # Funções puras: motor de combate, atributos, efeitos, subclasses
│   ├── lib/                   # Cliente Firebase (Auth/Firestore), política de senha, utilitários
│   ├── rules/                 # Dados e configurações das regras (raças, classes, monstros, XP...)
│   ├── server/                # Código exclusivo do servidor
│   │   ├── auth.ts            # Valida o ID Token do Firebase (assinatura, expiração) e a revogação por logout (Firestore)
│   │   ├── characterService.ts# Regras de personagem; cada operação é uma transação
│   │   ├── persistencia/      # Repositório Firestore (transações, timeout, retry de leitura)
│   │   ├── rateLimit.ts       # Limite por IP e por conta com bloqueio progressivo (429)
│   │   ├── log.ts             # Log estruturado em JSON
│   │   └── combateSemente.ts  # Semente do combate gerada no servidor
│   ├── test/                  # Só para o Vitest: mocks do Firebase Admin e repositório em memória
│   └── theme/                 # Tema visual
├── firebase-applet-config.json # Configuração pública do app Firebase
├── firebase-blueprint.json     # Esquema das coleções
└── firestore.rules             # Regras de segurança do Firestore
```

## Dados no Firestore

| Coleção | Conteúdo | Quem escreve |
| --- | --- | --- |
| `users/{uid}` | e-mail e data de criação | cliente (só criação) |
| `characters/{uid}` | personagem | só o servidor |
| `transactions/{id}` | ganhos e gastos de ouro, diamantes e fragmentos | só o servidor |
| `nomes/{chave}` | índice de nome único do personagem | só o servidor |
| `combates/{uid}__{id}` | semente, entrada e resultado de cada combate | só o servidor |
| `revogacoes/{uid}` | instante do último logout no servidor (tokens de logins anteriores são recusados) | só o servidor |

## Desenvolvimento

```bash
npm ci          # instala exatamente o package-lock.json (npm é o único gerenciador)
npm run dev     # servidor de desenvolvimento
npm test        # testes (Vitest)
npm run lint    # ESLint
npm run build   # build de produção (falha com erro de tipo ou de lint)
```

O servidor usa o Firebase Admin SDK com Application Default Credentials (no Cloud Run isso já vem configurado; localmente use `gcloud auth application-default login`).

### Variáveis de ambiente opcionais

- `CSP_FRAME_ANCESTORS` — quem pode exibir o app num iframe (ex.: `'self'`). Sem ela, o header não é enviado, para não quebrar a pré-visualização do AI Studio.

## Passos únicos após o deploy da Etapa 0.5

1. No console do Firebase → Authentication → Sign-in method, deixar **E-mail/senha** e **Google** ativos (já estão).
2. Publicar as regras do Firestore (`firestore.rules`), com `firebase deploy --only firestore:rules` (já publicadas).
3. Agendar o backup diário: `bash scripts/configurar-backup-firestore.sh`

## Dados atuais são de teste

Tudo o que existe hoje no banco (contas, personagens, transações) é de teste e será **apagado no início da alfa**. Por isso não há migração das contas do antigo login próprio nem índice retroativo de nomes (`nomes/`): contas e personagens criados antes da Etapa 0.5 não são migrados. Depois da limpeza, tudo nasce já no formato novo (Firebase Auth, índice de nomes, registro de combates e revogação de sessão).
