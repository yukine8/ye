/**
 * 設定
 * 設定はブラウザのブックマーク(yeフォルダ直下の、名前がoptionsのブックマーク)1つに保存する
 * URLが https://ye.invalid/options?<設定名>=<値>&... (.invalidは予約されたTLDなので、実在するサイトにはつながらない)
 */

import { isOneOf } from "./common";

export const THEMES = ["light", "dark", "custom"] as const;
export const LINK_TARGETS = ["_self", "_blank"] as const;

/** customは、色を自分で指定する */
type Theme = (typeof THEMES)[number];
type LinkTarget = (typeof LINK_TARGETS)[number];

export interface Colors {
	base: string;
	accent: string;
	hover: string;
	iconBase: string;
}

export interface Options {
	theme: Theme;
	colors: Colors;
	linkTarget: LinkTarget;
	showOpenAll: boolean;
}

const PRESET_COLORS = {
	light: { base: "#ffffff", accent: "#2b2a33", hover: "#f0f0f4", iconBase: "#ffffff" },
	dark: { base: "#2b2a33", accent: "#d9d9e4", hover: "#42414d", iconBase: "#666680" },
} as const satisfies Record<Exclude<Theme, "custom">, Colors>;

/** テーマの色、customなら色が決まっていないのでnull */
export function getThemeColors(theme: Theme): Colors | null {
	return theme === "custom" ? null : PRESET_COLORS[theme];
}

const DEFAULT_OPTIONS: Options = {
	theme: "dark",
	colors: PRESET_COLORS.dark,
	linkTarget: "_self",
	showOpenAll: true,
};

/** valueがlistの要素ならそれを、そうでなければfallbackを返す */
function pick<const T extends readonly string[]>(list: T, value: string | null, fallback: T[number]): T[number] {
	return isOneOf(list, value) ? value : fallback;
}

/** 設定を入れるブックマークの名前 */
export const OPTIONS_TITLE = "options";

/**
 * 設定のブックマークのURLから、Optionsを作る
 * 欠けている設定や不正な値は既定値で補う。URLとして不正なら、全て既定値になる
 */
export function optionsFromUrl(url: string): Options {
	let params: URLSearchParams;
	try {
		params = new URL(url).searchParams;
	} catch {
		params = new URLSearchParams();
	}

	const theme = pick(THEMES, params.get("theme"), DEFAULT_OPTIONS.theme);
	const themeColors = getThemeColors(theme) ?? DEFAULT_OPTIONS.colors;
	const showOpenAll = params.get("showOpenAll");

	return {
		theme,
		colors: {
			base: params.get("colors.base") ?? themeColors.base,
			accent: params.get("colors.accent") ?? themeColors.accent,
			hover: params.get("colors.hover") ?? themeColors.hover,
			iconBase: params.get("colors.iconBase") ?? themeColors.iconBase,
		},
		linkTarget: pick(LINK_TARGETS, params.get("linkTarget"), DEFAULT_OPTIONS.linkTarget),
		showOpenAll: showOpenAll === null ? DEFAULT_OPTIONS.showOpenAll : showOpenAll === "true",
	};
}

/** Optionsを、設定のブックマークのURLにする(optionsFromUrlの逆) */
export function optionsToUrl(options: Options): string {
	const url = new URL("https://ye.invalid/options");
	url.searchParams.set("theme", options.theme);
	url.searchParams.set("linkTarget", options.linkTarget);
	url.searchParams.set("showOpenAll", String(options.showOpenAll));
	for (const [name, color] of Object.entries(options.colors)) url.searchParams.set(`colors.${name}`, color);
	return url.toString();
}
