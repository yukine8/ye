import { For } from "solid-js";
import { isOneOf } from "@/utils/common";
import { type Colors, getThemeColors, LINK_TARGETS, type Options, THEMES } from "@/utils/preferences";

const COLOR_FIELDS: readonly (keyof Colors)[] = ["base", "accent", "hover", "iconBase"];

const LINK_TARGET_LABELS = {
	_self: "同じページで開く",
	_blank: "新しいページで開く",
} as const satisfies Record<(typeof LINK_TARGETS)[number], string>;

/** 設定項目、変更するとonChangeに新しい設定を渡す */
export function SettingsPanel(props: { options: Options; onChange: (options: Options) => void }) {
	const update = (patch: Partial<Options>): void => props.onChange({ ...props.options, ...patch });

	return (
		<div class="settings">
			<fieldset class="group">
				<legend class="group-label">見た目</legend>

				<div class="item">
					<label for="theme">テーマ:</label>
					<select
						id="theme"
						value={props.options.theme}
						onChange={(e) => {
							const theme = e.currentTarget.value;
							if (!isOneOf(THEMES, theme)) return;

							// プリセットのテーマなら、そのテーマの色にそろえる、customなら今の色のまま
							const colors = getThemeColors(theme) ?? props.options.colors;
							update({ theme, colors });
						}}
					>
						<For each={THEMES}>{(theme) => <option value={theme}>{theme}</option>}</For>
					</select>
				</div>

				<div hidden={props.options.theme !== "custom"}>
					<For each={COLOR_FIELDS}>
						{(key) => (
							<div class="item">
								<label for={key}>{key}:</label>
								<input
									type="text"
									id={key}
									value={props.options.colors[key]}
									onChange={(e) => {
										const color = e.currentTarget.value.trim();
										// 色として使えない文字列は、受け付けずに元の値に戻す
										if (!CSS.supports("color", color)) {
											e.currentTarget.value = props.options.colors[key];
											return;
										}
										update({ colors: { ...props.options.colors, [key]: color } });
									}}
								/>
							</div>
						)}
					</For>
				</div>
			</fieldset>

			<fieldset class="group">
				<legend class="group-label">動作</legend>

				<div class="item">
					<label for="link-target">リンクの開き方:</label>
					<select
						id="link-target"
						value={props.options.linkTarget}
						onChange={(e) => {
							const linkTarget = e.currentTarget.value;
							if (isOneOf(LINK_TARGETS, linkTarget)) update({ linkTarget });
						}}
					>
						<For each={LINK_TARGETS}>{(target) => <option value={target}>{LINK_TARGET_LABELS[target]}</option>}</For>
					</select>
				</div>

				<div class="item">
					<label for="show-open-all">グループタイトルを押して全て開く:</label>
					<input
						type="checkbox"
						id="show-open-all"
						checked={props.options.showOpenAll}
						onChange={(e) => update({ showOpenAll: e.currentTarget.checked })}
					/>
				</div>
			</fieldset>
		</div>
	);
}
