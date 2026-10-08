#!/usr/bin/env bash
# 0.5-C5 — Primeira camada de backup: agendamento nativo de backups do Firestore.
# Backup diário com retenção de 14 dias (a rotina completa de backup/restauração fecha na Etapa 9).
#
# Requer gcloud autenticado como dono/editor do projeto:
#   gcloud auth login
#   bash scripts/configurar-backup-firestore.sh
#
# Para restaurar um backup num banco novo:
#   gcloud firestore backups list --location=<local>
#   gcloud firestore databases restore --source-backup=<nome-do-backup> --destination-database=<novo-banco>
set -euo pipefail

CONFIG="$(dirname "$0")/../firebase-applet-config.json"
PROJETO="$(node -p "require('$CONFIG').projectId")"
BANCO="$(node -p "require('$CONFIG').firestoreDatabaseId")"

echo "Projeto: $PROJETO | Banco: $BANCO"
gcloud firestore backups schedules create \
  --project="$PROJETO" \
  --database="$BANCO" \
  --recurrence=daily \
  --retention=14d

gcloud firestore backups schedules list --project="$PROJETO" --database="$BANCO"
