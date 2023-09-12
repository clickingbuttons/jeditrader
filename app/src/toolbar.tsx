import { signal } from '@preact/signals';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode } from './icons/index.js';
import { Renderer, lods, Lod } from '@jeditrader/renderer';
import { preferDark } from './helpers.js';
import './toolbar.css';

const dark = signal(preferDark());
dark.subscribe(dark => {
	if (dark) document.body.classList.replace('light', 'dark');
	else document.body.classList.replace('dark', 'light');
});

function LodSelect({ renderer }: { renderer: Renderer | null }) {
	if (!renderer) return null;

	const data = renderer.chart.ticker;
	return (
		<select
			value={data.autoLod.value ? 'auto' : data.lod.value}
			onChange={ev => {
				const newLod = ev.currentTarget.value as Lod;
				if (newLod === 'auto') data.autoLod.value = true;
				else {
					data.autoLod.value = false;
					data.lod.value = newLod;
				}
			}}
		>
			{lods.map(l =>
				<option value={l}>{l === 'auto' ? `auto (${data.autoLodPeriod.value})` : l}</option>
			)}
		</select>
	);
}

export function Toolbar({ renderer }: { renderer: Renderer | null }) {
	return (
		<div class="toolbar">
			{renderer &&
				<SymbolPicker
					value={renderer.chart.ticker.ticker}
					onChange={newTicker => renderer.chart.ticker.ticker.value = newTicker}
				/>
			}

			<div class="toolbar-spacer" />

			<LodSelect renderer={renderer} />

			<div class="toolbar-buttons" >
				<button
					title={`Activate ${dark.value ? 'light' : 'dark'} mode`}
					onClick={() => dark.value = !dark.value}
				>
					{dark ? <LightMode /> : <DarkMode />}
				</button>
				<button title="Toggle wireframe" onClick={() => renderer?.toggleWireframe()}>
					Wireframe
				</button>
			</div>
		</div>
	);
}
