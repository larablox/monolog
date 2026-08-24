/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { NormalizerFormatter } from "Monolog/Formatter/NormalizerFormatter";
import { Utils } from "Monolog/Utils";
import type { RecordBag } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Formatter\NormalizerFormatterTest`.
 *
 * `NormalizerFormatter.ts`'s own class comment already explains the big
 * reduction this port makes: no PHP object-kind branching (`Throwable`,
 * `JsonSerializable`, `__PHP_Incomplete_Class`, `is_resource`), and no
 * structured `class`/`message`/`code`/`file`/`trace`/`previous` exception
 * shape, since there is no PHP exception object anywhere in this codebase to
 * pull those fields from -- everything that isn't a scalar or a plain data
 * table collapses to `tostring()`. On that basis, none of the following
 * upstream test methods are ported: `testFormatExceptions`,
 * `testFormatExceptionWithBasePath`, `testFormatSoapFaultException`,
 * `testFormatToStringExceptionHandle`, `testExceptionTraceWithArgs`,
 * `testExceptionTraceDoesNotLeakCallUserFuncArgs`,
 * `testCanNormalizeIncompleteObject`, `testMaxTraceLengthDefault`,
 * `testMaxTraceLengthSetter`, `testMaxTraceLengthLimitsTrace`,
 * `testMaxTraceLengthZeroDoesNotIncludeTrace`,
 * `testMaxTraceLengthNullAllowsUnlimited`,
 * `testMaxTraceLengthWithPreviousException`,
 * `testMaxTraceLengthWithBasePath` (this port's `NormalizerFormatter` has no
 * `get`/`setMaxTraceLength()` at all -- there is no trace to truncate).
 * `testCanNormalizeReferences` (PHP `&$x` references) and
 * `testIgnoresInvalidEncoding`/`testConvertsInvalidEncodingAsLatin9`
 * (mbstring UTF-8 repair) are dropped for the same "no equivalent on this
 * platform" reason.
 *
 * `format()`/`formatBatch()` return a JSON *string* here, not a raw
 * structure (see the class comment), so assertions on them check for
 * expected substrings rather than exact-array equality; `normalizeValue()`
 * is used directly wherever the structured result is what's under test.
 *
 * Two tests below (`testMaxNormalizeDepth`'s replacement and a new
 * "does not exempt scalars" case) surface a real, undocumented divergence:
 * upstream's `normalize()` treats scalars/null as leaves that bypass the max
 * depth guard entirely (see upstream's own
 * `testScalarsAndNullBypassMaxNormalizeDepth`, whose docblock says so in
 * PHP); this port's `normalize()` (`NormalizerFormatter.ts`) checks `depth >
 * maxNormalizeDepth` unconditionally, before branching on the value's type,
 * so a scalar past the depth limit gets replaced by the same placeholder a
 * table would. This is flagged, not silently ported as if it matched.
 */
export = (): void => {
    describe("NormalizerFormatter", () => {
        it("formats a record's scalars, empty tables, and special numbers", () => {
            // PHP: NormalizerFormatterTest::testFormat (adapted -- see class comment)
            const formatter = new NormalizerFormatter("%Y-%m-%d");

            const record = MonologTestCase.getRecord(
                Level.Error,
                "foo",
                {
                    foo: "bar",
                    baz: "qux",
                    inf: math.huge,
                    "-inf": -math.huge,
                    nan: 0 / 0,
                },
                "meh",
                { extraFoo: [] },
            );

            const output = formatter.format(record);

            expect(output.find('"channel":"meh"', 1, true)[0]).to.be.ok();
            expect(output.find('"message":"foo"', 1, true)[0]).to.be.ok();
            expect(output.find('"level_name":"ERROR"', 1, true)[0]).to.be.ok();
            expect(output.find('"level":400', 1, true)[0]).to.be.ok();
            expect(output.find('"foo":"bar"', 1, true)[0]).to.be.ok();
            expect(output.find('"inf":"INF"', 1, true)[0]).to.be.ok();
            expect(output.find('"-inf":"-INF"', 1, true)[0]).to.be.ok();
            expect(output.find('"nan":"NaN"', 1, true)[0]).to.be.ok();
            expect(output.find('"extraFoo":[]', 1, true)[0]).to.be.ok();
            expect(output.find('"datetime":"', 1, true)[0]).to.be.ok();
        });

        it("formats a batch of records", () => {
            // PHP: NormalizerFormatterTest::testBatchFormat (adapted -- datetime
            // formatting is not asserted exactly, since Luau's `os.date` has no
            // guaranteed relationship to PHP's `date()` output in this sandbox).
            const formatter = new NormalizerFormatter("%Y-%m-%d");

            const output = formatter.formatBatch([
                MonologTestCase.getRecord(Level.Critical, "bar", {}, "test"),
                MonologTestCase.getRecord(Level.Warning, "foo", {}, "log"),
            ]);

            expect(output.find('"channel":"test"', 1, true)[0]).to.be.ok();
            expect(output.find('"channel":"log"', 1, true)[0]).to.be.ok();
            expect(output.find('"message":"bar"', 1, true)[0]).to.be.ok();
            expect(output.find('"message":"foo"', 1, true)[0]).to.be.ok();
        });

        it("keeps a list of exactly maxNormalizeItemCount items intact", () => {
            // PHP: NormalizerFormatterTest::testNormalizeHandleLargeArraysWithExactly1000Items
            const formatter = new NormalizerFormatter();
            const largeArray = new Array<number>();

            for (let index = 1; index <= 1000; index++) {
                largeArray.push(index);
            }

            const normalized = formatter.normalizeValue(
                largeArray,
            ) as Array<unknown>;

            expect(normalized.size()).to.equal(1000);
        });

        it("truncates a list past maxNormalizeItemCount with a marker item", () => {
            // PHP: NormalizerFormatterTest::testNormalizeHandleLargeArrays
            const formatter = new NormalizerFormatter();
            const largeArray = new Array<number>();

            for (let index = 1; index <= 2000; index++) {
                largeArray.push(index);
            }

            const normalized = formatter.normalizeValue(
                largeArray,
            ) as Array<unknown>;

            expect(normalized.size()).to.equal(1001);
            expect(normalized[1000]).to.equal(
                "Over 1000 items (2000 total), aborting normalization",
            );
        });

        it("truncates a map past maxNormalizeItemCount with a '...' marker key", () => {
            // Adapted from PHP's testMaxNormalizeItemCountWith2ItemsMax /
            // testMaxNormalizeItemCountWith0ItemsMax, which build their
            // oversized map from a PHP exception's normalized fields (class/
            // message/code/file/trace) -- not portable, see the class
            // comment above. A plain map exercises the same
            // `maxNormalizeItemCount` guard in `normalize()`'s map branch.
            const formatter = new NormalizerFormatter();
            formatter.setMaxNormalizeItemCount(2);

            const normalized = formatter.normalizeValue({
                a: 1,
                b: 2,
                c: 3,
                d: 4,
            }) as RecordBag;

            const keys = new Array<string>();

            for (const [key] of pairs(normalized)) {
                keys.push(tostring(key));
            }

            expect(keys.size()).to.equal(3);
            expect(normalized["..."]).to.equal(
                "Over 2 items (4 total), aborting normalization",
            );
        });

        it("replaces a value past the max normalize depth with a placeholder", () => {
            // PHP: NormalizerFormatterTest::testMaxNormalizeDepth (adapted --
            // see class comment for the depth-counting difference).
            const formatter = new NormalizerFormatter();
            formatter.setMaxNormalizeDepth(0);

            const normalized = formatter.normalizeValue({
                nested: { too: "deep" },
            }) as RecordBag;

            expect(normalized.nested).to.equal(
                "Over 0 levels deep, aborting normalization",
            );
        });

        it("does NOT exempt scalars from the max depth guard -- divergence from upstream, see class comment", () => {
            const formatter = new NormalizerFormatter();
            formatter.setMaxNormalizeDepth(0);

            const normalized = formatter.normalizeValue({
                scalar: "value",
            }) as RecordBag;

            expect(normalized.scalar).to.equal(
                "Over 0 levels deep, aborting normalization",
            );
        });

        it("terminates on circular references via the depth limit", () => {
            // PHP: NormalizerFormatterTest::testIgnoresRecursiveObjectReferences
            // (adapted): this port has no PHP-reference/null-out-second-occurrence
            // logic, but `normalize()`'s depth guard (default max depth 9)
            // still guarantees termination on a self-referential table
            // instead of recursing forever.
            const formatter = new NormalizerFormatter();
            const foo: RecordBag = {};
            const bar: RecordBag = {};

            foo.bar = bar;
            bar.foo = foo;

            const normalized = formatter.normalizeValue(foo);

            expect(normalized).never.to.equal(undefined);
            expect(() => Utils.jsonEncode(normalized)).never.to.throw();
        });

        it("normalizes an opaque value (a function) via tostring", () => {
            // PHP: NormalizerFormatterTest::testToJsonIgnoresInvalidTypes
            // (adapted): upstream passes a resource, which has no Luau
            // equivalent; a function is this platform's own example of a
            // value with nothing left to reflect on -- see the "Function/
            // thread/opaque instance" branch of `normalize()`.
            const formatter = new NormalizerFormatter();

            const normalized = formatter.normalizeValue([
                () => {
                    //
                },
            ]) as Array<unknown>;

            expect(typeIs(normalized[0], "string")).to.equal(true);
        });
    });
};
