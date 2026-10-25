import type { Colors } from "./preferences";

/** 設定の色キーとCSSカスタムプロパティ名の対応 */
const CSS_VARIABLES: readonly (readonly [keyof Colors, string])[] = [
	["base", "--base"],
	["accent", "--accent"],
	["hover", "--hover"],
	["iconBase", "--iconBase"],
];

/**
 * 色設定をCSSカスタムプロパティに反映する
 */
export function applyTheme(colors: Colors): void {
	const { style } = document.documentElement;
	for (const [key, property] of CSS_VARIABLES) {
		style.setProperty(property, colors[key]);
	}
}
