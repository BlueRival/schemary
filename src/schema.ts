import {
  JSONType,
  JSONObject,
  JSONAny,
  JSONObjectArray,
  JSONArray,
  Primitive,
} from './types.js';
import {
  _shift,
  _generateErrorMessage,
  _getUnionErrorMessages,
  _isPrimitive,
  _isZodArray,
  clone as helperClone,
} from './helpers.js';
import {
  InputObjectSchema,
  InputArraySchema,
  NoInferPartial,
} from './types.js';
import { z } from 'zod';
import { extractValue } from './mapping/parser/utilities.js';
import { Parser } from './mapping/parser/core.js';

export const clone = helperClone;

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
  overrides: NoInferPartial<TargetType> | NoInferPartial<ArrayTargetType> = {},
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
      _shift(
        sourceObj,
        elementSchema,
        overrides as NoInferPartial<ArrayTargetType>,
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

  return _shift(source, scopedSchema, overrides as NoInferPartial<TargetType>);
}

/**
 * Parses and validates request parameters against a Zod targetSchema.
 *
 * This utility function validates incoming request parameters against a provided
 * Zod targetSchema and handles validation failures by throwing a standardized Error.
 *
 * @template T - The expected output type after validation
 * @param targetSchema - The Zod targetSchema to validate the parameters against
 * @param value - The unknown input parameters to validate (typically from a request)
 * @returns The validated and typed parameters of validation succeeds
 * @throws Error with detailed validation error messages if validation fails
 */
export function validate<TargetSchema extends z.ZodType<unknown, any, unknown>>(
  value: unknown,
  targetSchema: TargetSchema,
): z.infer<TargetSchema> {
  const result = targetSchema.safeParse(value);

  if (result.success) {
    return result.data;
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
 * Extracts and validates a portion of an source using a provided path and schema.
 *
 * This utility function navigates through a nested source structure using a dot notation path
 * or an array of keys, retrieves the value at that path, and validates it against the provided
 * Zod schema. It's designed to work on any source structure, not just configuration data.
 *
 * @param {JSONAny} source - The JSON source from which to extract the value.
 * @param {string} path - The path used to locate the value within the source.
 * @param {z.ZodType<JSONType>} schema - The schema to validate the extracted value against.
 * @param {Object} [options] - Additional options to process the extraction.
 * @param {NoInferPartial<JSONType>} [options.defaults] - Default values to merge into the extracted result if certain values are missing.
 * @param {NoInferPartial<JSONType>} [options.overrides] - Override values to take precedence after extraction. Replaces source value even if it exists.
 * @return {JSONType} - The value extracted from the source, after optional merging with defaults or overrides, and validated against the schema.
 */
export function extract<T extends z.ZodType<unknown, any, unknown>>(
  source: JSONAny,
  path: string,
  schema: T,
  options?: {
    defaults?: NoInferPartial<z.infer<T>> | Primitive;
    overrides?: NoInferPartial<z.infer<T>> | Primitive;
  },
): z.infer<typeof schema> {
  const parsedPath = new Parser(path).parsePath();

  let current = extractValue(source, parsedPath);

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
    // take all the defaults if no existing value
    if (current === undefined) {
      return schema.parse(options.defaults);
    }

    // any non-undefined primitive value makes defaults irrelevant
    if (_isPrimitive(current)) {
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
