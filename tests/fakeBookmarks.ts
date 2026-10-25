/**
 * browser.bookmarks の、メモリ上の偽物(テスト用)
 *
 * moveのindexの数え方は、ブラウザで違う
 * - chrome: 同じ親の中で後ろへ動かすとき、動かすものを抜く前の位置で数える(指定したindexより1つ前に入る)
 * - firefox: 抜いた後の位置で数える(指定したindexに入る)
 */

import type { BookmarkTreeNode } from "../utils/tree";

type IndexMode = "chrome" | "firefox";

interface Stored {
	id: string;
	parentId?: string;
	title: string;
	url?: string;
	children: string[];
}

export class FakeBookmarks {
	private nodes = new Map<string, Stored>();
	private nextId = 1;
	/** 呼ばれたAPIの名前 */
	readonly calls: string[] = [];

	constructor(private mode: IndexMode) {
		this.nodes.set("root", { id: "root", title: "", children: [] });
	}

	/** 親の下にフォルダを作る(APIを呼ばずに、テストの準備に使う) */
	addFolder(title: string, parentId = "root"): string {
		return this.insert(parentId, title, undefined, undefined).id;
	}

	toTree(id: string): BookmarkTreeNode {
		const node = this.get(id);
		const parent = node.parentId ? this.get(node.parentId) : undefined;
		const tree: BookmarkTreeNode = {
			syncing: false,
			id,
			title: node.title,
			parentId: node.parentId,
			index: parent?.children.indexOf(id),
		};
		if (node.url !== undefined) return { ...tree, url: node.url };
		return { ...tree, children: node.children.map((childId) => this.toTree(childId)) };
	}

	private get(id: string): Stored {
		const node = this.nodes.get(id);
		if (!node) throw new Error(`No bookmark with id ${id}`);
		return node;
	}

	private insert(parentId: string, title: string, url: string | undefined, index: number | undefined): Stored {
		const parent = this.get(parentId);
		if (parent.url !== undefined) throw new Error("parent is not a folder");

		const node: Stored = { id: String(this.nextId++), parentId, title, url, children: [] };
		this.nodes.set(node.id, node);
		parent.children.splice(index ?? parent.children.length, 0, node.id);
		return node;
	}

	private detach(node: Stored): number {
		if (!node.parentId) throw new Error("cannot detach the root");
		const siblings = this.get(node.parentId).children;
		const index = siblings.indexOf(node.id);
		siblings.splice(index, 1);
		return index;
	}

	private deleteTree(id: string): void {
		for (const childId of this.get(id).children) this.deleteTree(childId);
		this.nodes.delete(id);
	}

	/** applyChange が使う browser.bookmarks と同じ形 */
	readonly api = {
		create: async (details: { parentId: string; title: string; url?: string; index?: number }) => {
			this.calls.push("create");
			const node = this.insert(details.parentId, details.title, details.url, details.index);
			return this.toTree(node.id);
		},
		update: async (id: string, changes: { title?: string; url?: string }) => {
			this.calls.push("update");
			const node = this.get(id);
			if (changes.title !== undefined) node.title = changes.title;
			if (changes.url !== undefined) node.url = changes.url;
			return this.toTree(id);
		},
		remove: async (id: string) => {
			this.calls.push("remove");
			const node = this.get(id);
			if (node.children.length > 0) throw new Error("Can't remove non-empty folder");
			this.detach(node);
			this.nodes.delete(id);
		},
		removeTree: async (id: string) => {
			this.calls.push("removeTree");
			this.detach(this.get(id));
			this.deleteTree(id);
		},
		get: async (id: string) => [this.toTree(id)],
		move: async (id: string, destination: { parentId?: string; index?: number }) => {
			this.calls.push("move");
			const node = this.get(id);
			const parentId = destination.parentId ?? node.parentId;
			if (!parentId) throw new Error("no parent");

			const oldParentId = node.parentId;
			const oldIndex = this.detach(node);
			const parent = this.get(parentId);

			let index = destination.index ?? parent.children.length;
			if (this.mode === "chrome" && parentId === oldParentId && oldIndex < index) index -= 1;
			parent.children.splice(index, 0, id);
			node.parentId = parentId;
			return this.toTree(id);
		},
	};
}
