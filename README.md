# Schemary

[![CI](https://github.com/BlueRival/schemary/workflows/CI/badge.svg)](https://github.com/BlueRival/schemary/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/BlueRival/schemary/graph/badge.svg)](https://codecov.io/gh/BlueRival/schemary)

A powerful, type-safe schema validation, transformation, and bidirectional mapping library for TypeScript & JavaScript.

## Major Release: v1.0

Schemary has been completely rewritten from the ground up! After over 10 years as a pre-v1 library, **version 1.0**
represents a total overhaul with dramatically expanded capabilities. This is not an incremental update—it's an entirely
new, far more powerful library.

## What Makes Schemary Special

- **Bidirectional Mapping**: Transform data structures in both directions with a single configuration
- **Advanced Path Navigation**: Powerful syntax for array slicing, negative indexing, and nested field access
- **Type Safety**: Full TypeScript support with runtime validation via Zod schemas
- **Schema Transformation**: Shift data between different object shapes while preserving encoding
- **Immutable Operations**: All operations return new data without side effects
- **High Performance**: Compiled mapping plans for efficient repeated transformations

## Installation

```bash
npm install schemary --save
```

Optional, if you will be using any Zod schema transformations, v3 recommended:

```bash
npm install zod@3 --save
```

Optional, if you will be using any timestamp transformations in mappings, v3 recommended:

```bash
npm install luxon@3 --save
```

**ESM Only**: Schemary is an ESM-only package. Your project needs `"type": "module"` in `package.json` or use `.mjs`
files.

## Quick Start

### 1. Validate input data

```typescript
import { Schema } from 'schemary';
import { z } from 'zod';

// Define schemas
export const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});

export type User = z.infer<typeof UserSchema>;

function processUser(user: User): void {
  const userValidated = Schema.validate(user, UserSchema);
}
```

### 2. Extract nested data with defaults

```typescript
import { Schema, Types } from 'schemary';
import { z } from 'zod';

const NotificationsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
}).strict();

const data: Types.JSON = {
  firstName: 'Ricky',
  lastName: 'Bobby',
  email: 'rbobby@wonderbread.com',
  phone: '103-555-2662',
  preferences: {
    notifications: {
      email: true,
      sms: true,
    },
  },
};

// Overrides and defaults at extract()
const settings = Schema.extract(data, 'user.preferences.notifications', NotificationsSchema, {
  defaults: { email: true, sms: false },
});

enum DatabaseMode {
  READ = 'read-only',
  WRITE = 'write-only',
  DUPLEX = 'duplex'
}

// Define schemas with defaults
const DatabaseConfigSchema = z.object({
  host: z.string(),
  mode: z.nativeEnum(DatabaseMode).default(DatabaseMode.DUPLEX),
  port: z.number().min(1).default(3000),
  tls: z.boolean().default(true),
}).strict();

const mainDatabaseConfig = Schema.extract(config, 'databases.main', DatabaseConfigSchema);
const metricsDatabaseConfig = Schema.extract(config, 'databases.metrics', DatabaseConfigSchema);
```

### 3. Process JSON strings

```typescript
import { JSON, Schema, Types } from 'schemary';
import { z } from 'zod';

// Define schemas
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});

type User = z.infer<typeof UserSchema>;

const ParamsSchema = z.object({
  id: z.string(),
});

@POST()
async function userUpdate(@Body() postBody: string): void {
  const userValidated = JSON.parse(postBody, UserSchema);
}

@GET()
async function userGet(@Params params: Types.JSON): User {
  const requestParams = Schema.validate(params, ParamsSchema);

  const user = await userModel.get(requestParams.id);

  // Pretty format output and validate schema at same time
  return JSON.stringify(user, UserSchema, null, 2);
}
```

### 4. Shift schema to add/remove fields without full mapping definition

```typescript
import { Schema, Types } from 'schemary';
import { z } from 'zod';

enum EventType {
  USER_UPDATE = 'user-update',
  INSURANCE_UPDATE = 'insurance-update',
}

// Define schemas
const EventSchema = z.object({
  type: z.nativeEnum(EventType),
  data: Types.Schema,
});

type Event = z.infer<typeof EventSchema>;

const HandlerRequestSchema = z.object({
  data: Types.Schema,
});

async function router(event: Event): Promise<Types.JSON> {
  const handler = await broker.get(event.type);
  const request = Schema.shift(event, HandlerRequestSchema);
  return handler.request(request);
}
```

### 5. Create bidirectional mappings between dissimilar schemas

```typescript
import { Schema, Mapping } from 'schemary';
import { z } from 'zod';

// Define schemas
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number(),
});

const ProfileSchema = z.object({
  fullName: z.string(),
  contactEmail: z.string(),
  yearsOld: z.number(),
  isActive: z.boolean(),
});

const plan = Mapping.compilePlan({
  leftSchema: UserSchema,
  rightSchema: ProfileSchema,
  rules: [
    { left: 'name', right: 'fullName' },
    { left: 'email', right: 'contactEmail' },
    { left: 'age', right: 'yearsOld' },
    { literal: true, right: 'isActive' },
  ],
});

// Transform in both directions
const profile = plan.map(user);
const backToUser = plan.reverseMap(profile);
```

### 6. Create strongly-typed defaults and override parameters

```typescript
import { Types } from 'schemary';

class AbstractDatabaseStorage<T> {
  // When .save() is called with defaults, TypeScript won't infer the type of T from the 
  // defaults, which will likely be incomplete. It will infer it from record, which is correct.
  public async save<T>(record: T, defaults?: Types.Partial<T>): Promise<string> {
    // Implementation here
  }
}
```

## Core Modules

### Types Module

Export namespace for TypeScript types representing JSON data structures and utility types.

These types are useful for creating abstract, generic libraries designed to handle arbitrary data without concern for
specific underlying data structures.

**Available Types:**

- `Types.Primitive` - String, number, boolean, null, undefined
- `Types.JSON` - Any valid JSON value or structure, recursively: object of fields, array of objects, array of
  primitives, etc.
- `Types.Schema` - Zod schema for Types.JSON
- `Types.Object` - JSON structure with Object root: { string: Types.JSON, ... }
- `Types.ObjectSchema` - Zod schema for Types.Object
- `Types.Array` - JSON structure with Array root: Types.JSON[]
- `Types.ArraySchema` - Zod schema for Types.Array
- `Types.ArrayOfObjects` - JSON structure: Types.Object[]
- `Types.ArrayOfObjectSchema` - Zod schema for arrays of objects
- `Types.Any` - Any JSON-compatible non-primitive root (object/array): Types.Object | Types.Array | Types.ArrayOfObjects
- `Types.AnySchema` - Zod schema for Types.Any
- `Types.Partial<T>` - Type for partial object overrides and defaults that will not allow inferring type from T
- `Types.NoInfer<T>` - Utility type to prevent TypeScript inference of type T with generics

### Schema Module

#### `Schema.validate(data, schema)`

Validates data against a Zod schema with detailed error messages. While `z.parse()` does this, the Schemary error
messages are more conducive for error logs and API responses.

```typescript
const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

try {
  const validUser = Schema.validate(userData, UserSchema);
  console.log('Valid user:', validUser);
} catch (error) {
  console.error('Validation failed:', error.message);
  // Returns detailed field-level error messages
}
```

#### `Schema.shift(source, targetSchema, overrides?)`

Shifts between overlapping object structures by preserving overlapping fields and adding/removing others:

```typescript
// Source schema has: { name, email, age, extraField }
const sourceData = {
  name: 'John',
  email: 'john@example.com',
  age: 30,
  extraField: 'will be removed'
};

// Target schema has: { name, email, isActive }
const TargetSchema = z.object({
  name: z.string(),
  email: z.string(),
  isActive: z.boolean().default(true)
});

// Shift preserves overlapping fields (name, email) 
// and applies target schema (removes age/extraField, adds isActive)
const result = Schema.shift(sourceData, TargetSchema);
// Result: { name: 'John', email: 'john@example.com', isActive: true }

// Add overrides for missing or replacement fields
const withOverrides = Schema.shift(sourceData, TargetSchema, {
  isActive: false
});
// Result: { name: 'John', email: 'john@example.com', isActive: false }
```

Perfect for transforming between API schemas that share common fields but have different required/optional properties.

#### `Schema.extract(object, path, schema, options?)`

Extracts data from nested structures with sophisticated path support. Excellent for extracting configuration from a
larger structure, or nested parameters, etc.

```typescript
// With defaults and overrides
const mainDatabaseConfig = Schema.extract(config, 'database.main', DatabaseSchema, {
  defaults: { host: 'localhost', port: 5432 },
  overrides: { ssl: true },
});
```

#### `Schema.clone(data)`

Creates deep, immutable clones of JSON-compatible data, preserving type.

```typescript
const original = { user: { name: 'John', tags: ['admin', 'user'] } };
const copy = Schema.clone(original);

copy.user.name = 'Jane';
copy.user.tags.push('editor');

console.log(original.user.name); // Still 'John'
console.log(original.user.tags); // Still ['admin', 'user']
```

#### `Schema.jsonParse(jsonString, schema, overrides?)`

Parses JSON strings with schema validation:

```typescript
const UserSchema = z.object({
  name: z.string(),
  email: z.string(),
  age: z.number().default(25),
});

const user = Schema.jsonParse('{"name":"John","email":"john@example.com"}', UserSchema);
// Result: { name: 'John', email: 'john@example.com', age: 25 }
```

### JSON Module

#### `JSON.stringify(data, schema, replacer?, space?)`

Stringifies data with schema validation:

```typescript
import { JSON } from 'schemary';

const UserSchema = z.object({
  name: z.string(),
  email: z.string(),
  age: z.number(),
});

const userString = JSON.stringify(userData, UserSchema, null, 2);
```

### Mapping Module

Creates powerful bidirectional transformations between different data structures.

#### `Mapping.compilePlan(config)`

Compiles a reusable mapping plan:

```typescript
import { Mapping } from 'schemary';

const plan = Mapping.compilePlan({
  leftSchema: SourceSchema,
  rightSchema: TargetSchema,
  rules: [
    // Simple field mapping
    { left: 'user.firstName', right: 'person.givenName' },

    // Array element access
    { left: 'addresses[0].street', right: 'primaryAddress' },

    // Literal values
    { literal: 'v2.0', right: 'apiVersion' },

    // Transform functions
    {
      left: 'user.active',
      right: 'person.isActive',
      transform: {
        toRight: (active: number): boolean => active === 1,
        toLeft: (isActive: boolean): number => isActive ? 1 : 0,
      },
    },

    // Timestamp formatting using predefined formats or any valid Luxon format token
    // See: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
    {
      left: 'createdAt',
      right: 'created',
      format: {
        type: Mapping.FormatType.TIMESTAMP,
        toLeft: Mapping.Formatting.TimeStamp.ISO8601, // '2025-01-15T14:30:45.078Z'
        toRight: Mapping.Formatting.TimeStamp.HTTP, // 'Wed, 15 Jan 2025 14:30:45 GMT'
      },
    },
  ],

  // Rule execution order (default: ASC)
  order: {
    toLeft: Mapping.PlanRuleOrder.DESC,
    toRight: Mapping.PlanRuleOrder.ASC,
  },
});

// Execute transformations
const targetData = plan.map(sourceData);
const backToSource = plan.reverseMap(targetData, {
  // Override specific fields
  user: { status: 'active' },
});
```

## Advanced Path Navigation

Schemary supports sophisticated path expressions for accessing nested data:

### Basic Object Navigation

```typescript
'user.profile.settings.theme'
'company.employees.benefits'
```

### Array Access

```typescript
'users[0]'              // First element
'users[-1]'             // Last element  
'users[2].name'         // Third user's name
'matrix[1][0]'          // Multi-dimensional arrays
```

### Array Slicing

`[[x,y]]` where `x` is the start index and `y` is the size:

```typescript
'users[[0]]'            // From start (all elements)
'users[[2]]'            // From index 2 to end
'users[[1,3]]'          // Elements 1, 2 and 3 (size 3)
'users[[-2]]'           // Last 2 elements, in forward order
'users[[-2,-2]]'        // Last two items, in reverse order
```

### Complex Nested Operations

```typescript
// Transform first 3 users, taking only their most recent order
'users[[0,3]].orders[-1]';

// Extract items from the first order of each user
'users[[0]].orders[0].items';

// Top item, from most recent 3 orders from top 3 users  
// Assuming users sorted from highest value to lowest, and orders sorted from oldest to newest
'users[[0,3]].orders[[-3,3]].items[[0,1]]';

// Field selection from objects, grabs all the specified fields in one rule, copying them to the target
'users[0].{id,name,email}';
```

### Escaped Field Names

```typescript
'data.\\[field\\.with\\.dots\\]'     // Field named "[field.with.dots]"
'object.\\[special\\]\\.property'    // Field named "[special].property"
```

## Advanced Features

### Union Type Support

```typescript
// Discriminated unions
const UserTypeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('admin'), permissions: z.array(z.string()) }),
  z.object({ type: z.literal('user'), tier: z.string() })
]);

const user = Schema.validate(data, UserTypeSchema);
const shifted = Schema.shift(user, TargetSchema);

// Regular unions
const FlexibleSchema = z.union([StringSchema, NumberSchema, ObjectSchema]);
```

### Recursive/Lazy Schemas

```typescript
type TreeNode = {
  value: string;
  children?: TreeNode[];
};

const TreeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    value: z.string(),
    children: z.array(TreeSchema).optional()
  })
);

const tree = Schema.validate(treeData, TreeSchema);
const extracted = Schema.extract(tree, 'children[0].children[1].value', z.string());
```

### Complex Mapping Scenarios

```typescript
const complexPlan = Mapping.compilePlan({
  leftSchema: OrdersSchema,
  rightSchema: ReportSchema,
  rules: [
    // Map all users but only their last 3 orders  
    {
      left: 'customers[[0]].orders[[-3]]',
      right: 'recentActivity',
    },

    // Transform arrays with custom functions
    {
      left: 'items',
      right: 'productSummary',
      transform: {
        toRight: (items: Item[]) => items.map(item => ({
          id: item.id,
          revenue: item.price * item.quantity,
        })),
        toLeft: (summary: ProductSummary[]) =>
          summary.map(s => ({ id: s.id, price: s.revenue, quantity: 1 })),
      },
    },

    // Multiple timestamp formats
    {
      left: 'orderDate',
      right: 'created',
      format: {
        type: Mapping.FormatType.TIMESTAMP,
        toLeft: 'yyyy-MM-dd HH:mm:ss',
        toRight: Mapping.Formatting.TimeStamp.RFC2822,
      },
    },
  ],
});
```

### Error Handling

Schemary provides detailed, actionable error messages:

```typescript
try {
  const result = Schema.validate(data, schema);
} catch (error) {
  console.error('Validation errors:', error.message);
  // Example output:
  // "error in request params: user.email Expected string, received number, 
  //  user.age Expected number greater than 0, received -5"
}

try {
  const extracted = Schema.extract(data, 'invalid[path', schema);
} catch (error) {
  console.error('Path error:', error.message);
  // "Parse error at position 12: Expected closing bracket ']', got end of input"
}
```

## Use Cases

### API Request/Response Transformation

```typescript
// Transform API responses to internal models
const plan = Mapping.compilePlan({
  leftSchema: APIResponseSchema,
  rightSchema: InternalModelSchema,
  rules: [
    { left: 'data.user_info.full_name', right: 'user.name' },
    { left: 'data.user_info.email_address', right: 'user.email' },
    {
      left: 'meta.created_timestamp',
      right: 'createdAt',
      format: {
        type: Mapping.FormatType.TIMESTAMP,
        toLeft: Mapping.Formatting.TimeStamp.UNIX,
        toRight: Mapping.Formatting.TimeStamp.ISO8601
      }
    }
  ]
});
```

### Configuration Management

```typescript
// Extract environment-specific configuration
const dbConfig = Schema.extract(config, 'environments.production.database', DatabaseSchema, {
  defaults: {
    host: 'localhost',
    port: 5432,
    ssl: false
  },
  overrides: {
    ssl: process.env.NODE_ENV === 'production'
  }
});
```

### Data Migration

```typescript
// Transform legacy data structures
const migrationPlan = Mapping.compilePlan({
  leftSchema: LegacySchema,
  rightSchema: NewSchema,
  rules: [
    { left: 'old_field_name', right: 'newFieldName' },
    { left: 'nested.deep.value', right: 'flatValue' },
    { literal: true, right: 'migrated' }
  ]
});

const migratedData = migrationPlan.map(legacyData);
```

## Ecosystem

- **[Zod](https://zod.dev/)**: Runtime schema validation (peer dependency)
- **[Luxon](https://moment.github.io/luxon/)**: Timestamp processing and formatting

## License

MIT

## Contributing

We welcome contributions! Schemary is open source and benefits from community involvement.

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/schemary.git
   cd schemary
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up your development environment**:
    - Node.js 22.14.0 or higher required
    - This project uses ESM modules exclusively
    - TypeScript with strict mode enabled

### Development Workflow

**Available Scripts:**

```bash
npm run build    # Compile TypeScript to dist/
npm run test     # Run all tests with coverage
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
npm run clean    # Remove dist/ directory
```

**Before submitting:**

```bash
npm run lint && npm run test && npm run build
```

This is also run automatically by the `prepublishOnly` script.

### Code Standards

**Coding Priorities (in order of precedence):**

1. **Clarity and Minimal Complexity**
    - Code should be self-explanatory without comments
    - Comments, if used, explain WHY, never WHAT
    - Any function should be understandable within 30-60 seconds
    - Functions should not exceed screen height
    - Avoid nested object/array destructuring (especially without runtime type checking)
    - Each statement should do no more than 1-2 things plus assignment/return
    - No "hipster" shortcuts that sacrifice clarity for brevity
    - Break code into clean, focused functions
    - Consideration for run-time complexity (CPU and memory) is more important than code style, but not by much.

2. **SOLID Principles**

3. **Clean Code by Robert C. Martin** (excluding DRY, see #5)
    - Meaningful names
    - Small functions
    - Clear structure
    - Minimal side effects

4. **Functional Programming**
    - Prefer immutable operations
    - Use pure functions where possible
    - Avoid mutations
    - Except: Don't blindly prioritize recursion over loops. Use recursion when it makes logic simpler. Use loops when
      the iteration count is unbound/unknown or it makes logic simpler.

5. **DRY Principles** (Don't Repeat Yourself)
    - As long as it doesn't conflict with any of the above principles. Simple, but repeated code is better than overly
      complex, DRY code.
    - Eliminate code duplication
    - Extract common patterns
    - Create reusable abstractions

**Technical Requirements:**

- **TypeScript**: All code must be strongly typed
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Code formatting is enforced
- **Tests**: Maintain or improve test coverage
- **Immutability**: All operations should be immutable
- **Documentation**: Update README for new features

### Testing Philosophy

Schemary uses a layered testing approach:

- **Unit tests**: Test individual functions and classes
- **Integration tests**: Test module interactions, and assembly of lower-level functionality, not the lower level
  functionality itself.

### Submitting Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write tests first** for new functionality

3. **Implement your changes** following the existing patterns

4. **Update documentation** if needed

5. **Commit with descriptive messages**:
   ```bash
   git commit -m "feat: add advanced array slicing support"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

### Pull Request Guidelines

- **Clear title and description**
- **Reference related issues** if applicable
- **Include tests** for new functionality
- **Update documentation** as needed
- **Ensure CI passes** (tests, linting, build)

### Reporting Issues

When reporting bugs or requesting features:

- Check existing issues first
- Use the GitHub issue templates
- Provide minimal reproduction examples
- Provide expected results
- Provide actual results
- Include relevant environment details

### Community

- **Be respectful** you can disagree, but keep the hits above the belt.
- **Help others** learn and contribute
- **Follow our code of conduct**

Thank you for contributing to Schemary! 🚀

# Important Releases

**Schemary v1.0.1** - Documentation update.

**Schemary v1.0** - From simple validation to complex bidirectional transformations. Built for modern TypeScript
applications.