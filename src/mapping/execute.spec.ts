import { describe, expect, it } from 'vitest';
import { compile, map, MAP_DIRECTION, MappingRuleParams } from './index.js';
import { JSONType } from './types.js';

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
      let name = test.name;

      if (!name) {
        name = JSON.stringify(test.rules[0])
          .replace(/"([^"]+)":/g, ' $1:')
          .replace(/}$/, ' }');
      }
      name = `Array Segment test: ${name}`;

      const plan = compile(test.rules);

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
    {
      name: 'should map array length to primitive root',
      rules: [{ left: 'users.length', right: '' }],
      left: {
        users: [{ name: 'Tony' }, { name: 'Suzanne' }],
      },
      right: 2,
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

  generateTests('complex mapping', []);
});
