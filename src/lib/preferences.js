/**
 * preferences.js
 * 設定をwindow.localStorageに保存したり、読み込んだりする
 * window.localStorageが同期関数であるため
 * 非同期関数のbrowser.local.storageを使うfaviconCacheと分けた
 * newtabから呼ばれる
 */

const DEFAULT_OPTIONS = {
	theme: "dark",
	colors: {
		base: "#2b2a33",
		accent: "#d9d9e4",
		hover: "#42414d",
		iconBase: "#666680",
	},
	linkTarget: "_self",
	showOpenAll: true,
	hiddenUrls: [],
};

const THEMES = {
	light: {
		base: "#ffffff",
		accent: "#2b2a33",
		hover: "#f0f0f4",
		iconBase: "#ffffff",
	},
	dark: {
		base: "#2b2a33",
		accent: "#d9d9e4",
		hover: "#42414d",
		iconBase: "#666680",
	},
};

/**
 * THEMESのgetter
 * @param {string} themeName
 * @return {Object}
 */
export function getThemeColors(themeName) {
	try {
		const colors = THEME[themeName];
		console.log(colors);
		return colors;
	} catch (e) {
		console.error("failed to get themeColors: ", e);
	}
}

/**
 * 設定を読み込み、設定オブジェクトを返す
 * @returns {Object} 設定オブジェクト
 */
export function loadOptions() {
	let saved = {};
	try {
		const json = localStorage.getItem("options");
		if (json) {
			saved = JSON.parse(json);
		}
	} catch (e) {
		console.error("failed to load options from localStorage: ", e);
	}

	// 欠損値をなくすため、デフォルト設定を読み込んだ設定で上書きする
	const options = { ...DEFAULT_OPTIONS, ...saved };
	if (saved.colors) {
		// 色も穴埋め
		options.colors = {
			...DEFAULT_OPTIONS.colors,
			...saved.colors,
		};
	} else if (options.theme && THEMES[options.theme]) {
		options.colors = { ...THEMES[options.theme] };
	}

	return options;
}

/**
 * 設定オブジェクトを受け取り、保存する
 * @param {object} options
 */
export function saveOptions(options) {
	try {
		localStorage.setItem("options", JSON.stringify(options));
	} catch (e) {
		console.error("failed to save options to localStorage: ", e);
	}
}
