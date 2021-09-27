import { Command } from 'commander';
import { buildCommand } from './commands/build';

const pkg = require('../../../package.json');

const program = new Command();

program.name('directus-stdextension-builder').usage('build [options]');
program.version(pkg.version, '-v, --version');

program
    .command('build')
    .description('Compile directus extension modules for the automatically detected extensions/ folder')
    .option('-i, --input <file>', 'overwrite the default extensions sources folder (src/extensions/)')
    .option('-o, --output <file>', 'overwrite the default output folder (extensions/)')
    .option('-l, --language <language>', 'overwrite the language to use')
    .option('-f, --force', 'ignore the package manifest')
    .option('-w, --watch', 'watch and rebuild on changes')
    .action(buildCommand);

program.parse(process.argv);