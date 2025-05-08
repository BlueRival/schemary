import {
  z,
  ZodArray,
  ZodDiscriminatedUnion,
  ZodLazy,
  ZodObject,
  ZodType,
  ZodTypeAny,
  ZodUnion,
  ZodRecord,
} from 'zod';

import {
  Primitive,
  ZodLazyObjectSchemaDef,
  ZodObjectSchemaDef,
  ZodUnionSchemaDef,
  ZodDiscriminatedUnionDef,
  InputObjectSchema,
  Overrides,
  ZodLazyObjectSchemaDefPart,
} from './types.js';

import { JSONObject } from './types.js';

export function _isZodArray(schema: ZodTypeAny): boolean {
  return schema instanceof ZodArray;
}

/**
 * Determines if the provided schema is a Zod discriminated union.
 *
 * @param {ZodTypeAny} schema - The Zod schema to evaluate.
 * @return {boolean} Returns true if the schema is a Zod discriminated union, otherwise false.
 */
function _isZodDiscriminatedUnion(schema: ZodTypeAny): boolean {
  return (
    schema instanceof ZodDiscriminatedUnion &&
    'discriminator' in schema &&
    'optionsMap' in schema
  );
}

/**
 * Checks if the given schema is a ZodUnion type.
 *
 * @param {ZodTypeAny} schema - The schema to check.
 * @return {boolean} Returns true if the schema is a ZodUnion type; otherwise, false.
 */
function _isZodUnion(schema: ZodTypeAny): boolean {
  return schema instanceof ZodUnion && 'options' in schema;
}

/**
 * Validates if the provided schema is a ZodObject.
 *
 * @param {ZodTypeAny} schema - The schema to check.
 * @return {boolean} Returns true if the schema is an instance of ZodObject and has a 'strip' property, false otherwise.
 */
function _isZodObject(schema: ZodTypeAny): boolean {
  if (schema instanceof ZodObject && 'strip' in schema) {
    return true;
  }

  return schema instanceof ZodRecord;
}

/**
 * Determines if the provided schema is an instance of ZodLazy.
 *
 * @param {ZodTypeAny} schema - The schema to be checked.
 * @return {boolean} Returns true if the schema is an instance of ZodLazy, otherwise false.
 */
function _isZodLazyObject(schema: unknown): boolean {
  if (!(schema instanceof ZodLazy) && !(schema instanceof ZodType)) {
    return false;
  }
  if (!('schema' in schema)) {
    return false;
  }

  const unwrappedSchema = schema.schema as ZodObjectSchemaDef<any>;

  return _isZodObject(unwrappedSchema);
}

/**
 * Determines whether the provided value is a primitive type.
 *
 * @param {unknown} value - The value to check.
 * @return {boolean} True if the value is a primitive, otherwise false.
 */
export function _isPrimitive(value: unknown): value is Primitive {
  switch (value) {
    case undefined:
    case null:
    case true:
    case false:
      return true;
  }

  switch (typeof value) {
    case 'string':
    case 'number':
    case 'symbol':
    case 'bigint':
      return true;
  }

  return false;
}

/**
 * We loop through the union manually because targetSchema.strip() doesn't exist
 * on union types.
 */
function _shiftUnion<
  UnionTargetTypes extends JSONObject,
  TargetSchema extends ZodUnionSchemaDef<UnionTargetTypes>,
>(sourceObj: JSONObject, targetSchema: TargetSchema): z.infer<TargetSchema> {
  const schemas = targetSchema.options;

  const errors: string[] = [];
  let result: z.infer<TargetSchema> | null = null;

  // The first schema to succeed gets the type
  schemas.find((schema) => {
    // remove extra fields and validate
    const parse = schema.strip().safeParse(sourceObj);

    if (parse.error) {
      errors.push(parse.error.message);
      return false;
    } else {
      result = parse.data as z.infer<TargetSchema>;
      return true;
    }
  });

  if (result) {
    return result;
  }

  throw new Error(errors.join(', '));
}

/**
 * We loop through the union manually because targetSchema.strip() doesn't exist
 * on union types.
 */
function _shiftDiscriminatedUnion<
  DUnionTargetTypes extends JSONObject,
  TargetSchema extends ZodDiscriminatedUnionDef<DUnionTargetTypes>,
>(sourceObj: JSONObject, targetSchema: TargetSchema): DUnionTargetTypes {
  const discriminator = targetSchema.discriminator;
  const schemasMap = targetSchema.optionsMap;

  if (!(discriminator in sourceObj)) {
    throw new Error('missing discriminator field');
  }

  const discriminatorValue = sourceObj[discriminator];

  if (!_isPrimitive(discriminatorValue)) {
    throw new Error('discriminator value must be a primitive');
  }

  const schema = schemasMap.get(discriminatorValue);

  if (!schema) {
    throw new Error(`discriminator value not found: ${discriminatorValue}`);
  }

  // The above code validates that this is the correct type. That is the only
  // reason coercion is ok here.
  return schema.strip().parse(sourceObj) as unknown as DUnionTargetTypes;
}

/**
 * Records are a special kind of object that allows arbitrary keys. So we don't
 * call strip() on them.
 *
 * For normal objects, this function is just a wrapper around parse()
 */
function _shiftObject<
  ObjectTargetType extends JSONObject,
  TargetSchema extends ZodObjectSchemaDef<ObjectTargetType>,
>(sourceObj: JSONObject, targetSchema: TargetSchema): z.infer<TargetSchema> {
  if (targetSchema instanceof ZodRecord) {
    // records are objects that allow arbitrary keys, so nothing to strip
    return targetSchema.parse(sourceObj) as z.infer<TargetSchema>;
  }

  // The above parsing and validation ensures this is the correct type
  return targetSchema.strip().parse(sourceObj) as z.infer<TargetSchema>;
}

/**
 * The lazy object type hides the schema. Also, because of this bug:
 *
 * https://github.com/colinhacks/zod/issues/99?utm_source=chatgpt.com?utm_source=chatgpt.com
 *
 * ...Lazy objects are often typed with ZodType<Type> since infer<> doesn't work.
 */
function _shiftLazyObject<
  ObjectTargetType extends JSONObject,
  TargetSchema extends ZodLazyObjectSchemaDef<ObjectTargetType>,
>(sourceObj: JSONObject, targetSchema: TargetSchema): ObjectTargetType {
  // This function is gated by a run-time check in a parent function, so we know
  // all the type assertions are safe.
  const scopedSchema =
    targetSchema as ZodLazyObjectSchemaDefPart<ObjectTargetType>;

  // Get the underlying schema by calling the getter function
  const unwrappedSchema =
    scopedSchema.schema as ZodObjectSchemaDef<ObjectTargetType>;

  // Use the _shiftObject function with the unwrapped schema
  return _shiftObject(sourceObj, unwrappedSchema);
}

export function _shift<
  TargetType extends JSONObject, // TargetType is the object/element type
  TargetSchema extends InputObjectSchema<TargetType>,
>(
  sourceObj: JSONObject,
  targetSchema: TargetSchema,
  targetOverrides: Overrides<TargetType> = {},
): TargetType {
  // We just blindly mixin the overrides as the specific fields and values in
  // the resulting object are often part of the target schema selection, such as
  // union schema variations.
  const merged = { ...sourceObj, ...targetOverrides };

  if (_isZodUnion(targetSchema)) {
    // _isZodUnion validates the schema type cast
    return _shiftUnion(merged, targetSchema as ZodUnionSchemaDef<TargetType>);
  }

  if (_isZodDiscriminatedUnion(targetSchema)) {
    // _isZodDiscriminatedUnion validates the schema type cast
    return _shiftDiscriminatedUnion(
      merged,
      targetSchema as ZodDiscriminatedUnionDef<TargetType>,
    );
  }

  if (_isZodObject(targetSchema)) {
    // _isZodObject validates the schema type cast
    return _shiftObject(merged, targetSchema as ZodObjectSchemaDef<TargetType>);
  }

  if (_isZodLazyObject(targetSchema)) {
    // _isZodLazyObject validates the schema type cast
    return _shiftLazyObject(
      merged,
      targetSchema as ZodLazyObjectSchemaDef<TargetType>,
    );
  }

  throw new Error('unsupported schema type');
}

export function _getUnionErrorMessages(unionErr: z.ZodError): string[] {
  return unionErr.errors.map((unionSubErr) =>
    _generateErrorMessage(unionSubErr.path, unionSubErr.message),
  );
}

export function _generateErrorMessage(
  path: (string | number)[],
  message: string,
): string {
  return `[${path.join('.')} - ${message}]`;
}
