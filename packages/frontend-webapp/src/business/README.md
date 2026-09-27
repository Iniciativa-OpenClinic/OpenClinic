# Módulos de Negócio (Camada de Demonstração & Mock)

> **Aviso de Isenção e Conformidade Arquitetural**  
> Status: **Camada de Protótipo e Mock Preservada**  
> Vigência: **Sessão 2026-09-11**

## 1. Visão Geral

Os subdiretórios em `src/business/` (`attendance/`, `clinical/`, `financial/`, `management/`, `registries/`) representam a camada de apresentação visual para telas operacionais e de saúde atualmente alimentadas por conjuntos de dados mock em memória (`INITIAL_PATIENTS`, helpers de local storage, filas simuladas).

## 2. Invariante & Regra de Conformidade

Em conformidade com as diretrizes do usuário e decisões arquiteturais:

1. **Preservação do Estado Mock:** Todas as estruturas visuais, registros mock e rótulos de protótipo de negócio são **intencionalmente preservados** até que os microserviços e use cases de backend para a lógica clínica/financeira sejam oficialmente integrados.
2. **Isenção de Scanners Estritos de Inconsistência:** Estes arquivos estão isentos de verificações contratuais estritas de DTO da API e de regras de auditoria de idioma aplicadas aos módulos ARCH (`src/arch/`), prevenindo falsos positivos durante testes automatizados de compliance.
