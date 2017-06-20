'use strict';
import * as vscode from 'vscode';
import { exec } from 'shelljs';

const subscriptions: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
    console.log('Extension "gql2ts" activated.');

    // vscode.workspace.onDidChangeConfiguration(appendInterfaces, null, subscriptions);
    // vscode.workspace.onDidChangeTextDocument(appendInterfaces, null, subscriptions);

    let disposable = vscode.commands.registerCommand('extension.gql2ts', () => {
        appendInterfaces();
    });
    subscriptions.push(disposable);
}

export function deactivate() {
    vscode.Disposable.from(...subscriptions).dispose();
}

async function appendInterfaces() {
    const marker = 'start of gql2ts';
    const previous = await getPrevious(marker);

    if (previous) {
        await clearPrevious(previous);
    }

    const content = await generateInterfaces(marker);
    await addLines(content);
    vscode.window.showInformationMessage('Interface(s) created');
}

async function generateInterfaces(marker): Promise<any> {
    const fileName = vscode.window.activeTextEditor.document.fileName;
    const lineCount = vscode.window.activeTextEditor.document.lineCount;
    const rootPath = vscode.workspace.rootPath;

    let schemaFile = await vscode.workspace.findFiles('**/schema.json', '**/node_modules/**', 5)
        .then(uris => uris[0].fsPath);

    let configSchemaFile = null;
    configSchemaFile = vscode.workspace.getConfiguration('gql2ts').get('schemaFile');

    if (configSchemaFile) {
        schemaFile = `${vscode.workspace.rootPath}/${configSchemaFile}`;
    }

    const command = `apollo-codegen generate ${fileName} --target ts --schema ${schemaFile}`;
    console.log('command:', command);

    return new Promise((resolve, reject) => {
        exec(command, function (code, stdout, stderr) {
            if (code !== 0) {
                return reject('exec error');
            }
            return resolve(stdout);
        });
    });
}

async function getPrevious(marker): Promise<any> {
    const activeTextEditor = vscode.window.activeTextEditor;
    const text = activeTextEditor.document.getText();
    const regex = new RegExp(`${marker}`, 'g');
    const match = regex.exec(text);
    return Promise.resolve(match);
}

async function clearPrevious(match) {
    const matchPos = vscode.window.activeTextEditor.document.positionAt(match.index);
    const startPos = matchPos.with(matchPos.line, 0);
    const endPos = new vscode.Position(vscode.window.activeTextEditor.document.lineCount + 1, 0);

    return vscode.window.activeTextEditor.edit(editBuilder =>
        editBuilder.delete(new vscode.Range(startPos, endPos))
    );
}

async function addLines(content) {
    const marker = 'start of gql2ts';
    const lineCount = vscode.window.activeTextEditor.document.lineCount;

    return vscode.window.activeTextEditor.edit(editBuilder => {

        editBuilder.insert(new vscode.Position(lineCount, 0), '\n');
        editBuilder.insert(
            new vscode.Position(lineCount + 1, 0),
            `// --- ${marker}: DO NOT EDIT THIS LINE AND ANYTHING BELOW ---`);
        editBuilder.insert(new vscode.Position(lineCount + 2, 0), '\n');
        editBuilder.insert(new vscode.Position(lineCount + 4, 0), content);
    })
}
