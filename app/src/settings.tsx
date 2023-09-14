import { JSX } from 'preact';
import { Renderer } from '@jeditrader/renderer';
import { Vec3 } from '@jeditrader/linalg';
import './settings.css';

function InputVec3({ value, onChange }: { value: Vec3, onChange: (v: Vec3) => void }) {
	return (
		<>
			{(['x', 'y', 'z'] as ('x' | 'y' | 'z')[]).map(v =>
				<span>
					<input
						style={{ width: '6em' }}
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

interface SettingsProps extends JSX.HTMLAttributes<HTMLTableElement> {
	renderer: Renderer | null;
}

export function Settings({ renderer, style }: SettingsProps) {
	const axes = renderer?.chart.axes;
	const labels = axes?.labels;

	return (
		<table class="settings" style={style}>
			{renderer && <>
				<tr>Renderer</tr>
				<tr>
					<td><label>Clear color</label></td>
					<td>
						<input
							type="color"
							value={gpuColorToHex(renderer.clearColor.value)}
							onChange={ev => {
								renderer.clearColor.value = hexToRGBNorm(ev.currentTarget.value);
								renderer.flags.rerender = true;
							}}
						/>
					</td>
				</tr>
			</>
			}
			{labels && <>
				<tr>Labels</tr>
				<tr>
					<td><label>Font</label></td>
					<td>
						<input
							value={labels.font.value}
							onChange={ev => labels.font.value = ev.currentTarget.value}
						/>
					</td>
				</tr>
				<tr>
					<td><label>Padding</label></td>
					<td>
						<input
							type="number"
							value={labels.paddingPx.value}
							onChange={ev => labels.paddingPx.value = +ev.currentTarget.value}
						/>
					</td>
				</tr>
			</>}
			{axes && <>
				<tr>Axes</tr>
				<tr>
					<td><label>Scale</label></td>
					<td>
						<InputVec3 value={axes.scale.value} onChange={newVal => axes.scale.value = newVal} />
					</td>
				</tr>
			</>}
		</table>
	);
}
