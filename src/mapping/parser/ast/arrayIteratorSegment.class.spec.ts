import { describe, expect, it } from 'vitest';
import { ArrayIteratorSegment } from './arrayIteratorSegment.class.js';
import { JSONArray, JSONObject, JSONType } from '../../../types.js';
import { clone } from '../../../schema.js';
import { extractValue, injectValue } from '../utilities.js';

// Uses these short-cut flags on tests to quick-pass true for the respective options
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const only = true;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const skip = true;

describe('ArraySegment', () => {
  describe('Immutability', () => {
    it('should ensure getValue() does not allow modification of source through result', () => {
      const segment = new ArrayIteratorSegment('[[1,2]]', 1, 2);
      const source = [10, 20, 30, 40, 50];
      const originalSource = [...source];

      // Get a slice of the source
      const result = segment.getValue(source);
      expect(result).toEqual([20, 30]);

      // Modify the result
      if (Array.isArray(result)) {
        result[0] = 999;
        result.push(888);
      }

      // Verify source is unchanged
      expect(source).toEqual(originalSource);
    });

    it('should ensure setValue() does not allow modification of value through result, but does modify destination', () => {
      const segment = new ArrayIteratorSegment('[[1,2]]', 1, 2);
      const destination = [10, 20, 30, 40, 50];
      const value = [100, 200];
      const originalValue = clone(value);

      // Set the value
      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 100, 200, 40, 50]);

      // Modify the result
      if (Array.isArray(result)) {
        result[0] = 999;
        result.push(888);
      }

      // destination is modified in place
      expect(destination).toEqual([999, 100, 200, 40, 50, 888]);

      // Verify inputs are unchanged
      expect(value).toEqual(originalValue);
    });

    it('should ensure deep nested objects are also immutable in getValue', () => {
      const segment = new ArrayIteratorSegment('[[0,1]]', 0, 1);
      const source = [{ name: 'Alice', details: { age: 30 } }, { name: 'Bob' }];
      const originalSource = clone(source);

      const result = segment.getValue(source);
      expect(result).toEqual([{ name: 'Alice', details: { age: 30 } }]);

      // Modify nested property in the result
      if (
        Array.isArray(result) &&
        result[0] &&
        typeof result[0] === 'object' &&
        result[0]
      ) {
        const object = result[0] as JSONObject;

        object.name = 'Modified';
        if (object.details) {
          (object.details as JSONObject).age = 99;
        }
      }

      // Verify source is unchanged
      expect(source).toEqual(originalSource);
    });

    it('should ensure deep nested objects are also immutable in setValue', () => {
      const segment = new ArrayIteratorSegment('[[1,1]]', 1, 1);
      const destination = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const value = [{ id: 100, details: { level: 'high' } }];
      const originalValue = clone(value);

      const result = segment.setValue(destination, value);
      expect(result).toEqual([
        { id: 1 },
        { id: 100, details: { level: 'high' } },
        { id: 3 },
      ]);

      // Modify nested property in the result
      if (Array.isArray(result) && result[1] && typeof result[1] === 'object') {
        const object = result[1] as JSONObject;

        object.id = 999;
        if (object.details) {
          (object.details as JSONObject).level = 'modified';
        }
      }

      // destination should be modified in place
      expect(destination).toEqual([
        { id: 1 },
        { id: 999, details: { level: 'modified' } },
        { id: 3 },
      ]);

      // Verify inputs are unchanged
      expect(value).toEqual(originalValue);
    });
  });

  describe('Construction', () => {
    it('should create an array segment with start only', () => {
      const segment = new ArrayIteratorSegment('[[0]]', 0);
      expect(segment.start).toBe(0);
      expect(segment.size).toBeUndefined();
      expect(segment.sourceText).toBe('[[0]]');
    });

    it('should create an array segment with start and size', () => {
      const segment = new ArrayIteratorSegment('[[0,3]]', 0, 3);
      expect(segment.start).toBe(0);
      expect(segment.size).toBe(3);
      expect(segment.sourceText).toBe('[[0,3]]');
    });

    it('should create an array segment with negative start', () => {
      const segment = new ArrayIteratorSegment('[[-2]]', -2);
      expect(segment.start).toBe(-2);
      expect(segment.size).toBeUndefined();
      expect(segment.sourceText).toBe('[[-2]]');
    });

    it('should create an array segment with negative size', () => {
      const segment = new ArrayIteratorSegment('[[3,-2]]', 3, -2);
      expect(segment.start).toBe(3);
      expect(segment.size).toBe(-2);
      expect(segment.sourceText).toBe('[[3,-2]]');
    });
  });

  describe('getValue method', () => {
    const generateTests = (
      testName: string,
      source: JSONType,
      start: number,
      size: number | undefined,
      expected: JSONType | undefined,
      params?: {
        only?: boolean;
        skip?: boolean;
      },
    ) => {
      source = clone(source);
      expected = clone(expected);

      const testFunction = () => {
        const segment = new ArrayIteratorSegment(
          size !== undefined ? `[[${start},${size}]]` : `[[${start}]]`,
          start,
          size,
        );

        const result = segment.getValue(source as JSONArray);

        expect(result).toEqual(expected);
      };

      if (params?.only) {
        it.only(testName, testFunction);
        return;
      }

      if (params?.skip) {
        it.skip(testName, testFunction);
        return;
      }

      it(testName, testFunction);
    };

    // Test data
    const array = [10, 20, 30, 40, 50];

    // Tests with start only
    generateTests(
      'should get all elements from start',
      array,
      0,
      undefined,
      [10, 20, 30, 40, 50],
    );
    generateTests(
      'should get elements starting from index 1',
      array,
      1,
      undefined,
      [20, 30, 40, 50],
    );
    generateTests(
      'should get elements starting from index 3',
      array,
      3,
      undefined,
      [40, 50],
    );
    generateTests(
      'should get elements starting from last element',
      array,
      4,
      undefined,
      [50],
    );
    generateTests(
      'should get elements starting from beyond array length',
      array,
      5,
      undefined,
      [],
    );
    generateTests(
      'should get elements starting from negative index',
      array,
      -2,
      undefined,
      [40, 50],
    );

    // Tests with start and positive size
    generateTests('should get elements with size 0', array, 0, 0, []);
    generateTests('should get elements with size 1', array, 0, 1, [10]);
    generateTests('should get elements with size 3', array, 1, 3, [20, 30, 40]);
    generateTests(
      'should get elements with size beyond array length',
      array,
      2,
      10,
      [30, 40, 50],
    );

    // Tests with negative size (reverse slicing)
    generateTests(
      'should get elements with negative size',
      array,
      3,
      -2,
      [40, 30],
    );
    generateTests(
      'should get elements with negative size from beginning',
      array,
      2,
      -3,
      [30, 20, 10],
    );

    // Tests with non-array source
    generateTests(
      'should return undefined for object source',
      {},
      0,
      undefined,
      undefined,
    );
    generateTests(
      'should return undefined for string source',
      'abc' as unknown as JSONType,
      0,
      undefined,
      undefined,
    );
    generateTests(
      'should return undefined for null source',
      null as unknown as JSONType,
      0,
      undefined,
      undefined,
    );

    // Test with negative start and adjusted size
    generateTests(
      'should adjust when negative start would be out of bounds',
      array,
      -10,
      3,
      [],
    );

    // Edge cases
    generateTests(
      'should handle start at end and negative size',
      array,
      4,
      -2,
      [50, 40],
    );
    generateTests(
      'should handle large negative start with small size',
      array,
      -20,
      2,
      [],
    );
  });

  describe('setValue method', () => {
    it('should set values with start only', () => {
      const segment = new ArrayIteratorSegment('[[1]]', 1);
      const destination = [10, 20, 30, 40, 50];
      const value = [100, 200, 300];

      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 100, 200, 300, 50]);
    });

    it('should set values with start and positive size', () => {
      const segment = new ArrayIteratorSegment('[[1,2]]', 1, 2);
      const destination = [10, 20, 30, 40, 50];
      const value = [100, 200];

      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 100, 200, 40, 50]);
    });

    it('should set values with negative size', () => {
      const segment = new ArrayIteratorSegment('[[3,-2]]', 3, -2);
      const destination = [10, 20, 30, 40, 50];
      const value = [100, 200];

      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 20, 200, 100, 50]);
    });

    it('should handle size 0', () => {
      const segment = new ArrayIteratorSegment('[[2,0]]', 2, 0);
      const destination = [10, 20, 30, 40, 50];
      const value = [100, 200];

      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 20, 30, 40, 50]);
    });

    it('should create array if destination is undefined', () => {
      const segment = new ArrayIteratorSegment('[[0,2]]', 0, 2);
      const value = [100, 200];

      const result = segment.setValue(undefined, value);
      expect(result).toEqual([100, 200]);
    });

    it('should create array if destination is non-array', () => {
      const segment = new ArrayIteratorSegment('[[0,2]]', 0, 2);
      const destination = 'not an array' as unknown as JSONType;
      const value = [100, 200];

      const result = segment.setValue(destination, value);
      expect(result).toEqual([100, 200]);
    });

    it('should convert non-array value to array', () => {
      const segment = new ArrayIteratorSegment('[[1,1]]', 1, 1);
      const destination = [10, 20, 30];
      const value = 100;

      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 100, 30]);
    });

    it('should handle size undefined to use value length', () => {
      const segment = new ArrayIteratorSegment('[[1]]', 1);
      const destination = [10, 20, 30, 40, 50];
      const value = [200, 300];

      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 200, 300, 40, 50]);
    });

    it('should limit value by size', () => {
      const segment = new ArrayIteratorSegment('[[1,1]]', 1, 1);
      const destination = [10, 20, 30, 40, 50];
      const value = [100, 200, 300];

      const result = segment.setValue(destination, value);
      expect(result).toEqual([10, 100, 30, 40, 50]);
    });
  });

  describe('Static methods', () => {
    it('should use static getValue with a single segment', () => {
      const segment = new ArrayIteratorSegment('[[1,3]]', 1, 3);
      const source = [10, 20, 30, 40, 50];

      const result = extractValue(source, [segment]);
      expect(result).toEqual([20, 30, 40]);
    });

    it('should use static setValue with a single segment', () => {
      const segment = new ArrayIteratorSegment('[[1,2]]', 1, 2);
      const destination = [10, 20, 30, 40, 50];
      const value = [100, 200];

      const result = injectValue(destination, value, [segment]);
      expect(result).toEqual([10, 100, 200, 40, 50]);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty array with positive start', () => {
      const segment = new ArrayIteratorSegment('[[1]]', 1);

      const result = segment.getValue([]);
      expect(result).toEqual([]);
    });

    it('should handle empty array with negative start', () => {
      const segment = new ArrayIteratorSegment('[[-1]]', -1);

      const result = segment.getValue([]);
      expect(result).toEqual([]);
    });

    it('should set properly on empty array', () => {
      const segment = new ArrayIteratorSegment('[[0]]', 0);
      const value = [100, 200];

      const result = segment.setValue([], value);
      expect(result).toEqual([100, 200]);
    });
  });
});
