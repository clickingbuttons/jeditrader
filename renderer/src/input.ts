const defaultButtons = {
	left: false,
	right: false,
	up: false,
	down: false,
	space: false,
	shift: false,
	ctrl: false,
	alt: false,

	mouse0: false,
	mouse1: false,
	mouse2: false,
};

function keyMap(key: string): keyof Input['buttons'] | undefined {
	if (['w', 'W', 'ArrowUp'].includes(key)) return 'up';
	if (['a', 'A', 'ArrowUp'].includes(key)) return 'left';
	if (['s', 'S', 'ArrowUp'].includes(key)) return 'down';
	if (['d', 'D', 'ArrowUp'].includes(key)) return 'right';
	if (key === ' ') return 'space';
	return undefined;
}

export class Input {
	canvas: HTMLCanvasElement;
	focused = false;
	buttons = { ...defaultButtons };

	posX = -1;
	posY = -1;
	movementX = 0;
	movementY = 0;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		document.addEventListener('keydown', this.keydown.bind(this));
		document.addEventListener('keyup', this.keyup.bind(this));
		canvas.addEventListener('mousemove', this.mousemove.bind(this));
		canvas.addEventListener('mousedown', this.mousedown.bind(this));
		canvas.addEventListener('mouseup', this.mouseup.bind(this));
		canvas.addEventListener('focus', () => this.focused = true);
		canvas.addEventListener('blur', () => this.focused = false);
		canvas.addEventListener('mouseleave', this.mouseleave.bind(this));
		canvas.addEventListener('contextmenu', e => e.preventDefault());
	}

	handleKey(ev: KeyboardEvent, keydown: boolean) {
		if (!this.focused) return;
		ev.preventDefault();
		let key = keyMap(ev.key);
		if (key) this.buttons[key] = keydown;
		this.buttons.shift = ev.shiftKey;
		this.buttons.ctrl = ev.ctrlKey;
		this.buttons.alt = ev.altKey;
	}

	keydown(ev: KeyboardEvent) { this.handleKey(ev, true); }
	keyup(ev: KeyboardEvent) { this.handleKey(ev, false); }

	mousemove(ev: MouseEvent) {
		this.posX = ev.clientX;
		this.posY = ev.clientY;
		this.movementX += ev.movementX;
		this.movementY += ev.movementY;
	}

	update() {
		this.movementX = 0;
		this.movementY = 0;
	}

	mousedown(ev: MouseEvent) {
		this.canvas.focus();
		ev.preventDefault();
		this.buttons[`mouse${ev.button as 0 | 1 | 2}`] = true;
	}

	mouseup(ev: MouseEvent) {
		ev.preventDefault();
		this.buttons[`mouse${ev.button as 0 | 1 | 2}`] = false;
	}

	mouseleave() { this.buttons = { ...defaultButtons }; }
};
