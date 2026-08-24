/// <reference types="@rbxts/testez/globals" />
import { IntrospectionProcessor } from "Monolog/Processor/IntrospectionProcessor";
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { TestHandler } from "Monolog/Handler/TestHandler";

/**
 * PHP: `Monolog\Processor\IntrospectionProcessorTest`.
 *
 * `IntrospectionProcessor.ts`'s own class comment documents the reduced
 * surface this port keeps: only `extra.file`/`extra.line`/`extra.function`
 * are set, never `class`/`callType` (no per-frame "class" concept in Luau's
 * `debug.info`), and `skipClassesPartials` is dropped entirely (nothing to
 * match a class-partial skip list against).
 *
 * `testProcessorFromClass`/`testProcessorFromFunc` are not ported as-is:
 * both assert exact `class`/`function`/`line` values captured from a fixed
 * call chain (`Acme\Tester::test()`/`Acme\tester()` calling straight into
 * `$handler->handle()`). This port's `class` is never set at all (see
 * above), and `BASE_STACK_OFFSET`'s own comment explains that this port's
 * dispatch machinery (`Logger.addRecord()` -> ... -> `runProcessor()`) adds
 * extra frames PHP's flatter call stack does not have, so the exact stack
 * depth that lands on "the caller" is not guaranteed to match upstream's
 * assumption. The adapted test below drives the processor through the same
 * kind of path (`TestHandler` + `pushProcessor()`, matching upstream's own
 * `getHandler()` helper) and asserts that `file`/`line`/`function` end up
 * populated, without pinning exact values that are stack-position-dependent.
 */
export = (): void => {
    describe("IntrospectionProcessor", () => {
        it("does not touch extra when the record is below the configured level", () => {
            // PHP: IntrospectionProcessorTest::testLevelTooLow
            const input = MonologTestCase.getRecord(Level.Debug);
            const processor = new IntrospectionProcessor(Level.Critical);

            const actual = processor.process(input);

            expect(actual).to.equal(input);
            expect(actual.extra.file).to.equal(undefined);
            expect(actual.extra.line).to.equal(undefined);
            expect(actual.extra.function).to.equal(undefined);
        });

        it("populates file/line/function when handled through a handler pipeline", () => {
            // PHP: IntrospectionProcessorTest::testProcessorFromClass / testProcessorFromFunc (adapted)
            const processor = new IntrospectionProcessor(Level.Critical);
            const handler = new TestHandler();
            handler.pushProcessor(processor);

            handler.handle(MonologTestCase.getRecord(Level.Critical));

            const [record] = handler.getRecords();

            expect(record.extra.file).never.to.equal(undefined);
            expect(typeIs(record.extra.line, "number")).to.equal(true);
            expect(record.extra.function).never.to.equal(undefined);
            expect(record.extra.class).to.equal(undefined);
            expect(record.extra.callType).to.equal(undefined);
        });
    });
};
