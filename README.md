# Realms of Nocthera

RPG online de dark fantasy construído com Next.js e TypeScript.

O servidor é a fonte da verdade para o estado e as mecânicas; o navegador apenas apresenta os resultados visuais ao jogador. Nenhuma lógica de regras de jogo reside dentro de componentes React.

## Estrutura do Projeto

```text
├── src/
│   ├── app/                 # Páginas e rotas de API Next.js
│   │   ├── api/
│   │   │   ├── character/
│   │   │   │   ├── create/  # POST /api/character/create (validação server-side dos 10 pontos)
│   │   │   │   └── me/      # GET /api/character/me (recalcula HP/Mana via src/game/)
│   │   │   └── combat/
│   │   │       └── start/   # POST /api/combat/start (executa combate no servidor, level up e transações)
│   │   ├── globals.css      # Estilização global com Tailwind CSS
│   │   ├── layout.tsx       # Root layout e metadados
│   │   ├── login/           # /login: Cadastro, Login, Criação de Personagem e Arena de Combate
│   │   └── page.tsx         # Página inicial com título "Realms of Nocthera"
│   │
│   ├── components/          # Componentes visuais desacoplados
│   │   ├── CharacterCreateForm.tsx # Formulário de distribuição dos 7 atributos
│   │   ├── CharacterSheet.tsx      # Ficha de atributos e status derivados
│   │   ├── CombatArena.tsx         # Interface da arena com os 3 monstros e log de turnos
│   │   └── FirebaseInit.tsx        # Inicialização e verificação de conexão
│   │
│   ├── lib/                 # Utilitários e cliente Firebase
│   │   ├── firebase.ts      # Instância do Firebase, Auth (email/senha) e Firestore
│   │   └── utils.ts         # Funções utilitárias
│   │
│   ├── rules/               # Dados imutáveis e configurações de regras
│   │   ├── attributes.ts    # Definição dos 7 atributos canônicos
│   │   ├── config.ts        # Configurações do jogo e constantes sem números mágicos
│   │   ├── monsters.ts      # Definição dos 3 monstros de teste (fraco, equivalente, forte)
│   │   └── xpTable.ts       # Tabela de XP por nível (níveis 1 a 30)
│   │
│   ├── game/                # Funções puras com a lógica e mecânicas do jogo
│   │   ├── combat.ts        # Motor de combate puro (iniciativa, dano, turnos e resolução)
│   │   ├── index.ts         # Cálculos de HP, Mana, Sobreescudo, XP e dano
│   │   └── __tests__/       # Testes unitários com Vitest
│   │       ├── combat.test.ts # Testes do motor de combate, level up, morte e transações
│   │       └── game.test.ts   # Cobertura de atributos, XP, dano e mitigação
│   │
│   └── server/              # Serviços de negócio e validações server-side
│       ├── auth.ts          # Validação de ID Token Firebase
│       ├── characterService.ts # Regras de personagens, transações e recompensas pós-combate
│       └── __tests__/       # Testes unitários do servidor
│           └── character.test.ts # Validações de pontos, unicidade e HP/Mana
│
├── firebase-blueprint.json  # Esquema das coleções users, characters e transactions
├── firestore.rules          # Regras de segurança Firestore (Zero-Trust)
└── package.json             # Dependências e scripts
```

## Executando Testes Unitários

Para rodar a suíte de testes com o Vitest:

```bash
npm test
```
