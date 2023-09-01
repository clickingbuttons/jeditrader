import { useState, useEffect } from 'preact/hooks';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode } from './icons/index.js';
import { Renderer } from '@jeditrader/renderer';
import './toolbar.css';

export function Toolbar({
	ticker,
	setTicker,
	renderer,
}: {
	ticker: string,
	setTicker(ticker: string): void,
	renderer: Renderer | null,
}) {
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
				<button title={`Activate ${dark ? 'light' : 'dark'} mode`} onClick={() => setDark(!dark)}>
					{dark ? <LightMode /> : <DarkMode />}
				</button>
				<button title="Toggle wireframe" onClick={() => renderer?.toggleWireframe()}>
					W
				</button>
				<button title="Lock LOD" onClick={() => renderer?.toggleLodLock()}>
					L
				</button>
			</div>
		</div>
	);
}
