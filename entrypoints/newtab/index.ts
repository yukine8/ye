import { fetchYe } from "@/utils/bookmarks";
import { loadHiddenIds, loadYeCache, saveYeCache } from "@/utils/cache";
import { isSame } from "@/utils/common";
import { faviconUrl } from "@/utils/favicon";
import { type Bookmark, COLUMN_NAMES, type Group, mapColumns, type YeData } from "@/utils/model";
import { type Options, optionsFromUrl } from "@/utils/preferences";
import { applyTheme } from "@/utils/style";

async function main(): Promise<void> {
	const container = document.getElementById("container");
	if (!container) throw new Error("container not found");

	const render = ({ bookmarks, options: optionsUrl }: YeData): void => {
		const options = optionsFromUrl(optionsUrl);
		applyTheme(options.colors);

		// 非表示のものと、そのせいで空になったグループは表示しない
		const hiddenIds = loadHiddenIds();
		const shown = mapColumns(bookmarks, (groups) => withoutHidden(groups, hiddenIds));

		container.replaceChildren(
			...COLUMN_NAMES.map((name) => {
				const column = document.createElement("div");
				column.classList.add("column");
				column.append(...shown[name].map((group) => createGroup(group, options)));
				return column;
			}),
		);
	};

	// 前回のデータがあれば、ブラウザのAPIを待たずに先に描画する
	const cached = loadYeCache();
	if (cached) render(cached);

	try {
		const fresh = await fetchYe();
		// 変更がなければ描画し直さない
		if (isSame(fresh, cached)) return;

		saveYeCache(fresh);
		render(fresh);
	} catch (e) {
		console.error("failed to load bookmarks: ", e);
	}
}

/** 非表示のグループとブックマークと、そのせいで空になったグループを除く */
function withoutHidden(groups: Group[], hiddenIds: ReadonlySet<string>): Group[] {
	const result: Group[] = [];
	for (const group of groups) {
		if (hiddenIds.has(group.id)) continue;

		const bookmarks = group.bookmarks.filter((bookmark) => !hiddenIds.has(bookmark.id));
		if (bookmarks.length === 0) continue;

		result.push({ ...group, bookmarks });
	}
	return result;
}

function createGroup(group: Group, options: Options): HTMLFieldSetElement {
	const groupElement = document.createElement("fieldset");
	groupElement.classList.add("group");

	const legend = document.createElement("legend");
	legend.classList.add("group-label");
	legend.textContent = group.name;

	// タイトルを押すとグループ内を全部開く
	if (options.showOpenAll && group.bookmarks.length > 1) {
		legend.style.cursor = "pointer";
		legend.addEventListener("click", () => {
			for (const { url } of group.bookmarks) {
				browser.tabs.create({ url });
			}
		});
	}

	groupElement.append(legend, ...group.bookmarks.map((item) => createItem(item, options)));
	return groupElement;
}

function createItem(item: Bookmark, options: Options): HTMLAnchorElement {
	const anchor = document.createElement("a");
	anchor.classList.add("item");
	anchor.href = item.url;
	anchor.target = options.linkTarget;

	const img = document.createElement("img");
	img.classList.add("item-favicon");
	img.alt = ""; // 読み込めなかったときに、壊れた画像のアイコンを出さない
	const src = faviconUrl(item.url);
	if (src) img.src = src;

	const label = document.createElement("span");
	label.classList.add("item-label");
	label.textContent = item.name;

	anchor.append(img, label);
	return anchor;
}

main();
