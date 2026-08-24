/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { Logger } from "Monolog/Logger";
import { TagProcessor } from "Monolog/Processor/TagProcessor";
import { TestHandler } from "Monolog/Handler/TestHandler";
import { UidProcessor } from "Monolog/Processor/UidProcessor";
import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * A minimal `HandlerInterface` implementation that counts calls and lets a
 * test choose what `isHandling()`/`handle()` return -- this codebase has no
 * mocking framework, so this stands in everywhere upstream uses
 * `getMockBuilder('Monolog\Handler\HandlerInterface')`/`createMock(...)`.
 */
class RecordingHandler implements HandlerInterface {
    public isHandlingCallCount = 0;
    public handleCallCount = 0;
    public handledRecords = new Array<LogRecord>();

    public constructor(
        private readonly isHandlingResult = true,
        private readonly handleResult = true,
    ) {}

    public isHandling(): boolean {
        this.isHandlingCallCount++;

        return this.isHandlingResult;
    }

    public handle(record: LogRecord): boolean {
        this.handleCallCount++;
        this.handledRecords.push(record);

        return this.handleResult;
    }

    public handleBatch(records: Array<LogRecord>): void {
        for (const record of records) {
            this.handle(record);
        }
    }

    public close(): void {
        //
    }
}

/** A `HandlerInterface` whose `handle()` always throws -- for the exception-handling tests. */
class ThrowingHandler implements HandlerInterface {
    public isHandling(): boolean {
        return true;
    }

    public handle(): boolean {
        error("Some handler exception");

        return false;
    }

    public handleBatch(records: Array<LogRecord>): void {
        for (let index = 0; index < records.size(); index++) {
            this.handle();
        }
    }

    public close(): void {
        //
    }
}

/**
 * PHP: `Monolog\LoggingHandler` (a module-level helper class in
 * `LoggerTest.php`, not a mock) -- logs back into the same `Logger` whenever
 * it handles a record, used to exercise the infinite-logging-loop guard.
 */
class LoggingHandler implements HandlerInterface {
    public constructor(private readonly logger: Logger) {}

    public isHandling(): boolean {
        return true;
    }

    public handle(): boolean {
        this.logger.debug("Log triggered while logging");

        return false;
    }

    public handleBatch(records: Array<LogRecord>): void {
        for (let index = 0; index < records.size(); index++) {
            this.handle();
        }
    }

    public close(): void {
        //
    }
}

/**
 * PHP: `Monolog\LoggerTest`.
 *
 * `Logger.ts`'s own class comment documents three things this port does not
 * carry: timezones and microsecond timestamps (`LogRecord.datetime` is a
 * plain `os.time()` Unix timestamp, see `LogRecord.ts`), the
 * `__serialize`/`__unserialize` magic methods (no PHP serialization here),
 * and `Fiber`-keyed loop detection (there is no fiber concept in Luau -- the
 * loop guard is a single instance counter instead, which still reproduces
 * upstream's non-fiber test scenarios exactly, see below). On that basis,
 * none of these are ported: `testSetTimezone`, `testTimezoneIsRespectedInUTC`,
 * `testTimezoneIsRespectedInOtherTimezone` (+ their shared `tearDown`),
 * `testUseMicrosecondTimestamps`, `testSerializable`, `testLogWithDateTime`
 * (its `addRecord($level, $message, $context, $datetime)` 4-argument form
 * does not exist here -- this port's `addRecord()` takes only
 * `level, message, context`), `testLogCycleDetectionWithFibersWithoutCycle`,
 * `testLogCycleDetectionWithFibersWithCycle`.
 *
 * `testReset` is adapted, not skipped: upstream builds a
 * `FingersCrossedHandler(GroupHandler([BufferHandler(TestHandler)]))` stack,
 * none of which (`FingersCrossedHandler`, `GroupHandler`, `BufferHandler`)
 * this port ships (see `CLAUDE.md`'s "## Not ported"). The adapted version
 * below drives `Logger.reset()` through a plain `TestHandler` +
 * `UidProcessor` instead, which is enough to exercise the same underlying
 * mechanic: `Logger.reset()` calls `reset()` on every `ResettableInterface`
 * handler/processor.
 *
 * `testProcessorsInCtor`/`testPushPopProcessor`/`testProcessorsAreCalledOnlyOnce`
 * swap upstream's `WebProcessor` (not ported, see `CLAUDE.md`) for
 * `TagProcessor`, a processor this port does ship.
 *
 * `testPushPopHandler`/`testPushPopProcessor`'s final "popping an empty stack
 * throws" assertion is adapted the same way it is throughout this port's
 * tests: `popHandler()`/`popProcessor()` return `undefined` on an empty
 * stack instead of throwing `\LogicException` (see
 * `AbstractProcessingHandler.spec.ts`'s class comment for the same pattern).
 *
 * `testSetHandlers`'s associative-array half ("keys have been scrubbed") is
 * not ported: `setHandlers()` here is typed `Array<HandlerInterface>`, a
 * plain list with no string keys to scrub in the first place.
 * `testHandlersNotCalledBeforeFirstHandlingWhenProcessorsPresentWithAssocArray`
 * is not ported for the same reason -- it is upstream's constructor-array
 * variant of `testHandlersNotCalledBeforeFirstHandlingWhenProcessorsPresent`
 * (already ported below), and this port's `Logger` constructor's `handlers`
 * parameter is the same plain `Array<HandlerInterface>` `setHandlers()` takes,
 * so it would exercise identical mechanics with no assoc-key aspect left to
 * distinguish it.
 */
export = (): void => {
    describe("Logger", () => {
        it("getName() returns the channel name", () => {
            // PHP: LoggerTest::testGetName
            const logger = new Logger("foo");

            expect(logger.getName()).to.equal("foo");
        });

        it("withName() returns a clone with a new name, sharing handlers", () => {
            // PHP: LoggerTest::testWithName
            const handler = new TestHandler();
            const first = new Logger("first", [handler]);
            const second = first.withName("second");

            expect(first.getName()).to.equal("first");
            expect(second.getName()).to.equal("second");
            expect(second.popHandler()).to.equal(handler);
        });

        it("toMonologLevel() converts PSR-3 level names", () => {
            // PHP: LoggerTest::testConvertPSR3ToMonologLevel
            expect(Logger.toMonologLevel("debug")).to.equal(Level.Debug);
            expect(Logger.toMonologLevel("info")).to.equal(Level.Info);
            expect(Logger.toMonologLevel("notice")).to.equal(Level.Notice);
            expect(Logger.toMonologLevel("warning")).to.equal(Level.Warning);
            expect(Logger.toMonologLevel("error")).to.equal(Level.Error);
            expect(Logger.toMonologLevel("critical")).to.equal(Level.Critical);
            expect(Logger.toMonologLevel("alert")).to.equal(Level.Alert);
            expect(Logger.toMonologLevel("emergency")).to.equal(
                Level.Emergency,
            );
        });

        it("addRecord()/log() remap RFC 5424 numeric levels to Monolog levels", () => {
            // PHP: LoggerTest::testConvertRFC5424ToMonologLevelInAddRecordAndLog
            const logger = new Logger("test");
            const handler = new TestHandler();
            logger.pushHandler(handler);

            const levelPairs: Array<[number, Level]> = [
                [7, Level.Debug],
                [6, Level.Info],
                [5, Level.Notice],
                [4, Level.Warning],
                [3, Level.Error],
                [2, Level.Critical],
                [1, Level.Alert],
                [0, Level.Emergency],
            ];

            for (const [rfc5424Level, monologLevel] of levelPairs) {
                handler.reset();
                logger.addRecord(rfc5424Level, "test");
                logger.log(rfc5424Level, "test");
                const records = handler.getRecords();

                expect(records.size()).to.equal(2);
                expect(records[0].level).to.equal(monologLevel);
                expect(records[1].level).to.equal(monologLevel);
            }
        });

        it("stamps every record with the logger's channel name", () => {
            // PHP: LoggerTest::testChannel
            const logger = new Logger("foo");
            const handler = new TestHandler();
            logger.pushHandler(handler);

            logger.warning("test");
            const [record] = handler.getRecords();

            expect(record.channel).to.equal("foo");
        });

        it("prevents infinite logging loops, warns once, and stops", () => {
            // PHP: LoggerTest::testLogPreventsCircularLogging
            const logger = new Logger("test");
            const loggingHandler = new LoggingHandler(logger);
            const testHandler = new TestHandler();

            logger.pushHandler(loggingHandler);
            logger.pushHandler(testHandler);

            logger.addRecord(Level.Alert, "test");

            const records = testHandler.getRecords();

            expect(records.size()).to.equal(3);
            expect(records[0].level).to.equal(Level.Alert);
            expect(records[1].level).to.equal(Level.Debug);
            expect(records[2].level).to.equal(Level.Warning);
        });

        it("addRecord() calls handle() without checking isHandling() when no processors are present", () => {
            // PHP: LoggerTest::testLog
            const logger = new Logger("test");
            const handler = new RecordingHandler(true, true);
            logger.pushHandler(handler);

            expect(logger.addRecord(Level.Warning, "test")).to.equal(true);
            expect(handler.isHandlingCallCount).to.equal(0);
            expect(handler.handleCallCount).to.equal(1);
        });

        it("addRecord() is always handled when no processors are present (duplicate of the above upstream)", () => {
            // PHP: LoggerTest::testLogAlwaysHandledIfNoProcessorsArePresent
            const logger = new Logger("test");
            const handler = new RecordingHandler(true, true);
            logger.pushHandler(handler);

            expect(logger.addRecord(Level.Warning, "test")).to.equal(true);
            expect(handler.isHandlingCallCount).to.equal(0);
            expect(handler.handleCallCount).to.equal(1);
        });

        it("addRecord() is not handled when a processor is present and isHandling() is false", () => {
            // PHP: LoggerTest::testLogNotHandledIfProcessorsArePresent
            const logger = new Logger("test");
            const handler = new RecordingHandler(false, true);

            logger.pushProcessor((record) => record);
            logger.pushHandler(handler);

            expect(logger.addRecord(Level.Warning, "test")).to.equal(false);
        });

        it("constructor handlers end up on the stack, poppable in ctor-array order", () => {
            // PHP: LoggerTest::testHandlersInCtor
            const handler1 = new TestHandler();
            const handler2 = new TestHandler();
            const logger = new Logger("test", [handler1, handler2]);

            expect(logger.popHandler()).to.equal(handler1);
            expect(logger.popHandler()).to.equal(handler2);
        });

        it("constructor processors end up on the stack, poppable in ctor-array order", () => {
            // PHP: LoggerTest::testProcessorsInCtor (WebProcessor -> TagProcessor, see class comment)
            const processor1 = new TagProcessor();
            const processor2 = new TagProcessor();
            const logger = new Logger("test", [], [processor1, processor2]);

            expect(logger.popProcessor()).to.equal(processor1);
            expect(logger.popProcessor()).to.equal(processor2);
        });

        it("pushHandler()/popHandler() are LIFO, and popping an empty stack returns undefined", () => {
            // PHP: LoggerTest::testPushPopHandler
            const logger = new Logger("test");
            const handler1 = new TestHandler();
            const handler2 = new TestHandler();

            logger.pushHandler(handler1);
            logger.pushHandler(handler2);

            expect(logger.popHandler()).to.equal(handler2);
            expect(logger.popHandler()).to.equal(handler1);
            expect(logger.popHandler()).to.equal(undefined);
        });

        it("setHandlers() replaces the handler stack", () => {
            // PHP: LoggerTest::testSetHandlers (list half only, see class comment)
            const logger = new Logger("test");
            const handler1 = new TestHandler();
            const handler2 = new TestHandler();

            logger.pushHandler(handler1);
            logger.setHandlers([handler2]);

            expect(logger.getHandlers().size()).to.equal(1);
            expect(logger.getHandlers()[0]).to.equal(handler2);

            logger.setHandlers([handler1, handler2]);

            expect(logger.getHandlers().size()).to.equal(2);
            expect(logger.getHandlers()[0]).to.equal(handler1);
            expect(logger.getHandlers()[1]).to.equal(handler2);
        });

        it("pushProcessor()/popProcessor() are LIFO, and popping an empty stack returns undefined", () => {
            // PHP: LoggerTest::testPushPopProcessor (WebProcessor -> TagProcessor)
            const logger = new Logger("test");
            const processor1 = new TagProcessor();
            const processor2 = new TagProcessor();

            logger.pushProcessor(processor1);
            logger.pushProcessor(processor2);

            expect(logger.popProcessor()).to.equal(processor2);
            expect(logger.popProcessor()).to.equal(processor1);
            expect(logger.popProcessor()).to.equal(undefined);
        });

        it("runs pushed processors on every record", () => {
            // PHP: LoggerTest::testProcessorsAreExecuted
            const logger = new Logger("test");
            const handler = new TestHandler();
            logger.pushHandler(handler);
            logger.pushProcessor((record) => {
                record.extra.win = true;

                return record;
            });

            logger.error("test");
            const [record] = handler.getRecords();

            expect(record.extra.win).to.equal(true);
        });

        it("runs each processor exactly once per record", () => {
            // PHP: LoggerTest::testProcessorsAreCalledOnlyOnce (WebProcessor mock -> counting processor)
            const logger = new Logger("test");
            const handler = new RecordingHandler(true, true);
            logger.pushHandler(handler);

            let callCount = 0;
            logger.pushProcessor((record) => {
                callCount++;

                return record;
            });

            logger.error("test");

            expect(callCount).to.equal(1);
        });

        it("does not run processors when the handler never handles the record", () => {
            // PHP: LoggerTest::testProcessorsNotCalledWhenNotHandled
            const logger = new Logger("test");
            const handler = new RecordingHandler(false, true);
            logger.pushHandler(handler);

            let processorCalled = false;
            logger.pushProcessor((record) => {
                processorCalled = true;

                return record;
            });

            logger.alert("test");

            expect(processorCalled).to.equal(false);
        });

        it("skips isHandling() once a prior handler already triggered processing", () => {
            // PHP: LoggerTest::testHandlersNotCalledBeforeFirstHandlingWhenProcessorsPresent
            const logger = new Logger("test");
            logger.pushProcessor((record) => record);

            // Pushed in this order; pushHandler() is LIFO, so they are
            // visited handler3, handler2, handler1 -- matching upstream's
            // own array_unshift-based stack, see the class comment on
            // `Logger.pushHandler()`.
            const handler1 = new RecordingHandler(false, false);
            logger.pushHandler(handler1);

            const handler2 = new RecordingHandler(true, false);
            logger.pushHandler(handler2);

            const handler3 = new RecordingHandler(false, false);
            logger.pushHandler(handler3);

            logger.debug("test");

            expect(handler3.isHandlingCallCount).to.equal(1);
            expect(handler3.handleCallCount).to.equal(0);

            expect(handler2.isHandlingCallCount).to.equal(1);
            expect(handler2.handleCallCount).to.equal(1);

            expect(handler1.isHandlingCallCount).to.equal(0);
            expect(handler1.handleCallCount).to.equal(1);
        });

        it("bubbles to the next handler when handle() returns false", () => {
            // PHP: LoggerTest::testBubblingWhenTheHandlerReturnsFalse
            const logger = new Logger("test");
            const handler1 = new RecordingHandler(true, false);
            logger.pushHandler(handler1);

            const handler2 = new RecordingHandler(true, false);
            logger.pushHandler(handler2);

            logger.debug("test");

            expect(handler1.handleCallCount).to.equal(1);
            expect(handler2.handleCallCount).to.equal(1);
        });

        it("stops bubbling once a handler's handle() returns true", () => {
            // PHP: LoggerTest::testNotBubblingWhenTheHandlerReturnsTrue
            const logger = new Logger("test");

            // Pushed last, so visited first (LIFO).
            const handler2 = new RecordingHandler(true, true);
            const handler1 = new RecordingHandler(true, false);
            logger.pushHandler(handler1);
            logger.pushHandler(handler2);

            logger.debug("test");

            expect(handler2.handleCallCount).to.equal(1);
            expect(handler1.handleCallCount).to.equal(0);
        });

        it("isHandling() checks every handler until one says yes", () => {
            // PHP: LoggerTest::testIsHandling
            const logger = new Logger("test");
            const handler1 = new RecordingHandler(false, true);
            logger.pushHandler(handler1);

            expect(logger.isHandling(Level.Debug)).to.equal(false);

            const handler2 = new RecordingHandler(true, true);
            logger.pushHandler(handler2);

            expect(logger.isHandling(Level.Debug)).to.equal(true);
        });

        it("every PSR-3 method logs at its matching level", () => {
            // PHP: LoggerTest::testLogMethods / logMethodProvider
            const logger = new Logger("foo");
            const handler = new TestHandler();
            logger.pushHandler(handler);

            const cases: Array<[() => void, Level]> = [
                [() => logger.debug("test"), Level.Debug],
                [() => logger.info("test"), Level.Info],
                [() => logger.notice("test"), Level.Notice],
                [() => logger.warning("test"), Level.Warning],
                [() => logger.error("test"), Level.Error],
                [() => logger.critical("test"), Level.Critical],
                [() => logger.alert("test"), Level.Alert],
                [() => logger.emergency("test"), Level.Emergency],
            ];

            for (const [call, expectedLevel] of cases) {
                handler.clear();
                call();
                const [record] = handler.getRecords();

                expect(record.level).to.equal(expectedLevel);
            }
        });

        it("does not let one handler's processor leak extra into another handler's records", () => {
            // PHP: LoggerTest::testProcessorsDoNotInterfereBetweenHandlers
            const logger = new Logger("foo");
            const t1 = new TestHandler();
            const t2 = new TestHandler();
            logger.pushHandler(t1);
            logger.pushHandler(t2);

            t1.pushProcessor((record) => {
                record.extra.foo = "bar";

                return record;
            });

            logger.error("Foo");

            expect(t2.getRecords()[0].extra.foo).to.equal(undefined);
        });

        it("setExceptionHandler()/getExceptionHandler() round-trip", () => {
            // PHP: LoggerTest::testSetExceptionHandler
            const logger = new Logger("test");

            expect(logger.getExceptionHandler()).to.equal(undefined);

            const callback = () => {
                //
            };
            logger.setExceptionHandler(callback);

            expect(logger.getExceptionHandler()).to.equal(callback);
        });

        it("re-raises a handler's error when no custom exception handler is set", () => {
            // PHP: LoggerTest::testDefaultHandleException
            const logger = new Logger("test");
            logger.pushHandler(new ThrowingHandler());

            expect(() => logger.info("test")).to.throw(
                "Some handler exception",
            );
        });

        it("routes a handler's error to a custom exception handler instead of throwing", () => {
            // PHP: LoggerTest::testCustomHandleException
            const logger = new Logger("test");
            let capturedMessage: string | undefined;
            let capturedRecord: LogRecord | undefined;

            logger.setExceptionHandler((err, record) => {
                capturedMessage = tostring(err);
                capturedRecord = record;
            });

            logger.pushHandler(new ThrowingHandler());

            expect(() => logger.info("test")).never.to.throw();
            expect(capturedMessage).never.to.equal(undefined);
            expect(
                (capturedMessage as string).find(
                    "Some handler exception",
                    1,
                    true,
                )[0],
            ).to.be.ok();
            expect(capturedRecord).never.to.equal(undefined);
            expect((capturedRecord as LogRecord).message).to.equal("test");
        });

        it("reset() clears handlers and processors that support it", () => {
            // PHP: LoggerTest::testReset (adapted -- see class comment: no
            // FingersCrossedHandler/GroupHandler/BufferHandler in this port)
            const logger = new Logger("app");
            const testHandler = new TestHandler();
            logger.pushHandler(testHandler);

            const uidProcessor = new UidProcessor(10);
            const uid1 = uidProcessor.getUid();
            logger.pushProcessor(uidProcessor);

            logger.debug("debug1");
            expect(testHandler.hasDebugRecords()).to.equal(true);

            logger.reset();

            expect(testHandler.hasDebugRecords()).to.equal(false);
            expect(uidProcessor.getUid()).never.to.equal(uid1);
        });
    });
};
