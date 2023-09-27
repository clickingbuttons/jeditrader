import { useRef, useEffect, useState } from 'preact/hooks';
import { Toolbar } from './toolbar.js';
import { Renderer, Chart as ChartScene } from '@jeditrader/renderer';
import { Provider } from '@jeditrader/providers';
import { Split, SplitItem } from './split.js';
import { Settings } from './settings.js';
import { ProviderSelect } from './provider-select.js';
import { dark, getBgColor } from './util.js';
import './chart.css';

export function Chart() {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const canvasUI = useRef<HTMLCanvasElement | null>(null);

	const [provider, setProvider] = useState<Provider | null>(null);
	const [renderer, setRenderer] = useState<Renderer | null>(null);
	const [showSettings, setShowSettings] = useState(true);
	const [chart, setChart] = useState<ChartScene | null>(null);

	useEffect(() => {
		if (!renderer) return;
		return dark.subscribe(() => {
			renderer.settings.clearColor.value = getBgColor();
			renderer.flags.rerender = true;
		});
	}, [renderer]);

	useEffect(() => {
		if (!canvas.current || !canvasUI.current)
			return console.error("useRef couldn't find canvases");
		Renderer.init(canvas.current, canvasUI.current).then(r => {
			if (!r) return;
			r.settings.clearColor.value = getBgColor();
			setRenderer(r);
			r.run();
		});
	}, []);

	useEffect(() => {
		if (!provider || !renderer) return;

		const chart = new ChartScene(renderer, provider);
		renderer.scene = chart;
		setChart(chart);
	}, [provider, renderer]);

	return (
		<div class="canvases">
			<canvas ref={canvas} />
			<canvas ref={canvasUI} tabIndex={0} />
			{!provider && <ProviderSelect setProvider={setProvider} canvas={canvasUI.current} />}
			<Split style={{ pointerEvents: 'none' }}>
				<SplitItem>
					<Toolbar
						style={{ pointerEvents: 'all' }}
						renderer={renderer}
						chart={chart}
						showSettings={showSettings}
						setShowSettings={setShowSettings}
						dark={dark}
					/>
				</SplitItem>
				<SplitItem>
					{showSettings && <Settings renderer={renderer} style={{ pointerEvents: 'all' }} />}
				</SplitItem>
			</Split>
		</div>
	);
}

