/// <reference types="@rbxts/testez/globals" />
import { Utils, markAsJsonObject } from "Monolog/Utils";
import { Level } from "Monolog/Level";
import { LogRecord } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\UtilsTest`.
 *
 * `Utils.ts`'s own file-top comment lists what this port dropped from
 * upstream `Utils`: `getClass`, `canonicalizePath` (mbstring/filesystem
 * specific), `expandIniShorthandBytes` (`php.ini` shorthand parsing), and
 * `detectAndCleanUtf8` (mbstring UTF-8 repair). Every upstream test method --
 * `testGetClass`, `testCanonicalizePath`, `testHandleJsonErrorFailure`
 * (exercises `handleJsonError`, paired with a `json_encode` this port's
 * encoder never fails the way PHP's can -- see `jsonEncode`'s own comment),
 * `testDetectAndCleanUtf8`, `testExpandIniShorthandBytes` -- targets one of
 * those, so none of them are ported.
 *
 * Upstream's `UtilsTest` has no test method for `jsonEncode`/
 * `getRecordMessageForException` at all (they are only exercised indirectly,
 * through `JsonFormatterTest`/`NormalizerFormatterTest`); since those are the
 * two functions this port actually keeps, the cases below are new, not
 * ported from an upstream method.
 */
export = (): void => {
    describe("Utils", () => {
        describe("jsonEncode", () => {
            it("encodes scalars", () => {
                expect(Utils.jsonEncode("hello")).to.equal('"hello"');
                expect(Utils.jsonEncode(42)).to.equal("42");
                expect(Utils.jsonEncode(true)).to.equal("true");
                expect(Utils.jsonEncode(false)).to.equal("false");
                expect(Utils.jsonEncode(undefined)).to.equal("null");
            });

            it("encodes NaN and infinities as strings, like NormalizerFormatter does", () => {
                expect(Utils.jsonEncode(0 / 0)).to.equal('"NaN"');
                expect(Utils.jsonEncode(math.huge)).to.equal('"INF"');
                expect(Utils.jsonEncode(-math.huge)).to.equal('"-INF"');
            });

            it("encodes a list-shaped table as a JSON array", () => {
                expect(Utils.jsonEncode([1, 2, 3])).to.equal("[1,2,3]");
            });

            it("encodes a map-shaped table as a JSON object with sorted keys", () => {
                expect(Utils.jsonEncode({ b: 2, a: 1 })).to.equal(
                    '{"a":1,"b":2}',
                );
            });

            it("encodes an empty table as an array by default", () => {
                expect(Utils.jsonEncode({})).to.equal("[]");
            });

            it("encodes an empty table marked with markAsJsonObject as an object", () => {
                expect(Utils.jsonEncode(markAsJsonObject({}))).to.equal("{}");
            });

            it("pretty-prints when requested", () => {
                const result = Utils.jsonEncode({ a: 1 }, true);

                expect(result).to.equal('{\n    "a": 1\n}');
            });

            it("escapes control characters and quotes in strings", () => {
                expect(Utils.jsonEncode('a"b\nc')).to.equal('"a\\"b\\nc"');
            });
        });

        describe("getRecordMessageForException", () => {
            it("returns just the message when context and extra are empty", () => {
                const record = new LogRecord(0, "test", Level.Warning, "boom");

                expect(Utils.getRecordMessageForException(record)).to.equal(
                    "\nThe exception occurred while attempting to log: boom",
                );
            });

            it("appends context and extra when present", () => {
                const record = new LogRecord(
                    0,
                    "test",
                    Level.Warning,
                    "boom",
                    { a: 1 },
                    { b: 2 },
                );

                const message = Utils.getRecordMessageForException(record);

                expect(message.find("Context: ", 1, true)[0]).to.be.ok();
                expect(message.find("Extra: ", 1, true)[0]).to.be.ok();
            });
        });
    });
};
