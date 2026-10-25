import { describe, expect, test } from "vitest";
import { getThemeColors, optionsFromUrl, optionsToUrl } from "../utils/preferences";

const DARK = getThemeColors("dark");

describe("optionsFromUrl", () => {
	test("空や不正なURLなら、全て既定値", () => {
		for (const url of ["", "not a url", "https://ye.invalid/options"]) {
			expect(optionsFromUrl(url)).toEqual({ theme: "dark", colors: DARK, linkTarget: "_self", showOpenAll: true });
		}
	});

	test("themeに合わせて、色が決まる", () => {
		const options = optionsFromUrl("https://ye.invalid/options?theme=light");
		expect(options.theme).toBe("light");
		expect(options.colors).toEqual(getThemeColors("light"));
	});

	test("customでは、指定した色を使い、指定のない色は既定値で補う", () => {
		const options = optionsFromUrl("https://ye.invalid/options?theme=custom&colors.base=%23123456");
		expect(options.colors.base).toBe("#123456");
		expect(options.colors.accent).toBe(DARK?.accent);
	});

	test("不正な値は、項目ごとに既定値にする", () => {
		const options = optionsFromUrl("https://ye.invalid/options?theme=neon&linkTarget=_top&showOpenAll=false");
		expect(options.theme).toBe("dark");
		expect(options.linkTarget).toBe("_self");
		expect(options.showOpenAll).toBe(false);
	});

	test("showOpenAll は、true 以外の文字列なら false", () => {
		expect(optionsFromUrl("https://ye.invalid/options?showOpenAll=yes").showOpenAll).toBe(false);
	});

	test("知らない項目は無視する", () => {
		const options = optionsFromUrl("https://ye.invalid/options?theme=light&future=1");
		expect(options).not.toHaveProperty("future");
	});
});

describe("optionsToUrl", () => {
	test("optionsFromUrl の逆になっている", () => {
		const options = {
			theme: "custom",
			colors: { base: "#010203", accent: "#a0b0c0", hover: "rgb(1, 2, 3)", iconBase: "red" },
			linkTarget: "_blank",
			showOpenAll: false,
		} as const;
		expect(optionsFromUrl(optionsToUrl(options))).toEqual(options);
	});

	test("ye.invalid のURLで、色の # はエンコードされる", () => {
		const url = optionsToUrl(optionsFromUrl(""));
		expect(url.startsWith("https://ye.invalid/options?")).toBe(true);
		expect(url).not.toContain("#");
		expect(url).toContain("colors.base=%232b2a33");
	});
});
