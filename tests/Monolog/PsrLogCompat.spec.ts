/// <reference types="@rbxts/testez/globals" />
import { LineFormatter } from "Monolog/Formatter/LineFormatter";
import { Logger } from "Monolog/Logger";
import { PsrLogMessageProcessor } from "Monolog/Processor/PsrLogMessageProcessor";
import { TestHandler } from "Monolog/Handler/TestHandler";
import type { LogLevel } from "Monolog/LoggerInterface";

/**
 * PHP: `Monolog\PsrLogCompatTest`.
 *
 * An integration test of `Logger` + `PsrLogMessageProcessor` + `LineFormatter`
 * + `TestHandler` -- the handler this pass ported specifically so this file
 * (and others) could depend on it, see `CLAUDE.md`'s "## Not ported" Handler
 * bullet.
 *
 * `testImplements` is not ported: it asserts `$logger instanceof
 * LoggerInterface`, a runtime check against a PHP interface. TypeScript
 * interfaces have no runtime representation to `instanceof` -- `Logger
 * implements LoggerContract` (`Logger.ts`) is already enforced entirely at
 * compile time, so there is nothing left to assert at runtime.
 *
 * `testObjectCastToString` and the `Stringable`-mock part of
 * `testContextCanContainAnything` are not ported: both build a PHPUnit mock
 * of PHP's `Stringable` interface. There is neither a `Stringable` interface
 * nor a mocking framework here, and a plain Luau data table has no
 * `__tostring`-via-interface concept the way a PHP object does --
 * `tostring()` on a plain table just yields its address, not anything
 * meaningful. `testContextCanContainAnything`'s PHP resource-handle
 * (`fopen`/`fclose`) entries are dropped for the same "no resources on this
 * platform" reason used throughout this pass; the rest of that test (plain
 * scalars and a nested table) is kept, with the PHP `\DateTime` entry
 * dropped too (no such object here) and the `null` entry dropped as
 * elsewhere in this suite (a Luau table has no key with an explicit nil
 * value -- assigning `undefined` removes the key).
 *
 * `testThrowsOnInvalidLevel` is ported as `Logger.toMonologLevel()` throwing
 * a plain error (no `Psr\Log\InvalidArgumentException` port to raise instead)
 * for an unrecognized level name -- see that method's own comment in
 * `Logger.ts`.
 */

interface LoggerAndHandler {
    logger: Logger;
    handler: TestHandler;
}

/** PHP: PsrLogCompatTest::getLogger(). */
function getLoggerAndHandler(): LoggerAndHandler {
    const logger = new Logger("foo");
    const handler = new TestHandler();
    logger.pushHandler(handler);
    logger.pushProcessor(new PsrLogMessageProcessor());
    handler.setFormatter(new LineFormatter("%level_name% %message%"));

    return { logger, handler };
}

/** PHP: PsrLogCompatTest::getLogs(). Lowercases the leading run of uppercase letters (the level name). */
function getLogs(handler: TestHandler): Array<string> {
    return handler.getRecords().map((record) => {
        const formatted = record.formatted ?? "";
        const [converted] = formatted.gsub("^%u+", (match) => match.lower());

        return converted;
    });
}

export = (): void => {
    describe("PsrLogCompat", () => {
        it("logs at every PSR-3 level via both the named method and log()", () => {
            // PHP: PsrLogCompatTest::testLogsAtAllLevels / provideLevelsAndMessages
            const levels: Array<
                [LogLevel, (logger: Logger, message: string) => void]
            > = [
                [
                    "emergency",
                    (logger, m) => logger.emergency(m, { user: "Bob" }),
                ],
                ["alert", (logger, m) => logger.alert(m, { user: "Bob" })],
                [
                    "critical",
                    (logger, m) => logger.critical(m, { user: "Bob" }),
                ],
                ["error", (logger, m) => logger.error(m, { user: "Bob" })],
                ["warning", (logger, m) => logger.warning(m, { user: "Bob" })],
                ["notice", (logger, m) => logger.notice(m, { user: "Bob" })],
                ["info", (logger, m) => logger.info(m, { user: "Bob" })],
                ["debug", (logger, m) => logger.debug(m, { user: "Bob" })],
            ];

            for (const [level, callNamedMethod] of levels) {
                const { logger, handler } = getLoggerAndHandler();
                const message = `message of level ${level} with context: {user}`;

                callNamedMethod(logger, message);
                logger.log(level, message, { user: "Bob" });

                const expected = [
                    `${level} message of level ${level} with context: Bob`,
                    `${level} message of level ${level} with context: Bob`,
                ];

                expect(getLogs(handler).join("|")).to.equal(expected.join("|"));
            }
        });

        it("throws for an unrecognized level name", () => {
            // PHP: PsrLogCompatTest::testThrowsOnInvalidLevel
            const { logger } = getLoggerAndHandler();

            expect(() => {
                logger.log("invalid level" as LogLevel, "Foo");
            }).to.throw();
        });

        it("replaces named and dotted placeholders, leaving unmatched ones alone", () => {
            // PHP: PsrLogCompatTest::testContextReplacement
            const { logger, handler } = getLoggerAndHandler();

            logger.info("{Message {nothing} {user} {foo.bar} a}", {
                user: "Bob",
                "foo.bar": "Bar",
            });

            expect(getLogs(handler).join("|")).to.equal(
                "info {Message {nothing} Bob Bar a}",
            );
        });

        it("accepts arbitrary scalar/table context values without erroring", () => {
            // PHP: PsrLogCompatTest::testContextCanContainAnything (adapted,
            // see class comment)
            const { logger, handler } = getLoggerAndHandler();

            logger.warning("Crazy context data", {
                bool: true,
                string: "Foo",
                int: 0,
                float: 0.5,
                nested: { withObject: "stand-in value" },
            });

            expect(getLogs(handler).join("|")).to.equal(
                "warning Crazy context data",
            );
        });

        it("accepts a plain value or a plain table under the exception context key", () => {
            // PHP: PsrLogCompatTest::testContextExceptionKeyCanBeExceptionOrOtherValues
            const { logger, handler } = getLoggerAndHandler();

            logger.warning("Random message", { exception: "oops" });
            logger.critical("Uncaught Exception!", {
                exception: { message: "Fail" },
            });

            expect(getLogs(handler).join("|")).to.equal(
                "warning Random message|critical Uncaught Exception!",
            );
        });
    });
};
