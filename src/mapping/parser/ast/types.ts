import { AbstractPathIndexSegment } from './abstractPathIndexSegment.class.js';
import { AbstractPathIteratorSegment } from './abstractPathIteratorSegment.class.js';

export type PathSegment =
  | AbstractPathIndexSegment
  | AbstractPathIteratorSegment;
