# Design Tokens

*Anexo técnico da proposta de [identidade visual](../identidade-visual.md) (v0.1, aguardando decisão do grupo). Camadas primitiva e semântica da fundação; a camada de componente nasce na Fase 4, junto das primeiras telas.*

## Arquivos

| Arquivo | Papel |
| :--- | :--- |
| [`tokens.json`](./tokens.json) | **Fonte da verdade.** Formato [W3C Design Tokens](https://design-tokens.github.io/community-group/format/) — padrão neutro, legível por qualquer ferramenta, sem apostar na biblioteca de estilos que o time de front escolherá ([decisão 0009](../decisions/0009-react-e-vite-no-front-end.md)). |
| [`tokens.css`](./tokens.css) | CSS custom properties (`--oc-*`) geradas a partir do JSON. É o que uma página ou app consome diretamente. |

Edite **sempre o JSON**; o CSS é derivado. Nomes de token em inglês, seguindo a convenção do repositório.

## Como consumir

```css
@import "tokens.css";

.button-primary {
  background: var(--oc-action-primary);
  color: var(--oc-action-on-primary);
  border-radius: var(--oc-radius-md);
  font: var(--oc-font-weight-semibold) var(--oc-font-size-md) var(--oc-font-sans);
  transition: background var(--oc-duration-fast) var(--oc-easing-linear);
}
.button-primary:hover { background: var(--oc-action-primary-hover); }
```

Regra de consumo: **componente usa token semântico** (`--oc-text-accent`), nunca primitivo (`--oc-teal-600`) — é a camada semântica que troca de valor entre temas.

## Temas

- `:root` sem marcação = tema claro.
- Escuro entra por `prefers-color-scheme: dark` (com guarda: `data-theme="light"` explícito vence o sistema) e por `data-theme="dark"` explícito.
- `prefers-reduced-motion: reduce` zera as durações de movimento — acessibilidade, não cortesia.

## Decisões codificadas (resumo)

- **Raio**: controles `8px`, cartões `12px`, chips/busca/avatares em pílula — centro de gravidade extraído de referências visuais fornecidas pelo fundador.
- **Sombra**: elevação por contraste de superfície + borda; sombra real (`--oc-shadow-overlay`) **só no que flutua** (menu, popover, diálogo).
- **Movimento**: dois ritmos — `100ms` para micro-interação de alta frequência, `160ms` para mudança espacial, teto de `220ms`.
- **Barra lateral escura nos dois temas** (`--oc-surface-rail`): assinatura estrutural extraída das referências.
- **Vermelho é exclusivo de perigo**; verde de marca não existe (verde pertence ao estado de sucesso).
- Fontes **Lexend** (interface) e **Atkinson Hyperlegible Mono** (código/identificadores), ambas SIL OFL, **empacotadas com a aplicação** — sem CDN.

O porquê de cada escolha, com as alternativas descartadas, vive em [`../identidade-visual.md`](../identidade-visual.md).
