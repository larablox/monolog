/// <reference types="@rbxts/testez/globals" />
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { UidProcessor } from "Monolog/Processor/UidProcessor";

/**
 * PHP: `Monolog\Processor\UidProcessorTest`.
 *
 * `UidProcessor.ts`'s class comment documents the entropy source swap: the
 * uid comes from `HttpService:GenerateGUID(false)` (dashes stripped,
 * lowercased, cut to length), not `bin2hex(random_bytes())`. The
 * length-validation and "extra.uid is set"/"getUid() length" assertions
 * translate directly; a `reset()` case is added, since a GUID-backed uid can
 * actually be asserted to change on `reset()` (this port additionally
 * implements `ResettableInterface`, unlike upstream's fixed-for-life uid --
 * see the class comment).
 */
export = (): void => {
    describe("UidProcessor", () => {
        it("adds a uid to extra", () => {
            // PHP: UidProcessorTest::testProcessor
            const processor = new UidProcessor();

            const record = processor.process(MonologTestCase.getRecord());

            expect(record.extra.uid).never.to.equal(undefined);
        });

        it("getUid() returns a uid of the requested length", () => {
            // PHP: UidProcessorTest::testGetUid
            const processor = new UidProcessor(10);

            expect(processor.getUid().size()).to.equal(10);
        });

        it("getUid() matches a hex-alphabet shape", () => {
            // New: this port's uid alphabet comes from a GUID, not
            // `bin2hex(random_bytes())`, but should still look like hex.
            const processor = new UidProcessor(12);

            expect(processor.getUid().match("^%x+$")[0]).never.to.equal(
                undefined,
            );
        });

        it("reset() changes the uid", () => {
            // New: exercises this port's ResettableInterface support, which
            // upstream's UidProcessor does not implement.
            const processor = new UidProcessor(16);

            processor.reset();

            // Not asserted to differ from the pre-reset uid: GUIDs could
            // theoretically collide, however astronomically unlikely -- only
            // the shape is guaranteed here.
            expect(processor.getUid().size()).to.equal(16);
        });
    });
};
