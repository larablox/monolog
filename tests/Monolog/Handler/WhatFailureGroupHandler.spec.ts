/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { TestHandler } from "Monolog/Handler/TestHandler";
import { WhatFailureGroupHandler } from "Monolog/Handler/WhatFailureGroupHandler";
import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\WhatFailureGroupHandlerTest`.
 *
 * `testConstructorOnlyTakesHandler` casts its bare `"foo"` for the same reason
 * `GroupHandler.spec.ts` does -- see the note there.
 *
 * Upstream's `ExceptionTestHandler` lives in its own non-test fixture file
 * (`tests/Monolog/Handler/ExceptionTestHandler.php`). TestEZ only discovers
 * modules whose name ends in `.spec`, and a fixture used by exactly one spec
 * has no reason to be a separate `ModuleScript`, so it is declared inline
 * below -- the same treatment `AbstractProcessingHandler.spec.ts` gives its
 * own concrete subclass.
 */
class ExceptionTestHandler extends TestHandler {
    protected write(): void {
        error("ExceptionTestHandler::handle");
    }
}

export = (): void => {
    describe("WhatFailureGroupHandler", () => {
        it("only takes handlers", () => {
            // PHP: WhatFailureGroupHandlerTest::testConstructorOnlyTakesHandler
            expect(() => {
                new WhatFailureGroupHandler([
                    new TestHandler(),
                    "foo" as unknown as HandlerInterface,
                ]);
            }).to.throw();
        });

        it("forwards a handled record to every grouped handler", () => {
            // PHP: WhatFailureGroupHandlerTest::testHandle
            const testHandlers = [new TestHandler(), new TestHandler()];
            const handler = new WhatFailureGroupHandler(testHandlers);

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Info));

            for (const test of testHandlers) {
                expect(test.hasDebugRecords()).to.equal(true);
                expect(test.hasInfoRecords()).to.equal(true);
                expect(test.getRecords().size()).to.equal(2);
            }
        });

        it("forwards a batch to every grouped handler", () => {
            // PHP: WhatFailureGroupHandlerTest::testHandleBatch
            const testHandlers = [new TestHandler(), new TestHandler()];
            const handler = new WhatFailureGroupHandler(testHandlers);

            handler.handleBatch([
                MonologTestCase.getRecord(Level.Debug),
                MonologTestCase.getRecord(Level.Info),
            ]);

            for (const test of testHandlers) {
                expect(test.hasDebugRecords()).to.equal(true);
                expect(test.hasInfoRecords()).to.equal(true);
                expect(test.getRecords().size()).to.equal(2);
            }
        });

        it("is handling when any grouped handler is", () => {
            // PHP: WhatFailureGroupHandlerTest::testIsHandling
            const handler = new WhatFailureGroupHandler([
                new TestHandler(Level.Error),
                new TestHandler(Level.Warning),
            ]);

            expect(
                handler.isHandling(MonologTestCase.getRecord(Level.Error)),
            ).to.equal(true);
            expect(
                handler.isHandling(MonologTestCase.getRecord(Level.Warning)),
            ).to.equal(true);
            expect(
                handler.isHandling(MonologTestCase.getRecord(Level.Debug)),
            ).to.equal(false);
        });

        it("runs its own processors before forwarding", () => {
            // PHP: WhatFailureGroupHandlerTest::testHandleUsesProcessors
            const test = new TestHandler();
            const handler = new WhatFailureGroupHandler([test]);

            handler.pushProcessor((record: LogRecord) => {
                record.extra.foo = true;

                return record;
            });
            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasWarningRecords()).to.equal(true);

            const records = test.getRecords();

            expect(records[0].extra.foo).to.equal(true);
        });

        it("runs its own processors before forwarding a batch", () => {
            // PHP: WhatFailureGroupHandlerTest::testHandleBatchUsesProcessors
            const testHandlers = [new TestHandler(), new TestHandler()];
            const handler = new WhatFailureGroupHandler(testHandlers);

            handler.pushProcessor((record: LogRecord) => {
                record.extra.foo = true;

                return record;
            });
            handler.pushProcessor((record: LogRecord) => {
                record.extra.foo2 = true;

                return record;
            });
            handler.handleBatch([
                MonologTestCase.getRecord(Level.Debug),
                MonologTestCase.getRecord(Level.Info),
            ]);

            for (const test of testHandlers) {
                expect(test.hasDebugRecords()).to.equal(true);
                expect(test.hasInfoRecords()).to.equal(true);
                expect(test.getRecords().size()).to.equal(2);

                const records = test.getRecords();

                expect(records[0].extra.foo).to.equal(true);
                expect(records[1].extra.foo).to.equal(true);
                expect(records[0].extra.foo2).to.equal(true);
                expect(records[1].extra.foo2).to.equal(true);
            }
        });

        it("swallows a failing handler and keeps going", () => {
            // PHP: WhatFailureGroupHandlerTest::testHandleException
            const test = new TestHandler();
            const exception = new ExceptionTestHandler();
            const handler = new WhatFailureGroupHandler([
                exception,
                test,
                exception,
            ]);

            handler.pushProcessor((record: LogRecord) => {
                record.extra.foo = true;

                return record;
            });
            handler.handle(MonologTestCase.getRecord(Level.Warning));

            expect(test.hasWarningRecords()).to.equal(true);

            const records = test.getRecords();

            expect(records[0].extra.foo).to.equal(true);
        });

        it("does not let one handler's processors reach another", () => {
            // PHP: WhatFailureGroupHandlerTest::testProcessorsDoNotInterfereBetweenHandlers
            const t1 = new TestHandler();
            const t2 = new TestHandler();
            const handler = new WhatFailureGroupHandler([t1, t2]);

            t1.pushProcessor((record: LogRecord) => {
                record.extra.foo = "bar";

                return record;
            });
            handler.handle(MonologTestCase.getRecord());

            expect(next(t2.getRecords()[0].extra)[0]).to.equal(undefined);
        });

        it("does not let one handler's processors reach another, in a batch", () => {
            // PHP: WhatFailureGroupHandlerTest::testProcessorsDoNotInterfereBetweenHandlersWithBatch
            const t1 = new TestHandler();
            const t2 = new TestHandler();
            const handler = new WhatFailureGroupHandler([t1, t2]);

            t1.pushProcessor((record: LogRecord) => {
                record.extra.foo = "bar";

                return record;
            });
            handler.handleBatch([MonologTestCase.getRecord()]);

            expect(next(t2.getRecords()[0].extra)[0]).to.equal(undefined);
        });
    });
};
