import { createSignal, For, type JSX, onMount, Show } from "solid-js";
import {
	addBookmark,
	addGroup,
	collectIds,
	editBookmark,
	editGroup,
	moveBookmark,
	moveGroup,
	removeBookmark,
	removeGroup,
} from "@/utils/bookmarkOps";
import { saveChange } from "@/utils/bookmarks";
import { loadHiddenIds, saveHiddenIds } from "@/utils/cache";
import { isOneOf, isSame } from "@/utils/common";
import { faviconUrl } from "@/utils/favicon";
import { type BookmarksData, COLUMN_NAMES, type ColumnName, type Group } from "@/utils/model";
import { Dialog, type DialogSpec } from "./Dialog";
import { type Dragging, type DropTarget, resolveDropTarget } from "./dragDrop";

/** 戻るで元にする、操作する前の状態 */
interface Snapshot {
	bookmarks: BookmarksData;
	hiddenIds: Set<string>;
}

type IconName = "edit" | "eye" | "eye-off" | "trash";

function IconButton(props: { icon: IconName; label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			class={`icon-button icon-${props.icon}`}
			aria-label={props.label}
			title={props.label}
			onClick={props.onClick}
		/>
	);
}

function Favicon(props: { url: string }) {
	return <img class="item-favicon" src={faviconUrl(props.url)} alt="" draggable={false} />;
}

/**
 * ブックマークの編集画面
 * 編集はブラウザのブックマークに書き込む。設定画面を閉じるまでは、操作を元に戻せる
 */
export function Editor(props: { bookmarks: BookmarksData; reload: () => Promise<void> }) {
	const [hiddenIds, setHiddenIds] = createSignal(loadHiddenIds());
	const [history, setHistory] = createSignal<Snapshot[]>([]);
	const [dialog, setDialog] = createSignal<DialogSpec>();
	const [dragging, setDragging] = createSignal<Dragging>();
	const [dropTarget, setDropTarget] = createSignal<DropTarget>();
	const [error, setError] = createSignal("");
	const [busy, setBusy] = createSignal(false);

	/** 操作の途中で次の操作が始まらないように、1つずつ実行する、失敗したらエラーを表示する */
	const guarded = async (task: () => Promise<void>): Promise<void> => {
		if (busy()) return;
		setBusy(true);
		setError("");
		try {
			await task();
		} catch (e) {
			console.error("edit failed: ", e);
			const message = e instanceof Error ? e.message : String(e);
			setError(`失敗しました: ${message}`);
		} finally {
			setBusy(false);
		}
	};

	const snapshot = (): Snapshot => ({ bookmarks: props.bookmarks, hiddenIds: hiddenIds() });

	const setHidden = (ids: Set<string>): void => {
		setHiddenIds(ids);
		saveHiddenIds(ids);
	};

	// 存在しなくなったブックマーク・グループのIDを、非表示の一覧から消す
	onMount(() => {
		const existing = collectIds(props.bookmarks);
		const remaining = [...hiddenIds()].filter((id) => existing.has(id));
		setHidden(new Set(remaining));
	});

	/** ブックマークを編集する、変更後のデータの作り方(bookmarkOps.ts)を受け取る */
	const edit = (change: (data: BookmarksData) => BookmarksData): Promise<void> =>
		guarded(async () => {
			const before = snapshot();
			const next = change(props.bookmarks);
			if (isSame(next, before.bookmarks)) return; // 同じ位置への移動など、何も変わらない操作は記録しない

			await saveChange(before.bookmarks, next);
			setHistory((entries) => [...entries, before]);
			await props.reload();
		});

	/** 直前の操作を元に戻す、ブックマークは、今のデータと操作前のデータの違いを反映する */
	const undo = (): Promise<void> =>
		guarded(async () => {
			const last = history().at(-1);
			if (!last) return;

			await saveChange(props.bookmarks, last.bookmarks);
			setHistory((entries) => entries.slice(0, -1));
			setHidden(last.hiddenIds);
			await props.reload();
		});

	const isHidden = (id: string): boolean => hiddenIds().has(id);
	const hideIcon = (id: string): IconName => (isHidden(id) ? "eye-off" : "eye");
	const hideLabel = (id: string): string => (isHidden(id) ? "newtabに表示する" : "newtabで非表示にする");

	/** この端末での表示/非表示を切り替える、ブックマークには書かない */
	const toggleHidden = (id: string): void => {
		setHistory((entries) => [...entries, snapshot()]);
		const next = new Set(hiddenIds());
		if (!next.delete(id)) next.add(id);
		setHidden(next);
	};

	/** ダイアログを開く、送信したら閉じる */
	const openDialog = (spec: DialogSpec): void => {
		setDialog({
			...spec,
			onSubmit: (values) => {
				setDialog(undefined);
				spec.onSubmit(values);
			},
		});
	};

	const openAddGroup = (): void =>
		openDialog({
			title: "フォルダーを追加",
			submitLabel: "追加",
			name: "",
			choice: { label: "列", options: COLUMN_NAMES.map((column) => ({ value: column, label: `${column}列目` })) },
			onSubmit: ({ name, choice }) => {
				if (isOneOf(COLUMN_NAMES, choice)) edit(addGroup(choice, name));
			},
		});

	const openAddBookmark = (): void =>
		openDialog({
			title: "ブックマークを追加",
			submitLabel: "追加",
			name: "",
			url: "",
			choice: {
				label: "フォルダー",
				options: COLUMN_NAMES.flatMap((column) =>
					props.bookmarks[column].map((group) => ({ value: group.id, label: `${column}列目 / ${group.name}` })),
				),
			},
			onSubmit: ({ name, url, choice }) => edit(addBookmark(choice, name, url)),
		});

	// ---- ドラッグ＆ドロップ ----

	const endDrag = (): void => {
		setDragging(undefined);
		setDropTarget(undefined);
	};

	const startDrag = (e: DragEvent, drag: Dragging): void => {
		if (busy() || !e.dataTransfer) {
			e.preventDefault();
			return;
		}
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", drag.id); // Firefoxは何かデータを入れないとドラッグが始まらない
		setDragging(drag);
	};

	/** ドロップする場所が、parentの最後か */
	const isEnd = (parent: string): boolean => dropTarget()?.parent === parent && dropTarget()?.beforeId === null;

	/** ドラッグできる部分、IDがついていなければ(編集画面を開く前の)ドラッグできない */
	const dragHandle = (drag: Dragging, children: JSX.Element) => (
		// draggableは{true}と書く(属性だけ書くと draggable="" になり、spanはドラッグできない)
		// biome-ignore lint/a11y/noStaticElementInteractions: ドラッグ＆ドロップはマウス操作の機能(キーボードでの移動は未対応)
		<span class="drag-handle" draggable={true} onDragStart={(e) => startDrag(e, drag)} onDragEnd={endDrag}>
			{children}
		</span>
	);

	const GroupBlock = (p: { group: Group; column: ColumnName; isLast: boolean }) => (
		<div
			class="editor-group"
			data-kind="group"
			data-id={p.group.id}
			classList={{
				"is-dragging": dragging()?.id === p.group.id,
				"drop-before": dropTarget()?.beforeId === p.group.id,
				// 列の最後に入れるときは、最後のグループの下に線を出す
				"drop-after": p.isLast && isEnd(p.column),
			}}
		>
			<div
				class="editor-row editor-group-row"
				data-kind="group-header"
				classList={{
					"is-hidden": isHidden(p.group.id),
					// 空のグループの中に入れるときは、グループの名前の行の下に線を出す
					"drop-after": p.group.bookmarks.length === 0 && isEnd(p.group.id),
				}}
			>
				<IconButton
					icon="edit"
					label="フォルダー名を編集"
					onClick={() =>
						openDialog({
							title: "フォルダーを編集",
							submitLabel: "保存",
							name: p.group.name,
							onSubmit: ({ name }) => edit(editGroup(p.group.id, name)),
						})
					}
				/>
				<IconButton
					icon={hideIcon(p.group.id)}
					label={hideLabel(p.group.id)}
					onClick={() => toggleHidden(p.group.id)}
				/>
				{dragHandle({ kind: "group", id: p.group.id }, <span class="editor-label group-label">{p.group.name}</span>)}
				<IconButton icon="trash" label="フォルダーを削除" onClick={() => edit(removeGroup(p.group.id))} />
			</div>

			<For each={p.group.bookmarks}>
				{(bookmark, index) => (
					<div
						class="editor-row editor-item"
						data-kind="bookmark"
						data-id={bookmark.id}
						classList={{
							"is-hidden": isHidden(bookmark.id),
							"is-dragging": dragging()?.id === bookmark.id,
							"drop-before": dropTarget()?.beforeId === bookmark.id,
							// グループの最後に入れるときは、最後のブックマークの下に線を出す
							"drop-after": index() === p.group.bookmarks.length - 1 && isEnd(p.group.id),
						}}
					>
						<IconButton
							icon="edit"
							label="ブックマークを編集"
							onClick={() =>
								openDialog({
									title: "ブックマークを編集",
									submitLabel: "保存",
									name: bookmark.name,
									url: bookmark.url,
									onSubmit: ({ name, url }) => edit(editBookmark(bookmark.id, name, url)),
								})
							}
						/>
						<IconButton
							icon={hideIcon(bookmark.id)}
							label={hideLabel(bookmark.id)}
							onClick={() => toggleHidden(bookmark.id)}
						/>
						{dragHandle(
							{ kind: "bookmark", id: bookmark.id },
							<>
								<Favicon url={bookmark.url} />
								<span class="editor-label item-label" title={bookmark.url}>
									{bookmark.name}
								</span>
							</>,
						)}
						<IconButton icon="trash" label="ブックマークを削除" onClick={() => edit(removeBookmark(bookmark.id))} />
					</div>
				)}
			</For>
		</div>
	);

	return (
		<section class="editor">
			<h2 class="group-label">ブックマークの編集</h2>

			<div class="editor-toolbar">
				<button type="button" disabled={busy()} onClick={openAddGroup}>
					フォルダーを追加
				</button>
				<button type="button" disabled={busy()} onClick={openAddBookmark}>
					ブックマークを追加
				</button>
				<button type="button" disabled={busy() || history().length === 0} onClick={undo}>
					戻る
				</button>
			</div>

			<Show when={error()}>
				<p class="editor-error">{error()}</p>
			</Show>

			{/* biome-ignore lint/a11y/noStaticElementInteractions: ドラッグ＆ドロップはマウス操作の機能(キーボードでの移動は未対応) */}
			<div
				class="editor-columns"
				onDragOver={(e) => {
					const drag = dragging();
					if (!drag) return;

					const target = resolveDropTarget(drag, e);
					setDropTarget(target);
					if (target && e.dataTransfer) {
						e.preventDefault(); // preventDefaultしたところが、ドロップできる場所になる
						e.dataTransfer.dropEffect = "move";
					}
				}}
				onDragLeave={(e) => {
					// ブックマークの表示場所の外に出たら、ドロップする場所の表示を消す
					const next = e.relatedTarget;
					const isStillInside = next instanceof Node && e.currentTarget.contains(next);
					if (!isStillInside) setDropTarget(undefined);
				}}
				onDrop={(e) => {
					e.preventDefault();
					const drag = dragging();
					const target = dropTarget();
					endDrag();
					if (!drag || !target) return;

					if (drag.kind === "bookmark") {
						edit(moveBookmark(drag.id, target.parent, target.beforeId));
					} else if (isOneOf(COLUMN_NAMES, target.parent)) {
						edit(moveGroup(drag.id, target.parent, target.beforeId));
					}
				}}
			>
				<For each={COLUMN_NAMES}>
					{(column) => (
						<div
							class="editor-column"
							data-kind="column"
							data-column={column}
							// グループがない列に入れるときは、列の先頭に線を出す
							classList={{ "drop-empty": props.bookmarks[column].length === 0 && isEnd(column) }}
						>
							<For each={props.bookmarks[column]}>
								{(group, index) => (
									<GroupBlock group={group} column={column} isLast={index() === props.bookmarks[column].length - 1} />
								)}
							</For>
						</div>
					)}
				</For>
			</div>

			<Show when={dialog()}>{(spec) => <Dialog spec={spec()} onClose={() => setDialog(undefined)} />}</Show>
		</section>
	);
}
