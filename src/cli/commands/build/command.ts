import path from 'path';
import chalk from 'chalk';
import fse from 'fs-extra';

import { isExtension } from '@directus/shared/utils';
import { ExtensionType } from '@directus/shared/types';
import { EXTENSION_TYPES, EXTENSION_LANGUAGES } from '@directus/shared/constants';

import log from '../../utils/logger';
import loadConfig from '../../utils/load-config';
import { getLanguageFromPath, isLanguage, languageToShort } from '../../utils/languages';

import { Ui } from './ui';

import { Pool, spawn, Worker } from 'threads'

export type BuildOptions = {
    input: string;
    output: string;
    language: string;
    watch: boolean;
};

export type ModuleInput = {
    input: string;
    output: string;
    extensionType: ExtensionType;

    spinnerText: string;
    done: boolean;
};

export async function buildCommand(options: BuildOptions, uiInstance: Ui): Promise<void> {
    const input = options.input || "./src/extensions/";
    const output = options.output || "./extensions/";

    if (!await fse.pathExists(input)) {
		uiInstance.log(`The input path ${chalk.bold(input)} doesn't exist!`, 'error');
        return Promise.reject(1);
    }

    if (await fse.pathExists(output)) {
        await fse.emptyDir(output);
    }

	uiInstance.setPrebuildText('Reading source files...');

    const inputFiles = await fse.promises.readdir(input);

    let inputBuild: ModuleInput[] = [];

	function addInput(module: ModuleInput) {
		inputBuild.push(module);
		uiInstance.setModules(inputBuild);
	}

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
            const spinnerText = `Building extension ${extensionType}/${moduleFile}`;

            if (fileStat.isDirectory()) {
                let added: boolean = false;

                for (const lang of EXTENSION_LANGUAGES) {
                    const fileToLook = `index.${languageToShort(lang)}`;
                    const fullInput = path.join(fullModulePath, fileToLook);

                    if (!fse.existsSync(fullInput)) continue;

                    added = true;
                    const fullOutput = path.join(fullModuleOutPath, 'index.js');

					addInput({
						input: fullInput,
						output: fullOutput,
						extensionType,

						spinnerText,
						done: false,
					});

                    break;
                }

                if (!added) {
                    log(`Couldn't find files to build in ${chalk.bold(fullModulePath)}. Make sure there is an index file with a supported language.`, 'warn');
                }
            } else {
                const lang = getLanguageFromPath(fullModulePath);

                if (!isLanguage(lang)) {
                    uiInstance.log(`${chalk.bold(lang)} isn't a supported language! ${chalk.bold(fullModulePath)}`, 'warn');
                    continue;
                }

                const shortLang = languageToShort(lang);
                const outputFileExt = fullOutputPath.substring(0, fullOutputPath.length - shortLang.length);

				addInput({
                    input: fullModulePath,
                    output: outputFileExt + 'js',
                    extensionType,

					spinnerText,
					done: false,
                });
            }
        }
    }

    const config = await loadConfig();
    const pool = Pool(() => spawn(new Worker('./worker')));

	uiInstance.setPrebuildText('Starting workers...');

    for (let i = 0; i < inputBuild.length; i++) {
        const inputModule = inputBuild[i];

        if (inputModule == null) break;

        const inputPath = inputModule.input;
        const outputPath = inputModule.output;
        const extensionType = inputModule.extensionType;

        pool.queue(async worker => {
            if (worker == null) return;

            /* @ts-ignore */
            const spinObserver = worker.spinObserver();

            spinObserver.subscribe(({func, pass}) => {
				let text = pass.join(' ');

                switch (func) {
                    case 'succeed':
						text = `${chalk.green('✓')} ${text}`;
                        break;
                    case 'fail':
						text = `${chalk.red('✕')} ${text}`;
                        break;
                }

				inputModule.spinnerText = text;

				inputBuild[i] = inputModule;
				uiInstance.setModules(inputBuild);
            });

            /* @ts-ignore */
            worker.prepareBuild(inputPath, outputPath, extensionType, config);
            /* @ts-ignore */
            await worker.build(options.watch);
        });
    }

    uiInstance.setPrebuildText('Prebuild Completed.');
	uiInstance.setPrebuilding();

    await pool.completed();

	uiInstance.setMainText('Finishing up...');
    await pool.terminate();

	uiInstance.setMainText(chalk.bold('Done!'));
	uiInstance.setBuilding();
}
