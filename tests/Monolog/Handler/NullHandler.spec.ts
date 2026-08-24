/// <reference types="@rbxts/testez/globals" />
import { NullHandler } from "Monolog/Handler/NullHandler";
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";

/**
 * PHP: `Monolog\Handler\NullHandlerTest`.
 *
 * Mirrors upstream's `tests/Monolog/...` tree (`Handler/NullHandlerTest.php`
 * -> `Handler/NullHandler.spec.ts`), compiled separately from `src/` -- see
 * `tsconfig.tests.json` and the "## Tests" section of `CLAUDE.md` for why two
 * `tsconfig`s exist and how the compiled output still finds `src/Monolog`
 * across that split. The `.spec` suffix (instead of PHP's `Test` suffix) is
 * not a naming preference: TestEZ only discovers `ModuleScript`s whose name
 * ends in `.spec`.
 *
 * `testSerializeRestorePrivate` is not ported: it round-trips the handler
 * through PHP's `serialize()`/`unserialize()`, which has no equivalent on
 * this platform.
 */
export = (): void => {
    describe("NullHandler", () => {
        it("handles a record at its level", () => {
            // PHP: NullHandlerTest::testHandle
            const handler = new NullHandler();

            expect(handler.handle(MonologTestCase.getRecord())).to.equal(true);
        });

        it("does not handle a record below its level", () => {
            // PHP: NullHandlerTest::testHandleLowerLevelRecord
            const handler = new NullHandler(Level.Warning);

            expect(
                handler.handle(MonologTestCase.getRecord(Level.Debug)),
            ).to.equal(false);
        });
    });
};
