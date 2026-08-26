import { GroupHandler } from "Monolog/Handler/GroupHandler";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\WhatFailureGroupHandler`.
 *
 * Forwards records to multiple handlers, suppressing failures of each handler
 * and continuing through to give every handler a chance to succeed.
 *
 * Upstream wraps each call in `try { ... } catch (Throwable) {}`. Luau's
 * error mechanism is `error()`/`pcall()`, not exceptions, so each call goes
 * through `pcall()` and its failure result is discarded -- same "what
 * failure?" semantics, same swallow-everything breadth.
 */
export class WhatFailureGroupHandler extends GroupHandler {
    /** Handles a record, letting every grouped handler fail independently. */
    public handle(record: LogRecord): boolean {
        let processed = record;

        if (!this.processors.isEmpty()) {
            processed = this.processRecord(processed);
        }

        for (const handler of this.handlers) {
            pcall(() => handler.handle(processed.clone()));
        }

        return this.bubble === false;
    }

    /** Handles a set of records at once, ignoring any handler that fails. */
    public handleBatch(records: Array<LogRecord>): void {
        let batch = records;

        if (!this.processors.isEmpty()) {
            batch = records.map((record) => this.processRecord(record));
        }

        for (const handler of this.handlers) {
            pcall(() =>
                handler.handleBatch(batch.map((record) => record.clone())),
            );
        }
    }

    /**
     * Closes every grouped handler, ignoring any that fails.
     *
     * Upstream deliberately does not call `parent::close()` here (unlike
     * `GroupHandler::close()`), so neither does this.
     */
    public close(): void {
        for (const handler of this.handlers) {
            pcall(() => handler.close());
        }
    }
}
