/// <reference types="@rbxts/testez/globals" />
import { GroupHandler } from "Monolog/Handler/GroupHandler";
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { TestHandler } from "Monolog/Handler/TestHandler";
import type { HandlerInterface } from "Monolog/Handler/HandlerInterface";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\GroupHandlerTest`.
 *
 * `testConstructorOnlyTakesHandler` passes a bare `"foo"` string where a
 * handler is expected. TypeScript rejects that at compile time, so the value
 * goes through an explicit cast: the point of the test is `GroupHandler`'s own
 * runtime `\InvalidArgumentException` check (ported as an `error()`), which a
 * plain-Luau consumer can still trip, not TypeScript's parameter typing.
 */
export = (): void => {
    describe("GroupHandler", () => {
        it("only takes handlers", () => {
            // PHP: GroupHandlerTest::testConstructorOnlyTakesHandler
            expect(() => {
                new GroupHandler([
                    new TestHandler(),
                    "foo" as unknown as HandlerInterface,
                ]);
            }).to.throw();
        });

        it("forwards a handled record to every grouped handler", () => {
            // PHP: GroupHandlerTest::testHandle
            const testHandlers = [new TestHandler(), new TestHandler()];
            const handler = new GroupHandler(testHandlers);

            handler.handle(MonologTestCase.getRecord(Level.Debug));
            handler.handle(MonologTestCase.getRecord(Level.Info));

            for (const test of testHandlers) {
                expect(test.hasDebugRecords()).to.equal(true);
                expect(test.hasInfoRecords()).to.equal(true);
                expect(test.getRecords().size()).to.equal(2);
            }
        });

        it("forwards a batch to every grouped handler", () => {
            // PHP: GroupHandlerTest::testHandleBatch
            const testHandlers = [new TestHandler(), new TestHandler()];
            const handler = new GroupHandler(testHandlers);

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
            // PHP: GroupHandlerTest::testIsHandling
            const handler = new GroupHandler([
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
            // PHP: GroupHandlerTest::testHandleUsesProcessors
            const test = new TestHandler();
            const handler = new GroupHandler([test]);

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
            // PHP: GroupHandlerTest::testHandleBatchUsesProcessors
            const testHandlers = [new TestHandler(), new TestHandler()];
            const handler = new GroupHandler(testHandlers);

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

        it("does not let one handler's processors reach another", () => {
            // PHP: GroupHandlerTest::testProcessorsDoNotInterfereBetweenHandlers
            const t1 = new TestHandler();
            const t2 = new TestHandler();
            const handler = new GroupHandler([t1, t2]);

            t1.pushProcessor((record: LogRecord) => {
                record.extra.foo = "bar";

                return record;
            });
            handler.handle(MonologTestCase.getRecord());

            expect(next(t2.getRecords()[0].extra)[0]).to.equal(undefined);
        });

        it("does not let one handler's processors reach another, in a batch", () => {
            // PHP: GroupHandlerTest::testProcessorsDoNotInterfereBetweenHandlersWithBatch
            const t1 = new TestHandler();
            const t2 = new TestHandler();
            const handler = new GroupHandler([t1, t2]);

            t1.pushProcessor((record: LogRecord) => {
                record.extra.foo = "bar";

                return record;
            });
            handler.handleBatch([MonologTestCase.getRecord()]);

            expect(next(t2.getRecords()[0].extra)[0]).to.equal(undefined);
        });
    });
};
