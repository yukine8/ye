import { createSignal, Show } from "solid-js";
import { createBackup, parseBackup, type RestoredData, restoreBackup } from "@/utils/backup";
import { fetchYe, saveChange, saveOptions } from "@/utils/bookmarks";
import { loadHiddenIds, saveHiddenIds } from "@/utils/cache";
import type { YeData } from "@/utils/model";
import { ConfirmDialog } from "./ConfirmDialog";

function errorMessage(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** 設定とブックマークを、JSONでクリップボードにコピーする・貼り付けて読み込む */
export function BackupPanel(props: { ye: YeData }) {
	const [message, setMessage] = createSignal("");
	/** 上書きしてよいか確認中の、読み込むデータ */
	const [pending, setPending] = createSignal<RestoredData>();
	const [busy, setBusy] = createSignal(false);

	const copy = async (): Promise<void> => {
		const text = JSON.stringify(createBackup(props.ye, loadHiddenIds()), null, 2);
		try {
			await navigator.clipboard.writeText(text);
			setMessage("コピーしました");
		} catch (e) {
			console.error("failed to copy: ", e);
			setMessage(`コピーに失敗しました: ${errorMessage(e)}`);
		}
	};

	/** ブラウザのブックマークと設定を、読み込んだデータに置き換える、終わったらページを開き直す */
	const replace = async (data: RestoredData): Promise<void> => {
		setBusy(true);
		try {
			const current = await fetchYe();
			await saveChange(current.bookmarks, data.bookmarks);
			await saveOptions(data.options);
			saveHiddenIds(data.hiddenIds);
			location.reload();
		} catch (e) {
			console.error("failed to import: ", e);
			setMessage(`読み込みに失敗しました: ${errorMessage(e)}`);
			setBusy(false);
		}
	};

	/** 貼り付けられたJSONを確かめて、置き換えてよいかを聞く(読み込めない形式なら、理由を表示する) */
	const importText = (text: string): void => {
		if (busy()) return;
		setMessage("");
		try {
			setPending(restoreBackup(parseBackup(text)));
		} catch (e) {
			setMessage(`読み込めません: ${errorMessage(e)}`);
		}
	};

	return (
		<div class="settings">
			<fieldset class="group">
				<legend class="group-label">バックアップ</legend>

				<div class="item">
					<span class="item-name">書き出し</span>
					<button type="button" onClick={copy}>
						クリップボードにjsonをコピー
					</button>
				</div>

				<div class="item">
					<label for="import-json">読み込み</label>
					<input
						type="text"
						id="import-json"
						placeholder="ここにjsonを貼り付け"
						onPaste={(e) => {
							e.preventDefault(); // 貼り付けた文字は、入力欄に残さない
							importText(e.clipboardData?.getData("text") ?? "");
						}}
					/>
				</div>

				<Show when={message()}>
					<p class="note">{message()}</p>
				</Show>
			</fieldset>

			<Show when={pending()}>
				{(data) => (
					<ConfirmDialog
						message="今のブックマークと設定を、読み込む内容で置き換えます。元に戻せません。"
						submitLabel="置き換える"
						onClose={() => setPending(undefined)}
						onSubmit={() => {
							const restored = data();
							setPending(undefined);
							replace(restored);
						}}
					/>
				)}
			</Show>
		</div>
	);
}
