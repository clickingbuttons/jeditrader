import { JSX } from 'preact';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode, Settings, Debug } from './icons/index.js';
import { Scene, lods, Lod, Chart as RenderChart } from '@jeditrader/renderer';
import { Signal } from '@preact/signals';
import './toolbar.css';

/*
function LodSelect({ chart }: { chart: RenderChart }) {
	return (
		<select
			value={chart.getLod()}
			onChange={ev => {
				if (!chart) return;
				chart.setLod(ev.currentTarget.value as Lod);
			}}
		>
			{lods.map(l =>
				<option value={l}>
					{l === 'auto' ? `auto (${chart.autoLod.value})` : l}
				</option>
			)}
		</select>
	);
}
*/

interface ToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
	scene: Scene | undefined;
	showSettings: boolean;
	setShowSettings: (b: boolean) => void;
	dark: Signal<boolean>;
}

export function Toolbar({ scene, showSettings, setShowSettings, dark, style }: ToolbarProps) {
	return (
		<div class="toolbar" style={style}>
			{/*chart &&
				<SymbolPicker
					value={chart.tickers[0].ticker}
					onChange={newTicker => renderer && (chart.tickers[0].ticker.value = newTicker)}
					disabled={!renderer}
				/>
			*/}

			<div class="toolbar-spacer" />

			{/*chart && <LodSelect chart={chart} />*/}

			<div class="toolbar-buttons" >
				<button
					title="Toggle wireframe"
					onClick={() => scene?.toggleWireframe()}
					disabled={!scene}
				>
					<Debug />
				</button>
				<button
					title={`Activate ${dark.value ? 'light' : 'dark'} mode`}
					onClick={() => dark.value = !dark.value}
				>
					{dark ? <LightMode /> : <DarkMode />}
				</button>
				<button
					title="Toggle settings drawer"
					onClick={() => setShowSettings(!showSettings)}
				>
					<Settings />
				</button>
			</div>
		</div>
	);
}
