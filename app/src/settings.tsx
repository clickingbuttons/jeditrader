import { h, JSX } from 'preact';
import { Renderer } from '@jeditrader/renderer';
import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
import { Signal, signal as newSignal } from '@preact/signals';
import type { RGBA } from './util.js';
import './settings.css';

interface InputNumberProps extends Omit<JSX.HTMLAttributes<HTMLInputElement>, 'onChange'> {
	value: number;
	onChange: (v: number) => void;
}

function InputNumber({ value, onChange, ...props }: InputNumberProps) {
	return (
		<input
			class="vec3"
			value={value.toExponential(2).replace('e+', 'e').replace('e0', '')}
			onChange={ev => onChange(+ev.currentTarget.value)}
			{...props}
		/>
	);
}

interface InputNumbersProps<T> {
	value: T;
	onChange: (v: T) => void;
}

interface Vector<T> extends Float64Array {
	clone(): T;
}

function InputNumbers<T extends Vector<T>>({ value, onChange }: InputNumbersProps<T>) {
	return (
		<>
			{[...value].map((v, i) =>
				<InputNumber
					value={v}
					onChange={n => {
						const newVal = value.clone();
						newVal[i] = n;
						onChange(newVal);
					}}
				/>
			)}
		</>
	);
}

function InputVec3({ value, onChange }: { value: Vec3, onChange: (v: Vec3) => void }) {
	return <InputNumbers value={value} onChange={onChange} />;
}

function InputVec4({ value, onChange }: { value: Vec4, onChange: (v: Vec4) => void }) {
	return <InputNumbers value={value} onChange={onChange} />;
}

function InputMat4({ value, onChange }: { value: Mat4, onChange: (v: Mat4) => void }) {
	return <InputNumbers value={value} onChange={onChange} />;
}

function rgbaNormToHex(r: number, g: number, b: number, a: number): string | undefined {
	if (r > 1 || g > 1 || b > 1 || a < 0 || a > 1) return;
  return '#'
		+ Math.round(r * 255 * a).toString(16).padStart(2, '0')
		+ Math.round(g * 255 * a).toString(16).padStart(2, '0')
		+ Math.round(b * 255 * a).toString(16).padStart(2, '0');
}

function hexToRGBNorm(hex: string): RGBA {
	var r = parseInt(hex.slice(1, 3), 16) / 255,
			g = parseInt(hex.slice(3, 5), 16) / 255,
			b = parseInt(hex.slice(5, 7), 16) / 255;

	return [r, g, b, 1];
}

const colorDiv = document.createElement('div');
document.body.appendChild(colorDiv);

function getColor(obj: any): string | undefined {
	if (Array.isArray(obj)) {
		if (obj.length < 3 || obj.length > 4) return;
		return rgbaNormToHex(obj[0], obj[1], obj[2], obj[3] ?? 1);
	} else if (typeof obj === 'string') {
		colorDiv.style.color = obj;
		const m = getComputedStyle(colorDiv).color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
		if (m) return rgbaNormToHex(+m[1], +m[2], +m[3], 1);
	} else if (typeof obj === 'object') {
		if (['r', 'g', 'b', 'a'].every(v => v in obj))
			return rgbaNormToHex(obj.r, obj.g, obj.b, obj.a);
	}
}

function SettingInput({ signal, isColor }: { signal: Signal<any>, isColor: boolean }) {
	if (isColor) {
		const color = getColor(signal.value);
		if (color) return (
			<input
				type="color"
				value={color}
				onChange={ev => signal.value = hexToRGBNorm(ev.currentTarget.value)}
			/>
		);
	}
	if (typeof signal.value === 'boolean') return (
		<input
			type="checkbox"
			checked={signal.value}
			onChange={ev => signal.value = ev.currentTarget.checked}
		/>
	);
	if (typeof signal.value === 'number') return (
		<InputNumber
			value={+signal.value}
			onChange={n => signal.value = n}
		/>
	);
	if (signal.value instanceof Vec3) return (
		<InputVec3 value={signal.value} onChange={v => signal.value = v} />
	);
	if (signal.value instanceof Vec4) return (
		<InputVec4 value={signal.value} onChange={v => signal.value = v} />
	);
	if (signal.value instanceof Mat4) return (
		<InputMat4 value={signal.value} onChange={v => signal.value = v} />
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
						<SettingInput signal={newSig} isColor={false} />
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
			<td class="settinginput">
				<SettingInput signal={signal} isColor={label.toLowerCase().includes('color')} />
			</td>
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
