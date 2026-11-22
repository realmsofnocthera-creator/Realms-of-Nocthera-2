# Créditos e origem do áudio (pacote v0.6)

## Direitos
Declaração do dono do projeto (Yuri, em conversa de desenvolvimento): os direitos de todo o áudio do jogo são de **Yuri Ramos Leal / Realms of Nocthera**.

## Origem de cada grupo
| Arquivos | Origem |
|---|---|
| `public/audio/interface`, `combate`, `elementos`, `stingers` (107 sons, sem os de música) | Sintetizados por script (`gerar_audio.py` e `gerar_combate_stingers.py`, do pacote de áudio v0.6, semente fixa). Sem material de terceiros. |
| `public/audio/musica/musica_*.m4a` (o tema do menu e as outras 11 faixas) | Enviadas pelo dono do projeto. |

## Nota de proveniência (guarde)
Os MP3 originais das músicas trazem, no próprio arquivo, Content Credentials (C2PA) do Google dizendo que foram geradas com IA generativa do Google (marca d'água SynthID). O pacote de áudio verificou isso em 3 arquivos (menu, `gemini_music` e `vis_fati`). Por isso:
- **Guarde os MP3 originais** e a prova da conta/plano usados na geração, junto com os termos de serviço vigentes na data. Os arquivos `.m4a` do jogo não carregam esse metadado.
- Lojas como a Steam pedem para declarar conteúdo gerado por IA: confira a regra da loja onde for publicar.
- A proteção por direitos autorais de obra gerada por IA varia por país; isto não é aconselhamento jurídico.

## Preparação para o jogo
Um só formato (M4A/AAC, 96 kbps; o tema do menu foi regerado a 96 kbps direto do MP3 original), sem metadados, com `faststart`. A faixa `gemini_music` não é usada. As faixas são baixadas uma por vez, só quando a tela precisa.
