import path from 'path';
import chalk from 'chalk';
import fse from 'fs-extra';
import ora, { Ora } from 'ora';

import { isExtension } from '@directus/shared/utils';
import { ExtensionType } from '@directus/shared/types';
import { EXTENSION_TYPES, EXTENSION_LANGUAGES } from '@directus/shared/constants';

import log from '../../utils/logger';
import loadConfig from '../../utils/load-config';
import { getLanguageFromPath, isLanguage, languageToShort } from '../../utils/languages';

import { Pool, spawn, Worker } from 'threads'

type BuildOptions = {
    type: string;
    input: string;
    output: string;
    language: string;
    force: boolean;
    watch: boolean;
};

type ModuleInput = {
    input: string;
    output: string;
    spinner: Ora,
    extensionType: ExtensionType;
};

export default async function buildCommand(options: BuildOptions): Promise<void> {
    const input = options.input || "./src/extensions/";
    const output = options.output || "./extensions/";

    const mainSpinner = ora({
        text: 'Building Directus extensions...',
        spinner: 'pong',
    }).start();
    const prebuildSpinner = ora('Checking/Cleaning working directories...').start();

    if (!await fse.pathExists(input)) {
        log(`The input path ${chalk.bold(input)} doesn't exist!`, 'error');
        process.exit(1);
        return;
    }

    if (await fse.pathExists(output)) {
        await fse.emptyDir(output);
    }

    prebuildSpinner.text = 'Reading source files...';

    const inputFiles = await fse.promises.readdir(input);

    let inputBuild: ModuleInput[] = [];

    for (const file of inputFiles) {
        if (file.startsWith('.git')) continue;

        const regexRes = /([^/]*)\/?$/.exec(file);
        if (regexRes == null || regexRes.length < 2) continue;

        const extensionTypePlural = regexRes[1];
        if (extensionTypePlural == null) continue;

        const extensionType = extensionTypePlural.substring(0, extensionTypePlural.length - 1);
        const fullInputPath = path.join(input, file);

        if (!isExtension(extensionType)) {
            log(`${chalk.bold(extensionType)} from ${fullInputPath} isn't a valid extension type. ${EXTENSION_TYPES.map((t) =>
                chalk.bold.magenta(t)
            ).join(', ')}.`, 'warn');

            continue;
        }

        const fullOutputPath = path.join(output, file);
        const extensionModules = await fse.promises.readdir(fullInputPath);

        for (const moduleFile of extensionModules) {
            if (moduleFile.startsWith('.git')) continue;

            const fullModulePath = path.join(fullInputPath, moduleFile);
            const fullModuleOutPath = path.join(fullOutputPath, moduleFile);
            const fileStat = await fse.stat(fullModulePath);
            const spinner = ora(`Building extension ${extensionType}/${moduleFile}`);

            if (fileStat.isDirectory()) {
                let added: boolean = false;

                for (const lang of EXTENSION_LANGUAGES) {
                    const fileToLook = `index.${languageToShort(lang)}`;
                    const fullInput = path.join(fullModulePath, fileToLook);

                    if (!fse.existsSync(fullInput)) continue;

                    added = true;
                    const fullOutput = path.join(fullModuleOutPath, 'index.js');

                    inputBuild.push({
                        input: fullInput,
                        output: fullOutput,
                        spinner,
                        extensionType,
                    })
                    break;
                }

                if (!added) {
                    log(`Couldn't find files to build in ${chalk.bold(fullModulePath)}. Make sure there is an index file with a supported language.`, 'warn');
                }
            } else {
                const lang = getLanguageFromPath(fullModulePath);

                if (!isLanguage(lang)) {
                    log(`${chalk.bold(lang)} isn't a supported language! ${chalk.bold(fullModulePath)}`, 'warn');
                    continue;
                }

                const shortLang = languageToShort(lang);
                const outputFileExt = fullOutputPath.substring(0, fullOutputPath.length - shortLang.length);

                inputBuild.push({
                    input: fullModulePath,
                    output: outputFileExt + 'js',
                    spinner,
                    extensionType,
                });
            }
        }
    }

    const config = await loadConfig();
    const pool = Pool(() => spawn(new Worker('./worker')));

    for (let i = 0; i < inputBuild.length; i++) {
        const inputModule = inputBuild[i];

        if (inputModule == null) break;

        const inputPath = inputModule.input;
        const outputPath = inputModule.output;
        const extensionType = inputModule.extensionType;
        const spinner = inputModule.spinner;

        prebuildSpinner.text = 'Starting workers...';
        spinner.start();

        pool.queue(async worker => {
            if (worker == null) return;

            /* @ts-ignore */
            const spinObserver = worker.spinObserver();

            spinObserver.subscribe(({func, pass}) => {
                switch (func) {
                    case 'start':
                        spinner.start(...pass);
                        break;
                    case 'succeed':
                        spinner.succeed(...pass);
                        break;
                    case 'fail':
                        spinner.fail(...pass);
                        break;
                    case 'text':
                        spinner.text = pass.join(' ');
                        break;
                }
            });

            /* @ts-ignore */
            worker.prepareBuild(inputPath, outputPath, extensionType, config);
            /* @ts-ignore */
            await worker.build(options.watch);
        }).then(() => {
            spinner.stop();
        });
    }

    prebuildSpinner.stop();

    await pool.completed();

    mainSpinner.succeed(chalk.bold('Done!'));
    await pool.terminate();

    mainSpinner.stopAndPersist();
}