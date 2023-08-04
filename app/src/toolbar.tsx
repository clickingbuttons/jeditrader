import { useState, useEffect } from 'preact/hooks';
import { SymbolPicker } from './select.js';
import { LightMode, DarkMode } from './icons/index.js';
import './toolbar.css';

export function Toolbar({
	ticker,
	setTicker,
}: {
	ticker: string;
	setTicker(ticker: string): void;
}) {
	const [percent, setPercent] = useState(false);
	const [dark, setDark] = useState(document.body.classList.contains('dark'));

	useEffect(() => {
		if (dark) document.body.classList.replace('light', 'dark');
		else document.body.classList.replace('dark', 'light');
	}, [percent, dark]);

	return (
		<div class="toolbar">
			<SymbolPicker
				value={ticker}
				onChange={setTicker}
			/>

			<div class="toolbar-spacer" />

			<div class="toolbar-buttons" >
				<button title="Use % for price" onClick={() => setPercent(!percent)}>
					{percent ? <b>%</b> : '%'}
				</button>
				<button title={`Activate ${dark ? 'light' : 'dark'} mode`} onClick={() => setDark(!dark)}>
					{dark ? <LightMode /> : <DarkMode />}
				</button>
			</div>
		</div>
	);
}
