# fal MCP remoto (OAuth no navegador)

Servidor: `https://mcp.fal.ai/mcp-relay` · configurado no repositório em `.mcp.json` (apenas a URL; **nenhuma chave** no código).

## Estado verificado (12/11/2026)
- O host `mcp.fal.ai` foi liberado na allowlist de rede do ambiente (única mudança de rede; pedido e aprovado).
- `POST /mcp-relay` sem credencial → **HTTP 401** com `WWW-Authenticate: Bearer resource_metadata=".../oauth-protected-resource/mcp-relay"`.
- Metadados OAuth: servidor de autorização `https://authkit.fal.ai`, escopos `openid profile email offline_access`.
- **Não foi autenticado** (o login é do usuário) e **nenhuma ferramenta fal apareceu na sessão**. Nada foi gerado nem cobrado.

## Como autenticar (você, no navegador)
**Cloud (claude.ai/code)** — o contêiner não consegue abrir navegador, então use um conector:
1. https://claude.ai/customize/connectors → **Adicionar conector personalizado** → URL `https://mcp.fal.ai/mcp-relay`.
2. **Conectar** → login/consentimento do fal no navegador (OAuth).
3. Inicie uma **nova sessão** (conectores são lidos quando a sessão começa) e peça `diagnostico`.

**Claude Code local (terminal)** — o `.mcp.json` já aponta para o servidor:
1. Abra o projeto, rode `/mcp`, escolha **fal** → **Authenticate** → o navegador abre o login do fal.
2. Alternativa: `claude mcp add --transport http fal https://mcp.fal.ai/mcp-relay` e depois `/mcp`.

Os tokens OAuth ficam no seu cliente/conector, **nunca** no repositório. Se aparecer pedido para colar uma chave, é caminho errado: recuse.

## Custo e uso pelo estúdio
- As ferramentas de geração do fal **cobram créditos**. Pela política do estúdio (`nocthera-art-direction`, seção 4) pergunto antes de **cada** geração/lote e informo o que será gerado.
- Depois do OAuth: gerar a imagem pelo MCP → salvar em `studio/assets/entrada/<id>.png` → `gerar <briefing>` (provedor `manual`) → `origem <id> --tipo modelo` → auditar e revisar.
- Rede: a chamada ao fal MCP pelo conector do claude.ai é feita pelos servidores da Anthropic, não pelo contêiner; a liberação de `mcp.fal.ai` só serve a sondas do contêiner (`diagnostico`). Se o cliente do contêiner tentar usar `.mcp.json` diretamente, o login por navegador não conclui em ambiente sem navegador — por isso o caminho do conector.

## Para reverter
Remova `mcp.fal.ai` da allowlist do ambiente (Configurações → Ambientes) e apague `.mcp.json`.
