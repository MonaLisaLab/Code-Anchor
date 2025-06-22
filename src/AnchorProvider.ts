import * as vscode from 'vscode';
import { Anchor } from './types/Anchor';

export class AnchorProvider implements vscode.TreeDataProvider<Anchor> {

  private _onDidChangeTreeData: vscode.EventEmitter<Anchor | undefined | null | void> = new vscode.EventEmitter<Anchor | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Anchor | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private anchors: Anchor[]) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Anchor): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Anchor): Thenable<Anchor[]> {
    if (element) {
      // 今回は階層構造はないので、子要素はなし
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.anchors);
    }
  }
} 