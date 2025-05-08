import { describe, expect, it } from 'vitest';
import { ObjectFieldSegmentClass } from './objectFieldSegment.class.js';
import { JSONType } from '../../../types.js';

describe('ObjectFieldSegment', () => {
  describe('Construction', () => {
    it('should create an object field segment', () => {
      const segment = new ObjectFieldSegmentClass('user', 'user');
      expect(segment.name).toBe('user');
      expect(segment.sourceText).toBe('user');
    });

    it('should create an object field segment with escaped name', () => {
      const segment = new ObjectFieldSegmentClass('\\[field\\]', '[field]');
      expect(segment.name).toBe('[field]');
      expect(segment.sourceText).toBe('\\[field\\]');
    });
  });

  describe('_getValue method', () => {
    const generateTests = (
      testName: string,
      source: JSONType,
      fieldName: string,
      expected: JSONType | undefined,
    ) => {
      it(testName, () => {
        const segment = new ObjectFieldSegmentClass(fieldName, fieldName);
        const result = segment['_getValue'](source);
        expect(result).toEqual(expected);
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
    generateTests('should get string field', obj, 'name', 'John');
    generateTests('should get number field', obj, 'age', 30);
    generateTests('should get object field', obj, 'address', obj.address);
    generateTests('should get array field', obj, 'hobbies', obj.hobbies);
    generateTests(
      'should get undefined for non-existent field',
      obj,
      'email',
      undefined,
    );

    // Array field access (should also work for arrays)
    generateTests('should get array property', obj.hobbies, 'length', 2);

    // Non-object sources
    generateTests(
      'should return undefined for string source',
      'abc' as unknown as JSONType,
      'length',
      undefined,
    );
    generateTests(
      'should return undefined for number source',
      123 as unknown as JSONType,
      'toString',
      undefined,
    );
    generateTests(
      'should return undefined for null source',
      null as unknown as JSONType,
      'prop',
      undefined,
    );
    generateTests(
      'should return undefined for undefined source',
      undefined as unknown as JSONType,
      'prop',
      undefined,
    );
  });

  describe('_setValue method', () => {
    it('should set field on existing object', () => {
      const segment = new ObjectFieldSegmentClass('name', 'name');
      const destination = { age: 30 };
      const value = 'John';

      const result = segment['_setValue'](destination, value);
      expect(result).toEqual({ age: 30, name: 'John' });
    });

    it('should update existing field', () => {
      const segment = new ObjectFieldSegmentClass('name', 'name');
      const destination = { name: 'Jane', age: 30 };
      const value = 'John';

      const result = segment['_setValue'](destination, value);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should create object if destination is undefined', () => {
      const segment = new ObjectFieldSegmentClass('name', 'name');
      const value = 'John';

      const result = segment['_setValue'](undefined, value);
      expect(result).toEqual({ name: 'John' });
    });

    it('should create object if destination is null', () => {
      const segment = new ObjectFieldSegmentClass('name', 'name');
      const destination = null as unknown as JSONType;
      const value = 'John';

      const result = segment['_setValue'](destination, value);
      expect(result).toEqual({ name: 'John' });
    });

    it('should create object if destination is primitive', () => {
      const segment = new ObjectFieldSegmentClass('name', 'name');
      const destination = 'not an object' as unknown as JSONType;
      const value = 'John';

      const result = segment['_setValue'](destination, value);
      expect(result).toEqual({ name: 'John' });
    });

    it('should set field on array', () => {
      const segment = new ObjectFieldSegmentClass('customProp', 'customProp');
      const destination = [1, 2, 3] as unknown as JSONType;
      const value = 'custom value';

      const result = segment['_setValue'](destination, value);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((result as unknown as any).customProp).toEqual('custom value');
      expect(Array.isArray(result)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((result as unknown as any)[0]).toBe(1);
    });

    it('should set value to undefined', () => {
      const segment = new ObjectFieldSegmentClass('name', 'name');
      const destination = { name: 'John', age: 30 };

      const result = segment['_setValue'](destination, undefined);
      expect(result).toEqual({ name: undefined, age: 30 });
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
        const segment = new ObjectFieldSegmentClass(fieldName, fieldName);
        const obj = {} as JSONType;
        const value = 'test value';

        const result = segment['_setValue'](obj, value);
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
        const segment = new ObjectFieldSegmentClass(keyword, keyword);
        const obj = {} as JSONType;
        const value = 'test value';

        const result = segment['_setValue'](obj, value);
        expect((result as Record<string, string>)[keyword]).toBe(value);
      }
    });
  });
});
