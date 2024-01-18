import { JSX } from 'preact';
import { StateUpdater } from 'preact/hooks';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode, ThreeLines, Box, ArrowUp } from './icons/index.js';
import { Renderer, TickerScene } from '@jeditrader/renderer';
import { Signal } from '@preact/signals';
import './toolbar.css';

/*
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
*/

interface ToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
	renderer: Renderer | null;
	showSettings: boolean;
	setShowSettings: StateUpdater<boolean>;
	dark: Signal<boolean>;
}

export function Toolbar({
	renderer,
	showSettings,
	setShowSettings,
	dark,
	style,
}: ToolbarProps) {
	const scene = renderer?.scene;
	const chart: TickerScene | null = scene instanceof TickerScene ? scene : null;
	return (
		<div class="toolbar" style={style}>
			{chart &&
				<SymbolPicker
					value={chart.ticker}
					provider={chart.provider}
					onChange={newTicker => {
						if (!renderer || !chart) return;
						renderer.scene = new TickerScene(renderer, newTicker, chart.provider);
					}}
					disabled={!renderer}
				/>
			}

			<div class="toolbar-spacer" />

			{/*chart && <LodSelect chart={chart} />*/}

			<div class="toolbar-buttons" >
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
					<ThreeLines />
				</button>
			</div>
		</div>
	);
}
