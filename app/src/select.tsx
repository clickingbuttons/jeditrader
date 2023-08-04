import { JSX } from 'preact';
import { useState, useEffect, useRef, useCallback, StateUpdater } from 'preact/hooks';
import './select.css';

export type SymbolPickerProps = {
	value: any;
	onChange: (value: any, ev: any) => void;
	disabled?: boolean;
};

export function SymbolPicker({
	value,
	onChange: userOnChange,
	disabled = false,
}: SymbolPickerProps) {
	const [innerValue, setInnerValue] = useState(value);
	const [items, setItems] = useState([]);
	const [isOpen, setIsOpen] = useState(false);
	const div = useRef<HTMLDivElement | null>(null);

	useEffect(() => setInnerValue(value), [value]);

	// function fetchItems(value: string, setItems: StateUpdater<any>) {
	// 	rest.reference.tickers({ search: value, limit: 100 })
	// 		.then(res => res.results)
	// 		.then(res => setItems(res));
	// }
	// const debouncedFetchItems = useCallback(debounce(fetchItems, 200), []);
	// useEffect(() => isOpen && debouncedFetchItems(innerValue, setItems), [innerValue, isOpen]);

	function onClick(v: any, ev: any) {
		userOnChange(v, ev);
		setInnerValue(v);
		setIsOpen(false);
	}

	return (
		<div ref={div} class="select">
			<input
				value={innerValue}
				onInput={ev => setInnerValue((ev.target as HTMLInputElement).value.toUpperCase())}
				onFocus={() => setIsOpen(true)}
				onBlur={ev => {
					if (div.current && !div.current.contains(ev.relatedTarget as Node)) {
						setIsOpen(false);
					}
				}}
				onKeyPress={ev => {
					if (ev.which === 13) {
						onClick(innerValue, ev);
					}
				}}
				disabled={disabled}
			/>
			{/*isOpen && (
				<div class="select-items">
					{items.map(item => (
						<button class="select-item" onClick={ev => onClick(item.ticker, ev)} onBlur={onBlur}>
							{item.ticker} {item.name}
						</button>
					))}
				</div>
			)*/}
		</div>
	);
}
