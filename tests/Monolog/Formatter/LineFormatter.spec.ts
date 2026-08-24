/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { LineFormatter } from "Monolog/Formatter/LineFormatter";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";

/**
 * PHP: `Monolog\Formatter\LineFormatterTest`.
 *
 * `LineFormatter.ts`'s own class comment documents the reductions this port
 * makes: the default format drops PHP's trailing newline (`print`/`warn` add
 * their own), and `includeStacktraces`/`indentStacktraces`/`stacktracesParser`
 * are kept only for API-shape parity -- there is no PHP exception/stack-trace
 * object here for them to act on (see `NormalizerFormatter.ts`'s class
 * comment for why). On that basis, none of these upstream methods are
 * ported: `testDefFormatWithObject` (custom-class object normalization, same
 * reduction as `NormalizerFormatterTest`), `testDefFormatWithException`,
 * `testDefFormatWithExceptionAndStacktrace(ParserFull|ParserCustom|ParserEmpty)`,
 * `testDefFormatWithPreviousException`, `testDefFormatWithSoapFaultException`,
 * `testIndentStackTraces`, `testBasePath`.
 *
 * `testInlineLineBreaksRespectsEscapedBackslashes` is not ported either, for
 * a related but distinct reason: it asserts that `allowInlineLineBreaks()`
 * *unescapes* the `\n`/`\r` JSON escape sequences a nested `json_encode()`
 * produces, back into real newline characters, without touching an escaped
 * backslash followed by a literal `n`. `LineFormatter.ts`'s class comment
 * says this port drops that PCRE-based unescape step entirely (no PCRE
 * engine on this platform) -- `stringify()` on a table always returns
 * fully-escaped JSON here, so `allowInlineLineBreaks` has no effect on table/
 * array stringification at all in this port, only on a raw scalar string
 * value that itself contains real embedded newlines (covered by
 * `testFormatShouldStripInlineLineBreaks`/
 * `testFormatShouldNotStripInlineLineBreaksWhenFlagIsSet` below, which remain
 * fully portable).
 *
 * Every expected date fragment below is computed at test run time with
 * `os.date()`, exactly like upstream computes its own with PHP's `date()` at
 * test run time, rather than hard-coded.
 */
export = (): void => {
    describe("LineFormatter", () => {
        it("formats with the default format and no context/extra", () => {
            // PHP: LineFormatterTest::testDefFormatWithString
            const formatter = new LineFormatter(undefined, "%Y-%m-%d");
            const today = os.date("%Y-%m-%d") as string;

            const message = formatter.format(
                MonologTestCase.getRecord(Level.Warning, "foo", {}, "log"),
            );

            expect(message).to.equal(`[${today}] log.WARNING: foo [] []`);
        });

        it("formats an array context as JSON", () => {
            // PHP: LineFormatterTest::testDefFormatWithArrayContext (adapted:
            // the `'null' => null` entry is dropped -- a Luau table has no
            // key with an explicit nil value to represent it; assigning
            // `undefined` to a RecordBag entry removes the key entirely.)
            const formatter = new LineFormatter(undefined, "%Y-%m-%d");
            const today = os.date("%Y-%m-%d") as string;

            const message = formatter.format(
                MonologTestCase.getRecord(
                    Level.Error,
                    "foo",
                    {
                        foo: "bar",
                        baz: "qux",
                        bool: false,
                    },
                    "meh",
                ),
            );

            expect(message).to.equal(
                `[${today}] meh.ERROR: foo {"baz":"qux","bool":false,"foo":"bar"} []`,
            );
        });

        it("formats extra as JSON", () => {
            // PHP: LineFormatterTest::testDefFormatExtras
            const formatter = new LineFormatter(undefined, "%Y-%m-%d");
            const today = os.date("%Y-%m-%d") as string;

            const message = formatter.format(
                MonologTestCase.getRecord(Level.Error, "log", {}, "meh", {
                    ip: "127.0.0.1",
                }),
            );

            expect(message).to.equal(
                `[${today}] meh.ERROR: log [] {"ip":"127.0.0.1"}`,
            );
        });

        it("substitutes a dotted %extra.xxx% placeholder and removes it from %extra%", () => {
            // PHP: LineFormatterTest::testFormatExtras
            const formatter = new LineFormatter(
                "[%datetime%] %channel%.%level_name%: %message% %context% %extra.file% %extra%",
                "%Y-%m-%d",
            );
            const today = os.date("%Y-%m-%d") as string;

            const message = formatter.format(
                MonologTestCase.getRecord(Level.Error, "log", {}, "meh", {
                    ip: "127.0.0.1",
                    file: "test",
                }),
            );

            expect(message).to.equal(
                `[${today}] meh.ERROR: log [] test {"ip":"127.0.0.1"}`,
            );
        });

        it("omits empty %context%/%extra% when ignoreEmptyContextAndExtra is set", () => {
            // PHP: LineFormatterTest::testContextAndExtraOptionallyNotShownIfEmpty
            const formatter = new LineFormatter(
                undefined,
                "%Y-%m-%d",
                false,
                true,
            );
            const today = os.date("%Y-%m-%d") as string;

            const message = formatter.format(
                MonologTestCase.getRecord(Level.Error, "log", {}, "meh"),
            );

            expect(message).to.equal(`[${today}] meh.ERROR: log  `);
        });

        it("substitutes dotted %context.xxx%/%extra.xxx% placeholders", () => {
            // PHP: LineFormatterTest::testContextAndExtraReplacement
            const formatter = new LineFormatter("%context.foo% => %extra.foo%");

            const message = formatter.format(
                MonologTestCase.getRecord(
                    Level.Error,
                    "log",
                    { foo: "bar" },
                    "meh",
                    { foo: "xbar" },
                ),
            );

            expect(message).to.equal("bar => xbar");
        });

        it("joins a batch with newlines, no trailing newline", () => {
            // PHP: LineFormatterTest::testBatchFormat (adapted -- this port's
            // formatBatch() joins with "\n" instead of relying on a per-record
            // trailing newline, see the class comment).
            const formatter = new LineFormatter(undefined, "%Y-%m-%d");
            const today = os.date("%Y-%m-%d") as string;

            const message = formatter.formatBatch([
                MonologTestCase.getRecord(Level.Critical, "bar", {}, "test"),
                MonologTestCase.getRecord(Level.Warning, "foo", {}, "log"),
            ]);

            expect(message).to.equal(
                `[${today}] test.CRITICAL: bar [] []\n[${today}] log.WARNING: foo [] []`,
            );
        });

        it("strips inline line breaks from the message by default", () => {
            // PHP: LineFormatterTest::testFormatShouldStripInlineLineBreaks
            const formatter = new LineFormatter(undefined, "%Y-%m-%d");

            const message = formatter.format(
                MonologTestCase.getRecord(undefined, "foo\nbar"),
            );

            expect(message.find("foo bar", 1, true)[0]).to.be.ok();
            expect(message.find("foo\nbar", 1, true)[0]).to.equal(undefined);
        });

        it("keeps inline line breaks in the message when the flag is set", () => {
            // PHP: LineFormatterTest::testFormatShouldNotStripInlineLineBreaksWhenFlagIsSet
            const formatter = new LineFormatter(undefined, "%Y-%m-%d", true);

            const message = formatter.format(
                MonologTestCase.getRecord(undefined, "foo\nbar"),
            );

            expect(message.find("foo\nbar", 1, true)[0]).to.be.ok();
        });

        it("cuts the level name to maxLevelNameLength", () => {
            // PHP: LineFormatterTest::testMaxLevelNameLength
            const cases: Array<[number | undefined, Level, string]> = [
                [undefined, Level.Info, "INFO"],
                [3, Level.Error, "ERR"],
                [2, Level.Debug, "DE"],
            ];

            for (const [maxLength, level, expectedLevelName] of cases) {
                const formatter = new LineFormatter();
                formatter.setMaxLevelNameLength(maxLength);

                const message = formatter.format(
                    MonologTestCase.getRecord(level, "foo\nbar"),
                );

                expect(
                    message.find(`test.${expectedLevelName}:`, 1, true)[0],
                ).to.be.ok();
            }
        });
    });
};
