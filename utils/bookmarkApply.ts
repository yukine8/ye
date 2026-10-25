/**
 * 画面のデータの変更を、ブラウザのブックマークに反映する
 *
 * 変更前(prev)と変更後(next)のデータを比べて、違うところだけを、追加・削除・名前とURLの変更・移動する
 * 元に戻すときは、変更前と変更後を入れ替えて呼ぶだけでよい
 * ブックマークはIDで対応づける(ブラウザのブックマークIDは、削除して作り直すと変わるため)
 */

import { formatTitle, parseTitle } from "./bookmarkId";
import { isOneOf, isSame } from "./common";
import { type BookmarksData, COLUMN_NAMES } from "./model";
import { type BookmarkTreeNode, isColumnFolder, listNodes } from "./tree";

/** グループかブックマーク1つ分 */
interface Entry {
	/** 親、グループなら列の名前、ブックマークならグループのID */
	parent: string;
	title: string;
	/** ブックマークだけ */
	url?: string;
}

/** IDごとの内容と、親ごとの子のID(並び順どおり) */
function flatten(data: BookmarksData): { entries: Map<string, Entry>; children: Map<string, string[]> } {
	const entries = new Map<string, Entry>();
	const children = new Map<string, string[]>();
	const add = (id: string, entry: Entry): void => {
		entries.set(id, entry);
		const siblings = children.get(entry.parent) ?? [];
		siblings.push(id);
		children.set(entry.parent, siblings);
	};

	for (const column of COLUMN_NAMES) {
		for (const group of data[column]) {
			add(group.id, { parent: column, title: formatTitle(group.id, group.name) });
			for (const { id, name, url } of group.bookmarks) {
				add(id, { parent: group.id, title: formatTitle(id, name), url });
			}
		}
	}
	return { entries, children };
}

export async function applyChange(
	saveFolder: BookmarkTreeNode,
	prev: BookmarksData,
	next: BookmarksData,
): Promise<void> {
	const before = flatten(prev);
	const after = flatten(next);

	// データのID -> ブラウザのブックマークID。列のフォルダは、列の名前で引く(なければ必要になったときに作る)
	const nodeIds = new Map<string, string>();
	for (const node of listNodes(saveFolder)) {
		nodeIds.set(parseTitle(node.title).id, node.id);
	}
	for (const node of (saveFolder.children ?? []).filter(isColumnFolder)) {
		nodeIds.set(node.title, node.id);
	}
	const nodeIdOf = async (parent: string): Promise<string | undefined> => {
		if (isOneOf(COLUMN_NAMES, parent) && !nodeIds.has(parent)) {
			const created = await browser.bookmarks.create({ parentId: saveFolder.id, title: parent });
			nodeIds.set(parent, created.id);
		}
		return nodeIds.get(parent);
	};

	// 1. 消えたものを削除する(グループごと消えたときの、中のブックマークは、グループと一緒に消える)
	for (const [id, entry] of before.entries) {
		const nodeId = nodeIds.get(id);
		if (after.entries.has(id) || !nodeId) continue;

		const isGroup = entry.url === undefined;
		const groupRemoved = before.entries.has(entry.parent) && !after.entries.has(entry.parent);
		if (!isGroup && groupRemoved) continue;

		if (isGroup) {
			await browser.bookmarks.removeTree(nodeId);
		} else {
			await browser.bookmarks.remove(nodeId);
		}
	}

	// 2. 名前やURLが変わったものを書き換える
	for (const [id, entry] of after.entries) {
		const old = before.entries.get(id);
		const nodeId = nodeIds.get(id);
		if (!old || !nodeId) continue;

		const isChanged = old.title !== entry.title || old.url !== entry.url;
		if (!isChanged) continue;

		const changes: { title: string; url?: string } = { title: entry.title };
		if (entry.url !== undefined) changes.url = entry.url;
		await browser.bookmarks.update(nodeId, changes);
	}

	// 3. 増えたものを作る(グループ、そのブックマークの順に並んでいるので、親は先にできている)
	for (const [id, entry] of after.entries) {
		if (before.entries.has(id)) continue;

		const parentId = await nodeIdOf(entry.parent);
		if (!parentId) throw new Error(`parent not found: ${entry.parent}`);
		const created = await browser.bookmarks.create({ parentId, title: entry.title, url: entry.url });
		nodeIds.set(id, created.id);
	}

	// 4. 並び順や親が変わったところを、前から順に直す
	// 前から順に、その位置に置くので、動かすのは必ず前向き(同じ親の中で後ろへ動かすときのindexの数え方が、ブラウザで違う問題を避けられる)
	for (const [parent, ids] of after.children) {
		if (isSame(before.children.get(parent), ids)) continue;

		const parentId = await nodeIdOf(parent);
		if (!parentId) continue;
		for (const [index, id] of ids.entries()) {
			const nodeId = nodeIds.get(id);
			if (!nodeId) continue;

			const [node] = await browser.bookmarks.get(nodeId);
			const isInPlace = node?.parentId === parentId && node.index === index;
			if (!isInPlace) {
				await browser.bookmarks.move(nodeId, { parentId, index });
			}
		}
	}
}
