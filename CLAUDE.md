# Larablox Monolog (repository: monolog)

An in-house port of [Monolog](https://github.com/Seldaek/monolog) to
roblox-ts, as faithfully as the platform allows. Published as the npm package
`@larablox/monolog` for [`larablox/framework`](https://github.com/larablox/framework)
to consume.

## Stack

- TypeScript 5.x → Luau via roblox-ts (`rbxtsc`); not Node, not a browser
- Package manager: npm
- Tests: TestEZ (`@rbxts/testez`) -- see `agent_docs/testing.md`

## Layout

- `src/Monolog/` — the port, one file per upstream class, same names
- `tests/Monolog/` — specs, mirroring `src/Monolog/`'s tree; see
  `agent_docs/testing.md`
- `out/` — generated Luau, the published package; never edit by hand
- `out-tests/` — a separate, dev-only recompile of `src/` + `tests/` together,
  used only by `test.project.json`'s place; never edit by hand, never published

Must not import from anything outside `src/Monolog` -- upstream
`monolog/monolog` has zero dependency on `laravel/framework`, and this port
keeps that direction. The one deliberate exception: `LoggerInterface.ts`
defines the PSR-3 `Psr\Log\LoggerInterface` shape `Monolog\Logger` implements.
Upstream gets that from the separate `psr/log` package; there is no Luau port
of `psr/log` to depend on instead, so it lives here for any consumer to reuse.

## Commands

| Task                                    | Command                    |
|------------------------------------------|----------------------------|
| Install                                 | `npm ci` + `rokit install` |
| Compile TypeScript to Luau              | `npm run build`            |
| Compile `src/` + `tests/` for Studio    | `npm run test:build`       |
| Watch sources in `src/` (TypeScript)    | `npm run dev`              |
| Watch `src/` + `tests/` for Studio      | `npm run test:watch`       |
| Watch artifacts in `out/`/`out-tests/` (Studio) | `rojo serve`        |
| Lint                                    | `npm run lint`             |
| Lint + autofix                          | `npm run lint:fix`         |
| Analyze generated Luau                  | `npm run analyze`          |
| Remove build artifacts                  | `npm run clean`            |

`npm run analyze` rebuilds the project and refreshes the sourcemap on its
own. Run `npm run types:roblox` once after cloning.

Two Rojo project files, both throwaway Studio places, not a game:
`default.project.json` mounts the published `out/Monolog` build as-is (poke
at exactly what consumers get); `test.project.json` is for running the test
suite -- see `agent_docs/testing.md`.

## Rules

- Keep all code, identifiers, and commit messages in English.
- Check every class against Monolog's own source: reproduce class names,
  method names, and argument order literally. Diverge only where the
  platform forces it, and say so.
- A successful build proves nothing: `rbxtsc` only checks TS types. After
  changing `src/`, run `npm run analyze` and read the corresponding file in
  `out/` -- the compiler does not see Luau semantics. The same goes for
  `tests/`: a clean `npm run test:build` proves the specs compile, not that
  they pass -- run them live in Studio (`agent_docs/testing.md`).
- No Node APIs, no DOM, no `window`. The runtime is Luau; the only usable npm
  packages are `@rbxts/*`.
- Do not add dependencies unless asked.

## Not ported

- **Root**: `ErrorHandler`, `SignalHandler` -- hook PHP's global error/signal
  handlers, which do not exist on this platform. `DateTimeImmutable`,
  `JsonSerializableDateTimeImmutable` -- exist only to give `LogRecord->datetime`
  a serializable `DateTimeImmutable`; this port already made `datetime` a plain
  Unix timestamp number instead (see `LogRecord.ts`).
- **Formatter**: `ChromePHPFormatter`, `FlowdockFormatter`, `FluentdFormatter`,
  `GelfMessageFormatter`, `GoogleCloudLoggingFormatter`, `LogglyFormatter`,
  `LogmaticFormatter`, `LogstashFormatter`, `SyslogFormatter`,
  `WildfireFormatter` -- tied to an external service's wire format or to a
  browser dev-tools protocol with no Roblox equivalent, and this pass does not
  port the handlers that would use them. `ElasticaFormatter`,
  `ElasticsearchFormatter`, `MongoDBFormatter` -- same, plus no client library
  for either database on this platform.
- **Processor**: `GitProcessor`, `MercurialProcessor` -- no filesystem or
  `.git`/`.hg` access. `HostnameProcessor`, `LoadAverageProcessor` -- no OS
  hostname or load-average concept on Roblox. `WebProcessor` -- no PHP
  `$_SERVER` web-request superglobal here, and no web framework of any kind in
  this package for one to come from.
- **Handler**: `FingersCrossedHandler`, `GroupHandler`,
  `WhatFailureGroupHandler` -- real upstream classes, out of scope for this
  pass. Every other upstream handler (`StreamHandler`, `SyslogHandler`,
  `RedisHandler`, the mail/HTTP/queue handlers, etc.) is out of scope for the
  same reason: this port ships only what the platform can actually back --
  `NullHandler` and `RobloxConsoleHandler`, the Roblox output console adapted
  from `PHPConsoleHandler`. `TestHandler` is the one exception: like
  `MonologTestCase`, it ships in upstream's real (non-dev) autoload because
  library consumers use it in their own tests, so it is test infrastructure,
  not a shipped handler, and is ported at
  `src/Monolog/Handler/TestHandler.ts` on that basis.

  Dropping `FingersCrossedHandler`/`GroupHandler`/`WhatFailureGroupHandler`
  means `larablox/framework`'s `LogManager` (its `stack` driver in
  particular) does not build against this package as-is -- that consumer
  needs updating separately, it was not done as part of this pass.
