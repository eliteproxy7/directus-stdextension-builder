import { ExtensionType } from '@directus/shared/types';
import { OutputOptions as RollupOutputOptions, Plugin, RollupError, RollupOptions } from 'rollup';
import { isAppExtension } from '@directus/shared/utils';

import log from './logger';
import { APP_SHARED_DEPS, API_SHARED_DEPS } from '../types';

import chalk from 'chalk';

import ts from 'rollup-plugin-ts';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import vue from 'rollup-plugin-vue';
import styles from 'rollup-plugin-styles';

const extensions = [
    '.js', '.jsx', '.ts', '.tsx',
];

function getRollupOptions(
    type: ExtensionType,
    input: string,
    plugins: Plugin[] = []
): RollupOptions {

    if (isAppExtension(type)) {
        return {
            input,
            external: APP_SHARED_DEPS,
            plugins: [
                vue({ preprocessStyles: true }),
                styles(),
                ...plugins,
                nodeResolve({ extensions, browser: true }),
                commonjs({
                    esmExternals: true, sourceMap: false,
                    include: [ 'src/**/*', 'node_modules/directus/**', ],
                    exclude: 'node_modules/**',
                }),
                json(),
                ts({
                    include: ['src/**/*', 'node_modules/directus/**',],
                    exclude: 'node_modules/**',
                    babelConfig: {
                        babelrc: false,
                        presets: ['@babel/preset-env', '@babel/preset-typescript'],
                    },
                }),
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
                ...plugins,
                nodeResolve({ extensions }),
                commonjs({
                    sourceMap: false,
                    include: [ 'src/**/*', 'node_modules/directus/**', ],
                    exclude: 'node_modules/**',
                }),
                json(),
                ts({
                    include: ['src/**/*', 'node_modules/directus/**',],
                    exclude: 'node_modules/**',
                    babelConfig: {
                        babelrc: false,
                        presets: ['@babel/preset-env', '@babel/preset-typescript'],
                    },
                }),
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
            exports: 'default',
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