import { describe, expect, it } from 'vitest';
import { ArrayIndexSegmentClass } from './arrayIndexSegment.class.js';
import { JSONArray } from '../../../types.js';

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

  describe('getValue()', () => {
    // Test cases for standard array
    const array = ['a', 'b', 'c', 'd', 'e'];

    it('should get value with positive index', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      const { result, chain } = segment.getValue(array);
      expect(chain).toStrictEqual(false);
      expect(result).toStrictEqual('a');
    });

    it('should handle source is not array', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      const { result, chain } = segment.getValue({} as unknown as string[]);
      expect(chain).toStrictEqual(false);
      expect(result).toStrictEqual(undefined);
    });

    it('should get value with positive index in middle', () => {
      const segment = new ArrayIndexSegmentClass('[2]', 2);
      const { result } = segment.getValue(array);
      expect(result).toStrictEqual('c');
    });

    it('should get value with positive index at end', () => {
      const segment = new ArrayIndexSegmentClass('[4]', 4);
      const { result } = segment.getValue(array);
      expect(result).toStrictEqual('e');
    });

    it('should get undefined for out of bounds positive index', () => {
      const segment = new ArrayIndexSegmentClass('[5]', 5);
      const { result } = segment.getValue(array);
      expect(result).toStrictEqual(undefined);
    });

    it('should get value with negative index from end', () => {
      const segment = new ArrayIndexSegmentClass('[-1]', -1);
      const { result } = segment.getValue(array);
      expect(result).toStrictEqual('e');
    });

    it('should get value with negative index from middle', () => {
      const segment = new ArrayIndexSegmentClass('[-3]', -3);
      const { result } = segment.getValue(array);
      expect(result).toStrictEqual('c');
    });

    it('should throw error for out of bounds negative index', () => {
      const segment = new ArrayIndexSegmentClass('[-6]', -6);
      expect(() => segment.getValue(array)).toThrow();
    });

    // Test cases for non-array source
    it('should return undefined for non-array source (object)', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      const { result } = segment.getValue({} as JSONArray);
      expect(result).toStrictEqual(undefined);
    });

    it('should return undefined for non-array source (string)', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      const { result } = segment.getValue('abc' as unknown as JSONArray);
      expect(result).toStrictEqual(undefined);
    });

    it('should return undefined for non-array source (number)', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      const { result } = segment.getValue(123 as unknown as JSONArray);
      expect(result).toStrictEqual(undefined);
    });

    it('should return undefined for non-array source (null)', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      const { result } = segment.getValue(null as unknown as JSONArray);
      expect(result).toStrictEqual(undefined);
    });

    it('should return undefined for non-array source (undefined)', () => {
      const segment = new ArrayIndexSegmentClass('[0]', 0);
      const { result } = segment.getValue(undefined as unknown as JSONArray);
      expect(result).toStrictEqual(undefined);
    });

    it('should get undefined with non-array source', () => {
      const segment = new ArrayIndexSegmentClass('[2]', 2);
      const { result } = segment.getValue('non-array' as unknown as JSONArray);
      expect(result).toStrictEqual(undefined);
    });
  });

  describe('setValue()', () => {
    it('should set value with positive index', () => {
      const segment = new ArrayIndexSegmentClass('[1]', 1);
      const destination = ['a', 'b', 'c'];
      const value = 'x';

      const result = segment.setValue(destination, value);
      expect(result).toStrictEqual(['a', 'x', 'c']);
    });

    it('should set value with negative index', () => {
      const segment = new ArrayIndexSegmentClass('[-1]', -1);
      const destination = ['a', 'b', 'c'];
      const value = 'x';

      const result = segment.setValue(destination, value);
      expect(result).toStrictEqual(['a', 'b', 'x']);
    });

    it('should create array if destination is undefined', () => {
      const segment = new ArrayIndexSegmentClass('[1]', 1);
      const value = 'x';

      const result = segment.setValue(undefined, value);
      // Should create [undefined, 'x']
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
      expect((result as any[])[1]).toBe('x');
    });

    it('should create array if destination is non-array', () => {
      const segment = new ArrayIndexSegmentClass('[1]', 1);
      const destination = 'not an array' as unknown as JSONArray;
      const value = 'x';

      const result = segment.setValue(destination, value);
      // Should create [undefined, 'x']
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(2);
      expect((result as any[])[1]).toBe('x');
    });

    it('should throw error for out of bounds negative index', () => {
      const segment = new ArrayIndexSegmentClass('[-10]', -10);
      const destination = ['a', 'b', 'c'];

      expect(() => segment.setValue(destination, 'x')).toThrow(
        /Reverse array index out of bounds/,
      );
    });

    it('should expand array if index is beyond current length', () => {
      const segment = new ArrayIndexSegmentClass('[5]', 5);
      const destination = ['a', 'b', 'c'];
      const value = 'x';

      const result = segment.setValue(destination, value);
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(6);
      expect((result as any[])[5]).toBe('x');
      expect((result as any[])[3]).toBeUndefined();
      expect((result as any[])[4]).toBeUndefined();
    });
  });
});
