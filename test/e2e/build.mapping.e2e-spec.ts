import { Mapping } from '../../dist/index.js';
import { Mapping as TestMapping } from '../../src/index.js';

import { createTests } from '../harness/mapping.harness.js';

// the tests will treat Mapping as the correct type
createTests(Mapping as unknown as typeof TestMapping);
