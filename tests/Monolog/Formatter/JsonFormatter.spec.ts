/// <reference types="@rbxts/testez/globals" />
import { JsonFormatter } from "Monolog/Formatter/JsonFormatter";
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";

/**
 * PHP: `Monolog\Formatter\JsonFormatterTest`.
 *
 * Exception/object-normalization-dependent methods are not ported, for the
 * same reasons `NormalizerFormatterTest`'s equivalents are not (see
 * `NormalizerFormatter.spec.ts`'s class comment): `testDefFormatWithException`,
 * `testBasePathWithException`, `testDefFormatWithPreviousException`,
 * `testDefFormatWithThrowable`, `testMaxNormalizeDepth`,
 * `testScalarsAndNullBypassMaxNormalizeDepth`,
 * `testMaxNormalizeItemCountWith0ItemsMax`,
 * `testMaxNormalizeItemCountWith2ItemsMax`, `testDefFormatWithResource`,
 * `testCanNormalizeIncompleteObject`, `testFormatObjects`,
 * `testNormalizeHandleExceptionInToString` -- the max-depth/max-item-count
 * *mechanics* these exercise (independent of the exception scaffolding) are
 * already covered generically in `NormalizerFormatter.spec.ts`.
 * `testNormalizeHandleLargeArraysWithExactly1000Items`/
 * `testNormalizeHandleLargeArrays` are also skipped here -- upstream's own
 * versions construct a `NormalizerFormatter`, not a `JsonFormatter` (an
 * apparent copy/paste in the upstream suite), and are already ported in
 * `NormalizerFormatter.spec.ts`.
 *
 * This port's `Utils.jsonEncode()` always sorts object keys alphabetically
 * (see `Utils.ts`'s own comment: "Luau tables carry no key order"), unlike
 * PHP's `json_encode()`, which preserves array insertion order. Upstream's
 * exact whole-string equality assertions -- which depend on the fields
 * appearing in `LogRecord::toArray()`'s declared order -- would not hold
 * here even where the underlying values match, so assertions below check
 * for expected substrings/fields instead of exact whole-string equality.
 * There is also no fixed `DateTimeImmutable` to format a `datetime` value
 * with by construction (`LogRecord.datetime` is a plain Unix timestamp
 * always set from `os.time()` by `MonologTestCase.getRecord()`, with no way
 * to inject a fixed one), so `datetime` is never asserted exactly either.
 */
export = (): void => {
    describe("JsonFormatter", () => {
        it("defaults to BATCH_MODE_JSON and appendNewline=true", () => {
            // PHP: JsonFormatterTest::testConstruct
            const formatter = new JsonFormatter();

            expect(formatter.getBatchMode()).to.equal(
                JsonFormatter.BATCH_MODE_JSON,
            );
            expect(formatter.isAppendingNewlines()).to.equal(true);

            const custom = new JsonFormatter(
                JsonFormatter.BATCH_MODE_NEWLINES,
                false,
            );

            expect(custom.getBatchMode()).to.equal(
                JsonFormatter.BATCH_MODE_NEWLINES,
            );
            expect(custom.isAppendingNewlines()).to.equal(false);
        });

        it("formats a record as a JSON object with a trailing newline by default", () => {
            // PHP: JsonFormatterTest::testFormat
            const formatter = new JsonFormatter();
            const output = formatter.format(MonologTestCase.getRecord());

            expect(output.find('"message":"test"', 1, true)[0]).to.be.ok();
            expect(output.find('"level":300', 1, true)[0]).to.be.ok();
            expect(
                output.find('"level_name":"WARNING"', 1, true)[0],
            ).to.be.ok();
            expect(output.find('"channel":"test"', 1, true)[0]).to.be.ok();
            expect(output.find('"context":{}', 1, true)[0]).to.be.ok();
            expect(output.find('"extra":{}', 1, true)[0]).to.be.ok();
            expect(output.sub(-1)).to.equal("\n");

            const noNewline = new JsonFormatter(
                JsonFormatter.BATCH_MODE_JSON,
                false,
            );
            const outputNoNewline = noNewline.format(
                MonologTestCase.getRecord(),
            );

            expect(outputNoNewline.sub(-1)).never.to.equal("\n");
        });

        it("pretty-prints when setJsonPrettyPrint(true) is set", () => {
            // PHP: JsonFormatterTest::testFormatWithPrettyPrint
            const formatter = new JsonFormatter();
            formatter.setJsonPrettyPrint(true);

            const output = formatter.format(MonologTestCase.getRecord());

            expect(output.find('    "message": "test"', 1, true)[0]).to.be.ok();
            expect(output.find('    "level": 300', 1, true)[0]).to.be.ok();
            expect(output.find("\n", 1, true)[0]).to.be.ok();

            formatter.setJsonPrettyPrint(false);
            const flat = formatter.format(MonologTestCase.getRecord());

            // The only "\n" left should be the one `format()` appends at the
            // very end (appendNewline defaults to true) -- its match position
            // is the string's last index.
            expect(flat.find("\n", 1, true)[0]).to.equal(flat.size());
        });

        it("formatBatch() in BATCH_MODE_JSON produces a JSON array", () => {
            // PHP: JsonFormatterTest::testFormatBatch
            const formatter = new JsonFormatter();

            const output = formatter.formatBatch([
                MonologTestCase.getRecord(Level.Warning),
                MonologTestCase.getRecord(Level.Debug),
            ]);

            expect(output.sub(1, 1)).to.equal("[");
            expect(output.sub(-1)).to.equal("]");
            expect(
                output.find('"level_name":"WARNING"', 1, true)[0],
            ).to.be.ok();
            expect(output.find('"level_name":"DEBUG"', 1, true)[0]).to.be.ok();
        });

        it("formatBatch() in BATCH_MODE_NEWLINES joins records with newlines", () => {
            // PHP: JsonFormatterTest::testFormatBatchNewlines
            const formatter = new JsonFormatter(
                JsonFormatter.BATCH_MODE_NEWLINES,
            );

            const output = formatter.formatBatch([
                MonologTestCase.getRecord(Level.Warning),
                MonologTestCase.getRecord(Level.Debug),
            ]);

            const [, newlineCount] = output.gsub("\n", "\n");

            expect(newlineCount).to.equal(1);
            expect(
                output.find('"level_name":"WARNING"', 1, true)[0],
            ).to.be.ok();
            expect(output.find('"level_name":"DEBUG"', 1, true)[0]).to.be.ok();
        });

        it("drops empty context/extra entirely when ignoreEmptyContextAndExtra is set", () => {
            // PHP: JsonFormatterTest::testEmptyContextAndExtraFieldsCanBeIgnored
            const formatter = new JsonFormatter(
                JsonFormatter.BATCH_MODE_JSON,
                true,
                true,
            );

            const output = formatter.format(
                MonologTestCase.getRecord(Level.Debug, "Testing"),
            );

            expect(output.find('"message":"Testing"', 1, true)[0]).to.be.ok();
            expect(output.find('"context"', 1, true)[0]).to.equal(undefined);
            expect(output.find('"extra"', 1, true)[0]).to.equal(undefined);
        });
    });
};
