/// <reference types="@rbxts/testez/globals" />
import { MemoryUsageProcessor } from "Monolog/Processor/MemoryUsageProcessor";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";

/**
 * PHP: `Monolog\Processor\MemoryUsageProcessorTest`.
 *
 * `MemoryProcessor.ts`'s class comment explains the reading source: Luau's
 * `gcinfo()` (kilobytes, multiplied by 1024) stands in for
 * `memory_get_usage()`. `formatBytes()`'s MB/KB/B thresholds are the same
 * logic upstream uses, so both cases below port directly.
 */
export = (): void => {
    describe("MemoryUsageProcessor", () => {
        it("adds a formatted memory_usage to extra", () => {
            // PHP: MemoryUsageProcessorTest::testProcessor
            const processor = new MemoryUsageProcessor();

            const record = processor.process(MonologTestCase.getRecord());

            expect(record.extra.memory_usage).never.to.equal(undefined);
            expect(typeIs(record.extra.memory_usage, "string")).to.equal(true);
            expect(
                (record.extra.memory_usage as string).match(
                    "^[%d%.]+ ?[KM]?B$",
                )[0],
            ).never.to.equal(undefined);
        });

        it("adds a raw numeric memory_usage when formatting is disabled", () => {
            // PHP: MemoryUsageProcessorTest::testProcessorWithoutFormatting
            const processor = new MemoryUsageProcessor(true, false);

            const record = processor.process(MonologTestCase.getRecord());

            expect(typeIs(record.extra.memory_usage, "number")).to.equal(true);
            expect((record.extra.memory_usage as number) > 0).to.equal(true);
        });
    });
};
