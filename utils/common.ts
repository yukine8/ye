/** valueがlistの要素のどれかであるかを判定する */
export function isOneOf<const T extends readonly string[]>(list: T, value: unknown): value is T[number] {
	return list.some((item) => item === value);
}

/** 中身が同じかを判定する(JSONにできるデータだけ) */
export function isSame(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
