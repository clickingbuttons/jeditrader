import { clamp } from '@jeditrader/providers';
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

// JS allows up to 8640000000000000 but this nice even number aligns with axes.
export const maxDate = new Date(200_000, 0).getTime();;
export const minDate = new Date(-200_000, 0).getTime();
export function clampDate(d: number): number {
	return clamp(d, minDate, maxDate);
}

// Typescript stupidity: https://github.com/microsoft/TypeScript/issues/27808
export function truncate(a: bigint, b: bigint): bigint;
export function truncate(a: number, b: number): number;
export function truncate<T extends number | bigint>(n: T, step: T): T {
	// @ts-ignore
	return n - (n % step);
}

