# schemary

A schema validation and mapping utility library for TypeScript that uses [Zod](https://github.com/colinhacks/zod) for data validation and transformation.

## Overview

Schemary provides powerful tools for working with structured data, focusing on validation, transformation, and mapping between different data structures. Built on top of Zod, it extends its capabilities to make complex data operations easier, safer, and more maintainable.

## Key Features

- **Schema-based validation** - Validate JSON data against Zod schemas
- **Data transformation** - Convert data between different structures
- **Bidirectional mapping** - Transform data back and forth between schemas
- **Type safety** - Full TypeScript support with proper type inference
- **Timestamp formatting** - Convert between different timestamp formats
- **JSON utilities** - Parse and stringify JSON with schema validation

## Installation

```bash
npm install schemary
```

## Schema Validation and Transformation

### Basic Usage

```typescript
import { z } from 'zod';
import { convert } from 'schemary';

// Define a schema
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  active: z.boolean().default(true),
});

// Input data with extra field
const input = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  extraField: 'will be removed',
};

// Convert the input to conform to the schema
const validUser = convert(input, UserSchema);
// Result: { id: 1, name: 'John Doe', email: 'john@example.com', active: true }
```

### Overriding Values

```typescript
import { z } from 'zod';
import { convert } from 'schemary';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
});

const input = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
};

// Provide missing fields as overrides
const validUser = convert(input, UserSchema, { role: 'admin' });
// Result: { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' }
```

### Arrays of Objects

```typescript
import { z } from 'zod';
import { convert } from 'schemary';

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const PeopleSchema = z.array(PersonSchema);

const input = [
  { name: 'Alice', age: 25, extraField: 'extra' },
  { name: 'Bob', age: 30 },
];

const validPeople = convert(input, PeopleSchema);
// Result: [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }]
```

### Union Types

```typescript
import { z } from 'zod';
import { convert } from 'schemary';

const AdminSchema = z.object({
  type: z.literal('admin'),
  id: z.number(),
  role: z.string(),
  accessLevel: z.number(),
});

const UserSchema = z.object({
  type: z.literal('user'),
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

// Define a discriminated union schema
const PeopleSchema = z.discriminatedUnion('type', [AdminSchema, UserSchema]);

// Input data for an admin
const adminInput = {
  type: 'admin',
  id: 1,
  role: 'superuser',
  accessLevel: 10,
  extraField: 'should be removed',
};

// Convert the input to conform to the union schema
const validAdmin = convert(adminInput, PeopleSchema);
// Result: { type: 'admin', id: 1, role: 'superuser', accessLevel: 10 }
```

### Cloning Objects

```typescript
import { clone } from 'schemary';

const original = {
  user: {
    name: 'John',
    profile: {
      age: 30,
      preferences: ['dark', 'compact']
    }
  }
};

const cloned = clone(original);
// Result: Deep copy of the original object
```

### Extracting Data

```typescript
import { z } from 'zod';
import { extract } from 'schemary';

const config = {
  database: {
    host: 'localhost',
    port: 5432,
    credentials: {
      username: 'admin',
      password: 'secret'
    }
  },
  server: {
    port: 3000
  }
};

// Extract and validate a specific part of the object
const dbCredentials = extract(
  config, 
  'database.credentials', 
  z.object({
    username: z.string(),
    password: z.string()
  })
);
// Result: { username: 'admin', password: 'secret' }
```

### Validating Request Parameters

```typescript
import { z } from 'zod';
import { requestParamsParser } from 'schemary';

const ParamsSchema = z.object({
  id: z.string(),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
});

const requestQuery = {
  id: '12345',
  page: '2', // Notice this is a string
};

try {
  const params = requestParamsParser(requestQuery, ParamsSchema);
  // Result: { id: '12345', page: 2, limit: 10 }
} catch (error) {
  // Handle validation error
  console.error(error.message);
}
```

### Working with JSON

```typescript
import { z } from 'zod';
import { jsonParse, jsonStringify } from 'schemary';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  active: z.boolean().default(true),
});

// Parse JSON string with validation
const jsonString = '{"id": 1, "name": "John", "email": "john@example.com"}';
const user = jsonParse(jsonString, UserSchema);
// Result: { id: 1, name: 'John', email: 'john@example.com', active: true }

// Convert object to JSON with validation
const obj = {
  id: 2,
  name: 'Alice',
  email: 'alice@example.com',
  extraField: 'will be removed'
};
const jsonOutput = jsonStringify(obj, UserSchema, null, 2);
// Result: Formatted JSON string without extraField
```

## Schema Mapping

Schemary provides powerful tools for mapping data between different schemas, making it easy to transform data from one structure to another.

### Basic Mapping

```typescript
import { z } from 'zod';
import { compile, MappingPlanRuleOrder } from 'schemary';

// Define schemas for left and right sides
const LeftSchema = z.object({
  id: z.number(),
  username: z.string(),
  dob: z.string(),
  age: z.number(),
  isActive: z.boolean().optional(),
});

const RightSchema = z.object({
  identifier: z.number(),
  user: z.string(),
  dateOfBirth: z.string(),
  yearsOld: z.number(),
  active: z.boolean().optional(),
  extraInfo: z.string(),
});

// Define mapping rules
const mappingRules = [
  { left: 'id', right: 'identifier' },
  { left: 'username', right: 'user' },
  { left: 'dob', right: 'dateOfBirth' },
  { left: 'age', right: 'yearsOld' },
  { left: 'isActive', right: 'active' },
  { literal: 'Additional information', right: 'extraInfo' },
];

// Compile the mapping plan
const plan = compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
});

// Source data
const leftData = {
  id: 123,
  username: 'johndoe',
  dob: '1990-01-15',
  age: 33,
  isActive: true,
};

// Map left to right
const rightData = plan.map(leftData);
// Result: {
//   identifier: 123,
//   user: 'johndoe',
//   dateOfBirth: '1990-01-15',
//   yearsOld: 33,
//   active: true,
//   extraInfo: 'Additional information'
// }

// Map right back to left
const backToLeft = plan.reverseMap(rightData);
// Result: {
//   id: 123,
//   username: 'johndoe',
//   dob: '1990-01-15',
//   age: 33,
//   isActive: true
// }
```

### Transforming Values During Mapping

```typescript
import { z } from 'zod';
import { compile } from 'schemary';

// Define schemas for left and right sides
const LeftSchema = z.object({
  dob: z.string().regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/),
});

const RightSchema = z.object({
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Define mapping rules with transformations
const mappingRules = [
  {
    left: 'dob',
    right: 'dob',
    // Transform to convert from MM/DD/YYYY to YYYY-MM-DD
    leftTransform: (mmddyyyy) => {
      const [month, day, year] = mmddyyyy.split('/');
      return `${year}-${month}-${day}`;
    },
    // Transform to convert from YYYY-MM-DD to MM/DD/YYYY
    rightTransform: (yyyymmdd) => {
      const [year, month, day] = yyyymmdd.split('-');
      return `${month}/${day}/${year}`;
    },
  },
];

// Compile the mapping plan
const plan = compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
});

// Source data in MM/DD/YYYY format
const leftData = { dob: '03/15/1990' };

// Map to YYYY-MM-DD format
const rightData = plan.map(leftData);
// Result: { dob: '1990-03-15' }

// Map back to MM/DD/YYYY format
const backToLeft = plan.reverseMap(rightData);
// Result: { dob: '03/15/1990' }
```

### Specifying Rule Order

```typescript
import { z } from 'zod';
import { compile, MappingPlanRuleOrder } from 'schemary';

// Define schemas and mapping rules...

// Compile with specific rule order
const plan = compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
  order: {
    toRight: MappingPlanRuleOrder.DESC, // Apply rules in reverse order for left-to-right mapping
    toLeft: MappingPlanRuleOrder.ASC,   // Apply rules in original order for right-to-left mapping
  },
});
```

## Timestamp Formatting

Schemary provides utilities for formatting timestamps between different formats.

```typescript
import { format, FormatShortNames } from 'schemary';

// Format a date string to different formats
const isoDate = '2023-01-15T14:30:45.078Z';

// Convert to Unix timestamp
const unixTimestamp = format(isoDate, FormatShortNames.UNIX);
// Result: '1673795445078' (milliseconds since epoch)

// Convert to RFC2822 format
const rfc2822Date = format(isoDate, FormatShortNames.RFC2822);
// Result: 'Sun, 15 Jan 2023 14:30:45 +0000'

// Convert to HTTP format
const httpDate = format(isoDate, FormatShortNames.HTTP);
// Result: 'Sun, 15 Jan 2023 14:30:45 GMT'

// Convert to SQL format
const sqlDate = format(isoDate, FormatShortNames.SQL);
// Result: '2023-01-15 14:30:45.078 Z'

// Custom format
const customFormat = format(isoDate, 'MM/dd/yyyy hh:mm a');
// Result: '01/15/2023 02:30 PM'
```

## Advanced Examples

### Complex Data Transformations

```typescript
import { z } from 'zod';
import { convert } from 'schemary';

// Define a complex schema with nested objects and arrays
const ComplexSchema = z.object({
  id: z.number(),
  user: z.object({
    profile: z.object({
      name: z.string(),
      contact: z.object({
        email: z.string().email(),
        phone: z.string().optional(),
      }),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark']).default('light'),
      notifications: z.boolean().default(true),
    }),
  }),
  permissions: z.array(
    z.object({
      resource: z.string(),
      actions: z.array(z.string()),
    })
  ).default([]),
});

// Input data with missing or extra fields
const complexInput = {
  id: 123,
  user: {
    profile: {
      name: 'John Doe',
      contact: {
        email: 'john@example.com',
        extraField: 'should be removed',
      },
      // preferences missing, will use defaults
    },
  },
  extraTopLevel: 'should be removed',
};

// Override values
const overrides = {
  permissions: [
    { resource: 'posts', actions: ['read', 'write'] },
    { resource: 'comments', actions: ['read'] },
  ],
};

// Convert with schema validation and overrides
const validComplex = convert(complexInput, ComplexSchema, overrides);
/* Result:
{
  id: 123,
  user: {
    profile: {
      name: 'John Doe',
      contact: {
        email: 'john@example.com'
      }
    },
    preferences: {
      theme: 'light',
      notifications: true
    }
  },
  permissions: [
    { resource: 'posts', actions: ['read', 'write'] },
    { resource: 'comments', actions: ['read'] }
  ]
}
*/
```

### API Request/Response Handling

```typescript
import { z } from 'zod';
import { jsonParse, convert, jsonStringify } from 'schemary';

// Define schema for API request
const RequestSchema = z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  action: z.string(),
});

// Define schema for API response
const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    userId: z.number(),
    message: z.string(),
  }).optional(),
  error: z.string().optional(),
});

// Create a request handler
async function handleRequest(requestBody) {
  try {
    // Parse and validate request JSON
    const request = jsonParse(requestBody, RequestSchema);

    // Process the request
    let response;
    if (request.action === 'register') {
      response = {
        success: true,
        data: {
          userId: 12345,
          message: `User ${request.user.name} registered successfully`,
        },
      };
    } else {
      response = {
        success: false,
        error: 'Invalid action',
      };
    }

    // Validate and stringify the response
    return jsonStringify(response, ResponseSchema);
  } catch (error) {
    // Handle validation errors
    const errorResponse = {
      success: false,
      error: error.message,
    };
    return jsonStringify(errorResponse, ResponseSchema);
  }
}

// Example usage
const requestBody = '{"user":{"name":"John","email":"john@example.com"},"action":"register"}';
const responseJson = await handleRequest(requestBody);
```

## More Information

For detailed information on advanced mapping capabilities, check out the [mapping documentation](https://github.com/BlueRival/schemary/tree/master/docs/mapping.md).

## License

MIT