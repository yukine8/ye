/**
 * 編集画面のドラッグ＆ドロップで、ドロップする場所を決める
 * 画面の要素の data-kind(column, group, group-header, bookmark) と data-id から探す
 */

/** ドラッグしているもの */
export interface Dragging {
	kind: "group" | "bookmark";
	id: string;
}

/** ドロップする場所、親(ブックマークならグループのID、グループなら列の名前)の中の、IDがbeforeIdのものの前(nullなら最後) */
export interface DropTarget {
	parent: string;
	beforeId: string | null;
}

/** 要素の次の兄弟のID、ドラッグしているものは飛ばす、なければnull */
function nextIdAfter(element: Element, draggedId: string): string | null {
	let next = element.nextElementSibling;
	while (next instanceof HTMLElement && next.dataset.id === draggedId) {
		next = next.nextElementSibling;
	}
	if (next instanceof HTMLElement) return next.dataset.id ?? null;
	return null;
}

/** ポインタが要素の上半分にあるか */
function isUpperHalf(element: Element, clientY: number): boolean {
	const rect = element.getBoundingClientRect();
	return clientY < rect.top + rect.height / 2;
}

/** 要素の上半分に落とすなら、その要素の前。下半分に落とすなら、次の要素の前(なければnull) */
function beforeIdFor(element: HTMLElement, draggedId: string, clientY: number): string | null {
	if (isUpperHalf(element, clientY)) return element.dataset.id ?? null;
	return nextIdAfter(element, draggedId);
}

function closestOfKind(element: Element, kind: string): HTMLElement | null {
	return element.closest<HTMLElement>(`[data-kind="${kind}"]`);
}

function resolveBookmarkTarget(drag: Dragging, hovered: Element, clientY: number): DropTarget | undefined {
	// ブックマークの行には、その前か後ろに入れる
	const row = closestOfKind(hovered, "bookmark");
	if (row) {
		const group = closestOfKind(row, "group");
		if (!group?.dataset.id || row.dataset.id === drag.id) return undefined;
		return { parent: group.dataset.id, beforeId: beforeIdFor(row, drag.id, clientY) };
	}

	// グループの名前の行には、そのグループの先頭に入れる
	const header = closestOfKind(hovered, "group-header");
	if (!header) return undefined;
	const group = closestOfKind(header, "group");
	if (!group?.dataset.id) return undefined;

	const first = group.querySelector<HTMLElement>(`[data-kind="bookmark"]:not([data-id="${drag.id}"])`);
	return { parent: group.dataset.id, beforeId: first?.dataset.id ?? null };
}

function resolveGroupTarget(drag: Dragging, hovered: Element, clientY: number): DropTarget | undefined {
	const column = closestOfKind(hovered, "column")?.dataset.column;
	if (!column) return undefined;

	// 列の空いている場所には、最後に入れる
	const group = closestOfKind(hovered, "group");
	if (!group) return { parent: column, beforeId: null };

	if (group.dataset.id === drag.id) return undefined;
	return { parent: column, beforeId: beforeIdFor(group, drag.id, clientY) };
}

/** ポインタの下にあるものから、ドロップする場所を決める、ドロップできない場所ならundefined */
export function resolveDropTarget(drag: Dragging, e: DragEvent): DropTarget | undefined {
	const hovered = e.target;
	if (!(hovered instanceof Element)) return undefined;

	if (drag.kind === "bookmark") return resolveBookmarkTarget(drag, hovered, e.clientY);
	return resolveGroupTarget(drag, hovered, e.clientY);
}
