/// <reference types="@rbxts/testez/globals" />
import { Logger } from "Monolog/Logger";
import { Registry } from "Monolog/Registry";

/**
 * PHP: `Monolog\RegistryTest`.
 *
 * `testGetsSameLogger`'s `Registry::test2()` call is not ported: it exercises
 * `Registry::__callStatic`, which Monolog uses to read a logger back by name
 * as if it were a static method call. `Registry.ts`'s own class comment
 * explains why that magic dispatch has no Luau equivalent -- callers use
 * `Registry.getInstance(name)` explicitly instead, which the rest of this
 * test (adding two loggers under distinct names, reading both back through
 * `getInstance`) still covers.
 */
export = (): void => {
    describe("Registry", () => {
        beforeEach(() => {
            Registry.clear();
        });

        describe("hasLogger", () => {
            it("finds loggers added by instance", () => {
                // PHP: RegistryTest::testHasLogger (only instances)
                const logger1 = new Logger("test1");
                const logger2 = new Logger("test2");

                Registry.addLogger(logger1);

                expect(Registry.hasLogger(logger1)).to.equal(true);
                expect(Registry.hasLogger(logger2)).to.equal(false);
            });

            it("finds loggers added by name", () => {
                // PHP: RegistryTest::testHasLogger (only names)
                const logger1 = new Logger("test1");

                Registry.addLogger(logger1);

                expect(Registry.hasLogger("test1")).to.equal(true);
                expect(Registry.hasLogger("test2")).to.equal(false);
            });

            it("finds loggers by a mix of name and instance", () => {
                // PHP: RegistryTest::testHasLogger (mixed case)
                const logger1 = new Logger("test1");
                const logger2 = new Logger("test2");
                const logger3 = new Logger("test3");

                Registry.addLogger(logger1);
                Registry.addLogger(logger2);

                expect(Registry.hasLogger("test1")).to.equal(true);
                expect(Registry.hasLogger(logger2)).to.equal(true);
                expect(Registry.hasLogger("test3")).to.equal(false);
                expect(Registry.hasLogger(logger3)).to.equal(false);
            });
        });

        it("clear() clears the registry", () => {
            // PHP: RegistryTest::testClearClears
            Registry.addLogger(new Logger("test1"), "log");
            Registry.clear();

            expect(() => Registry.getInstance("log")).to.throw();
        });

        it("removes a logger by instance", () => {
            // PHP: RegistryTest::testRemovesLogger (instance)
            const logger1 = new Logger("test1");

            Registry.addLogger(logger1);
            Registry.removeLogger(logger1);

            expect(() => Registry.getInstance(logger1.getName())).to.throw();
        });

        it("removes a logger by name", () => {
            // PHP: RegistryTest::testRemovesLogger (name)
            const logger1 = new Logger("test1");

            Registry.addLogger(logger1);
            Registry.removeLogger("test1");

            expect(() => Registry.getInstance(logger1.getName())).to.throw();
        });

        it("fails on a non-existent logger", () => {
            // PHP: RegistryTest::testFailsOnNonExistentLogger
            expect(() => Registry.getInstance("test1")).to.throw();
        });

        it("replaces a logger when overwrite is requested", () => {
            // PHP: RegistryTest::testReplacesLogger
            const log1 = new Logger("test1");
            const log2 = new Logger("test2");

            Registry.addLogger(log1, "log");
            Registry.addLogger(log2, "log", true);

            expect(Registry.getInstance("log")).to.equal(log2);
        });

        it("fails on an unspecified replacement", () => {
            // PHP: RegistryTest::testFailsOnUnspecifiedReplacement
            const log1 = new Logger("test1");
            const log2 = new Logger("test2");

            Registry.addLogger(log1, "log");

            expect(() => Registry.addLogger(log2, "log")).to.throw();
        });
    });
};
