import { JSX } from 'preact';
import { StateUpdater } from 'preact/hooks';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode, ThreeLines, Box, ArrowUp } from './icons/index.js';
import { Renderer, TickerScene } from '@jeditrader/renderer';
import { Signal } from '@preact/signals';
import './toolbar.css';

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
	const agg = chart?.crosshair.value;

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

			{agg &&
				<div>
					{new Date(agg.time).toISOString()}{' '}
					O: {agg.open}{' '}
					H: {agg.high}{' '}
					L: {agg.low}{' '}
					C: {agg.close}{' '}
					V: {agg.volume}{' '}
					LQ: {agg.volume * agg.vwap}
				</div>
			}

			{chart &&
				<div>
					{chart.duration.value.toString()}
				</div>
			}

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
