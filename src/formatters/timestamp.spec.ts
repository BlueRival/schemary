import { describe, expect, it } from 'vitest';
import { format } from './timestamp.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const only = true;

type PartsKeys = string;

interface TestDatesTests {
  only?: boolean;
  name: string;
  input: string;
  formatHint?: string;
  parts: {
    [key: PartsKeys]: string | Error;
  };
}

// Create diverse test date values with descriptive names and full format/parts or error
const testDates: TestDatesTests[] = [
  {
    name: 'Standard date+time with milliseconds',
    input: '2025-01-15T14:30:45.078',
    formatHint: "yyyy-MM-dd'T'HH:mm:ss.SSS",
    parts: {
      yyyy: '2025',
      MM: '01',
      dd: '15',
      HH: '14',
      mm: '30',
      ss: '45',
      SSS: '078',
      a: 'PM',
      ZZZZ: 'UTC',
    },
  },
  {
    name: 'Standard date+time ISO no offset',
    input: '2025-01-15T14:30:45.678',
    formatHint: "yyyy-MM-dd'T'HH:mm:ss.SSS",
    parts: {
      yyyy: '2025',
      MM: '01',
      dd: '15',
      HH: '14',
      mm: '30',
      ss: '45',
      SSS: '678',
      a: 'PM',
      ZZZZ: 'UTC',
    },
  },
  {
    name: 'Midnight UTC',
    input: '2025-01-05T00:00:00.000',
    formatHint: "yyyy-MM-dd'T'HH:mm:ss.SSS",
    parts: {
      yyyy: '2025',
      MM: '01',
      dd: '05',
      HH: '00',
      mm: '00',
      ss: '00',
      SSS: '000',
      a: 'AM',
      ZZZZ: 'UTC',
    },
  },
  {
    name: 'End of day',
    input: '2025-01-15T23:59:59.999',
    formatHint: "yyyy-MM-dd'T'HH:mm:ss.SSS",
    parts: {
      yyyy: '2025',
      MM: '01',
      dd: '15',
      HH: '23',
      mm: '59',
      ss: '59',
      SSS: '999',
      a: 'PM',
      ZZZZ: 'UTC',
    },
  },
  {
    name: 'Leap year date',
    input: '2024-02-29T12:00:00.000',
    formatHint: "yyyy-MM-dd'T'HH:mm:ss.SSS",
    parts: {
      yyyy: '2024',
      MM: '02',
      dd: '29',
      HH: '12',
      mm: '00',
      ss: '00',
      SSS: '000',
      a: 'PM',
      ZZZZ: 'UTC',
    },
  },
  {
    name: 'Year end',
    input: '2023-12-31T18:30:00.000',
    formatHint: "yyyy-MM-dd'T'HH:mm:ss.SSS",
    parts: {
      yyyy: '2023',
      MM: '12',
      dd: '31',
      HH: '18',
      mm: '30',
      ss: '00',
      SSS: '000',
      a: 'PM',
      ZZZZ: 'UTC',
    },
  },
  {
    name: 'ISO with Z offset',
    input: '2025-01-15T14:30:08.078Z',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      yyyy: '2025',
      MM: '01',
      dd: '15',
      HH: '14',
      mm: '30',
      ss: '08',
      SSS: '078',
    },
  },
  {
    name: 'RFC 2822 timestamp',
    input: 'Mon, 02 Mar 1981 14:02:18 EST',
    parts: {
      ZZZZZ: 'UTC-5',
      ZZZZ: 'UTC-5',
      ZZZ: '-0500',
      ZZ: '-05:00',
      Z: '-5',
      z: 'UTC-5',
      yyyy: '1981',
      MM: '03',
      dd: '02',
      HH: '14',
      mm: '02',
      ss: '18',
      SSS: '000',
    },
  },
  {
    name: 'HTTP Date timestamp',
    input: 'Sun Nov  6 08:49:37 1994',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      yyyy: '1994',
      MM: '11',
      dd: '06',
      HH: '08',
      mm: '49',
      ss: '37',
      SSS: '000',
      a: 'AM',
    },
  },
  {
    name: 'SQL timestamp no millis or timezone',
    input: '1994-11-06 08:49:37',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      yyyy: '1994',
      MM: '11',
      dd: '06',
      HH: '08',
      mm: '49',
      ss: '37',
      SSS: '000',
      a: 'AM',
    },
  },
  {
    name: 'MM/DD/YYYY with time and timezone and hint',
    formatHint: 'M/d/yyyy H:m:s z',
    input: '01/15/2025 3:30:45 EST',
    parts: {
      ZZZZZ: 'Eastern Standard Time',
      ZZZZ: 'EST',
      ZZZ: '-0500',
      ZZ: '-05:00',
      Z: '-5',
      z: 'EST',
      yyyy: '2025',
      MM: '01',
      dd: '15',
      H: '3',
      mm: '30',
      ss: '45',
      a: 'AM',
    },
  },
  {
    name: 'MM/DD/YYYY with time and timezone and hint',
    input: '01/15/2025 3:30:45 EST',
    formatHint: 'MM/dd/yyyy H:mm:ss',
    parts: {
      yyyy: new Error('date does not match format'),
    },
  },
  {
    name: 'YYYY/MM/DD with time and no hint',
    input: '2025/01/15 03:30:45',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      yyyy: '2025',
      yy: '25',
      M: '1',
      MM: '01',
      dd: '15',
      H: '3',
      HH: '03',
      mm: '30',
      ss: '45',
      a: 'AM',
    },
  },
  {
    name: 'MM/DD/YYYY with time and no hint',
    input: '01/15/2025 03:30:45',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      yyyy: '2025',
      yy: '25',
      M: '1',
      MM: '01',
      dd: '15',
      H: '3',
      HH: '03',
      mm: '30',
      ss: '45',
      a: 'AM',
    },
  },
  {
    name: 'MM/DD/YYYY with time and timezone offset and no hint ',
    input: '1/15/2025 3:30:45 -5',
    parts: {
      ZZZZZ: 'UTC-5',
      ZZZZ: 'UTC-5',
      ZZZ: '-0500',
      ZZ: '-05:00',
      Z: '-5',
      z: 'UTC-5',
      yyyy: '2025',
      yy: '25',
      M: '1',
      MM: '01',
      dd: '15',
      H: '3',
      HH: '03',
      mm: '30',
      ss: '45',
      a: 'AM',
    },
  },
  {
    name: 'MM/DD/YYYY with time and timezone name and no hint ',
    input: '1/15/2025 3:30:45 America/New_York',
    parts: {
      ZZZZZ: 'Eastern Standard Time',
      ZZZZ: 'EST',
      ZZZ: '-0500',
      ZZ: '-05:00',
      Z: '-5',
      z: 'America/New_York',
      yyyy: '2025',
      yy: '25',
      M: '1',
      MM: '01',
      dd: '15',
      H: '3',
      HH: '03',
      mm: '30',
      ss: '45',
      a: 'AM',
    },
  },
  {
    name: 'MM/DD/YYYY with PM time and timezone name and no hint',
    input: '1/15/2025 3:30:45 PM America/New_York',
    parts: {
      ZZZZZ: 'Eastern Standard Time',
      ZZZZ: 'EST',
      ZZZ: '-0500',
      ZZ: '-05:00',
      Z: '-5',
      z: 'America/New_York',
      yyyy: '2025',
      yy: '25',
      M: '1',
      MM: '01',
      dd: '15',
      H: '15',
      HH: '15',
      mm: '30',
      ss: '45',
      a: 'PM',
    },
  },
  {
    name: 'Unix timestamp with no hint',
    input: '1746693994621',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      yyyy: '2025',
      yy: '25',
      M: '5',
      MM: '05',
      d: '8',
      dd: '08',
      H: '8',
      HH: '08',
      mm: '46',
      ss: '34',
      a: 'AM',
    },
  },
  {
    name: 'Time only with hint',
    input: '14:30:45',
    formatHint: 'H:mm:ss',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      H: '14',
      HH: '14',
      mm: '30',
      m: '30',
      ss: '45',
      s: '45',
    },
  },
  {
    name: 'Time only with no hint',
    input: '14:30:45.034',
    parts: {
      ZZZZZ: 'UTC',
      ZZZZ: 'UTC',
      ZZZ: '+0000',
      ZZ: '+00:00',
      Z: '+0',
      z: 'UTC',
      H: '14',
      HH: '14',
      mm: '30',
      m: '30',
      ss: '45',
      s: '45',
      SSS: '034',
      S: '34',
    },
  },
  {
    name: 'Non-parseable garbage',
    input: 'not a date',
    parts: { H: new Error('invalid date') },
  },
  {
    name: 'Negative UNIX Timestamp',
    input: '-1354556',
    parts: {
      http: 'Wed, 31 Dec 1969 23:37:25 GMT',
      iso8601: '1969-12-31T23:37:25.444Z',
      rfc2822: 'Wed, 31 Dec 1969 23:37:25 +0000',
      sql: '1969-12-31 23:37:25.444 Z',
      unix: '-1354556',
    },
  },
  {
    name: 'FormatShortNames mapping',
    input: '2025-01-15T14:30:45.078',
    parts: {
      unix: '1736951445078',
      iso8601: '2025-01-15T14:30:45.078Z',
      rfc2822: 'Wed, 15 Jan 2025 14:30:45 +0000',
      http: 'Wed, 15 Jan 2025 14:30:45 GMT',
      sql: '2025-01-15 14:30:45.078 Z',
    },
  },
  {
    name: 'UNIX parseFormat mismatch',
    input: 'not a number',
    formatHint: 'unix',
    parts: {
      unix: new Error('date does not match format'),
    },
  },
  {
    name: 'ISO8601 parseFormat mismatch',
    input: 'not iso',
    formatHint: 'iso8601',
    parts: {
      iso8601: new Error('date does not match format'),
    },
  },
  {
    name: 'RFC2822 parseFormat mismatch',
    input: 'not rfc',
    formatHint: 'rfc2822',
    parts: {
      rfc2822: new Error('date does not match format'),
    },
  },
  {
    name: 'HTTP parseFormat mismatch',
    input: 'not http',
    formatHint: 'http',
    parts: {
      http: new Error('date does not match format'),
    },
  },
  {
    name: 'SQL parseFormat mismatch',
    input: 'not sql',
    formatHint: 'sql',
    parts: {
      sql: new Error('date does not match format'),
    },
  },
];

describe('formatDate', () => {
  for (const { name, input, formatHint, parts } of testDates) {
    it(name, () => {
      const partsMatch: Record<string, string | undefined> = {};
      const partsExpect: Record<string, string> = {};

      for (const [formatToken, expected] of Object.entries(parts)) {
        if (expected instanceof Error) {
          partsExpect[formatToken] = expected.message;

          try {
            format(input, formatToken, formatHint);
            partsMatch[formatToken] = undefined;
          } catch (e) {
            if (e instanceof Error) {
              partsMatch[formatToken] = e.message;
            } else {
              partsMatch[formatToken] = undefined;
            }
          }
        } else {
          partsExpect[formatToken] = expected;
          partsMatch[formatToken] = format(input, formatToken, formatHint);
        }
      }

      expect(partsMatch).toStrictEqual(partsExpect);
    });
  }
});
