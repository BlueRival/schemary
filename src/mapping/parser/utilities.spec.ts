import { describe, expect, it } from 'vitest';
import { Parser } from './core.js';
import { extractValue, injectValue } from './utilities.js';
import { PathSegment } from './ast/types.js';
import { JSONType } from '../../types.js';

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

describe('extractValue()', () => {
  it('should throw a useful exception for invalid segment type', () => {
    const parser = new Parser('matrix[[0]][[0]][2]');
    let path = parser.parsePath();

    // inject invalid segment in middle of a path and end, only first should throw
    path.push(new Error('not a path segment') as unknown as PathSegment);
    path = path.concat(path);
    path.push(
      new Error(
        'the first not a path segment should be the error',
      ) as unknown as PathSegment,
    );

    expect(() => {
      extractValue(SOURCE_DATA, path);
    }).toThrow(
      'Exception at matrix[[0]][[0]][2]<invalid path segment>: currentSegment.getValue is not a function',
    );
  });

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
});

describe('injectValue()', () => {
  it('should throw a useful exception for invalid segment type', () => {
    const parser = new Parser('matrix[[0]][[0]][2]');
    let path = parser.parsePath();

    // inject invalid segment in middle of a path and end, only first should throw
    path.push(new Error('not a path segment') as unknown as PathSegment);
    path = path.concat(path);
    path.push(
      new Error(
        'the first not a path segment should be the error',
      ) as unknown as PathSegment,
    );

    expect(() => {
      injectValue(undefined, ['Jane', 'Bob', 'Alice'], path);
    }).toThrow(
      'Exception at matrix[[0]][[0]][2]<invalid path segment>: currentSegment.getValue is not a function',
    );
  });

  it('should passthrough on empty path', () => {
    const result = injectValue(undefined, ['Jane', 'Bob', 'Alice'], []);

    expect(result).toStrictEqual(['Jane', 'Bob', 'Alice']);
  });

  it('should create a new users array with just field names in it', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users');
    const path = parser.parsePath();

    const result = injectValue(undefined, ['Jane', 'Bob', 'Alice'], path);

    expect(result).toStrictEqual({ users: ['Jane', 'Bob', 'Alice'] });
  });

  it('should create a new users array with just field names in it, reversed', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[0,-3]]');
    const path = parser.parsePath();

    const result = injectValue(undefined, ['Jane', 'Bob', 'Alice'], path);

    expect(result).toStrictEqual({ users: ['Alice', 'Bob', 'Jane'] });
  });

  it("should override if target doesn't match type", () => {
    // Test the complex nested path with array slices
    const parser = new Parser('users[[0]]');
    const path = parser.parsePath();

    const result = injectValue({ users: {} }, ['Jane', 'Bob', 'Alice'], path);

    expect(result).toStrictEqual({ users: ['Jane', 'Bob', 'Alice'] });
  });

  it('should handle root array', () => {
    // Test the complex nested path with array slices
    const parser = new Parser('[[0]]');
    const path = parser.parsePath();

    const result = injectValue(undefined, ['Jane', 'Bob', 'Alice'], path);

    expect(result).toStrictEqual(['Jane', 'Bob', 'Alice']);
  });

  it('should inject value into a deeply nested object path', () => {
    const parser = new Parser('company.departments.engineering.employees');
    const path = parser.parsePath();

    const result = injectValue(undefined, ['John', 'Jane', 'Bob'], path);

    expect(result).toStrictEqual({
      company: {
        departments: {
          engineering: {
            employees: ['John', 'Jane', 'Bob'],
          },
        },
      },
    });
  });

  it('should merge with existing object structure', () => {
    const parser = new Parser('company.departments.engineering.employees');
    const path = parser.parsePath();

    const existingData = {
      company: {
        departments: {
          engineering: {
            budget: 1000000,
            location: 'Building A',
          },
          marketing: {
            employees: ['Alice', 'Charlie'],
          },
        },
        founded: 2010,
      },
    };

    const result = injectValue(existingData, ['John', 'Jane', 'Bob'], path);

    expect(result).toStrictEqual({
      company: {
        departments: {
          engineering: {
            budget: 1000000,
            location: 'Building A',
            employees: ['John', 'Jane', 'Bob'],
          },
          marketing: {
            employees: ['Alice', 'Charlie'],
          },
        },
        founded: 2010,
      },
    });
  });

  it('should inject complex object into an array at a specific index', () => {
    const parser = new Parser('users[2].profile');
    const path = parser.parsePath();

    const complexValue = {
      firstName: 'Bob',
      lastName: 'Smith',
    };

    const existingData = {
      users: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 3, name: 'Bob' },
        { id: 4, name: 'Alice' },
      ],
    };

    const result = injectValue(existingData, complexValue, path);

    expect(result).toStrictEqual({
      users: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        {
          id: 3,
          name: 'Bob',
          profile: {
            firstName: 'Bob',
            lastName: 'Smith',
          },
        },
        { id: 4, name: 'Alice' },
      ],
    });
  });

  it('should handle complex array slices with multi-level nesting', () => {
    const parser = new Parser(
      'company.departments[[0,2]].projects[[1,1]].tasks',
    );
    const path = parser.parsePath();

    const complexValue = [
      ['Code Review', 'Testing', 'Documentation'],
      ['Project Review', 'Integration Testing', 'Tech Documentation'],
    ];

    const existingData = {
      company: {
        departments: [
          {
            name: 'Engineering',
            projects: [
              { id: 'P1', name: 'Project Alpha' },
              {
                id: 'P2',
                name: 'Project Beta',
              },
              { id: 'P3', name: 'Project Gamma' },
            ],
          },
          {
            name: 'Design',
            projects: [
              { id: 'P4', name: 'Project Delta' },
              {
                id: 'P5',
                name: 'Project Epsilon',
              },
            ],
          },
          {
            name: 'Marketing',
            projects: [
              { id: 'P6', name: 'Project Zeta' },
              { id: 'P7', name: 'Project Eta' },
              { id: 'P8', name: 'Project Theta' },
            ],
          },
        ],
      },
    };

    const result = injectValue(existingData, complexValue, path);

    expect(result).toStrictEqual({
      company: {
        departments: [
          {
            name: 'Engineering',
            projects: [
              { id: 'P1', name: 'Project Alpha' },
              {
                id: 'P2',
                name: 'Project Beta',
                tasks: complexValue[0][0],
              },
              { id: 'P3', name: 'Project Gamma' },
            ],
          },
          {
            name: 'Design',
            projects: [
              { id: 'P4', name: 'Project Delta' },
              {
                id: 'P5',
                name: 'Project Epsilon',
                tasks: complexValue[1][0],
              },
            ],
          },
          {
            name: 'Marketing',
            projects: [
              { id: 'P6', name: 'Project Zeta' },
              { id: 'P7', name: 'Project Eta' },
              { id: 'P8', name: 'Project Theta' },
            ],
          },
        ],
      },
    });
  });

  it('should inject into arrays that need to be created', () => {
    const parser = new Parser(
      'data.regions[2].cities[0].neighborhoods[1].streets',
    );
    const path = parser.parsePath();

    const streetNames = ['Maple St', 'Oak Ave', 'Pine Blvd'];

    const result = injectValue(undefined, streetNames, path);

    // This creates a deep structure with arrays that need placeholder undefined values
    expect(JSON.stringify(result, null, 2)).toStrictEqual(
      JSON.stringify(
        {
          data: {
            regions: [
              undefined,
              undefined,
              {
                cities: [
                  {
                    neighborhoods: [
                      undefined,
                      {
                        streets: streetNames,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        null,
        2,
      ),
    );
  });

  it('should handle complex transformations with mixed array and object paths', () => {
    const parser = new Parser(
      'statistics.years[[1,3]].quarters[2].metrics.visitors',
    );
    const path = parser.parsePath();

    const visitorData = [1500, 1750, 2000];

    const existingData = {
      statistics: {
        years: [
          { year: 2020, quarters: [{}, {}, { revenue: 500000 }, {}] },
          { year: 2021, quarters: [{}, {}, { revenue: 550000 }, {}] },
          { year: 2022, quarters: [{}, {}, { revenue: 600000 }, {}] },
          { year: 2023, quarters: [{}, {}, { revenue: 650000 }, {}] },
          { year: 2024, quarters: [{}, {}, { revenue: 700000 }, {}] },
        ],
        summary: 'Annual growth',
      },
    };

    const result = injectValue(existingData, visitorData, path);

    expect(result).toStrictEqual({
      statistics: {
        years: [
          { year: 2020, quarters: [{}, {}, { revenue: 500000 }, {}] },
          {
            year: 2021,
            quarters: [
              {},
              {},
              { revenue: 550000, metrics: { visitors: visitorData[0] } },
              {},
            ],
          },
          {
            year: 2022,
            quarters: [
              {},
              {},
              { revenue: 600000, metrics: { visitors: visitorData[1] } },
              {},
            ],
          },
          {
            year: 2023,
            quarters: [
              {},
              {},
              { revenue: 650000, metrics: { visitors: visitorData[2] } },
              {},
            ],
          },
          { year: 2024, quarters: [{}, {}, { revenue: 700000 }, {}] },
        ],
        summary: 'Annual growth',
      },
    });
  });

  it('should handle extremely deep and complex nested paths', () => {
    const cityData = [
      { name: 'Metropolis', population: 1000000 },
      { name: 'Gotham', population: 800000 },
      { name: 'Atlantis', population: 500000 },
    ];

    const existingData = {
      universe: {
        galaxies: [
          { name: 'Milky Way' },
          {
            name: 'Andromeda',
            solarSystems: [
              {
                planets: [
                  { name: 'Alpha' },
                  { name: 'Beta' },
                  {
                    name: 'Gamma',
                    continents: [
                      {
                        countries: [
                          { name: 'Xanadu' },
                          { name: 'Eldorado' },
                          { name: 'Shangri-La' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Delta',
                    continents: [
                      {
                        countries: [
                          { name: 'Avalon' },
                          { name: 'Asgard' },
                          { name: 'Olympus' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Epsilon',
                    continents: [
                      {
                        countries: [
                          { name: 'Camelot' },
                          { name: 'Valhalla' },
                          { name: 'Elysium' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'Triangulum',
            solarSystems: [
              {
                planets: [
                  { name: 'One' },
                  { name: 'Two' },
                  {
                    name: 'Three',
                    continents: [
                      {
                        countries: [
                          { name: 'Eden' },
                          { name: 'Arcadia' },
                          { name: 'Utopia' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Four',
                    continents: [
                      {
                        countries: [
                          { name: 'Hyperborea' },
                          { name: 'Lemuria' },
                          { name: 'Atlantis' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Five',
                    continents: [
                      {
                        countries: [
                          { name: 'Lyonesse' },
                          { name: 'Ys' },
                          { name: 'Kitezh' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const parser = new Parser(
      'universe.galaxies[[1,2]].solarSystems[0].planets[[2,4]].continents[0].countries[[0,1]].cities',
    );
    const path = parser.parsePath();

    const result = injectValue(existingData, cityData, path);

    // The expected result is extremely complex with cities injected at specific nested locations
    expect(result).toStrictEqual({
      universe: {
        galaxies: [
          { name: 'Milky Way' },
          {
            name: 'Andromeda',
            solarSystems: [
              {
                planets: [
                  { name: 'Alpha' },
                  { name: 'Beta' },
                  {
                    name: 'Gamma',
                    continents: [
                      {
                        countries: [
                          { name: 'Xanadu', cities: cityData[0] },
                          { name: 'Eldorado' },
                          { name: 'Shangri-La' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Delta',
                    continents: [
                      {
                        countries: [
                          { name: 'Avalon' },
                          { name: 'Asgard' },
                          { name: 'Olympus' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Epsilon',
                    continents: [
                      {
                        countries: [
                          { name: 'Camelot' },
                          { name: 'Valhalla' },
                          { name: 'Elysium' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'Triangulum',
            solarSystems: [
              {
                planets: [
                  { name: 'One' },
                  { name: 'Two' },
                  {
                    name: 'Three',
                    continents: [
                      {
                        countries: [
                          { name: 'Eden', cities: cityData[1] },
                          { name: 'Arcadia' },
                          { name: 'Utopia' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Four',
                    continents: [
                      {
                        countries: [
                          { name: 'Hyperborea' },
                          { name: 'Lemuria' },
                          { name: 'Atlantis' },
                        ],
                      },
                    ],
                  },
                  {
                    name: 'Five',
                    continents: [
                      {
                        countries: [
                          { name: 'Lyonesse' },
                          { name: 'Ys' },
                          { name: 'Kitezh' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
  });

  it('should handle injecting into existing array indices with complex objects', () => {
    const parser = new Parser('employees[0].tasks[1].subtasks[2].assignees');
    const path = parser.parsePath();

    const assigneeData = [
      { id: 101, name: 'John Doe', role: 'Developer' },
      { id: 102, name: 'Jane Smith', role: 'Designer' },
    ];

    const existingData = {
      employees: [
        {
          id: 1,
          name: 'Alice Johnson',
          tasks: [
            { id: 'T1', name: 'Design homepage' },
            {
              id: 'T2',
              name: 'Implement API',
              subtasks: [
                { id: 'ST1', name: 'Define endpoints' },
                { id: 'ST2', name: 'Create models' },
                {
                  id: 'ST3',
                  name: 'Write controllers',
                  priority: 'High',
                },
              ],
            },
          ],
        },
        {
          id: 2,
          name: 'Bob Williams',
        },
      ],
    };

    const result = injectValue(existingData, assigneeData, path);

    expect(result).toStrictEqual({
      employees: [
        {
          id: 1,
          name: 'Alice Johnson',
          tasks: [
            { id: 'T1', name: 'Design homepage' },
            {
              id: 'T2',
              name: 'Implement API',
              subtasks: [
                { id: 'ST1', name: 'Define endpoints' },
                { id: 'ST2', name: 'Create models' },
                {
                  id: 'ST3',
                  name: 'Write controllers',
                  priority: 'High',
                  assignees: assigneeData,
                },
              ],
            },
          ],
        },
        {
          id: 2,
          name: 'Bob Williams',
        },
      ],
    });
  });

  it('should handle mixed array index and slice injections in the same path', () => {
    const existingData = {
      company: {
        name: 'Acme Corp',
        offices: [
          {
            location: 'New York',
            departments: [
              { name: 'HR' },
              {
                name: 'Engineering',
                employees: [
                  { id: 101, name: 'John' },
                  { id: 102, name: 'Jane' },
                  { id: 103, name: 'Bob' },
                  { id: 104, name: 'Alice' },
                  { id: 105, name: 'Charlie' },
                ],
              },
            ],
          },
          {
            location: 'San Francisco',
            departments: [
              { name: 'Marketing' },
              {
                name: 'Product',
                employees: [
                  { id: 201, name: 'Dave' },
                  { id: 202, name: 'Eve' },
                  { id: 203, name: 'Frank' },
                  { id: 204, name: 'Grace' },
                  { id: 205, name: 'Henry' },
                ],
              },
            ],
          },
          {
            location: 'London',
            departments: [
              { name: 'Finance' },
              {
                name: 'Legal',
                employees: [
                  { id: 301, name: 'Ivan' },
                  { id: 302, name: 'Julia' },
                  { id: 303, name: 'Karl' },
                  { id: 304, name: 'Linda' },
                  { id: 305, name: 'Mike' },
                ],
              },
            ],
          },
        ],
      },
    };

    const parser = new Parser(
      'company.offices[[0,3]].departments[1].employees[[1,3]]',
    );
    const path = parser.parsePath();

    const employeeData = [
      [
        { status: 'Active', clearance: 'Level 2' },
        { status: 'Inactive', clearance: 'Level 3' },
        { status: 'Paused', clearance: 'Level 4' },
      ],
      [
        { status: 'Active', clearance: 'Level 5' },
        { status: 'Inactive', clearance: 'Level 6' },
        { status: 'Paused', clearance: 'Level 7' },
      ],
    ];

    const result = injectValue(existingData, employeeData, path);

    const expected = {
      company: {
        name: 'Acme Corp',
        offices: [
          {
            location: 'New York',
            departments: [
              { name: 'HR' },
              {
                name: 'Engineering',
                employees: [
                  { id: 101, name: 'John' },
                  { status: 'Active', clearance: 'Level 2' },
                  { status: 'Inactive', clearance: 'Level 3' },
                  { status: 'Paused', clearance: 'Level 4' },
                  { id: 105, name: 'Charlie' },
                ],
              },
            ],
          },
          {
            location: 'San Francisco',
            departments: [
              { name: 'Marketing' },
              {
                name: 'Product',
                employees: [
                  { id: 201, name: 'Dave' },
                  { status: 'Active', clearance: 'Level 5' },
                  { status: 'Inactive', clearance: 'Level 6' },
                  { status: 'Paused', clearance: 'Level 7' },
                  { id: 205, name: 'Henry' },
                ],
              },
            ],
          },
          {
            location: 'London',
            departments: [
              { name: 'Finance' },
              {
                name: 'Legal',
                employees: [
                  { id: 301, name: 'Ivan' },
                  {
                    id: 302,
                    name: 'Julia',
                  },
                  {
                    id: 303,
                    name: 'Karl',
                  },
                  {
                    id: 304,
                    name: 'Linda',
                  },
                  { id: 305, name: 'Mike' },
                ],
              },
            ],
          },
        ],
      },
    };

    expect(result).toStrictEqual(expected);
  });

  it('should handle nested arrays when target path is not explicitly an array', () => {
    const value = [
      [
        {
          id: 101,
          date: '2023-01-15',
          items: [
            {
              id: 1001,
              name: 'Item 1',
              price: 10.99,
            },
            {
              id: 1002,
              name: 'Item 2',
              price: 20.99,
            },
            {
              id: 1003,
              name: 'Item 3',
              price: 30.99,
            },
            {
              id: 1004,
              name: 'Item 4',
              price: 40.99,
            },
            {
              id: 1005,
              name: 'Item 5',
              price: 50.99,
            },
          ],
        },
      ],
      [
        {
          id: 201,
          date: '2023-02-05',
          items: [
            {
              id: 3001,
              name: 'Item X1',
              price: 100.99,
            },
            {
              id: 3002,
              name: 'Item X2',
              price: 200.99,
            },
            {
              id: 3003,
              name: 'Item X3',
              price: 300.99,
            },
            {
              id: 3004,
              name: 'Item X4',
              price: 400.99,
            },
          ],
        },
      ],
      [
        {
          id: 301,
          date: '2023-03-05',
          items: [
            {
              id: 6001,
              name: 'Item P1',
              price: 120.99,
            },
            {
              id: 6002,
              name: 'Item P2',
              price: 220.99,
            },
          ],
        },
      ],
      [
        {
          id: 401,
          date: '2023-04-10',
          items: [
            {
              id: 7001,
              name: 'Item Q1',
              price: 130.99,
            },
            {
              id: 7002,
              name: 'Item Q2',
              price: 230.99,
            },
          ],
        },
      ],
      [],
      [],
    ];

    const parser = new Parser('users[[0]].orders');
    const path = parser.parsePath();
    let result: JSONType;

    // eslint-disable-next-line prefer-const
    result = injectValue(result, value, path);

    expect(result).toStrictEqual({
      users: [
        {
          orders: [
            {
              id: 101,
              date: '2023-01-15',
              items: [
                {
                  id: 1001,
                  name: 'Item 1',
                  price: 10.99,
                },
                {
                  id: 1002,
                  name: 'Item 2',
                  price: 20.99,
                },
                {
                  id: 1003,
                  name: 'Item 3',
                  price: 30.99,
                },
                {
                  id: 1004,
                  name: 'Item 4',
                  price: 40.99,
                },
                {
                  id: 1005,
                  name: 'Item 5',
                  price: 50.99,
                },
              ],
            },
          ],
        },
        {
          orders: [
            {
              id: 201,
              date: '2023-02-05',
              items: [
                {
                  id: 3001,
                  name: 'Item X1',
                  price: 100.99,
                },
                {
                  id: 3002,
                  name: 'Item X2',
                  price: 200.99,
                },
                {
                  id: 3003,
                  name: 'Item X3',
                  price: 300.99,
                },
                {
                  id: 3004,
                  name: 'Item X4',
                  price: 400.99,
                },
              ],
            },
          ],
        },
        {
          orders: [
            {
              id: 301,
              date: '2023-03-05',
              items: [
                {
                  id: 6001,
                  name: 'Item P1',
                  price: 120.99,
                },
                {
                  id: 6002,
                  name: 'Item P2',
                  price: 220.99,
                },
              ],
            },
          ],
        },
        {
          orders: [
            {
              id: 401,
              date: '2023-04-10',
              items: [
                {
                  id: 7001,
                  name: 'Item Q1',
                  price: 130.99,
                },
                {
                  id: 7002,
                  name: 'Item Q2',
                  price: 230.99,
                },
              ],
            },
          ],
        },
        {
          orders: [],
        },
        {
          orders: [],
        },
      ],
    });
  });

  it('should map non-array to array target', () => {
    const order = {
      id: 101,
      date: '2023-01-15',
      items: [
        {
          id: 1001,
          name: 'Item 1',
          price: 10.99,
        },
        {
          id: 1002,
          name: 'Item 2',
          price: 20.99,
        },
      ],
    };

    const parser = new Parser('orders[[0,3]]');
    const path = parser.parsePath();
    let result: JSONType;

    // eslint-disable-next-line prefer-const
    result = injectValue(result, order, path);

    expect(result).toStrictEqual({
      orders: [
        {
          id: 101,
          date: '2023-01-15',
          items: [
            {
              id: 1001,
              name: 'Item 1',
              price: 10.99,
            },
            {
              id: 1002,
              name: 'Item 2',
              price: 20.99,
            },
          ],
        },
      ],
    });
  });

  it('should map short array to non-existing array target', () => {
    const order = [
      {
        id: 1001,
        name: 'Item 1',
        price: 10.99,
      },
      {
        id: 1002,
        name: 'Item 2',
        price: 20.99,
      },
    ];

    const parser = new Parser('items[[0,3]]');
    const path = parser.parsePath();
    let result: JSONType;

    // eslint-disable-next-line prefer-const
    result = injectValue(result, order, path);

    expect(result).toStrictEqual({
      items: [
        {
          id: 1001,
          name: 'Item 1',
          price: 10.99,
        },
        {
          id: 1002,
          name: 'Item 2',
          price: 20.99,
        },
      ],
    });
  });

  it('should map short array to existing array target', () => {
    const order = [
      {
        id: 1001,
        name: 'Item 1',
        price: 10.99,
      },
      {
        id: 1002,
        name: 'Item 2',
        price: 20.99,
      },
    ];

    const parser = new Parser('items[[0,3]]');
    const path = parser.parsePath();
    let result: JSONType = {
      random: {
        stuff: 'here',
      },
      items: [
        {
          id: 2001,
          name: 'Item 2.1',
          price: 110.99,
        },
        {
          id: 2002,
          name: 'Item 2.2',
          price: 120.99,
        },
        {
          id: 2003,
          name: 'Item 2.3',
          price: 130.99,
        },
      ],
    };

    result = injectValue(result, order, path);

    expect(result).toStrictEqual({
      random: {
        stuff: 'here',
      },
      items: [
        {
          id: 1001,
          name: 'Item 1',
          price: 10.99,
        },
        {
          id: 1002,
          name: 'Item 2',
          price: 20.99,
        },
        {
          id: 2003,
          name: 'Item 2.3',
          price: 130.99,
        },
      ],
    });
  });

  it('should map short array to reverse existing array target', () => {
    const order = [
      {
        id: 1001,
        name: 'Item 1',
        price: 10.99,
      },
      {
        id: 1002,
        name: 'Item 2',
        price: 20.99,
      },
    ];

    const parser = new Parser('items[[0,-3]]');
    const path = parser.parsePath();

    let result: JSONType = {
      random: {
        stuff: 'here',
      },
      items: [
        {
          id: 2001,
          name: 'Item 2.1',
          price: 110.99,
        },
        {
          id: 2002,
          name: 'Item 2.2',
          price: 120.99,
        },
        {
          id: 2003,
          name: 'Item 2.3',
          price: 130.99,
        },
      ],
    };

    result = injectValue(result, order, path);

    expect(result).toStrictEqual({
      random: {
        stuff: 'here',
      },
      items: [
        {
          id: 2001,
          name: 'Item 2.1',
          price: 110.99,
        },
        {
          id: 1002,
          name: 'Item 2',
          price: 20.99,
        },
        {
          id: 1001,
          name: 'Item 1',
          price: 10.99,
        },
      ],
    });
  });

  it('should map long array to non-existing array target', () => {
    const order = [
      {
        id: 1001,
        name: 'Item 1',
        price: 10.99,
      },
      {
        id: 1002,
        name: 'Item 2',
        price: 20.99,
      },
      {
        id: 1003,
        name: 'Item 3',
        price: 30.99,
      },
      {
        id: 1004,
        name: 'Item 4',
        price: 40.99,
      },
    ];

    const parser = new Parser('items[[0,3]]');
    const path = parser.parsePath();
    let result: JSONType;

    // eslint-disable-next-line prefer-const
    result = injectValue(result, order, path);

    expect(result).toStrictEqual({
      items: [
        {
          id: 1001,
          name: 'Item 1',
          price: 10.99,
        },
        {
          id: 1002,
          name: 'Item 2',
          price: 20.99,
        },
        {
          id: 1003,
          name: 'Item 3',
          price: 30.99,
        },
      ],
    });
  });

  it('should map long array to reverse non-existing array target', () => {
    const order = [
      {
        id: 1001,
        name: 'Item 1',
        price: 10.99,
      },
      {
        id: 1002,
        name: 'Item 2',
        price: 20.99,
      },
      {
        id: 1003,
        name: 'Item 3',
        price: 30.99,
      },
      {
        id: 1004,
        name: 'Item 4',
        price: 40.99,
      },
    ];

    const parser = new Parser('items[[0,-3]]');
    const path = parser.parsePath();
    let result: JSONType;

    // eslint-disable-next-line prefer-const
    result = injectValue(result, order, path);

    expect(result).toStrictEqual({
      items: [
        {
          id: 1003,
          name: 'Item 3',
          price: 30.99,
        },
        {
          id: 1002,
          name: 'Item 2',
          price: 20.99,
        },
        {
          id: 1001,
          name: 'Item 1',
          price: 10.99,
        },
      ],
    });
  });
});
