import { restClient } from '@polygon.io/client-js';
import { useRef, useEffect, useState, useMemo } from 'preact/hooks';
import { Toolbar, Timespan } from './toolbar';
import { fetchAggs, Aggregate, toymd } from './helpers';
import { Renderer } from './renderer/renderer';
import './chart.css';

export function Chart({ path, apiKey }: { path: string, apiKey: string }) {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const renderer = useMemo(() => new Renderer(), []);

	// data
	const client = useMemo(() => restClient(apiKey), [apiKey]);

	// data picker
	const [ticker, setTicker] = useState('AAPL');
	const [multiplier, setMultiplier] = useState(1);
	const [timespan, setTimespan] = useState<Timespan>('day');
	const [date, setDate] = useState(toymd(new Date()));
	const [timezone, setTimezone] = useState('America/New_York');

	function setStatus(text: string, color: string = 'white') {
		console.log('status', text)
	}
	if (Number.isNaN(multiplier)) setStatus(`Invalid multiplier ${multiplier}`);

	// Update data based on picker
	useEffect(() => {
		let isLoading = true;
		if (!ticker) setStatus('No ticker');

		renderer.setAggs([]);
		setStatus(`Loading ${ticker}...`);
		fetchAggs(client, ticker, multiplier, timespan, date)
			.then(candles => {
				if (!isLoading) return;
				if (candles.length > 0) {
					setStatus(`Loaded ${candles.length} ${ticker} aggs`);
					renderer.setAggs(candles);
				} else {
					setStatus(`No data for ${ticker}`);
				}
			});

		return () => isLoading = false;
	}, [ticker, multiplier, timespan, date]);

	useEffect(() => {
		if (canvas.current) renderer.render(canvas.current).catch(setStatus);
		else setStatus("useRef can't get canvas");
	}, []);

	return (
		<>
			<Toolbar
				ticker={ticker}
				setTicker={setTicker}
				multiplier={multiplier}
				setMultipler={setMultiplier}
				timespan={timespan}
				setTimespan={setTimespan}
				date={date}
				setDate={setDate}
				client={client}
				timezone={timezone}
				setTimezone={setTimezone}
			/>
			<canvas class="canvas" ref={canvas} />
		</>
	);
}

