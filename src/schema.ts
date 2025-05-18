import {
  JSONType,
  JSONObject,
  JSONAny,
  JSONObjectArray,
  JSONSchema,
  JSONArray,
} from './types.js';
import {
  _shift,
  _generateErrorMessage,
  _getUnionErrorMessages,
  _isPrimitive,
  _isZodArray,
} from './helpers.js';
import { InputObjectSchema, InputArraySchema, Overrides } from './types.js';
import { z } from 'zod';

export * as Mapping from './mapping.js';

/**
 * Shifts fields from a source object OR an array of source objects to the
 * target type(s) using Zod schema validation.
 *
 * Shift isn't the same as mapping because field names stay the same and all
 * values keep their encoding.
 *
 * A typical use case here is for wrapping and unwrapping nested types, that
 *
 * @template T - The target object type (or element type for arrays).
 * @template Schema - The specific Zod schema type (object or array).
 * @param source - The input object or array of objects to convert.
 * @param targetSchema - The Zod schema (object or array) to validate against.
 * @param overrides - Optional values to override fields in the target type T.
 * If a source is an array, overrides apply to each element.
 * @returns A validated object (T) or array of validated objects (T[]) based on the schema.
 * @throws Error for mismatched input/schema types (e.g., array input with object schema).
 * @throws ZodError if validation fails.
 */
export function shift<
  TargetType extends JSONObject, // TargetType is the object/element type
  ArrayTargetType extends JSONObject, // TargetType is the object/element type
  TargetSchema extends
    | InputObjectSchema<TargetType>
    | InputArraySchema<ArrayTargetType>,
>(
  source: JSONObject | JSONObjectArray,
  targetSchema: TargetSchema,
  overrides: Overrides<TargetType> | Overrides<ArrayTargetType> = {},
): z.infer<TargetSchema> {
  if (_isPrimitive(source)) {
    throw new Error('source must be an object or array of objects');
  }

  if (_isZodArray(targetSchema)) {
    if (!Array.isArray(source)) {
      throw new Error(
        'target schema is an array type but source is not an array',
      );
    }

    // we know this assertion is correct because of _isZodArray()
    const scopedSchema = targetSchema as InputArraySchema<ArrayTargetType>;

    const elementSchema: InputObjectSchema<ArrayTargetType> =
      scopedSchema.element;

    const result: ArrayTargetType[] = source.map((sourceObj) =>
      _shift(sourceObj, elementSchema, overrides as Overrides<ArrayTargetType>),
    );

    return scopedSchema.parse(result) as ArrayTargetType[];
  }

  if (Array.isArray(source)) {
    throw new Error(
      'target schema is not an array type but source is an array',
    );
  }

  // we know this assertion is correct because of _isZodArray()
  const scopedSchema = targetSchema as InputObjectSchema<TargetType>;

  return _shift(source, scopedSchema, overrides as Overrides<TargetType>);
}

/**
 * Parses and validates request parameters against a Zod targetSchema.
 *
 * This utility function validates incoming request parameters against a provided
 * Zod targetSchema and handles validation failures by throwing a standardized Error.
 *
 * @template T - The expected output type after validation
 * @param targetSchema - The Zod targetSchema to validate the parameters against
 * @param params - The unknown input parameters to validate (typically from a request)
 * @returns The validated and typed parameters of validation succeeds
 * @throws Error with detailed validation error messages if validation fails
 */
export function validate<
  TargetType extends JSONObject, // TargetType is the object/element type
  ArrayTargetType extends JSONObject, // TargetType is the object/element type
  TargetSchema extends
    | InputObjectSchema<TargetType>
    | InputArraySchema<ArrayTargetType>,
>(params: JSONType, targetSchema: TargetSchema): z.infer<TargetSchema> {
  const result = targetSchema.safeParse(params);

  if (result.success) {
    if (_isZodArray(targetSchema)) {
      // the safe parse call above ensures this is valid
      return result.data as ArrayTargetType[];
    } else {
      // the safe parse call above ensures this is valid
      return result.data as TargetType;
    }
  } else {
    const errorMessages = result.error.errors
      .flatMap((err) => {
        if (err.code === 'invalid_union' && err.unionErrors) {
          const messages: Record<string, boolean> = {};

          return err.unionErrors
            .flatMap((unionErr) => _getUnionErrorMessages(unionErr))
            .filter((message) => {
              if (messages[message]) {
                return false;
              }
              messages[message] = true;
              return true;
            })
            .join(' OR ');
        } else {
          return _generateErrorMessage(err.path, err.message);
        }
      })
      .join(', ');

    throw new Error(`error in request params: ${errorMessages}`);
  }
}

/**
 * Deep clones an input value and returns a typed clone.
 *
 * @template T - The type of the input and the returned cloned object
 * @param input - The input object to deep clone
 * @returns A deep-cloned and typed copy of the input object
 */
export function clone<T extends JSONType>(input: T): T {
  // attempt to optimize handling primitive values
  if (_isPrimitive(input)) return input;

  // we only clone JSON types, everything else is not valid
  try {
    JSONSchema.parse(input);
  } catch {
    throw new Error('clone only supports JSON types');
  }

  // one day, we will optimize, maybe, its probably fine
  return JSON.parse(JSON.stringify(input)) as T;
}

/**
 * Extracts and validates a portion of an object using a provided path and schema.
 *
 * This utility function navigates through a nested object structure using a dot notation path
 * or an array of keys, retrieves the value at that path, and validates it against the provided
 * Zod schema. It's designed to work on any object structure, not just configuration data.
 *
 * @template T - The expected output type after validation
 * @param object - The object to extract data from
 * @param path - A dot-separated string path (e.g., 'database.credentials.username') or an array of keys
 * @param schema - The Zod schema to validate the extracted value against
 * @param options
 * @returns The validated value of type T
 * @throws Error if the path doesn't exist in the object or if validation fails
 */
export function extract<T>(
  object: JSONAny,
  path: string | string[],
  schema: z.ZodType<T>,
  options?: {
    defaults?: Overrides<T>;
    overrides?: Overrides<T>;
  },
): T {
  // Convert the path to an array of keys if it's a string
  const keys = Array.isArray(path) ? path : path.split('.');

  // Navigate through the object to find the value at the specified path
  let current: JSONType = object; // current will walk the path through the JSON structure, so it needs a broader type

  const walkedPath: string[] = [];

  // walk the input object
  for (const part of keys) {
    walkedPath.push(part);

    // Ensure the current value is an object that can be indexed
    if (_isPrimitive(current)) {
      throw new Error(
        `Cannot access property of primitive at [${walkedPath.join('.')}]`,
      );
    }

    if (Array.isArray(current)) {
      if (!part.match(/^[0-9]+$/)) {
        throw new Error(`Expected array index at [${walkedPath.join('.')}]`);
      }

      const index = parseInt(part);

      if (index >= current.length || index < 0) {
        throw new Error(
          `Index out of range for array at [${walkedPath.join('.')}]`,
        );
      }

      current = current[index];
      continue;
    }

    // Check if the key exists in the current object
    if (!(part in current)) {
      if (options?.defaults) {
        current = options.defaults as JSONType; // we know this is the case because of how Overrides<> works
        break; // we are out of path, so the default becomes current
      }

      throw new Error(`Path ends at [${walkedPath.join('.')}]`);
    }

    // Move to the next level in the object
    current = current[part];
  }

  function merge(first: JSONType, second: JSONType): JSONType {
    // we don't try to merge primitives or dissimilar types, just keep the priority
    if (Array.isArray(first) !== Array.isArray(second) || _isPrimitive(first)) {
      return second;
    }

    if (Array.isArray(first)) {
      // we know its an array because of the Array.isArray() calls
      const scopedSecond = second as JSONArray;

      first = clone(first);

      first.splice(0, scopedSecond.length, ...scopedSecond);

      return first;
    } else {
      // we know they are both objects because of the Array.isArray() calls
      return {
        ...(first as JSONObject),
        ...(second as JSONObject),
      };
    }
  }

  if (options?.defaults) {
    if (_isPrimitive(options.defaults)) {
      // Whatever in current is fine, the only time a primitive overrides the
      // real value is if the path doesn't exist, and that is handled above
      // in the loop.
      return schema.parse(current);
    }

    // we know that Overrides<> is a partial of a JSONType
    // merge will push current into defaults
    current = merge(options.defaults as JSONType, current);
  }

  if (options?.overrides) {
    if (_isPrimitive(options?.overrides)) {
      return schema.parse(options?.overrides);
    }

    current = merge(current, options.overrides as JSONType);
  }

  return schema.parse(current);
}
