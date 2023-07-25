import { PriceScaleMode, DeepPartial, ChartOptions } from 'lightweight-charts';
import { useState, useEffect } from 'preact/hooks';
import { SymbolPicker } from './select';
import { preferDark, getDarkTheme, getLightTheme } from './helpers';
import { route } from 'preact-router';
import { Refresh, LightMode, DarkMode } from './icons';
import './toolbar.css';

export type Timespan = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
const timezones = [
	// This is actually browser-specific. Yikes!
	'America/New_York',
	'UTC'
];
const timespans: Timespan[] = ['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'];

export function Toolbar({
	ticker,
	setTicker,
	multiplier,
	setMultipler,
	timespan,
	setTimespan,
	date,
	setDate,
	client,
	timezone,
	setTimezone,
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
				rest={client}
			/>
			<input
				class="multiplier"
				min="1"
				onWheel={() => {}}
				type="number"
				value={multiplier}
				onChange={ev => setMultipler(+ev.target.value)}
			/>
			<select value={timespan} onChange={ev => setTimespan(ev.target.value)}>
				{timespans.map(v =>
					<option value={v}>{v}</option>
				)}
			</select>
			<input value={date} onChange={ev => setDate(ev.target.value)} />

			<div class="toolbar-spacer" />

			<div class="toolbar-buttons" >
				<select value={timezone} onChange={ev => setTimezone(ev.target.value)}>
					{timezones.map(v =>
						<option value={v}>{v}</option>
					)}
				</select>
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
