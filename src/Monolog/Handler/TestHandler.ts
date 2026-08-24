import { AbstractProcessingHandler } from "Monolog/Handler/AbstractProcessingHandler";
import { Level } from "Monolog/Level";
import { Logger } from "Monolog/Logger";
import type { LogLevel } from "Monolog/LoggerInterface";
import type { LogRecord, RecordBag } from "Monolog/LogRecord";

/** PHP: the `array{message: string, context?: mixed[]}` shape `hasRecord()` accepts. */
export interface RecordAssertion {
    message: string;
    context?: RecordBag;
}

/** PHP: the `callable(LogRecord, int): mixed $predicate` shape `hasRecordThatPasses()` accepts. */
export type RecordPredicate = (record: LogRecord, index: number) => boolean;

/** Deep-equality check for two context/extra bags -- PHP's `!==` on arrays compares recursively. */
function bagsEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true;
    }

    if (!typeIs(a, "table") || !typeIs(b, "table")) {
        return false;
    }

    const aBag = a as RecordBag;
    const bBag = b as RecordBag;
    const seen = new Set<string>();

    for (const [key, value] of pairs(aBag)) {
        const stringKey = tostring(key);
        seen.add(stringKey);

        if (!bagsEqual(value, bBag[stringKey])) {
            return false;
        }
    }

    for (const [key] of pairs(bBag)) {
        if (!seen.has(tostring(key))) {
            return false;
        }
    }

    return true;
}

/**
 * PHP: `Monolog\Handler\TestHandler`.
 *
 * Ships in Monolog's real (non-dev) autoload, not `autoload-dev`, because
 * library consumers use it in their own tests -- the same reason this port
 * carries it under `src/Monolog/Handler` rather than `tests/`, and the same
 * justification already made for `Monolog\Test\MonologTestCase`.
 *
 * Upstream's per-level shorthands (`hasWarning()`, `hasWarningRecords()`,
 * `hasWarningThatContains()`, `hasWarningThatMatches()`,
 * `hasWarningThatPasses()`, one set per `Level` case) are dispatched through
 * PHP's `__call` magic method: it regex-matches the requested method name
 * apart into a level name and a generic method name, then redirects to the
 * matching `hasRecord*()` method with the parsed `Level` appended. Luau has
 * no dynamic method dispatch to replicate that with, so every shorthand is
 * spelled out explicitly below instead -- one small delegating method per
 * level per kind, same names, same behavior.
 *
 * `hasRecordThatMatches()`/the `*ThatMatches()` shorthands use Luau string
 * patterns (`string.match`) rather than upstream's PCRE (`preg_match`) --
 * there is no PCRE engine on this platform. Pattern syntax differs
 * (`%d`/`%a`/... instead of `\d`/`\w`/...); callers passing a `regex` should
 * pass a Lua pattern, not a PCRE one.
 */
export class TestHandler extends AbstractProcessingHandler {
    protected records = new Array<LogRecord>();
    protected recordsByLevel = new Map<Level, Array<LogRecord>>();
    private skipReset = false;

    public getRecords(): Array<LogRecord> {
        return this.records;
    }

    public clear(): void {
        this.records = [];
        this.recordsByLevel = new Map();
    }

    public reset(): void {
        if (!this.skipReset) {
            this.clear();
        }
    }

    public setSkipReset(skipReset: boolean): void {
        this.skipReset = skipReset;
    }

    public hasRecords(level: Level | LogLevel): boolean {
        return this.recordsByLevel.has(Logger.toMonologLevel(level));
    }

    public hasRecord(
        recordAssertions: string | RecordAssertion,
        level: Level,
    ): boolean {
        const assertions: RecordAssertion = typeIs(recordAssertions, "string")
            ? { message: recordAssertions }
            : recordAssertions;

        return this.hasRecordThatPasses((record) => {
            if (record.message !== assertions.message) {
                return false;
            }

            if (
                assertions.context !== undefined &&
                !bagsEqual(record.context, assertions.context)
            ) {
                return false;
            }

            return true;
        }, level);
    }

    public hasRecordThatContains(message: string, level: Level): boolean {
        return this.hasRecordThatPasses(
            (record) => record.message.find(message, 1, true)[0] !== undefined,
            level,
        );
    }

    public hasRecordThatMatches(regex: string, level: Level): boolean {
        return this.hasRecordThatPasses(
            (record) => record.message.match(regex)[0] !== undefined,
            level,
        );
    }

    public hasRecordThatPasses(
        predicate: RecordPredicate,
        level: Level | LogLevel,
    ): boolean {
        const resolvedLevel = Logger.toMonologLevel(level);
        const records = this.recordsByLevel.get(resolvedLevel);

        if (records === undefined) {
            return false;
        }

        for (let index = 0; index < records.size(); index++) {
            if (predicate(records[index], index)) {
                return true;
            }
        }

        return false;
    }

    protected write(record: LogRecord): void {
        const byLevel = this.recordsByLevel.get(record.level) ?? [];
        byLevel.push(record);
        this.recordsByLevel.set(record.level, byLevel);
        this.records.push(record);
    }

    // -- Per-level shorthands, spelled out explicitly -- see the class comment. --

    public hasEmergencyRecords(): boolean {
        return this.hasRecords(Level.Emergency);
    }

    public hasEmergency(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Emergency);
    }

    public hasEmergencyThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Emergency);
    }

    public hasEmergencyThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Emergency);
    }

    public hasEmergencyThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Emergency);
    }

    public hasAlertRecords(): boolean {
        return this.hasRecords(Level.Alert);
    }

    public hasAlert(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Alert);
    }

    public hasAlertThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Alert);
    }

    public hasAlertThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Alert);
    }

    public hasAlertThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Alert);
    }

    public hasCriticalRecords(): boolean {
        return this.hasRecords(Level.Critical);
    }

    public hasCritical(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Critical);
    }

    public hasCriticalThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Critical);
    }

    public hasCriticalThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Critical);
    }

    public hasCriticalThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Critical);
    }

    public hasErrorRecords(): boolean {
        return this.hasRecords(Level.Error);
    }

    public hasError(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Error);
    }

    public hasErrorThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Error);
    }

    public hasErrorThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Error);
    }

    public hasErrorThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Error);
    }

    public hasWarningRecords(): boolean {
        return this.hasRecords(Level.Warning);
    }

    public hasWarning(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Warning);
    }

    public hasWarningThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Warning);
    }

    public hasWarningThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Warning);
    }

    public hasWarningThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Warning);
    }

    public hasNoticeRecords(): boolean {
        return this.hasRecords(Level.Notice);
    }

    public hasNotice(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Notice);
    }

    public hasNoticeThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Notice);
    }

    public hasNoticeThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Notice);
    }

    public hasNoticeThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Notice);
    }

    public hasInfoRecords(): boolean {
        return this.hasRecords(Level.Info);
    }

    public hasInfo(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Info);
    }

    public hasInfoThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Info);
    }

    public hasInfoThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Info);
    }

    public hasInfoThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Info);
    }

    public hasDebugRecords(): boolean {
        return this.hasRecords(Level.Debug);
    }

    public hasDebug(recordAssertions: string | RecordAssertion): boolean {
        return this.hasRecord(recordAssertions, Level.Debug);
    }

    public hasDebugThatContains(message: string): boolean {
        return this.hasRecordThatContains(message, Level.Debug);
    }

    public hasDebugThatMatches(regex: string): boolean {
        return this.hasRecordThatMatches(regex, Level.Debug);
    }

    public hasDebugThatPasses(predicate: RecordPredicate): boolean {
        return this.hasRecordThatPasses(predicate, Level.Debug);
    }
}
