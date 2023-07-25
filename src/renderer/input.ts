export interface Pos {
	x: number;
	y: number;
};
var focused = false;
export var input = {
	// Keyboard
	left: false,
	right: false,
	up: false,
	down: false,
	space: false,
	shift: false,
	undefined: false,

	// Mouse
	pos: { x: -1, y: -1 } as Pos,
	lastPos: { x: -1, y: -1 } as Pos,
	button: {
		0: false,
		1: false,
		2: false,
	},
};
const defaultInput = { ...input };
export type Input = typeof input;

function keyMap(key: string) {
	if (['w', 'W', 'ArrowUp'].includes(key)) return 'up';
	if (['a', 'A', 'ArrowUp'].includes(key)) return 'left';
	if (['s', 'S', 'ArrowUp'].includes(key)) return 'down';
	if (['d', 'D', 'ArrowUp'].includes(key)) return 'right';
	if (key === ' ') return 'space';
	return 'undefined';
}

export function keydown(ev: KeyboardEvent) {
	if (!focused) return;
	let key = keyMap(ev.key);
	if (key !== 'undefined') ev.preventDefault();
	input[key] = true;
	if (ev.shiftKey) input.shift = true;
}

export function keyup(ev: KeyboardEvent) {
	if (!focused) return;
	let key = keyMap(ev.key);
	if (key !== 'undefined') ev.preventDefault();
	input[key] = false;
	input.shift = false;
}

export function mousemove(ev: MouseEvent) {
	if (!focused) return;
	ev.preventDefault();
	input.lastPos = input.pos;
	input.pos = { x: ev.clientX, y: ev.clientY };
}

export function mousedown(ev: MouseEvent) {
	if (!focused) return;
	ev.preventDefault();
	input.button[ev.button] = true;
}

export function mouseup(ev: MouseEvent) {
	if (!focused) return;
	ev.preventDefault();
	input.button[ev.button] = false;
}

export function mouseenter(_ev: MouseEvent) {
	console.log('enter')
	focused = true;
	input = defaultInput;
}

export function mouseleave(_ev: MouseEvent) {
	console.log('leave')
	focused = false;
	input = { ...defaultInput };
}
