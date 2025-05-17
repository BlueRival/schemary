import { describe, expect, it } from 'vitest';
import {
  compile,
  MappingPlanParams,
  MappingPlanRuleOrder,
  MappingRuleParams,
} from './compile.js';

import { map, MAP_DIRECTION } from './execute.js';
import { JSONType } from '../types.js';
import { MappingRuleFormatType } from './plan.js';
import { FormatShortNames as TimestampFormats } from '../formatters/timestamp.js';

// Uses these short-cut flags on tests to quick-pass true for the respective options
const bidirectional = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const only = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const skip = true;
const rightToLeft = true;

type TestMapping = {
  name?: string;
  rules: MappingRuleParams<any, any>[];
  plan?: MappingPlanParams;
  bidirectional?: boolean;
  left: JSONType;
  leftOverride?: JSONType;
  right: JSONType;
  rightOverride?: JSONType;
  only?: boolean;
  skip?: boolean;
  rightToLeft?: boolean;
};

function generateTests(group: string, tests: TestMapping[]) {
  if (tests.length === 0) {
    return;
  }

  describe(group, () => {
    tests.forEach((test) => {
      try {
        let name = test.name;

        if (!name) {
          name = JSON.stringify(test.rules[0])
            .replace(/"([^"]+)":/g, ' $1:')
            .replace(/}$/, ' }');
        }
        name = `Array Segment test: ${name}`;

        const plan = compile(test.rules, test.plan);

        const testInput = test.rightToLeft ? test.right : test.left;
        const testResult = test.rightToLeft ? test.left : test.right;

        const testFunction = () => {
          const result = map(
            testInput,
            plan,
            test.rightToLeft ? test.rightOverride : test.leftOverride,
            test.rightToLeft
              ? MAP_DIRECTION.RightToLeft
              : MAP_DIRECTION.LeftToRight,
          );

          expect(result).toStrictEqual(testResult);
        };

        if (test.only) {
          it.only(name, testFunction);
        } else if (test.skip) {
          it.skip(name, testFunction);
        } else {
          it(name, testFunction);
        }

        if (test.bidirectional) {
          name += ' (Right-to-Left)';
          const leftToRightTestFunction = () => {
            const result = map(
              testResult,
              plan,
              test.rightToLeft ? test.leftOverride : test.rightOverride,
              test.rightToLeft
                ? MAP_DIRECTION.LeftToRight
                : MAP_DIRECTION.RightToLeft,
            );

            expect(result).toStrictEqual(testInput);
          };

          if (test.only) {
            it.only(name, leftToRightTestFunction);
          } else if (test.skip) {
            it.skip(name, leftToRightTestFunction);
          } else {
            it(name, leftToRightTestFunction);
          }
        }
      } catch (e) {
        const myError = e instanceof Error ? e : new Error(String(e));
        throw new Error(
          `Exception setting up test ${group}.${test.name}: ${myError.message}`,
        );
      }
    });
  });
}

describe('JSON Schema Mapping', () => {
  generateTests('field mapping', [
    {
      name: 'should map basic fields in both directions',
      bidirectional,
      rules: [
        { left: 'user.firstName', right: 'givenName' },
        { left: 'user.lastName', right: 'familyName' },
        { left: 'user.age', right: 'age' },
      ],
      left: {
        user: {
          firstName: 'John',
          lastName: 'Doe',
          age: 30,
        },
      },
      right: {
        givenName: 'John',
        familyName: 'Doe',
        age: 30,
      },
    },
    {
      name: 'should map nested objects in both directions',
      bidirectional,
      rules: [
        { left: 'user.contact.email', right: 'profile.emailAddress' },
        { left: 'user.contact.phone', right: 'profile.phoneNumber' },
        { left: 'user.address.street', right: 'location.streetAddress' },
        { left: 'user.address.city', right: 'location.city' },
      ],
      left: {
        user: {
          contact: {
            email: 'john@example.com',
            phone: '555-1234',
          },
          address: {
            street: '123 Main St',
            city: 'Anytown',
          },
        },
      },
      right: {
        profile: {
          emailAddress: 'john@example.com',
          phoneNumber: '555-1234',
        },
        location: {
          streetAddress: '123 Main St',
          city: 'Anytown',
        },
      },
    },
  ]);

  generateTests('formatting', [
    {
      name: 'Should map between date formats back and forth using shortcut formats',
      bidirectional,
      rules: [
        {
          left: 'timestamp',
          right: 'timestamp',
          format: {
            type: MappingRuleFormatType.TIMESTAMP,
            toLeft: TimestampFormats.ISO8601,
            toRight: TimestampFormats.HTTP,
          },
        },
      ],
      left: {
        timestamp: '2020-05-16T14:34:07.000Z',
      },
      right: {
        timestamp: 'Sat, 16 May 2020 14:34:07 GMT',
      },
    },
    {
      name: 'Should map between date formats back and forth using custom formats',
      bidirectional,
      rules: [
        {
          left: 'timestamp',
          right: 'timestamp',
          format: {
            type: MappingRuleFormatType.TIMESTAMP,
            toLeft: 'yyyy-MM-dd',
            toRight: 'EEE, d MMM yyyy',
          },
        },
      ],
      left: {
        timestamp: '2020-05-16',
      },
      right: {
        timestamp: 'Sat, 16 May 2020',
      },
    },
  ]);

  generateTests('rule order with MappingPlanRuleOrder', [
    {
      name: 'should demonstrate ASC rule order (last rule wins)',
      rules: [
        // Both rules target the same field, order matters!
        { left: 'sourceField1', right: 'targetField' },
        { left: 'sourceField2', right: 'targetField' },
      ],
      left: {
        sourceField1: 'first value',
        sourceField2: 'second value',
      },
      right: {
        // With ASC order, sourceField2 overwrites sourceField1
        targetField: 'second value',
      },
    },
    {
      name: 'should demonstrate DESC rule order (first rule wins)',
      plan: {
        order: {
          toLeft: MappingPlanRuleOrder.DESC,
          toRight: MappingPlanRuleOrder.DESC,
        },
      },
      rules: [
        // Both rules target the same field, order matters!
        { left: 'sourceField1', right: 'targetField' },
        { left: 'sourceField2', right: 'targetField' },
      ],
      left: {
        sourceField1: 'first value',
        sourceField2: 'second value',
      },
      right: {
        // With DESC order, rules are reversed, so sourceField1 overwrites sourceField2
        targetField: 'first value',
      },
    },
    {
      name: 'should handle rule order with overrideValues (overrides always win)',
      plan: {
        order: {
          toLeft: MappingPlanRuleOrder.DESC,
          toRight: MappingPlanRuleOrder.DESC,
        },
      },
      rules: [
        // Both rules target the same field, order matters!
        { left: 'sourceField1', right: 'targetField' },
        { left: 'sourceField2', right: 'targetField' },
      ],
      left: {
        sourceField1: 'first value',
        sourceField2: 'second value',
      },
      leftOverride: {
        targetField: 'override value',
      },
      right: {
        // Regardless of rule order, overrides always win
        targetField: 'override value',
      },
    },
    {
      name: 'should demonstrate bidirectional ASC and DESC rule order',
      plan: {
        order: {
          toLeft: MappingPlanRuleOrder.DESC,
          toRight: MappingPlanRuleOrder.DESC,
        },
      },
      rules: [
        { left: 'sourceField1', right: 'targetField1' },
        { left: 'sourceField2', right: 'targetField1' }, // Overwrites targetField1 in ASC order
      ],
      left: {
        sourceField1: 'first value',
        sourceField2: 'second value',
      },
      right: {
        // With DESC order in left-to-right, first rule wins because it writes last
        targetField1: 'first value',
      },
    },
  ]);

  generateTests('array index mapping', [
    {
      name: 'should map array elements using indices to object',
      rules: [
        { left: 'users[0].name', right: 'firstUser' },
        { left: 'users[1].email', right: 'secondUserEmail' },
        { left: 'users[-1].name', right: 'lastUser' },
      ],
      left: {
        users: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
          { name: 'Charlie', email: 'charlie@example.com' },
        ],
      },
      right: {
        firstUser: 'Alice',
        lastUser: 'Charlie',
        secondUserEmail: 'bob@example.com',
      },
    },
    {
      name: 'should map to array elements from object',
      rules: [
        { left: 'firstUser', right: 'users[0].name' },
        { left: 'secondUserEmail', right: 'users[1].email' },
        { left: 'lastUser', right: 'users[-1].name' },
      ],
      left: {
        firstUser: 'Alice',
        secondUserEmail: 'bob@example.com',
        lastUser: 'Charlie',
      },
      right: {
        users: [
          { name: 'Alice' },
          { name: 'Charlie', email: 'bob@example.com' },
        ],
      },
    },
    {
      name: 'should count down from back of array correctly',
      rules: [
        { left: 'firstUser', right: 'users[0].name' },
        { left: 'lastUser', right: 'users[-1].name' },
      ],
      left: {
        firstUser: 'Dave',
        lastUser: 'Eve',
      },
      right: {
        users: [{ name: 'Eve' }],
      },
    },
  ]);

  generateTests('array segment mapping X only', [
    {
      rules: [{ left: '[[0]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20, 30, 40, 50],
    },
    {
      rules: [{ left: '[[1]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20, 30, 40, 50],
    },
    {
      rules: [{ left: '[[3]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 50],
    },
    {
      rules: [{ left: '[[4]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: '[[5]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: '[[6]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: '[[10]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: '[[-1]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: '[[-2]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 50],
    },
    {
      rules: [{ left: '[[-3]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [30, 40, 50],
    },
    {
      rules: [{ left: '[[-5]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20, 30, 40, 50],
    },
    {
      rules: [{ left: '[[-6]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20, 30, 40, 50],
    },
    {
      rules: [{ left: '[[-7]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20, 30, 40, 50],
    },
    {
      rules: [{ left: '[[-10]]', right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20, 30, 40, 50],
    },
  ]);

  let Y = 0;
  generateTests(`array segment mapping X and Y = ${Y}`, [
    {
      rules: [{ left: `[[0,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-2,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
  ]);

  Y = 1;
  generateTests(`array segment mapping X and Y = ${Y}`, [
    {
      rules: [{ left: `[[0,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20],
    },
    {
      rules: [{ left: `[[3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40],
    },
    {
      rules: [{ left: `[[4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[-2,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40],
    },
    {
      rules: [{ left: `[[-3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [30],
    },
    {
      rules: [{ left: `[[-5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[-6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
  ]);

  Y = 2;
  generateTests(`array segment mapping X and Y = ${Y}`, [
    {
      rules: [{ left: `[[0,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20],
    },
    {
      rules: [{ left: `[[1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20, 30],
    },
    {
      rules: [{ left: `[[3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 50],
    },
    {
      rules: [{ left: `[[4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[-2,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 50],
    },
    {
      rules: [{ left: `[[-3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [30, 40],
    },
    {
      rules: [{ left: `[[-5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20],
    },
    {
      rules: [{ left: `[[-6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[-7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
  ]);

  Y = 3;
  generateTests(`array segment mapping X and Y = ${Y}`, [
    {
      rules: [{ left: `[[0,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20, 30],
    },
    {
      rules: [{ left: `[[1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20, 30, 40],
    },
    {
      rules: [{ left: `[[3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 50],
    },
    {
      rules: [{ left: `[[4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[-2,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 50],
    },
    {
      rules: [{ left: `[[-3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [30, 40, 50],
    },
    {
      rules: [{ left: `[[-5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20, 30],
    },
    {
      rules: [{ left: `[[-6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10, 20],
    },
    {
      rules: [{ left: `[[-7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[-10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
  ]);

  Y = -1;
  generateTests(`array segment mapping X and Y = ${Y}`, [
    {
      rules: [{ left: `[[0,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20],
    },
    {
      rules: [{ left: `[[3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40],
    },
    {
      rules: [{ left: `[[4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[-2,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40],
    },
    {
      rules: [{ left: `[[-3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [30],
    },
    {
      rules: [{ left: `[[-5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[-6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
  ]);

  Y = -2;
  generateTests(`array segment mapping X and Y = ${Y}`, [
    {
      rules: [{ left: `[[0,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20, 10],
    },
    {
      rules: [{ left: `[[3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 30],
    },
    {
      rules: [{ left: `[[4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50, 40],
    },
    {
      rules: [{ left: `[[5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50, 40],
    },
    {
      rules: [{ left: `[[-2,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 30],
    },
    {
      rules: [{ left: `[[-3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [30, 20],
    },
    {
      rules: [{ left: `[[-5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[-6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
  ]);

  Y = -3;
  generateTests(`array segment mapping X and Y = ${Y}`, [
    {
      rules: [{ left: `[[0,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20, 10],
    },
    {
      rules: [{ left: `[[3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 30, 20],
    },
    {
      rules: [{ left: `[[4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50, 40, 30],
    },
    {
      rules: [{ left: `[[5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50, 40],
    },
    {
      rules: [{ left: `[[6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50],
    },
    {
      rules: [{ left: `[[7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[8,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-1,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [50, 40, 30],
    },
    {
      rules: [{ left: `[[-2,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [40, 30, 20],
    },
    {
      rules: [{ left: `[[-3,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [30, 20, 10],
    },
    {
      rules: [{ left: `[[-4,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [20, 10],
    },
    {
      rules: [{ left: `[[-5,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [10],
    },
    {
      rules: [{ left: `[[-6,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-7,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-8,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
    {
      rules: [{ left: `[[-10,${Y}]]`, right: '' }],
      left: [10, 20, 30, 40, 50],
      right: [],
    },
  ]);

  generateTests('should handle root target in mappings', [
    {
      name: 'should map array element to root object',
      bidirectional,
      rules: [{ left: 'users[0]', right: '' }],
      left: {
        users: [{ name: 'Tony', email: 'tony@example.com' }],
      },
      right: {
        name: 'Tony',
        email: 'tony@example.com',
      },
    },
    {
      name: 'should map root array to nest array element',
      bidirectional,
      rules: [{ left: '', right: 'users' }],
      left: [
        {
          name: 'Tony',
          email: 'tony@example.com',
        },
      ],
      right: {
        users: [
          {
            name: 'Tony',
            email: 'tony@example.com',
          },
        ],
      },
    },
    {
      name: 'should map array element with primitive to root',
      bidirectional,
      rules: [{ left: 'users[0].name', right: '' }],
      left: {
        users: [{ name: 'Tony' }],
      },
      right: 'Tony',
    },
  ]);

  generateTests('literal values in mapping', [
    {
      name: 'should handle literal values in mappings',
      rules: [
        { left: 'user.name', right: 'userName' },
        { left: 'user.active', literal: true },
        { literal: 'right default name', right: 'defaultName' },
        { left: 'user.count', literal: 42 },
      ],
      left: {
        user: {
          name: 'Alice',
          count: 10,
          defaultName: 'should be ignored',
          userName: 'should be ignored',
          active: false,
        },
        userName: 'should be ignored',
        defaultName: 'should be ignored',
        active: false,
        count: -3,
      },
      right: {
        userName: 'Alice',
        defaultName: 'right default name',
      },
    },
    {
      name: 'should handle literal values in mappings part two',
      rightToLeft,
      rules: [
        { left: 'user.name', right: 'userName' },
        { left: 'user.active', literal: true },
        { literal: 'right default name', right: 'defaultName' },
        { left: 'user.count', literal: 42 },
      ],
      left: {
        user: {
          name: 'Alice',
          count: 42,
          active: true,
        },
      },
      right: {
        userName: 'Alice',
        defaultName: 'right default name',
        user: {
          name: 'should be ignored',
          count: 10,
          active: false,
        },
      },
    },
  ]);

  generateTests('complex mapping', [
    {
      name: 'should map nested array slices for users, orders, and items',
      rules: [
        {
          left: 'users[[0]]{{id,name}}',
          right: 'users[[0]]',
        },
        {
          left: 'users[[0]].orders[[0,1]]',
          right: 'users[[0]].orders',
        },
        {
          left: 'users[[0]].orders[[0,1]].items[[0,3]]',
          right: 'users[[0]].orders[[0]].items',
        },
      ],
      left: {
        users: [
          {
            id: 1,
            name: 'John',
            orders: [
              {
                id: 101,
                date: '2023-01-15',
                items: [
                  { id: 1001, name: 'Item 1', price: 10.99 },
                  { id: 1002, name: 'Item 2', price: 20.99 },
                  { id: 1003, name: 'Item 3', price: 30.99 },
                  { id: 1004, name: 'Item 4', price: 40.99 },
                  { id: 1005, name: 'Item 5', price: 50.99 },
                ],
              },
              {
                id: 102,
                date: '2023-01-20',
                items: [
                  { id: 2001, name: 'Item A', price: 15.99 },
                  { id: 2002, name: 'Item B', price: 25.99 },
                  { id: 2003, name: 'Item C', price: 35.99 },
                ],
              },
              {
                id: 103,
                date: '2023-01-25',
                items: [
                  { id: 2501, name: 'Item D', price: 45.99 },
                  { id: 2502, name: 'Item E', price: 55.99 },
                ],
              },
            ],
          },
          {
            id: 2,
            name: 'Jane',
            orders: [
              {
                id: 201,
                date: '2023-02-05',
                items: [
                  { id: 3001, name: 'Item X1', price: 100.99 },
                  { id: 3002, name: 'Item X2', price: 200.99 },
                  { id: 3003, name: 'Item X3', price: 300.99 },
                  { id: 3004, name: 'Item X4', price: 400.99 },
                ],
              },
              {
                id: 202,
                date: '2023-02-10',
                items: [
                  { id: 4001, name: 'Item Y1', price: 150.99 },
                  { id: 4002, name: 'Item Y2', price: 250.99 },
                ],
              },
              {
                id: 203,
                date: '2023-02-15',
                items: [{ id: 5001, name: 'Item Z1', price: 350.99 }],
              },
            ],
          },
          {
            id: 3,
            name: 'Robert',
            orders: [
              {
                id: 301,
                date: '2023-03-05',
                items: [
                  { id: 6001, name: 'Item P1', price: 120.99 },
                  { id: 6002, name: 'Item P2', price: 220.99 },
                ],
              },
            ],
          },
          {
            id: 4,
            name: 'Emily',
            orders: [
              {
                id: 401,
                date: '2023-04-10',
                items: [
                  { id: 7001, name: 'Item Q1', price: 130.99 },
                  { id: 7002, name: 'Item Q2', price: 230.99 },
                ],
              },
            ],
          },
          {
            id: 5,
            name: 'Michael',
            orders: [],
          },
          {
            id: 6,
            name: 'Sarah',
            orders: [],
          },
        ],
      },
      right: {
        users: [
          {
            id: 1,
            name: 'John',
            orders: [
              {
                id: 101,
                date: '2023-01-15',
                items: [
                  { id: 1001, name: 'Item 1', price: 10.99 },
                  { id: 1002, name: 'Item 2', price: 20.99 },
                  { id: 1003, name: 'Item 3', price: 30.99 },
                ],
              },
            ],
          },
          {
            id: 2,
            name: 'Jane',
            orders: [
              {
                id: 201,
                date: '2023-02-05',
                items: [
                  { id: 3001, name: 'Item X1', price: 100.99 },
                  { id: 3002, name: 'Item X2', price: 200.99 },
                  { id: 3003, name: 'Item X3', price: 300.99 },
                ],
              },
            ],
          },
          {
            id: 3,
            name: 'Robert',
            orders: [
              {
                id: 301,
                date: '2023-03-05',
                items: [
                  { id: 6001, name: 'Item P1', price: 120.99 },
                  { id: 6002, name: 'Item P2', price: 220.99 },
                ],
              },
            ],
          },
          {
            id: 4,
            name: 'Emily',
            orders: [
              {
                id: 401,
                date: '2023-04-10',
                items: [
                  { id: 7001, name: 'Item Q1', price: 130.99 },
                  { id: 7002, name: 'Item Q2', price: 230.99 },
                ],
              },
            ],
          },
          {
            id: 5,
            name: 'Michael',
            orders: [],
          },
          {
            id: 6,
            name: 'Sarah',
            orders: [],
          },
        ],
      },
    },
  ]);

  // Tests to ensure transform function is properly applied
  generateTests('transform function tests', [
    {
      name: 'should apply transform function to value',
      bidirectional,
      rules: [
        {
          left: 'user.age',
          right: 'userAge',
          transform: {
            toLeft: (value: string): number => parseInt(value, 10),
            toRight: (value: number): string => `${value}`,
          },
        },
        {
          left: 'user.name',
          right: 'userName',
          transform: {
            toLeft: (value: string): string => value.toLowerCase(),
            toRight: (value: string): string => value.toUpperCase(),
          },
        },
        {
          left: 'user.active',
          right: 'isInActive',
          transform: {
            toLeft: (value: boolean): boolean => !value,
            toRight: (value: boolean) => !value, // Invert boolean
          },
        },
      ],
      left: {
        user: {
          age: 25,
          name: 'john doe',
          active: true,
        },
      },
      right: {
        userAge: '25', // Transformed: 25 * 2
        userName: 'JOHN DOE', // Transformed to uppercase
        isInActive: false, // Inverted boolean
      },
    },
    {
      name: 'should apply transform to array values',
      bidirectional,
      rules: [
        {
          left: 'scores',
          right: 'doubledScores',
          transform: {
            toLeft: (values: number[]): number[] =>
              values.map((value) => value / 2),
            toRight: (values: number[]): number[] =>
              values.map((value) => value * 2),
          },
        },
      ],
      left: {
        scores: [10, 20, 30, 40, 50],
      },
      right: {
        doubledScores: [20, 40, 60, 80, 100], // Each value doubled
      },
    },
    {
      name: 'should apply transform before format',
      rules: [
        {
          left: 'data.date',
          right: 'formattedDate',
          format: {
            type: MappingRuleFormatType.TIMESTAMP,
            toLeft: TimestampFormats.ISO8601,
            toRight: TimestampFormats.HTTP,
          },
        },
      ],
      left: {
        data: {
          date: '2020-05-16T14:34:07.000Z', // Original date that should be ignored due to transform
        },
      },
      right: {
        formattedDate: 'Sat, 16 May 2020 14:34:07 GMT', // The transformed date after formatting
      },
    },
    {
      name: 'should handle bidirectional transforms correctly',
      bidirectional, // Test both directions
      rules: [
        {
          left: 'sourceValue',
          right: 'targetValue',
          transform: {
            toLeft: (value: string): string => value.toLowerCase(),
            toRight: (value: string): string => value.toUpperCase(),
          },
        },
      ],
      left: {
        sourceValue: 'original value',
      },
      right: {
        targetValue: 'ORIGINAL VALUE', // Uppercase transform applied
      },
    },
  ]);

  generateTests('overrideValues in mapping', [
    {
      name: 'should override mapped values with overrideValues (left-to-right)',
      rules: [
        { left: 'user.firstName', right: 'givenName' },
        { left: 'user.lastName', right: 'familyName' },
        { left: 'user.age', right: 'age' },
      ],
      left: {
        user: {
          firstName: 'John',
          lastName: 'Doe',
          age: 30,
        },
      },
      leftOverride: {
        givenName: 'Jane',
        age: 25,
      },
      right: {
        givenName: 'Jane',
        familyName: 'Doe',
        age: 25,
      },
    },
    {
      name: 'should override mapped values with overrideValues (right-to-left)',
      rightToLeft: true,
      rules: [
        { left: 'user.firstName', right: 'givenName' },
        { left: 'user.lastName', right: 'familyName' },
        { left: 'user.age', right: 'age' },
      ],
      right: {
        givenName: 'John',
        familyName: 'Doe',
        age: 30,
      },
      rightOverride: {
        user: {
          firstName: 'Jane',
          age: 25,
        },
      },
      left: {
        user: {
          firstName: 'Jane',
          lastName: 'Doe',
          age: 25,
        },
      },
    },
    {
      name: 'should override nested fields with overrideValues',
      rules: [
        { left: 'user.contact.email', right: 'profile.emailAddress' },
        { left: 'user.contact.phone', right: 'profile.phoneNumber' },
        { left: 'user.address.street', right: 'location.streetAddress' },
        { left: 'user.address.city', right: 'location.city' },
      ],
      left: {
        user: {
          contact: {
            email: 'john@example.com',
            phone: '555-1234',
          },
          address: {
            street: '123 Main St',
            city: 'Anytown',
          },
        },
      },
      leftOverride: {
        profile: {
          emailAddress: 'jane@example.com',
        },
        location: {
          city: 'New City',
        },
      },
      right: {
        profile: {
          emailAddress: 'jane@example.com',
          phoneNumber: '555-1234',
        },
        location: {
          streetAddress: '123 Main St',
          city: 'New City',
        },
      },
    },
    {
      name: 'should override array elements with overrideValues',
      rules: [
        { left: 'users[0].name', right: 'firstUser' },
        { left: 'users[1].email', right: 'secondUserEmail' },
        { left: 'users[-1].name', right: 'lastUser' },
      ],
      left: {
        users: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' },
          { name: 'Charlie', email: 'charlie@example.com' },
        ],
      },
      leftOverride: {
        firstUser: 'Alicia',
        lastUser: 'Charles',
      },
      right: {
        firstUser: 'Alicia',
        lastUser: 'Charles',
        secondUserEmail: 'bob@example.com',
      },
    },
    {
      name: 'should prioritize overrideValues over literals',
      rules: [
        { left: 'user.name', right: 'userName' },
        { left: 'user.active', literal: true },
        { literal: 'default name', right: 'defaultName' },
      ],
      left: {
        user: {
          name: 'Alice',
          active: false,
        },
      },
      leftOverride: {
        userName: 'Alicia',
        defaultName: 'custom name',
      },
      right: {
        userName: 'Alicia',
        defaultName: 'custom name',
      },
    },
    {
      name: 'should handle overrideValues with array segments',
      rules: [{ left: '[[0,2]]', right: 'firstTwo' }],
      left: [10, 20, 30, 40, 50],
      leftOverride: {
        firstTwo: [100, 200],
      },
      right: {
        firstTwo: [100, 200],
      },
    },
    {
      name: 'should ignore overrideValues that do not correspond to target paths',
      rules: [
        { left: 'user.firstName', right: 'givenName' },
        { left: 'user.lastName', right: 'familyName' },
      ],
      left: {
        user: {
          firstName: 'John',
          lastName: 'Doe',
        },
      },
      leftOverride: {
        givenName: 'Jane',
        unused: 'This should be ignored',
        nonexistent: {
          path: 'This should also be ignored',
        },
      },
      right: {
        givenName: 'Jane',
        familyName: 'Doe',
      },
    },
    {
      name: 'should apply overrideValues with rule order ASC (order matters)',
      rules: [
        // First rule creates the user object
        { left: 'profiles[0].name', right: 'user.name' },
        // Second rule adds another property to the same user object
        { left: 'profiles[0].role', right: 'user.role' },
      ],
      left: {
        profiles: [{ name: 'John', role: 'Developer' }],
      },
      // This override tests ASC order where first we map name, then role, then apply overrides
      leftOverride: {
        user: {
          name: 'Jane',
        },
      },
      right: {
        user: {
          name: 'Jane', // From override
          role: 'Developer', // From mapping
        },
      },
    },
  ]);

  generateTests('rule order with MappingPlanRuleOrder', [
    {
      name: 'should demonstrate ASC rule order (last rule wins)',
      rules: [
        // Both rules target the same field, order matters!
        { left: 'sourceField1', right: 'targetField' },
        { left: 'sourceField2', right: 'targetField' },
      ],
      left: {
        sourceField1: 'first value',
        sourceField2: 'second value',
      },
      right: {
        // With ASC order, sourceField2 overwrites sourceField1
        targetField: 'second value',
      },
    },
    {
      name: 'should demonstrate DESC rule order (first rule wins)',
      plan: {
        order: {
          toLeft: MappingPlanRuleOrder.DESC,
          toRight: MappingPlanRuleOrder.DESC,
        },
      },
      rules: [
        // Both rules target the same field, order matters!
        { left: 'sourceField1', right: 'targetField' },
        { left: 'sourceField2', right: 'targetField' },
      ],
      left: {
        sourceField1: 'first value',
        sourceField2: 'second value',
      },
      right: {
        // With DESC order, rules are reversed, so sourceField1 overwrites sourceField2
        targetField: 'first value',
      },
    },
    {
      name: 'should handle rule order with overrideValues (overrides always win)',
      plan: {
        order: {
          toLeft: MappingPlanRuleOrder.DESC,
          toRight: MappingPlanRuleOrder.DESC,
        },
      },
      rules: [
        // Both rules target the same field, order matters!
        { left: 'sourceField1', right: 'targetField' },
        { left: 'sourceField2', right: 'targetField' },
      ],
      left: {
        sourceField1: 'first value',
        sourceField2: 'second value',
      },
      leftOverride: {
        targetField: 'override value',
      },
      right: {
        // Regardless of rule order, overrides always win
        targetField: 'override value',
      },
    },
  ]);
});
