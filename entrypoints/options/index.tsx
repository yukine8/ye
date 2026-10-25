import { createEffect, createMemo, createSignal, onMount, Show } from "solid-js";
import { render } from "solid-js/web";
import { ensureBookmarkIds, fetchYe, saveOptions } from "@/utils/bookmarks";
import { loadYeCache, saveYeCache } from "@/utils/cache";
import { EMPTY_BOOKMARKS, type YeData } from "@/utils/model";
import { type Options, optionsFromUrl, optionsToUrl } from "@/utils/preferences";
import { applyTheme } from "@/utils/style";
import { BackupPanel } from "./BackupPanel";
import { Editor } from "./Editor";
import { SettingsPanel } from "./SettingsPanel";

function App() {
	// 先にnewtabと同じ前回のデータで表示して、ブラウザのブックマーク(これが正)から取得できたら差し替える
	const [ye, setYe] = createSignal<YeData>(loadYeCache() ?? { bookmarks: EMPTY_BOOKMARKS, options: "" });
	/** 編集できる状態か(全ブックマークにIDをつけて、最新の内容を取得し終えた) */
	const [ready, setReady] = createSignal(false);

	const options = createMemo(() => optionsFromUrl(ye().options));
	createEffect(() => applyTheme(options().colors));

	/** ブックマークを取得し直す、設定は(保存中のものがあるかもしれないので)そのまま */
	const reloadBookmarks = async (): Promise<void> => {
		const fresh = await fetchYe();
		update({ ...ye(), bookmarks: fresh.bookmarks });
	};

	/** 表示と、newtabが先に描画するためのキャッシュを更新する */
	const update = (data: YeData): void => {
		setYe(data);
		saveYeCache(data);
	};

	onMount(async () => {
		try {
			await ensureBookmarkIds();
			update(await fetchYe());
			setReady(true);
		} catch (e) {
			console.error("failed to load bookmarks: ", e);
		}
	});

	const changeOptions = (next: Options): void => {
		const url = optionsToUrl(next);
		update({ ...ye(), options: url });
		saveOptions(url).catch((e) => console.error("failed to save options: ", e));
	};

	return (
		<>
			<SettingsPanel options={options()} onChange={changeOptions} />
			<Show when={ready()}>
				<BackupPanel ye={ye()} />
				<Editor bookmarks={ye().bookmarks} reload={reloadBookmarks} />
			</Show>
		</>
	);
}

const container = document.getElementById("container");
if (!container) throw new Error("container not found");
render(() => <App />, container);
