/// <reference types="@rbxts/testez/globals" />
import {
    WithMonologChannel,
    getMonologChannel,
} from "Monolog/Attribute/WithMonologChannel";

/**
 * PHP: `Monolog\Attribute\WithMonologChannelTest`.
 *
 * Upstream instantiates `WithMonologChannel` directly and reads its public
 * `$channel` property. `WithMonologChannel.ts`'s class comment explains why
 * this port is a class decorator function instead: there is no reflection
 * API here, so the channel is recorded in a module-level map keyed by the
 * decorated class, read back with `getMonologChannel()`.
 */
export = (): void => {
    describe("WithMonologChannel", () => {
        it("records the channel against the decorated class", () => {
            // PHP: WithMonologChannelTest::test
            @WithMonologChannel("fixture")
            class Foo {}

            expect(getMonologChannel(Foo)).to.equal("fixture");
        });

        it("returns undefined for a class that was never decorated", () => {
            // New: exercises the "not found" branch of getMonologChannel(),
            // which has no upstream analog (PHP reflection would simply find
            // no attribute instances on such a class).
            class Bar {}

            expect(getMonologChannel(Bar)).to.equal(undefined);
        });
    });
};
