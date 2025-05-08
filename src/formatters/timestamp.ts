import { DateTime } from 'luxon';

const ParseDateVariations: string[] = [
  'yyyy-M-d_',
  "yyyy-M-d'T'",
  'yyyy-M-d ',
  'yyyy/M/d ',
  'M/d/yyyy ',
  'MMM d, yyyy ',
  'MMMM d, yyyy ',
  "MMM d, yyyy 'at'",
  "MMMM d, yyyy 'at'",
];

const ParseDateTimeVariations: string[] = [
  'H:m:s.SSS',
  'H:m:s',
  'H:m',
  'h:m:s.SSS a',
  'h:m:s a',
  'h:m a',
  '',
];

const ParseDateTimeZoneVariations: string[] = ['ZZZ', 'ZZ', 'z', ''];

/** Lowest level: just time + timezone */
function getRandomTimeOnlyFormats(): string[] {
  const out: string[] = [];
  for (const t of ParseDateTimeVariations) {
    if (t === '') {
      out.push(``);
      continue;
    }
    for (const tz of ParseDateTimeZoneVariations) {
      out.push(`${t} ${tz}`.trim());
    }
  }
  return out;
}

/** Apply conjunctions—but only when there *is* a time */
function getRandomTimeConjunctionFormats(): string[] {
  const out: string[] = [];
  const times = getRandomTimeOnlyFormats();
  for (const time of times) {
    out.push(` ${time}`.trim());
  }
  return out;
}

/** Date plus (optional) time+conjunction */
function getRandomDateFormats(): string[] {
  const out: string[] = [];
  const timeConjunctions = getRandomTimeConjunctionFormats();
  for (const dateVariation of ParseDateVariations) {
    for (const timeConjunction of timeConjunctions) {
      out.push(
        `${dateVariation}${timeConjunction}`.replace(
          /[\s\t_]*('T'|'at')*[\s\t_]*$/,
          '',
        ),
      );
    }
  }
  return out;
}

/** Top‐level: day prefix + (date + time + timezone), then sort */
export function getRandomTimeFormats(): string[] {
  const deduplicationSet = new Set<string>();
  let dateTimes = getRandomDateFormats();

  // remove excess whitespace
  dateTimes = dateTimes.map((token) => token.replace(/[\s\t]+/g, ' ').trim());

  dateTimes.forEach((token) => {
    deduplicationSet.add(token);
  });

  dateTimes = Array.from(deduplicationSet);

  // dedupe & sort from longest → shortest
  return dateTimes.sort((a, b) => b.length - a.length); // sort from longest to shortest
}

const RANDOM_TIME_FORMATS = getRandomTimeFormats();

export enum FormatShortNames {
  UNIX = 'unix',
  ISO8601 = 'iso8601',
  RFC2822 = 'rfc2822',
  HTTP = 'http',
  SQL = 'sql',
}

/**
 * Parse an ISO date‐time string, preserving any offset, or defaulting to UTC if
 * none is provided.
 */
function parseDateTime(
  input: string,
  parseFormat?: string | FormatShortNames,
): DateTime {
  // Always preserve an explicit offset, or fallback to UTC if none provided
  const opts = { zone: 'utc', setZone: true };

  // If a parseFormat hint is provided, try parsing with that format first
  if (
    parseFormat &&
    !Object.values(FormatShortNames).includes(parseFormat as FormatShortNames)
  ) {
    const dtFmt: DateTime = DateTime.fromFormat(input, parseFormat, opts);
    if (dtFmt.isValid) {
      return dtFmt;
    }

    throw new Error('date does not match format');
  }

  // Try Unix timestamp in milliseconds (e.g. 1604604800 || -1604604800)
  if (input.match(/^-?[0-9]+$/)) {
    const dtUnix: DateTime = DateTime.fromMillis(Number(input), opts);
    if (dtUnix.isValid) {
      return dtUnix;
    }
  } else if (parseFormat === FormatShortNames.UNIX) {
    throw new Error('date does not match format');
  }

  // Try ISO-8601 (with or without offset)
  const dtIso: DateTime = DateTime.fromISO(input, opts);
  if (dtIso.isValid) {
    return dtIso;
  } else if (parseFormat === FormatShortNames.ISO8601) {
    throw new Error('date does not match format');
  }

  // Try RFC 2822 (e.g. "Thu, 01 Jan 1970 00:00:00 GMT")
  const dtRfc: DateTime = DateTime.fromRFC2822(input, opts);
  if (dtRfc.isValid) {
    return dtRfc;
  } else if (parseFormat === FormatShortNames.RFC2822) {
    throw new Error('date does not match format');
  }

  // Try HTTP-date (e.g. "Sun, 06 Nov 1994 08:49:37 GMT")
  const dtHttp: DateTime = DateTime.fromHTTP(input, opts);
  if (dtHttp.isValid) {
    return dtHttp;
  } else if (parseFormat === FormatShortNames.HTTP) {
    throw new Error('date does not match format');
  }

  // Try SQL-date (e.g. "1994-11-06 08:49:37")
  const dtSql: DateTime = DateTime.fromSQL(input, opts);
  if (dtSql.isValid) {
    return dtSql;
  } else if (parseFormat === FormatShortNames.SQL) {
    throw new Error('date does not match format');
  }

  for (const format of RANDOM_TIME_FORMATS) {
    const randomDt = DateTime.fromFormat(input, format, opts);

    if (randomDt.isValid) {
      return randomDt;
    }
  }

  throw new Error('invalid date');
}

/**
 * Formats a given date string into a specified format. Assumes the date is a
 * "wall clock" time, even if it includes a timezone/offset. If the date string
 * does not include a timezone/offset, it will be assumed to be in UTC.
 *
 * Uses Luxon's single-quote quoting for literals in the format string.
 *
 * @param {string} date - The date string to be formatted.
 * @param {string | FormatShortNames} targetFormat - The desired format for the output date string.
 * @param {string | FormatShortNames} inputFormat - If provided, is a hint on how to parse the input date string.
 * @return {string} The formatted date string.
 */
export function format(
  date: string,
  targetFormat: string | FormatShortNames,
  inputFormat?: string | FormatShortNames,
): string {
  const dt = parseDateTime(date, inputFormat);

  switch (targetFormat) {
    case `${FormatShortNames.UNIX}`:
      return dt.toMillis().toString();

    case `${FormatShortNames.ISO8601}`:
      // we know this is valid string because parseDateTime() checks for valid or throws Error
      return dt.toISO() as string;

    case `${FormatShortNames.RFC2822}`:
      // we know this is valid string because parseDateTime() checks for valid or throws Error
      return dt.toRFC2822() as string;

    case `${FormatShortNames.HTTP}`:
      // we know this is valid string because parseDateTime() checks for valid or throws Error
      return dt.toHTTP() as string;

    case `${FormatShortNames.SQL}`:
      // we know this is valid string because parseDateTime() checks for valid or throws Error
      return dt.toSQL() as string;

    default:
      return dt.toFormat(targetFormat);
  }
}
