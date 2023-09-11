import { useRef, useEffect, useState } from 'preact/hooks';
import { Toolbar } from './toolbar.js';
import { Renderer } from '@jeditrader/renderer';
import { getCookie, setCookie } from './cookies.js';
import { Provider, Clickhouse, Polygon } from '@jeditrader/providers';
import './chart.css';

export function Chart() {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const canvasUI = useRef<HTMLCanvasElement | null>(null);
	const [renderer, setRenderer] = useState<Renderer | null>(null);
	const [ticker, setTicker] = useState('F');

	const providers = {
		'polygon': {
			apiKey: getCookie('POLY_API_KEY') || '',
		},
		'clickhouse': {
			url: 'http://localhost:8123',
		}
	};
	const [providerName, setProviderName] = useState<keyof typeof providers>('polygon');
	const [provider, setProvider] = useState<Provider | null>(null);

	useEffect(() => {
		if (provider) {
			if (canvas.current && canvasUI.current) {
				Renderer.init(canvas.current, canvasUI.current, provider, ticker).then(r => {
					setRenderer(r);
					r.render();
				});
			} else console.error("useRef couldn't find canvases");
		}
	}, [provider]);

	useEffect(() => renderer?.setTicker(ticker), [ticker]);

	if (!provider) {
		return (
			<form onSubmit={ev => {
				ev.preventDefault();
				if (providerName === 'polygon') setProvider(new Polygon(providers.polygon.apiKey));
				if (providerName === 'clickhouse') setProvider(new Clickhouse(providers.clickhouse.url));
			}} class="providerForm">
				Provider
				<select onChange={(ev: any) => setProviderName(ev.target.value)}>
					{(Object.keys(providers) as (keyof typeof providers)[]).map(p =>
						<option value={p}>{p}</option>
					)}
				</select>
				{providerName === 'polygon' &&
					<div>
						<label>API key</label>
						<input
							value={providers.polygon.apiKey}
							onChange={(ev: any) => {
								providers.polygon.apiKey = ev.target.value;
								setCookie('POLY_API_KEY', ev.target.value);
							}}
						/>
					</div>
				}
				{providerName === 'clickhouse' &&
					<div>
						<label>URL</label>
						<input
							value={providers.clickhouse.url}
							onChange={(ev: any) => providers.clickhouse.url = ev.target.value}
						/>
					</div>
				}
				<input type="submit" />
			</form>
		);
	}

	let x = 0;

	return (
		<>
			<Toolbar
				ticker={ticker}
				setTicker={setTicker}
				renderer={renderer}
			/>
			{/*<div class="canvases" onMouseMove={ev => {
				if (ev.ctrlKey) {
					x += ev.movementX;
					console.log(x, ev.movementX)
				}
			}}>
				x
			</div>*/}
			<div class="canvases">
				<canvas ref={canvas} />
				<canvas ref={canvasUI} />
			</div>
		</>
	);
}

