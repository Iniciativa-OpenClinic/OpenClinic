# 📦 @openclinic/core

> Pacote fundacional compartilhado do ecossistema **OpenClinic**, contendo utilitários criptográficos de alta segurança, gestão de tokens JWT, catálogo de erros padronizados (RFC 7807 / OpenClinic), pooling de banco de dados e logger estruturado.

---

## 🏛 Visão Geral & Responsabilidades

O pacote `@openclinic/core` fornece primitivas reutilizáveis de baixo nível consumidas por todos os pacotes do monorepo (`backend-api`, `backend-cli`, etc.), garantindo que regras críticas de segurança e contratos de erro sejam consistentes.

```text
packages/core/
├── src/
│   ├── crypto/         # Hashing Argon2id, timingSafeEqual, SHA-256 tokens
│   ├── database/       # Pool PostgreSQL resiliente (postgres.js)
│   ├── errors/         # RFC 7807 Problem Details + Catálogo bilíngue OpenClinic (pt-BR / en-US)
│   ├── jwt/            # Emissão e validação de Access Tokens e Refresh Tokens
│   ├── logging/        # Logger estruturado em JSON de alta performance (Pino)
│   └── index.ts        # Ponto central de exportação pública
└── tsconfig.json
```

---

## 🛡 Invariantes de Segurança Implementadas

1. **Hashing de Senhas com Argon2id:**
   - Algoritmo resistente a ataques por GPU/ASIC (`timeCost: 3`, `memoryCost: 65536` (64MB), `parallelism: 4`).
   - Geração automática de salt criptográfico seguro.
2. **Prevenção de Timing Attacks:**
   - Uso obrigatório de `crypto.timingSafeEqual` para comparação de hashes e tokens sensíveis.
3. **Sessões e Refresh Tokens:**
   - Tokens de atualização são gerados como strings criptograficamente aleatórias e armazenados no banco de dados exclusivamente na forma de **hash SHA-256**.
4. **Hierarquia de Erros Padronizada (Padrão RFC 7807 (Problem Details)):**
   - Todas as exceções de domínio herdam de `AppError` e emitem um código semântico (`ErrorCode.AUTH_FAILED`, `ErrorCode.USER_DISABLED`, etc.).
   - Catálogo `ErrorMessages` com resolução automática para **Português do Brasil (`pt-BR`)** e **Inglês (`en-US`)**.

---

## 🔧 Como Utilizar no Código

### Hashing e Verificação de Senhas

```typescript
import { hashPassword, verifyPassword } from '@openclinic/core';

// Gerar Hash Seguro
const hash = await hashPassword('SenhaSegura123!');

// Validar Hash em Tempo Constante
const isValid = await verifyPassword('SenhaSegura123!', hash);
```

### Emissão e Validação de Tokens JWT

```typescript
import { signAccessToken, verifyAccessToken, generateRefreshToken } from '@openclinic/core';

const jwtConfig = {
  secretKey: process.env.JWT_KEY!,
  issuer: 'openclinic.local',
  audience: 'openclinic-clients',
  expiresInSeconds: 900, // 15 minutos
};

// Gerar Access Token
const token = signAccessToken({
  sub: 'user-uuid-123',
  email: 'medico@openclinic.local',
  role: 'ADMIN',
  tenant_id: 'tenant-uuid-456',
  app_id: 'app-uuid-789',
}, jwtConfig);

// Validar Token
const payload = verifyAccessToken(token, jwtConfig);
```

### Tratamento e Catálogo de Erros

```typescript
import { AuthenticationError, ErrorCode, getErrorMessage, SupportedLocales } from '@openclinic/core';

// Lançar erro de domínio
throw new AuthenticationError(ErrorCode.AUTH_FAILED);

// Obter mensagem localizada
const msgPt = getErrorMessage(ErrorCode.AUTH_FAILED, SupportedLocales.PT_BR);
// -> "Credenciais inválidas. Verifique seu usuário e senha."
```

---

## 🚀 Scripts de Desenvolvimento

```bash
# Compilar TypeScript
npm run build -w packages/core

# Checagem estrita de tipos
npm run typecheck -w packages/core
```
