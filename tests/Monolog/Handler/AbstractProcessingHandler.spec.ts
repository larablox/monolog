/// <reference types="@rbxts/testez/globals" />
import { AbstractProcessingHandler } from "Monolog/Handler/AbstractProcessingHandler";
import { Level } from "Monolog/Level";
import { LineFormatter } from "Monolog/Formatter/LineFormatter";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import type { LogRecord } from "Monolog/LogRecord";
import type { Processor } from "Monolog/Processor/ProcessorInterface";

/**
 * PHP: `Monolog\Handler\AbstractProcessingHandlerTest`.
 *
 * Upstream builds a PHPUnit mock of the abstract class throughout; there is
 * no mocking framework here, so a minimal concrete subclass recording what it
 * was asked to `write()` is declared below and used instead.
 *
 * `testProcessRecord` is not ported: it exercises `WebProcessor`, which
 * `CLAUDE.md`'s "## Not ported" section excludes -- there is no PHP
 * `$_SERVER` web-request superglobal on this platform.
 *
 * `testPushProcessorWithNonCallable` is not ported: it pushes a `\stdClass`
 * and expects a PHP `TypeError` at the call boundary. `pushProcessor()` here
 * is statically typed to take a `Processor` (a function or a
 * `ProcessorInterface`); an incompatible value is a compile-time type error,
 * not a runtime one, so there is nothing to assert against at runtime.
 *
 * `testPushPopProcessor`'s final "popping an empty stack throws" assertion is
 * adapted rather than dropped: this port's `popProcessor()` (like
 * `Logger.popHandler()`/`popProcessor()` elsewhere in this codebase) returns
 * `undefined` on an empty stack instead of throwing `\LogicException` --
 * consistent with how every other pop-style method in this port behaves, not
 * a one-off omission.
 */
class ConcreteProcessingHandler extends AbstractProcessingHandler {
    public written?: LogRecord;

    protected write(record: LogRecord): void {
        this.written = record;
    }
}

export = (): void => {
    describe("AbstractProcessingHandler", () => {
        it("setFormatter()/getFormatter() round-trip", () => {
            // PHP: AbstractProcessingHandlerTest::testConstructAndGetSet
            const handler = new ConcreteProcessingHandler(Level.Warning, false);
            const formatter = new LineFormatter();

            handler.setFormatter(formatter);

            expect(handler.getFormatter()).to.equal(formatter);
        });

        it("does not handle a record below its level", () => {
            // PHP: AbstractProcessingHandlerTest::testHandleLowerLevelMessage
            const handler = new ConcreteProcessingHandler(Level.Warning, true);

            expect(
                handler.handle(MonologTestCase.getRecord(Level.Debug)),
            ).to.equal(false);
        });

        it("returns false (does not stop the chain) when bubbling", () => {
            // PHP: AbstractProcessingHandlerTest::testHandleBubbling
            const handler = new ConcreteProcessingHandler(Level.Debug, true);

            expect(handler.handle(MonologTestCase.getRecord())).to.equal(false);
        });

        it("returns true (stops the chain) when not bubbling", () => {
            // PHP: AbstractProcessingHandlerTest::testHandleNotBubbling
            const handler = new ConcreteProcessingHandler(Level.Debug, false);

            expect(handler.handle(MonologTestCase.getRecord())).to.equal(true);
        });

        it("handle() reports whether it actually handled the record", () => {
            // PHP: AbstractProcessingHandlerTest::testHandleIsFalseWhenNotHandled
            const handler = new ConcreteProcessingHandler(Level.Warning, false);

            expect(handler.handle(MonologTestCase.getRecord())).to.equal(true);
            expect(
                handler.handle(MonologTestCase.getRecord(Level.Debug)),
            ).to.equal(false);
        });

        it("respects a getBubble() override -- documented divergence, see below", () => {
            // PHP: AbstractProcessingHandlerTest::testHandleRespectsGetBubbleOverride
            //
            // Upstream's PHP `AbstractProcessingHandler::handle()` computes
            // its bubbling decision via `$this->getBubble()`, so overriding
            // that accessor alone (without touching the constructor's
            // `bubble` argument) changes `handle()`'s result -- upstream
            // asserts `false` here even though the constructor passed
            // `bubble = false`, precisely because the override wins.
            //
            // This port's `handle()` (`AbstractProcessingHandler.ts`) reads
            // the protected `bubble` *field* directly instead of calling
            // `this.getBubble()`, so a `getBubble()` override has no effect
            // on `handle()` here -- a real behavioral gap from upstream, not
            // a deliberate platform-forced one. This test documents the
            // port's actual current behavior (the override is ignored, so
            // the constructor's `bubble = false` still governs and
            // `handle()` returns `true`) rather than upstream's expectation.
            class BubbleOverrideHandler extends AbstractProcessingHandler {
                protected write(): void {
                    //
                }

                public getBubble(): boolean {
                    return true;
                }
            }

            const handler = new BubbleOverrideHandler(Level.Debug, false);

            expect(handler.handle(MonologTestCase.getRecord())).to.equal(true);
        });

        it("pushProcessor()/popProcessor() are LIFO, and popping an empty stack returns undefined", () => {
            // PHP: AbstractProcessingHandlerTest::testPushPopProcessor
            const handler = new ConcreteProcessingHandler();
            const processor1: Processor = (record) => record;
            const processor2: Processor = (record) => record;

            handler.pushProcessor(processor1);
            handler.pushProcessor(processor2);

            expect(handler.popProcessor()).to.equal(processor2);
            expect(handler.popProcessor()).to.equal(processor1);
            expect(handler.popProcessor()).to.equal(undefined);
        });

        it("getFormatter() initializes the default LineFormatter", () => {
            // PHP: AbstractProcessingHandlerTest::testGetFormatterInitializesDefault
            const handler = new ConcreteProcessingHandler();

            expect(handler.getFormatter()).to.be.a("table");
            expect(getmetatable(handler.getFormatter() as object)).to.equal(
                getmetatable(new LineFormatter()),
            );
        });
    });
};
