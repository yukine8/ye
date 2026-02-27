import { fetchBookmarksData } from "../lib/bookmarks.js";
import { getFavicon } from "../lib/faviconCache.js";
import { loadOptions } from "../lib/preferences.js";
import { applyTheme } from "../lib/style.js";

// deferでロードは保証
(async () => {
	const container = document.getElementById("container");

	// 設定をロード
	const options = loadOptions();

	// テーマの設定をcssに設定
	applyTheme(options.colors);

	// ブックマークデータの取得
	let bookmarksData = await fetchBookmarksData();

	// 非表示にするブックマークを除外
	if (options.hiddenUrls && options.hiddenUrls.length > 0) {
		bookmarksData = filterBookmarks(bookmarksData, options.hiddenUrls);
	}

	// 列やグループ、ブックマークの描画
	renderBookmarks(bookmarksData, container, options);

	// 最後にfaviconの描画
	loadAndDisplayFavicons();
})();

// 非表示にするブックマークを除いたブックマークを返す
function filterBookmarks(bookmarks, hiddenUrls) {
	const filtered = {};
	for (const column in bookmarks) {
		filtered[column] = {};
		for (const group in bookmarks[column]) {
			const list = bookmarks[column][group].filter((item) => !hiddenUrls.some((url) => item.url.includes(url)));
			if (list.length > 0) {
				filtered[column][group] = list;
			}
		}
	}
	return filtered;
}

/**
 * 描画用のブックマークオブジェクトからHTMLを構築する
 * パフォーマンス向上のため、DocumentFragmentを用いて一度にDOMへ追加する
 * @param {Object} bookmarks
 * @param {HTMLElement} container
 * @param {Object} options
 */
async function renderBookmarks(bookmarks, container, options) {
	container.innerHTML = ""; // 描画前にコンテナを空にする
	const fragment = document.createDocumentFragment();

	for (const columnKey in bookmarks) {
		const columnFieldset = document.createElement("fieldset");
		columnFieldset.classList.add("column");

		const columnGroups = bookmarks[columnKey];
		if (columnGroups) {
			for (const groupName in columnGroups) {
				// <fieldset class="group"> を作成
				const groupFieldset = document.createElement("fieldset");
				groupFieldset.classList.add("group");

				// <legend class="group-label"> を作成
				const groupLegend = document.createElement("legend");
				groupLegend.classList.add("group-label");
				groupLegend.textContent = groupName;

				if (options.showOpenAll && columnGroups[groupName].length > 1) {
					groupLegend.style.cursor = "pointer";
					groupLegend.onclick = () => columnGroups[groupName].forEach((b) => browser.tabs.create({ url: b.url }));
				}

				groupFieldset.appendChild(groupLegend);

				const bookmarkList = columnGroups[groupName];
				if (bookmarkList && bookmarkList.length > 0) {
					for (const bookmark of bookmarkList) {
						// <a class="item"> を作成
						const itemElement = document.createElement("a");
						itemElement.classList.add("item");
						itemElement.href = bookmark.url;
						itemElement.target = options.linkTarget;

						// <img class="item-favicon"> を作成
						const faviconElement = document.createElement("img");
						faviconElement.classList.add("item-favicon");

						let hostname;
						try {
							hostname = new URL(bookmark.url).hostname;
							faviconElement.dataset.hostname = hostname; // ホスト名をデータ属性に保存
							faviconElement.dataset.url = bookmark.url; // URLも保存
						} catch (e) {
							try {
								hostname = new URL("https://" + bookmark.url).hostname;
								faviconElement.dataset.hostname = hostname;
								faviconElement.dataset.url = "https://" + bookmark.url;
							} catch (e2) {
								console.warn("valid URL:", bookmark.url);
							}
						}
						itemElement.appendChild(faviconElement);

						// <span class="item-label"> を作成
						const labelElement = document.createElement("span");
						labelElement.classList.add("item-label");
						labelElement.textContent = bookmark.name;
						itemElement.appendChild(labelElement);

						groupFieldset.appendChild(itemElement);
					}
				}
				columnFieldset.appendChild(groupFieldset); // groupFieldsetをcolumnFieldsetに追加
			}
		}
		fragment.appendChild(columnFieldset); // columnFieldsetをfragmentに追加
	}
	container.appendChild(fragment); // 最後に1度だけDOMに追加
}

const DEFAULT_ICON_BASE64 =
	"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iIzU1NSIgdmlld0JveD0iMCAwIDI1NiAyNTYiPjxwYXRoIGQ9Ik0xMjgsMjJBNjIsNjIsMCwwLDAsNjYsODRWMTcwYTYyLDYyLDAsMCwwLDEyNCwwVjg0QTYyLDYyLDAsMCwwLDEyOCwyMlptNDYsMTQ4YTM4LDM4LDAsMCwxLTI3LjMyLDM1LjQ4bC0uMTYuMDVBLjEuMSwwLDAsMSwxNDYuNDUsMjA1bC0uNDQtLjE5YTM3Ljc3LDM3Ljc3LDAsMCwxLTE3LjQ2LTIxLjQybC0uMTQtLjM1QS4xLjEsMCwwLDEsMTI4LjYxLDE4MGwzLS4zOGEzOCwzOCwwLDAsMSwzNS40OC0yNy4zMmwuMDUtLjE2YS4xLjEsMCwwLDEsLjM5LjEybC0uMTkuNDRB۳৭Ljc3LDM3Ljc3LDAsMCwxLDE1MCwxNzkuMzlsLS4zNS4xNEEuMS4xLDAsMCwxLDE0OS4xMSwxODBsLS4zOC0zWm0yMi4xNy01Mi4yOEExLjE0LDEuMTQsMCwwLDEsMTk2LDEyOGEzOCwzOCwwLDAsMS0zNS40OCwyNy4zMmwtLjA1KEwuMTZhLjEuMSwwLDAsMS0uMzktLjEybC4xOS0uNDRhMzcuNzcsMzcuNzcsMCwwLDEsMjEuNDItMTcuNDZsLjM1LS4xNEEuMS4xLDAsMCwxLDE4MS43OSwxMzdsMywuMzhhMzgsMzgsMCwwLDEsMjcuMzIsMzUuNDhsLjE2LjA1YS4xLjEsMCwwLDEsLjEyLS4zOWwtLjQ0LS4xOWEzNy43NywzNy43NywwLDAsMS0xNy40Ni0yMS40MmwtLjE0LS4zNWEuMS4xLDAsMCwxLC4xMi0uMzlMMTg0LDE1MGwyLjM4LTE4LjgzQTEuMTQsMS4xNCwwLDAsMSwxODYuMTcsMTI1LjcyWk04NCw4NEEzOCwzOCwwLDAsMSwxMTYuNjEsNDguMTJsMywuMzhhMzgsMzgsMCwwLDEsMjcuMzIsMzUuNDhsLjE2LjA1YS4xLjEsMCwwLDEsLjEyLS4zOWwtLjQ0LS4xOWEzNy43NywzNy43NywwLDAsMS0xNy40Ni0yMS40MmwtLjE0LS4zNUEuMS4xLDAsMCwxLDEyOC44MSw2MC";

/**
 * 表示されている全てのアイコンについて、並行してファビコンを取得し表示する
 * ネットワーク等の遅延の影響を抑え、高速化を図る
 */
async function loadAndDisplayFavicons() {
	console.log("loadAndDisplayFavicons called");
	const imgs = document.querySelectorAll(".item-favicon");
	for (const img of imgs) {
		img.src = DEFAULT_ICON_BASE64;
	} // プレースホルダ

	const promises = Array.from(imgs).map(async (img) => {
		const url = img.dataset.url;
		if (!url) return;

		try {
			const favicon = await getFavicon(url);
			if (favicon) {
				img.src = favicon;
			}
		} catch (e) {
			console.error("Error loading favicon for", url, e);
		}
	});

	await Promise.all(promises);
}
