/**
 * ブラウザのブックマークから、yeフォルダの中身を読み込む・書き込む
 * 表示するだけのnewtabと、編集する設定ページの、両方から呼ばれる
 */

import { applyChange } from "./bookmarkApply";
import { parseTitle, planIdFixes } from "./bookmarkId";
import { type BookmarksData, type ColumnName, EMPTY_BOOKMARKS, type Group, type YeData } from "./model";
import { OPTIONS_TITLE } from "./preferences";
import { createSeedData } from "./seed";
import { type BookmarkTreeNode, isBookmark, isColumnFolder, isFolder, listNodes } from "./tree";

const SAVE_FOLDER_TITLE = "ye";

/** 「その他のブックマーク」のID、ブラウザごとに違う */
const OTHER_BOOKMARKS_ID = browser.runtime.getURL("").startsWith("moz-extension://") ? "unfiled_____" : "2";

async function getTree(id: string): Promise<BookmarkTreeNode> {
	const [tree] = await browser.bookmarks.getSubTree(id);
	if (!tree) throw new Error(`bookmark folder not found: ${id}`);
	return tree;
}

/** yeフォルダ以下のツリーを取得する、yeフォルダがなければ初期データと一緒に作る */
async function fetchSaveFolder(): Promise<BookmarkTreeNode> {
	const children = await browser.bookmarks.getChildren(OTHER_BOOKMARKS_ID);
	const found = children.find((node) => node.title === SAVE_FOLDER_TITLE && isFolder(node));
	if (found) return getTree(found.id);

	const created = await browser.bookmarks.create({ parentId: OTHER_BOOKMARKS_ID, title: SAVE_FOLDER_TITLE });
	await applyChange(created, EMPTY_BOOKMARKS, createSeedData());
	return getTree(created.id);
}

function toGroup(folder: BookmarkTreeNode): Group {
	const { id, name } = parseTitle(folder.title);
	const bookmarks = (folder.children ?? []).filter(isBookmark).map((node) => {
		const parsed = parseTitle(node.title);
		return { id: parsed.id, name: parsed.name, url: node.url };
	});
	return { id, name, bookmarks };
}

/** 列のフォルダの中のグループを取り出す、列のフォルダがなければ空 */
function toGroups(columnFolders: BookmarkTreeNode[], column: ColumnName): Group[] {
	const columnFolder = columnFolders.find((node) => node.title === column);
	if (!columnFolder?.children) return [];
	return columnFolder.children.filter(isFolder).map(toGroup);
}

/** ツリーから、ブックマークを取り出す、列のフォルダがなければその列は空になる */
function toBookmarksData(saveFolder: BookmarkTreeNode): BookmarksData {
	const columnFolders = (saveFolder.children ?? []).filter(isColumnFolder);
	return {
		1: toGroups(columnFolders, "1"),
		2: toGroups(columnFolders, "2"),
		3: toGroups(columnFolders, "3"),
		4: toGroups(columnFolders, "4"),
	};
}

/** ツリーから、設定のブックマークのURLを取り出す、なければ空文字。同じ名前が複数あれば先にあるものを使う */
function findOptionsNode(saveFolder: BookmarkTreeNode): BookmarkTreeNode | undefined {
	return (saveFolder.children ?? []).find((node) => isBookmark(node) && node.title === OPTIONS_TITLE);
}

export async function fetchYe(): Promise<YeData> {
	const saveFolder = await fetchSaveFolder();
	return { bookmarks: toBookmarksData(saveFolder), options: findOptionsNode(saveFolder)?.url ?? "" };
}

/**
 * yeフォルダ内の全グループ・ブックマークの名前にIDが付いているようにする(ないものに付け、重複は付け直す)
 * 編集する画面を開いたときに呼ぶ、表示するだけのnewtabでは呼ばない
 */
export async function ensureBookmarkIds(): Promise<void> {
	const nodes = listNodes(await fetchSaveFolder()).map(({ id, title }) => ({ nodeId: id, title }));
	for (const { nodeId, title } of planIdFixes(nodes)) {
		await browser.bookmarks.update(nodeId, { title });
	}
}

/** 編集した内容を、ブラウザのブックマークに反映する */
export async function saveChange(prev: BookmarksData, next: BookmarksData): Promise<void> {
	await applyChange(await fetchSaveFolder(), prev, next);
}

/** 保存中の処理、設定が続けて変更されたときに、ブックマークを重複して作らないよう、1つずつ順番に保存するため */
let pendingSave: Promise<void> = Promise.resolve();

/** 設定のブックマークのURLを保存する(ブックマークがなければ作る) */
export function saveOptions(url: string): Promise<void> {
	const task = pendingSave.then(() => writeOptions(url));
	pendingSave = task.catch(() => {}); // 失敗しても、次の保存は実行する
	return task;
}

async function writeOptions(url: string): Promise<void> {
	const saveFolder = await fetchSaveFolder();
	const current = findOptionsNode(saveFolder);
	if (!current) {
		await browser.bookmarks.create({ parentId: saveFolder.id, title: OPTIONS_TITLE, url });
	} else if (current.url !== url) {
		await browser.bookmarks.update(current.id, { url });
	}
}
