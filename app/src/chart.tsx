import { useRef, useEffect, useState, useMemo } from 'preact/hooks';
import { Toolbar } from './toolbar.js';
import { Renderer } from '@jeditrader/renderer';
import { Clickhouse } from '@jeditrader/providers';
import './chart.css';

export function Chart({ path, apiKey }: { path: string, apiKey: string }) {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const provider = useMemo(() => new Clickhouse(), []);
	const [renderer, setRenderer] = useState<Renderer | null>(null);
	const [ticker, setTicker] = useState('F');

	useEffect(() => {
		if (canvas.current) {
			Renderer.init(canvas.current, provider, ticker).then(r => {
				setRenderer(r);
				r.render();
			});
		} else setStatus("useRef couldn't find a canvas");
	}, []);

	function setStatus(text: string, color: string = 'white') {
		console.log('status', text)
	}

	useEffect(function loadData() {
		if (!ticker) return setStatus('No ticker');
		if (!renderer) return setStatus('No renderer');

		renderer.setTicker(ticker);
	}, [ticker, renderer]);

	return (
		<>
			<Toolbar
				ticker={ticker}
				setTicker={setTicker}
				renderer={renderer}
			/>
			<canvas class="canvas" ref={canvas} />
		</>
	);
}

