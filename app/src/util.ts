import { signal } from '@preact/signals';
import { Color } from '@jeditrader/renderer';

export function toymd(date: Date) {
	return date.toISOString().substring(0, 10);
}

export function getVar(cssVar: string): string {
	return getComputedStyle(document.body).getPropertyValue(cssVar).replace('\n', ' ');
}

function preferDark(): boolean {
	return window?.matchMedia("(prefers-color-scheme: dark)").matches;
}
export const dark = signal(preferDark());

export function getBgColor(): Color {
	return Color.parse(getVar('--bg'));
}
