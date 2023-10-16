import { JSX } from 'preact';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode, Settings, Box, ArrowUp } from './icons/index.js';
import { lods, Lod, Chart as ChartScene, Renderer, Scene } from '@jeditrader/renderer';
import { Signal } from '@preact/signals';
import './toolbar.css';

function LodSelect({ chart }: { chart: ChartScene }) {
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

interface ToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
	renderer: Renderer | null;
	scene: Scene | null;
	showSettings: boolean;
	setShowSettings: (b: boolean) => void;
	dark: Signal<boolean>;
}

export function Toolbar({
	renderer,
	scene,
	showSettings,
	setShowSettings,
	dark,
	style
}: ToolbarProps) {
	const chart: ChartScene | null = scene instanceof ChartScene ? scene : null;
	return (
		<div class="toolbar" style={style}>
			{chart && chart.tickers.length > 0 &&
				<SymbolPicker
					value={chart.tickers[0].ticker}
					onChange={newTicker => renderer && (chart.tickers[0].ticker.value = newTicker)}
					disabled={!renderer}
				/>
			}

			<div class="toolbar-spacer" />

			{chart && <LodSelect chart={chart} />}

			{renderer &&
				<span class="toolbar-fps">
					{renderer.dUpdate.value}ms / {renderer.dRender.value}ms
				</span>
			}
			<div class="toolbar-buttons" >
				<button
					title="Toggle normals"
					onClick={() => scene?.toggleNormals()}
					disabled={!scene}
				>
					<ArrowUp />
				</button>
				<button
					title="Toggle wireframe"
					onClick={() => scene?.toggleWireframe()}
					disabled={!scene}
				>
					<Box />
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
