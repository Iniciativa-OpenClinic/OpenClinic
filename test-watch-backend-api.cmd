@echo off
setlocal

cd /d "%~dp0"

echo OpenClinic - Vitest watch (backend-api)
echo.

echo O terminal permanecera aberto monitorando os testes.
echo Para encerrar, pressione Ctrl+C.
echo.

docker run --rm ^
  --mount type=bind,source="%CD%",target=/app ^
  --mount type=volume,source=openclinic_test_node_modules,target=/app/node_modules ^
  -w /app ^
  node:22-alpine ^
  sh -c "npm run build -w packages/core && cd packages/backend-api && npx vitest --watch --config vitest.config.ts"

if errorlevel 1 (
  echo.
  echo O monitor de testes foi encerrado com erro.
  pause
)
