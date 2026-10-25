import type { Bookmark, BookmarksData, Group } from "../utils/model";

export function bookmark(id: string, name: string, url = `https://${name.toLowerCase()}.example/`): Bookmark {
	return { id, name, url };
}

export function group(id: string, name: string, bookmarks: Bookmark[] = []): Group {
	return { id, name, bookmarks };
}

export function bookmarksData(columns: Partial<BookmarksData>): BookmarksData {
	return { 1: [], 2: [], 3: [], 4: [], ...columns };
}

/** 全グループとブックマークの名前を「列|グループ[ブックマーク,...]」の形にして、比べやすくする */
export function outline(data: BookmarksData): string[] {
	const lines: string[] = [];
	for (const column of ["1", "2", "3", "4"] as const) {
		for (const g of data[column]) {
			lines.push(`${column}|${g.name}[${g.bookmarks.map((b) => b.name).join(",")}]`);
		}
	}
	return lines;
}
