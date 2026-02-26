import { getThemeColors, loadOptions, saveOptions } from "../lib/preferences.js";
import { applyTheme } from "../lib/style.js";

// 保存する
(async () => {
	const themeSelect = document.getElementById("theme");
	const customColors = document.getElementById("custom-colors");
	const addHiddenUrlButton = document.getElementById("add-hidden-url");
	const newHiddenUrlInput = document.getElementById("new-hidden-url");
	const hiddenUrlsList = document.getElementById("hidden-urls-list");

	const options = loadOptions();

	// 初期表示
	setOptions(options);
	applyTheme(options.colors);
	if (options.theme === "custom") {
		customColors.style.display = "block";
	} else {
		customColors.style.display = "none";
	}
	if (options.hiddenUrls) {
		options.hiddenUrls.forEach((url) => addHiddenUrlToList(url));
	}

	// イベント監視を開始
	observe();

	function observe() {
		// Add listeners to all inputs to save on change
		document.querySelectorAll("input, select").forEach((element) => {
			if (element.id === "new-hidden-url") return; // 追加ボタンで処理する
			element.addEventListener("change", handleChange);
		});

		addHiddenUrlButton.addEventListener("click", () => {
			const url = newHiddenUrlInput.value.trim();
			if (url) {
				addHiddenUrlToList(url);
				newHiddenUrlInput.value = "";
				handleChange();
			}
		});
	}

	function handleChange() {
		const theme = themeSelect.value;
		if (theme === "custom") {
			customColors.style.display = "block";
		} else {
			customColors.style.display = "none";
			const themeColors = getThemeColors(theme);
			if (themeColors) {
				updateColorInputs(themeColors);
			}
		}

		const optionsToSave = prepareOptionsToSave();
		saveOptions(optionsToSave);
		applyTheme(optionsToSave.colors);
	}

	function updateColorInputs(colors) {
		document.getElementById("base").value = colors.base;
		document.getElementById("accent").value = colors.accent;
		document.getElementById("hover").value = colors.hover;
		document.getElementById("iconBase").value = colors.iconBase;
	}

	/**
	 * 現在の状態のoptionsの値を返す
	 * @return {Object} optionsToSave
	 */
	function prepareOptionsToSave() {
		let optionsToSave = {};
		const theme = themeSelect.value;

		let colorsToSave;
		if (theme === "custom") {
			colorsToSave = {
				base: document.getElementById("base").value,
				accent: document.getElementById("accent").value,
				hover: document.getElementById("hover").value,
				iconBase: document.getElementById("iconBase").value,
			};
		} else {
			colorsToSave = getThemeColors(theme);
		}

		optionsToSave = {
			theme: theme,
			colors: colorsToSave,
			linkTarget: document.getElementById("link-target").value,
			showOpenAll: document.getElementById("show-open-all").checked,
			hiddenUrls: getHiddenUrls(),
		};

		return optionsToSave;
	}

	/**
	 * 設定オブジェクトを受け取り、反映する
	 * @param {Object} options
	 */
	function setOptions(options) {
		themeSelect.value = options.theme;
		document.getElementById("base").value = options.colors.base;
		document.getElementById("accent").value = options.colors.accent;
		document.getElementById("hover").value = options.colors.hover;
		document.getElementById("iconBase").value = options.colors.iconBase;
		document.getElementById("link-target").value = options.linkTarget;
		document.getElementById("show-open-all").checked = options.showOpenAll;
	}

	function addHiddenUrlToList(url) {
		const li = document.createElement("li");
		li.textContent = url;
		const deleteButton = document.createElement("button");
		deleteButton.textContent = "削除";
		deleteButton.addEventListener("click", () => {
			li.remove();
			handleChange();
		});
		li.appendChild(deleteButton);
		hiddenUrlsList.appendChild(li);
	}

	function getHiddenUrls() {
		const urls = [];
		hiddenUrlsList.querySelectorAll("li").forEach((li) => {
			urls.push(li.firstChild.textContent);
		});
		return urls;
	}
})();
