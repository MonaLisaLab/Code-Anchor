import * as vscode from 'vscode';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

export const ANCHOR_ICONS = {
  default: 'anchor.svg',
  bug: 'bug.svg',
  todo: 'todo.svg',
  note: 'note.svg',
};

export type AnchorIcon = keyof typeof ANCHOR_ICONS;

export class Anchor extends vscode.TreeItem {
  public id: string;
  
  constructor(
    public label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly filePath: string,
    public lineNumber: number,
    public readonly endLineNumber: number,
    public readonly codeText: string,
    public icon: AnchorIcon = 'default',
    public note: string = '',
    id?: string,
  ) {
    super(label, collapsibleState);
    this.id = id || uuid();

    const lineInfo = this.lineNumber === this.endLineNumber
      ? `L${this.lineNumber + 1}`
      : `L${this.lineNumber + 1}-${this.endLineNumber + 1}`;
      
    this.description = `${path.basename(this.filePath)} (${lineInfo})`;
    
    this.tooltip = new vscode.MarkdownString(
      `**${this.filePath}**\n\n` +
      `*${lineInfo}*\n\n` +
      `**Note:**\n\n> ${this.note || 'No note provided.'}\n\n` +
      "***\n\n" +
      "```\n" +
      this.codeText +
      "\n```"
    );
  }

  contextValue = 'anchor';

  iconPath = {
    light: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', ANCHOR_ICONS[this.icon] || ANCHOR_ICONS.default)),
    dark: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', ANCHOR_ICONS[this.icon] || ANCHOR_ICONS.default))
  };

  command = {
    command: 'code-anchor.jumpToAnchor',
    title: 'Jump to Anchor',
    arguments: [this]
  };
} 