import * as vscode from 'vscode';
import * as path from 'path';

export class Anchor extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath: string,
    public readonly lineNumber: number,
    public readonly codeText: string,
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.filePath}:${this.lineNumber + 1}`;
    this.description = `${path.basename(this.filePath)}:${this.lineNumber + 1}`;
  }

  // アイコンを設定したい場合はここで設定できるよ！
  // iconPath = {
  //   light: path.join(__filename, '..', '..', 'resources', 'light', 'anchor.svg'),
  //   dark: path.join(__filename, '..', '..', 'resources', 'dark', 'anchor.svg')
  // };

  // このアイテムがコマンドを持つ場合
  command = {
    command: 'code-anchor.jumpToAnchor',
    title: 'Jump to Anchor',
    arguments: [this]
  };
} 