import { defineConfig, type UserManifest } from "wxt";

export default defineConfig({
	modules: ["@wxt-dev/module-solid"],
	manifestVersion: 3,
	manifest: ({ browser }) => {
		const manifest: UserManifest = {
			name: "__MSG_extensionName__",
			description: "__MSG_extensionDescription__",
			version: "1.0",
			permissions: ["bookmarks"],
			icons: {
				"48": "/icons/icon-48.png",
				"128": "/icons/icon-128.png",
			},
			default_locale: "ja",
		};

		// Firefoxのストア(AMO)で必要な設定。Chromeには入れない
		if (browser === "firefox") {
			manifest.browser_specific_settings = {
				gecko: {
					id: "ye@yukine8",
					// data_collection_permissions に対応したバージョンから
					strict_min_version: "140.0",
					// faviconの画像を読むときに、ブックマークのホスト名をGoogle(t2.gstatic.com)に送る
					data_collection_permissions: { required: ["bookmarksInfo"] },
				},
				// Android版は、data_collection_permissions に対応したのが142から
				gecko_android: { strict_min_version: "142.0" },
			};
		}
		return manifest;
	},
});
