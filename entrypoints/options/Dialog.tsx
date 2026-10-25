import { createSignal, For, onMount, Show } from "solid-js";

/** ダイアログの内容 */
export interface DialogSpec {
	title: string;
	submitLabel: string;
	/** 名前の初期値 */
	name: string;
	/** 指定すると、URLの入力欄を出す(初期値) */
	url?: string;
	/** 指定すると、選択欄を出す */
	choice?: { label: string; options: { value: string; label: string }[] };
	onSubmit: (values: { name: string; url: string; choice: string }) => void;
}

/** 名前、URL、選択欄を、必要なものだけ並べた入力ダイアログ */
export function Dialog(props: { spec: DialogSpec; onClose: () => void }) {
	// ダイアログは、開くたびに作り直すので、内容(spec)は最初の値のまま使う
	const { spec } = props;
	const [name, setName] = createSignal(spec.name);
	const [url, setUrl] = createSignal(spec.url ?? "");
	const choiceOptions = spec.choice?.options ?? [];
	const [choice, setChoice] = createSignal(choiceOptions[0]?.value ?? "");
	// 選択欄があるのに選べるものがない(フォルダーがない)
	const noChoice = spec.choice !== undefined && choiceOptions.length === 0;

	let dialog: HTMLDialogElement | undefined;
	onMount(() => dialog?.showModal());

	return (
		// Escキーで閉じたときも、呼び出し側の状態を閉じる
		<dialog ref={dialog} onClose={props.onClose}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (!noChoice) spec.onSubmit({ name: name().trim(), url: url().trim(), choice: choice() });
				}}
			>
				<h2 class="dialog-title">{spec.title}</h2>

				<div class="item">
					<label for="dialog-name">名前:</label>
					<input type="text" id="dialog-name" required value={name()} onInput={(e) => setName(e.currentTarget.value)} />
				</div>

				<Show when={spec.url !== undefined}>
					<div class="item">
						<label for="dialog-url">URL:</label>
						<input type="url" id="dialog-url" required value={url()} onInput={(e) => setUrl(e.currentTarget.value)} />
					</div>
				</Show>

				<Show when={spec.choice}>
					{(choiceSpec) => (
						<div class="item">
							<label for="dialog-choice">{choiceSpec().label}:</label>
							<Show when={!noChoice} fallback={<span class="note">先にフォルダーを追加してください</span>}>
								<select id="dialog-choice" value={choice()} onChange={(e) => setChoice(e.currentTarget.value)}>
									<For each={choiceSpec().options}>
										{(option) => <option value={option.value}>{option.label}</option>}
									</For>
								</select>
							</Show>
						</div>
					)}
				</Show>

				<div class="dialog-buttons">
					<button type="button" onClick={props.onClose}>
						キャンセル
					</button>
					<button type="submit">{spec.submitLabel}</button>
				</div>
			</form>
		</dialog>
	);
}
