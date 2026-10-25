import { describe, expect, test } from "vitest";
import { type BookmarkTreeNode, isBookmark, isColumnFolder, isFolder, listNodes } from "../utils/tree";

const folder = (id: string, title: string, children: BookmarkTreeNode[] = []): BookmarkTreeNode => ({
	syncing: false,
	id,
	title,
	children,
});
const link = (id: string, title: string): BookmarkTreeNode => ({
	syncing: false,
	id,
	title,
	url: "https://x.example/",
});

describe("tree", () => {
	test("フォルダとブックマークを、urlの有無で見分ける", () => {
		expect(isFolder(folder("1", "a"))).toBe(true);
		expect(isBookmark(link("2", "a"))).toBe(true);
		expect(isFolder(link("2", "a"))).toBe(false);
	});

	test("列のフォルダは、名前が1〜4のフォルダだけ", () => {
		expect(isColumnFolder(folder("1", "3"))).toBe(true);
		expect(isColumnFolder(folder("1", "5"))).toBe(false);
		expect(isColumnFolder(link("1", "3"))).toBe(false);
	});

	test("listNodes は、列 -> グループ -> そのグループのブックマーク の順に並べ、他は無視する", () => {
		const save = folder("s", "ye", [
			folder("c2", "2", [folder("g3", "G3", [link("l4", "L4")])]),
			folder("c1", "1", [
				folder("g1", "G1", [link("l1", "L1"), link("l2", "L2")]),
				link("stray", "stray"),
				folder("g2", "G2"),
			]),
			folder("other", "other", [folder("hidden", "H")]),
			link("options", "options"),
		]);
		expect(listNodes(save).map((n) => n.id)).toEqual(["g3", "l4", "g1", "l1", "l2", "g2"]);
	});

	test("子のないyeフォルダでも、空になるだけ", () => {
		expect(listNodes({ syncing: false, id: "s", title: "ye" })).toEqual([]);
	});
});
