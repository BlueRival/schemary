# JSON Schema Mapping

A flexible, bidirectional JSON transformation system that allows mapping between different JSON schemas using a simple
DSL (Domain Specific Language).

## Overview

This library allows you to define mappings between different JSON structures and transform data bidirectionally. It's
particularly useful for:

- Transforming API responses to internal data models
- Preparing internal data for API requests
- Data migration between different schema versions
- Adapting data between different parts of a system

## Basic Usage

```typescript
import { compile, map, Direction } from '../utils/schema/mapping/index.js';

// Define mappings
const mappings = [
  { left: 'user.firstName', right: 'person.given_name' },
  { left: 'user.lastName', right: 'person.family_name' },
  { left: 'user.age', right: 'person.age' },
  { left: 'user.verified', right: "'true'" } // Literal boolean value
];

// Compile the mappings
const plan = compile(mappings);

// Source data
const sourceData = {
  user: {
    firstName: 'John',
    lastName: 'Doe',
    age: 30
  }
};

// Transform left to right
const result = map(sourceData, plan, Direction.LeftToRight);
// Result:
// {
//   person: {
//     given_name: 'John',
//     family_name: 'Doe',
//     age: 30
//   },
//   verified: true  // Literal value is used
// }

// Transform right to left
const rightToLeftResult = map(result, plan, Direction.RightToLeft);
// Result is equivalent to original sourceData
```

## API

### `compile(mappings: RawMapping[]): MappingPlan`

Validates and compiles an array of raw mappings into a reusable mapping plan.

- `mappings`: Array of objects with `left` and `right` properties containing DSL path expressions

###
`map(source: JSONObject | JSONArray, mappingPlan: MappingPlan, direction?: Direction, overrides?: JSONObject): JSONObject | JSONArray`

Transforms data according to the mapping plan.

- `source`: Source object or array to transform
- `mappingPlan`: Compiled mapping plan
- `direction`: Direction of mapping (Direction.LeftToRight or Direction.RightToLeft, defaults to Direction.LeftToRight)
- `overrides`: Optional values to override in the result (takes precedence over mapped values)

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

You can specify a literal value by enclosing it in single quotes. The value inside must be valid JSON:

```typescript
// Boolean true
{ left: 'user.verified', right: "'true'" }

// Boolean false
{ left: 'user.active', right: "'false'" }

// String
{ left: 'user.status', right: "'\"active\"'" }

// Number
{ left: 'product.defaultQuantity', right: "'10'" }

// Null
{ left: 'user.middleName', right: "'null'" }

// Object
{ left: 'user.preferences', right: "'{\"theme\":\"dark\",\"notifications\":true}'" }

// Array
{ left: 'user.roles', right: "'[\"user\",\"admin\"]'" }
```

When mapping in one direction, if one side is a literal value, that value will always be used regardless of the source data. For example:

```typescript
const mappings = [
  { left: 'user.verified', right: "'true'" }
];

// When mapping left to right, the 'verified' field will always be 'true'
// regardless of whether 'user.verified' exists in the source
const result = map(source, compile(mappings), Direction.LeftToRight);
// { verified: true }

// When mapping right to left, there's no path to get data from on the right,
// so nothing is set for user.verified
const resultRightToLeft = map(rightSource, compile(mappings), Direction.RightToLeft);
// { user: {} }
```

### Bidirectional Array Mapping

The system supports bidirectional array mapping, including:

```typescript
// Simple array index mapping
{ left: 'users[0]', right: 'firstUser' }

// Array slice mapping
{ left: 'data[0].values[[0,2]]', right: 'firstValues' }

// Negative index mapping
{ left: 'data[-1].values', right: 'lastItemValues' }
```

When mapping from right to left (where the left side has array indices):
- For simple indices, the system creates the array if needed and sets the indexed value
- For array slices, the system creates the necessary structures and splices in values from the right side
- For negative indices, the system counts backward from the end of the array

For example, when mapping from `firstUser` to `users[0]`:
1. The system ensures `users` exists and is an array
2. It then sets `users[0]` to the value of `firstUser`

## Examples

### Basic Field Mapping

```typescript
const mappings = [
  { left: 'name', right: 'userName' },
  { left: 'email', right: 'userEmail' }
];

// Source (left schema)
const source = {
  name: 'Alice',
  email: 'alice@example.com'
};

// Mapped result (right schema)
const result = map(compile(mappings), source, Direction.LeftToRight);
// {
//   userName: 'Alice',
//   userEmail: 'alice@example.com'
// }
```

### Literal Values

```typescript
const mappings = [
  { left: 'user.name', right: 'userName' },
  { left: 'user.verified', right: "'true'" }, // Default boolean value
  { left: "'\"Unknown\"'", right: 'fallbackName' } // Default string value
];

// Source (left schema)
const source = {
  user: {
    name: 'Alice'
    // No verified field
  }
};

// Mapped result (right schema)
const result = map(source, compile(mappings), Direction.LeftToRight);
// {
//   userName: 'Alice',
//   verified: true  // Literal value
// }

// When mapping right to left
const sourceRight = {
  userName: 'Bob',
  fallbackName: 'Backup'
};

// The literal values will be used when mapping in their respective directions
const resultRightToLeft = map(sourceRight, compile(mappings), Direction.RightToLeft);
// {
//   user: {
//     name: 'Bob'
//   },
//   fallbackName: 'Unknown'  // Literal string from left side
// }
```

### Nested Object Mapping

```typescript
const mappings = [
  { left: 'user.contact.email', right: 'profile.emailAddress' },
  { left: 'user.contact.phone', right: 'profile.phoneNumber' }
];

// Source (left schema)
const source = {
  user: {
    contact: {
      email: 'john@example.com',
      phone: '555-1234'
    }
  }
};

// Mapped result (right schema)
const result = map(source, compile(mappings), Direction.LeftToRight);
// {
//   profile: {
//     emailAddress: 'john@example.com',
//     phoneNumber: '555-1234'
//   }
// }
```

### Array Mapping

```typescript
const mappings = [
  { left: 'users[0].name', right: 'firstUser' },
  { left: 'users[-1].name', right: 'lastUser' }
];

// Source (left schema)
const source = {
  users: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
    { name: 'Charlie', age: 35 }
  ]
};

// Mapped result (right schema)
const result = map(source, compile(mappings), Direction.LeftToRight);
// {
//   firstUser: 'Alice',
//   lastUser: 'Charlie'
// }
```

### Array Slicing

```typescript
const mappings = [
  { left: 'scores[[0,3]]', right: 'topScores' }
];

// Source (left schema)
const source = {
  scores: [100, 95, 90, 85, 80, 75]
};

// Mapped result (right schema)
const result = map(source, compile(mappings), Direction.LeftToRight);
// {
//   topScores: [100, 95, 90]
// }
```

### Mapping with Overrides

```typescript
const mappings = [
  { left: 'user.firstName', right: 'name' },
  { left: 'user.lastName', right: 'surname' }
];

// Source (left schema)
const source = {
  user: {
    firstName: 'John',
    lastName: 'Doe'
  }
};

// Override values
const overrides = {
  surname: 'Smith' // This takes precedence over mapping
};

// Mapped result with overrides
const result = map(source, compile(mappings), Direction.LeftToRight, overrides);
// {
//   name: 'John',
//   surname: 'Smith'  // From overrides, not from source
// }
```

## Complex Examples

### Nested Array Mapping

```typescript
const mappings = [
  { left: 'departments[0].employees[[0,2]].name', right: 'topEmployees' }
];

// Source (left schema)
const source = {
  departments: [
    {
      name: 'Engineering',
      employees: [
        { name: 'Alice', role: 'Developer' },
        { name: 'Bob', role: 'Designer' },
        { name: 'Charlie', role: 'Manager' },
        { name: 'Dave', role: 'Developer' }
      ]
    },
    {
      name: 'Marketing',
      employees: [
        { name: 'Eve', role: 'Manager' },
        { name: 'Frank', role: 'Specialist' }
      ]
    }
  ]
};

// Mapped result (right schema)
const result = map(source, compile(mappings), Direction.LeftToRight);
// {
//   topEmployees: ['Alice', 'Bob']
// }
```

### Incompatible Schema Structures

Some mappings might not work bidirectionally due to structural differences:

```typescript
const mappings = [
  { left: 'users[0]', right: 'firstUser' }
];

// Source (left schema)
const source = {
  users: [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 }
  ]
};

// Mapped result (right schema)
const result = map(source, compile(mappings), Direction.LeftToRight);
// {
//   firstUser: { name: 'Alice', age: 30 }
// }

// When mapping back, we lose the array structure
const mappedBack = map(result, compile(mappings), Direction.RightToLeft);
// {
//   users: { name: 'Alice', age: 30 }  // No longer an array!
// }
```

### Complex Array Transformations

```typescript
const mappings = [
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
const result = map(source, compile(mappings), Direction.LeftToRight);
// {
//   firstValues: [10, 20],
//   lastValues: [5, 15]
// }
```

## Limitations and Edge Cases

1. **Array/Object Type Mismatches**: Be careful when mapping between arrays and objects. The system will create the
   appropriate container type based on the path, but mapping back might not restore the original structure.

2. **Missing Intermediate Nodes**: The system will create missing intermediate objects and arrays as needed, but this
   might result in sparse arrays if indices are skipped.

3. **Complex Bidirectional Mappings**: Some complex transformations might not be perfectly reversible, especially when
   working with array slices or when fields are dropped during transformation.

4. **Performance with Large Datasets**: Complex mappings on very large datasets might be performance-intensive. Consider
   batching transformations for large datasets.

## Best Practices

1. Keep mappings as simple as possible for better maintainability.

2. Test bidirectional mappings to ensure they work as expected in both directions.

3. Validate that source data has the expected structure before mapping.

4. Use literal values wisely to provide defaults for fields that don't exist in one schema.

5. Consider using overrides for complex transformations that can't be expressed with simple path mappings.

6. **Break Down Large Nested Mappings**: Instead of creating very complex nested mappings, consider breaking them into smaller, more manageable layers. This improves readability, maintainability, and makes debugging easier.
