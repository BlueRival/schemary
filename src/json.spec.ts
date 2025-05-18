import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parse, stringify } from './json.js';
import { JSONType } from './types.js';

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

describe('JSON', () => {
  describe('parse()', () => {
    it('should parse a JSON string and validate it with the schema', () => {
      const jsonString = '{"name":"Alice","age":25}';
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = parse(jsonString, schema);
      expect(result).toEqual({ name: 'Alice', age: 25 });
    });

    it('should throw an error if the JSON string is not valid', () => {
      const invalidJson = '{name:"Alice",age:25}'; // missing quotes around property names
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      expect(() => parse(invalidJson, schema)).toThrow();
    });

    it('should apply schema validation to the parsed JSON', () => {
      const jsonString = '{"name":"Alice","age":"25"}'; // age should be a number
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      expect(() => parse(jsonString, schema)).toThrow();
    });

    it('should apply override values for missing or override properties', () => {
      const jsonString = '{"name":"Alice"}';
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        country: z.string().default('Unknown'),
      });
      const overrides = { age: 30, country: 'USA' };

      const result = parse(jsonString, schema, overrides);
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

      const result = parse(jsonString, schema);
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

      const result = parse(jsonString, schemaWithStrip);
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

      const result = parse(jsonString, treeSchema);
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

      const result = parse(jsonString, schema);
      expect(result).toEqual({});
    });

    it('should handle arrays in JSON', () => {
      const jsonString = '{"items":[1,2,3]}';
      const schema = z.object({
        items: z.array(z.number()),
      });

      const result = parse(jsonString, schema);
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('parse() with union types', () => {
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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      const result = parse(adminJson, usersSchema);
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

      const result = parse(userJson, usersSchema);
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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);
      const arraySchema = z.array(usersSchema);

      const result = parse(usersJson, arraySchema);
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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      // Apply an override for the location field
      const result = parse(adminJson, usersSchema, { location: 'remote' });
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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      expect(() => parse(invalidJson, usersSchema)).toThrow();
    });
  });

  describe('stringify()', () => {
    it('should validate an object against a schema and convert it to a JSON string', () => {
      const input = { name: 'Alice', age: 25 };
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = stringify(input, schema);
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

      expect(() => stringify(input, schema)).toThrow();
    });

    it('should apply pretty formatting when space parameter is provided', () => {
      const input = { name: 'Alice', age: 25 };
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = stringify(input, schema, null, 2);
      expect(result).toBe(
        JSON.stringify(
          {
            name: 'Alice',
            age: 25,
          },
          null,
          2,
        ),
      );
    });

    it('should apply a replacer() when provided', () => {
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

      const result = stringify(input, schema, replacer);
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

      const result = stringify(input, schema, replacer);
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

      const result = stringify(input, schema);

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

      const result = stringify(input, schema);
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

      const result = stringify(input, treeSchema);
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

      const result = stringify(input, schema);
      expect(result).toBe('{}');
    });

    it('should handle arrays correctly', () => {
      const input = { items: [1, 2, 3] };
      const schema = z.object({
        items: z.array(z.number()),
      });

      const result = stringify(input, schema);
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

      const result = stringify(input, schema, null, 2);
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

  describe('stringify() with union types', () => {
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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      const result = stringify(adminObj, usersSchema);

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

      const result = stringify(userObj, usersSchema);

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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);
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

      const result = stringify(usersArray, arraySchema);

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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      expect(() => stringify(invalidObj, usersSchema)).toThrow();
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
      const usersSchema = z.discriminatedUnion('type', [
        AdminSchema,
        UserSchema,
      ]);

      // Apply pretty formatting
      const result = stringify(adminObj, usersSchema, null, 2);

      // Check the formatting
      expect(result).toContain('\n');
      expect(result).toContain('  ');

      // Parse it back to verify
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('type', 'admin');
    });
  });
});
