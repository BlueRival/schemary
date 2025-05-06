import {
  ZodArray,
  ZodDiscriminatedUnion,
  ZodObject,
  ZodTypeAny,
  ZodType,
  ZodUnion,
  ZodLazy,
  ZodTypeDef,
  z,
} from 'zod';

export type Primitive =
  | string
  | number
  | symbol
  | bigint
  | boolean
  | null
  | undefined;

/**
 * A Zod schema that can handle any JSON structure, including nested data types.
 *
 * We define this natively and then build a Zod schema off of it because the recursion needs to load lazily, and the
 * compiler just doesn't work unless we do it this way.
 */
export type JSONType =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONType[]
  | { [key: string]: JSONType };

// We define this twice because of issues with the compiler. See notes on JSONType.
export const JSONSchema: z.ZodType<JSONType> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JSONSchema),
    z.record(JSONSchema),
  ]),
);

export const JSONObjectSchema = z.record(JSONSchema);
export const JSONArraySchema = z.array(JSONSchema);
export const JSONObjectArraySchema = z.array(JSONObjectSchema);
export const JSONAnySchema = z.union([
  JSONObjectSchema,
  JSONArraySchema,
  JSONObjectArraySchema,
]);

// Any JSON that the root is an object. Values within the object may be primitives
export type JSONObject = z.infer<typeof JSONObjectSchema>;

// Any JSON that the root is an array, and the contents are JSON objects. Values within the objects may be primitives
// the Same as JSONArray except entries can only be objects
export type JSONObjectArray = z.infer<typeof JSONObjectArraySchema>;

// Any JSON that the root is an array. Array can be any JSON type values, including primitives
export type JSONArray = z.infer<typeof JSONArraySchema>;

// Different from JSONType, JSONAny is a union of JSONArray, JSONObject and JSONObjectArray.
// Essentially, this type requires the root to be an Object or Array
export type JSONAny = z.infer<typeof JSONAnySchema>;

// allows dynamic partials for defaults and overrides
export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Overrides<T> = Partial<NoInfer<T>> | NoInfer<T>;

/**
 * Represents a Zod schema for a single object, including lazy schemas.
 * T is the inferred output type of the object.
 */
export type ZodObjectSchemaDef<T> = ZodObject<
  Record<string, ZodTypeAny>,
  'strip' | 'strict' | 'passthrough',
  ZodTypeAny,
  T
>;

export type ZodLazyObjectSchemaDefPart<T> = ZodLazy<
  ZodObject<
    Record<string, ZodTypeAny>,
    'strip' | 'strict' | 'passthrough',
    ZodTypeAny,
    T
  >
>;

type ZodLazyObjectSchemaDefType<T> = ZodType<T, ZodTypeDef, T>;

export type ZodLazyObjectSchemaDef<T> =
  | ZodLazyObjectSchemaDefPart<T>
  | ZodLazyObjectSchemaDefType<T>;

export type Discriminator = string;
export type ZodUnionOptions<T> = ZodObject<
  {
    [key in Discriminator]: ZodType<T>;
  } & {
    [k: string]: ZodType<T>;
  }
>;

export type ZodDiscriminatedUnionDef<
  T,
  Option extends ZodUnionOptions<T> = ZodUnionOptions<T>,
  Options extends readonly Option[] = readonly Option[],
> = ZodDiscriminatedUnion<string, Options>;

export type ZodUnionSchemaDef<
  T,
  Option extends ZodObject<any, any, any, T> = ZodObject<any, any, any, T>,
  Schemas extends readonly [Option, ...Option[]] = readonly [
    Option,
    ...Option[],
  ],
> = ZodUnion<Schemas>;

export type InputObjectSchema<T> =
  | ZodObjectSchemaDef<T>
  | ZodLazyObjectSchemaDef<T>
  | ZodUnionSchemaDef<T>
  | ZodDiscriminatedUnionDef<T>;

/**
 * Represents a Zod schema for an array of objects.
 * T is the inferred output type of *each element* in the array.
 */
export type ZodArraySchemaDef<T> = ZodArray<
  InputObjectSchema<T>, // The element schema should produce type T
  'many' | 'atleastone' // Allow non-empty arrays too if needed via .nonempty()
>;

export type InputArraySchema<T> = ZodArraySchemaDef<T>;
