import {ExtensionType} from '@directus/shared/types';
import {Language} from '../types';
import {OutputOptions as RollupOutputOptions, Plugin, RollupError, RollupOptions} from 'rollup';
import {isAppExtension} from '@directus/shared/utils';
import {API_SHARED_DEPS, APP_SHARED_DEPS} from '@directus/shared/constants';

import log from './logger';
import chalk from 'chalk';

import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import vue from 'rollup-plugin-vue';
import typescript from 'rollup-plugin-typescript2';
import styles from 'rollup-plugin-styles';

function getRollupOptions(
    type: ExtensionType,
    language: Language,
    input: string,
    plugins: Plugin[] = []
): RollupOptions {
    if (isAppExtension(type)) {
        return {
            input,
            external: APP_SHARED_DEPS,
            plugins: [
                vue({ preprocessStyles: true }),
                language === 'typescript' ? typescript({ check: false }) : null,
                styles(),
                ...plugins,
                nodeResolve({ browser: true }),
                commonjs({ esmExternals: true, sourceMap: false }),
                json(),
                replace({
                    values: {
                        'process.env.NODE_ENV': JSON.stringify('production'),
                    },
                    preventAssignment: true,
                }),
                terser(),
            ],
        };
    } else {
        return {
            input,
            external: API_SHARED_DEPS,
            plugins: [
                language === 'typescript' ? typescript({ check: false }) : null,
                ...plugins,
                nodeResolve(),
                commonjs({ sourceMap: false }),
                json(),
                replace({
                    values: {
                        'process.env.NODE_ENV': JSON.stringify('production'),
                    },
                    preventAssignment: true,
                }),
                terser(),
            ],
        };
    }
}

function getRollupOutputOptions(type: ExtensionType, name: string, output: string): RollupOutputOptions {
    if (isAppExtension(type)) {
        return {
            file: output,
            format: 'es',
        };
    } else {
        return {
            name,
            file: output,
            format: 'cjs',
            // exports: 'default',
        };
    }
}

function handleRollupError(error: RollupError): void {
    const pluginPrefix = error.plugin ? `(plugin ${error.plugin}) ` : '';
    log('\n' + chalk.red.bold(`${pluginPrefix}${error.name}: ${error.message}`));

    if (error.url) {
        log(chalk.cyan(error.url), 'error');
    }

    if (error.loc) {
        log(`${(error.loc.file || error.id)!} (${error.loc.line}:${error.loc.column})`);
    } else if (error.id) {
        log(error.id);
    }

    if (error.frame) {
        log(chalk.dim(error.frame));
    }

    if (error.stack) {
        log(chalk.dim(error.stack));
    }
}

export {
    getRollupOptions, getRollupOutputOptions,
    handleRollupError,
}