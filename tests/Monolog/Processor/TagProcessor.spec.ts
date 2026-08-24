/// <reference types="@rbxts/testez/globals" />
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { TagProcessor } from "Monolog/Processor/TagProcessor";
import { Utils } from "Monolog/Utils";

/**
 * PHP: `Monolog\Processor\TagProcessorTest`.
 *
 * Upstream's `$tags = [1, 2, 3]` is a PHP mixed-value array; this port's
 * `TagProcessor` is typed `Array<string>` (see `TagProcessor.ts`), so the
 * tags below are string literals (`"1"`, `"2"`, `"3"`) instead of ints --
 * same shape, same test intent, just typed. Upstream's `addTags(['a', 'c',
 * 'foo' => 'bar'])` mixes a positional and a named key in one PHP array,
 * which has no equivalent in a plain typed TS array; that named-key entry is
 * dropped, keeping just the positional `'a', 'c'` tags addTags is really
 * testing.
 *
 * `to.equal()` on a table is reference equality (see TestEZ's
 * `Expectation:equal`), so array contents below are compared via
 * `Utils.jsonEncode()` rather than directly.
 */
export = (): void => {
    describe("TagProcessor", () => {
        it("adds the configured tags to extra", () => {
            // PHP: TagProcessorTest::testProcessor
            const tags = ["1", "2", "3"];
            const processor = new TagProcessor(tags);

            const record = processor.process(MonologTestCase.getRecord());

            expect(Utils.jsonEncode(record.extra.tags)).to.equal(
                Utils.jsonEncode(tags),
            );
        });

        it("setTags()/addTags() change what gets added", () => {
            // PHP: TagProcessorTest::testProcessorTagModification
            const tags = ["1", "2", "3"];
            const processor = new TagProcessor(tags);

            let record = processor.process(MonologTestCase.getRecord());
            expect(Utils.jsonEncode(record.extra.tags)).to.equal(
                Utils.jsonEncode(tags),
            );

            processor.setTags(["a", "b"]);
            record = processor.process(MonologTestCase.getRecord());
            expect(Utils.jsonEncode(record.extra.tags)).to.equal(
                Utils.jsonEncode(["a", "b"]),
            );

            processor.addTags(["a", "c"]);
            record = processor.process(MonologTestCase.getRecord());
            expect(Utils.jsonEncode(record.extra.tags)).to.equal(
                Utils.jsonEncode(["a", "b", "a", "c"]),
            );
        });
    });
};
