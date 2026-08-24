/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { ScalarFormatter } from "Monolog/Formatter/ScalarFormatter";

/**
 * PHP: `Monolog\Formatter\ScalarFormatterTest`.
 *
 * Every upstream test method (`testFormat`, `testFormatWithErrorContext`,
 * `testFormatWithExceptionContext`) builds its record context around a real
 * PHP exception and/or `JsonSerializableDateTimeImmutable`; none of that
 * exists on this platform (see `NormalizerFormatter.ts`'s and
 * `LogRecord.ts`'s class comments), so none of them port even partially.
 * `ScalarFormatter.ts`'s own class comment explains what this port actually
 * keeps: `toScalar()` normalizes a value and JSON-encodes it if the result is
 * still a table, otherwise returns it verbatim; `format()` JSON-encodes the
 * whole scalarized record, and `toScalarRecord()` exposes the structured
 * form directly (standing in for upstream's `format()` return value, since
 * this port's `FormatterInterface.format()` is narrowed to `string`). The
 * cases below exercise that actual, reduced surface directly.
 */
export = (): void => {
    describe("ScalarFormatter", () => {
        it("passes plain scalars through toScalarRecord() unchanged", () => {
            const formatter = new ScalarFormatter();

            const record = formatter.toScalarRecord(
                MonologTestCase.getRecord(Level.Warning, "foo", {}, "test"),
            );

            expect(record.message).to.equal("foo");
            expect(record.level).to.equal(300);
            expect(record.level_name).to.equal("WARNING");
            expect(record.channel).to.equal("test");
        });

        it("JSON-encodes a table-shaped context/extra value in toScalarRecord()", () => {
            const formatter = new ScalarFormatter();

            const record = formatter.toScalarRecord(
                MonologTestCase.getRecord(Level.Warning, "foo", {
                    bar: "baz",
                }),
            );

            expect(typeIs(record.context, "string")).to.equal(true);
            expect(
                (record.context as string).find('"bar":"baz"', 1, true)[0],
            ).to.be.ok();
        });

        it("format() JSON-encodes the whole scalarized record", () => {
            const formatter = new ScalarFormatter();

            const output = formatter.format(
                MonologTestCase.getRecord(Level.Warning, "foo", {}, "test"),
            );

            expect(output.find('"message":"foo"', 1, true)[0]).to.be.ok();
            expect(
                output.find('"level_name":"WARNING"', 1, true)[0],
            ).to.be.ok();
        });
    });
};
