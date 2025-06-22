import * as vscode from 'vscode';
import { Anchor } from './types/Anchor';
import { AnchorProvider } from './AnchorProvider';

// Mementoから復元するための型ガード
interface StoredAnchor {
	label: string;
	filePath: string;
	lineNumber: number;
	codeText: string;
}

function isStoredAnchor(obj: any): obj is StoredAnchor {
	return obj &&
		   typeof obj.label === 'string' &&
		   typeof obj.filePath === 'string' &&
		   typeof obj.lineNumber === 'number' &&
		   typeof obj.codeText === 'string';
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "code-anchor" is now active! ⚓');

	// Mementoからアンカーを復元
	const storedAnchors: StoredAnchor[] = context.workspaceState.get('anchors', []);
	const anchors: Anchor[] = storedAnchors
		.filter(isStoredAnchor)
		.map(anchor => new Anchor(
			anchor.label,
			vscode.TreeItemCollapsibleState.None,
			anchor.filePath,
			anchor.lineNumber,
			anchor.codeText
		));
	
	// TreeViewのプロバイダーを作成
	const anchorProvider = new AnchorProvider(anchors);

	// TreeViewを登録
	vscode.window.registerTreeDataProvider('codeAnchorView', anchorProvider);


	// 'addAnchor' コマンドの実装
	const addAnchorCommand = vscode.commands.registerCommand('code-anchor.addAnchor', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found! 😢');
			return;
		}

		const selection = editor.selection;
		if (selection.isEmpty) {
			vscode.window.showWarningMessage('Please select some code to create an anchor. 😉');
			return;
		}

		const anchorText = editor.document.getText(selection).trim();
		const filePath = editor.document.uri.fsPath;
		const startLine = selection.start.line;

		const newAnchor = new Anchor(
			anchorText,
			vscode.TreeItemCollapsibleState.None,
			filePath,
			startLine,
			anchorText
		);

		anchors.push(newAnchor);
		// Mementoに保存
		context.workspaceState.update('anchors', anchors.map(a => ({
			label: a.label,
			filePath: a.filePath,
			lineNumber: a.lineNumber,
			codeText: a.codeText
		})));
		anchorProvider.refresh();

		vscode.window.showInformationMessage(`⚓ Anchor added for: "${anchorText}"`);
	});

	// 'jumpToAnchor' コマンドの実装
	const jumpToAnchorCommand = vscode.commands.registerCommand('code-anchor.jumpToAnchor', async (anchor: Anchor) => {
		try {
			const doc = await vscode.workspace.openTextDocument(anchor.filePath);
			const editor = await vscode.window.showTextDocument(doc);
			
			const position = new vscode.Position(anchor.lineNumber, 0);
			editor.selection = new vscode.Selection(position, position);
			editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
		} catch (err) {
			vscode.window.showErrorMessage('Could not open file. It may have been moved or deleted. 😢');
			console.error(err);
		}
	});

	context.subscriptions.push(addAnchorCommand, jumpToAnchorCommand);
}

export function deactivate() {} 