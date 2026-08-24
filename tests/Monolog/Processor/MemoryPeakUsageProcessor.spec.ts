/// <reference types="@rbxts/testez/globals" />
import { MemoryPeakUsageProcessor } from "Monolog/Processor/MemoryPeakUsageProcessor";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";

/**
 * PHP: `Monolog\Processor\MemoryPeakUsageProcessorTest`.
 *
 * `MemoryPeakUsageProcessor.ts`'s class comment documents the real
 * behavioral divergence here: there is no `memory_get_peak_usage()` on this
 * platform, so "peak" means the highest `gcinfo()` reading this processor
 * instance has observed since it was constructed, tracked manually, not an
 * OS-level peak counter. `testProcessor`/`testProcessorWithoutFormatting`
 * port directly (they only assert the reading's shape); a third case below
 * is new -- it exercises that manual-tracking semantic directly, which
 * upstream has no equivalent of.
 */
export = (): void => {
    describe("MemoryPeakUsageProcessor", () => {
        it("adds a formatted memory_peak_usage to extra", () => {
            // PHP: MemoryPeakUsageProcessorTest::testProcessor
            const processor = new MemoryPeakUsageProcessor();

            const record = processor.process(MonologTestCase.getRecord());

            expect(record.extra.memory_peak_usage).never.to.equal(undefined);
            expect(typeIs(record.extra.memory_peak_usage, "string")).to.equal(
                true,
            );
            expect(
                (record.extra.memory_peak_usage as string).match(
                    "^[%d%.]+ ?[KM]?B$",
                )[0],
            ).never.to.equal(undefined);
        });

        it("adds a raw numeric memory_peak_usage when formatting is disabled", () => {
            // PHP: MemoryPeakUsageProcessorTest::testProcessorWithoutFormatting
            const processor = new MemoryPeakUsageProcessor(true, false);

            const record = processor.process(MonologTestCase.getRecord());

            expect(typeIs(record.extra.memory_peak_usage, "number")).to.equal(
                true,
            );
            expect((record.extra.memory_peak_usage as number) > 0).to.equal(
                true,
            );
        });

        it("tracks the highest reading observed since construction", () => {
            // New: exercises this port's manual-peak-tracking semantic --
            // see the class comment above.
            const processor = new MemoryPeakUsageProcessor(true, false);

            const first = processor.process(MonologTestCase.getRecord()).extra
                .memory_peak_usage as number;

            // Allocate a sizeable table so the GC-reported byte count grows.
            const bulk = new Array<number>();

            for (let index = 0; index < 200000; index++) {
                bulk.push(index);
            }

            const second = processor.process(MonologTestCase.getRecord()).extra
                .memory_peak_usage as number;

            expect(second >= first).to.equal(true);
        });
    });
};
