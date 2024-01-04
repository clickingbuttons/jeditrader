import { h, JSX } from 'preact';
import { Renderer, Scene } from '@jeditrader/renderer';
import { Signal, signal as newSignal } from '@preact/signals';
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

interface SettingInputProps {
	signal: Signal<any>;
	options?: string[];
}

function SettingInput({ signal, options }: SettingInputProps) {
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
	if (typeof signal.value === 'string') {
		if (signal.value.startsWith('#'))
			return (
				<input
					type="color"
					value={signal.value}
					onChange={ev => signal.value = ev.currentTarget.value}
				/>
			);
		if (options) return (
			<select
				value={signal.value}
				onChange={ev => signal.value = ev.currentTarget.value}
			>
				{options.map(o =>
					<option value={o}>{o}</option>
				)}
			</select>
		);
		return (
			<input
				value={signal.value}
				onChange={ev => signal.value = ev.currentTarget.value}
			/>
		);
	}
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
	const keys = Object.keys(signal.value);
	if (keys.length) return (
		<div>
			{keys.map(k => {
				const newSig = newSignal(signal.value[k]);
				newSig.subscribe(v2 => {
					if (signal.value[k] === v2) return;
					signal.value[k] = v2;
					signal.value = {...signal.value};
				});
				return <Setting label={k} signal={newSig} />
			})}
		</div>
	);

	return <span>Unknown type {JSON.stringify(signal.value)}</span>;
}

interface SettingProps {
	label: string;
	signal: Signal<any>;
	options?: string[];
};

function Setting({ label, signal, options }: SettingProps) {
	return (
		<tr>
			<td><label>{label}</label></td>
			<td class="settinginput">
				<SettingInput
					signal={signal}
					options={options}
				/>
			</td>
		</tr>
	);
}

function getSignal(o: any) {
	if (o?.brand === signalId) return o;
	if (o?.val?.brand === signalId) return o.val;
}

// { a: sig }
// { a: { val: sig, options: ['a', 'b'] } }
// { a: { b: { c: sig } } }
const signalId = Symbol.for('preact-signals');
function getSettings(o: object, startLevel: number) {
	const res: JSX.Element[] = [];

	function visit(o: object, level: number) {
		Object.entries(o).forEach(([key, val]) => {
			const signal = getSignal(val);
			if (signal) {
				res.push(<Setting label={key} signal={signal} options={val.options} />);
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
	const scene = renderer.scene;
	return (
		<table class="settings" style={style}>
			<tr><h2>Renderer</h2></tr>
			{getSettings(renderer.settings, 3)}
			{scene && <>
				<tr><h2>Scene</h2></tr>
				{getSettings(scene.settings, 3)}
			</>}
		</table>
	);
}
