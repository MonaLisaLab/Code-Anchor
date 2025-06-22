import * as vscode from 'vscode';
import { Anchor } from './types/Anchor';
import { AnchorProvider } from './AnchorProvider';

// Mementoから復元するための型ガード
interface StoredAnchor {
	label: string;
	filePath: string;
	lineNumber: number;
	endLineNumber: number;
	codeText: string;
}

function isStoredAnchor(obj: any): obj is StoredAnchor {
	return obj &&
		   typeof obj.label === 'string' &&
		   typeof obj.filePath === 'string' &&
		   typeof obj.lineNumber === 'number' &&
		   typeof obj.endLineNumber === 'number' &&
		   typeof obj.codeText === 'string';
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "code-anchor" is now active! ⚓');

	const ANCHOR_LIMIT = 20;

	const getAnchors = (): Anchor[] => {
		const stored: StoredAnchor[] = context.workspaceState.get('anchors', []);
		return stored
			.filter(isStoredAnchor)
			.map(anchor => new Anchor(
				anchor.label,
				vscode.TreeItemCollapsibleState.None,
				anchor.filePath,
				anchor.lineNumber,
				anchor.endLineNumber,
				anchor.codeText
			));
	};

	const saveAnchors = (anchors: Anchor[]) => {
		const toStore: StoredAnchor[] = anchors.map(a => ({
			label: a.label,
			filePath: a.filePath,
			lineNumber: a.lineNumber,
			endLineNumber: a.endLineNumber,
			codeText: a.codeText
		}));
		context.workspaceState.update('anchors', toStore);
	};

	let anchors = getAnchors();
	const anchorProvider = new AnchorProvider(anchors);
	vscode.window.registerTreeDataProvider('codeAnchorView', anchorProvider);

	const refreshTreeView = () => {
		anchors = getAnchors();
		anchorProvider.load(anchors);
	};

	// 'addAnchor' コマンドの実装
	const addAnchorCommand = vscode.commands.registerCommand('code-anchor.addAnchor', () => {
		if (anchors.length >= ANCHOR_LIMIT) {
			vscode.window.showWarningMessage(`You can only have up to ${ANCHOR_LIMIT} anchors. Please remove some to add new ones. 😢`);
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

		const selection = editor.selection;
		if (selection.isEmpty) { return; }

		const newAnchor = new Anchor(
			editor.document.getText(selection).trim(),
			vscode.TreeItemCollapsibleState.None,
			editor.document.uri.fsPath,
			selection.start.line,
			selection.end.line,
			editor.document.getText(selection)
		);

		anchors.push(newAnchor);
		saveAnchors(anchors);
		refreshTreeView();

		vscode.window.showInformationMessage(`⚓ Anchor added!`);
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
		}
	});

	const deleteAnchorCommand = vscode.commands.registerCommand('code-anchor.deleteAnchor', (anchor: Anchor) => {
		const index = anchors.findIndex(a => a.label === anchor.label && a.filePath === anchor.filePath);
		if (index !== -1) {
			anchors.splice(index, 1);
			saveAnchors(anchors);
			refreshTreeView();
			vscode.window.showInformationMessage(`🗑️ Anchor deleted!`);
		}
	});

	const editAnchorCommand = vscode.commands.registerCommand('code-anchor.editAnchor', async (anchor: Anchor) => {
		const newLabel = await vscode.window.showInputBox({
			prompt: "Enter a new label for the anchor",
			value: anchor.label
		});

		if (newLabel && newLabel !== anchor.label) {
			anchor.label = newLabel;
			saveAnchors(anchors);
			refreshTreeView();
			vscode.window.showInformationMessage(`✏️ Anchor updated!`);
		}
	});

	const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(event => {
		const changedDocPath = event.document.uri.fsPath;
		let needsUpdate = false;

		for (const change of event.contentChanges) {
			const linesDelta = (change.text.match(/\n/g) || []).length - (change.range.end.line - change.range.start.line);

			anchors.forEach(anchor => {
				if (anchor.filePath === changedDocPath && change.range.end.line < anchor.lineNumber) {
					anchor.lineNumber += linesDelta;
					needsUpdate = true;
				}
			});
		}

		if (needsUpdate) {
			saveAnchors(anchors);
			refreshTreeView();
		}
	});

	context.subscriptions.push(
		addAnchorCommand,
		jumpToAnchorCommand,
		deleteAnchorCommand,
		editAnchorCommand,
		onDidChangeTextDocument
	);
}

export function deactivate() {} 