import { Level, Levels } from "Monolog/Level";
import { NormalizerFormatter } from "Monolog/Formatter/NormalizerFormatter";
import { Utils } from "Monolog/Utils";
import type { LogRecord } from "Monolog/LogRecord";

const LEVEL_COLORS = new Map<Level, string>([
    [Level.Debug, "#CCCCCC"],
    [Level.Info, "#28A745"],
    [Level.Notice, "#17A2B8"],
    [Level.Warning, "#FFC107"],
    [Level.Error, "#FD7E14"],
    [Level.Critical, "#DC3545"],
    [Level.Alert, "#821722"],
    [Level.Emergency, "#000000"],
]);

function escapeHtml(value: string): string {
    let [out] = value.gsub("&", "&amp;");
    [out] = out.gsub("<", "&lt;");
    [out] = out.gsub(">", "&gt;");

    return out;
}

/**
 * PHP: `Monolog\Formatter\HtmlFormatter`.
 *
 * There is no `htmlspecialchars()` on this platform; `escapeHtml()` below
 * escapes the same characters PHP's `ENT_NOQUOTES` mode does (`&`, `<`, `>`),
 * leaving single/double quotes alone exactly as `ENT_NOQUOTES` does.
 */
export class HtmlFormatter extends NormalizerFormatter {
    /** Translates Monolog log levels to HTML color priorities. */
    protected getLevelColor(level: Level): string {
        return LEVEL_COLORS.get(level) ?? "#000000";
    }

    /** Creates an HTML table row. */
    protected addRow(th: string, td = " ", escapeTd = true): string {
        const heading = escapeHtml(th);
        const cell = escapeTd ? `<pre>${escapeHtml(td)}</pre>` : td;

        return `<tr style="padding: 4px;text-align: left;">\n<th style="vertical-align: top;background: #ccc;color: #000" width="100">${heading}:</th>\n<td style="padding: 4px;text-align: left;vertical-align: top;background: #eee;color: #000">${cell}</td>\n</tr>`;
    }

    /** Create an HTML h1 tag. */
    protected addTitle(title: string, level: Level): string {
        return `<h1 style="background: ${this.getLevelColor(level)};color: #ffffff;padding: 5px;" class="monolog-output">${escapeHtml(title)}</h1>`;
    }

    /** Formats a log record. */
    public format(record: LogRecord): string {
        let output = this.addTitle(Levels.getName(record.level), record.level);
        output += '<table cellspacing="1" width="100%" class="monolog-output">';

        output += this.addRow("Message", record.message);
        output += this.addRow("Time", this.formatDate(record.datetime));
        output += this.addRow("Channel", record.channel);

        if (next(record.context)[0] !== undefined) {
            let embedded = '<table cellspacing="1" width="100%">';

            for (const [key, value] of pairs(record.context)) {
                embedded += this.addRow(
                    tostring(key),
                    this.convertToString(value),
                );
            }

            embedded += "</table>";
            output += this.addRow("Context", embedded, false);
        }

        if (next(record.extra)[0] !== undefined) {
            let embedded = '<table cellspacing="1" width="100%">';

            for (const [key, value] of pairs(record.extra)) {
                embedded += this.addRow(
                    tostring(key),
                    this.convertToString(value),
                );
            }

            embedded += "</table>";
            output += this.addRow("Extra", embedded, false);
        }

        return `${output}</table>`;
    }

    /** Formats a set of log records. */
    public formatBatch(records: Array<LogRecord>): string {
        let message = "";

        for (const record of records) {
            message += this.format(record);
        }

        return message;
    }

    protected convertToString(data: unknown): string {
        if (
            data === undefined ||
            typeIs(data, "string") ||
            typeIs(data, "number") ||
            typeIs(data, "boolean")
        ) {
            return data === undefined ? "" : tostring(data);
        }

        // Upstream always pretty-prints here regardless of the formatter's own
        // `setJsonPrettyPrint()` toggle -- call the encoder directly instead of
        // going through `toJson()`, which would use that toggle's value.
        return Utils.jsonEncode(this.normalize(data), true);
    }
}
