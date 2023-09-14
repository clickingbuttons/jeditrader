import { FunctionComponent, JSX } from 'preact';
import './split.css';

export function Splitter() {
	return (
		<div class="splitter" />
	);
}

export const SplitItem: FunctionComponent = ({ children }) => {
	return (
		<div class="splitItem">
			{children}
		</div>
	);
}

export const Split: FunctionComponent<JSX.HTMLAttributes<HTMLDivElement>> = ({ children, style }) => {
	return (
		<div class="split" style={style}>
			{children}
		</div>
	);
}
