import {
  JSONType,
  JSONObject,
  JSONAny,
  JSONObjectArray,
  JSONSchema,
} from './types.js';
import {
  _convert,
  _generateErrorMessage,
  _getUnionErrorMessages,
  _isPrimitive,
  _isZodArray,
} from './helpers.js';
import { InputObjectSchema, InputArraySchema, Overrides } from './types.js';
import { z } from 'zod';

/**
 * Converts a source object OR an array of source objects to the target type(s)
 * using Zod schema validation.
 *
 * @template T - The target object type (or element type for arrays).
 * @template Schema - The specific Zod schema type (object or array).
 * @param source - The input object or array of objects to convert.
 * @param targetSchema - The Zod schema (object or array) to validate against.
 * @param targetOverrides - Optional values to override fields in the target type T.
 * If a source is an array, overrides apply to each element.
 * @returns A validated object (T) or array of validated objects (T[]) based on the schema.
 * @throws Error for mismatched input/schema types (e.g., array input with object schema).
 * @throws ZodError if validation fails.
 */
export function convert<
  TargetType extends JSONObject, // TargetType is the object/element type
  ArrayTargetType extends JSONObject, // TargetType is the object/element type
  TargetSchema extends
    | InputObjectSchema<TargetType>
    | InputArraySchema<ArrayTargetType>,
>(
  source: JSONObject | JSONObjectArray,
  targetSchema: TargetSchema,
  targetOverrides: Overrides<TargetType> | Overrides<ArrayTargetType> = {},
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
      _convert(
        sourceObj,
        elementSchema,
        targetOverrides as Overrides<ArrayTargetType>,
      ),
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

  return _convert(
    source,
    scopedSchema,
    targetOverrides as Overrides<TargetType>,
  );
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
export function requestParamsParser<
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
 * Parses a JSON string and validates it against a Zod schema.
 *
 * This function is NOT designed to parse JSON encoded primitives, only objects
 * or arrays.
 *
 * This function performs the following operations:
 *  - Attempts to parse the input string as JSON
 *  - Validates the parsed object against the provided Zod schema using convert()
 *  - Returns a fully validated object of the target type
 *
 * @template T - The target object type to convert to
 * @param input - The JSON string to parse
 * @param targetSchema - The Zod schema that defines and validates the target type
 * @param targetOverrides - Optional values to override fields in the target type.
 * @returns A validated object of type T with all required properties
 * @throws Will throw if the string is not valid JSON or if validation fails
 */
export function jsonParse<
  TargetType extends JSONObject, // TargetType is the object/element type
  ArrayTargetType extends JSONObject, // TargetType is the object/element type
  TargetSchema extends
    | InputObjectSchema<TargetType>
    | InputArraySchema<ArrayTargetType>,
>(
  input: string,
  targetSchema: TargetSchema,
  targetOverrides: Overrides<TargetType> | Overrides<ArrayTargetType> = {},
): z.infer<TargetSchema> {
  // Parse the JSON string. We don't know the type, but that is OK
  // because convert will type-check it.
  const parsedJson = JSON.parse(input) as JSONObject | JSONObjectArray;

  // Use convert to validate and transform the parsed JSON
  if (_isZodArray(targetSchema)) {
    return convert(
      parsedJson,
      targetSchema as InputArraySchema<ArrayTargetType>,
      targetOverrides as Overrides<ArrayTargetType>,
    ) as ArrayTargetType[];
  } else {
    return convert(
      parsedJson,
      targetSchema as InputObjectSchema<TargetType>,
      targetOverrides as Overrides<TargetType>,
    ) as TargetType;
  }
}

/**
 * Converts an object to a JSON string after validating it against a Zod schema.
 *
 * This function performs the following operations:
 *  - Validates the input object against the provided Zod schema using convert()
 *  - Converts the validated object to a JSON string
 *  - Returns the formatted JSON string
 *
 * @template T - The input object type to validate and stringify
 * @param input - The object to validate and stringify
 * @param targetSchema - The Zod schema that defines and validates the input type
 * @param replacer - Optional replacer function or array for JSON.stringify
 * @param space - Optional space parameter for JSON.stringify to format the output
 * @returns A JSON string of the validated object
 * @throws Will throw if validation fails
 */
export function jsonStringify<
  TargetType extends JSONObject, // TargetType is the object/element type
  ArrayTargetType extends JSONObject, // TargetType is the object/element type
  TargetSchema extends
    | InputObjectSchema<TargetType>
    | InputArraySchema<ArrayTargetType>,
>(
  input: JSONObject | JSONObjectArray,
  targetSchema: TargetSchema,
  replacer?:
    | ((this: any, key: string, value: any) => any)
    | (number | string)[]
    | null,
  space?: string | number,
): string {
  // Validate the input object against the schema
  const validatedObject = convert(input, targetSchema);

  /**
   * This is kind of a silly situation, `JSON.stringify()` has two options for the replacer type, the way it is defined
   * confuses linters and TypeScript validation. Writing it out this way makes linting and TypeScript validation work.
   *
   * That is one of the reasons we have this utility function. It keeps the
   * rest of the code clean and hides this kind of weird stuff in one place.
   * Also, of course, validating objects before producing JSON strings is nice
   * to do in one step.
   */

  if (Array.isArray(replacer) || replacer === null) {
    // Convert the validated object to a JSON string
    return JSON.stringify(validatedObject, replacer, space);
  }

  // Convert the validated object to a JSON string
  return JSON.stringify(validatedObject, replacer, space);
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
 * @param targetOverrides
 * @returns The validated value of type T
 * @throws Error if the path doesn't exist in the object or if validation fails
 */
export function extract<T>(
  object: JSONAny,
  path: string | string[],
  schema: z.ZodType<T>,
  targetOverrides?: Overrides<T>,
): T {
  // Convert the path to an array of keys if it's a string
  const keys = Array.isArray(path) ? path : path.split('.');

  // Navigate through the object to find the value at the specified path
  let current: JSONType = object; // current will walk the path through the JSON structure, so it needs a broader type

  const walkedPath: string[] = [];

  // walk the input object
  for (const part of keys) {
    // Ensure the current value is an object that can be indexed
    if (_isPrimitive(current)) {
      throw new Error(
        `Cannot access property '${part}' of primitive at [${walkedPath.join('.')}]`,
      );
    }

    if (Array.isArray(current)) {
      if (!part.match(/^[0-9]+$/)) {
        throw new Error(
          `Cannot access array index '${part}' of an array at [${walkedPath.join('.')}]`,
        );
      }

      const index = parseInt(part);

      if (index >= current.length || index < 0) {
        throw new Error(
          `Index '${index}' out of range for array at [${walkedPath.join('.')}]`,
        );
      }

      current = current[index];
      continue;
    }

    // Check if the key exists in the current object
    if (!(part in current)) {
      throw new Error(
        `Key part '${part}' not found in path [${walkedPath.join('.')}]`,
      );
    }

    // Move to the next level in the object
    current = current[part];
    walkedPath.push(part);
  }

  if (targetOverrides) {
    if (_isPrimitive(targetOverrides)) {
      return schema.parse(targetOverrides);
    }

    if (typeof current !== 'object' || current === null) {
      throw new Error(
        `Can not override non-object target at path [${keys.join('.')}]`,
      );
    }

    current = { ...current, ...targetOverrides };
  }

  return schema.parse(current);
}
