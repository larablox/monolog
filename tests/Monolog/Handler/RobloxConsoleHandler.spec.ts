/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { MonologTestCase } from "Monolog/Test/MonologTestCase";
import { RobloxConsoleHandler } from "Monolog/Handler/RobloxConsoleHandler";

const LogService = game.GetService("LogService");

interface CapturedMessage {
    message: string;
    messageType: Enum.MessageType;
}

/**
 * Runs `action`, capturing every print/warn/error dispatched through
 * LogService while it runs. `LogService.MessageOut` fires on a deferred
 * event, not synchronously with the `print`/`warn` call that triggers it
 * (verified live: a connection sees 0 captures immediately after `print()`
 * returns, 1 after a single `task.wait()`) -- so this waits a frame after
 * `action` returns before disconnecting, or the capture is reliably empty.
 */
function captureMessages(action: () => void): Array<CapturedMessage> {
    const captured = new Array<CapturedMessage>();

    const connection = LogService.MessageOut.Connect((message, messageType) => {
        captured.push({ message, messageType });
    });

    const [ok, err] = pcall(action);

    task.wait();

    connection.Disconnect();

    if (!ok) {
        error(err);
    }

    return captured;
}

/**
 * PHP: `Monolog\Handler\PHPConsoleHandlerTest`.
 *
 * Upstream mocks the `PhpConsole\Connector`/`Dispatcher\Debug`/
 * `Dispatcher\Errors` objects `PHPConsoleHandler` talks to. This port's
 * `RobloxConsoleHandler.ts` (its own class comment explains why) has no
 * connector at all -- it prints via Roblox's own output console instead --
 * so upstream's connector-mock-based test methods have no equivalent here
 * and are not ported: `testInitWithDefaultConnector`, `testInitWithCustomConnector`,
 * `testDebug` (there is no bare "dispatch debug" call to mock; its
 * *behavior* is covered by the debug-tag tests below instead), `testError`
 * (routes through `ErrorHandler`, not ported -- see `CLAUDE.md`'s "## Not
 * ported"), `testWrongOptionsThrowsException` (this port's `Options` is a
 * statically-typed TS interface -- an unknown key is a compile-time error,
 * not a runtime one), `testOptionUseOwnErrorsAndExceptionsHandler`,
 * `testOptionCallsConnectorMethod`/`provideConnectorMethodsOptionsSets`,
 * `testOptionDetectDumpTraceAndSource`, `testDumperOptions`/
 * `provideDumperOptionsValues` -- none of `sourcesBasePath`, `serverEncoding`,
 * `password`, `enableSslOnlyMode`, `ipMasks`, `headersLimit`,
 * `enableEvalListener`, `useOwnErrorsHandler`/`useOwnExceptionsHandler`,
 * `detectDumpTraceAndSource`, or any `dumper*` option exists on this port's
 * `Options` (confirmed against `RobloxConsoleHandler.ts`'s actual interface).
 *
 * The remaining tests below (`testOptionEnabled`, `testDebugContextInMessage`/
 * `testDebugTags`/`testOptionDebugTagsKeysInContext`, `testException`, and a
 * plain-error case) are rewritten, not ported line-by-line, to verify the
 * same *behavior* -- what gets dispatched and under what condition -- against
 * this platform's actual sink instead of a mocked PHP Console connector.
 *
 * That sink is `game:GetService("LogService").MessageOut`, not a shadowed
 * `print`/`warn` global as `CLAUDE.md`'s task brief for this pass first
 * suggested: Roblox gives every `Script`/`ModuleScript` its own isolated
 * global environment (this is why `_G` exists at all, specifically *for*
 * sharing globals across scripts -- see Roblox's scripting security docs),
 * so a bare `print = ...`/`warn = ...` reassignment written in this spec's
 * own compiled module would only shadow calls made from *this* module, never
 * the separate compiled `RobloxConsoleHandler.luau` module that actually
 * calls `print`/`warn`. `LogService.MessageOut` is Roblox's own engine-level
 * hook for every `print`/`warn`/`error` call game-wide, regardless of which
 * script issued it, so it observes `RobloxConsoleHandler`'s real output
 * reliably instead.
 */
export = (): void => {
    describe("RobloxConsoleHandler", () => {
        it("prints nothing when disabled", () => {
            // PHP: PHPConsoleHandlerTest::testOptionEnabled
            const handler = new RobloxConsoleHandler({ enabled: false });

            const captured = captureMessages(() => {
                handler.handle(MonologTestCase.getRecord(Level.Debug, "test"));
            });

            expect(captured.size()).to.equal(0);
        });

        it("prints a debug record tagged with the default 'tag' context key", () => {
            // PHP: PHPConsoleHandlerTest::testDebugContextInMessage
            const handler = new RobloxConsoleHandler();

            const captured = captureMessages(() => {
                handler.handle(
                    MonologTestCase.getRecord(Level.Debug, "test", {
                        tag: "mytag",
                        custom: 42,
                    }),
                );
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].messageType).to.equal(
                Enum.MessageType.MessageOutput,
            );
            expect(captured[0].message.find("[mytag]", 1, true)[0]).to.be.ok();
            expect(
                captured[0].message.find('"custom":42', 1, true)[0],
            ).to.be.ok();
            // The "tag" entry itself is filtered out of the printed context.
            expect(captured[0].message.find('"tag"', 1, true)[0]).to.equal(
                undefined,
            );
        });

        it("falls back to the PSR level name as the tag when no tag key is present", () => {
            // PHP: PHPConsoleHandlerTest::testDebugTags (default tagsContextKeys)
            const handler = new RobloxConsoleHandler();

            const captured = captureMessages(() => {
                handler.handle(MonologTestCase.getRecord(Level.Debug, "test"));
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].message.find("[debug]", 1, true)[0]).to.be.ok();
        });

        it("checks debugTagsKeysInContext in order when customized", () => {
            // PHP: PHPConsoleHandlerTest::testOptionDebugTagsKeysInContext
            // (adapted to this port's reduced, string-keys-only
            // `debugTagsKeysInContext` -- see `RobloxConsoleHandler.ts`'s
            // `Options` interface and `getRecordTags()` comment).
            const handler = new RobloxConsoleHandler({
                debugTagsKeysInContext: ["key1", "key2"],
            });

            const captured = captureMessages(() => {
                handler.handle(
                    MonologTestCase.getRecord(Level.Debug, "test", {
                        key2: "mytag2",
                    }),
                );
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].message.find("[mytag2]", 1, true)[0]).to.be.ok();
        });

        it("warns with the exception's string form when context.exception is set", () => {
            // PHP: PHPConsoleHandlerTest::testException
            const handler = new RobloxConsoleHandler();

            const captured = captureMessages(() => {
                handler.handle(
                    MonologTestCase.getRecord(Level.Error, "boom", {
                        exception: "Something went wrong",
                    }),
                );
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].messageType).to.equal(
                Enum.MessageType.MessageWarning,
            );
            expect(
                captured[0].message.find("Something went wrong", 1, true)[0],
            ).to.be.ok();
        });

        it("warns with the plain message when there is no exception, file, or line", () => {
            // New: the plain-error branch of write() (context.message/file/line,
            // with none of the three set), which has no direct upstream
            // equivalent since upstream always mocks the connector call
            // rather than asserting on rendered text.
            const handler = new RobloxConsoleHandler();

            const captured = captureMessages(() => {
                handler.handle(MonologTestCase.getRecord(Level.Error, "boom"));
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].messageType).to.equal(
                Enum.MessageType.MessageWarning,
            );
            expect(captured[0].message).to.equal("boom");
        });

        it("appends file:line to the warning when context.file/line are set", () => {
            const handler = new RobloxConsoleHandler();

            const captured = captureMessages(() => {
                handler.handle(
                    MonologTestCase.getRecord(Level.Error, "boom", {
                        message: "custom message",
                        file: "foo.lua",
                        line: 10,
                    }),
                );
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].message).to.equal("custom message (foo.lua:10)");
        });
    });
};
