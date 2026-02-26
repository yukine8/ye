/**
 * style.js
 * 同じページが増えたときに、スタイルの設定はここの関数から
 */

/**
 * js: "css"
 */
const COLOR_MAP = {
	base: "--base",
	accent: "--accent",
	hover: "--hover",
	iconBase: "--iconBase",
};

/**
 * setPropertyを行う
 * @param {Object} colors 色設定
 */
export function applyTheme(colors) {
	try {
		if (!colors) return;

		const root = document.documentElement;

		Object.entries(COLOR_MAP).forEach(([jsKey, cssKey]) => {
			const value = colors[jsKey];
			if (value) {
				root.style.setProperty(cssKey, value);
			}
		});
	} catch (e) {
		console.error("failed to set styles: ", e);
	}
}
