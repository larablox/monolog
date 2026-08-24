# Testing

Runner: TestEZ (`@rbxts/testez`). Coverage mirrors upstream `tests/Monolog/...`
in this repo's `tests/Monolog/`: same directory shape
(`Handler/NullHandlerTest.php` -> `Handler/NullHandler.spec.ts`), same
scenarios, same names where they translate, `@covers`-equivalent stated in a
comment. Two things diverge from PHPUnit on purpose:

- **The `.spec` suffix**, not PHP's `Test` suffix: TestEZ only discovers
  `ModuleScript`s whose name ends in `.spec`.
- Anything that only makes sense under PHPUnit -- `serialize()`/`unserialize()`
  round-trips (`testSerializeRestorePrivate` and friends), `createMock()` --
  is not ported. Say why in a comment at the point of omission, same as
  everywhere else in this repo.

Each spec file needs `/// <reference types="@rbxts/testez/globals" />` at the
top -- `@rbxts/testez`'s `describe`/`it`/`expect` globals aren't picked up
automatically via `typeRoots`.

## Two `tsconfig`s, two outputs, on purpose

`tsconfig.json` (`npm run build`) is the publish build: `rootDir: "src"`,
`src/Monolog/X.ts` -> `out/Monolog/X.luau`, consumed by `larablox/framework`.
`tests/` is deliberately not part of it. `tsconfig.tests.json` (`npm run
test:build`) is a second, dev-only build for `test.project.json`'s place: it
recompiles `src/` *and* `tests/` together into `out-tests/`, so specs can
`import` real `Monolog` classes. It can't just widen `tsconfig.json`'s
`rootDir` to the repo root to make that legal -- roblox-ts's asset-copy step
then tries to copy the whole repo into `out-tests/`, which sits inside it, and
crashes outright, not a lintable mistake. It uses `rootDirs: ["src", "tests"]`
instead (TypeScript's virtual-merge option) to sidestep that crash, but
`rootDirs` does *not* collapse the two into one output tree the way a real
shared `rootDir` would: `src/Monolog/X.ts` still lands at
`out-tests/src/Monolog/X.luau`, and `tests/Monolog/X.spec.ts` at
`out-tests/tests/Monolog/X.spec.luau`. So `test.project.json` mounts them as
two separate instances -- `ReplicatedStorage.Monolog` from
`out-tests/src/Monolog`, `.MonologTests` from `out-tests/tests/Monolog` -- and
lets roblox-ts compute the (multi-hop) `TS.import` path between them from the
Rojo project file passed via `--rojo test.project.json`, which it can do
regardless of the two directories not literally sharing a tree.
`eslint.config.js` lists both `tsconfig.json` and `tsconfig.tests.json` under
`parserOptions.project` so lint sees `tests/` too.

## Running them

`test.project.json`'s place has a `ServerScriptService.RunTests` `Script`
that warms up every module in both `Monolog` and `MonologTests` through
`TS.import`, then runs TestEZ against `MonologTests`, printing a pass/fail
summary. The warm-up step is required, not decorative: a roblox-ts-compiled
module only gets its `_G[script]` runtime handle set the first time something
reaches it via `TS.import` (roblox-ts's own `RuntimeLib.lua`, see
`TS.import`'s `_G[module] = TS` line) -- and nothing ever reaches a `.spec`
module that way, since nothing `import`s a spec file. TestEZ's own discovery
walks the tree and calls plain `require()`, which would otherwise hit an
unbootstrapped module and fail with Roblox's generic "Requested module
experienced an error while loading". Warming every module up front populates
Roblox's `require()` cache before TestEZ ever touches it, so its plain
`require()` calls just return the cached result.

To run: `npm run test:build`, `npm run test:serve` (or `rojo serve
test.project.json`), connect Studio's Rojo plugin to it, press Play. Output
goes to the console. Re-run after any source change with `npm run test:build`
(or `npm run test:watch`) then press Play again -- Rojo re-syncs `Source` on
file save, but a `ModuleScript` that already failed once caches that failure
for the rest of the session, so mid-session edits to a broken module need a
fresh Play, not just a re-sync.

## Real bugs this suite has already caught

Writing tests against a live Studio run (not just `npm run test:build`
passing) surfaced three genuine, non-platform-forced bugs from earlier passes
-- worth knowing about since the pattern can recur:

- `Utils.jsonEncode` encoded every empty table as `{}`. PHP's
  `json_encode([])` is `[]`, and upstream relies on that for an empty
  context/extra bag. Fixed to default empty to `[]`; `markAsJsonObject`
  (`Utils.ts`) opts a specific empty table into `{}` (`JsonFormatter` is the
  one caller that needs that).
- `LogRecord.clone()` copied `extra` by reference. A PHP array is a value
  type, so one handler's per-handler processor mutating `$record->extra`
  never touches a sibling handler's `clone($record)`; a Luau table shares
  by reference, so it did leak across handlers until `clone()` was fixed to
  copy `extra` into a new table.
- `Logger.toMonologLevel()` silently fell back to `Level.Debug` for an
  unrecognized level name. PSR-3 requires throwing (upstream:
  `Psr\Log\InvalidArgumentException`) -- not a platform limitation, just an
  earlier oversight. Fixed to `error(...)` on an unrecognized name.

None of these were caught by `npm run test:build` or `npm run lint` --
both check only that the TypeScript compiles and satisfies its own types, not
that the compiled Luau behaves correctly. Treat a clean build the same way
`CLAUDE.md` already says to treat one for `src/` changes: it proves nothing
about runtime behavior. Run the suite live in Studio before trusting a change.
