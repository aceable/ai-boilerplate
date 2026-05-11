# Testing Strategy

Two shapes, one rule per layer. Use this to route any new test to the right place.

## The shapes

**Server / pure-logic code → pyramid** (most tests at the bottom)

```
                  /\
                 /E2E\         small — only browser-lifecycle moments
                /------\
               /  intg. \      some — HTTP routes, DB-backed services
              /----------\
             /    unit    \    most — pure functions, validators, parsers
            /--------------\
```

**Component / UI code → honeycomb** (most tests in the middle)

```
              ┌───────────┐
              │   E2E     │   small — auth flow, critical journey
              ├───────────┤
              │integration│   largest — component renders, events
              ├───────────┤
              │   unit    │   small — pure logic pulled out of components
              └───────────┘
```

## The single discriminator

**Does the spec call `render(...)` from `@testing-library/react`?**

- Yes → **integration spec** — name it `*.spec.tsx`, lives next to the component or in `tests/components/`
- No → **unit spec** — name it `*.test.ts`, lives next to the function or in `tests/lib/`

This naming convention matches `vitest.config.ts` `include` globs.

## Where logic lives

| Belongs in | Content |
|---|---|
| `src/lib/*.ts` | Pure logic: validators, formatters, parsers, reducers, builders, regex caps, business rules |
| `src/components/*.tsx` | Render output, props, events, hooks, refs, lifecycle, slots |
| `src/app/api/*/route.ts` | HTTP contract, request parsing, response shape, auth checks |
| Playwright (`tests/*.e2e.ts`) | Cross-component user journeys, real network roundtrip, browser-only behavior |

If a component contains logic that isn't about rendering, **extract it to `src/lib/`** before testing. Pure functions are 10× faster to test than mounted components. Migration-readiness comes free.

## Routing assertions to the correct layer

| Assertion | Layer | File pattern |
|---|---|---|
| Pure transform return value | vitest unit | `src/lib/*.test.ts` |
| Validator regex / range / cap | vitest unit | `src/lib/*.test.ts` |
| Payload shape from a builder | vitest unit | `src/lib/*.test.ts` |
| Component renders correct text from props | vitest integration | `src/components/*.spec.tsx` |
| Event fires on user click | vitest integration | `src/components/*.spec.tsx` |
| Form validation shown to user | vitest integration | `src/components/*.spec.tsx` |
| API route returns expected JSON shape | vitest integration | `tests/api/*.spec.ts` |
| API route enforces auth | vitest integration | `tests/api/*.spec.ts` |
| Sign-in flow end-to-end | Playwright | `tests/*.e2e.ts` |
| Multi-page user journey | Playwright | `tests/*.e2e.ts` |
| Critical happy-path (one per major feature) | Playwright | `tests/*.e2e.ts` |

## When to add tests

| Change | Unit | Integration | E2E |
|---|---|---|---|
| New pure function | required | — | — |
| New validator / parser / regex | required | — | — |
| New component | extract logic if any | required (render + props + events) | — |
| New API route | required (handler logic) | required (HTTP shape) | — |
| New user-visible feature | as needed | required | one happy-path |
| Bug fix (logic) | regression spec | — | — |
| Bug fix (user-visible) | — | regression spec | — |
| Pure refactor | — | — | — |

## Rules

1. **Tests ship with the change**, not in a follow-up commit. Untested code is unfinished code.
2. **No mocking inside the unit under test.** Mock at the boundary (network, DB, time). If a unit needs heavy mocking, it's not actually a unit — split it.
3. **Each `it(...)` asserts one behavior.** Multiple assertions are fine if they describe one outcome ("the form shows errors AND disables submit"). Multiple unrelated assertions belong in separate `it(...)` blocks.
4. **Name tests by behavior, not by function:** `it('rejects passwords under 8 characters')`, not `it('validatePassword returns false')`. The behavior name is what regresses; the function name might rename.
5. **Database-backed tests** use an in-memory or branched DB (Neon branching for Postgres-aware tests). Pure unit tests never touch a real DB — they stub the data layer.
6. **Coverage is a ratchet.** It only goes up. `vitest.config.ts` `thresholds.autoUpdate` writes the new floor after each successful run.
7. **E2E is a last resort.** Anything you can prove with a component-level integration test belongs at integration. E2E exists for behavior that integration can't reach: real network roundtrips, browser focus/selection, multi-page state.

## What goes in the test file

| Section | Content |
|---|---|
| `describe` block | Subject under test — the function, component, or route |
| `it('does X when Y')` | One behavior, one assertion family |
| Setup (`beforeEach`) | Build the inputs / mount the component / mock the boundary |
| Assertion | What the user / caller observes |

A test that needs more than ~5 lines of setup is usually testing a unit that's too big. Split the unit.

## Commands

```bash
npm run test            # run all unit + integration once (vitest)
npm run test:watch      # vitest in watch mode
npm run test:coverage   # vitest + v8 coverage report (writes html to coverage/)
npm run test:e2e        # Playwright E2E
```

## Cross-reference

- `vitest.config.ts` — runner config, environment, include globs, coverage thresholds
- `vitest.setup.ts` — global test setup (Jest-DOM matchers)
- `playwright.config.ts` — Playwright config, webServer, base URL
- `AGENTS.md` "Testing" section — AI-assistant rules for following this strategy
