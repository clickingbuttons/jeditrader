import { clamp, ms_to_nanos } from '@jeditrader/providers';
export { clamp, truncate } from '@jeditrader/providers';

export function toymd(date: Date) {
	return date.toISOString().substring(0, 10);
}

export function debounce(fn: Function, ms = 100) {
	let timeoutId: ReturnType<typeof setTimeout>;
	return function (this: any, ...args: any[]) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), ms);
	};
};

export function getVar(cssVar: string): string {
	return getComputedStyle(document.body).getPropertyValue(cssVar).replace('\n', ' ');
}

// JS allows up to 8640000000000000 but this number aligns with axes.
export const maxDate = BigInt(new Date(200_000, 0).getTime()) * ms_to_nanos;
export const minDate = BigInt(new Date(-200_000, 0).getTime()) * ms_to_nanos;
export function clampDate(d: bigint): bigint {
	return clamp(d, minDate, maxDate);
}

