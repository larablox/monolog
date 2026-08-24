# Larablox Monolog - Logging for Roblox

A roblox-ts port of [Monolog](https://github.com/Seldaek/monolog), as
faithfully as the Roblox platform allows. Upstream Monolog sends logs to
files, sockets, inboxes, databases, and web services; this port ships only
what a Roblox place can actually back -- printing to the output console, and
discarding. See [`CLAUDE.md`](CLAUDE.md)'s "Not ported" section for the full,
maintained list of what didn't make the trip and why.

This package implements the same shape as PSR-3's
[`LoggerInterface`](https://github.com/php-fig/fig-standards/blob/master/accepted/PSR-3-logger-interface.md)
(`LoggerInterface.ts`), so code written against it stays interoperable with
the concept even without a real `psr/log` package on this platform.

## Installation

```bash
npm install @larablox/monolog
```

## Basic Usage

```ts
import { Logger } from "@larablox/monolog/out/Monolog/Logger";
import { RobloxConsoleHandler } from "@larablox/monolog/out/Monolog/Handler/RobloxConsoleHandler";
import { Level } from "@larablox/monolog/out/Monolog/Level";

// create a log channel
const log = new Logger("name");
log.pushHandler(new RobloxConsoleHandler({}, Level.Warning));

// add records to the log
log.warning("Foo");
log.error("Bar");
```

There is no package-level barrel export -- `src/index.ts` explains why --
so consumers deep-import each class the way the example above does.

## What's included

- `Logger`, `Level`, `LogRecord`, `Registry`, `Utils`, `ResettableInterface`
- Handlers: `NullHandler`, `RobloxConsoleHandler` (the output-console adaptation
  of `PHPConsoleHandler`), and `TestHandler` for your own tests
- Formatters: `NormalizerFormatter`, `LineFormatter`, `JsonFormatter`,
  `ScalarFormatter`
- Processors: `PsrLogMessageProcessor`, `ClosureContextProcessor`,
  `IntrospectionProcessor`, `MemoryUsageProcessor`, `MemoryPeakUsageProcessor`,
  `ProcessIdProcessor`, `TagProcessor`, `UidProcessor`
- Attributes: `WithMonologChannel`, `AsMonologProcessor`

## Submitting bugs and feature requests

Bugs and feature requests are tracked on
[GitHub](https://github.com/larablox/monolog/issues).

### Requirements

- TypeScript 5.x compiled with [roblox-ts](https://roblox-ts.com/) `^3.0`
- A Rojo-synced Roblox place to run the compiled output in

### Framework Integration

[`larablox/framework`](https://github.com/larablox/framework)'s
`Illuminate\Log` is built on this package.

### License

MIT, matching upstream Monolog.

### Acknowledgements

This is a TypeScript/roblox-ts port of [Monolog](https://github.com/Seldaek/monolog)
by Jordi Boggiano, adapted to run on the Roblox platform as faithfully as it  allows.
