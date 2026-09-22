# =============================================================================
# 🚀 OPENCLINIC - SETUP WRAPPER (POWERSHELL / WINDOWS)
# =============================================================================
# Executa o assistente multiplataforma de setup do desenvolvedor.
# Uso: .\setup.ps1 [-Quickstart] [-Demo] [-Stop] [-Secrets]
# =============================================================================

param (
    [switch]$Quickstart,
    [switch]$Demo,
    [switch]$Stop,
    [switch]$Secrets
)

$argsList = @()
if ($Quickstart) { $argsList += "--quickstart" }
if ($Demo) { $argsList += "--demo" }
if ($Stop) { $argsList += "--stop" }
if ($Secrets) { $argsList += "--secrets" }

node "$PSScriptRoot\scripts\setup.mjs" @argsList
