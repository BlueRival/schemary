import { describe, expect, it } from 'vitest';
import { Parser, ParseError } from './core.js';
import { ObjectIndexSegment } from './ast/objectIndexSegment.class.js';
import { ArrayIndexSegmentClass } from './ast/arrayIndexSegment.class.js';
import { ArrayIteratorSegment } from './ast/arrayIteratorSegment.class.js';
import { AbstractPathIndexSegment } from './ast/abstractPathIndexSegment.class.js';

describe('Path Parser', () => {
  describe('Field segments', () => {
    it('should parse a simple field name', () => {
      const parser = new Parser('user');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(1);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('user');
    });

    it('should parse multiple field names separated by dots', () => {
      const parser = new Parser('user.profile.name');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('user');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('profile');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('name');
    });

    it('should handle escaped characters in field names', () => {
      const parser = new Parser('data.\\[field\\]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('[field]');
    });

    it('should handle other escaped characters in field names', () => {
      const parser = new Parser('data.field\\name');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      // Other escaped characters should preserve the backslash and character
      expect((segments[1] as ObjectIndexSegment).name).toBe('fieldname');
    });
  });

  describe('Index segments', () => {
    it('should parse positive array indices', () => {
      const parser = new Parser('users[0]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('users');
      expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[1] as ArrayIndexSegmentClass).index).toBe(0);
    });

    it('should parse negative array indices', () => {
      const parser = new Parser('users[-1]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('users');
      expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[1] as ArrayIndexSegmentClass).index).toBe(-1);
    });

    it('should handle root path', () => {
      [
        '',
        ' ',
        '\t',
        ' \t',
        '\t ',
        '\t\t ',
        ' \t\t ',
        ' \t\t ',
        '  \t  \t\t ',
      ].forEach((path) => {
        const parser = new Parser(path);
        const segments = parser.parsePath();

        expect(segments).toHaveLength(0);
      });
    });

    it('should skip leading and trailing white space', () => {
      [
        ' users[-1]',
        'users[-1] ',
        ' users[-1] ',
        '\tusers[-1]',
        'users[-1]\t',
        '\tusers[-1]\t',
        ' \t   \t   users[-1]',
        ' \t\t   users[-1] \t\t',
        '\tusers[-1]',
        ' users[-1]\t\t',
        ' users[-1]  \t\t ',
        ' users[-1]  \t\t \t',
      ].forEach((path) => {
        const parser = new Parser(path);
        const segments = parser.parsePath();

        expect(segments).toHaveLength(2);
        expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[0] as ObjectIndexSegment).name).toBe('users');
        expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
        expect((segments[1] as ArrayIndexSegmentClass).index).toBe(-1);
      });
    });

    it('should parse multiple indices in a chain', () => {
      const parser = new Parser('matrix[0][1]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('matrix');
      expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[1] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(1);
    });
  });

  describe('Slice segments', () => {
    it('should parse simple slice with start only', () => {
      const parser = new Parser('users[[1]]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('users');
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(1);
      expect((segments[1] as ArrayIteratorSegment).size).toBeUndefined();
    });

    it('should parse slice with start and end', () => {
      const parser = new Parser('users[[0,3]]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('users');
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[1] as ArrayIteratorSegment).size).toBe(3);
    });

    it('should parse negative slice indices', () => {
      const parser = new Parser('users[[-2,-1]]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('users');
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(-2);
      expect((segments[1] as ArrayIteratorSegment).size).toBe(-1);
    });
  });

  describe('Complex paths', () => {
    it('should parse complex path with field, index, and field', () => {
      const parser = new Parser('users[0].name');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('users');
      expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[1] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('name');
    });

    it('should parse complex path with field, slice, and field and cache', () => {
      const parser = new Parser('departments[0].employees[[0,2]].name');
      let segments: AbstractPathIndexSegment[] = [];

      for (let i = 0; i < 3; i++) {
        segments = parser.parsePath();

        expect(segments).toHaveLength(5);
        expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[0] as ObjectIndexSegment).name).toBe(
          'departments',
        );
        expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
        expect((segments[1] as ArrayIndexSegmentClass).index).toBe(0);
        expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[2] as ObjectIndexSegment).name).toBe('employees');
        expect(segments[3]).toBeInstanceOf(ArrayIteratorSegment);
        expect((segments[3] as ArrayIteratorSegment).start).toBe(0);
        expect((segments[3] as ArrayIteratorSegment).size).toBe(2);
        expect(segments[4]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[4] as ObjectIndexSegment).name).toBe('name');
      }
    });

    it('should parse ultra-nested path with multiple segment types', () => {
      const parser = new Parser(
        'config.mappings[0].sources[[0,3]].fields[-1].validation.rules[2].params.min',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(12);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('config');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('mappings');
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('sources');
      expect(segments[4]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[4] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[4] as ArrayIteratorSegment).size).toBe(3);
      expect(segments[5]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[5] as ObjectIndexSegment).name).toBe('fields');
      expect(segments[6]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[6] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[7]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[7] as ObjectIndexSegment).name).toBe('validation');
      expect(segments[8]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[8] as ObjectIndexSegment).name).toBe('rules');
      expect(segments[9]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[9] as ArrayIndexSegmentClass).index).toBe(2);
      expect(segments[10]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[10] as ObjectIndexSegment).name).toBe('params');
      expect(segments[11]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[11] as ObjectIndexSegment).name).toBe('min');
    });

    it('should parse path with heavily escaped field names', () => {
      const parser = new Parser(
        'data.\\[complex\\].\\[field\\.with\\].\\[multiple\\]\\[escapes\\].value',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(5);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('[complex]');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe(
        '[field.with]',
      );
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe(
        '[multiple][escapes]',
      );
      expect(segments[4]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[4] as ObjectIndexSegment).name).toBe('value');
    });

    it('should parse multiple-level array indexing with mixed indices', () => {
      const parser = new Parser('matrix[0][1][-2][3][-1]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(6);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('matrix');
      expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[1] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(1);
      expect(segments[3]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[3] as ArrayIndexSegmentClass).index).toBe(-2);
      expect(segments[4]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[4] as ArrayIndexSegmentClass).index).toBe(3);
      expect(segments[5]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[5] as ArrayIndexSegmentClass).index).toBe(-1);
    });

    it('should parse complex array slicing combinations', () => {
      const parser = new Parser('data[[0]][[0,5]][[1]][[0,-1]][[-2]][[0,0]]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(7);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[1] as ArrayIteratorSegment).size).toBeUndefined();
      expect(segments[2]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[2] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[2] as ArrayIteratorSegment).size).toBe(5);
      expect(segments[3]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[3] as ArrayIteratorSegment).start).toBe(1);
      expect((segments[3] as ArrayIteratorSegment).size).toBeUndefined();
      expect(segments[4]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[4] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[4] as ArrayIteratorSegment).size).toBe(-1);
      expect(segments[5]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[5] as ArrayIteratorSegment).start).toBe(-2);
      expect((segments[5] as ArrayIteratorSegment).size).toBeUndefined();
      expect(segments[6]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[6] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[6] as ArrayIteratorSegment).size).toBe(0);
    });

    it('should parse nested arrays with multiple slices', () => {
      const parser = new Parser('multiDimensional[[0,3]][0][[1,4]][-1]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(5);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe(
        'multiDimensional',
      );
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[1] as ArrayIteratorSegment).size).toBe(3);
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[3]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[3] as ArrayIteratorSegment).start).toBe(1);
      expect((segments[3] as ArrayIteratorSegment).size).toBe(4);
      expect(segments[4]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[4] as ArrayIndexSegmentClass).index).toBe(-1);
    });

    it('should parse field names that look like they could be special syntax', () => {
      const parser = new Parser('object.123field.0.true.null.undefined.[].{}');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(8);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('object');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('123field');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('0');
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('true');
      expect(segments[4]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[4] as ObjectIndexSegment).name).toBe('null');
      expect(segments[5]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[5] as ObjectIndexSegment).name).toBe('undefined');
      expect(segments[6]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[6] as ObjectIndexSegment).name).toBe('[]');
      expect(segments[7]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[7] as ObjectIndexSegment).name).toBe('{}');
    });

    it('should parse extremely long path with many segments', () => {
      const parser = new Parser(
        'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.aa.bb.cc.dd.ee',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(31);
      const expectedNames = [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        'aa',
        'bb',
        'cc',
        'dd',
        'ee',
      ];
      for (let i = 0; i < segments.length; i++) {
        expect(segments[i]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[i] as ObjectIndexSegment).name).toBe(
          expectedNames[i],
        );
      }
    });

    it('should parse field names with numeric patterns', () => {
      const parser = new Parser('counts.count_1.count_2.count_10.count_999');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(5);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('counts');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('count_1');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('count_2');
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('count_10');
      expect(segments[4]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[4] as ObjectIndexSegment).name).toBe('count_999');
    });

    it('should parse multiple array accesses in sequence', () => {
      const parser = new Parser('arrays[0][1][2][3][4][5][6][7][8][9]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(11);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('arrays');
      for (let i = 1; i < segments.length; i++) {
        expect(segments[i]).toBeInstanceOf(ArrayIndexSegmentClass);
        expect((segments[i] as ArrayIndexSegmentClass).index).toBe(i - 1);
      }
    });

    it('should parse complex mix of fields and array accesses', () => {
      const parser = new Parser(
        'data.users[0].posts[-1].comments[[0,5]].author.name',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(9);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('users');
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('posts');
      expect(segments[4]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[4] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[5]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[5] as ObjectIndexSegment).name).toBe('comments');
      expect(segments[6]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[6] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[6] as ArrayIteratorSegment).size).toBe(5);
      expect(segments[7]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[7] as ObjectIndexSegment).name).toBe('author');
      expect(segments[8]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[8] as ObjectIndexSegment).name).toBe('name');
    });

    it('should parse field names with dots and brackets that need escaping and literal \\ in field names', () => {
      const parser = new Parser('root.field\\\\\\.with\\.dots.array\\.\\[0\\]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('root');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe(
        'field\\.with.dots',
      );
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('array.[0]');
    });

    it('should parse field names with dots and brackets that need escaping', () => {
      const parser = new Parser('root.field\\.with\\.dots.array\\.\\[0\\]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('root');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe(
        'field.with.dots',
      );
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('array.[0]');
    });

    it('should parse extremely long field names', () => {
      const longFieldName =
        'thisIsAnExtremelyLongFieldNameThatMightCauseIssuesIfTheParserHasAnyLimitationsOnTheFieldNameLengthAndItContinuesForQuiteAWhileToReallyTestTheEdgeCases';
      const parser = new Parser(`root.${longFieldName}.value`);
      const segments = parser.parsePath();

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('root');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe(longFieldName);
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('value');
    });

    it('should parse paths that mix positive and negative indices', () => {
      const parser = new Parser('alternating[0][-1][2][-3][4][-5]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(7);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('alternating');
      expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[1] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[3]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[3] as ArrayIndexSegmentClass).index).toBe(2);
      expect(segments[4]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[4] as ArrayIndexSegmentClass).index).toBe(-3);
      expect(segments[5]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[5] as ArrayIndexSegmentClass).index).toBe(4);
      expect(segments[6]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[6] as ArrayIndexSegmentClass).index).toBe(-5);
    });

    it('should parse array slices with large start/end differences', () => {
      const parser = new Parser('bigArray[[0,1000]]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('bigArray');
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[1] as ArrayIteratorSegment).size).toBe(1000);
    });

    it('should parse field names that are JavaScript keywords', () => {
      const parser = new Parser(
        'object.if.else.for.while.function.return.try.catch.finally',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(10);
      const expected = [
        'object',
        'if',
        'else',
        'for',
        'while',
        'function',
        'return',
        'try',
        'catch',
        'finally',
      ];
      for (let i = 0; i < segments.length; i++) {
        expect(segments[i]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[i] as ObjectIndexSegment).name).toBe(expected[i]);
      }
    });

    it('should parse field names with unusual Unicode characters', () => {
      const parser = new Parser('data.üniçödé.字段名.🔥.⚡️.🚀');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(6);
      const expected = ['data', 'üniçödé', '字段名', '🔥', '⚡️', '🚀'];
      for (let i = 0; i < segments.length; i++) {
        expect(segments[i]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[i] as ObjectIndexSegment).name).toBe(expected[i]);
      }
    });

    it('should parse deep nested array slices within objects', () => {
      const parser = new Parser(
        'data.levels[0].sublevel.items[[0,3]].tags[[-2]].name',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(9);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('levels');
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('sublevel');
      expect(segments[4]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[4] as ObjectIndexSegment).name).toBe('items');
      expect(segments[5]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[5] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[5] as ArrayIteratorSegment).size).toBe(3);
      expect(segments[6]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[6] as ObjectIndexSegment).name).toBe('tags');
      expect(segments[7]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[7] as ArrayIteratorSegment).start).toBe(-2);
      expect((segments[7] as ArrayIteratorSegment).size).toBeUndefined();
      expect(segments[8]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[8] as ObjectIndexSegment).name).toBe('name');
    });

    it('should parse paths with repeating patterns', () => {
      const parser = new Parser('data[0].item.data[1].item.data[2].item');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(9);
      const fieldNames = ['data', 'item', 'data', 'item', 'data', 'item'];
      const indices = [0, 1, 2];
      let fieldIndex = 0;
      let indexIndex = 0;

      for (let i = 0; i < segments.length; i++) {
        if (i % 3 === 0 || i % 3 === 2) {
          expect(segments[i]).toBeInstanceOf(ObjectIndexSegment);
          expect((segments[i] as ObjectIndexSegment).name).toBe(
            fieldNames[fieldIndex],
          );
          fieldIndex++;
        } else {
          expect(segments[i]).toBeInstanceOf(ArrayIndexSegmentClass);
          expect((segments[i] as ArrayIndexSegmentClass).index).toBe(
            indices[indexIndex],
          );
          indexIndex++;
        }
      }
    });

    it('should parse field names that look like slice notation', () => {
      const parser = new Parser('weird.\\[\\[0,1\\]\\].\\[0\\].array[0]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(5);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('weird');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('[[0,1]]');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('[0]');
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('array');
      expect(segments[4]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[4] as ArrayIndexSegmentClass).index).toBe(0);
    });

    it('should parse paths representing a real-world GraphQL schema', () => {
      const parser = new Parser(
        'data.users[0].friends[[0,10]].posts[-1].comments[0].author.profile.avatar',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(12);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('users');
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('friends');
      expect(segments[4]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[4] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[4] as ArrayIteratorSegment).size).toBe(10);
      expect(segments[5]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[5] as ObjectIndexSegment).name).toBe('posts');
      expect(segments[6]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[6] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[7]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[7] as ObjectIndexSegment).name).toBe('comments');
      expect(segments[8]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[8] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[9]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[9] as ObjectIndexSegment).name).toBe('author');
      expect(segments[10]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[10] as ObjectIndexSegment).name).toBe('profile');
      expect(segments[11]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[11] as ObjectIndexSegment).name).toBe('avatar');
    });

    it('should parse array slices that would select all elements', () => {
      const parser = new Parser('data[[0]]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[1] as ArrayIteratorSegment).size).toBeUndefined();
    });

    it('should parse array slices with only negative indices', () => {
      const parser = new Parser('list[[-3,-1]]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('list');
      expect(segments[1]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[1] as ArrayIteratorSegment).start).toBe(-3);
      expect((segments[1] as ArrayIteratorSegment).size).toBe(-1);
    });

    it('should parse field names with underscore patterns', () => {
      const parser = new Parser(
        '__proto__.constructor.__defineGetter__.__lookupSetter__',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(4);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('__proto__');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('constructor');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe(
        '__defineGetter__',
      );
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe(
        '__lookupSetter__',
      );
    });

    it('should parse paths that access deeply nested individual elements', () => {
      const parser = new Parser(
        'level1.level2.level3.level4.level5.level6.level7.level8.level9.level10',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(10);
      for (let i = 0; i < segments.length; i++) {
        expect(segments[i]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[i] as ObjectIndexSegment).name).toBe(
          `level${i + 1}`,
        );
      }
    });

    it('should parse paths with field names that contain escape sequences', () => {
      const parser = new Parser('data.field\\name.\\path\\to\\property');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('fieldname');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe(
        'pathtoproperty',
      );
    });

    it('should parse field names with numeric boundaries', () => {
      const parser = new Parser('0.1.2.3.4.5.6.7.8.9');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(10);
      for (let i = 0; i < segments.length; i++) {
        expect(segments[i]).toBeInstanceOf(ObjectIndexSegment);
        expect((segments[i] as ObjectIndexSegment).name).toBe(String(i));
      }
    });

    it('should parse path that would navigate through a complex nested schema', () => {
      const parser = new Parser(
        'data.transformations[0].mapping.sourceSchema.properties.user.properties.addresses[-1].properties.geo.coordinates[1]',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(14);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe(
        'transformations',
      );
      expect(segments[2]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[2] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('mapping');
      expect(segments[4]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[4] as ObjectIndexSegment).name).toBe(
        'sourceSchema',
      );
      expect(segments[5]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[5] as ObjectIndexSegment).name).toBe('properties');
      expect(segments[6]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[6] as ObjectIndexSegment).name).toBe('user');
      expect(segments[7]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[7] as ObjectIndexSegment).name).toBe('properties');
      expect(segments[8]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[8] as ObjectIndexSegment).name).toBe('addresses');
      expect(segments[9]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[9] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[10]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[10] as ObjectIndexSegment).name).toBe('properties');
      expect(segments[11]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[11] as ObjectIndexSegment).name).toBe('geo');
      expect(segments[12]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[12] as ObjectIndexSegment).name).toBe(
        'coordinates',
      );
      expect(segments[13]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[13] as ArrayIndexSegmentClass).index).toBe(1);
    });

    it('should parse extremely complex path with multiple types of segments', () => {
      const parser = new Parser(
        'translations[0].config.mappings[[0,5]].fields[-1].\\[escaped\\].nested.arrays[0][1][-1].slices[[0,3]][-2].end',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(17);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe(
        'translations',
      );
      expect(segments[1]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[1] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('config');
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('mappings');
      expect(segments[4]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[4] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[4] as ArrayIteratorSegment).size).toBe(5);
      expect(segments[5]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[5] as ObjectIndexSegment).name).toBe('fields');
      expect(segments[6]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[6] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[7]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[7] as ObjectIndexSegment).name).toBe('[escaped]');
      expect(segments[8]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[8] as ObjectIndexSegment).name).toBe('nested');
      expect(segments[9]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[9] as ObjectIndexSegment).name).toBe('arrays');
      expect(segments[10]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[10] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[11]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[11] as ArrayIndexSegmentClass).index).toBe(1);
      expect(segments[12]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[12] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[13]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[13] as ObjectIndexSegment).name).toBe('slices');
      expect(segments[14]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[14] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[14] as ArrayIteratorSegment).size).toBe(3);
      expect(segments[15]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[15] as ArrayIndexSegmentClass).index).toBe(-2);
      expect(segments[16]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[16] as ObjectIndexSegment).name).toBe('end');
    });

    it('should parse an exceptional case with complex combinations of segments', () => {
      const parser = new Parser(
        'meta.schema.translation.config[0].mappings[0].sources[[0,3]].destination.fields[-1].validations[0].rules[[1,3]].parameters.range[0]',
      );
      const segments = parser.parsePath();

      expect(segments).toHaveLength(19);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('meta');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('schema');
      expect(segments[2]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[2] as ObjectIndexSegment).name).toBe('translation');
      expect(segments[3]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[3] as ObjectIndexSegment).name).toBe('config');
      expect(segments[4]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[4] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[5]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[5] as ObjectIndexSegment).name).toBe('mappings');
      expect(segments[6]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[6] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[7]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[7] as ObjectIndexSegment).name).toBe('sources');
      expect(segments[8]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[8] as ArrayIteratorSegment).start).toBe(0);
      expect((segments[8] as ArrayIteratorSegment).size).toBe(3);
      expect(segments[9]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[9] as ObjectIndexSegment).name).toBe('destination');
      expect(segments[10]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[10] as ObjectIndexSegment).name).toBe('fields');
      expect(segments[11]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[11] as ArrayIndexSegmentClass).index).toBe(-1);
      expect(segments[12]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[12] as ObjectIndexSegment).name).toBe(
        'validations',
      );
      expect(segments[13]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[13] as ArrayIndexSegmentClass).index).toBe(0);
      expect(segments[14]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[14] as ObjectIndexSegment).name).toBe('rules');
      expect(segments[15]).toBeInstanceOf(ArrayIteratorSegment);
      expect((segments[15] as ArrayIteratorSegment).start).toBe(1);
      expect((segments[15] as ArrayIteratorSegment).size).toBe(3);
      expect(segments[16]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[16] as ObjectIndexSegment).name).toBe('parameters');
      expect(segments[17]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[17] as ObjectIndexSegment).name).toBe('range');
      expect(segments[18]).toBeInstanceOf(ArrayIndexSegmentClass);
      expect((segments[18] as ArrayIndexSegmentClass).index).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should throw error for unclosed bracket at end of input', () => {
      // This should throw an error as the bracket is not closed
      const parser = new Parser('users[');

      // Now we expect the parser to throw an error for unclosed brackets
      expect(() => parser.parsePath()).toThrow(ParseError);
      expect(() => parser.parsePath()).toThrow('Unclosed bracket in path');
    });

    it('should throw error for unclosed array slice bracket', () => {
      // This should throw an error as the outer bracket of the slice is not closed
      const parser = new Parser('users[[9]');

      // Now we expect the parser to throw an error for unclosed array slice brackets
      expect(() => parser.parsePath()).toThrow(ParseError);
      expect(() => parser.parsePath()).toThrow(
        "Parse error at position 9: Expected array slice closing bracket ']', got 'end of input",
      );
    });

    it('should not throw error for properly escaped brackets', () => {
      // This contains escaped brackets in the field name, so it should not trigger errors
      const parser = new Parser('data.\\[field\\]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe('[field]');
    });

    it('should handle dots inside escaped brackets in field names', () => {
      // Testing the condition: if (char === '.' && insideEscapedBrackets) {...}
      const parser = new Parser('data.\\[field.name\\]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe(
        '[field.name]',
      );
    });

    it('should handle sequential dots inside escaped brackets', () => {
      const parser = new Parser('data.\\[field..with...dots\\]');
      const segments = parser.parsePath();

      expect(segments).toHaveLength(2);
      expect(segments[0]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[0] as ObjectIndexSegment).name).toBe('data');
      expect(segments[1]).toBeInstanceOf(ObjectIndexSegment);
      expect((segments[1] as ObjectIndexSegment).name).toBe(
        '[field..with...dots]',
      );
    });
  });

  describe('Error cases', () => {
    describe('Parser error cases', () => {
      const largeNumber = '9'.repeat(1000);

      const errorCases = [
        {
          name: 'single dot',
          parserInput: '.',
          error: 'Parse error at position 0: Expected identifier',
        },
        {
          name: 'invalid integer in index',
          parserInput: 'users[abc]',
          error: "Parse error at position 6: Expected integer, got 'a'",
        },
        {
          name: 'unclosed index bracket (got dot)',
          parserInput: 'users[0.name',
          error:
            "Parse error at position 7: Expected array index closing bracket ']', got '.'",
        },
        {
          name: 'float for index',
          parserInput: 'users[1.1]',
          error:
            "Parse error at position 7: Expected array index closing bracket ']', got '.'",
        },
        {
          name: 'tuple for index',
          parserInput: 'users[1,1]',
          error:
            "Parse error at position 7: Expected array index closing bracket ']', got ','",
        },
        {
          name: 'float for splice first index',
          parserInput: 'users[[1.1,2]]',
          error:
            "Parse error at position 8: Expected slice closing bracket ']', got '.'",
        },
        {
          name: 'float for splice second index',
          parserInput: 'users[[1,2.0]]',
          error:
            "Parse error at position 10: Expected slice closing bracket ']', got '.'",
        },
        {
          name: 'unclosed index bracket (end of input)',
          parserInput: 'users[0',
          error:
            "Parse error at position 7: Expected array index closing bracket ']', got 'end of input'",
        },
        {
          name: 'unclosed slice bracket (end of input)',
          parserInput: 'users[[0,3]',
          error:
            "Parse error at position 11: Expected array slice closing bracket ']', got 'end of input'",
        },
        {
          name: 'unclosed slice bracket (got dot)',
          parserInput: 'users[[0,3].name',
          error:
            "Parse error at position 11: Expected array slice closing bracket ']', got '.'",
        },
        {
          name: 'double unclosed slice bracket (got dot)',
          parserInput: 'users[[0,3.name',
          error:
            "Parse error at position 10: Expected slice closing bracket ']', got '.'",
        },
        {
          name: 'unclosed slice bracket (got `[`)',
          parserInput: 'users[[0,3][-1]',
          error:
            "Parse error at position 11: Expected array slice closing bracket ']', got '['",
        },
        {
          name: 'invalid integer after comma in slice',
          parserInput: 'users[[0,abc]]',
          error:
            "Parse error at position 9: Expected integer after comma, got 'a'",
        },
        {
          name: 'invalid integer after comma in slice (with suffix)',
          parserInput: 'users[[0,abc]].name',
          error:
            "Parse error at position 9: Expected integer after comma, got 'a'",
        },
        {
          name: 'invalid integer format in index',
          parserInput: 'users[1x5]',
          error:
            "Parse error at position 7: Expected array index closing bracket ']', got 'x'",
        },
        {
          name: 'unexpected character in slice',
          parserInput: 'users[[0,3}]',
          error:
            "Parse error at position 10: Expected slice closing bracket ']', got '}'",
        },
        {
          name: 'unexpected character in first slice index',
          parserInput: 'users[[o,3}]',
          error: "Parse error at position 7: Expected integer, got 'o'",
        },
        {
          name: 'unexpected character in first slice index',
          parserInput: 'users[[o,3}]',
          error: "Parse error at position 7: Expected integer, got 'o'",
        },
        {
          name: 'non-integer at start of index',
          parserInput: 'users[a5]',
          error: "Parse error at position 6: Expected integer, got 'a'",
        },
        {
          name: 'negative non-integer',
          parserInput: 'users[-a5]',
          error: "Parse error at position 7: Expected integer, got 'a'",
        },
        {
          name: 'weird character at start of index',
          parserInput: 'users[$]',
          error: "Parse error at position 6: Expected integer, got '$'",
        },
        {
          name: 'mismatched closing bracket for index',
          parserInput: 'users[0}',
          error:
            "Parse error at position 7: Expected array index closing bracket ']', got '}'",
        },
        {
          name: 'invalid integer values (too large)',
          parserInput: `users[${largeNumber}]`,
          error: 'Parse error at position 6: Invalid integer',
        },
      ];

      errorCases.forEach(({ name, parserInput, error }) => {
        it(`should throw error for: ${name}`, () => {
          const parser = new Parser(parserInput);
          expect(() => parser.parsePath()).toThrow(ParseError);
          expect(() => parser.parsePath()).toThrow(error);
        });
      });
    });
  });
});
