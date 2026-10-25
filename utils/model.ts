/**
 * ブックマークと設定のデータの形
 *
 * ブラウザのブックマークは、yeフォルダの下に 列(1〜4) -> グループ -> ブックマーク の3階層で置く
 * グループとブックマークは、名前の先頭にIDをつける(bookmarkId.ts)
 */

/** 列の名前、yeフォルダ直下のフォルダ名と同じで、列は常にこの4つ */
export const COLUMN_NAMES = ["1", "2", "3", "4"] as const;
export type ColumnName = (typeof COLUMN_NAMES)[number];

export interface Bookmark {
	/** 名前の先頭につけたID、まだ付いていなければ空文字(編集画面を開くと付く) */
	id: string;
	/** 表示名、IDは含まない */
	name: string;
	url: string;
}

export interface Group {
	/** 名前の先頭につけたID、まだ付いていなければ空文字(編集画面を開くと付く) */
	id: string;
	/** 表示名、IDは含まない */
	name: string;
	bookmarks: Bookmark[];
}

/** 4列とも必ずある */
export type BookmarksData = Record<ColumnName, Group[]>;

export const EMPTY_BOOKMARKS: BookmarksData = { 1: [], 2: [], 3: [], 4: [] };

/** 列ごとにグループを変換する */
export function mapColumns(
	data: BookmarksData,
	change: (groups: Group[], column: ColumnName) => Group[],
): BookmarksData {
	return { 1: change(data[1], "1"), 2: change(data[2], "2"), 3: change(data[3], "3"), 4: change(data[4], "4") };
}

/** 全列のグループを、列の順に並べる */
export function listGroups(data: BookmarksData): Group[] {
	const groups: Group[] = [];
	for (const column of COLUMN_NAMES) {
		groups.push(...data[column]);
	}
	return groups;
}

/** yeフォルダの中身 */
export interface YeData {
	bookmarks: BookmarksData;
	/** 設定のブックマークのURL、なければ空文字 */
	options: string;
}
