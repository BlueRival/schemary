import { Schema } from '../../dist/index.js';
import { Schema as TestSchema } from '../../src/index.js';

import { createTests } from '../harness/schema.harness.js';

createTests(Schema as typeof TestSchema);
