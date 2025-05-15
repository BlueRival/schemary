import { describe, expect, it } from 'vitest';
import { ArrayIndexSegmentClass } from './arrayIndexSegment.class.js';
import { JSONType } from '../../../types.js';
import { extractValue, injectValue } from '../utilities.js';

describe('ArrayIndexSegment', () => {
  describe('Construction', () => {
    it('should create an array index segment with positive index', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      expect(segment.index).toBe(0);
      expect(segment.sourceText).toBe('[0]');
    });

    it('should create an array index segment with negative index', () => {
      const segment = new ArrayIndexSegmentClass('[-1]', -1);
      expect(segment.index).toBe(-1);
      expect(segment.sourceText).toBe('[-1]');
    });
  });

  describe('getValue method', () => {
    const generateTests = (
      testName: string,
      source: JSONType,
      index: number,
      expected: JSONType | undefined,
      expectError: boolean = false,
    ) => {
      it(testName, () => {
        const segment = new ArrayIndexSegmentClass(`[${index}]`, index);

        if (expectError) {
          expect(() => extractValue(source, [segment])).toThrow();
        } else {
          const result = extractValue(source, [segment]);
          expect(result).toEqual(expected);
        }
      });
    };

    // Test cases for standard array
    const array = ['a', 'b', 'c', 'd', 'e'];

    generateTests('should get value with positive index', array, 0, 'a');
    generateTests(
      'should get value with positive index in middle',
      array,
      2,
      'c',
    );
    generateTests('should get value with positive index at end', array, 4, 'e');
    generateTests(
      'should get undefined for out of bounds positive index',
      array,
      5,
      undefined,
    );
    generateTests(
      'should get value with negative index from end',
      array,
      -1,
      'e',
    );
    generateTests(
      'should get value with negative index from middle',
      array,
      -3,
      'c',
    );
    generateTests(
      'should throw error for out of bounds negative index',
      array,
      -6,
      undefined,
      true,
    );

    // Test cases for non-array source
    generateTests(
      'should return undefined for non-array source (object)',
      {},
      0,
      undefined,
    );
    generateTests(
      'should return undefined for non-array source (string)',
      'abc' as unknown as JSONType,
      0,
      undefined,
    );
    generateTests(
      'should return undefined for non-array source (number)',
      123 as unknown as JSONType,
      0,
      undefined,
    );
    generateTests(
      'should return undefined for non-array source (null)',
      null as unknown as JSONType,
      0,
      undefined,
    );
    generateTests(
      'should return undefined for non-array source (undefined)',
      undefined as unknown as JSONType,
      0,
      undefined,
    );
  });

  describe('setValue method', () => {
    it('should set value with positive index', () => {
      const segment = new ArrayIndexSegmentClass('[1]', 1);
      const destination = ['a', 'b', 'c'];
      const value = 'x';

      const result = injectValue(destination, value, [segment]);
      expect(result).toEqual(['a', 'x', 'c']);
    });

    it('should set value with negative index', () => {
      const segment = new ArrayIndexSegmentClass('[-1]', -1);
      const destination = ['a', 'b', 'c'];
      const value = 'x';

      const result = injectValue(destination, value, [segment]);
      expect(result).toEqual(['a', 'b', 'x']);
    });

    it('should create array if destination is undefined', () => {
      const segment = new ArrayIndexSegmentClass('[1]', 1);
      const value = 'x';

      const result = injectValue(undefined, value, [segment]);
      // Should create [undefined, 'x']
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
      expect((result as any[])[1]).toBe('x');
    });

    it('should create array if destination is non-array', () => {
      const segment = new ArrayIndexSegmentClass('[1]', 1);
      const destination = 'not an array' as unknown as JSONType;
      const value = 'x';

      const result = injectValue(destination, value, [segment]);
      // Should create [undefined, 'x']
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
      expect((result as any[])[1]).toBe('x');
    });

    it('should throw error for out of bounds negative index', () => {
      const segment = new ArrayIndexSegmentClass('[-10]', -10);
      const destination = ['a', 'b', 'c'];

      expect(() => injectValue(destination, 'x', [segment])).toThrow(
        /Reverse array index out of bounds/,
      );
    });

    it('should expand array if index is beyond current length', () => {
      const segment = new ArrayIndexSegmentClass('[5]', 5);
      const destination = ['a', 'b', 'c'];
      const value = 'x';

      const result = injectValue(destination, value, [segment]);
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(6);
      expect((result as any[])[5]).toBe('x');
      expect((result as any[])[3]).toBeUndefined();
      expect((result as any[])[4]).toBeUndefined();
    });
  });
});
