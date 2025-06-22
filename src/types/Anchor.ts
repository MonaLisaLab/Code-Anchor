import * as vscode from 'vscode';
import * as path from 'path';

export class Anchor extends vscode.TreeItem {
  constructor(
    public label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath: string,
    public lineNumber: number,
    public readonly endLineNumber: number,
    public readonly codeText: string,
  ) {
    super(label, collapsibleState);
    const lineInfo = this.lineNumber === this.endLineNumber
      ? `L${this.lineNumber + 1}`
      : `L${this.lineNumber + 1}-${this.endLineNumber + 1}`;
      
    this.tooltip = `${this.filePath}\n${lineInfo}`;
    this.description = `${path.basename(this.filePath)} (${lineInfo})`;
  }

  // アイコンを設定したい場合はここで設定できるよ！
  iconPath = {
    light: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'anchor.svg')),
    dark: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'anchor.svg'))
  };

  // このアイテムがコマンドを持つ場合
  command = {
    command: 'code-anchor.jumpToAnchor',
    title: 'Jump to Anchor',
    arguments: [this]
  };
} 