import { Level, Levels } from "Monolog/Level";

/** PHP: `array<mixed>` for context and extra. */
export type RecordBag = Record<string, unknown>;

/**
 * PHP: `Monolog\LogRecord`.
 *
 * `datetime` is a Unix timestamp rather than a `DateTimeImmutable`; there is no
 * date/time object on this platform. `ArrayAccess` is not ported.
 */
export class LogRecord {
    public constructor(
        public readonly datetime: number,
        public readonly channel: string,
        public readonly level: Level,
        public readonly message: string,
        public readonly context: RecordBag = {},
        public extra: RecordBag = {},
        public formatted?: string,
    ) {}

    /** PHP: `LogRecord::with()`. Returns a copy with the given fields replaced. */
    public with(changes: {
        datetime?: number;
        channel?: string;
        level?: Level;
        message?: string;
        context?: RecordBag;
        extra?: RecordBag;
    }): LogRecord {
        return new LogRecord(
            changes.datetime ?? this.datetime,
            changes.channel ?? this.channel,
            changes.level ?? this.level,
            changes.message ?? this.message,
            changes.context ?? this.context,
            changes.extra ?? this.extra,
            this.formatted,
        );
    }

    /** PHP: `LogRecord::toArray()`. */
    public toArray(): RecordBag {
        return {
            message: this.message,
            context: this.context,
            level: this.level as number,
            level_name: Levels.getName(this.level),
            channel: this.channel,
            datetime: this.datetime,
            extra: this.extra,
        };
    }

    /**
     * A shallow copy, as PHP's `clone` before handing a record to a handler.
     *
     * `extra` is copied into a new table rather than shared by reference:
     * a PHP array is a value type, so mutating one handler's `$record->extra`
     * (a per-handler processor commonly does exactly that) never touches a
     * sibling handler's `clone($record)`. A Luau table has no such copy-on-
     * write behavior -- sharing the same `extra` table across every handler's
     * clone would let one handler's processor mutation leak into another's.
     * `context` is `readonly` and never mutated in place, so it doesn't need
     * the same treatment.
     */
    public clone(): LogRecord {
        const extra: RecordBag = {};

        for (const [key, value] of pairs(this.extra)) {
            extra[key as string] = value;
        }

        return new LogRecord(
            this.datetime,
            this.channel,
            this.level,
            this.message,
            this.context,
            extra,
            this.formatted,
        );
    }
}
