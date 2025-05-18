import { describe, expect, it } from 'vitest';
import { ObjectIndexSegment } from './objectIndexSegment.class.js';
import { JSONType } from '../../../types.js';

describe('ObjectFieldSegment', () => {
  describe('Construction', () => {
    it('should create an object field segment', () => {
      const segment = new ObjectIndexSegment('user', 'user');
      expect(segment.name).toBe('user');
      expect(segment.sourceText).toBe('user');
    });

    it('should create an object field segment with escaped name', () => {
      const segment = new ObjectIndexSegment('\\[field\\]', '[field]');
      expect(segment.name).toBe('[field]');
      expect(segment.sourceText).toBe('\\[field\\]');
    });
  });

  describe('getValue()', () => {
    const generateTests = (params: {
      testName: string;
      source: JSONType;
      fieldName: string;
      expected: JSONType | undefined;
      only?: boolean;
      skip?: boolean;
    }) => {
      const testName = params.testName;
      const source = params.source;
      const fieldName = params.fieldName;
      const expected = params.expected;

      it(testName, () => {
        const segment = new ObjectIndexSegment(fieldName, fieldName);
        const result = segment.getValue(source);
        expect(result).toStrictEqual(expected);
      });
    };

    // Test object
    const obj = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Anytown',
      },
      hobbies: ['reading', 'hiking'],
    };

    // Standard field access
    generateTests({
      testName: 'should get string field',
      source: obj,
      fieldName: 'name',
      expected: 'John',
    });
    generateTests({
      testName: 'should get number field',
      source: obj,
      fieldName: 'age',
      expected: 30,
    });
    generateTests({
      testName: 'should get object field',
      source: obj,
      fieldName: 'address',
      expected: obj.address,
    });
    generateTests({
      testName: 'should get array field',
      source: obj,
      fieldName: 'hobbies',
      expected: obj.hobbies,
    });
    generateTests({
      testName: 'should get undefined for non-existent field',
      source: obj,
      fieldName: 'email',
      expected: undefined,
    });

    // Array field access (should also work for arrays)
    generateTests({
      testName: 'should get array property',
      source: obj.hobbies,
      fieldName: 'length',
      expected: 2,
    });

    // Non-object sources
    generateTests({
      testName: 'should return undefined for string source',
      source: 'abc' as unknown as JSONType,
      fieldName: 'length',
      expected: undefined,
    });
    generateTests({
      testName: 'should return undefined for number source',
      source: 123 as unknown as JSONType,
      fieldName: 'notReal',
      expected: undefined,
    });
    generateTests({
      testName: 'should return undefined for null source',
      source: null as unknown as JSONType,
      fieldName: 'prop',
      expected: undefined,
      only: true,
    });
    generateTests({
      testName: 'should return undefined for undefined source',
      source: undefined as unknown as JSONType,
      fieldName: 'prop',
      expected: undefined,
    });
  });

  describe('setValue()', () => {
    it('should set field on existing object', () => {
      const segment = new ObjectIndexSegment('name', 'name');
      const destination = { age: 30 };
      const value = 'John';

      const result = segment.setValue(destination, value);
      expect(result).toStrictEqual({ age: 30, name: 'John' });
    });

    it('should update existing field', () => {
      const segment = new ObjectIndexSegment('name', 'name');
      const destination = { name: 'Jane', age: 30 };
      const value = 'John';

      const result = segment.setValue(destination, value);
      expect(result).toStrictEqual({ name: 'John', age: 30 });
    });

    it('should create object if destination is undefined', () => {
      const segment = new ObjectIndexSegment('name', 'name');
      const value = 'John';

      const result = segment.setValue(undefined, value);
      expect(result).toStrictEqual({ name: 'John' });
    });

    it('should create object if destination is null', () => {
      const segment = new ObjectIndexSegment('name', 'name');
      const destination = null as unknown as JSONType;
      const value = 'John';

      const result = segment.setValue(destination, value);
      expect(result).toStrictEqual({ name: 'John' });
    });

    it('should create object if destination is primitive', () => {
      const segment = new ObjectIndexSegment('name', 'name');
      const destination = 'not an object' as unknown as JSONType;
      const value = 'John';

      const result = segment.setValue(destination, value);
      expect(result).toStrictEqual({ name: 'John' });
    });

    it('should set field on array', () => {
      const segment = new ObjectIndexSegment('customProp', 'customProp');
      const destination = [1, 2, 3] as unknown as JSONType;
      const value = 'custom value';

      const result = segment.setValue(destination, value);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((result as unknown as any).customProp).toStrictEqual(
        'custom value',
      );
    });

    it('should set value to undefined', () => {
      const segment = new ObjectIndexSegment('name', 'name');
      const destination = { name: 'John', age: 30 };

      const result = segment.setValue(destination, undefined);
      expect(result).toStrictEqual({ name: undefined, age: 30 });
    });
  });

  describe('Edge cases', () => {
    it('should handle field names with special characters', () => {
      const specialFieldNames = [
        'field-with-dashes',
        'field_with_underscores',
        'field.with.dots',
        'field with spaces',
        '123numericStart',
        '$dollarSign',
        '_underscore',
        'camelCase',
        'PascalCase',
        'UPPER_CASE',
        '🎉emoji',
      ];

      for (const fieldName of specialFieldNames) {
        const segment = new ObjectIndexSegment(fieldName, fieldName);
        const obj = {} as JSONType;
        const value = 'test value';

        const result = segment.setValue(obj, value);
        expect((result as Record<string, string>)[fieldName]).toBe(value);
      }
    });

    it('should handle JavaScript reserved keywords as field names', () => {
      const reservedKeywords = [
        'if',
        'else',
        'for',
        'while',
        'function',
        'return',
        'var',
        'let',
        'const',
        'class',
        'extends',
        'super',
        'new',
        'this',
        'null',
        'undefined',
        'true',
        'false',
      ];

      for (const keyword of reservedKeywords) {
        const segment = new ObjectIndexSegment(keyword, keyword);
        const obj = {} as JSONType;
        const value = 'test value';

        const result = segment.setValue(obj, value);
        expect((result as Record<string, string>)[keyword]).toBe(value);
      }
    });
  });
});
