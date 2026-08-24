import { Level } from "Monolog/Level";
import { Logger } from "Monolog/Logger";
import { LogRecord } from "Monolog/LogRecord";
import type { FormatterInterface } from "Monolog/Formatter/FormatterInterface";
import type { LogLevel } from "Monolog/LoggerInterface";
import type { RecordBag } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Test\MonologTestCase`.
 *
 * Lets you easily generate log records and a dummy formatter for testing
 * purposes. Upstream extends PHPUnit's `TestCase`; there is no test-framework
 * ancestor on this platform (`CLAUDE.md`: "Tests: none") to extend instead, so
 * these are plain `public static` methods on a class that extends nothing.
 */
export class MonologTestCase {
    /** PHP: `MonologTestCase::getRecord()`. */
    public static getRecord(
        level: Level | LogLevel = Level.Warning,
        message = "test",
        context: RecordBag = {},
        channel = "test",
        extra: RecordBag = {},
    ): LogRecord {
        return new LogRecord(
            os.time(),
            channel,
            Logger.toMonologLevel(level),
            message,
            context,
            extra,
        );
    }

    /** PHP: `MonologTestCase::getMultipleRecords()`. */
    public static getMultipleRecords(): Array<LogRecord> {
        return [
            MonologTestCase.getRecord(Level.Debug, "debug message 1"),
            MonologTestCase.getRecord(Level.Debug, "debug message 2"),
            MonologTestCase.getRecord(Level.Info, "information"),
            MonologTestCase.getRecord(Level.Warning, "warning"),
            MonologTestCase.getRecord(Level.Error, "error"),
        ];
    }

    /**
     * PHP: `MonologTestCase::getIdentityFormatter()`. Upstream builds this
     * with PHPUnit's `createMock()`; there is no mocking library here to
     * replicate that with, and none is needed for something this trivial --
     * this is a plain object literal implementing `FormatterInterface`.
     */
    public static getIdentityFormatter(): FormatterInterface {
        return {
            format(record: LogRecord): string {
                return record.message;
            },
            formatBatch(records: Array<LogRecord>): string {
                return records.map((record) => record.message).join("\n");
            },
        };
    }
}
