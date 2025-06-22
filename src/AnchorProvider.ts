import * as vscode from 'vscode';
import { Anchor } from './types/Anchor';

export class AnchorProvider implements vscode.TreeDataProvider<Anchor>, vscode.TreeDragAndDropController<Anchor> {

  private _onDidChangeTreeData: vscode.EventEmitter<Anchor | undefined | null | void> = new vscode.EventEmitter<Anchor | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Anchor | undefined | null | void> = this._onDidChangeTreeData.event;

  // D&D用
  public dropMimeTypes = ['application/vnd.code.tree.codeanchorview'];
  public dragMimeTypes = ['application/vnd.code.tree.codeanchorview'];

  // フィルタリング用
  private _filter: string = '';

  constructor(
    private _anchors: Anchor[],
    private onOrderChanged: (anchors: Anchor[]) => void
  ) {}

  load(anchors: Anchor[]): void {
    this._anchors = anchors;
    this._onDidChangeTreeData.fire();
  }

  filter(query: string): void {
    this._filter = query.toLowerCase();
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Anchor): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Anchor): Thenable<Anchor[]> {
    if (element) {
      return Promise.resolve([]);
    }

    if (!this._filter) {
      return Promise.resolve(this._anchors);
    }

    const filtered = this._anchors.filter(a =>
      a.label.toLowerCase().includes(this._filter) ||
      a.note.toLowerCase().includes(this._filter) ||
      a.filePath.toLowerCase().includes(this._filter)
    );
    return Promise.resolve(filtered);
  }

  // --- Drag and Drop ---

  handleDrag(source: readonly Anchor[], dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void {
    dataTransfer.set(this.dropMimeTypes[0], new vscode.DataTransferItem(source.map(a => a.id)));
  }

  handleDrop(target: Anchor | undefined, dataTransfer: vscode.DataTransfer, token: vscode.CancellationToken): void {
    const transferItem = dataTransfer.get(this.dropMimeTypes[0]);
    if (!transferItem) { return; }

    const draggedIds: string[] = transferItem.value;
    
    // ドラッグされたアイテムを特定
    const draggedItems = this._anchors.filter(a => draggedIds.includes(a.id));
    // ドラッグされなかったアイテムのリスト
    const remainingItems = this._anchors.filter(a => !draggedIds.includes(a.id));

    if (target) {
      // ターゲットの位置を見つける
      const targetIndex = remainingItems.findIndex(a => a.id === target.id);
      // ターゲットの前に挿入
      remainingItems.splice(targetIndex, 0, ...draggedItems);
    } else {
      // ターゲットがなければ末尾に追加
      remainingItems.push(...draggedItems);
    }

    this._anchors = remainingItems;
    this.onOrderChanged(this._anchors);
  }
} 