import type { LogRecord, RecordBag } from "Monolog/LogRecord";
import type { ProcessorInterface } from "Monolog/Processor/ProcessorInterface";

interface SoleEntry {
    key: string;
    value: unknown;
}

/** True when `bag` has exactly one entry; returns that entry. */
function soleEntry(bag: RecordBag): SoleEntry | undefined {
    const [firstKey, firstValue] = next(bag);

    if (firstKey === undefined) {
        return undefined;
    }

    const [secondKey] = next(bag, firstKey);

    if (secondKey !== undefined) {
        return undefined;
    }

    return { key: firstKey, value: firstValue };
}

/**
 * PHP: `Monolog\Processor\ClosureContextProcessor`.
 *
 * Upstream keys this off `$context[0]`, PHP's implicit first-array-index; a
 * `RecordBag` has no positional index, so this checks whether context has
 * exactly one entry and that entry's value is a function, regardless of its
 * key name.
 */
export class ClosureContextProcessor implements ProcessorInterface {
    public process(record: LogRecord): LogRecord {
        const sole = soleEntry(record.context);

        if (sole === undefined || !typeIs(sole.value, "function")) {
            return record;
        }

        const [ok, result] = pcall(sole.value as () => unknown);

        let context: RecordBag;

        if (!ok) {
            context = {
                error_on_context_generation: tostring(result),
                exception: result,
            };
        } else if (typeIs(result, "table")) {
            context = result as RecordBag;
        } else {
            // Upstream wraps a non-array result as `[$context]`, which lands back
            // at key `0` -- the same key it started under, since PHP's implicit
            // index was always `0`. Re-using the original key name here is this
            // port's equivalent, since there is no positional index to fall back to.
            context = { [sole.key]: result };
        }

        return record.with({ context });
    }
}
