import { describe, expect, test } from "vitest";
import { faviconUrl } from "../utils/favicon";

describe("faviconUrl", () => {
	test("ホスト名だけを使い、www. は除く", () => {
		const url = faviconUrl("https://www.google.com/search?q=x");
		expect(url).toBe(
			"https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https%3A%2F%2Fgoogle.com&size=32",
		);
	});

	test("同じホストなら、ページが違っても同じURLになる(ブラウザのキャッシュが効く)", () => {
		expect(faviconUrl("https://github.com/a")).toBe(faviconUrl("http://www.github.com/b?c=d"));
	});

	test.each(["not a url", "", "javascript:void(0)", "about:blank"])("ホスト名がなければ undefined: %j", (url) => {
		expect(faviconUrl(url)).toBeUndefined();
	});
});
