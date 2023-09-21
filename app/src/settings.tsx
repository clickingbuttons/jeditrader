import { h, JSX } from 'preact';
import { Renderer } from '@jeditrader/renderer';
import { Vec3 } from '@jeditrader/linalg';
import { Signal, signal as newSignal } from '@preact/signals';
import './settings.css';

function InputVec3({ value, onChange }: { value: Vec3, onChange: (v: Vec3) => void }) {
	return (
		<>
			{(['x', 'y', 'z'] as ('x' | 'y' | 'z')[]).map(v =>
				<span>
					<input
						class="vec3"
						value={value[v].toExponential(2).replace('e+', 'e').replace('e0', '')}
						onChange={ev => {
							const newVal = new Vec3(value);
							newVal[v] = +ev.currentTarget.value;
							onChange(newVal);
						}}
					/>
				</span>
			)}
		</>
	);
}

function rgbaNormToHex(r: number, g: number, b: number, a: number) {
  return '#'
		+ Math.round(r * 255 * a).toString(16).padStart(2, '0')
		+ Math.round(g * 255 * a).toString(16).padStart(2, '0')
		+ Math.round(b * 255 * a).toString(16).padStart(2, '0');
}

function gpuColorToHex(c: GPUColorDict) {
	return rgbaNormToHex(c.r, c.g, c.b, c.a);
}

function hexToRGBNorm(hex: string) {
	var r = parseInt(hex.slice(1, 3), 16) / 255,
			g = parseInt(hex.slice(3, 5), 16) / 255,
			b = parseInt(hex.slice(5, 7), 16) / 255;

	return { r, g, b, a: 1.0 };
}

const colorDiv = document.createElement('div');
document.body.appendChild(colorDiv);

function getColor(obj: any) {
	switch (typeof obj) {
	case 'string':
		colorDiv.style.color = obj;
		const m = getComputedStyle(colorDiv).color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
		if (m) return rgbaNormToHex(+m[1], +m[2], +m[3], 1);
		return;
	case 'object':
		if (['r', 'g', 'b', 'a'].every(v => v in obj)) return gpuColorToHex(obj as GPUColorDict);
		return;
	}
}

function SettingInput({ signal }: { signal: Signal<any> }) {
	const color = getColor(signal.value);
	if (color) return (
		<input
			type="color"
			value={color}
			onChange={ev => signal.value = hexToRGBNorm(ev.currentTarget.value)}
		/>
	);
	const num = +signal.value;
	if (!isNaN(num)) return (
		<input
			type="number"
			value={num}
			onChange={ev => signal.value = +ev.currentTarget.value}
		/>
	);
	if (signal.value instanceof Vec3) return (
		<InputVec3 value={signal.value} onChange={v => signal.value = v} />
	);
	if (typeof signal.value === 'string') return (
		<input
			value={signal.value}
			onChange={ev => signal.value = ev.currentTarget.value}
		/>
	);
	if (Array.isArray(signal.value)) return (
		<div class="inputlist">
			{signal.value.map((v, i) => {
				const newSig = newSignal(v);
				newSig.subscribe(v2 => {
					if (v2 === v) return;
					signal.value[i] = v2;
					signal.value = [...signal.value];
				});
				return (
					<span>
						<SettingInput signal={newSig} />
						<button onClick={() => {
							signal.value.splice(i, 1);
							signal.value = [...signal.value];
						}}>
							x
						</button>
					</span>
				);
			})}
		</div>
	);

	return <span>Unknown type {JSON.stringify(signal.value)}</span>;
}

function Setting({ label, signal }: {label: string, signal: Signal<any>}) {
	return (
		<tr>
			<td><label>{label}</label></td>
			<td class="settinginput"><SettingInput signal={signal} /></td>
		</tr>
	);
}

// { a: sig }
// { a: { b: { c: sig } } }
const signalId = Symbol.for('preact-signals');
function getSettings(o: object, startLevel: number) {
	const res: JSX.Element[] = [];

	function visit(o: object, level: number) {
		Object.entries(o).forEach(([key, val]) => {
			if (val.brand === signalId) {
				res.push(<Setting label={key} signal={val} />);
			} else {
				res.push(<tr>{h('h' + level, { children: key })}</tr>);
				visit(val, level + 1);
			}
		});
	}

	visit(o, startLevel);

	return res;
}

interface SettingsProps extends JSX.HTMLAttributes<HTMLTableElement> {
	renderer: Renderer | null;
}

export function Settings({ renderer, style }: SettingsProps) {
	if (!renderer) return null;

	return (
		<table class="settings" style={style}>
			<tr><h2>Renderer</h2></tr>
			{getSettings(renderer.settings, 3)}
			<tr><h2>Scene</h2></tr>
			{getSettings(renderer.scene.settings, 3)}
		</table>
	);
}
