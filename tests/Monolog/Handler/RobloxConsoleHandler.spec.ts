/// <reference types="@rbxts/testez/globals" />
import { Level } from "Monolog/Level";
import { LineFormatter } from "Monolog/Formatter/LineFormatter";
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
 * event, not synchronously with the `print`/`warn` call that triggered it
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
 * No upstream test class: `RobloxConsoleHandler` has no upstream ancestor
 * either (see its own class comment). These specs cover its whole surface --
 * which sink each level goes to, that the formatter decides the text, and
 * the level/bubble pair it inherits.
 *
 * That sink is `game:GetService("LogService").MessageOut`, not a shadowed
 * `print`/`warn` global: Roblox gives every `Script`/`ModuleScript` its own
 * isolated global environment (this is why `_G` exists at all, specifically
 * *for* sharing globals across scripts -- see Roblox's scripting security
 * docs), so a bare `print = ...`/`warn = ...` reassignment written in this
 * spec's own compiled module would only shadow calls made from *this*
 * module, never the separate compiled `RobloxConsoleHandler.luau` module
 * that actually calls `print`/`warn`. `LogService.MessageOut` is Roblox's
 * own engine-level hook for every `print`/`warn`/`error` call game-wide,
 * regardless of which script issued it, so it observes the handler's real
 * output reliably instead.
 */
export = (): void => {
    describe("RobloxConsoleHandler", () => {
        it("prints records below Warning through print", () => {
            const handler = new RobloxConsoleHandler();

            const captured = captureMessages(() => {
                handler.handle(MonologTestCase.getRecord(Level.Info, "test"));
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].messageType).to.equal(
                Enum.MessageType.MessageOutput,
            );
        });

        it("prints records at Warning and above through warn", () => {
            const handler = new RobloxConsoleHandler();

            const captured = captureMessages(() => {
                handler.handle(
                    MonologTestCase.getRecord(Level.Warning, "test"),
                );
                handler.handle(MonologTestCase.getRecord(Level.Error, "test"));
            });

            expect(captured.size()).to.equal(2);
            expect(captured[0].messageType).to.equal(
                Enum.MessageType.MessageWarning,
            );
            expect(captured[1].messageType).to.equal(
                Enum.MessageType.MessageWarning,
            );
        });

        it("writes what the formatter returns", () => {
            const handler = new RobloxConsoleHandler();
            handler.setFormatter(MonologTestCase.getIdentityFormatter());

            const captured = captureMessages(() => {
                handler.handle(
                    MonologTestCase.getRecord(Level.Info, "just the message", {
                        ignored: "context",
                    }),
                );
            });

            expect(captured.size()).to.equal(1);
            expect(captured[0].message).to.equal("just the message");
        });

        it("formats with LineFormatter by default", () => {
            const handler = new RobloxConsoleHandler();

            expect(handler.getFormatter() instanceof LineFormatter).to.equal(
                true,
            );

            const captured = captureMessages(() => {
                handler.handle(MonologTestCase.getRecord(Level.Info, "test"));
            });

            expect(captured.size()).to.equal(1);
            // LineFormatter's SIMPLE_FORMAT:
            // "[%datetime%] %channel%.%level_name%: %message% %context% %extra%".
            expect(
                captured[0].message.find("test.INFO: test", 1, true)[0],
            ).to.be.ok();
        });

        it("writes nothing for a record below its level", () => {
            const handler = new RobloxConsoleHandler(Level.Error);

            let handled = true;

            const captured = captureMessages(() => {
                handled = handler.handle(
                    MonologTestCase.getRecord(Level.Warning, "test"),
                );
            });

            expect(handled).to.equal(false);
            expect(captured.size()).to.equal(0);
        });

        it("stops the record bubbling when bubble is false", () => {
            const bubbling = new RobloxConsoleHandler(Level.Debug, true);
            const notBubbling = new RobloxConsoleHandler(Level.Debug, false);

            let bubblingResult = true;
            let notBubblingResult = false;

            captureMessages(() => {
                bubblingResult = bubbling.handle(
                    MonologTestCase.getRecord(Level.Info, "test"),
                );
                notBubblingResult = notBubbling.handle(
                    MonologTestCase.getRecord(Level.Info, "test"),
                );
            });

            expect(bubblingResult).to.equal(false);
            expect(notBubblingResult).to.equal(true);
        });
    });
};
