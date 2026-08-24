/// <reference types="@rbxts/testez/globals" />
import { ProcessIdProcessor } from "Monolog/Processor/ProcessIdProcessor";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";

/**
 * PHP: `Monolog\Processor\ProcessIdProcessorTest`.
 *
 * `ProcessIdProcessor.ts`'s class comment documents the divergence: there is
 * no OS process id on Roblox, so `extra.process_id` is `game.JobId` (a
 * string, not `getmypid()`'s int), falling back to `"studio"` when empty
 * (outside a real server, e.g. Studio Play testing). This test asserts that
 * shape instead of upstream's "is a positive int matching getmypid()".
 */
export = (): void => {
    describe("ProcessIdProcessor", () => {
        it("sets process_id to game.JobId, or 'studio' when empty", () => {
            // PHP: ProcessIdProcessorTest::testProcessor (adapted)
            const processor = new ProcessIdProcessor();

            const record = processor.process(MonologTestCase.getRecord());
            const expected = game.JobId !== "" ? game.JobId : "studio";

            expect(record.extra.process_id).to.equal(expected);
        });
    });
};
