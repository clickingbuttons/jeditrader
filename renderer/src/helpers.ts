export { clamp } from '@jeditrader/providers';

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

// Max allowed by JS.
export const maxDate = 8640000000000000;
export const minDate = -maxDate;

// Typescript stupidity: https://github.com/microsoft/TypeScript/issues/27808
export function truncate(a: bigint, b: bigint): bigint;
export function truncate(a: number, b: number): number;
export function truncate<T extends number | bigint>(n: T, step: T): T {
	// @ts-ignore
	return n - (n % step);
}

