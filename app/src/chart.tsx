import { useRef, useEffect, useState } from 'preact/hooks';
import { Toolbar } from './toolbar.js';
import { Renderer, Chart as RenderChart } from '@jeditrader/renderer';
import { getCookie, setCookie } from './cookies.js';
import { Provider, Clickhouse, Polygon } from '@jeditrader/providers';
import { Split, SplitItem } from './split.js';
import { Settings } from './settings.js';
import { signal } from '@preact/signals';
import { preferDark, getVar } from './helpers.js';
import './chart.css';

const dark = signal(preferDark());
dark.subscribe(dark => {
	if (dark) document.body.classList.replace('light', 'dark');
	else document.body.classList.replace('dark', 'light');
});
function parseColor(input: string) {
	if (input.substr(0,1)=="#") {
		var collen=(input.length-1)/3;
		var fact=[17,1,0.062272][collen-1];
		return {
			r: Math.round(parseInt(input.substr(1,collen),16)*fact),
			g: Math.round(parseInt(input.substr(1+collen,collen),16)*fact),
			b: Math.round(parseInt(input.substr(1+2*collen,collen),16)*fact),
			a: 1.0,
		};
	}
	else {
		const split = input
			.split(",")
			.map(x=> +x);
		return {
			r: split[0],
			g: split[1],
			b: split[2],
			a: 1.0,
		};
	}
}
function normalize(c: GPUColorDict) {
	return {
		r: c.r / 255,
		g: c.g / 255,
		b: c.b / 255,
		a: c.a,
	};
}
const getBgColor = () => normalize(parseColor(getVar('--bg')));

function ProviderSelect({ setProvider }: { setProvider(p: Provider): void }) {
	const providers = {
		'clickhouse': {
			url: 'http://localhost:8123',
		},
		'polygon': {
			apiKey: getCookie('POLY_API_KEY') || '',
		},
	};
	const [providerName, setProviderName] = useState(Object.keys(providers)[0] as keyof typeof providers);
	return (
		<form onSubmit={ev => {
			ev.preventDefault();
			if (providerName === 'polygon') setProvider(new Polygon(providers.polygon.apiKey));
			if (providerName === 'clickhouse') setProvider(new Clickhouse(providers.clickhouse.url));
		}} class="providerForm">
			<table>
				<tr>
					<td><label>Provider</label></td>
					<td>
						<select
							value={providerName}
							onChange={(ev: any) => setProviderName(ev.target.value)}
						>
								{(Object.keys(providers) as (keyof typeof providers)[]).map(p =>
									<option value={p}>{p}</option>
								)}
						</select>
					</td>
				</tr>
				{providerName === 'polygon' &&
					<tr>
						<td><label>API key</label></td>
						<td>
							<input
								value={providers.polygon.apiKey}
								onChange={(ev: any) => {
									providers.polygon.apiKey = ev.target.value;
									setCookie('POLY_API_KEY', ev.target.value);
								}}
							/>
						</td>
					</tr>
				}
				{providerName === 'clickhouse' &&
					<tr>
						<td><label>URL</label></td>
						<td>
							<input
								value={providers.clickhouse.url}
								onChange={(ev: any) => providers.clickhouse.url = ev.target.value}
							/>
						</td>
					</tr>
				}
			</table>
			<input type="submit" />
		</form>
	);
}

export function Chart() {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const canvasUI = useRef<HTMLCanvasElement | null>(null);

	const [provider, setProvider] = useState<Provider | null>(null);
	const [renderer, setRenderer] = useState<Renderer | null>(null);
	const [showSettings, setShowSettings] = useState(true);
	const [chart, setChart] = useState<RenderChart | null>(null);

	useEffect(() => {
		if (!renderer) return;
		return dark.subscribe(() => {
			renderer.settings.clearColor.value = getBgColor();
			renderer.flags.rerender = true;
		});
	}, [renderer]);

	useEffect(() => {
		// if (!provider) return;
		if (canvas.current && canvasUI.current) {
			Renderer.init(canvas.current, canvasUI.current).then(r => {
				if (!r) return;

				// const chart = new RenderChart(r.scene, provider);
				// r.scene.root = chart;
				// setChart(chart);

				r.settings.clearColor.value = getBgColor();
				setRenderer(r);
				r.run();
			});
		} else console.error("useRef couldn't find canvases");
	}, []);

	// if (!provider) return <ProviderSelect setProvider={setProvider} />;

	return (
		<div class="canvases">
			<canvas ref={canvas} />
			<canvas ref={canvasUI} tabIndex={0} />
			<Split style={{ pointerEvents: 'none' }}>
				<SplitItem>
					<Toolbar
						style={{ pointerEvents: 'all' }}
						scene={renderer?.scene}
						showSettings={showSettings}
						setShowSettings={setShowSettings}
						dark={dark}
					/>
				</SplitItem>
				<SplitItem>
					{showSettings &&
						<Settings
							renderer={renderer}
							style={{ pointerEvents: 'all' }}
						/>
					}
				</SplitItem>
			</Split>
		</div>
	);
}

