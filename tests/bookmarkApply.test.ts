import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { applyChange } from "../utils/bookmarkApply";
import { formatTitle, parseTitle } from "../utils/bookmarkId";
import {
	addBookmark,
	addGroup,
	editBookmark,
	editGroup,
	moveBookmark,
	moveGroup,
	removeBookmark,
	removeGroup,
} from "../utils/bookmarkOps";
import { type BookmarksData, COLUMN_NAMES, EMPTY_BOOKMARKS } from "../utils/model";
import type { BookmarkTreeNode } from "../utils/tree";
import { FakeBookmarks } from "./fakeBookmarks";
import { bookmark, bookmarksData, group } from "./helpers";

/** ブラウザのブックマークの、yeフォルダ以下を、BookmarksDataとして読む */
function readData(tree: BookmarkTreeNode): BookmarksData {
	const data: BookmarksData = { 1: [], 2: [], 3: [], 4: [] };
	for (const column of tree.children ?? []) {
		const name = COLUMN_NAMES.find((n) => n === column.title);
		if (!name) continue;

		for (const groupNode of column.children ?? []) {
			const parsed = parseTitle(groupNode.title);
			data[name].push({
				...parsed,
				bookmarks: (groupNode.children ?? []).map((node) => ({ ...parseTitle(node.title), url: node.url ?? "" })),
			});
		}
	}
	return data;
}

const initial = () =>
	bookmarksData({
		1: [
			group("c0000001", "Video", [
				bookmark("b0000001", "YouTube"),
				bookmark("b0000002", "Nico"),
				bookmark("b0000003", "Vimeo"),
			]),
			group("c0000002", "SNS", [bookmark("b0000004", "X")]),
		],
		2: [group("c0000003", "News", [bookmark("b0000005", "Gigazine")]), group("c0000004", "Game")],
	});

describe.each(["chrome", "firefox"] as const)("applyChange (%s のindexの数え方)", (mode) => {
	let fake: FakeBookmarks;
	let saveId: string;

	/** yeフォルダの今の状態から、変更を反映する */
	const apply = (prev: BookmarksData, next: BookmarksData) => applyChange(fake.toTree(saveId), prev, next);
	const current = () => readData(fake.toTree(saveId));

	beforeEach(async () => {
		fake = new FakeBookmarks(mode);
		vi.stubGlobal("browser", { bookmarks: fake.api });
		saveId = fake.addFolder("ye");
		await apply(EMPTY_BOOKMARKS, initial());
		fake.calls.length = 0;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("初期データを作ると、列のフォルダとIDつきの名前ができる", () => {
		expect(current()).toEqual(initial());

		const titles = (fake.toTree(saveId).children ?? []).map((c) => c.title);
		expect(titles).toEqual(["1", "2"]); // 使う列のフォルダだけ作る
		expect(fake.toTree(saveId).children?.[0]?.children?.[0]?.title).toBe(formatTitle("c0000001", "Video"));
	});

	test("変更がなければ、何も呼ばない", async () => {
		await apply(initial(), initial());
		expect(fake.calls).toEqual([]);
	});

	test("列のフォルダがなかった列にグループを足すと、列のフォルダが作られる", async () => {
		const next = addGroup("4", "Last")(initial());
		await apply(initial(), next);
		expect(current()[4].map((g) => g.name)).toEqual(["Last"]);
	});

	const ops: [string, (data: BookmarksData) => BookmarksData][] = [
		["グループを追加", addGroup("1", "New")],
		["ブックマークを追加", addBookmark("c0000002", "New", "https://new.example/")],
		["グループ名を変更", editGroup("c0000001", "Movie")],
		["ブックマークの名前とURLを変更", editBookmark("b0000002", "Nico2", "https://nico2.example/")],
		["ブックマークを削除", removeBookmark("b0000001")],
		["グループを削除(中のブックマークごと)", removeGroup("c0000001")],
		["同じグループで、後ろへ移動", moveBookmark("b0000001", "c0000001", "b0000003")],
		["同じグループで、最後へ移動", moveBookmark("b0000001", "c0000001", null)],
		["同じグループで、前へ移動", moveBookmark("b0000003", "c0000001", "b0000001")],
		["別のグループの途中へ移動", moveBookmark("b0000001", "c0000002", "b0000004")],
		["別の列のグループの最後へ移動", moveBookmark("b0000002", "c0000004", null)],
		["グループを同じ列の前へ移動", moveGroup("c0000002", "1", "c0000001")],
		["グループを同じ列の最後へ移動", moveGroup("c0000001", "1", null)],
		["グループを別の列へ移動", moveGroup("c0000001", "2", "c0000004")],
		["グループを空の列へ移動", moveGroup("c0000003", "3", null)],
	];

	test.each(ops)("反映すると、ブラウザのブックマークが変更後のデータと同じになる: %s", async (_, op) => {
		const next = op(initial());
		await apply(initial(), next);
		expect(current()).toEqual(next);
	});

	test.each(ops)("元に戻す(前後を入れ替えて反映)と、元のデータに戻る: %s", async (_, op) => {
		const next = op(initial());
		await apply(initial(), next);
		await apply(next, initial());
		expect(current()).toEqual(initial());
	});

	test("連続して反映しても、ずれない", async () => {
		let data = initial();
		const steps = [
			moveBookmark("b0000001", "c0000001", null),
			moveGroup("c0000002", "1", "c0000001"),
			moveBookmark("b0000004", "c0000003", "b0000005"),
			removeGroup("c0000004"),
			addBookmark("c0000001", "New", "https://new.example/"),
			moveBookmark("b0000005", "c0000002", null),
		];
		for (const step of steps) {
			const next = step(data);
			await apply(data, next);
			data = next;
			expect(current()).toEqual(data);
		}
	});

	test("全てを別のデータ(ID違い)に置き換えられる(バックアップの読み込み)", async () => {
		const replaced = bookmarksData({
			2: [group("c0000011", "Other", [bookmark("b0000011", "A"), bookmark("b0000012", "B")])],
			4: [group("c0000012", "Four", [bookmark("b0000013", "C")])],
		});
		await apply(initial(), replaced);
		expect(current()).toEqual(replaced);
	});

	test("名前に _ や改行があっても、そのまま保たれる", async () => {
		const next = editGroup("c0000001", "a_b\nc")(initial());
		await apply(initial(), next);
		expect(current()[1][0]?.name).toBe("a_b\nc");
	});
});
