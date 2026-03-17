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

## Scope

Applies to all new features, bug fixes, refactors, and reviews in this repository.
