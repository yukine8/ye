import { describe, expect, test } from "vitest";
import { createBackup, parseBackup, restoreBackup } from "../utils/backup";
import { collectIds } from "../utils/bookmarkOps";
import type { YeData } from "../utils/model";
import { optionsToUrl } from "../utils/preferences";
import { bookmark, bookmarksData, group } from "./helpers";

const ye = (): YeData => ({
	bookmarks: bookmarksData({
		1: [
			group("g1", "Video", [bookmark("b1", "YouTube"), bookmark("b2", "Nico")]),
			group("g2", "Hidden", [bookmark("b3", "X")]),
		],
		3: [group("g3", "Dev", [])],
	}),
	options: optionsToUrl({
		theme: "custom",
		colors: { base: "#111111", accent: "#222222", hover: "#333333", iconBase: "#444444" },
		linkTarget: "_blank",
		showOpenAll: false,
	}),
});

describe("createBackup", () => {
	test("IDは含まず、名前とURLだけを書き出す", () => {
		const backup = createBackup(ye(), new Set());
		expect(backup.bookmarks[1][0]).toEqual({
			name: "Video",
			bookmarks: [
				{ name: "YouTube", url: "https://youtube.example/" },
				{ name: "Nico", url: "https://nico.example/" },
			],
		});
		expect(JSON.stringify(backup)).not.toContain('"id"');
	});

	test("非表示のものにだけ hidden: true が付く", () => {
		const backup = createBackup(ye(), new Set(["g2", "b2"]));
		expect(backup.bookmarks[1][0]).not.toHaveProperty("hidden");
		expect(backup.bookmarks[1][0]?.bookmarks[0]).not.toHaveProperty("hidden");
		expect(backup.bookmarks[1][0]?.bookmarks[1]).toHaveProperty("hidden", true);
		expect(backup.bookmarks[1][1]).toHaveProperty("hidden", true);
	});

	test("4列とも必ずある", () => {
		expect(Object.keys(createBackup(ye(), new Set()).bookmarks)).toEqual(["1", "2", "3", "4"]);
	});

	test("設定は、名前 -> 文字列の一覧になる", () => {
		expect(createBackup(ye(), new Set()).options).toEqual({
			theme: "custom",
			linkTarget: "_blank",
			showOpenAll: "false",
			"colors.base": "#111111",
			"colors.accent": "#222222",
			"colors.hover": "#333333",
			"colors.iconBase": "#444444",
		});
	});

	test("設定のブックマークがなくても、既定値で補って書き出す", () => {
		const backup = createBackup({ ...ye(), options: "" }, new Set());
		expect(backup.options.theme).toBe("dark");
		expect(backup.options.showOpenAll).toBe("true");
	});
});

describe("parseBackup", () => {
	const minimal = { version: 1 };

	test("書き出したものを、そのまま読み込める", () => {
		const backup = createBackup(ye(), new Set(["g2"]));
		expect(parseBackup(JSON.stringify(backup, null, 2))).toEqual(backup);
	});

	test("列や設定がなくても読み込める", () => {
		const backup = parseBackup(JSON.stringify(minimal));
		expect(backup.bookmarks).toEqual({ 1: [], 2: [], 3: [], 4: [] });
		expect(backup.options).toEqual({});
	});

	test("知らないキーは無視する", () => {
		const backup = parseBackup(JSON.stringify({ ...minimal, future: 1, options: { theme: "light", other: "x" } }));
		expect(backup).not.toHaveProperty("future");
		expect(backup.options).toEqual({ theme: "light", other: "x" });
	});

	test("設定の値は、文字列・数値・真偽値だけを文字列にして使い、他は無視する", () => {
		const backup = parseBackup(
			JSON.stringify({ ...minimal, options: { a: "s", b: 1, c: true, d: null, e: {}, f: [1] } }),
		);
		expect(backup.options).toEqual({ a: "s", b: "1", c: "true" });
	});

	test("hidden は true のときだけ有効", () => {
		const backup = parseBackup(
			JSON.stringify({
				...minimal,
				bookmarks: {
					1: [{ name: "G", hidden: "yes", bookmarks: [{ name: "B", url: "https://b.example/", hidden: 1 }] }],
				},
			}),
		);
		expect(backup.bookmarks[1][0]).not.toHaveProperty("hidden");
		expect(backup.bookmarks[1][0]?.bookmarks[0]).not.toHaveProperty("hidden");
	});

	test.each([
		["JSONでない", "not json", "JSONとして読み込めません"],
		["配列", "[1]", "バックアップの形式ではありません"],
		["文字列", '"x"', "バックアップの形式ではありません"],
		["null", "null", "バックアップの形式ではありません"],
		["versionがない", "{}", "対応していない形式です"],
		["versionが違う", '{"version":2}', "対応していない形式です"],
		["列が配列でない", '{"version":1,"bookmarks":{"1":{}}}', "列の形式が正しくありません"],
		[
			"グループに名前がない",
			'{"version":1,"bookmarks":{"1":[{"bookmarks":[]}]}}',
			"フォルダーの形式が正しくありません",
		],
		[
			"グループにbookmarksがない",
			'{"version":1,"bookmarks":{"1":[{"name":"G"}]}}',
			"フォルダーの形式が正しくありません",
		],
		[
			"ブックマークにURLがない",
			'{"version":1,"bookmarks":{"1":[{"name":"G","bookmarks":[{"name":"B"}]}]}}',
			"ブックマークの形式が正しくありません",
		],
		[
			"URLが不正",
			'{"version":1,"bookmarks":{"1":[{"name":"G","bookmarks":[{"name":"B","url":"nope"}]}]}}',
			"URLが正しくありません: nope",
		],
	])("読み込めない: %s", (_, text, message) => {
		expect(() => parseBackup(text)).toThrow(message);
	});
});

describe("restoreBackup", () => {
	test("IDをつけ直し、並び順と内容は保つ", () => {
		const restored = restoreBackup(createBackup(ye(), new Set()));
		expect(restored.bookmarks[1].map((g) => g.name)).toEqual(["Video", "Hidden"]);
		expect(restored.bookmarks[1][0]?.bookmarks.map((b) => b.url)).toEqual([
			"https://youtube.example/",
			"https://nico.example/",
		]);
		expect(restored.bookmarks[3][0]?.name).toBe("Dev");
	});

	test("全てのIDが、重複せず、元のIDとも関係ない形で作られる", () => {
		const restored = restoreBackup(createBackup(ye(), new Set()));
		const ids = collectIds(restored.bookmarks);
		expect(ids.size).toBe(3 + 3);
		for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}$/);
	});

	test("hidden は、新しいIDの非表示に置き換わる", () => {
		const restored = restoreBackup(createBackup(ye(), new Set(["g2", "b2"])));
		const hiddenGroup = restored.bookmarks[1][1];
		const hiddenBookmark = restored.bookmarks[1][0]?.bookmarks[1];
		expect(restored.hiddenIds).toEqual(new Set([hiddenGroup?.id, hiddenBookmark?.id]));
	});

	test("不正な設定値は既定値になり、足りない設定は補われる", () => {
		const restored = restoreBackup({
			version: 1,
			options: { theme: "neon", linkTarget: "_blank" },
			bookmarks: { 1: [], 2: [], 3: [], 4: [] },
		});
		expect(restored.options).toContain("theme=dark");
		expect(restored.options).toContain("linkTarget=_blank");
		expect(restored.options).toContain("showOpenAll=true");
	});

	test("書き出し -> 読み込み -> 書き出し で、同じ内容に戻る", () => {
		const first = createBackup(ye(), new Set(["g1", "b3"]));
		const restored = restoreBackup(first);
		const second = createBackup({ bookmarks: restored.bookmarks, options: restored.options }, restored.hiddenIds);
		expect(second).toEqual(first);
	});
});
