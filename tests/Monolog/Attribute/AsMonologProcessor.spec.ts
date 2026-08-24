/// <reference types="@rbxts/testez/globals" />
import {
    AsMonologProcessor,
    getMonologProcessorRegistrations,
} from "Monolog/Attribute/AsMonologProcessor";

/**
 * PHP: `Monolog\Attribute\AsMonologProcessorTest`.
 *
 * Upstream instantiates `AsMonologProcessor` directly with `new` and reads
 * its public properties back -- PHP attributes are ordinary classes reached
 * through reflection. `AsMonologProcessor.ts`'s class comment explains why
 * this port is a decorator *factory function* instead (there is no
 * reflection API here), storing each application in a module-level map keyed
 * by the decorated target and read back with `getMonologProcessorRegistrations()`.
 * These tests apply the decorator to real classes and assert on that
 * readback instead of on constructed-object properties. The method-level
 * decorator form is not separately exercised here: reading a method
 * registration back would need the class's `target` object a method
 * decorator receives, and roblox-ts does not support `.prototype` access
 * (`Foo.prototype` is a compile error) to get a handle on it from a test.
 * The `method` option itself is still covered directly via the explicit
 * `method: "method"` case below.
 */
export = (): void => {
    describe("AsMonologProcessor", () => {
        it("stores the given options against the decorated class", () => {
            // PHP: AsMonologProcessorTest::test (non-null case)
            @AsMonologProcessor({
                channel: "channel",
                handler: "handler",
                method: "method",
                priority: -10,
            })
            class Foo {}

            const registrations = getMonologProcessorRegistrations(Foo);

            expect(registrations.size()).to.equal(1);
            expect(registrations[0].channel).to.equal("channel");
            expect(registrations[0].handler).to.equal("handler");
            expect(registrations[0].method).to.equal("method");
            expect(registrations[0].priority).to.equal(-10);
        });

        it("defaults every option to undefined", () => {
            // PHP: AsMonologProcessorTest::test (null case)
            @AsMonologProcessor()
            class Bar {}

            const registrations = getMonologProcessorRegistrations(Bar);

            expect(registrations.size()).to.equal(1);
            expect(registrations[0].channel).to.equal(undefined);
            expect(registrations[0].handler).to.equal(undefined);
            expect(registrations[0].method).to.equal(undefined);
            expect(registrations[0].priority).to.equal(undefined);
        });

        it("is repeatable: multiple applications each add a registration", () => {
            // PHP's IS_REPEATABLE attribute flag, ported as "push, don't
            // overwrite" -- see the class comment.
            @AsMonologProcessor({ channel: "a" })
            @AsMonologProcessor({ channel: "b" })
            class Qux {}

            const registrations = getMonologProcessorRegistrations(Qux);

            expect(registrations.size()).to.equal(2);
        });
    });
};
