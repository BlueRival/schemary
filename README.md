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

## API Structure

Schemary organizes its functionality in a clean, namespaced structure:

- **Schema**: Core validation and transformation functions
- **Mapping**: Bidirectional schema mapping utilities
- **Formatters**: Utilities for formatting different data types
- **Type exports**: JSON and schema-related type definitions

## Schema Validation and Transformation

### Basic Usage

```typescript
import { z } from 'zod';
import { Schema } from 'schemary';

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

// Validate the input against the schema
const validUser = Schema.validate(input, UserSchema);
// Result: { id: 1, name: 'John Doe', email: 'john@example.com', active: true }
```

### Overriding Values

```typescript
import { z } from 'zod';
import { Schema } from 'schemary';

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
const validUser = Schema.validate(input, UserSchema, { role: 'admin' });
// Result: { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' }
```

### Arrays of Objects

```typescript
import { z } from 'zod';
import { Schema } from 'schemary';

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const PeopleSchema = z.array(PersonSchema);

const input = [
  { name: 'Alice', age: 25, extraField: 'extra' },
  { name: 'Bob', age: 30 },
];

const validPeople = Schema.validate(input, PeopleSchema);
// Result: [{ name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }]
```

### Union Types

```typescript
import { z } from 'zod';
import { Schema } from 'schemary';

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

// Validate the input against the union schema
const validAdmin = Schema.validate(adminInput, PeopleSchema);
// Result: { type: 'admin', id: 1, role: 'superuser', accessLevel: 10 }
```

### Cloning Objects

```typescript
import { Schema } from 'schemary';

const original = {
  user: {
    name: 'John',
    profile: {
      age: 30,
      preferences: ['dark', 'compact']
    }
  }
};

const cloned = Schema.clone(original);
// Result: Deep copy of the original object
```

### Extracting Data

```typescript
import { z } from 'zod';
import { Schema } from 'schemary';

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
const dbCredentials = Schema.extractPath(
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
import { Schema } from 'schemary';

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
  const params = Schema.parseParams(requestQuery, ParamsSchema);
  // Result: { id: '12345', page: 2, limit: 10 }
} catch (error) {
  // Handle validation error
  console.error(error.message);
}
```

### Working with JSON

```typescript
import { z } from 'zod';
import { Schema } from 'schemary';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  active: z.boolean().default(true),
});

// Parse JSON string with validation
const jsonString = '{"id": 1, "name": "John", "email": "john@example.com"}';
const user = Schema.parseJSON(jsonString, UserSchema);
// Result: { id: 1, name: 'John', email: 'john@example.com', active: true }

// Convert object to JSON with validation
const obj = {
  id: 2,
  name: 'Alice',
  email: 'alice@example.com',
  extraField: 'will be removed'
};
const jsonOutput = Schema.stringifyJSON(obj, UserSchema, null, 2);
// Result: Formatted JSON string without extraField
```

## Timestamp Formatting

Schemary provides utilities for formatting timestamps between different formats through the `Formatters.Timestamp` namespace.

```typescript
import { Formatters } from 'schemary';

// Format a date string to different formats
const isoDate = '2023-01-15T14:30:45.078Z';

// Convert to Unix timestamp
const unixTimestamp = Formatters.Timestamp.format(isoDate, Formatters.Timestamp.Format.UNIX);
// Result: '1673795445078' (milliseconds since epoch)

// Convert to RFC2822 format
const rfc2822Date = Formatters.Timestamp.format(isoDate, Formatters.Timestamp.Format.RFC2822);
// Result: 'Sun, 15 Jan 2023 14:30:45 +0000'

// Convert to HTTP format
const httpDate = Formatters.Timestamp.format(isoDate, Formatters.Timestamp.Format.HTTP);
// Result: 'Sun, 15 Jan 2023 14:30:45 GMT'

// Convert to SQL format
const sqlDate = Formatters.Timestamp.format(isoDate, Formatters.Timestamp.Format.SQL);
// Result: '2023-01-15 14:30:45.078 Z'

// Custom format
const customFormat = Formatters.Timestamp.format(isoDate, 'MM/dd/yyyy hh:mm a');
// Result: '01/15/2023 02:30 PM'
```

## Schema Mapping

Schemary provides powerful tools for mapping data between different schemas through the `Mapping` namespace.

### Overview

The schema mapping functionality consists of:

- **Mapping.compile**: A function that compiles mapping rules into a reusable mapping plan
- **MappingPlan**: A class representing a compiled mapping plan with methods for bidirectional data transformation
- **MappingRule**: A type defining the structure of mapping rules
- **Mapping.PlanRuleOrder**: An enum controlling the order in which rules are applied

### Mapping Rules

Mapping rules define relationships between fields in the left and right schemas:

```typescript
interface MappingRule {
  left?: string;               // Path to the field in the left schema
  right?: string;              // Path to the field in the right schema
  literal?: any;               // Literal value to use (when left or right is missing)
  leftTransform?: Function;    // Transform function for right-to-left mapping
  rightTransform?: Function;   // Transform function for left-to-right mapping
  format?: {                   // Format conversions (e.g., date formats)
    type: string;              // Formatter type (e.g., 'timestamp')
    left: string;              // Format for left value
    right: string;             // Format for right value
  };
}
```

Each rule can include:
- **Field paths**: Specify which fields to map between schemas
- **Transformations**: Functions to transform values during mapping
- **Literal values**: Default values to use when a field doesn't exist
- **Format specifications**: Automatic formatting for specific data types like timestamps

### Basic Mapping

```typescript
import { z } from 'zod';
import { Mapping, MappingRule } from 'schemary';

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
const mappingRules: MappingRule[] = [
  { left: 'id', right: 'identifier' },
  { left: 'username', right: 'user' },
  { left: 'dob', right: 'dateOfBirth' },
  { left: 'age', right: 'yearsOld' },
  { left: 'isActive', right: 'active' },
  { literal: 'Additional information', right: 'extraInfo' },
];

// Compile the mapping plan
const plan = Mapping.compile(mappingRules, {
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

### Using Format Field for Timestamp Conversion

The `format` field in mapping rules provides a convenient way to automatically convert formats such as timestamps between different representations during mapping. This is simpler than writing custom transform functions for common format conversions.

```typescript
import { z } from 'zod';
import { Mapping, MappingRule, Formatters } from 'schemary';

// Define schemas with different date formats
const LeftSchema = z.object({
  id: z.number(),
  name: z.string(),
  // MM/DD/YYYY format
  createdDate: z.string().regex(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/),
  // Unix timestamp (milliseconds)
  updatedAt: z.string(),
});

const RightSchema = z.object({
  id: z.number(),
  name: z.string(),
  // ISO 8601 format
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
  // HTTP date format
  lastModified: z.string(),
});

// Define mapping rules with format conversions
const mappingRules: MappingRule[] = [
  { left: 'id', right: 'id' },
  { left: 'name', right: 'name' },
  {
    left: 'createdDate',
    right: 'created',
    // Automatically convert between MM/DD/YYYY and ISO 8601 formats
    format: {
      type: 'timestamp', 
      left: 'MM/dd/yyyy',            // Left schema format (MM/DD/YYYY)
      right: Formatters.Timestamp.Format.ISO8601  // Right schema format (ISO 8601)
    }
  },
  {
    left: 'updatedAt',
    right: 'lastModified',
    // Automatically convert between Unix timestamp and HTTP date format
    format: {
      type: 'timestamp',
      left: Formatters.Timestamp.Format.UNIX,    // Left schema format (Unix timestamp)
      right: Formatters.Timestamp.Format.HTTP    // Right schema format (HTTP date)
    }
  }
];

// Compile the mapping plan
const plan = Mapping.compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
});

// Source data
const leftData = {
  id: 1001,
  name: 'Project Alpha',
  createdDate: '01/15/2023',         // MM/DD/YYYY format
  updatedAt: '1673795445078',        // Unix timestamp (milliseconds)
};

// Map left to right
const rightData = plan.map(leftData);
// Result: {
//   id: 1001,
//   name: 'Project Alpha',
//   created: '2023-01-15T00:00:00.000Z',           // ISO 8601 format
//   lastModified: 'Sun, 15 Jan 2023 14:30:45 GMT'  // HTTP date format
// }

// Map right back to left
const backToLeft = plan.reverseMap(rightData);
// Result: {
//   id: 1001,
//   name: 'Project Alpha',
//   createdDate: '01/15/2023',     // Back to MM/DD/YYYY format
//   updatedAt: '1673795445000'     // Back to Unix timestamp
// }
```

The `format` field supports:

1. **Predefined format shortcuts** using `Formatters.Timestamp.Format`:
   - `UNIX` - Unix timestamp (milliseconds since epoch)
   - `ISO8601` - ISO 8601 format (e.g., "2023-01-15T14:30:45.078Z")
   - `RFC2822` - RFC 2822 format (e.g., "Sun, 15 Jan 2023 14:30:45 +0000")
   - `HTTP` - HTTP date format (e.g., "Sun, 15 Jan 2023 14:30:45 GMT")
   - `SQL` - SQL date format (e.g., "2023-01-15 14:30:45.078 Z")

2. **Custom format strings** using Luxon's format tokens:
   - `yyyy-MM-dd` - Year-month-day (e.g., "2023-01-15")
   - `MM/dd/yyyy` - Month/day/year (e.g., "01/15/2023")
   - `dd.MM.yyyy HH:mm:ss` - Day.month.year hour:minute:second (e.g., "15.01.2023 14:30:45")

Using the `format` field is more convenient and less error-prone than writing custom transform functions for timestamp conversions.

### Transforming Values During Mapping

In this example, we transform boolean values to numbers (1/0) when mapping between schemas:

```typescript
import { z } from 'zod';
import { Mapping, MappingRule } from 'schemary';

// Define schemas for left and right sides
const LeftSchema = z.object({
  name: z.string(),
  isActive: z.boolean(),
});

const RightSchema = z.object({
  name: z.string(),
  status: z.number(), // Uses 1/0 instead of true/false
});

// Define mapping rules with transformations
const mappingRules: MappingRule[] = [
  { left: 'name', right: 'name' },
  { 
    left: 'isActive', 
    right: 'status',
    // Transform boolean to number (1/0) when mapping left to right
    rightTransform: (isActive: boolean): number => {
      return isActive ? 1 : 0;
    },
    // Transform number (1/0) to boolean when mapping right to left
    leftTransform: (status: number): boolean => {
      return status === 1;
    },
  },
];

// Compile the mapping plan
const plan = Mapping.compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
});

// Source data with boolean
const leftData = { name: 'John', isActive: true };

// Map to schema with number status
const rightData = plan.map(leftData);
// Result: { name: 'John', status: 1 }

// Map back to schema with boolean
const backToLeft = plan.reverseMap(rightData);
// Result: { name: 'John', isActive: true }

// Example with false/0
const inactiveUser = { name: 'Alice', isActive: false };
const rightInactive = plan.map(inactiveUser);
// Result: { name: 'Alice', status: 0 }
```

### Advanced Mapping Features

#### Field Navigation

Access object properties using dot notation or array indexing:

```typescript
const mappingRules: MappingRule[] = [
  // Simple field
  { left: 'user.name', right: 'userName' },
  
  // Array element access
  { left: 'users[0].name', right: 'firstUserName' },
  { left: 'users[-1].name', right: 'lastUserName' }, // Last element
  
  // Nested fields
  { left: 'profile.contact.email', right: 'userEmail' },
];
```

#### Specifying Rule Order

Control the order in which rules are applied:

```typescript
import { Mapping, MappingRule } from 'schemary';

// Define schemas and rules...

// Compile with specific rule order
const plan = Mapping.compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
  order: {
    toRight: Mapping.PlanRuleOrder.DESC, // Apply rules in reverse order for left-to-right mapping
    toLeft: Mapping.PlanRuleOrder.ASC,   // Apply rules in original order for right-to-left mapping
  },
});
```

- **ASC order** (default): Rules are applied in the order they are defined. Later rules can override earlier ones.
- **DESC order**: Rules are applied in reverse order. Earlier rules take precedence over later rules.

This is particularly useful when you have overlapping rules or complex transformations that depend on the order of application.

#### Providing Overrides During Mapping

You can override specific values during mapping:

```typescript
// Map with overrides
const result = plan.map(sourceData, {
  'targetField': 'overrideValue',  // Override the mapped value
});
```

Overrides are applied after all mapping rules, allowing you to provide custom values for specific fields regardless of the mapping rules.

#### Mapping Complex Structures

Mapping between deeply nested structures:

```typescript
import { z } from 'zod';
import { Mapping, MappingRule } from 'schemary';

const CustomerSchema = z.object({
  customerInfo: z.object({
    id: z.number(),
    name: z.object({
      first: z.string(),
      last: z.string(),
    }),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().optional(),
    }),
  }),
  orders: z.array(
    z.object({
      orderId: z.string(),
      items: z.array(z.string()),
    })
  ).optional(),
});

const UserSchema = z.object({
  userId: z.number(),
  fullName: z.string(),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  purchaseHistory: z.array(
    z.object({
      id: z.string(),
      products: z.array(z.string()),
    })
  ).optional(),
});

// Define mapping rules
const mappingRules: MappingRule[] = [
  { left: 'customerInfo.id', right: 'userId' },
  { 
    left: 'customerInfo.name', 
    right: 'fullName',
    // Combine first and last name into fullName
    rightTransform: (name) => `${name.first} ${name.last}`,
    // Split fullName into first and last name components
    leftTransform: (fullName) => {
      const parts = fullName.split(' ');
      return {
        first: parts[0],
        last: parts.slice(1).join(' '),
      };
    },
  },
  { left: 'customerInfo.contact.email', right: 'email' },
  { left: 'customerInfo.contact.phone', right: 'phoneNumber' },
  { left: 'orders', right: 'purchaseHistory', 
    rightTransform: (orders) => 
      orders?.map(order => ({ 
        id: order.orderId, 
        products: order.items 
      })),
    leftTransform: (history) => 
      history?.map(purchase => ({ 
        orderId: purchase.id, 
        items: purchase.products 
      })),
  },
];

// Compile the mapping plan
const plan = Mapping.compile(mappingRules, {
  leftSchema: CustomerSchema,
  rightSchema: UserSchema,
});

// Use the plan for mapping
const customer = {
  customerInfo: {
    id: 1001,
    name: { first: 'John', last: 'Doe' },
    contact: { email: 'john.doe@example.com', phone: '555-1234' }
  },
  orders: [
    { orderId: 'ORD-001', items: ['Product A', 'Product B'] }
  ]
};

const user = plan.map(customer);
/* Result:
{
  userId: 1001,
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phoneNumber: '555-1234',
  purchaseHistory: [
    { id: 'ORD-001', products: ['Product A', 'Product B'] }
  ]
}
*/
```

### Working with Literal Values

Provide default or fixed values for fields that don't exist in the source schema:

```typescript
import { z } from 'zod';
import { Mapping, MappingRule } from 'schemary';

const LeftSchema = z.object({
  username: z.string(),
  email: z.string().email(),
});

const RightSchema = z.object({
  userName: z.string(),
  emailAddress: z.string().email(),
  status: z.string(),
  createdAt: z.string(),
});

// Define mapping rules with literal values
const mappingRules: MappingRule[] = [
  { left: 'username', right: 'userName' },
  { left: 'email', right: 'emailAddress' },
  { literal: 'active', right: 'status' },  // Fixed value for right schema
  { literal: new Date().toISOString(), right: 'createdAt' },  // Dynamic value
];

// Compile the mapping plan
const plan = Mapping.compile(mappingRules, {
  leftSchema: LeftSchema,
  rightSchema: RightSchema,
});

// Source data
const leftData = {
  username: 'johndoe',
  email: 'john@example.com',
};

// Map left to right
const rightData = plan.map(leftData);
// Result: {
//   userName: 'johndoe',
//   emailAddress: 'john@example.com',
//   status: 'active',
//   createdAt: '2023-01-15T14:30:45.078Z' (timestamp)
// }
```

## Working with Types

Schemary provides convenient type definitions for JSON and schema operations:

```typescript
import { z } from 'zod';
import { Schema, JsonObject, SchemaOverrides } from 'schemary';

// Working with JSON types
function processData(data: JsonObject): JsonObject {
  // Process the data and return it
  return data;
}

// Working with schema overrides
function createWithDefaults<T>(
  input: JsonObject, 
  schema: z.ZodType<T>, 
  overrides: SchemaOverrides<T>
): T {
  return Schema.validate(input, schema, overrides);
}

// Example use
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  active: z.boolean().default(true)
});

const userData = { id: 1, name: 'Alice' };
const user = createWithDefaults(userData, UserSchema, { active: false });
// Result: { id: 1, name: 'Alice', active: false }
```

### Available Types

Schemary exports the following type definitions:

#### JSON Types
- `JsonType`: Any valid JSON value
- `JsonObject`: A JSON object with string keys
- `JsonArray`: A JSON array
- `JsonObjectArray`: An array of JSON objects
- `JsonAny`: Either a JSON object or array

#### Schema Types
- `SchemaOverrides<T>`: Type for providing overrides to schema validation
- `SchemaObjectInput<T>`: Type for object schema inputs
- `SchemaArrayInput<T>`: Type for array schema inputs

#### Mapping Types
- `MappingRule`: Type for mapping rule definition
- `MappingParams`: Type for mapping plan parameters
- `MappingPlan`: Class type for a compiled mapping plan

## Advanced Examples

### Complex Data Transformations

```typescript
import { z } from 'zod';
import { Schema } from 'schemary';

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
const validComplex = Schema.validate(complexInput, ComplexSchema, overrides);
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
import { Schema } from 'schemary';

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
    const request = Schema.parseJSON(requestBody, RequestSchema);

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
    return Schema.stringifyJSON(response, ResponseSchema);
  } catch (error) {
    // Handle validation errors
    const errorResponse = {
      success: false,
      error: error.message,
    };
    return Schema.stringifyJSON(errorResponse, ResponseSchema);
  }
}

// Example usage
const requestBody = '{"user":{"name":"John","email":"john@example.com"},"action":"register"}';
const responseJson = await handleRequest(requestBody);
```

## License

MIT
