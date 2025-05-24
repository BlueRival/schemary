import { JSON } from '../../dist/index.js';
import { JSON as TestJSON } from '../../src/index.js';

import { createTests } from '../harness/json.harness.js';

createTests(JSON as typeof TestJSON);
