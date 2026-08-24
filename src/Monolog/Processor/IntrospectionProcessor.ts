import { Level, Levels } from "Monolog/Level";
import { Logger } from "Monolog/Logger";
import type { LogLevel } from "Monolog/LoggerInterface";
import type { LogRecord } from "Monolog/LogRecord";
import type { ProcessorInterface } from "Monolog/Processor/ProcessorInterface";

/**
 * PHP: `Monolog\Processor\IntrospectionProcessor`.
 *
 * Upstream walks `debug_backtrace()`, skipping frames belonging to
 * `skipClassesPartials` (default `["Monolog\\"]`) and PHP's
 * `call_user_func`/`call_user_func_array` wrappers, to find the frame that
 * actually logged the message. Luau's `debug.info` reports one stack level at
 * a time with no per-frame "class" the way a PHP trace frame has, so there is
 * nothing for a class-partial skip list to match against -- `skipClassesPartials`
 * is dropped entirely rather than faked.
 *
 * `BASE_STACK_OFFSET` is this port's analog of upstream's two `array_shift()`
 * calls (its own frame, then the generic invoker frame -- `runProcessor()`
 * here, `call_user_func` there). Unlike upstream's flat PHP call stack,
 * `Logger.addRecord()` on this platform adds its own internal frames before
 * reaching a processor, so the reported file/line will typically land inside
 * that dispatch machinery rather than the original log call site. Tune
 * `skipStackFramesCount` to compensate if more precision is needed.
 *
 * Warning: this only works if the handler processes the logs directly -- see
 * upstream's own caveat, which applies here unchanged.
 */
export class IntrospectionProcessor implements ProcessorInterface {
    private static readonly BASE_STACK_OFFSET = 3;

    protected level: Level;

    public constructor(
        level: Level | LogLevel = Level.Debug,
        protected skipStackFramesCount = 0,
    ) {
        this.level = Logger.toMonologLevel(level);
    }

    public process(record: LogRecord): LogRecord {
        if (Levels.isLowerThan(record.level, this.level)) {
            return record;
        }

        const [source, line, name] = debug.info(
            IntrospectionProcessor.BASE_STACK_OFFSET +
                this.skipStackFramesCount,
            "sln",
        );

        record.extra.file = source;
        record.extra.line = line;
        record.extra.function = name;
        // `class`/`callType` are left unset -- Luau has no reflective notion of
        // "the class this call happened in" the way `$trace[$i]['class']` does.

        return record;
    }
}
