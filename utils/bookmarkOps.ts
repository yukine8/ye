/**
 * ブックマークの編集操作
 * どれも、変更前のデータから、変更後のデータを作って返すだけ(ブラウザのブックマークには触らない)
 * 変更後のデータは bookmarkApply.ts でブラウザのブックマークに反映する
 */

import { generateId } from "./bookmarkId";
import { type Bookmark, type BookmarksData, type ColumnName, type Group, listGroups, mapColumns } from "./model";

type Ops = (data: BookmarksData) => BookmarksData;

/** 使われているIDを、グループもブックマークも全て集める */
export function collectIds(data: BookmarksData): Set<string> {
	const groups = listGroups(data);
	const bookmarks = groups.flatMap((group) => group.bookmarks);
	return new Set([...groups, ...bookmarks].map((item) => item.id));
}

function mapGroups(data: BookmarksData, change: (group: Group) => Group): BookmarksData {
	return mapColumns(data, (groups) => groups.map(change));
}

/** IDがbeforeIdの要素の前に入れる、beforeIdがnull(か見つからない)なら最後に入れる */
function insertBefore<T extends { id: string }>(list: T[], item: T, beforeId: string | null): T[] {
	const result = [...list];
	const index = list.findIndex((other) => other.id === beforeId);
	if (index < 0) {
		result.push(item);
	} else {
		result.splice(index, 0, item);
	}
	return result;
}

export function addGroup(column: ColumnName, name: string): Ops {
	return (data) => {
		const group: Group = { id: generateId(collectIds(data)), name, bookmarks: [] };
		return { ...data, [column]: [...data[column], group] };
	};
}

export function addBookmark(groupId: string, name: string, url: string): Ops {
	return (data) => {
		const bookmark: Bookmark = { id: generateId(collectIds(data)), name, url };
		return mapGroups(data, (group) => {
			if (group.id !== groupId) return group;
			return { ...group, bookmarks: [...group.bookmarks, bookmark] };
		});
	};
}

export function editGroup(id: string, name: string): Ops {
	return (data) =>
		mapGroups(data, (group) => {
			if (group.id !== id) return group;
			return { ...group, name };
		});
}

export function editBookmark(id: string, name: string, url: string): Ops {
	const editIfTarget = (bookmark: Bookmark): Bookmark => {
		if (bookmark.id !== id) return bookmark;
		return { ...bookmark, name, url };
	};
	return (data) => mapGroups(data, (group) => ({ ...group, bookmarks: group.bookmarks.map(editIfTarget) }));
}

export function removeGroup(id: string): Ops {
	return (data) => mapColumns(data, (groups) => groups.filter((group) => group.id !== id));
}

export function removeBookmark(id: string): Ops {
	return (data) =>
		mapGroups(data, (group) => ({ ...group, bookmarks: group.bookmarks.filter((bookmark) => bookmark.id !== id) }));
}

/** ブックマークを、グループの中の、IDがbeforeIdのブックマークの前(nullなら最後)に移動する */
export function moveBookmark(id: string, groupId: string, beforeId: string | null): Ops {
	return (data) => {
		const bookmarks = listGroups(data).flatMap((group) => group.bookmarks);
		const moved = bookmarks.find((bookmark) => bookmark.id === id);
		if (!moved) return data;

		// 移動先のグループがなければ、移動しない(ブックマークを失わないため)
		const targetExists = listGroups(data).some((group) => group.id === groupId);
		if (!targetExists) return data;

		const removed = removeBookmark(id)(data);
		return mapGroups(removed, (group) => {
			if (group.id !== groupId) return group;
			return { ...group, bookmarks: insertBefore(group.bookmarks, moved, beforeId) };
		});
	};
}

/** グループを、列の中の、IDがbeforeIdのグループの前(nullなら最後)に移動する */
export function moveGroup(id: string, column: ColumnName, beforeId: string | null): Ops {
	return (data) => {
		const moved = listGroups(data).find((group) => group.id === id);
		if (!moved) return data;

		const removed = removeGroup(id)(data);
		return { ...removed, [column]: insertBefore(removed[column], moved, beforeId) };
	};
}
