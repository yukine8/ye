import { describe, expect, test } from "vitest";
import { collectIds } from "../utils/bookmarkOps";
import { isOneOf, isSame } from "../utils/common";
import { COLUMN_NAMES, listGroups, mapColumns } from "../utils/model";
import { createSeedData } from "../utils/seed";
import { bookmarksData, group } from "./helpers";

describe("listGroups / mapColumns", () => {
	const data = bookmarksData({ 1: [group("a", "A")], 3: [group("b", "B"), group("c", "C")] });

	test("listGroups は、列の順にグループを並べる", () => {
		expect(listGroups(data).map((g) => g.id)).toEqual(["a", "b", "c"]);
	});

	test("mapColumns は、4列とも変換し、列の名前を渡す", () => {
		const seen: string[] = [];
		const result = mapColumns(data, (groups, column) => {
			seen.push(column);
			return groups.slice(0, 1);
		});
		expect(seen).toEqual(["1", "2", "3", "4"]);
		expect(result[3].map((g) => g.id)).toEqual(["b"]);
	});
});

describe("common", () => {
	test("isOneOf", () => {
		expect(isOneOf(COLUMN_NAMES, "2")).toBe(true);
		expect(isOneOf(COLUMN_NAMES, "5")).toBe(false);
		expect(isOneOf(COLUMN_NAMES, 2)).toBe(false);
		expect(isOneOf(COLUMN_NAMES, undefined)).toBe(false);
	});

	test("isSame は、中身が同じかを見る", () => {
		expect(isSame({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
		expect(isSame({ a: 1 }, { a: 2 })).toBe(false);
		expect(isSame(undefined, null)).toBe(false);
	});
});

describe("createSeedData", () => {
	test("15件のブックマークがあり、全てのIDが重複しない", () => {
		const data = createSeedData();
		const bookmarks = listGroups(data).flatMap((g) => g.bookmarks);
		expect(bookmarks).toHaveLength(15);
		expect(collectIds(data).size).toBe(listGroups(data).length + 15);
	});

	test("呼ぶたびに、別のIDになる", () => {
		expect(collectIds(createSeedData())).not.toEqual(collectIds(createSeedData()));
	});
});
