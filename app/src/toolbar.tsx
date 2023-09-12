import { useState, useEffect } from 'preact/hooks';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode } from './icons/index.js';
import { Renderer, lods, Lod } from '@jeditrader/renderer';
import { Period } from '@jeditrader/providers';
import './toolbar.css';

export function Toolbar({
	ticker,
	setTicker,
	renderer,
	period,
}: {
	ticker: string,
	setTicker(ticker: string): void,
	renderer: Renderer | null,
	period: Period,
}) {
	const [lod, setLod] = useState<Lod>('auto');
	const [dark, setDark] = useState(document.body.classList.contains('dark'));

	useEffect(() => {
		if (dark) document.body.classList.replace('light', 'dark');
		else document.body.classList.replace('dark', 'light');
	}, [dark]);

	return (
		<div class="toolbar">
			<SymbolPicker
				value={ticker}
				onChange={setTicker}
			/>

			<div class="toolbar-spacer" />

			<div class="toolbar-buttons" >
				<select value={lod} onChange={ev => {
					const newLod = ev.currentTarget.value as Lod;
					setLod(newLod);
					renderer?.setLod(newLod);
				}}>
					{lods.map(l =>
						<option value={l}>{l === 'auto' ? `auto (${period})` : l}</option>
					)}
				</select>
				<button title={`Activate ${dark ? 'light' : 'dark'} mode`} onClick={() => setDark(!dark)}>
					{dark ? <LightMode /> : <DarkMode />}
				</button>
				<button title="Toggle wireframe" onClick={() => renderer?.toggleWireframe()}>
					Wireframe
				</button>
			</div>
		</div>
	);
}
