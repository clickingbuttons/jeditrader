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

// We round to previous duration which may be up to 100_000 years
export const maxDate = 8640000000000000 - 100_000 * 365 * 24 * 60 * 60 * 1000;
export const minDate = -maxDate;
