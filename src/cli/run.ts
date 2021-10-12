import React from 'react';
import { render } from 'ink';

import meow from 'meow';

import { Ui } from './commands/build';

const cli = meow(`
    Usage
      $ directus-stdextension-builder build [options]

    Options
      --input, -i  Overwrite the default extensions sources folder (src/extensions/)
      --output, -o  Overwrite the default output folder (extensions/)
      --language, -l  Overwrite the language to use
      --watch, -w  Watch and rebuild on changes
`);

// Currently the input doesn't matter.
// For more commands switch cli.input[0]

render(React.createElement(Ui, cli.flags));
