import { useState, StateUpdater } from 'preact/hooks';
import { Renderer, Chart, Modeler, Scene, Fp64Scene } from '@jeditrader/renderer';
import { ProviderSelect } from './provider-select.js';
import { Provider } from '@jeditrader/providers';
import './scene-select.css';

export interface SceneSelectProps {
	renderer: Renderer | null;
	setScene: StateUpdater<Scene | null>;
};

const scenes = {
	fp64: Fp64Scene,
	chart: Chart,
	modeler: Modeler,
};

export function SceneSelect({ setScene: userSetScene, renderer }: SceneSelectProps) {
	const [scene, setScene] = useState<keyof typeof scenes>('modeler');

	return (
		<div class="sceneForm">
			<select
				value={scene}
				onChange={ev => setScene(ev.currentTarget.value as keyof typeof scenes)}
				class="sceneSelect"
			>
				{Object.keys(scenes).map(k =>
					<option value={k}>{k}</option>
				)}
			</select>
			{scene === 'chart'
				? <ProviderSelect setProvider={provider => {
					if (!renderer) return;
					userSetScene(new Chart(renderer, provider));
				}} />
				: <div><button
					disabled={!renderer}
					onClick={() => {
						if (!renderer) return;
						userSetScene(new scenes[scene](renderer));
					}}>
						Submit
					</button></div>
			}
		</div>
	);
}
