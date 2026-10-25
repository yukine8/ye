/**
 * ブックマークの名前の先頭に付けるIDの処理
 * ブラウザのブックマークIDは端末ごとに変わるので、別の端末で移動・編集されても同じものだと分かるように、
 * 同期される名前の中にIDを持たせる。名前は「<ID>_<表示名>」(例: 3fa85f64_pixiv)
 */

/** IDは8文字の16進数 */
const TITLE_PATTERN = /^([0-9a-f]{8})_(.*)$/s;

/** タイトルを、IDと表示名に分ける、IDの形式でなければIDは空文字で、タイトル全体が表示名になる */
export function parseTitle(title: string): { id: string; name: string } {
	const match = TITLE_PATTERN.exec(title);
	if (!match) return { id: "", name: title };
	return { id: match[1] ?? "", name: match[2] ?? "" };
}

export function formatTitle(id: string, name: string): string {
	return `${id}_${name}`;
}

/** 使われていないIDを作る */
export function generateId(taken: ReadonlySet<string>): string {
	let id = crypto.randomUUID().slice(0, 8);
	while (taken.has(id)) {
		id = crypto.randomUUID().slice(0, 8);
	}
	return id;
}

/** 呼ぶたびに、重複しない新しいIDを返す関数を作る */
export function createIdMaker(): () => string {
	const taken = new Set<string>();
	return () => {
		const id = generateId(taken);
		taken.add(id);
		return id;
	};
}

/**
 * IDを付け直す必要のあるブックマークと、直した後のタイトルを返す
 * - IDがないものには、新しいIDを付ける
 * - 同じIDが複数あれば、先に並んでいるものだけがIDを保ち、残りは新しいIDにする
 *   (ブックマークマネージャでコピーしたり、別々の端末で追加したりすると起こる)
 */
export function planIdFixes(nodes: readonly { nodeId: string; title: string }[]): { nodeId: string; title: string }[] {
	const parsed = nodes.map(({ nodeId, title }) => ({ nodeId, ...parseTitle(title) }));
	const taken = new Set(parsed.map(({ id }) => id));
	const kept = new Set<string>();
	const fixes: { nodeId: string; title: string }[] = [];

	for (const { nodeId, id, name } of parsed) {
		if (id && !kept.has(id)) {
			kept.add(id);
			continue;
		}
		const newId = generateId(taken);
		taken.add(newId);
		fixes.push({ nodeId, title: formatTitle(newId, name) });
	}
	return fixes;
}
