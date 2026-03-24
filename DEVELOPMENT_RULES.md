# Development Rules (Mandatory)

## Objective

Define the mandatory guides that must be reviewed before implementing any task in this repository.

## Mandatory Pre-Development Checklist

1. Always read the main project guide:
   - `AGENT.md`
2. For frontend tasks, always read:
   - `frontend/.agents/skills/vercel-react-best-practices/AGENTS.md`
3. For backend tasks, always read:
   - `rest-api-finances/.agents/skills/java-springboot/SKILL.md`

## Execution Rule

- Before writing code, review the applicable markdown guides above.
- If the task involves both frontend and backend, review all three files.
- If any referenced file is missing, report it before implementation and proceed with the available guides.
- For frontend work, consider `frontend/` the active application directory.

## Frontend Baseline

- Use `pnpm` for dependency management and frontend scripts.
- Use TypeScript as the default language.
- Use shadcn/ui as the base component approach.
- Use TanStack Router for routing.

## React State Safety

- Do not call `setState` synchronously inside `useEffect` just to realign derived form values.
- When state depends on props, queries, or selected entities, prefer derived values via `useMemo`, keyed local state, or explicit reset handlers.
- If a draft must reset when the active entity changes, key the draft by that entity or recompute the displayed value without `useEffect(setState)`.
- Before shipping a hook/component, check for patterns like `useEffect(() => setState(...), [...])` and replace them unless the side effect is genuinely external.

## Scope

Applies to all new features, bug fixes, refactors, and reviews in this repository.
