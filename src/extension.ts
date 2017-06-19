'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';

// Settings as defined in VS Code
interface Settings {
    gql2ts: {
        enable: boolean;
        schemaJson: string;
    };
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Extension "gql2ts" activated.');

    const settings: Settings = null;

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.gql2ts', () => {
        // The code you place here will be executed every time your command is executed
        console.log('creating interfaces..');

        const activeEditor = vscode.window.activeTextEditor;

        if (!activeEditor) {
            console.log('no active editor');
            return;
        }

        const MARKER = 'start of gql2ts';
        const text = activeEditor.document.getText();
        const regex = new RegExp(`${MARKER}`, 'g');
        const match = regex.exec(text);

        if (match) {
            clearLines(match).then(addLines);
        } else {
            addLines();
        }

        function clearLines(match) {
            const matchPos = activeEditor.document.positionAt(match.index);
            const startPos = matchPos.with(matchPos.line, 0);
            const endPos = new vscode.Position(activeEditor.document.lineCount + 1, 0);

            return activeEditor.edit(editBuilder =>
                editBuilder.delete(new vscode.Range(startPos, endPos))
            );
        }

        function addLines() {
            const fileName = activeEditor.document.fileName;
            const lineCount = activeEditor.document.lineCount;
            const rootPath = vscode.workspace.rootPath;
            // FIXME
            // Following does not work. Run time error.
            //
            // const configSchemaJson = vscode.workspace.getConfiguration('gql2ts').get('schemaJson');
            // const schemaJson = configSchemaJson ? configSchemaJson : rootPath + '/schema.json';
            const schemaJson = `${rootPath}/schema.json`;
            const command = `apollo-codegen generate ${fileName} --target ts --schema ${schemaJson}`;

            const child = exec(command, (err, stdout, stderr) => {

                if (err) {
                    console.error(err);
                    return;
                }

                activeEditor.edit(editBuilder => {

                    editBuilder.insert(new vscode.Position(lineCount, 0), '\n');
                    editBuilder.insert(
                        new vscode.Position(lineCount + 1, 0),
                        `// --- ${MARKER}: DO NOT DELETE AND DO NOT ADD ANYTHING BEYOND THIS SECTION ---`);
                    editBuilder.insert(new vscode.Position(lineCount + 2, 0), '\n');
                    editBuilder.insert(new vscode.Position(lineCount + 4, 0), stdout);
                })
                    .then(_ => vscode.window.showInformationMessage('Interface(s) created'));
            });
        }
    });
}

// this method is called when your extension is deactivated
export function deactivate() { }
