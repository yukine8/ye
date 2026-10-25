import { describe, expect, test } from "vitest";
import {
	addBookmark,
	addGroup,
	collectIds,
	editBookmark,
	editGroup,
	moveBookmark,
	moveGroup,
	removeBookmark,
	removeGroup,
} from "../utils/bookmarkOps";
import { bookmark, bookmarksData, group, outline } from "./helpers";

const base = () =>
	bookmarksData({
		1: [
			group("g1", "Video", [bookmark("b1", "YouTube"), bookmark("b2", "Nico")]),
			group("g2", "SNS", [bookmark("b3", "X")]),
		],
		2: [group("g3", "News", [])],
	});

describe("collectIds", () => {
	test("グループとブックマークのIDを全て集める", () => {
		expect(collectIds(base())).toEqual(new Set(["g1", "g2", "g3", "b1", "b2", "b3"]));
	});
});

describe("追加", () => {
	test("グループは、指定した列の最後に、新しいIDで追加される", () => {
		const next = addGroup("1", "New")(base());
		expect(outline(next)).toEqual(["1|Video[YouTube,Nico]", "1|SNS[X]", "1|New[]", "2|News[]"]);

		const added = next[1][2];
		expect(added?.id).toMatch(/^[0-9a-f]{8}$/);
		expect(collectIds(base()).has(added?.id ?? "")).toBe(false);
	});

	test("空の列にも追加できる", () => {
		expect(outline(addGroup("4", "Last")(base()))).toContain("4|Last[]");
	});

	test("ブックマークは、指定したグループの最後に追加される", () => {
		const next = addBookmark("g1", "New", "https://new.example/")(base());
		expect(outline(next)[0]).toBe("1|Video[YouTube,Nico,New]");
		expect(next[1][0]?.bookmarks[2]?.url).toBe("https://new.example/");
	});

	test("存在しないグループを指定すると、何も変わらない", () => {
		expect(outline(addBookmark("none", "New", "https://new.example/")(base()))).toEqual(outline(base()));
	});

	test("追加を続けても、IDは重複しない", () => {
		let data = base();
		for (let i = 0; i < 50; i++) data = addGroup("3", `G${i}`)(data);
		const ids = data[3].map((g) => g.id);
		expect(new Set(ids).size).toBe(50);
	});
});

describe("編集", () => {
	test("グループ名だけが変わる", () => {
		const next = editGroup("g1", "Movie")(base());
		expect(outline(next)[0]).toBe("1|Movie[YouTube,Nico]");
		expect(next[1][0]?.id).toBe("g1");
	});

	test("ブックマークの名前とURLが変わる、IDは変わらない", () => {
		const next = editBookmark("b2", "Nico2", "https://nico2.example/")(base());
		const edited = next[1][0]?.bookmarks[1];
		expect(edited).toEqual({ id: "b2", name: "Nico2", url: "https://nico2.example/" });
	});
});

describe("削除", () => {
	test("グループは、中のブックマークごと消える", () => {
		expect(outline(removeGroup("g1")(base()))).toEqual(["1|SNS[X]", "2|News[]"]);
	});

	test("ブックマークだけが消える", () => {
		expect(outline(removeBookmark("b1")(base()))).toEqual(["1|Video[Nico]", "1|SNS[X]", "2|News[]"]);
	});
});

describe("ブックマークの移動", () => {
	test("同じグループの中で、後ろのものの前に移動する", () => {
		const data = bookmarksData({ 1: [group("g", "G", [bookmark("a", "A"), bookmark("b", "B"), bookmark("c", "C")])] });
		expect(outline(moveBookmark("a", "g", "c")(data))).toEqual(["1|G[B,A,C]"]);
	});

	test("同じグループの中で、前のものの前に移動する", () => {
		const data = bookmarksData({ 1: [group("g", "G", [bookmark("a", "A"), bookmark("b", "B"), bookmark("c", "C")])] });
		expect(outline(moveBookmark("c", "g", "a")(data))).toEqual(["1|G[C,A,B]"]);
	});

	test("beforeIdがnullなら、グループの最後に移動する", () => {
		expect(outline(moveBookmark("b1", "g1", null)(base()))[0]).toBe("1|Video[Nico,YouTube]");
	});

	test("別のグループ(別の列でも)に移動できる", () => {
		const next = moveBookmark("b1", "g3", null)(base());
		expect(outline(next)).toEqual(["1|Video[Nico]", "1|SNS[X]", "2|News[YouTube]"]);
	});

	test("移動してもIDは変わらない", () => {
		expect(moveBookmark("b1", "g3", null)(base())[2][0]?.bookmarks[0]?.id).toBe("b1");
	});

	test("beforeIdが見つからなければ、最後に移動する", () => {
		expect(outline(moveBookmark("b1", "g2", "none")(base()))[1]).toBe("1|SNS[X,YouTube]");
	});

	test("存在しないブックマークを移動しても、何も変わらない", () => {
		expect(moveBookmark("none", "g1", null)(base())).toEqual(base());
	});

	test("存在しないグループへの移動は、何も変わらない(ブックマークを失わない)", () => {
		expect(moveBookmark("b1", "none", null)(base())).toEqual(base());
	});
});

describe("グループの移動", () => {
	test("同じ列の中で、前のグループの前に移動する", () => {
		expect(outline(moveGroup("g2", "1", "g1")(base()))).toEqual(["1|SNS[X]", "1|Video[YouTube,Nico]", "2|News[]"]);
	});

	test("別の列の最後に移動する", () => {
		expect(outline(moveGroup("g1", "2", null)(base()))).toEqual(["1|SNS[X]", "2|News[]", "2|Video[YouTube,Nico]"]);
	});

	test("存在しないグループを移動しても、何も変わらない", () => {
		expect(moveGroup("none", "2", null)(base())).toEqual(base());
	});
});
