import { JSX } from 'preact';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode, Settings, Debug } from './icons/index.js';
import { Renderer, lods, Lod } from '@jeditrader/renderer';
import { Signal } from '@preact/signals';
import './toolbar.css';

function LodSelect({ renderer }: { renderer: Renderer | null }) {
	const chart = renderer?.chart;
	return (
		<select
			value={chart?.getLod()}
			disabled={!chart}
			onChange={ev => {
				if (!chart) return;
				chart.setLod(ev.currentTarget.value as Lod);
			}}
		>
			{lods.map(l =>
				<option value={l}>
					{l === 'auto' ? `auto (${chart ? chart.autoLod.value : 'loading'})` : l}
				</option>
			)}
		</select>
	);
}

interface ToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
	renderer: Renderer | null;
	showSettings: boolean;
	setShowSettings: (b: boolean) => void;
	dark: Signal<boolean>;
}

export function Toolbar({ renderer, showSettings, setShowSettings, dark, style }: ToolbarProps) {
	return (
		<div class="toolbar" style={style}>
			<SymbolPicker
				value={renderer?.chart.tickers[0].ticker}
				onChange={newTicker => renderer && (renderer.chart.tickers[0].ticker.value = newTicker)}
				disabled={!renderer}
			/>

			<div class="toolbar-spacer" />

			<LodSelect renderer={renderer} />

			<div class="toolbar-buttons" >
				<button
					title="Toggle wireframe"
					onClick={() => renderer?.toggleWireframe()}
					disabled={!renderer}
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
