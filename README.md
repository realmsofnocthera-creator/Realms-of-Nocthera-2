# Realms of Nocthera

RPG online de dark fantasy construído com Next.js e TypeScript.

O servidor é a fonte da verdade para o estado e as mecânicas; o navegador apenas apresenta os resultados visuais ao jogador. Nenhuma lógica de regras de jogo reside dentro de componentes React.

## Estrutura do Projeto

```text
├── src/
│   ├── app/                 # Páginas (hub, personagem, desenvolvimento, combate, menu, provações, login) e rotas de API
│   │   └── api/
│   │       ├── character/   # create, me, public/[nome], avatar, sobre, atributos/{distribuir,resetar}, subclasse/escolher
│   │       └── combat/start # Combate resolvido no servidor (semente do servidor, combatId idempotente)
│   ├── components/          # Componentes visuais (HUD, ficha, desenvolvimento, skills, perfil, landing)
│   ├── lib/                 # Cliente Firebase (Auth e Firestore) e utilitários
│   ├── rules/               # Dados imutáveis: raças, classes, subclasses, monstros, elementos, XP, config
│   ├── game/                # Lógica pura do jogo
│   │   ├── combat.ts        # Motor de combate (iniciativa, dano, turnos, habilidades das classes)
│   │   └── combate/         # Efeitos genéricos e registro de habilidades de subclasse
│   └── server/              # Serviços de servidor
│       ├── auth.ts          # Validação do ID Token do Firebase (Admin SDK)
│       ├── persistence.ts   # Persistência: Firestore (produção, transações) e memória (só testes)
│       ├── characterService.ts # Regras de personagem, saldos, combate e subclasses
│       ├── combatSeed.ts    # Semente do combate (sempre gerada no servidor)
│       ├── rateLimit.ts     # Limite de requisições por conta e por IP
│       └── logger.ts        # Log estruturado
│
├── scripts/                 # dev.mjs, backfill-nomes.mjs (índice de nomes), otimizar-imagens.mjs
├── .github/workflows/ci.yml # CI: lint, tsc, testes, build e npm audit
├── firestore.rules          # Regras Firestore (cliente nunca escreve em characters/transactions)
└── package.json
```

## Segurança e dados

- **Autenticação única:** Firebase Auth (e-mail/senha e Google). O servidor valida o ID Token com o Admin SDK; não há segredo de sessão próprio. Habilite o provedor **E-mail/senha** no console do Firebase.
- **Fonte única de dados:** Firestore. Falha de leitura ou gravação vira erro (503) para o cliente.
- **Alterações atômicas:** cada mudança de personagem (saldo, combate, atributos, subclasse) é uma transação do Firestore; fluxos compostos usam também uma trava por uid (`locks/`).
- **Coleções só do servidor** (negadas pelas regras): `nomes/` (índice de nome único), `combates/` (semente e resposta de cada combate), `locks/`.
- **Contas anteriores ao índice de nomes:** rode uma vez `node scripts/backfill-nomes.mjs --aplicar` (sem a flag, apenas simula).

## Executando Testes Unitários

Para rodar a suíte de testes com o Vitest:

```bash
npm test
```
