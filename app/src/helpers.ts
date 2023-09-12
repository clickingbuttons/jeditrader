export function toymd(date: Date) {
	return date.toISOString().substring(0, 10);
}

export function preferDark(): boolean {
	return window?.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getVar(cssVar: string): string {
	return getComputedStyle(document.body).getPropertyValue(cssVar);
}
