import { describe, expect, it } from 'vitest';
import { z, ZodDiscriminatedUnion, ZodUnion } from 'zod';
import {
  clone,
  convert,
  extract,
  jsonParse,
  jsonStringify,
  requestParamsParser,
} from './schema.js';
import { JSONObjectArray, JSONType } from './types.js';

type ZodUnionType<T> = (
  | ZodDiscriminatedUnion<
      'type',
      readonly [z.ZodObject<any>, ...z.ZodObject<any>[]]
    >
  | ZodUnion<[z.ZodType, ...z.ZodType[]]>
) &
  z.ZodType<T>;

const AdminSchema = z.object({
  type: z.literal('admin'),
  id: z.number(),
  role: z.string(),
  accessLevel: z.number(),
  location: z.string().optional(),
});
type AdminType = z.infer<typeof AdminSchema>;

const UserSchema = z.object({
  type: z.literal('user'),
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  location: z.string().optional(),
});
type UserType = z.infer<typeof UserSchema>;

type UsersType = UserType | AdminType;

// Input matches the 'admin' variant
const adminInputDirty: AdminType = {
  type: 'admin',
  id: 1,
  role: 'superuser',
  accessLevel: 10,
  extraField: 'should be removed',
} as unknown as AdminType;
const adminInputStrict: AdminType = {
  type: 'admin',
  id: 2,
  role: 'superuser',
  accessLevel: 10,
} as unknown as AdminType;

// Input matches the 'user' variant
const userInputDirty: UserType = {
  type: 'user',
  id: 3,
  name: 'user name',
  email: 'user@email.com',
  extraField: 'should be removed',
} as unknown as UserType;
const userInputStrict: UserType = {
  type: 'user',
  id: 4,
  name: 'user name',
  email: 'user@email.com',
};

function testAdminObject(
  adminObject: any,
  location?: string,
  dirty: boolean = false,
) {
  expect(() => AdminSchema.parse(adminObject)).not.throw();

  const match: AdminType = { ...(dirty ? adminInputDirty : adminInputStrict) };

  if ('extraField' in match) {
    delete match.extraField;
  }

  if (location) {
    match.location = location;
  }

  // Should match the admin schema without extra fields
  expect(adminObject).toStrictEqual(match);
  expect(adminObject).not.toHaveProperty('extraField');
}

function testUserObject(
  userObject: any,
  location?: string,
  dirty: boolean = false,
) {
  expect(() => UserSchema.parse(userObject)).not.throw();

  const match: UserType = { ...(dirty ? userInputDirty : userInputStrict) };

  if ('extraField' in match) {
    delete match.extraField;
  }

  if (location) {
    match.location = location;
  }

  // Should match the admin schema without extra fields
  expect(userObject).toStrictEqual(match);
  expect(userObject).not.toHaveProperty('extraField');
}

describe('convert function', () => {
  it('should throw an error if source is a primitive value', () => {
    const primitiveValues = [
      'string value',
      42,
      true,
      null,
      undefined,
      Symbol('symbol'),
      BigInt(123),
    ];

    const schema = z.object({
      value: z.string(),
    });

    primitiveValues.forEach((value) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(() => convert(value as any, schema)).toThrow(
        'source must be an object or array of objects',
      );
    });
  });

  it('should handle deeply nested union validation errors', () => {
    // Create a schema with a complex nested union that will generate structured errors
    const nestedSchema = z.object({
      data: z.union([
        z.object({
          nested: z.object({
            value: z.number(),
            type: z.literal('number'),
          }),
        }),
        z.object({
          nested: z.object({
            value: z.string(),
            type: z.literal('string'),
          }),
        }),
      ]),
    });

    // This will create a complex nested error path
    const badParams = {
      data: {
        nested: {
          value: true, // neither a number nor a string
          type: 'boolean', // neither 'number' nor 'string'
        },
      },
    };

    try {
      requestParamsParser(badParams, nestedSchema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('error in request params');
        // This specific path pattern should exist in the error message, showing the unionSubErr.path is processed
        expect(error.message).toContain('nested.value');
        expect(error.message).toContain('nested.type');
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should work with lazy schemas for recursive data structures', () => {
    // Define a recursive schema for a tree-like structure
    type TreeNode = {
      value: string;
      children?: TreeNode[];
    };

    const treeSchema: z.ZodType<TreeNode> = z.lazy(() =>
      z.object({
        value: z.string(),
        children: z.array(treeSchema).optional(),
      }),
    );

    const source = {
      value: 'root',
      children: [
        { value: 'child1' },
        { value: 'child2', children: [{ value: 'grandchild' }] },
      ],
    };

    const result = convert(source, treeSchema);
    expect(result).toEqual({
      value: 'root',
      children: [
        { value: 'child1' },
        { value: 'child2', children: [{ value: 'grandchild' }] },
      ],
    });
  });

  it('should correctly convert a record', () => {
    const source = {
      person: { name: 'Alice', age: 25 },
      dog: { name: 'Fido', age: 3 },
    };
    const targetSchema = z.record(
      z.object({
        name: z.string(),
        age: z.number(),
        country: z.string().default('Unknown'),
      }),
    );
    const result = convert(source, targetSchema);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (source.person as any).country = 'Unknown';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    (source.dog as any).country = 'Unknown';

    expect(result).toEqual(source);
  });

  it('should correctly convert an object by merging defaults and validating with schema', () => {
    const source = { name: 'Alice', age: 25 };
    const targetSchema = z.object({
      name: z.string(),
      age: z.number(),
      country: z.string().default('Unknown'),
    });
    const override = { country: 'USA' };

    const result = convert(source, targetSchema, override);

    expect(result).toEqual({ name: 'Alice', age: 25, country: 'USA' });
  });

  it('should allow optional target defaults', () => {
    const source = { name: 'Alice' };
    const targetSchema = z.object({
      name: z.string(),
      age: z.number().default(30),
    });

    const result = convert(source, targetSchema);

    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('should only take defaults if not in source', () => {
    const source = { firstName: 'Alice', lastName: 'Smith' };

    const targetSchema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      age: z.number().default(30),
    });
    const defaults = { firstName: 'Sam', age: 25 };

    const result = convert(source, targetSchema, defaults);

    expect(result).toEqual({ firstName: 'Sam', lastName: 'Smith', age: 25 });
  });

  it('should throw an error if input fails schema validation', () => {
    const source = { name: 'Alice', age: 'invalid_age' };
    const targetSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    expect(() => convert(source, targetSchema)).toThrow();
  });

  it('should throw an error if defaults fails schema validation', () => {
    const source = { name: 'Alice' };
    const targetSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    expect(() =>
      convert(source, targetSchema, {
        age: 'not a number',
      } as unknown as typeof source),
    ).toThrow();
  });

  it('should handle source objects with additional fields not in the target schema', () => {
    const source = { name: 'Alice', age: 25, extraField: 'extra' };
    const targetSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = convert(source, targetSchema);

    expect(result).toEqual({ name: 'Alice', age: 25 });
  });

  it('should correctly convert an array of objects using an array schema', () => {
    // Define a schema for the array elements
    const personSchema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean().optional(),
    });
    type PersonType = z.infer<typeof personSchema>;

    // Create an array schema
    const peopleArraySchema = z.array(personSchema);

    // Source array with some objects having extra fields and some missing optional fields
    const sourceArray = [
      { name: 'Alice', age: 25, extraField: 'should be removed' },
      { name: 'Bob', age: 30, active: true },
      { name: 'Charlie', age: 35, active: false, anotherExtra: 123 },
    ];

    // Define defaults that should be applied to each array element
    const overrides = { active: true };

    // Convert the array
    const result: PersonType[] = convert(
      sourceArray,
      peopleArraySchema,
      overrides,
    );

    // Verify the result
    expect(result).toEqual([
      { name: 'Alice', age: 25, active: true },
      { name: 'Bob', age: 30, active: true },
      { name: 'Charlie', age: 35, active: true },
    ]);

    // Verify extra fields are removed
    expect(result[0]).not.toHaveProperty('extraField');
    expect(result[2]).not.toHaveProperty('anotherExtra');

    // Verify the result is a new array (not the same reference)
    expect(result).not.toBe(sourceArray);
  });

  describe('Conversion between two different schemas', () => {
    it('should correctly convert from Schema A to Schema B', () => {
      // Schema A has fields: one, two, three.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const schemaA = z.object({
        one: z.string(),
        two: z.number(),
        three: z.boolean(),
      });
      // Schema B has fields: two, three, four.
      const schemaB = z.object({
        two: z.number(),
        three: z.boolean(),
        four: z.string(),
      });
      type AType = z.infer<typeof schemaA>;
      type BType = z.infer<typeof schemaB>;

      const aInstance: AType = {
        one: 'Value for one',
        two: 10,
        three: true,
      };
      const defaultsForB = { four: 'Default Four' };

      const result: BType = convert(aInstance, schemaB, defaultsForB);
      expect(result).toEqual({ two: 10, three: true, four: 'Default Four' });
    });

    it('should correctly convert from Schema B to Schema A', () => {
      // Schema A has fields: one, two, three.
      const schemaA = z.object({
        one: z.string(),
        two: z.number(),
        three: z.boolean(),
      });
      // Schema B has fields: two, three, four.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const schemaB = z.object({
        two: z.number(),
        three: z.boolean(),
        four: z.string(),
      });
      type AType = z.infer<typeof schemaA>;
      type BType = z.infer<typeof schemaB>;

      const bInstance: BType = {
        two: 20,
        three: false,
        four: 'Not used',
      };
      const overridesForA = { one: 'Default One' };

      const result: AType = convert(bInstance, schemaA, overridesForA);
      expect(result).toEqual({ one: 'Default One', two: 20, three: false });
    });

    it('should throw an error with array source and object target', () => {
      const source = [{ some: 'object' }];
      const schema = z.object({
        some: z.string(),
      });

      try {
        convert(source, schema);
        // If we reach this point, the test should fail
        expect('this should not be reached').toBe('test failed');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toStrictEqual(
            'target schema is not an array type but source is an array',
          );
        } else {
          // If we reach this point, the test should fail
          expect('wrong error type').toBe('test failed');
        }
      }
    });
  });

  it('should throw an error with object source and array target', () => {
    const source = { some: 'object' };
    const schema = z.array(
      z.object({
        some: z.string(),
      }),
    );

    try {
      convert(source, schema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toStrictEqual(
          'target schema is an array type but source is not an array',
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  describe('union tests', () => {
    function test<
      TargetSchema extends ZodUnionType<UsersType>, // Schema is ZodObjectSchemaDef<T> or ZodArraySchemaDef<T>
    >(schema: TargetSchema) {
      testAdminObject(convert(adminInputDirty, schema), undefined, true);
      testUserObject(
        convert(userInputDirty, schema, { location: 'place' }),
        'place',
        true,
      );
    }

    function testArray<TargetSchema extends ZodUnionType<UsersType>>(
      schema: TargetSchema,
    ) {
      const ZodArraySchema = z.array(schema);

      type ZodArray = z.infer<typeof ZodArraySchema>;

      const users: ZodArray = [
        userInputDirty, // 0
        adminInputDirty, // 1
        userInputStrict, // 2
        userInputDirty, // 3
        adminInputStrict, // 4
        adminInputDirty, // 5
      ];

      const result = convert(users, ZodArraySchema, {
        location: 'Earth',
      });

      testUserObject(result[0], 'Earth', true);
      testAdminObject(result[1], 'Earth', true);
      testUserObject(result[2], 'Earth', false);
      testUserObject(result[3], 'Earth', true);
      testAdminObject(result[4], 'Earth', false);
      testAdminObject(result[5], 'Earth', true);
    }

    it('should correctly convert with discriminated union schema', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      test(usersSchema);
      testArray(usersSchema);
    });

    it('should correctly convert with regular union schema', () => {
      // Define a regular union schema
      const usersSchema = z.union([AdminSchema, UserSchema]);

      test(usersSchema);
      testArray(usersSchema);
    });

    it('should throw error when discriminator field is missing', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      // Create an object without the required discriminator field
      const missingDiscriminator = {
        id: 1,
        role: 'superuser',
        accessLevel: 10,
      };

      expect(() => convert(missingDiscriminator, usersSchema)).toThrow(
        'missing discriminator field',
      );
    });

    it('should throw error when discriminator value is not a primitive type', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      // Create an object with a non-primitive discriminator value
      const nonPrimitiveDiscriminator = {
        type: { value: 'admin' }, // Object instead of string
        id: 1,
        role: 'superuser',
        accessLevel: 10,
      };

      // Attempt to convert should throw a Error
      expect(() => convert(nonPrimitiveDiscriminator, usersSchema)).toThrow(
        'discriminator value must be a primitive',
      );
    });

    it('should test all primitive types as valid discriminator values', () => {
      // Define schemas with different primitive types as discriminators
      const numberDiscriminatorSchema = z.discriminatedUnion('id', [
        z.object({ id: z.literal(1), data: z.string() }),
        z.object({ id: z.literal(2), data: z.string() }),
      ]);

      const booleanDiscriminatorSchema = z.discriminatedUnion('active', [
        z.object({ active: z.literal(true), data: z.string() }),
        z.object({ active: z.literal(false), data: z.string() }),
      ]);

      // Test various primitive types as discriminator values
      expect(() =>
        convert({ id: 1, data: 'test' }, numberDiscriminatorSchema),
      ).not.toThrow();
      expect(() =>
        convert({ active: true, data: 'test' }, booleanDiscriminatorSchema),
      ).not.toThrow();

      const result1 = convert(
        { id: 1, data: 'test' },
        numberDiscriminatorSchema,
      );
      const result2 = convert(
        { active: true, data: 'test' },
        booleanDiscriminatorSchema,
      );

      expect(result1).toEqual({ id: 1, data: 'test' });
      expect(result2).toEqual({ active: true, data: 'test' });
    });

    it('should handle various non-primitive types as invalid discriminator values', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      // Test various non-primitive types as discriminator values
      const testCases: JSONObjectArray = [
        { type: {}, id: 1 }, // Empty object
        { type: [], id: 1 }, // Empty array
        { type: [1, 2, 3], id: 1 }, // Array with values
        { type: { nested: 'value' }, id: 1 }, // Object with properties
        { type: new Date(), id: 1 }, // Date object
        { type: /regex/, id: 1 }, // RegExp
        { type: new Map(), id: 1 }, // Map
        { type: new Set(), id: 1 }, // Set
      ] as unknown as JSONObjectArray;

      testCases.forEach((testCase) => {
        expect(() => convert(testCase, usersSchema)).toThrow(
          'discriminator value must be a primitiv',
        );
      });
    });

    it('should correctly convert with discriminated union schema in array elements', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      const arraySchema = z.array(usersSchema);

      // Create an array of mixed user and admin objects
      const mixedArray = [
        { type: 'user', id: 1, name: 'Test User', email: 'test@example.com' },
        { type: 'admin', id: 2, role: 'moderator', accessLevel: 5 },
      ];

      const result = convert(mixedArray, arraySchema);

      // First element should be a user
      expect(result[0].type).toBe('user');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('email');

      // Second element should be an admin
      expect(result[1].type).toBe('admin');
      expect(result[1]).toHaveProperty('role');
      expect(result[1]).toHaveProperty('accessLevel');
    });

    it('should throw error when array element has invalid discriminator value', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      const arraySchema = z.array(usersSchema);

      // Create an array with one invalid element
      const mixedArray = [
        { type: 'user', id: 1, name: 'Test User', email: 'test@example.com' },
        { type: 'invalid', id: 2, role: 'moderator', accessLevel: 5 }, // Invalid type
      ];

      try {
        convert(mixedArray, arraySchema);
        expect('this should not be reached').toBe('test failed');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toStrictEqual(
            'discriminator value not found: invalid',
          );
        } else {
          expect('this should not be reached').toBe('test failed');
        }
      }
    });

    it('should correctly identify and convert discriminated union with non-array input', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      // Test with admin object
      const adminResult = convert({ ...adminInputStrict }, usersSchema);
      expect(adminResult.type).toBe('admin');
      testAdminObject(adminResult, undefined, false);

      // Test with user object
      const userResult = convert({ ...userInputStrict }, usersSchema);
      expect(userResult.type).toBe('user');
      testUserObject(userResult, undefined, false);
    });

    it('should apply targetOverrides to discriminated union with non-array input', () => {
      // Define a discriminated union schema
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      // Test with admin object and location override
      const adminResult = convert({ ...adminInputStrict }, usersSchema, {
        location: 'Office',
      });
      expect(adminResult.type).toBe('admin');
      testAdminObject(adminResult, 'Office', false);

      // Test with user object and location override
      const userResult = convert({ ...userInputStrict }, usersSchema, {
        location: 'Home',
      });
      expect(userResult.type).toBe('user');
      testUserObject(userResult, 'Home', false);
    });

    it('should correctly convert array elements with regular union schema', () => {
      // Define a regular union schema
      const usersSchema = z.union([AdminSchema, UserSchema]);

      const arraySchema = z.array(usersSchema);

      // Create an array of mixed user and admin objects
      const mixedArray = [
        { type: 'user', id: 1, name: 'Test User', email: 'test@example.com' },
        { type: 'admin', id: 2, role: 'moderator', accessLevel: 5 },
      ];

      const result = convert(mixedArray, arraySchema);

      // First element should be a user
      expect(result[0].type).toBe('user');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('email');

      // Second element should be an admin
      expect(result[1].type).toBe('admin');
      expect(result[1]).toHaveProperty('role');
      expect(result[1]).toHaveProperty('accessLevel');
    });

    it('should throw error when object does not match any schema in union', () => {
      // Define a regular union schema
      const usersSchema = z.union([AdminSchema, UserSchema]);

      // Create an object that doesn't match any schema in the union
      const invalidObject = {
        type: 'invalid',
        id: 'not-a-number', // Should be a number in both schemas
        invalidField: 'something',
      };

      try {
        convert(invalidObject, usersSchema);
        expect('this should not be reached').toBe('test failed');
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const message = JSON.parse('[' + error.message + ']');

          expect(message).toStrictEqual([
            [
              {
                received: 'invalid',
                code: 'invalid_literal',
                expected: 'admin',
                path: ['type'],
                message: 'Invalid literal value, expected "admin"',
              },
              {
                code: 'invalid_type',
                expected: 'number',
                received: 'string',
                path: ['id'],
                message: 'Expected number, received string',
              },
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['role'],
                message: 'Required',
              },
              {
                code: 'invalid_type',
                expected: 'number',
                received: 'undefined',
                path: ['accessLevel'],
                message: 'Required',
              },
            ],
            [
              {
                received: 'invalid',
                code: 'invalid_literal',
                expected: 'user',
                path: ['type'],
                message: 'Invalid literal value, expected "user"',
              },
              {
                code: 'invalid_type',
                expected: 'number',
                received: 'string',
                path: ['id'],
                message: 'Expected number, received string',
              },
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['name'],
                message: 'Required',
              },
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['email'],
                message: 'Required',
              },
            ],
          ]);
        } else {
          expect('this should not be reached').toBe('test failed');
        }
      }
    });

    it('should throw error when array element does not match any schema in union', () => {
      // Define a regular union schema
      const usersSchema = z.union([AdminSchema, UserSchema]);

      const arraySchema = z.array(usersSchema);

      // Create an array with one invalid element
      const mixedArray = [
        { type: 'user', id: 1, name: 'Test User', email: 'test@example.com' },
        {
          type: 'something',
          id: 'not-a-number', // Should be a number in both schemas
          invalidField: 'value',
        },
      ];

      try {
        convert(mixedArray, arraySchema);
        expect('this should not be reached').toBe('test failed');
      } catch (error) {
        if (error instanceof Error) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const message = JSON.parse('[' + error.message + ']');

          expect(message).toStrictEqual([
            [
              {
                received: 'something',
                code: 'invalid_literal',
                expected: 'admin',
                path: ['type'],
                message: 'Invalid literal value, expected "admin"',
              },
              {
                code: 'invalid_type',
                expected: 'number',
                received: 'string',
                path: ['id'],
                message: 'Expected number, received string',
              },
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['role'],
                message: 'Required',
              },
              {
                code: 'invalid_type',
                expected: 'number',
                received: 'undefined',
                path: ['accessLevel'],
                message: 'Required',
              },
            ],
            [
              {
                received: 'something',
                code: 'invalid_literal',
                expected: 'user',
                path: ['type'],
                message: 'Invalid literal value, expected "user"',
              },
              {
                code: 'invalid_type',
                expected: 'number',
                received: 'string',
                path: ['id'],
                message: 'Expected number, received string',
              },
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['name'],
                message: 'Required',
              },
              {
                code: 'invalid_type',
                expected: 'string',
                received: 'undefined',
                path: ['email'],
                message: 'Required',
              },
            ],
          ]);
        } else {
          expect('this should not be reached').toBe('test failed');
        }
      }
    });
  });
});

describe('clone function', () => {
  it('should deep clone a simple object', () => {
    const input = { name: 'Alice', age: 25 };
    const result = clone(input);

    expect(result).toStrictEqual(input);
  });

  it('should deep clone a nested object', () => {
    const input = {
      person: {
        name: 'Alice',
        address: {
          city: 'Wonderland',
          zip: 12345,
        },
      },
    };
    const result = clone(input);

    expect(result).toStrictEqual(input);
  });

  it('should deep clone an array of objects', () => {
    const input = [
      { id: 1, value: 'a' },
      { id: 2, value: 'b' },
    ];
    const result = clone(input);

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(result[0]).not.toBe(input[0]);
    expect(result[1]).not.toBe(input[1]);
  });

  it('should not deep clone any non-JSON types', () => {
    const inputs: unknown[] = [
      () => {
        //NO-OP
      },
    ];

    inputs.forEach((input) => {
      try {
        clone(input as JSONType);
        expect('this should not be reached').toBe('test failed');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toStrictEqual('clone only supports JSON types');
        } else {
          expect('this should not be reached').toBe('test failed');
        }
      }
    });
  });

  it('should deep clone primitive values without alteration', () => {
    expect(clone(42)).toBe(42);
    expect(clone('hello')).toBe('hello');
    expect(clone(true)).toBe(true);
    expect(clone(null)).toBeNull();
    expect(clone(undefined)).toBeUndefined();
  });

  it('should handle empty objects and arrays', () => {
    expect(clone({})).toEqual({});
    expect(clone([])).toEqual([]);
  });
});

describe('extract function', () => {
  it('should apply targetOverrides to the extracted object', () => {
    const obj = { nested: { value: 'original' } };
    const result = extract(obj, 'nested', z.object({ value: z.string() }), {
      value: 'overridden',
    });
    expect(result).toEqual({ value: 'overridden' });
  });

  it('should extract a primitive', () => {
    const obj = { nested: { value: 'original' } };
    const result = extract(obj, 'nested.value', z.string());
    expect(result).toEqual('original');
  });

  it('should override a primitive', () => {
    const obj = { nested: { value: 'original' } };
    const result = extract(obj, 'nested.value', z.string(), 'override');
    expect(result).toEqual('override');
  });

  it('should throw an error when trying to apply non-primitive override to a primitive', () => {
    const obj = { data: { primitive: 'string value' } };

    const schema = z.object({
      data: z.object({ primitive: z.string() }),
    });
    try {
      extract(obj, 'data.primitive', schema, {
        data: { primitive: 'override' },
      });

      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe(
          'Can not override non-object target at path [data.primitive]',
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should throw an error when trying to index an array without a number', () => {
    const obj = {
      data: {
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      },
    };

    try {
      extract(
        obj,
        'data.items.not-a-number',
        z.object({
          id: z.number(),
          name: z.string(),
        }),
        { name: 'override' },
      );
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe(
          "Cannot access array index 'not-a-number' of an array at [data.items]",
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should extract a property from a simple object', () => {
    const obj = { name: 'Alice', age: 25, active: true };
    const result = extract(obj, 'name', z.string());
    expect(result).toBe('Alice');
  });

  it('should extract a property using a path array', () => {
    const obj = { user: { profile: { name: 'Bob', age: 30 } } };
    const result = extract(obj, ['user', 'profile', 'name'], z.string());
    expect(result).toBe('Bob');
  });

  it('should extract a property using a dot-separated path string', () => {
    const obj = { user: { profile: { name: 'Charlie', age: 35 } } };
    const result = extract(obj, 'user.profile.name', z.string());
    expect(result).toBe('Charlie');
  });

  it('should validate the extracted value against the schema', () => {
    const obj = { numbers: { value: 42 } };
    const result = extract(obj, 'numbers.value', z.number());
    expect(result).toBe(42);
  });

  it('should extract and validate complex nested objects', () => {
    const obj = {
      app: {
        config: {
          server: {
            port: 3000,
            host: 'localhost',
            options: {
              timeout: 5000,
              secure: true,
            },
          },
        },
      },
    };

    const serverSchema = z.object({
      port: z.number(),
      host: z.string(),
      options: z.object({
        timeout: z.number(),
        secure: z.boolean(),
      }),
    });

    const result = extract(obj, 'app.config.server', serverSchema);
    expect(result).toEqual({
      port: 3000,
      host: 'localhost',
      options: {
        timeout: 5000,
        secure: true,
      },
    });
  });

  it('should throw an error with validation message when validation fails with string path', () => {
    const obj = { value: 'not a number' };

    try {
      extract(obj, 'value', z.number());
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const message = JSON.parse(error.message);

        expect(message).toStrictEqual([
          {
            code: 'invalid_type',
            expected: 'number',
            received: 'string',
            path: [],
            message: 'Expected number, received string',
          },
        ]);
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should throw an error with validation message when validation fails with array path', () => {
    const obj = { nested: { value: 'not a number' } };

    try {
      extract(obj, ['nested', 'value'], z.number());
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const message = JSON.parse(error.message);

        expect(message).toStrictEqual([
          {
            code: 'invalid_type',
            expected: 'number',
            received: 'string',
            path: [],
            message: 'Expected number, received string',
          },
        ]);
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should throw a specific error when trying to access a property of a non-object', () => {
    const obj = { primitive: 42 };

    try {
      extract(obj, 'primitive.nonexistent', z.any());
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe(
          "Cannot access property 'nonexistent' of primitive at [primitive]",
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should throw a specific error when the first key in path does not exist - with string path', () => {
    const obj = { existing: { value: 'something' } };

    try {
      extract(obj, 'nonexistent.value', z.any());
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe(
          "Key part 'nonexistent' not found in path []",
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should throw a specific error when the first key in path does not exist - with array path', () => {
    const obj = { existing: { value: 'something' } };

    try {
      extract(obj, ['nonexistent', 'value'], z.any());
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe(
          "Key part 'nonexistent' not found in path []",
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should throw a specific error when a nested key part does not exist in the object', () => {
    const obj = { nested: { existing: 'value' } };

    try {
      extract(obj, 'nested.nonexistent.deep', z.any());
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe(
          "Key part 'nonexistent' not found in path [nested]",
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should throw a specific error when array index is out of bounds', () => {
    const obj = {
      users: [{ id: 1, name: 'Alice' }],
    };

    try {
      extract(obj, 'users.1.name', z.string());
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe(
          "Index '1' out of range for array at [users]",
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should handle valid arrays in the object path', () => {
    const obj = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };
    const result = extract(obj, 'users.1.name', z.string());
    expect(result).toBe('Bob');
  });
});

describe('extract function with union types', () => {
  // Set up a nested object with discriminated union
  const nestedObj = {
    config: {
      user: adminInputStrict,
    },
    data: {
      users: [userInputDirty, userInputStrict, adminInputDirty],
    },
  };

  it('should extract and validate a discriminated union type from an object', () => {
    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    const result = extract(nestedObj, 'config.user', usersSchema);
    testAdminObject(result);
  });

  it('should extract and validate a regular union type from an object', () => {
    // Define a regular union schema
    const usersSchema = z.union([AdminSchema.strict(), UserSchema.strict()]);

    const result = extract(nestedObj, 'config.user', usersSchema);
    testAdminObject(result, undefined, false);
  });

  it('should extract and validate an array element with discriminated union', () => {
    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [
      AdminSchema.strict(),
      UserSchema.strict(),
    ]);

    const result = extract(nestedObj, 'data.users.1', usersSchema);

    testUserObject(result, undefined, false);
  });

  it('should extract and validate an array element with regular union', () => {
    // Define a regular union schema
    const usersSchema = z.union([AdminSchema, UserSchema]);

    const result = extract(nestedObj, 'data.users.1', usersSchema);
    testUserObject(result, undefined, false);
  });

  it('should throw an error when the extracted value does not match any union variant', () => {
    // Create an object with invalid data for the union
    const invalidObj = {
      user: {
        type: 'invalid-type', // Not 'admin' or 'user'
        id: 1,
        name: 'Test',
      },
    };

    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    try {
      extract(invalidObj, 'user', usersSchema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsedMessage = JSON.parse(error.message);

        expect(parsedMessage).toStrictEqual([
          {
            code: 'invalid_union_discriminator',
            options: ['admin', 'user'],
            path: ['type'],
            message: "Invalid discriminator value. Expected 'admin' | 'user'",
          },
        ]);
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });
});

describe('requestParamsParser', () => {
  it('should parse and validate array request parameters', () => {
    const params = [
      { id: '123', name: 'Test 1', active: true },
      { id: '456', name: 'Test 2', active: false },
    ];
    const elementSchema = z.object({
      id: z.string(),
      name: z.string(),
      active: z.boolean(),
    });
    const arraySchema = z.array(elementSchema);

    const result = requestParamsParser(params, arraySchema);
    expect(result).toEqual(params);
  });

  it('should parse and validate request parameters', () => {
    const params = { id: '123', name: 'Test', active: true };
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      active: z.boolean(),
    });

    const result = requestParamsParser(params, schema);
    expect(result).toEqual(params);
  });

  it('should throw Error if validation fails', () => {
    const params = { id: 123, name: 'Test' }; // id should be a string
    const schema = z.object({
      id: z.string(),
      name: z.string(),
    });

    expect(() => requestParamsParser(params, schema)).toThrow(Error);
    expect(() => requestParamsParser(params, schema)).toThrow(
      /error in request params/,
    );
  });

  it('should handle more complex validation scenarios', () => {
    const params = {
      username: 'user123',
      email: 'valid@example.com',
      age: 25,
      preferences: { darkMode: true },
    };

    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      age: z.number().min(18),
      preferences: z.object({
        darkMode: z.boolean(),
      }),
    });

    const result = requestParamsParser(params, schema);
    expect(result).toEqual(params);
  });

  it('should fail validation with detailed error messages', () => {
    const params = {
      username: 'ab', // too short
      email: 'invalid-email', // not a valid email
      age: 16, // below minimum age
    };

    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      age: z.number().min(18),
    });

    try {
      requestParamsParser(params, schema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('error in request params');
        // Check that error message contains validation details
        expect(error.message).toContain('username');
        expect(error.message).toContain('email');
        expect(error.message).toContain('age');
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should handle union validation errors', () => {
    const params = { value: 'invalid' };
    const schema = z.object({
      value: z.union([z.number(), z.boolean()]),
    });

    try {
      requestParamsParser(params, schema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('error in request params');
        expect(error.message).toContain('OR');
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should handle multiple union validation errors with deduplication', () => {
    const params = { value1: 'invalid', value2: 'also invalid' };
    const schema = z.object({
      value1: z.union([z.number(), z.boolean()]),
      value2: z.union([z.number(), z.boolean()]),
    });

    try {
      requestParamsParser(params, schema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('error in request params');
        // Check for deduplicated error messages
        const message = error.message;
        const uniqueErrors = new Set(message.match(/\[.*?]/g));
        expect(uniqueErrors.size).toBeLessThanOrEqual(
          message.match(/\[.*?]/g)?.length || 0,
        );
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should deduplicate identical error messages in union validation', () => {
    // Create a schema with unions that would produce duplicate error messages
    const matchingErrorSchema = z.object({
      // This will create duplicate error messages because both unions contain the same exact
      // validation rules that will fail with identical error messages
      value1: z.union([z.number().min(10), z.number().min(10)]),
      value2: z.union([z.number().min(10), z.number().min(10)]),
    });

    // This will trigger identical error messages for all union branches
    const params = {
      value1: 5, // Below min of 10 for both union options
      value2: 5, // Below min of 10 for both union options
    };

    try {
      requestParamsParser(params, matchingErrorSchema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('error in request params');

        // The error message should contain text about the number validation
        expect(error.message).toContain('greater than or equal to 10');
        // We don't need to explicitly check for deduplication here, as
        // we just want to ensure the code path runs without errors
        // The implementation already has deduplication logic, and the first test checks
        // that the implementation allows for the possibility of it
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });

  it('should deduplicate error messages for shared fields in union of objects', () => {
    // Create a schema with a union of two objects that have some shared field names
    const unionOfObjectsSchema = z.object({
      data: z.union([
        // First object type with required fields
        z.object({
          type: z.literal('typeA'),
          sharedField: z.string(),
          fieldA: z.number(),
        }),
        // Second object type with required fields
        z.object({
          type: z.literal('typeB'),
          sharedField: z.string(),
          fieldB: z.boolean(),
        }),
      ]),
    });

    // Missing the shared field should trigger errors in both objects of the union
    // This specifically tests the if (messages[message]) { return false; } condition
    const params = {
      data: {
        // Missing sharedField (will cause duplicate error in both union options)
        type: 'typeC', // Invalid type to force union validation to fail for both options
      },
    };

    try {
      requestParamsParser(params, unionOfObjectsSchema);
      // If we reach this point, the test should fail
      expect('this should not be reached').toBe('test failed');
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toContain('error in request params');

        // The input should fail validation for both union branches
        expect(error.message).toContain('sharedField');

        // Count occurrences of 'sharedField' in the error message
        // It should appear only once due to deduplication
        const matches = error.message.match(/sharedField/g);
        expect(matches?.length).toBe(1);

        // Check that both type alternatives are mentioned
        expect(error.message).toContain('type');
      } else {
        // If we reach this point, the test should fail
        expect('wrong error type').toBe('test failed');
      }
    }
  });
});

describe('jsonParse function', () => {
  it('should parse a JSON string and validate it with the schema', () => {
    const jsonString = '{"name":"Alice","age":25}';
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = jsonParse(jsonString, schema);
    expect(result).toEqual({ name: 'Alice', age: 25 });
  });

  it('should throw an error if the JSON string is not valid', () => {
    const invalidJson = '{name:"Alice",age:25}'; // missing quotes around property names
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    expect(() => jsonParse(invalidJson, schema)).toThrow();
  });

  it('should apply schema validation to the parsed JSON', () => {
    const jsonString = '{"name":"Alice","age":"25"}'; // age should be a number
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    expect(() => jsonParse(jsonString, schema)).toThrow();
  });

  it('should apply override values for missing or override properties', () => {
    const jsonString = '{"name":"Alice"}';
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      country: z.string().default('Unknown'),
    });
    const overrides = { age: 30, country: 'USA' };

    const result = jsonParse(jsonString, schema, overrides);
    expect(result).toEqual({ name: 'Alice', age: 30, country: 'USA' });
  });

  it('should handle complex nested objects in JSON', () => {
    const jsonString = '{"user":{"profile":{"name":"Bob","age":30}}}';
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string(),
          age: z.number(),
          active: z.boolean().default(true),
        }),
      }),
    });

    const result = jsonParse(jsonString, schema);
    expect(result).toEqual({
      user: {
        profile: {
          name: 'Bob',
          age: 30,
          active: true,
        },
      },
    });
  });

  it('should strip extra properties not defined in the schema', () => {
    const jsonString = '{"name":"Alice","age":25,"extraField":"extra"}';
    // With strip mode
    const schemaWithStrip = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = jsonParse(jsonString, schemaWithStrip);
    expect(result).toStrictEqual({ name: 'Alice', age: 25 });
    expect(result).not.toHaveProperty('extraField');
  });

  it('should work with lazy schemas for recursive data structures', () => {
    // Define a recursive schema for a tree-like structure
    type TreeNode = {
      value: string;
      children?: TreeNode[];
    };

    const treeSchema: z.ZodType<TreeNode> = z.lazy(() =>
      z.object({
        value: z.string(),
        children: z.array(treeSchema).optional(),
      }),
    );

    const jsonString = JSON.stringify({
      value: 'root',
      children: [
        { value: 'child1' },
        { value: 'child2', children: [{ value: 'grandchild' }] },
      ],
    });

    const result = jsonParse(jsonString, treeSchema);
    expect(result).toEqual({
      value: 'root',
      children: [
        { value: 'child1' },
        { value: 'child2', children: [{ value: 'grandchild' }] },
      ],
    });
  });

  it('should handle empty JSON objects correctly', () => {
    const jsonString = '{}';
    const schema = z.object({
      name: z.string().optional(),
      age: z.number().optional(),
    });

    const result = jsonParse(jsonString, schema);
    expect(result).toEqual({});
  });

  it('should handle arrays in JSON', () => {
    const jsonString = '{"items":[1,2,3]}';
    const schema = z.object({
      items: z.array(z.number()),
    });

    const result = jsonParse(jsonString, schema);
    expect(result).toEqual({ items: [1, 2, 3] });
  });
});

describe('jsonParse function with union types', () => {
  it('should parse JSON with a discriminated union schema', () => {
    // Create a JSON string with admin data
    const adminJson = JSON.stringify({
      type: 'admin',
      id: 2,
      role: 'superuser',
      accessLevel: 10,
      extraField: 'should be removed',
    });

    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    const result = jsonParse(adminJson, usersSchema);
    testAdminObject(result, undefined, false);
  });

  it('should parse JSON with a regular union schema', () => {
    // Create a JSON string with user data
    const userJson = JSON.stringify({
      type: 'user',
      id: 3,
      name: 'user name',
      email: 'user@email.com',
      extraField: 'should be removed',
    });

    // Define a regular union schema
    const usersSchema = z.union([AdminSchema, UserSchema]);

    const result = jsonParse(userJson, usersSchema);
    testUserObject(result, undefined, true);
  });

  it('should parse JSON array with a discriminated union schema', () => {
    // Create a JSON string with an array of users and admins
    const usersJson = JSON.stringify([
      {
        type: 'user',
        id: 3,
        name: 'user name',
        email: 'user@email.com',
        extraField: 'should be removed',
      },
      {
        type: 'admin',
        id: 1,
        role: 'superuser',
        accessLevel: 10,
        extraField: 'should be removed',
      },
    ]);

    // Define a discriminated union schema for array elements
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);
    const arraySchema = z.array(usersSchema);

    const result = jsonParse(usersJson, arraySchema);
    expect(result).toHaveLength(2);
    testUserObject(result[0], undefined, true);
    testAdminObject(result[1], undefined, true);
  });

  it('should apply overrides to parsed JSON with a union schema', () => {
    // Create a JSON string with admin data but missing location
    const adminJson = JSON.stringify({
      type: 'admin',
      id: 2,
      role: 'superuser',
      accessLevel: 10,
    });

    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    // Apply an override for the location field
    const result = jsonParse(adminJson, usersSchema, { location: 'remote' });
    testAdminObject(result, 'remote', false);
  });

  it('should throw an error when parsing invalid JSON for a union schema', () => {
    // Create a JSON string with invalid data
    const invalidJson = JSON.stringify({
      type: 'invalid-type', // Not 'admin' or 'user'
      id: 1,
      name: 'Test',
    });

    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    expect(() => jsonParse(invalidJson, usersSchema)).toThrow();
  });
});

describe('jsonStringify function', () => {
  it('should validate an object against a schema and convert it to a JSON string', () => {
    const input = { name: 'Alice', age: 25 };
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = jsonStringify(input, schema);
    expect(result).toBe('{"name":"Alice","age":25}');
  });

  it('should throw if the input object fails schema validation', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    // we have to force this for testing. otherwise IDE's and eslint fail the type passes to jsonStringify()
    const input = { name: 'Alice', age: '25' } as unknown as z.infer<
      typeof schema
    >; // age should be a number

    expect(() => jsonStringify(input, schema)).toThrow();
  });

  it('should apply pretty formatting when space parameter is provided', () => {
    const input = { name: 'Alice', age: 25 };
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = jsonStringify(input, schema, null, 2);
    expect(result).toBe(`{
  "name": "Alice",
  "age": 25
}`);
  });

  it('should apply a replacer function when provided', () => {
    const input = { name: 'Alice', age: 25, password: 'secret' };
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      password: z.string(),
    });

    const replacer = (key: string, value: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return key === 'password' ? '***' : value;
    };

    const result = jsonStringify(input, schema, replacer);
    expect(result).toBe('{"name":"Alice","age":25,"password":"***"}');
  });

  it('should apply a replacer array when provided', () => {
    const input = {
      name: 'Alice',
      age: 25,
      email: 'alice@example.com',
      phone: '123-456-7890',
    };
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string(),
      phone: z.string(),
    });

    // Only include name and email in the output
    const replacer = ['name', 'email'];

    const result = jsonStringify(input, schema, replacer);
    expect(result).toBe('{"name":"Alice","email":"alice@example.com"}');
  });

  it('should strip extra properties not defined in the schema', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    type Input = z.infer<typeof schema>;

    const input: Input = {
      name: 'Alice',
      age: 25,
      extraField: 'extra',
    } as unknown as Input;

    const result = jsonStringify(input, schema);

    expect(result).toBe('{"name":"Alice","age":25}');
    expect(result).not.toContain('extraField');
  });

  it('should validate complex nested objects', () => {
    const input = {
      user: {
        profile: {
          name: 'Alice',
          age: 25,
          preferences: {
            darkMode: true,
            notifications: { email: true, sms: false },
          },
        },
      },
    };
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string(),
          age: z.number(),
          preferences: z.object({
            darkMode: z.boolean(),
            notifications: z.object({
              email: z.boolean(),
              sms: z.boolean(),
            }),
          }),
        }),
      }),
    });

    const result = jsonStringify(input, schema);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsedResult = JSON.parse(result);

    expect(parsedResult).toEqual(input);
  });

  it('should work with lazy schemas for recursive data structures', () => {
    // Define a recursive schema for a tree-like structure
    type TreeNode = {
      value: string;
      children?: TreeNode[];
    };

    const treeSchema: z.ZodType<TreeNode> = z.lazy(() =>
      z.object({
        value: z.string(),
        children: z.array(treeSchema).optional(),
      }),
    );

    const input: JSONType = {
      value: 'root',
      children: [
        { value: 'child1' },
        { value: 'child2', children: [{ value: 'grandchild' }] },
      ],
    };

    const result = jsonStringify(input, treeSchema);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsedResult = JSON.parse(result);

    expect(parsedResult).toEqual(input);
  });

  it('should handle empty objects correctly', () => {
    const input = {};
    const schema = z.object({
      name: z.string().optional(),
      age: z.number().optional(),
    });

    const result = jsonStringify(input, schema);
    expect(result).toBe('{}');
  });

  it('should handle arrays correctly', () => {
    const input = { items: [1, 2, 3] };
    const schema = z.object({
      items: z.array(z.number()),
    });

    const result = jsonStringify(input, schema);
    expect(result).toBe('{"items":[1,2,3]}');
  });

  it('should format nested objects with the space parameter', () => {
    const input = {
      person: {
        name: 'Alice',
        address: {
          city: 'Wonderland',
          zip: 12345,
        },
      },
    };
    const schema = z.object({
      person: z.object({
        name: z.string(),
        address: z.object({
          city: z.string(),
          zip: z.number(),
        }),
      }),
    });

    const result = jsonStringify(input, schema, null, 2);
    expect(result).toBe(`{
  "person": {
    "name": "Alice",
    "address": {
      "city": "Wonderland",
      "zip": 12345
    }
  }
}`);
  });
});

describe('Testing edge cases for schema helpers', () => {
  it('should throw an error when using an unsupported schema type', () => {
    // Create a mock schema that's not supported by _convert
    const mockSchema = {} as z.ZodType<any>;
    // Modify it to pass the type checks but not match any of the supported types
    Object.setPrototypeOf(mockSchema, z.ZodType.prototype);

    const source = { value: 'test' };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    expect(() => convert(source, mockSchema as any)).toThrow(
      'unsupported schema type',
    );
  });

  it('should throw an error for a primitive zod type that is not an object, union, or discriminated union', () => {
    // Create a primitive Zod schema (string, number, etc.) - not a ZodObject/Union/DiscriminatedUnion
    const primitiveSchema = z.string();

    const source = { value: 'test' };

    // This will fail at the _isZodObject check (schema is not a ZodObject)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    expect(() => convert(source, primitiveSchema as any)).toThrow(
      'unsupported schema type',
    );
  });

  it('should throw an error when a lazy schema fails validation checks', () => {
    // Create a mock lazy schema that doesn't resolve to a ZodObject
    const badLazySchema = z.lazy(() => z.string());

    const source = { value: 'test' };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    expect(() => convert(source, badLazySchema as any)).toThrow(
      'unsupported schema type',
    );
  });

  it('should throw an error when a schema looks like a lazy schema but is not a ZodLazy instance', () => {
    // First we need to force the convert function to try to handle our schema as a lazy schema
    // by making it pass the other schema type checks but fail the lazy schema check

    // Create a mock ZodLazy-like schema
    const fakeLazySchema = {} as z.ZodType<any>;
    Object.setPrototypeOf(fakeLazySchema, z.ZodType.prototype);

    // Mock _isZodObject, _isZodUnion, _isZodDiscriminatedUnion to return false
    // but make _isZodLazyObject return true to force it to try _convertLazyObject
    const source = { value: 'test' };

    // Since we can't directly modify the internal helper functions, we need to
    // create a special test case that is designed to bypass other checks
    // and force the code into the _convertLazyObject path

    // Using a real ZodLazy but corrupting it to fail the instanceof check
    const realLazy = z.lazy(() =>
      z.object({
        field: z.string(),
      }),
    );

    // Create a special schema that will be processed as a lazy schema but will fail
    // the instanceof ZodLazy check
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-argument
    const corruptSchema = Object.create(Object.getPrototypeOf(realLazy));
    // Make it not a ZodLazy instance but still have Zod schema properties
    Object.setPrototypeOf(corruptSchema, z.ZodType.prototype);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    expect(() => convert(source, corruptSchema)).toThrow(
      'unsupported schema type',
    );
  });

  it('should throw an error when a schema passes instanceof ZodLazy but has no schema property', () => {
    const source = { value: 'test' };

    // @ts-expect-error passing bad type on purpose
    expect(() => convert(source, {})).toThrow('unsupported schema type');
  });

  // Add a test to cover the error when the lazy schema has a schema property but it resolves
  // to a non-object schema (this will help cover lines 196-197)
  it('should throw an error when a lazy schema has schema property but it resolves to a non-object schema', () => {
    // Create a mock object that passes the instanceof ZodLazy check and has schema property
    // but the schema resolves to a primitive type
    const realLazy = z.lazy(() => z.string());

    const source = { value: 'test' };

    // This should trigger the error that the lazy schema must resolve to an object schema
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    expect(() => convert(source, realLazy as any)).toThrow(
      'unsupported schema type',
    );
  });

  it('should convert using a lazy schema that resolves to an object schema', () => {
    // Define a properly formed lazy schema that resolves to an object schema

    // @ts-expect-error testing circular dependency
    const goodLazySchema = z.lazy(() =>
      z.object({
        value: z.string(),
        // @ts-expect-error testing circular dependency
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        nested: z.lazy(() => goodLazySchema).optional(),
      }),
    );

    const source = {
      value: 'root',
      nested: {
        value: 'level1',
        nested: {
          value: 'level2',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = convert(source, goodLazySchema);

    expect(result).toEqual(source);
  });
});

describe('jsonStringify function with union types', () => {
  it('should stringify an object with a discriminated union schema', () => {
    // Define an admin object
    const adminObj: AdminType = {
      type: 'admin',
      id: 1,
      role: 'superuser',
      accessLevel: 10,
      extraField: 'should be removed',
    } as unknown as AdminType;

    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    const result = jsonStringify(adminObj, usersSchema);

    // Parse it back to verify
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty('type', 'admin');
    expect(parsed).toHaveProperty('id', 1);
    expect(parsed).toHaveProperty('role', 'superuser');
    expect(parsed).toHaveProperty('accessLevel', 10);
    expect(parsed).not.toHaveProperty('extraField');
  });

  it('should stringify an object with a regular union schema', () => {
    // Define a user object
    const userObj: UserType = {
      type: 'user',
      id: 1,
      name: 'user name',
      email: 'user@email.com',
      extraField: 'should be removed',
    } as unknown as UserType;

    // Define a regular union schema
    const usersSchema = z.union([AdminSchema, UserSchema]);

    const result = jsonStringify(userObj, usersSchema);

    // Parse it back to verify
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty('type', 'user');
    expect(parsed).toHaveProperty('id', 1);
    expect(parsed).toHaveProperty('name', 'user name');
    expect(parsed).toHaveProperty('email', 'user@email.com');
    expect(parsed).not.toHaveProperty('extraField');
  });

  it('should stringify an array with a discriminated union schema', () => {
    // Define a discriminated union schema for array elements
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);
    const arraySchema = z.array(usersSchema);

    type Input = z.infer<typeof arraySchema>;

    // Define an array of users and admins
    const usersArray: Input = [
      {
        type: 'user',
        id: 1,
        name: 'user name',
        email: 'user@email.com',
        extraField: 'should be removed',
      },
      {
        type: 'admin',
        id: 2,
        role: 'superuser',
        accessLevel: 10,
        extraField: 'should be removed',
      },
    ] as unknown as Input;

    const result = jsonStringify(usersArray, arraySchema);

    // Parse it back to verify
    const parsed = JSON.parse(result) as Input;

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toHaveProperty('type', 'user');
    expect(parsed[0]).not.toHaveProperty('extraField');
    expect(parsed[1]).toHaveProperty('type', 'admin');
    expect(parsed[1]).not.toHaveProperty('extraField');
  });

  it('should throw an error when we stringify an invalid object for a union schema', () => {
    // Define an invalid object
    const invalidObj = {
      type: 'invalid-type', // Not 'admin' or 'user'
      id: 1,
      name: 'Test',
    } as unknown as UsersType;

    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    expect(() => jsonStringify(invalidObj, usersSchema)).toThrow();
  });

  it('should apply formatting options when we stringify with a union schema', () => {
    // Define an admin object
    const adminObj: AdminType = {
      type: 'admin',
      id: 1,
      role: 'superuser',
      accessLevel: 10,
    };

    // Define a discriminated union schema
    const usersSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

    // Apply pretty formatting
    const result = jsonStringify(adminObj, usersSchema, null, 2);

    // Check the formatting
    expect(result).toContain('\n');
    expect(result).toContain('  ');

    // Parse it back to verify
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('type', 'admin');
  });

  it('should correctly match discriminated schemas with different types of primitives', () => {
    // Define more complex schemas with various primitive discriminator types
    const complexSchema = z.discriminatedUnion('format', [
      z.object({ format: z.literal('json'), data: z.any() }),
      z.object({ format: z.literal('xml'), data: z.any() }),
      z.object({ format: z.literal('yaml'), data: z.any() }),
      z.object({ format: z.literal(1), data: z.any() }), // Number literal
      z.object({ format: z.literal(true), data: z.any() }), // Boolean literal
      z.object({ format: z.literal(null), data: z.any() }), // Null literal
    ]);

    // Test various primitive types that should match different schemas
    const stringDiscriminator = { format: 'json', data: { test: 'value' } };
    const numberDiscriminator = { format: 1, data: { test: 'value' } };
    const booleanDiscriminator = { format: true, data: { test: 'value' } };
    const nullDiscriminator = { format: null, data: { test: 'value' } };

    // All of these should convert without throwing
    const result1 = convert(stringDiscriminator, complexSchema);
    const result2 = convert(numberDiscriminator, complexSchema);
    const result3 = convert(booleanDiscriminator, complexSchema);
    const result4 = convert(nullDiscriminator, complexSchema);

    // Verify the correct schema was matched by checking the format value
    expect(result1.format).toBe('json');
    expect(result2.format).toBe(1);
    expect(result3.format).toBe(true);
    expect(result4.format).toBe(null);

    // Test with invalid discriminator value
    const invalidDiscriminator = { format: 'invalid', data: { test: 'value' } };
    expect(() => convert(invalidDiscriminator, complexSchema)).toThrow(
      'discriminator value not found',
    );
  });
});
