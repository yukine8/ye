/**
 * この端末のlocalStorageに保存するもの
 * localStorageは、ブラウザのAPIと違って同期的に読めるので、newtabの最初の描画を速くするために使う
 */

import type { YeData } from "./model";

const YE_KEY = "ye";
const HIDDEN_KEY = "hiddenIds";

/** 保存するデータの形を変えたら上げる(古い形のデータは使わない) */
const YE_VERSION = 2;

/** 前回取得した、yeフォルダの中身。ブックマークが正で、これは描画を速くするための写し */
export function loadYeCache(): YeData | null {
	try {
		const json = localStorage.getItem(YE_KEY);
		if (!json) return null;

		// 自分で保存したものなので、中身の検証はしない
		const saved: { version: number; data: YeData } = JSON.parse(json);
		if (saved.version !== YE_VERSION) return null;
		return saved.data;
	} catch (e) {
		console.error("failed to load cache: ", e);
		return null;
	}
}

export function saveYeCache(data: YeData): void {
	try {
		localStorage.setItem(YE_KEY, JSON.stringify({ version: YE_VERSION, data }));
	} catch (e) {
		console.error("failed to save cache: ", e);
	}
}

/**
 * newtabで非表示にするグループ・ブックマークのID(bookmarkId.ts)
 * この端末だけの設定なので、ブックマークには保存せず、同期されないlocalStorageに保存する
 */
export function loadHiddenIds(): Set<string> {
	try {
		const json = localStorage.getItem(HIDDEN_KEY);
		if (!json) return new Set();

		const ids: string[] = JSON.parse(json);
		return new Set(ids);
	} catch (e) {
		console.error("failed to load hidden ids: ", e);
		return new Set();
	}
}

export function saveHiddenIds(ids: ReadonlySet<string>): void {
	try {
		localStorage.setItem(HIDDEN_KEY, JSON.stringify([...ids]));
	} catch (e) {
		console.error("failed to save hidden ids: ", e);
	}
}
