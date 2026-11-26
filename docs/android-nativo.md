# App Android nativo (futuro)

> **Status:** planejado, não iniciado. Por enquanto o produto é só o web app (PWA em `frontend/`).
> **Decidido em:** 2026-11-26.

## Por que existiria

Mais fluidez no celular do que a web consegue: swipe entre meses acompanhando o dedo sem pausa ao
montar o mês novo, transições entre telas e listas longas (transações, lista de compras). Antes de
começar, medir o build de produção do web app (`pnpm build && pnpm preview`, ou o PWA instalado):
parte da lentidão vista no `pnpm dev` é do modo de desenvolvimento do React.

## Escolha: Kotlin + Jetpack Compose (só Android)

Se o app fosse só para Android, sem reaproveitar o código React:

- é a ferramenta oficial e recomendada pelo Google para apps novos; recursos do sistema (voltar com
  prévia, widgets, Material 3 Expressive) chegam primeiro;
- pager, listas e transições já são nativos, sem ponte JS ↔ nativo;
- Android Studio com preview, Layout Inspector (contagem de recomposições) e profiler;
- notificações, widget na tela inicial, atalhos, biometria e trabalho em segundo plano são APIs de
  primeira classe.

**Reconsiderar Expo (React Native)** se surgir necessidade de iOS, se quiser reaproveitar o
TypeScript do `frontend/` (tipos, services, regras, hooks) ou se a prioridade for validar rápido.

## Stack

| Camada | Escolha |
|---|---|
| UI | Jetpack Compose + Material 3, tema próprio com as cores e fontes do web app |
| Navegação | Navigation Compose (rotas tipadas) |
| Estado | ViewModel + StateFlow |
| Rede | Retrofit ou Ktor Client + kotlinx.serialization (API do `worker/`, sem mudanças) |
| Cache e offline | Room (lista de compras funcionando sem sinal no mercado) |
| Injeção de dependências | Hilt |
| Gráficos | Vico |
| Sincronização em segundo plano | WorkManager |
| Desempenho | Baseline Profiles desde o início |

## Equivalências com o web app

| Web (`frontend/`) | Android |
|---|---|
| Carrossel de meses (`month-carousel.tsx`) | `HorizontalPager` com `beyondViewportPageCount = 1` |
| Lista de transações / compras | `LazyColumn` com `key` por item |
| Reordenar arrastando (dnd-kit) | biblioteca `reorderable` |
| Gráficos (recharts) | Vico |
| TanStack Query (cache, polling da lista de compras) | Repositório + Room + `Flow`; polling com coroutines |
| Rotas (TanStack Router) | Navigation Compose |

## Cuidados

- **Recomposições:** estado estável, `key` nas listas e `remember`, para não redesenhar a tela
  inteira a cada mudança.
- **Medir em release:** o build de debug do Compose é bem mais lento.
- **Baseline Profile:** sem ele as primeiras rolagens engasgam até o código ser otimizado.
- **Lógica duplicada:** cálculos de fatura, previsão e regras de negócio passam a existir em
  TypeScript e em Kotlin. O que puder, mover para a API (`worker/`) para ter uma fonte só.
