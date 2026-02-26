/**
 * faviconCache.js
 * ファビコンのキャッシュをbrowser.local.storageにBase64にして保存する
 * browser.local.storageが非同期の関数であるため
 * 同期関数のwindow.localStorageを使うpreferences.jsと分けた
 * newtabから呼ばれる
 */

const FAVICON_CACHE_PREFIX = "favicon_";

/**
 * faviconを取得する
 * @param {string} url URL
 * @returns {Promise<string>} base64データ
 */
export async function getFavicon(url) {
	// 1. urlをきれいなhostnameだけにする
	let hostname;
	try {
		// https://www.google.com/search?q=google → www.google.com
		hostname = new URL(url).hostname;
	} catch (e) {
		return null;
	}
	if (hostname.startsWith("www.")) {
		// www.google.com → google.com
		hostname = hostname.slice(4);
	}

	// 2. browser.storage.localにあれば返して終了
	// キー衝突回避 google.com → favicon_google.com
	const cacheKey = FAVICON_CACHE_PREFIX + hostname;
	const { [cacheKey]: cached } = await browser.storage.local.get(cacheKey);
	if (cached) {
		return cached;
	}

	// 3. なければ取ってきてbase64形式で保存する
	const encodedHost = encodeURIComponent("https://" + hostname);
	const faviconUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodedHost}&size=32`;
	try {
		const response = await fetch(faviconUrl);
		const blob = await response.blob();

		// base64変換をPromiseでawaitにする
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				const base64data = reader.result;
				browser.storage.local.set({ [cacheKey]: base64data });
				resolve(base64data);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	} catch (e) {
		console.error("failed to fetch favicon:", e);
		return null;
	}
}
