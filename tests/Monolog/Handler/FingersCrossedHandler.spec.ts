/// <reference types="@rbxts/testez/globals" />
import { ChannelLevelActivationStrategy } from "Monolog/Handler/FingersCrossed/ChannelLevelActivationStrategy";
import { ErrorLevelActivationStrategy } from "Monolog/Handler/FingersCrossed/ErrorLevelActivationStrategy";
import { FingersCrossedHandler } from "Monolog/Handler/FingersCrossedHandler";
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { TestHandler } from "Monolog/Handler/TestHandler";
import type { HandlerFactory } from "Monolog/Handler/FingersCrossedHandler";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\FingersCrossedHandlerTest`.
 *
 * `testHandleWithBadCallbackThrowsException` hands the handler a factory that
 * returns a bare `"foo"`. TypeScript rejects that at compile time, so the
 * factory goes through an explicit cast: the point of the test is
 * `getHandler()`'s own runtime `\RuntimeException` check (ported as an
 * `error()`), which a plain-Luau consumer can still trip, not TypeScript's
 * return-type checking.
 *
 * Upstream's PSR-level tests pass `Psr\Log\LogLevel::INFO`/`'warning'`; this
 * port has no `psr/log` package to take those constants from, so they are the
 * plain lowercase strings the `LogLevel` union in `LoggerInterface.ts` allows
 * -- the same values the PHP constants hold.
 */
export = (): void => {
    describe("FingersCrossedHandler", () => {
        it("buffers until the action level is reached", () => {
            // PHP: FingersCrossedHandlerTest::testHandleBuffers
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(test);

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Info));

            expect(test.hasDebugRecords()).to.equal(false);
            expect(test.hasInfoRecords()).to.equal(false);

            handler.handle(MonologTestCase.getRecord(Level.Warning));
            handler.close();

            expect(test.hasInfoRecords()).to.equal(true);
            expect(test.getRecords().size()).to.equal(3);
        });

        it("stops buffering after being triggered", () => {
            // PHP: FingersCrossedHandlerTest::testHandleStopsBufferingAfterTrigger
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(test);

            handler.handle(MonologTestCase.getRecord(Level.Warning));
            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.close();

            expect(test.hasWarningRecords()).to.equal(true);
            expect(test.hasDebugRecords()).to.equal(true);
        });

        it("resumes buffering after a reset", () => {
            // PHP: FingersCrossedHandlerTest::testHandleResetBufferingAfterReset
            const test = new TestHandler();

            test.setSkipReset(true);

            const handler = new FingersCrossedHandler(test);

            handler.handle(MonologTestCase.getRecord(Level.Warning));
            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.reset();
            handler.handle(MonologTestCase.getRecord(Level.Info));
            handler.close();

            expect(test.hasWarningRecords()).to.equal(true);
            expect(test.hasDebugRecords()).to.equal(true);
            expect(test.hasInfoRecords()).to.equal(false);
        });

        it("keeps buffering after a trigger when stopBuffering is disabled", () => {
            // PHP: FingersCrossedHandlerTest::testHandleResetBufferingAfterBeingTriggeredWhenStopBufferingIsDisabled
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                Level.Warning,
                0,
                false,
                false,
            );

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Warning));
            handler.handle(MonologTestCase.getRecord(Level.Info));
            handler.close();

            expect(test.hasWarningRecords()).to.equal(true);
            expect(test.hasDebugRecords()).to.equal(true);
            expect(test.hasInfoRecords()).to.equal(false);
        });

        it("drops the oldest records past the buffer limit", () => {
            // PHP: FingersCrossedHandlerTest::testHandleBufferLimit
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(test, Level.Warning, 2);

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Info));
            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasWarningRecords()).to.equal(true);
            expect(test.hasInfoRecords()).to.equal(true);
            expect(test.hasDebugRecords()).to.equal(false);
        });

        it("takes a factory in place of a handler", () => {
            // PHP: FingersCrossedHandlerTest::testHandleWithCallback
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(() => test);

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Info));

            expect(test.hasDebugRecords()).to.equal(false);
            expect(test.hasInfoRecords()).to.equal(false);

            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasInfoRecords()).to.equal(true);
            expect(test.getRecords().size()).to.equal(3);
        });

        it("throws when the factory does not return a handler", () => {
            // PHP: FingersCrossedHandlerTest::testHandleWithBadCallbackThrowsException
            const handler = new FingersCrossedHandler(
                (() => "foo") as unknown as HandlerFactory,
            );

            expect(() => {
                handler.handle(MonologTestCase.getRecord(Level.Warning));
            }).to.throw();
        });

        it("is always handling", () => {
            // PHP: FingersCrossedHandlerTest::testIsHandlingAlways
            const handler = new FingersCrossedHandler(
                new TestHandler(),
                Level.Error,
            );

            expect(
                handler.isHandling(MonologTestCase.getRecord(Level.Debug)),
            ).to.equal(true);
        });

        it("activates on ErrorLevelActivationStrategy", () => {
            // PHP: FingersCrossedHandlerTest::testErrorLevelActivationStrategy
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                new ErrorLevelActivationStrategy(Level.Warning),
            );

            handler.handle(MonologTestCase.getRecord(Level.Debug));

            expect(test.hasDebugRecords()).to.equal(false);

            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasDebugRecords()).to.equal(true);
            expect(test.hasWarningRecords()).to.equal(true);
        });

        it("activates on ErrorLevelActivationStrategy built from a PSR level", () => {
            // PHP: FingersCrossedHandlerTest::testErrorLevelActivationStrategyWithPsrLevel
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                new ErrorLevelActivationStrategy("warning"),
            );

            handler.handle(MonologTestCase.getRecord(Level.Debug));

            expect(test.hasDebugRecords()).to.equal(false);

            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasDebugRecords()).to.equal(true);
            expect(test.hasWarningRecords()).to.equal(true);
        });

        it("can be activated manually, overriding the strategy", () => {
            // PHP: FingersCrossedHandlerTest::testOverrideActivationStrategy
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                new ErrorLevelActivationStrategy("warning"),
            );

            handler.handle(MonologTestCase.getRecord(Level.Debug));

            expect(test.hasDebugRecords()).to.equal(false);

            handler.activate();

            expect(test.hasDebugRecords()).to.equal(true);

            handler.handle(MonologTestCase.getRecord(Level.Info));

            expect(test.hasInfoRecords()).to.equal(true);
        });

        it("activates per channel on ChannelLevelActivationStrategy", () => {
            // PHP: FingersCrossedHandlerTest::testChannelLevelActivationStrategy
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                new ChannelLevelActivationStrategy(Level.Error, {
                    othertest: Level.Debug,
                }),
            );

            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasWarningRecords()).to.equal(false);

            handler.handle(
                MonologTestCase.getRecord(Level.Debug, "test", {}, "othertest"),
            );

            expect(test.hasDebugRecords()).to.equal(true);
            expect(test.hasWarningRecords()).to.equal(true);
        });

        it("activates per channel on ChannelLevelActivationStrategy built from PSR levels", () => {
            // PHP: FingersCrossedHandlerTest::testChannelLevelActivationStrategyWithPsrLevels
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                new ChannelLevelActivationStrategy("error", {
                    othertest: "debug",
                }),
            );

            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasWarningRecords()).to.equal(false);

            handler.handle(
                MonologTestCase.getRecord(Level.Debug, "test", {}, "othertest"),
            );

            expect(test.hasDebugRecords()).to.equal(true);
            expect(test.hasWarningRecords()).to.equal(true);
        });

        it("runs its own processors on buffered records", () => {
            // PHP: FingersCrossedHandlerTest::testHandleUsesProcessors
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(test, Level.Info);

            handler.pushProcessor((record: LogRecord) => {
                record.extra.foo = true;

                return record;
            });
            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasWarningRecords()).to.equal(true);

            const records = test.getRecords();

            expect(records[0].extra.foo).to.equal(true);
        });

        it("flushes records at the passthru level on close", () => {
            // PHP: FingersCrossedHandlerTest::testPassthruOnClose
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                new ErrorLevelActivationStrategy(Level.Warning),
                0,
                true,
                true,
                Level.Info,
            );

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Info));
            handler.handle(MonologTestCase.getRecord(Level.Notice));
            handler.close();

            expect(test.hasDebugRecords()).to.equal(false);
            expect(test.hasInfoRecords()).to.equal(true);
            expect(test.hasNoticeRecords()).to.equal(true);
        });

        it("flushes records at a PSR-named passthru level on close", () => {
            // PHP: FingersCrossedHandlerTest::testPsrLevelPassthruOnClose
            const test = new TestHandler();
            const handler = new FingersCrossedHandler(
                test,
                new ErrorLevelActivationStrategy(Level.Warning),
                0,
                true,
                true,
                "info",
            );

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Info));
            handler.handle(MonologTestCase.getRecord(Level.Notice));
            handler.close();

            expect(test.hasDebugRecords()).to.equal(false);
            expect(test.hasInfoRecords()).to.equal(true);
            expect(test.hasNoticeRecords()).to.equal(true);
        });
    });
};
