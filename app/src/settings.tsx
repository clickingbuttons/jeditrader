import { h, JSX } from 'preact';
import { Renderer, Color } from '@jeditrader/renderer';
import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
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

interface SettingInputProps {
	signal: Signal<any>;
	options?: string[];
}

function SettingInput({ signal, options }: SettingInputProps) {
	if (signal.value instanceof Color) return (
		<span>
			<input
				type="color"
				value={signal.value.hex()}
				onChange={ev => signal.value = Color.parse(ev.currentTarget.value)}
			/>
			<InputNumber
				value={signal.value[3]}
				onChange={alpha => {
					signal.value[3] = alpha;
					signal.value = signal.value.slice();
				}}
			/>
		</span>
	);
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
	if (typeof signal.value === 'string') {
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

	return (
		<table class="settings" style={style}>
			<tr><h2>Renderer</h2></tr>
			{getSettings(renderer.settings, 3)}
			<tr><h2>Scene</h2></tr>
			{getSettings(renderer.scene.settings, 3)}
		</table>
	);
}
