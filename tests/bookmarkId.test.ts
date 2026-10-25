import { describe, expect, test } from "vitest";
import { createIdMaker, formatTitle, generateId, parseTitle, planIdFixes } from "../utils/bookmarkId";

describe("parseTitle", () => {
	test("先頭の8桁の16進数と _ を、IDとして分ける", () => {
		expect(parseTitle("3fa85f64_pixiv")).toEqual({ id: "3fa85f64", name: "pixiv" });
	});

	test("名前に _ や改行が入っていてもよい", () => {
		expect(parseTitle("3fa85f64_a_b\nc")).toEqual({ id: "3fa85f64", name: "a_b\nc" });
	});

	test("表示名が空でもよい", () => {
		expect(parseTitle("3fa85f64_")).toEqual({ id: "3fa85f64", name: "" });
	});

	test.each([
		"pixiv",
		"3fa85f6_pixiv",
		"3fa85f64pixiv",
		"3FA85F64_pixiv",
		"zzzzzzzz_pixiv",
		"3fa85f645_pixiv",
		"",
	])("IDの形でなければ、全体が名前になる: %j", (title) => {
		expect(parseTitle(title)).toEqual({ id: "", name: title });
	});

	test("formatTitle の逆になっている", () => {
		expect(parseTitle(formatTitle("0123abcd", "名前_x"))).toEqual({ id: "0123abcd", name: "名前_x" });
	});
});

describe("generateId / createIdMaker", () => {
	test("8桁の16進数で、使われているIDは避ける", () => {
		const taken = new Set<string>();
		for (let i = 0; i < 200; i++) {
			const id = generateId(taken);
			expect(id).toMatch(/^[0-9a-f]{8}$/);
			expect(taken.has(id)).toBe(false);
			taken.add(id);
		}
	});

	test("createIdMaker は、呼ぶたびに違うIDを返す", () => {
		const newId = createIdMaker();
		const ids = Array.from({ length: 200 }, newId);
		expect(new Set(ids).size).toBe(200);
	});
});

describe("planIdFixes", () => {
	const nodes = (...titles: string[]) => titles.map((title, i) => ({ nodeId: `n${i}`, title }));

	test("全てIDがあって重複もなければ、何も直さない", () => {
		expect(planIdFixes(nodes("aaaaaaaa_x", "bbbbbbbb_y"))).toEqual([]);
	});

	test("IDがないものに、新しいIDをつける(名前は保つ)", () => {
		const fixes = planIdFixes(nodes("aaaaaaaa_x", "plain"));
		expect(fixes).toHaveLength(1);
		expect(fixes[0]?.nodeId).toBe("n1");
		expect(fixes[0]?.title).toMatch(/^[0-9a-f]{8}_plain$/);
	});

	test("重複したIDは、先に並んでいるものだけが保ち、残りは付け直す", () => {
		const fixes = planIdFixes(nodes("aaaaaaaa_first", "aaaaaaaa_second", "aaaaaaaa_third"));
		expect(fixes.map((f) => f.nodeId)).toEqual(["n1", "n2"]);

		const newIds = fixes.map((f) => f.title.slice(0, 8));
		expect(newIds).not.toContain("aaaaaaaa");
		expect(new Set(newIds).size).toBe(2);
		expect(fixes.map((f) => f.title.slice(9))).toEqual(["second", "third"]);
	});

	test("新しいIDは、既にあるIDとかぶらない", () => {
		const existing = Array.from({ length: 50 }, (_, i) => `${i.toString(16).padStart(8, "0")}_n`);
		const fixes = planIdFixes(nodes(...existing, "a", "b", "c"));
		const all = [...existing.map((t) => t.slice(0, 8)), ...fixes.map((f) => f.title.slice(0, 8))];
		expect(new Set(all).size).toBe(all.length);
	});
});
