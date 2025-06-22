import * as vscode from 'vscode';
import { Anchor, AnchorIcon, ANCHOR_ICONS } from './types/Anchor';
import { AnchorProvider } from './AnchorProvider';

// Mementoから復元するための型ガード
interface StoredAnchor {
	id: string;
	label: string;
	filePath: string;
	lineNumber: number;
	endLineNumber: number;
	codeText: string;
	icon: AnchorIcon;
	note: string;
}

function isStoredAnchor(obj: any): obj is StoredAnchor {
	return obj &&
		   typeof obj.id === 'string' &&
		   typeof obj.label === 'string' &&
		   typeof obj.filePath === 'string' &&
		   typeof obj.lineNumber === 'number' &&
		   typeof obj.endLineNumber === 'number' &&
		   typeof obj.codeText === 'string' &&
		   typeof obj.icon === 'string' &&
		   typeof obj.note === 'string';
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "code-anchor" is now active! ⚓');

	const ANCHOR_LIMIT = 20;

	// --- Decoration ---
	const decorationTypes = Object.entries(ANCHOR_ICONS).reduce((acc, [key, value]) => {
		acc[key as AnchorIcon] = vscode.window.createTextEditorDecorationType({
			gutterIconPath: vscode.Uri.file(context.asAbsolutePath(require('path').join('resources', value))),
			gutterIconSize: 'contain',
		});
		return acc;
	}, {} as Record<AnchorIcon, vscode.TextEditorDecorationType>);

	const updateDecorations = (editor: vscode.TextEditor) => {
		const docPath = editor.document.uri.fsPath;
		const decorations: Record<AnchorIcon, vscode.DecorationOptions[]> = Object.keys(ANCHOR_ICONS).reduce((p, c) => ({...p, [c]: []}), {} as any);

		getAnchors().filter(a => a.filePath === docPath).forEach(anchor => {
			const range = new vscode.Range(anchor.lineNumber, 0, anchor.lineNumber, 0);
			decorations[anchor.icon].push({ range });
		});
		
		Object.entries(decorations).forEach(([icon, ranges]) => {
			editor.setDecorations(decorationTypes[icon as AnchorIcon], ranges);
		});
	};
	// --- End Decoration ---

	const getAnchors = (): Anchor[] => {
		const stored: StoredAnchor[] = context.workspaceState.get('anchors', []);
		return stored.filter(isStoredAnchor).map(a => new Anchor(a.label, vscode.TreeItemCollapsibleState.None, a.filePath, a.lineNumber, a.endLineNumber, a.codeText, a.icon, a.note, a.id));
	};

	const saveAnchors = (anchors: Anchor[]) => {
		const toStore: StoredAnchor[] = anchors.map(a => ({ id: a.id, label: a.label, filePath: a.filePath, lineNumber: a.lineNumber, endLineNumber: a.endLineNumber, codeText: a.codeText, icon: a.icon, note: a.note }));
		context.workspaceState.update('anchors', toStore);
		if (vscode.window.activeTextEditor) {
			updateDecorations(vscode.window.activeTextEditor);
		}
	};

	let anchors = getAnchors();
	const anchorProvider = new AnchorProvider(anchors);
	const treeView = vscode.window.createTreeView('codeAnchorView', { treeDataProvider: anchorProvider });

	const refreshTreeView = () => {
		anchors = getAnchors();
		anchorProvider.load(anchors);
	};

	// 'addAnchor' コマンドの実装
	const addAnchorCommand = vscode.commands.registerCommand('code-anchor.addAnchor', async () => {
		if (getAnchors().length >= ANCHOR_LIMIT) {
			vscode.window.showWarningMessage(`You can only have up to ${ANCHOR_LIMIT} anchors.`);
			return;
		}
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }
		const selection = editor.selection;
		if (selection.isEmpty) { return; }

		const icon = await vscode.window.showQuickPick(Object.keys(ANCHOR_ICONS).map(k => ({label: k})), { title: 'Select an icon for the anchor' });
		if (!icon) { return; }
		
		const note = await vscode.window.showInputBox({ prompt: 'Enter a note for the anchor' });
		
		const newAnchor = new Anchor(editor.document.getText(selection).trim(), vscode.TreeItemCollapsibleState.None, editor.document.uri.fsPath, selection.start.line, selection.end.line, editor.document.getText(selection), icon.label as AnchorIcon, note || '');
		
		const currentAnchors = getAnchors();
		saveAnchors([...currentAnchors, newAnchor]);
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

	const deleteAnchorCommand = vscode.commands.registerCommand('code-anchor.deleteAnchor', (clickedAnchor: Anchor, selectedAnchors: Anchor[]) => {
		const toDelete = selectedAnchors && selectedAnchors.length > 0 ? selectedAnchors : [clickedAnchor];
		const toDeleteIds = toDelete.map(a => a.id);
		
		const keptAnchors = getAnchors().filter(a => !toDeleteIds.includes(a.id));
		saveAnchors(keptAnchors);
		refreshTreeView();
		vscode.window.showInformationMessage(`🗑️ ${toDelete.length} anchor(s) deleted!`);
	});

	const editAnchorCommand = vscode.commands.registerCommand('code-anchor.editAnchor', async (anchor: Anchor) => {
		const newLabel = await vscode.window.showInputBox({ prompt: "Enter a new label", value: anchor.label });
		if (newLabel === undefined) return;
		
		const newIcon = await vscode.window.showQuickPick(Object.keys(ANCHOR_ICONS).map(k => ({label: k})), { title: 'Select a new icon', placeHolder: anchor.icon });
		if (newIcon === undefined) return;

		const newNote = await vscode.window.showInputBox({ prompt: "Enter a new note", value: anchor.note });
		if (newNote === undefined) return;

		const currentAnchors = getAnchors();
		const toUpdate = currentAnchors.find(a => a.id === anchor.id);
		if (toUpdate) {
			toUpdate.label = newLabel || toUpdate.label;
			toUpdate.icon = newIcon.label as AnchorIcon;
			toUpdate.note = newNote;
		}
		saveAnchors(currentAnchors);
		refreshTreeView();
		vscode.window.showInformationMessage(`✏️ Anchor updated!`);
	});

	const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDecorations(editor);
		}
	});

	const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(event => {
		if (getAnchors().length === 0) return;
		const changedDocPath = event.document.uri.fsPath;
		let needsUpdate = false;
		const currentAnchors = getAnchors();

		for (const change of event.contentChanges) {
			const linesDelta = (change.text.match(/\n/g) || []).length - (change.range.end.line - change.range.start.line);

			currentAnchors.forEach(anchor => {
				if (anchor.filePath === changedDocPath && change.range.end.line < anchor.lineNumber) {
					anchor.lineNumber += linesDelta;
					needsUpdate = true;
				}
			});
		}
		if (needsUpdate) {
			saveAnchors(currentAnchors);
			refreshTreeView();
		}
	});
	
	context.subscriptions.push(
		addAnchorCommand,
		jumpToAnchorCommand,
		deleteAnchorCommand,
		editAnchorCommand,
		onDidChangeActiveTextEditor,
		onDidChangeTextDocument,
		treeView,
		...Object.values(decorationTypes)
	);
	
	if (vscode.window.activeTextEditor) {
		updateDecorations(vscode.window.activeTextEditor);
	}
}

export function deactivate() {} 