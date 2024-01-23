// Typescript stupidity: https://github.com/microsoft/TypeScript/issues/27808
export function clamp(n: bigint, min: bigint, max: bigint): bigint;
export function clamp(n: number, min: number, max: number): number;
export function clamp<T extends number | bigint>(n: T, min: T, max: T): T {
	if (n < min) return min;
	else if (n > max) return max;
	return n;
}

// Typescript stupidity: https://github.com/microsoft/TypeScript/issues/27808
export function truncate(a: bigint, b: bigint): bigint;
export function truncate(a: number, b: number): number;
export function truncate<T extends number | bigint>(n: T, step: T): T {
	// @ts-ignore
	return n - (n % step);
}

