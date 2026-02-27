/**
 * bookmarks.js
 * ブラウザのAPIからyeのブックマークを
 * 持ってきたり書き換えたりするスクリプト
 * newtabからは描画するために呼ばれる
 * popupから新しいブックマークを登録するために呼ばれる
 */

const SAVE_FOLDER_TITLE = "ye";
const COLUMN_COUNT = 4;

const INITIAL_BOOKMARKS_DATA = {
	0: {
		Video: [
			{ name: "YouTube", url: "https://www.youtube.com/" },
			{ name: "ニコニコ", url: "https://www.nicovideo.jp/" },
		],
		SNS: [
			{ name: "Twitter", url: "https://twitter.com" },
			{ name: "Bluesky", url: "https://bsky.app/" },
		],
	},
	1: {
		News: [
			{ name: "Gigazine", url: "https://gigazine.net/" },
			{ name: "DistroWatch", url: "https://distrowatch.com/" },
		],
		Game: [{ name: "Sparebeat", url: "https://beta.sparebeat.com/" }],
	},
	2: {
		Programming: [
			{ name: "GitHub", url: "https://github.com/" },
			{ name: "AtCoder", url: "https://atcoder.jp/" },
			{ name: "Qiita", url: "https://qiita.com/" },
			{ name: "Zenn", url: "https://zenn.dev/" },
		],
		AI: [
			{ name: "ChatGPT", url: "https://chatgpt.com/" },
			{ name: "Gemini", url: "https://gemini.google.com/app" },
		],
	},
	3: {
		Options: [
			{ name: "ChromeExtensions", url: "https://chromewebstore.google.com/category/extensions" },
			{ name: "FirefoxAddons", url: "https://addons.mozilla.org/ja/firefox/" },
		],
	},
};

/**
 * ブックマークデータを取得する
 * @returns {Promise<Object>} ブックマークデータ
 */
export async function fetchBookmarksData() {
	const parentId = getTargetParentId();
	const saveFolder = await findSaveFolder(parentId, SAVE_FOLDER_TITLE);

	// 他のブックマーク直下にyeフォルダがあれば、それを読み込む
	if (saveFolder) {
		return await cleanLoadBookmarkData(saveFolder.id);
	} else {
		// なければ、yeフォルダを作り初期用ブックマークを保存する
		const bookmarks = await saveInitialBookmarks(parentId, INITIAL_BOOKMARKS_DATA);
		return bookmarks;
	}
}

/**
 * yeフォルダを探す、なければnull
 * @param {string} parentId 親フォルダId
 * @param {string} title フォルダ名
 * @returns {Promise<Object|null} フォルダノード
 */
async function findSaveFolder(parentId, title) {
	try {
		const children = await browser.bookmarks.getChildren(parentId);
		const folder = children.find((node) => node.title === title && (!node.url || node.type === "folder"));
		return folder || null;
	} catch (e) {
		console.error("bookmark search error:", e);
		return null;
	}
}

/**
 * yeフォルダ以下の全ブックマークツリーを一括取得し、整形して返す
 * getSubTree を用いてAPI呼び出し回数を1回に削減し高速化する
 * @param {string} saveFolderId yeフォルダID
 * @returns {Promise<Object>} 整形されたブックマークデータ
 */
async function cleanLoadBookmarkData(saveFolderId) {
	const bookmarks = {};
	try {
		// yeフォルダを含めた全ツリーを一括で取得する
		const [rootTree] = await browser.bookmarks.getSubTree(saveFolderId);
		if (!rootTree || !rootTree.children) return bookmarks;

		// yeフォルダ直下の列フォルダを、上からcolumnCountの数だけ取ってくる
		const columnNodes = rootTree.children.filter((node) => !node.url || node.type === "folder").slice(0, COLUMN_COUNT);

		for (const colNode of columnNodes) {
			const columnTitle = colNode.title;
			// 列フォルダ直下のグループフォルダを全部取ってくる
			const groupNodes = (colNode.children || []).filter((node) => !node.url || node.type === "folder");

			bookmarks[columnTitle] = {};
			for (const groupNode of groupNodes) {
				// グループフォルダ直下のURLとその名前を取り出す
				const bookmarkList = (groupNode.children || [])
					.filter((node) => node.url)
					.map((item) => ({
						name: item.title,
						url: item.url,
					}));

				if (bookmarkList.length > 0) {
					bookmarks[columnTitle][groupNode.title] = bookmarkList;
				}
			}
		}
	} catch (e) {
		console.error("load bookmark error: ", e);
	}

	return bookmarks;
}

/**
 * 初期ブックマークを保存する
 * @param {string} safeFolderId 親フォルダID
 * @param {Object} bookmarksData ブックマークデータ
 */
async function saveInitialBookmarks(saveFolderId, bookmarksData) {
	try {
		const saveFolder = await browser.bookmarks.create({
			parentId: saveFolderId,
			title: SAVE_FOLDER_TITLE,
		});

		for (const columnKey in bookmarksData) {
			const columnData = bookmarksData[columnKey];
			const columnFolder = await browser.bookmarks.create({
				parentId: saveFolder.id,
				title: columnKey,
			});
			for (const groupName in columnData) {
				const groupData = columnData[groupName];
				const groupFolder = await browser.bookmarks.create({
					parentId: columnFolder.id,
					title: groupName,
				});
				const bookmarkPromises = groupData.map((item) =>
					browser.bookmarks.create({
						parentId: groupFolder.id,
						title: item.name,
						url: item.url,
					}),
				);
				await Promise.all(bookmarkPromises);
			}
		}
	} catch (e) {
		console.error("init bookmark write error: ", e);
	}
}

/**
 * ブラウザに応じた親フォルダIDを取得する
 * @returns {string} 親フォルダID
 */
function getTargetParentId() {
	if (browser.runtime.getURL("").startsWith("moz-extension://")) {
		return "unfiled_____"; // firefox
	} else {
		return "2"; // Chrome
	}
}
