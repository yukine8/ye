import { onMount } from "solid-js";

/** 確認のダイアログ、submitLabelのボタンを押すとonSubmitを呼ぶ */
export function ConfirmDialog(props: {
	message: string;
	submitLabel: string;
	onSubmit: () => void;
	onClose: () => void;
}) {
	let dialog: HTMLDialogElement | undefined;
	onMount(() => dialog?.showModal());

	return (
		// Escキーで閉じたときも、呼び出し側の状態を閉じる
		<dialog ref={dialog} onClose={props.onClose}>
			<p>{props.message}</p>
			<div class="dialog-buttons">
				<button type="button" onClick={props.onClose}>
					キャンセル
				</button>
				<button type="button" onClick={props.onSubmit}>
					{props.submitLabel}
				</button>
			</div>
		</dialog>
	);
}
