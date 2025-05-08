import { JSONObject, JSONObjectArray } from './types.js';

import { InputObjectSchema, InputArraySchema, Overrides } from './types.js';
import { z } from 'zod';
import { _isZodArray } from './helpers.js';
import { shift } from './schema.js';

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
export function parse<
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
    return shift(
      parsedJson,
      targetSchema as InputArraySchema<ArrayTargetType>,
      targetOverrides as Overrides<ArrayTargetType>,
    ) as ArrayTargetType[];
  } else {
    return shift(
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
export function stringify<
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
  const validatedObject = shift(input, targetSchema);

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
