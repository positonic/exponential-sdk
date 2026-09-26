# Changelog

Versions before 1.21.0 are recorded in the git history (each release commit carries its version in the title).

## 1.21.0 — 2026-09-26

- **Action dependencies** (app ADR-0062): `Action` now carries `depsOut`
  (one `ActionDependencyEdge` per blocker), `openBlockerCount` and `isBlocked`,
  all server-computed. The `blockedByIds` / `blockingIds` response arrays are gone.
- `blockedByIds` stays on `ActionCreateInput` / `ActionUpdateInput`; on update
  the list replaces the current set, omitting it leaves it, `[]` clears it.
- New helpers `getBlockers(action)` and `openBlockers(action)`.
- New `ActionsApi.get(id)` (`action.getById`) and
  `ActionsApi.searchForDependencies(options)` (`action.searchForDependencies`).
