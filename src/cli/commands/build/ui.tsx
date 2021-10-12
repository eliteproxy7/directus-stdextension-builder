import React from 'react';
import chalk from 'chalk';
import { Component } from 'react';
import { Box, Text } from 'ink';
import Spinner from "ink-spinner";
import { ModuleInput, buildCommand } from './';

const minHeight = 50;

type UiState = {
	mainSpinnerText: string,
	preBuildSpinnerText: string,
	preBuilding: boolean,
	building: boolean,
	modulesInput: ModuleInput[],
	logs: string[],
}

type LogType = 'info' | 'warn' | 'error';

export class Ui extends Component<Record<string, any>, UiState> {

    constructor(props: Record<string, any>) {
        super(props);

		this.state = {
			mainSpinnerText: 'Building Directus extensions...',
			preBuildSpinnerText: 'Checking/Cleaning working directories...',
			preBuilding: false,
			building: false,
			modulesInput: [],
			logs: [ 'Starting build...' ],
		};
    }

    render() {
        return <>
            <Box flexGrow={1} minHeight={minHeight}>
                <Box flexDirection="column">
                    <Box height="50%">
                        {this.state.logs.map((log) =>
                            <Text>{log}</Text>
                        )}
                    </Box>

					{!this.state.building ?
						<Text color="blue">
							<Spinner type="pong"/>
						</Text>
						:
						<Text color="green">\u2713</Text>
					}
                    {' '}{this.state.mainSpinnerText}

					{!this.state.preBuilding ?
						<Text color="aqua">
							<Spinner type="pong"/>
						</Text>
						:
						<Text color="green">\u2713</Text>
					}
                    {' '}{this.state.preBuildSpinnerText}
                </Box>

                <Box flexDirection="column">
                    {this.state.modulesInput.map((module) =>
                        <>
                            {!module.done ?
                                <Text color="blue">
                                    <Spinner type="dots"/>
                                </Text>
                                :
                                <Text color="green">\u2713</Text>
                            }
                            {' '}{module.spinnerText}
                        </>
                    )}
                </Box>
            </Box>
        </>;
    }

    componentDidMount() {
		const {
			input, output,
			language, watch
		} = this.props;

		buildCommand({
			input, output,
			language, watch
		}, this).catch((code) => process.exit(code));
    }

    log(message: string, type?: LogType) {
        switch (type) {
            case 'error':
                message = `${chalk.bold.red('[Error]')} ${message}`;
                break;
            case 'warn':
                message = `${chalk.bold.yellow('[Warn]')} ${message}`;
                break;
            case 'info':
                message = `${chalk.bold.gray('[Info]')} ${message}`;
                break;
        }

        this.setState((prevState) => {
            return {
                logs: [
                    ...prevState.logs,
                    message,
                ],
            };
        });
    }

    setMainText(text: string) {
        this.setState(() => {
            return {
                mainSpinnerText: text
            };
        });
    }

	setBuilding(building: boolean = false) {
		this.setState(() => {
			return {
				building,
			};
		});
	}

    setPrebuildText(text: string) {
        this.setState(() => {
            return {
                preBuildSpinnerText: text
            };
        });
    }

	setPrebuilding(preBuilding: boolean = false) {
		this.setState(() => {
			return {
				preBuilding,
			};
		});
	}

    setModules(modules: ModuleInput[]) {
        this.setState(() => {
            return {
                modulesInput: modules
            };
        });
    }

}
