import type { LogRecord, RecordBag } from "Monolog/LogRecord";

/**
 * PHP: `Monolog\Utils`.
 *
 * Not ported: `getClass` (no PHP class-name reflection to normalize -- callers
 * that need "what kind of value is this" use `typeOf`/`tostring` directly),
 * `substr`/`canonicalizePath` (mbstring- and filesystem-specific), and
 * `expandIniShorthandBytes`/`detectAndCleanUtf8` (`php.ini` shorthand and
 * mbstring UTF-8 repair, neither of which apply on this platform).
 */

/** A table produced by `markAsJsonObject` always encodes as `{}`, even empty. */
const FORCE_OBJECT_KEY = "__monolog_json_object__";

/**
 * Marks a table so `jsonEncode` renders it as a JSON object (`{}`) rather than
 * an array (`[]`) when it is empty. Luau tables can't tell an empty array from
 * an empty object apart the way PHP's `\stdClass` vs `[]` can -- see
 * `JsonFormatter.ts`, which is the one caller that needs this.
 */
export function markAsJsonObject<T extends object>(value: T): T {
    (value as Record<string, unknown>)[FORCE_OBJECT_KEY] = true;

    return value;
}

function isForcedObject(value: RecordBag): boolean {
    return value[FORCE_OBJECT_KEY] === true;
}

function escapeJsonString(value: string): string {
    let [out] = value.gsub("\\", "\\\\");
    [out] = out.gsub('"', '\\"');
    [out] = out.gsub("\n", "\\n");
    [out] = out.gsub("\r", "\\r");
    [out] = out.gsub("\t", "\\t");

    return out;
}

function encodeNumber(value: number): string {
    if (value !== value) {
        return '"NaN"';
    }

    if (value === math.huge) {
        return '"INF"';
    }

    if (value === -math.huge) {
        return '"-INF"';
    }

    return tostring(value);
}

function indent(depth: number, pretty: boolean): string {
    return pretty ? "    ".rep(depth) : "";
}

function encodeValue(value: unknown, pretty: boolean, depth: number): string {
    if (value === undefined) {
        return "null";
    }

    if (typeIs(value, "string")) {
        return `"${escapeJsonString(value)}"`;
    }

    if (typeIs(value, "number")) {
        return encodeNumber(value);
    }

    if (typeIs(value, "boolean")) {
        return value ? "true" : "false";
    }

    if (!typeIs(value, "table")) {
        // No object/resource system to reflect on -- render anything else, such
        // as a function or an opaque instance, the way an unrecognized PHP value
        // would end up rendered: as a string.
        return `"${escapeJsonString(tostring(value))}"`;
    }

    const bag = value as RecordBag;
    const list = value as Array<unknown>;
    const forceObject = isForcedObject(bag);

    if (!forceObject && list.size() > 0) {
        const items = new Array<string>();

        for (const item of list) {
            items.push(encodeValue(item, pretty, depth + 1));
        }

        return wrapList(items, pretty, depth);
    }

    const keys = new Array<string>();

    for (const [key] of pairs(bag)) {
        if (key === FORCE_OBJECT_KEY) {
            continue;
        }

        keys.push(tostring(key));
    }

    keys.sort();

    if (keys.isEmpty()) {
        // An empty Luau table is indistinguishable from an empty array, so it
        // defaults to encoding as `[]` -- matching PHP's own `json_encode([])`,
        // which is what upstream relies on for an empty context/extra bag.
        // `markAsJsonObject` opts a specific empty table into `{}` instead
        // (see `JsonFormatter.ts`, the one caller that needs that).
        return forceObject ? "{}" : "[]";
    }

    const pieces = new Array<string>();

    for (const key of keys) {
        const encodedValue = encodeValue(bag[key], pretty, depth + 1);
        const separator = pretty ? ": " : ":";

        pieces.push(
            `${indent(depth + 1, pretty)}"${escapeJsonString(key)}"${separator}${encodedValue}`,
        );
    }

    return wrapObject(pieces, pretty, depth);
}

function wrapList(
    items: Array<string>,
    pretty: boolean,
    depth: number,
): string {
    if (items.isEmpty()) {
        return "[]";
    }

    if (!pretty) {
        return `[${items.join(",")}]`;
    }

    const inner = items
        .map((item) => `${indent(depth + 1, true)}${item}`)
        .join(",\n");

    return `[\n${inner}\n${indent(depth, true)}]`;
}

function wrapObject(
    pieces: Array<string>,
    pretty: boolean,
    depth: number,
): string {
    if (!pretty) {
        return `{${pieces.join(",")}}`;
    }

    return `{\n${pieces.join(",\n")}\n${indent(depth, true)}}`;
}

export class Utils {
    /**
     * PHP: `Utils::jsonEncode()`/`Utils::handleJsonError()`. There is no
     * `json_encode` on this platform, so this is a small deterministic encoder
     * instead: Luau tables carry no key order, so object keys are sorted before
     * being written, and there is nothing that can fail the way `json_encode`
     * can (invalid UTF-8, unsupported resource types) -- so there is nothing to
     * recover from and no `handleJsonError` equivalent.
     */
    public static jsonEncode(data: unknown, pretty = false): string {
        return encodeValue(data, pretty, 0);
    }

    /** PHP: `Utils::getRecordMessageForException()`. */
    public static getRecordMessageForException(record: LogRecord): string {
        let context = "";
        let extra = "";

        if (next(record.context)[0] !== undefined) {
            context = `\nContext: ${Utils.jsonEncode(record.context)}`;
        }

        if (next(record.extra)[0] !== undefined) {
            extra = `\nExtra: ${Utils.jsonEncode(record.extra)}`;
        }

        return `\nThe exception occurred while attempting to log: ${record.message}${context}${extra}`;
    }
}
