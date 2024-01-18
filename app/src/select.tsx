import { Ticker, Provider } from '@jeditrader/providers';
import { useState, useEffect, useRef, useCallback, StateUpdater } from 'preact/hooks';
import { debounce } from '@jeditrader/renderer';
import './select.css';

export type SymbolPickerProps = {
	value: any;
	onChange: (value: any, ev: any) => void;
	disabled?: boolean;
	provider: Provider,
};

export function SymbolPicker({
	value,
	onChange: userOnChange,
	disabled = false,
	provider,
}: SymbolPickerProps) {
	const [innerValue, setInnerValue] = useState(value);
	const [items, setItems] = useState<Ticker[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const div = useRef<HTMLDivElement | null>(null);

	useEffect(() => setInnerValue(value), [value]);

	function fetchItems(value: string, setItems: StateUpdater<any>) {
		provider.tickers(value, 100).then(setItems);
	}
	const debouncedFetchItems = useCallback(debounce(fetchItems, 200), []);
	useEffect(() => {
		if (isOpen) debouncedFetchItems(innerValue, setItems);
	}, [innerValue, isOpen]);

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
					if (ev.key === 'Enter') {
						onClick(innerValue, ev);
					}
				}}
				disabled={disabled}
			/>
			{isOpen && (
				<div class="select-items">
					{items.map(item => (
						<button class="select-item" onClick={ev => onClick(item.ticker, ev)}>
							{item.ticker} - {item.name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
