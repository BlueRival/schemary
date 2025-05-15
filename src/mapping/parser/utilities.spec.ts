import { describe, expect, it } from 'vitest';
import { Parser } from './core.js';
import { extractValue } from './utilities.js';
import { AbstractPathSegment } from './ast/abstractPathSegment.class.js';

const SOURCE_DATA = {
  users: [
    {
      id: 1,
      name: 'John',
      orders: [
        {
          id: 101,
          date: '2023-01-15',
          items: [{ id: 1001, name: 'Item 1', price: 10.99 }],
        },
        {
          id: 102,
          date: '2023-01-20',
          items: [
            { id: 2001, name: 'Item A', price: 15.99 },
            { id: 2002, name: 'Item B', price: 25.99 },
            { id: 2003, name: 'Item C', price: 35.99 },
          ],
        },
      ],
    },
    {
      id: 2,
      name: 'Jane',
      orders: [
        {
          id: 201,
          date: '2023-02-05',
          items: [
            { id: 3001, name: 'Item X1', price: 100.99 },
            { id: 3002, name: 'Item X2', price: 200.99 },
          ],
        },
        {
          id: 202,
          date: '2023-02-06',
          items: [
            { id: 3003, name: 'Item X3', price: 300.99 },
            { id: 3004, name: 'Item X4', price: 400.99 },
          ],
        },
      ],
    },
    {
      id: 3,
      name: 'Bob',
      orders: [
        {
          id: 301,
          date: '2023-03-01',
          items: [
            { id: 4001, name: 'Item Y1', price: 125.99 },
            { id: 4002, name: 'Item Y2', price: 225.99 },
            { id: 4003, name: 'Item Y3', price: 325.99 },
          ],
        },
      ],
    },
    {
      id: 4,
      name: 'Alice',
      orders: [],
    },
    {
      id: 5,
      name: 'Charlie',
      orders: [
        {
          id: 501,
          date: '2023-04-01',
          items: [
            { id: 5001, name: 'Item Z1', price: 150.99 },
            { id: 5002, name: 'Item Z2', price: 250.99 },
            { id: 5003, name: 'Item Z3', price: 251.99 },
            { id: 5004, name: 'Item Z4', price: 151.99 },
          ],
        },
        {
          id: 502,
          date: '2023-04-02',
          items: [{ id: 5003, name: 'Item Z3', price: 350.99 }],
        },
      ],
    },
    {
      id: 6,
      name: 'David',
      orders: [
        {
          id: 601,
          date: '2023-05-01',
          items: [
            { id: 6001, name: 'Item W1', price: 175.99 },
            { id: 6002, name: 'Item W2', price: 275.99 },
          ],
        },
      ],
    },
  ],
  matrix: [
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    [
      [10, 11, 12],
      [13, 14, 15],
      [16, 17, 18],
    ],
    [
      [19, 20, 21],
      [22, 23, 24],
      [25, 26, 27],
    ],
  ],
};

describe('Complex path getValue tests', () => {
  it('should correctly extract fields across array slice', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[1,3]].name');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual(['Jane', 'Bob', 'Alice']);
  });

  it('should correctly extract array slices across array slice', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[2,2]].orders[[0,1]]');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      [
        {
          id: 301,
          date: '2023-03-01',
          items: [
            { id: 4001, name: 'Item Y1', price: 125.99 },
            { id: 4002, name: 'Item Y2', price: 225.99 },
            { id: 4003, name: 'Item Y3', price: 325.99 },
          ],
        },
      ],
      [],
    ]);
  });

  it('should correctly extract array fields across array slices of array slices', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[1,3]].orders[[0,1]].date');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([['2023-02-05'], ['2023-03-01'], []]);
  });

  it('should correctly extract arrays across array slices of array slices', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[1,3]].orders[[0,1]].items');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      [
        [
          { id: 3001, name: 'Item X1', price: 100.99 },
          { id: 3002, name: 'Item X2', price: 200.99 },
        ],
      ],
      [
        [
          { id: 4001, name: 'Item Y1', price: 125.99 },
          { id: 4002, name: 'Item Y2', price: 225.99 },
          { id: 4003, name: 'Item Y3', price: 325.99 },
        ],
      ],
      [],
    ]);
  });

  it('should correctly extract array slice across array slices of array slices', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[1,3]].orders[[0,2]].items[[0,1]]');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      [
        [{ id: 3001, name: 'Item X1', price: 100.99 }],
        [{ id: 3003, name: 'Item X3', price: 300.99 }],
      ],
      [[{ id: 4001, name: 'Item Y1', price: 125.99 }]],
      [],
    ]);
  });

  it('should correctly extract an array and iterate on subfields', () => {
    // get the order id for every user's first order
    const parser = new Parser('users.orders[0].id');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([101, 201, 301, undefined, 501, 601]);
  });

  it('should correctly extract offset indexes across array indexes of arrays', () => {
    // get the items on everyone's second order
    const parser = new Parser('users.orders[1].items[1]');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      { id: 2002, name: 'Item B', price: 25.99 },
      { id: 3004, name: 'Item X4', price: 400.99 },
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('should correctly extract multifield across array indexes of array slices', () => {
    // get the id and name of the first item on everyone's first order
    const parser = new Parser('users.orders[0].items[0].{id,name}');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      {
        id: 1001,
        name: 'Item 1',
      },
      {
        id: 3001,
        name: 'Item X1',
      },
      {
        id: 4001,
        name: 'Item Y1',
      },
      {}, // user has had no orders
      {
        id: 5001,
        name: 'Item Z1',
      },
      {
        id: 6001,
        name: 'Item W1',
      },
    ]);
  });

  it('should all arrays using short hand notation', () => {
    // get the id of every item ordered
    const parser = new Parser('users.orders.items.id');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      [[1001], [2001, 2002, 2003]],
      [
        [3001, 3002],
        [3003, 3004],
      ],
      [[4001, 4002, 4003]],
      [],
      [[5001, 5002, 5003, 5004], [5003]],
      [[6001, 6002]],
    ]);
  });

  it('should fill in missing schema', () => {
    // get the id of every item ordered
    const parser = new Parser('missing[[0]]');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([]);
  });

  it('should fill in missing schema part way up', () => {
    // get the id of every item ordered
    const parser = new Parser('missing[[0]].moreMissing[[0]].name');
    const path = parser.parsePath();
    const result = extractValue({ missing: 'wrong type' }, path);

    expect(result).toStrictEqual([]);
  });

  it('should fill in missing schema with partial empty match', () => {
    // get the id of every item ordered
    const parser = new Parser('missing[[0]].moreMissing[[0]].name');
    const path = parser.parsePath();
    const result = extractValue({ missing: [{}] }, path);

    expect(result).toStrictEqual([[]]);
  });

  it('should correctly extract field in array slice across array slices of array slices', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[1,3]].orders[[0,1]].items[[0,1]].name');
    const path = parser.parsePath();
    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([[['Item X1']], [['Item Y1']], []]);
  });

  it('should correctly extract from 3D matrix data column as sub-arrays', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('matrix[[0]][[0]][[1,1]]');
    const path = parser.parsePath();

    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      [[2], [5], [8]],
      [[11], [14], [17]],
      [[20], [23], [26]],
    ]);
  });

  it('should correctly extract from 3D matrix data column as sub-arrays', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('matrix[[1,2]][[1,2]][[1,1]]');
    const path = parser.parsePath();

    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      [[14], [17]],
      [[23], [26]],
    ]);
  });

  it('should correctly extract from 3D matrix data column as individual values', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('matrix[[0]][[0]][2]');
    const path = parser.parsePath();

    const result = extractValue(SOURCE_DATA, path);

    expect(result).toStrictEqual([
      [3, 6, 9],
      [12, 15, 18],
      [21, 24, 27],
    ]);
  });

  it('should throw an exception for invalid segment type', () => {
    expect(() => {
      extractValue(SOURCE_DATA, [
        // passing in any class that isn't AbstractPathSegment
        new Parser('any object really') as unknown as AbstractPathSegment,
      ]);
    }).toThrow('Unknown path segment type: Parser');
  });
});
