# JSON Schema Mapping

A powerful, bidirectional JSON transformation system that allows mapping between different JSON structures using a
simple DSL (Domain Specific Language). The mapping system can validate input and output using Zod schemas, transform
values, and support complex data structures.

## Overview

This library allows you to define mappings between different JSON structures and transform data bidirectionally. It's
particularly useful for:

- Transforming API responses to internal data models
- Preparing internal data for API requests
- Data migration between different schema versions
- Adapting data between different parts of a system
- Format conversions (e.g., date/time formats)

## Key Features

- **Bidirectional Mapping**: Map data in both directions using a single mapping definition
- **Schema Validation**: Validate input and output data using Zod schemas
- **Value Transformation**: Transform values using custom functions
- **Array Support**: Rich support for array operations including indexing and slicing
- **Literal Values**: Define default values when fields don't exist in the source
- **Overrides**: Override mapped values with custom values
- **Rule Order Control**: Configure rule application order for complex mappings

## Basic Usage

```typescript
import { z } from 'zod';
import { compile, MappingRuleParams } from 'schemary';

// Define schemas
const LeftSchema = z.object({
  user: z.object({
    firstName: z.string(),
    lastName: z.string(),
    age: z.number(),
    isActive: z.boolean().optional(),
  }),
});

const RightSchema = z.object({
  identifier: z.number(),
  person: z.object({
    given_name: z.string(),
    family_name: z.string(),
  }),
  yearsOld: z.number(),
  active: z.boolean().optional(),
});

// Define mapping rules
const mappingRules: MappingRuleParams[] = [
  { left: 'user.id', right: 'identifier' },
  { left: 'user.firstName', right: 'person.given_name' },
  { left: 'user.lastName', right: 'person.family_name' },
  { left: 'user.age', right: 'yearsOld' },
  { left: 'user.isActive', right: 'active' },
];

// Compile the mapping plan
const plan = compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
});

// Source data
const source = {
  user: {
    id: 123,
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
    isActive: true,
  },
};

// Transform left to right
const result = plan.map(source);
// Result:
// {
//   identifier: 123,
//   person: {
//     given_name: 'John',
//     family_name: 'Doe'
//   },
//   yearsOld: 30,
//   active: true
// }

// Transform right to left
const rightToLeftResult = plan.reverseMap(result);
// Result is equivalent to original source
```

## API Reference

### Defining Mappings

```typescript
interface MappingRuleParams {
  left?: string;               // Path to the field in the left schema
  right?: string;              // Path to the field in the right schema
  literal?: JSONType;          // Literal value to use (when left or right is missing)
  leftTransform?: Function;    // Transform function for right-to-left mapping
  rightTransform?: Function;   // Transform function for left-to-right mapping
  format?: {                   // Format conversions (e.g., date formats)
    type: MappingRuleFormatType;
    left: string;
    right: string;
  };
}
```

### Compile Function

```typescript
function compile<L, R>(
  rules: MappingRuleParams[],
  params: {
    leftSchema: z.ZodTypeAny,
    rightSchema: z.ZodTypeAny,
    order?: {
      toLeft?: MappingPlanRuleOrder,
      toRight?: MappingPlanRuleOrder
    }
  }
): MappingPlan
```

### MappingPlan Class

The compiled mapping plan provides methods to transform data in both directions:

```typescript
class MappingPlan {
  // Transform data from left schema to right schema
  map(
    leftValue: LeftSchemaType,
    overrideValues?: Overrides<RightSchemaType>
  ): RightSchemaType;

  // Transform data from right schema to left schema
  reverseMap(
    rightValue: RightSchemaType,
    overrideValues?: Overrides<LeftSchemaType>
  ): LeftSchemaType;
}
```

## Mapping DSL Syntax

### Field Navigation

Access object properties using dot notation:

```
user.address.street
```

### Array Indexing

Access array elements by index (zero-based):

```
users[0]         // First element
users[-1]        // Last element
users[-2]        // Second-to-last element
```

### Array Slicing

Extract ranges from arrays:

```
users[[0,3]]     // First 3 elements (indices 0, 1, 2)
users[[1]]       // All elements from index 1 to the end
users[[-2]]      // Last 2 elements
users[[0,-1]]    // All elements except the last one
```

### Escaped Characters

Escape square brackets to use them as literal field names:

```
data.\[field\]   // Accesses a field named '[field]'
```

### Literal Values

You can specify a literal value to use instead of a field mapping:

```typescript
// Boolean true 
{
  left: 'user.verified', literal
:
  true
}

// String
{
  right: 'status', literal
:
  'active'
}

// Number
{
  right: 'defaultQuantity', literal
:
  42
}

// Object
{
  right: 'preferences', literal
:
  {
    theme: 'dark', notifications
  :
    true
  }
}

// Array
{
  right: 'roles', literal
:
  ['user', 'admin']
}
```

## Advanced Features

### Value Transformations

Apply custom transformations to values during mapping:

```typescript
const mappingRules = [
  {
    left: 'dob',
    right: 'dateOfBirth',
    // Transform to convert from MM/DD/YYYY to YYYY-MM-DD
    leftTransform: (isoDateString: string): string => {
      const [year, month, day] = isoDateString.split('-');
      return `${month}/${day}/${year}`;
    },
    // Transform to convert from YYYY-MM-DD to MM/DD/YYYY
    rightTransform: (dateString: string): string => {
      const [month, day, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    },
  }
];

// Left value: { dob: '05/16/1990' }
// Right value: { dateOfBirth: '1990-05-16' }
```

### Format Conversions

The library includes built-in format conversions for common types like dates:

```typescript
import { MappingRuleFormatType, FormatShortNames } from 'schemary';

const mappingRules = [
  {
    left: 'created',
    right: 'creationDate',
    format: {
      type: MappingRuleFormatType.TIMESTAMP,
      left: FormatShortNames.ISO8601,  // '2023-01-15T14:30:00.000Z'
      right: FormatShortNames.HTTP,    // 'Sun, 15 Jan 2023 14:30:00 GMT'
    },
  }
];
```

Available timestamp formats:

- ISO8601 - ISO 8601 format
- RFC3339 - RFC 3339 format
- RFC2822 - RFC 2822 format
- HTTP - HTTP header date format
- SQL - SQL date format
- UNIX - UNIX timestamp (seconds since epoch)
- UNIX_MS - UNIX timestamp (milliseconds since epoch)

### Rule Order Control

Control the order in which rules are applied:

```typescript
import { MappingPlanRuleOrder } from 'schemary';

const plan = compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
  order: {
    toRight: MappingPlanRuleOrder.DESC, // For left-to-right mapping
    toLeft: MappingPlanRuleOrder.ASC,   // For right-to-left mapping
  }
});
```

With `ASC` order (default), rules are applied in the order they are defined, and later rules can override earlier ones.
With `DESC` order, rules are applied in reverse order, so earlier rules take precedence.

### Value Overrides

Override mapped values with custom values:

```typescript
// Map with overrides
const result = plan.map(source, {
  'person.given_name': 'Jane',  // Override the mapped value
  yearsOld: 25,                // Override the mapped value
});
```

## Examples

### Basic Field Mapping

Map simple fields between different structures:

```typescript
const mappingRules = [
  { left: 'name', right: 'userName' },
  { left: 'email', right: 'userEmail' }
];

// Source (left schema)
const source = {
  name: 'Alice',
  email: 'alice@example.com'
};

// Mapped result (right schema)
const result = plan.map(source);
// {
//   userName: 'Alice',
//   userEmail: 'alice@example.com'
// }
```

### Nested Objects

Map between deeply nested structures:

```typescript
const mappingRules = [
  { left: 'user.contact.email', right: 'profile.emailAddress' },
  { left: 'user.contact.phone', right: 'profile.phoneNumber' },
  { left: 'user.address.street', right: 'location.streetAddress' },
  { left: 'user.address.city', right: 'location.city' }
];

// Source (left schema)
const source = {
  user: {
    contact: {
      email: 'john@example.com',
      phone: '555-1234'
    },
    address: {
      street: '123 Main St',
      city: 'Anytown'
    }
  }
};

// Mapped result (right schema)
const result = plan.map(source);
// {
//   profile: {
//     emailAddress: 'john@example.com',
//     phoneNumber: '555-1234'
//   },
//   location: {
//     streetAddress: '123 Main St',
//     city: 'Anytown'
//   }
// }
```

### Array Mapping

Map array elements between different structures:

```typescript
const mappingRules = [
  { left: 'users[0].name', right: 'firstUser' },
  { left: 'users[1].email', right: 'secondUserEmail' },
  { left: 'users[-1].name', right: 'lastUser' },
];

// Source (left schema)
const source = {
  users: [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Charlie', email: 'charlie@example.com' }
  ]
};

// Mapped result (right schema)
const result = plan.map(source);
// {
//   firstUser: 'Alice',
//   secondUserEmail: 'bob@example.com',
//   lastUser: 'Charlie'
// }
```

### Array Slices

Extract and map subsets of arrays:

```typescript
const mappingRules = [
  { left: 'scores[[0,3]]', right: 'topScores' }
];

// Source (left schema)
const source = {
  scores: [100, 95, 90, 85, 80, 75]
};

// Mapped result (right schema)
const result = plan.map(source);
// {
//   topScores: [100, 95, 90]
// }
```

### Default Values with Literals

Provide default values for fields that don't exist in one schema:

```typescript
const mappingRules = [
  { left: 'user.name', right: 'userName' },
  { right: 'userStatus', literal: 'active' },
  { left: 'user.defaultTheme', literal: 'light' }
];

// When mapping left to right
const source = {
  user: {
    name: 'John',
    // No defaultTheme field
  }
};

const result = plan.map(source);
// {
//   userName: 'John',
//   userStatus: 'active'  // Literal value
// }

// When mapping right to left
const rightSource = {
  userName: 'Bob',
  userStatus: 'inactive'  // This will be ignored
};

const leftResult = plan.reverseMap(rightSource);
// {
//   user: {
//     name: 'Bob',
//     defaultTheme: 'light'  // Literal value
//   }
// }
```

### Value Transformations

Transform values during mapping:

```typescript
const mappingRules = [
  {
    left: 'temperature.celsius',
    right: 'temperature.fahrenheit',
    rightTransform: (celsius: number) => celsius * 9 / 5 + 32,
    leftTransform: (fahrenheit: number) => (fahrenheit - 32) * 5 / 9
  }
];

// Left-to-right conversion
const celsius = { temperature: { celsius: 25 } };
const fahrenheit = plan.map(celsius);
// { temperature: { fahrenheit: 77 } }

// Right-to-left conversion
const backToCelsius = plan.reverseMap(fahrenheit);
// { temperature: { celsius: 25 } }
```

### Date Format Conversions

Convert between different date formats:

```typescript
import { MappingRuleFormatType } from 'schemary';

const mappingRules = [
  {
    left: 'createdDate',
    right: 'createdAt',
    format: {
      type: MappingRuleFormatType.TIMESTAMP,
      left: 'MM/dd/yyyy',
      right: 'yyyy-MM-dd'
    }
  }
];

// Source with MM/DD/YYYY format
const source = {
  createdDate: '01/15/2023'
};

// Result with YYYY-MM-DD format
const result = plan.map(source);
// {
//   createdAt: '2023-01-15'
// }
```

### Root Mapping

Map between root objects and nested fields:

```typescript
const mappingRules = [
  { left: 'users[0]', right: '' }  // Map first user to root
];

// Source (left schema)
const source = {
  users: [
    { name: 'Alice', email: 'alice@example.com' }
  ]
};

// Mapped result (right schema)
const result = plan.map(source);
// {
//   name: 'Alice',
//   email: 'alice@example.com'
// }
```

### Complex Array Transformations

Work with complex array structures:

```typescript
const mappingRules = [
  { left: 'data[0].values[[0,2]]', right: 'firstValues' },
  { left: 'data[-1].values[[0,2]]', right: 'lastValues' }
];

// Source (left schema)
const source = {
  data: [
    { id: 1, values: [10, 20, 30, 40, 50] },
    { id: 2, values: [15, 25, 35, 45, 55] },
    { id: 3, values: [5, 15, 25, 35, 45] }
  ]
};

// Mapped result (right schema)
const result = plan.map(source);
// {
//   firstValues: [10, 20],
//   lastValues: [5, 15]
// }
```

### Overriding Mapped Values

Override specific values during mapping:

```typescript
const mappingRules = [
  { left: 'user.firstName', right: 'givenName' },
  { left: 'user.lastName', right: 'familyName' },
  { left: 'user.age', right: 'age' }
];

// Source data
const source = {
  user: {
    firstName: 'John',
    lastName: 'Doe',
    age: 30
  }
};

// Override values
const overrides = {
  givenName: 'Jane',
  age: 25  // This takes precedence over the mapped value
};

// Mapped result with overrides
const result = plan.map(source, overrides);
// {
//   givenName: 'Jane',  // From overrides
//   familyName: 'Doe',  // From mapping
//   age: 25             // From overrides
// }
```

## Best Practices

1. **Use Schemas for Validation**: Always define schemas for both sides of the mapping to ensure data integrity.

2. **Keep Mappings Simple**: Break complex mappings into smaller, more manageable units.

3. **Test Bidirectional Mappings**: Always test mappings in both directions to ensure they work as expected.

4. **Be Careful with Array Mappings**: Array mappings can be complex, especially when mapping between arrays and
   objects.

5. **Use Transformations for Complex Conversions**: When mapping between different data types or formats, use transform
   functions.

6. **Document Your Mappings**: Clear documentation helps maintain and debug complex mappings.

7. **Consider Rule Order**: The order of rules matters when fields overlap. Use `MappingPlanRuleOrder` to control
   precedence.

8. **Handle Missing Fields Gracefully**: Use literals to provide default values for fields that might not exist.

9. **Prefer Path-based Mappings Over Complex Transformations**: Simple path mappings are easier to understand and
   maintain.

10. **Cache Compiled Mapping Plans**: Reuse compiled mapping plans for better performance.

## Limitations and Edge Cases

1. **Type Mismatches**: Be careful when mapping between different types (e.g., arrays and objects). The system will
   create appropriate container types, but the structure might not be preserved when mapping back.

2. **Complex Bidirectional Mappings**: Some complex transformations might not be perfectly reversible.

3. **Array Index Changes**: When mapping with array indices, be aware that indices can change if the array structure
   changes.

4. **Deep Nesting**: Very deep object structures might hit JavaScript's call stack limits.

5. **Performance with Large Datasets**: Complex mappings on very large datasets might be performance-intensive.

6. **Circular References**: The mapping system doesn't handle circular references.

7. **Schema Evolution**: When schemas evolve over time, you might need to update your mappings.

## Advanced Example: API Integration

This example shows a complete workflow for API integration:

```typescript
import { z } from 'zod';
import { compile, MappingRuleParams, MappingRuleFormatType } from 'schemary';

// API response schema
const APIResponseSchema = z.object({
  id: z.number(),
  user_name: z.string(),
  user_email: z.string().email(),
  created_at: z.string(),
  is_verified: z.boolean(),
  preferences: z.object({
    theme: z.string(),
    notifications: z.boolean(),
  }),
  roles: z.array(z.string()),
});

// Internal model schema
const UserModelSchema = z.object({
  userId: z.number(),
  profile: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  accountInfo: z.object({
    createdDate: z.string(),
    verified: z.boolean(),
  }),
  settings: z.object({
    theme: z.string(),
    enableNotifications: z.boolean(),
  }),
  permissions: z.array(z.string()),
});

// Define mapping rules
const mappingRules: MappingRuleParams[] = [
  { left: 'id', right: 'userId' },
  { left: 'user_name', right: 'profile.name' },
  { left: 'user_email', right: 'profile.email' },
  {
    left: 'created_at',
    right: 'accountInfo.createdDate',
    format: {
      type: MappingRuleFormatType.TIMESTAMP,
      left: 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'',  // ISO format
      right: 'MM/dd/yyyy',                      // MM/DD/YYYY format
    }
  },
  { left: 'is_verified', right: 'accountInfo.verified' },
  { left: 'preferences.theme', right: 'settings.theme' },
  { left: 'preferences.notifications', right: 'settings.enableNotifications' },
  { left: 'roles', right: 'permissions' },
];

// Compile the mapping plan
const userMapping = compile(mappingRules, {
  leftSchema: APIResponseSchema,
  rightSchema: UserModelSchema,
});

// Example API response
const apiResponse = {
  id: 12345,
  user_name: 'johndoe',
  user_email: 'john@example.com',
  created_at: '2023-05-16T14:30:00.000Z',
  is_verified: true,
  preferences: {
    theme: 'dark',
    notifications: true,
  },
  roles: ['user', 'editor'],
};

// Transform to internal model
const userModel = userMapping.map(apiResponse);
// Result:
// {
//   userId: 12345,
//   profile: {
//     name: 'johndoe',
//     email: 'john@example.com',
//   },
//   accountInfo: {
//     createdDate: '05/16/2023',
//     verified: true,
//   },
//   settings: {
//     theme: 'dark',
//     enableNotifications: true,
//   },
//   permissions: ['user', 'editor'],
// }

// Later, when sending data back to the API
const updatedUserModel = {
  userId: 12345,
  profile: {
    name: 'johndoe',
    email: 'john.doe@example.com',  // Updated email
  },
  accountInfo: {
    createdDate: '05/16/2023',
    verified: true,
  },
  settings: {
    theme: 'light',  // Updated theme
    enableNotifications: false,  // Updated notifications
  },
  permissions: ['user', 'editor', 'admin'],  // Updated roles
};

// Transform back to API format
const apiUpdatePayload = userMapping.reverseMap(updatedUserModel);
// Result:
// {
//   id: 12345,
//   user_name: 'johndoe',
//   user_email: 'john.doe@example.com',
//   created_at: '2023-05-16T00:00:00.000Z',
//   is_verified: true,
//   preferences: {
//     theme: 'light',
//     notifications: false,
//   },
//   roles: ['user', 'editor', 'admin'],
// }
```

## Conclusion

The JSON Schema Mapping library provides a powerful way to transform data between different schemas. With support for
bidirectional mapping, schema validation, custom transformations, and advanced features like array operations and format
conversions, it simplifies the process of working with complex data structures.
