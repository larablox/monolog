import { AbstractProcessingHandler } from "Monolog/Handler/AbstractProcessingHandler";
import { Level, Levels } from "Monolog/Level";
import type { LogRecord } from "Monolog/LogRecord";

/**
 * Writes formatted records to the Roblox output console.
 *
 * No upstream ancestor: this is an original class for this platform.
 *
 * By shape it is this platform's `Monolog\Handler\StreamHandler`: hand
 * `record.formatted` to the sink and nothing more. Roblox's console is that
 * sink, and none of `StreamHandler`'s own API survives the swap -- there is
 * no stream to open, no url/resource to accept, no file permissions, no
 * `close()`, no buffering to flush. What is left is the level/bubble pair
 * every handler has, plus the one choice the console does offer: records
 * below `Level.Warning` go out through `print` (`MessageOutput`), the rest
 * through `warn` (`MessageWarning`), so Studio colors them accordingly and
 * `LogService` reports the right `Enum.MessageType`. `error` is deliberately
 * not used for higher levels -- on Luau it throws and unwinds the caller
 * instead of merely writing a line.
 *
 * The formatter is respected, unlike the PHP Console port that preceded this
 * one: it is what turns the record into the printed text. The default is
 * `AbstractProcessingHandler`'s own `LineFormatter`.
 */
export class RobloxConsoleHandler extends AbstractProcessingHandler {
    public constructor(level: Level = Level.Debug, bubble = true) {
        super(level, bubble);
    }

    protected write(record: LogRecord): void {
        // `handle()` always fills `formatted` in before calling `write()`;
        // the fallback is for a direct call that did not go through it.
        const message = record.formatted ?? record.message;

        if (Levels.isLowerThan(record.level, Level.Warning)) {
            print(message);

            return;
        }

        warn(message);
    }
}
