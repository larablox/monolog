/// <reference types="@rbxts/testez/globals" />
import { ClosureContextProcessor } from "Monolog/Processor/ClosureContextProcessor";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";

/**
 * PHP: `Monolog\Processor\ClosureContextProcessorTest`.
 *
 * Upstream keys everything off PHP's implicit array index `0` (`[fn () =>
 * ...]` puts the closure at key `0`); `ClosureContextProcessor.ts`'s own
 * class comment documents that this port checks "context has exactly one
 * entry whose value is a function" instead, regardless of key name, since a
 * `RecordBag` has no positional index. Test contexts below use a named key
 * (`generator`) wherever upstream relied on the implicit `0`.
 *
 * One `testSkip` data-provider case does not carry over as a skip case:
 * `['foo' => fn () => 'bar']` has exactly one entry, and upstream skips it
 * only because that entry's key (`'foo'`) isn't the implicit `0` -- this
 * port's key-name-agnostic rule treats it as the sole closure entry and
 * *does* replace it. That case is moved to its own "does replace" test below
 * instead of being asserted as a skip, per the documented divergence.
 *
 * `testClosureReturnsNotArray` swaps PHP's `new \stdClass()` (an object, so
 * `is_array()` is false) for a plain string: on this platform, a returned
 * plain Luau table is itself indistinguishable from "the new context" (see
 * `ClosureContextProcessor.ts`'s `typeIs(result, "table")` branch) so only a
 * non-table return value exercises the "wrap under the original key" branch
 * upstream's object return exercises.
 */
export = (): void => {
    describe("ClosureContextProcessor", () => {
        it("replaces context with the object the sole closure returns", () => {
            // PHP: ClosureContextProcessorTest::testReplace
            const replacement = { obj: {} };
            const processor = new ClosureContextProcessor();

            const record = processor.process(
                MonologTestCase.getRecord(undefined, undefined, {
                    generator: () => replacement,
                }),
            );

            expect(record.context).to.equal(replacement);
        });

        it("leaves a single non-function entry alone", () => {
            // PHP: ClosureContextProcessorTest::testSkip (['foo'])
            const processor = new ClosureContextProcessor();
            const context = { foo: "bar" };

            const record = processor.process(
                MonologTestCase.getRecord(undefined, undefined, context),
            );

            expect(record.context).to.equal(context);
        });

        it("leaves multiple entries alone, even if one is a function", () => {
            // PHP: ClosureContextProcessorTest::testSkip (multi-entry cases)
            const processor = new ClosureContextProcessor();
            const context = { foo: "bar", generator: () => "baz" };

            const record = processor.process(
                MonologTestCase.getRecord(undefined, undefined, context),
            );

            expect(record.context).to.equal(context);
        });

        it("replaces context when the sole entry's value is a function, regardless of key name", () => {
            // PHP: ClosureContextProcessorTest::testSkip (['foo' => fn () => 'bar'])
            // -- moved here per the class comment above: this port's
            // key-name-agnostic rule replaces this case instead of skipping it.
            const processor = new ClosureContextProcessor();

            const record = processor.process(
                MonologTestCase.getRecord(undefined, undefined, {
                    foo: () => "bar",
                }),
            );

            // `to.equal()` on a table is reference equality (see TestEZ's
            // `Expectation:equal`); a freshly-built object literal never
            // equals another one, so this compares field-by-field instead.
            expect(record.context.foo).to.equal("bar");
        });

        it("wraps a non-table closure result under the original key", () => {
            // PHP: ClosureContextProcessorTest::testClosureReturnsNotArray
            const processor = new ClosureContextProcessor();

            const record = processor.process(
                MonologTestCase.getRecord(undefined, undefined, {
                    generator: () => "not a table",
                }),
            );

            expect(record.context.generator).to.equal("not a table");
        });

        it("captures a thrown error as error_on_context_generation/exception", () => {
            // PHP: ClosureContextProcessorTest::testClosureThrows
            const processor = new ClosureContextProcessor();

            const record = processor.process(
                MonologTestCase.getRecord(undefined, undefined, {
                    generator: () => {
                        error("For test.");
                    },
                }),
            );

            expect(record.context.exception).never.to.equal(undefined);
            expect(
                typeIs(record.context.error_on_context_generation, "string"),
            ).to.equal(true);
            expect(
                (record.context.error_on_context_generation as string).find(
                    "For test.",
                    1,
                    true,
                )[0],
            ).to.be.ok();
        });
    });
};
