import { useRef, useEffect, useState } from 'preact/hooks';
import { Toolbar } from './toolbar.js';
import { Renderer } from '@jeditrader/renderer';
import { Split, SplitItem } from './split.js';
import { Settings } from './settings.js';
import { dark } from './util.js';
import './chart.css';

export function Chart() {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const canvasUI = useRef<HTMLCanvasElement | null>(null);

	const [renderer, setRenderer] = useState<Renderer | null>(null);
	const [showSettings, setShowSettings] = useState(true);

	useEffect(() => {
		if (!canvas.current || !canvasUI.current)
			return console.error("useRef couldn't find canvases");
		Renderer.init(canvas.current, canvasUI.current).then(r => {
			if (!r) return;
			setRenderer(r);
			r.run();

			dark.subscribe(() => r.flags.rerender = true);
		});
	}, []);

	return (
		<div class="canvases">
			<canvas ref={canvas} />
			<canvas ref={canvasUI} tabIndex={0} />
			{/*!scene && <SceneSelect renderer={renderer} setScene={setScene} />*/}
			<Split style={{ pointerEvents: 'none' }}>
				<SplitItem>
					<Toolbar
						style={{ pointerEvents: 'all' }}
						renderer={renderer}
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

