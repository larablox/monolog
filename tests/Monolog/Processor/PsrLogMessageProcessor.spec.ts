/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { PsrLogMessageProcessor } from "Monolog/Processor/PsrLogMessageProcessor";

/**
 * PHP: `Monolog\Processor\PsrLogMessageProcessorTest`.
 *
 * Upstream's `getPairs()` data provider relies on PHP's implicit
 * string-cast rules (`(string) $val`) for the replacement value: `true` ->
 * `'1'`, `false`/`null` -> `''`. This port's `PsrLogMessageProcessor.ts`
 * replaces a placeholder with a bare Luau `tostring(value)` instead, which
 * has different results for booleans (`tostring(true)` is `"true"`, not
 * `"1"`) and cannot represent PHP's `null` context value at all (a Lua table
 * has no key with a `nil` value to iterate -- the key is simply absent, so
 * the placeholder is left unreplaced). Those cases, plus the `\DateTime`,
 * `new \stdClass`, PHP-array (`array[...]`/`array{...}`), and
 * `stream_context_create()` (resource) cases -- none of which this port's
 * plain `tostring()` reproduces or which have any equivalent on this
 * platform -- are not ported; only the plain-scalar cases that `tostring()`
 * genuinely reproduces are kept. `Level::Info->value` still ports directly:
 * `tostring(Level.Info)` and PHP's `(string) Level::Info->value` both
 * produce `"200"`.
 *
 * `testCustomDateFormat` is not ported: upstream's constructor takes an
 * unused-in-practice `$dateFormat` parameter ahead of
 * `$removeUsedContextFields`; this port's constructor drops it entirely
 * (`PsrLogMessageProcessor.ts`: `constructor(protected readonly
 * removeUsedContextFields = false)`), and there is no `\DateTime` context
 * value to format regardless. `testReplacementWithContextRemoval` is
 * adapted to that single-parameter constructor.
 */
export = (): void => {
    describe("PsrLogMessageProcessor", () => {
        it("replaces a placeholder with the stringified context value", () => {
            // PHP: PsrLogMessageProcessorTest::testReplacement (scalar cases)
            const cases: Array<[unknown, string]> = [
                ["foo", "foo"],
                ["3", "3"],
                [3, "3"],
                [Level.Info, "200"],
            ];

            for (const [value, expected] of cases) {
                const processor = new PsrLogMessageProcessor();

                const record = processor.process(
                    MonologTestCase.getRecord(undefined, "{foo}", {
                        foo: value,
                    }),
                );

                expect(record.message).to.equal(expected);
                expect(record.context.foo).to.equal(value);
            }
        });

        it("removes used context fields when removeUsedContextFields is set", () => {
            // PHP: PsrLogMessageProcessorTest::testReplacementWithContextRemoval
            const processor = new PsrLogMessageProcessor(true);

            const record = processor.process(
                MonologTestCase.getRecord(undefined, "{foo}", {
                    foo: "bar",
                    lorem: "ipsum",
                }),
            );

            expect(record.message).to.equal("bar");
            expect(record.context.foo).to.equal(undefined);
            expect(record.context.lorem).to.equal("ipsum");
        });
    });
};
