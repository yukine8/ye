/**
 * ブックマークのfaviconの画像のURL
 * GoogleのfaviconサービスのURLを<img>に直接指定する。キャッシュはブラウザ(HTTPキャッシュ)に任せる
 */

/**
 * ページのURLから、faviconの画像のURLを作る、URLとして不正だったりホスト名がなければundefined
 * 同じホストなら同じURLになるように、ホスト名だけを使う(https://www.google.com/search -> google.com)
 */
export function faviconUrl(pageUrl: string): string | undefined {
	let hostname: string;
	try {
		hostname = new URL(pageUrl).hostname.replace(/^www\./, "");
	} catch {
		return undefined;
	}
	if (!hostname) return undefined;

	const encodedHost = encodeURIComponent(`https://${hostname}`);
	return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodedHost}&size=32`;
}
