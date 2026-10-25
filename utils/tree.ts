/**
 * ブラウザのブックマークのツリーのうち、yeフォルダ以下を辿る道具
 */

import type { Browser } from "wxt/browser";
import { isOneOf } from "./common";
import { COLUMN_NAMES } from "./model";

export type BookmarkTreeNode = Browser.bookmarks.BookmarkTreeNode;

/** urlを持つノード */
type BookmarkNode = BookmarkTreeNode & { url: string };

export const isFolder = (node: BookmarkTreeNode): boolean => node.url === undefined;
export const isBookmark = (node: BookmarkTreeNode): node is BookmarkNode => node.url !== undefined;

/** yeフォルダ直下の、列のフォルダ(名前が1,2,3,4のどれか) */
export const isColumnFolder = (node: BookmarkTreeNode): boolean => isFolder(node) && isOneOf(COLUMN_NAMES, node.title);

/** yeフォルダ以下のグループとブックマークを、列 -> グループ -> そのグループのブックマーク の順に並べる */
export function listNodes(saveFolder: BookmarkTreeNode): BookmarkTreeNode[] {
	const nodes: BookmarkTreeNode[] = [];
	const columns = (saveFolder.children ?? []).filter(isColumnFolder);
	for (const column of columns) {
		const groups = (column.children ?? []).filter(isFolder);
		for (const group of groups) {
			nodes.push(group);
			nodes.push(...(group.children ?? []).filter(isBookmark));
		}
	}
	return nodes;
}
