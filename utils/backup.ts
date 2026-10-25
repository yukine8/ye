/**
 * 設定とブックマークのバックアップ(JSON)を、作る・読み込む
 *
 * - options は設定のURLのクエリと同じ、名前 -> 値(文字列)の一覧。設定項目が増えても、preferences.ts だけ直せばよい
 * - ブックマークにはIDをつけない(読み込むときに付け直す)。非表示は hidden: true で表す
 * - 読み込みは、知らないキーを無視し、無いキーを既定値で補う。形式を変えるときだけ BACKUP_VERSION を上げる
 */

import { createIdMaker } from "./bookmarkId";
import { type Bookmark, type BookmarksData, COLUMN_NAMES, type ColumnName, type Group, type YeData } from "./model";
import { optionsFromUrl, optionsToUrl } from "./preferences";

const BACKUP_VERSION = 1;

interface BackupBookmark {
	name: string;
	url: string;
	/** 非表示のときだけ付く */
	hidden?: true;
}

interface BackupGroup {
	name: string;
	/** 非表示のときだけ付く */
	hidden?: true;
	bookmarks: BackupBookmark[];
}

export interface Backup {
	version: typeof BACKUP_VERSION;
	options: Record<string, string>;
	bookmarks: Record<ColumnName, BackupGroup[]>;
}

/** バックアップから作った、ブラウザに書き込むデータ */
export interface RestoredData {
	bookmarks: BookmarksData;
	hiddenIds: Set<string>;
	/** 設定のブックマークのURL */
	options: string;
}

// ---- 作る ----

function toBackupGroup(group: Group, hiddenIds: ReadonlySet<string>): BackupGroup {
	const bookmarks = group.bookmarks.map(({ id, name, url }) => {
		const bookmark: BackupBookmark = { name, url };
		if (hiddenIds.has(id)) bookmark.hidden = true;
		return bookmark;
	});

	const backupGroup: BackupGroup = { name: group.name, bookmarks };
	if (hiddenIds.has(group.id)) backupGroup.hidden = true;
	return backupGroup;
}

export function createBackup(ye: YeData, hiddenIds: ReadonlySet<string>): Backup {
	const bookmarks: Backup["bookmarks"] = { 1: [], 2: [], 3: [], 4: [] };
	for (const column of COLUMN_NAMES) {
		bookmarks[column] = ye.bookmarks[column].map((group) => toBackupGroup(group, hiddenIds));
	}

	// 欠けている設定は既定値で補った形にしてから、URLのクエリを名前と値の一覧にする
	const optionsUrl = optionsToUrl(optionsFromUrl(ye.options));
	const options = Object.fromEntries(new URL(optionsUrl).searchParams);

	return { version: BACKUP_VERSION, options, bookmarks };
}

// ---- 読み込む ----

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBookmark(value: unknown): BackupBookmark {
	if (!isRecord(value) || typeof value.name !== "string" || typeof value.url !== "string") {
		throw new Error("ブックマークの形式が正しくありません");
	}
	// 書き込みの途中で失敗しないように、先にURLを確かめる
	if (!URL.canParse(value.url)) throw new Error(`URLが正しくありません: ${value.url}`);

	const bookmark: BackupBookmark = { name: value.name, url: value.url };
	if (value.hidden === true) bookmark.hidden = true;
	return bookmark;
}

function parseGroup(value: unknown): BackupGroup {
	if (!isRecord(value) || typeof value.name !== "string" || !Array.isArray(value.bookmarks)) {
		throw new Error("フォルダーの形式が正しくありません");
	}

	const group: BackupGroup = { name: value.name, bookmarks: value.bookmarks.map(parseBookmark) };
	if (value.hidden === true) group.hidden = true;
	return group;
}

/** 列のグループ一覧、列がなければ空 */
function parseGroups(value: unknown): BackupGroup[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) throw new Error("列の形式が正しくありません");
	return value.map(parseGroup);
}

/** 設定の一覧、文字列・数値・真偽値の値だけ使い、ほかは無視する(既定値になる) */
function parseOptions(value: unknown): Record<string, string> {
	const options: Record<string, string> = {};
	if (!isRecord(value)) return options;

	for (const [name, item] of Object.entries(value)) {
		if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
			options[name] = String(item);
		}
	}
	return options;
}

/** バックアップのJSONを読み込む、形式が正しくなければ、理由を書いたErrorを投げる */
export function parseBackup(text: string): Backup {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch {
		throw new Error("JSONとして読み込めません");
	}

	if (!isRecord(json)) throw new Error("バックアップの形式ではありません");
	if (json.version !== BACKUP_VERSION) throw new Error(`対応していない形式です(version: ${String(json.version)})`);

	const columns = isRecord(json.bookmarks) ? json.bookmarks : {};
	return {
		version: BACKUP_VERSION,
		options: parseOptions(json.options),
		bookmarks: {
			1: parseGroups(columns[1]),
			2: parseGroups(columns[2]),
			3: parseGroups(columns[3]),
			4: parseGroups(columns[4]),
		},
	};
}

/** バックアップに、グループとブックマークのIDをつけて、ブラウザに書き込む形にする */
export function restoreBackup(backup: Backup): RestoredData {
	const newId = createIdMaker();
	const hiddenIds = new Set<string>();
	const bookmarks: BookmarksData = { 1: [], 2: [], 3: [], 4: [] };

	for (const column of COLUMN_NAMES) {
		for (const backupGroup of backup.bookmarks[column]) {
			const group: Group = { id: newId(), name: backupGroup.name, bookmarks: [] };
			if (backupGroup.hidden) hiddenIds.add(group.id);

			for (const backupBookmark of backupGroup.bookmarks) {
				const bookmark: Bookmark = { id: newId(), name: backupBookmark.name, url: backupBookmark.url };
				if (backupBookmark.hidden) hiddenIds.add(bookmark.id);
				group.bookmarks.push(bookmark);
			}
			bookmarks[column].push(group);
		}
	}

	// 設定は、不正な値を既定値にそろえてからURLにする
	const optionsUrl = new URL("https://ye.invalid/options");
	for (const [name, value] of Object.entries(backup.options)) {
		optionsUrl.searchParams.set(name, value);
	}
	return { bookmarks, hiddenIds, options: optionsToUrl(optionsFromUrl(optionsUrl.toString())) };
}
