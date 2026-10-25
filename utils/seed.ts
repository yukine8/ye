/**
 * 初めて使うときに、yeフォルダに入れるブックマーク
 */

import { createIdMaker } from "./bookmarkId";
import { type BookmarksData, COLUMN_NAMES, type ColumnName } from "./model";

/** 列 -> グループ名 -> ブックマーク */
const SEED: Record<ColumnName, Record<string, { name: string; url: string }[]>> = {
	1: {
		Video: [
			{ name: "YouTube", url: "https://www.youtube.com/" },
			{ name: "ニコニコ", url: "https://www.nicovideo.jp/" },
		],
		SNS: [
			{ name: "Twitter", url: "https://twitter.com/" },
			{ name: "Bluesky", url: "https://bsky.app/" },
		],
	},
	2: {
		News: [
			{ name: "Gigazine", url: "https://gigazine.net/" },
			{ name: "DistroWatch", url: "https://distrowatch.com/" },
		],
		Game: [{ name: "Sparebeat", url: "https://beta.sparebeat.com/" }],
	},
	3: {
		Programming: [
			{ name: "GitHub", url: "https://github.com/" },
			{ name: "AtCoder", url: "https://atcoder.jp/" },
			{ name: "Qiita", url: "https://qiita.com/" },
			{ name: "Zenn", url: "https://zenn.dev/" },
		],
		AI: [
			{ name: "ChatGPT", url: "https://chatgpt.com/" },
			{ name: "Gemini", url: "https://gemini.google.com/app" },
		],
	},
	4: {
		Options: [
			{ name: "ChromeExtensions", url: "https://chromewebstore.google.com/category/extensions" },
			{ name: "FirefoxAddons", url: "https://addons.mozilla.org/ja/firefox/" },
		],
	},
};

/** 初期データを、IDをつけた形で作る */
export function createSeedData(): BookmarksData {
	const newId = createIdMaker();

	const data: BookmarksData = { 1: [], 2: [], 3: [], 4: [] };
	for (const column of COLUMN_NAMES) {
		for (const [groupName, seedBookmarks] of Object.entries(SEED[column])) {
			const bookmarks = seedBookmarks.map((bookmark) => ({ id: newId(), ...bookmark }));
			data[column].push({ id: newId(), name: groupName, bookmarks });
		}
	}
	return data;
}
