#!/usr/bin/env bash
# =============================================================================
# 🚀 OPENCLINIC - SETUP WRAPPER (BASH / LINUX / MACOS)
# =============================================================================
# Executa o assistente multiplataforma de setup do desenvolvedor.
# Uso: ./setup.sh [--quickstart] [--demo] [--stop] [--secrets]
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/scripts/setup.mjs" "$@"
