import { useRef, useEffect, useState } from 'preact/hooks';
import { Toolbar } from './toolbar.js';
import { Renderer } from '@jeditrader/renderer';
import { getCookie, setCookie } from './cookies.js';
import { Provider, Clickhouse, Polygon } from '@jeditrader/providers';
import './chart.css';

function ProviderSelect({ setProvider }: { setProvider(p: Provider): void }) {
	const providers = {
		'polygon': {
			apiKey: getCookie('POLY_API_KEY') || '',
		},
		'clickhouse': {
			url: 'http://localhost:8123',
		}
	};
	const [providerName, setProviderName] = useState<keyof typeof providers>('polygon');
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

export function Chart() {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const canvasUI = useRef<HTMLCanvasElement | null>(null);

	const [provider, setProvider] = useState<Provider | null>(null);
	const [renderer, setRenderer] = useState<Renderer | null>(null);

	useEffect(() => {
		if (provider) {
			if (canvas.current && canvasUI.current) {
				Renderer.init(canvas.current, canvasUI.current, provider).then(r => {
					setRenderer(r);
					r.render();
				});
			} else console.error("useRef couldn't find canvases");
		}
	}, [provider]);

	if (!provider) return <ProviderSelect setProvider={setProvider} />

	return (
		<>
			<Toolbar renderer={renderer} />
			<div class="canvases">
				<canvas ref={canvas} />
				<canvas ref={canvasUI} />
			</div>
		</>
	);
}

