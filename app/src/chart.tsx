import { useRef, useEffect, useState } from 'preact/hooks';
import { Toolbar } from './toolbar.js';
import { Renderer, Scene } from '@jeditrader/renderer';
import { Split, SplitItem } from './split.js';
import { Settings } from './settings.js';
import { SceneSelect } from './scene-select.js';
import { dark, getBgColor } from './util.js';
import './chart.css';

export function Chart() {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const canvasUI = useRef<HTMLCanvasElement | null>(null);

	const [renderer, setRenderer] = useState<Renderer | null>(null);
	const [showSettings, setShowSettings] = useState(true);
	const [scene, setScene] = useState<Scene | null>(null);

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
		if (!renderer) return;
		return dark.subscribe(() => {
			renderer.settings.clearColor.value = getBgColor();
			renderer.flags.rerender = true;
		});
	}, [renderer]);

	useEffect(() => {
		if (!renderer || !scene) return;

		renderer.scene = scene;
		canvas.current?.focus();
		renderer.flags.rerender = true;
	}, [renderer, scene]);

	return (
		<div class="canvases">
			<canvas ref={canvas} />
			<canvas ref={canvasUI} tabIndex={0} />
			{!scene && <SceneSelect renderer={renderer} setScene={setScene} />}
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
					{showSettings && <Settings
						renderer={renderer}
						scene={scene}
						style={{ pointerEvents: 'all' }}
					/>}
				</SplitItem>
			</Split>
		</div>
	);
}

