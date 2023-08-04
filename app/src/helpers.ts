export function toymd(date: Date) {
	return date.toISOString().substring(0, 10);
}

export function preferDark(): boolean {
	return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getVar(cssVar: string): string {
	return getComputedStyle(document.body).getPropertyValue(cssVar);
}

export function debounce(fn: Function, ms = 100) {
	let timeoutId: ReturnType<typeof setTimeout>;
	return function (this: any, ...args: any[]) {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn.apply(this, args), ms);
	};
};
