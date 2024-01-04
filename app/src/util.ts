import { signal } from '@preact/signals';

export function getVar(cssVar: string): string {
	return getComputedStyle(document.body).getPropertyValue(cssVar).replace('\n', ' ');
}

function preferDark(): boolean {
	return window?.matchMedia("(prefers-color-scheme: dark)").matches;
}
export const dark = signal(preferDark());
