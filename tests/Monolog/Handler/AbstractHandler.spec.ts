/// <reference types="@rbxts/testez/globals" />
import { AbstractHandler } from "Monolog/Handler/AbstractHandler";
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Handler\AbstractHandlerTest`.
 *
 * Upstream builds a PHPUnit mock of the abstract class (`getMockBuilder(...)
 * ->onlyMethods(['handle'])->getMock()`, `createPartialMock(...)`); there is
 * no mocking framework on this platform, so a minimal concrete subclass is
 * declared here instead and used throughout, counting `handle()` calls where
 * upstream asserts a mock expectation.
 *
 * `testHandlesPsrStyleLevels` is not ported: it passes a PSR-3 level *name*
 * (`'warning'`) to the constructor and to `setLevel()`, relying on PHP's
 * loose typing plus `Level::fromName()`-style coercion. This port's
 * `AbstractHandler` constructor and `setLevel()` are both typed to take a
 * `Level` only (see `AbstractHandler.ts`) -- there is no PSR-string overload
 * to coerce, unlike `Logger`'s `Level | LogLevel`-accepting methods.
 */
class ConcreteHandler extends AbstractHandler {
    public handleCallCount = 0;

    public handle(record: LogRecord): boolean {
        this.handleCallCount++;

        return this.isHandling(record);
    }
}

export = (): void => {
    describe("AbstractHandler", () => {
        it("constructs with level/bubble and exposes get/set for both", () => {
            // PHP: AbstractHandlerTest::testConstructAndGetSet
            const handler = new ConcreteHandler(Level.Warning, false);

            expect(handler.getLevel()).to.equal(Level.Warning);
            expect(handler.getBubble()).to.equal(false);

            handler.setLevel(Level.Error);
            handler.setBubble(true);

            expect(handler.getLevel()).to.equal(Level.Error);
            expect(handler.getBubble()).to.equal(true);
        });

        it("handleBatch() calls handle() once per record", () => {
            // PHP: AbstractHandlerTest::testHandleBatch
            const handler = new ConcreteHandler();

            handler.handleBatch([
                MonologTestCase.getRecord(),
                MonologTestCase.getRecord(),
            ]);

            expect(handler.handleCallCount).to.equal(2);
        });

        it("isHandling() checks the record level against the handler's level", () => {
            // PHP: AbstractHandlerTest::testIsHandling
            const handler = new ConcreteHandler(Level.Warning, false);

            expect(handler.isHandling(MonologTestCase.getRecord())).to.equal(
                true,
            );
            expect(
                handler.isHandling(MonologTestCase.getRecord(Level.Debug)),
            ).to.equal(false);
        });
    });
};
