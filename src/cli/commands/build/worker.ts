import { ExtensionType } from '@directus/shared/types';

import { rollup, RollupError, watch as rollupWatch } from 'rollup';

import { expose } from 'threads/worker';
import { Observable, Subject } from 'threads/observable';

import chalk from 'chalk';

import { getRollupOptions, getRollupOutputOptions, handleRollupError } from "../../utils/rollup-settings";

let moduleEntrypoint: string;
let outputPath: string;
let buildExtensionType: ExtensionType;
let buildConfig: Record<string, any> | undefined;

let spinnerSubject = new Subject();

function prepareBuild(path: string, output: string, extensionType: ExtensionType, config?: Record<string, any>) {
    moduleEntrypoint = path;
    outputPath = output;
    buildExtensionType = extensionType;
    buildConfig = config;
}

async function build(watch: boolean = false) {
    if (watch) {
        return buildAndWatch();
    }

    let rollupOptions = getRollupOptions(buildExtensionType, moduleEntrypoint, buildConfig?.plugins);
    const rollupOutputOptions = getRollupOutputOptions(buildExtensionType, moduleEntrypoint, outputPath);

    try {
        const bundle = await rollup(rollupOptions);

        await bundle.write(rollupOutputOptions);
        await bundle.close();

        spinnerSubject.next({
            func: 'succeed',
            pass: [ chalk.bold('Done') ],
        });
    } catch (error) {
        spinnerSubject.next({
            func: 'fail',
            pass: [ chalk.bold('Failed') ],
        });
        handleRollupError(error as RollupError);
        process.exitCode = 1;
    }
}

async function buildAndWatch() {
    let rollupOptions = getRollupOptions(buildExtensionType, moduleEntrypoint, buildConfig?.plugins);
    const rollupOutputOptions = getRollupOutputOptions(buildExtensionType, moduleEntrypoint, outputPath);

    const watcher = rollupWatch({
        ...rollupOptions,
        output: rollupOutputOptions,
    });

    watcher.on('event', async (event) => {
        switch (event.code) {
            case 'ERROR': {
                spinnerSubject.next({
                    func: 'fail',
                    pass: [ chalk.bold('Failed') ],
                });

                handleRollupError(event.error);

                spinnerSubject.next({
                    func: 'start',
                    pass: [ chalk.bold('Watching files for changes...') ],
                });
                break;
            }
            case 'BUNDLE_END':
                await event.result.close();

                spinnerSubject.next({
                    func: 'succeed',
                    pass: [ chalk.bold('Done') ],
                });
                spinnerSubject.next({
                    func: 'start',
                    pass: [ chalk.bold('Watching files for changes...') ],
                });
                break;
            case 'BUNDLE_START':
                spinnerSubject.next({
                    func: 'text',
                    pass: [ 'Building Directus extension...' ],
                });
                break;
        }
    });
}

function spinObserver() {
    return Observable.from(spinnerSubject);
}

const workerExports = {
    prepareBuild,
    build, buildAndWatch,

    spinObserver,
}

expose(workerExports);
export default workerExports;