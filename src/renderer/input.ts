const defaultButtons = {
	left: false,
	right: false,
	up: false,
	down: false,
	space: false,
	shift: false,

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
	focused = false;
	buttons = defaultButtons;

	posX = -1;
	posY = -1;
	lastPosX = -1;
	lastPosY = -1;

	constructor(canvas: HTMLCanvasElement) {
		document.addEventListener('keydown', this.keydown.bind(this));
		document.addEventListener('keyup', this.keyup.bind(this));
		canvas.addEventListener('mousemove', this.mousemove.bind(this));
		canvas.addEventListener('mousedown', this.mousedown.bind(this));
		canvas.addEventListener('mouseup', this.mouseup.bind(this));
		canvas.addEventListener('mouseenter', this.mouseenter.bind(this));
		canvas.addEventListener('mouseleave', this.mouseleave.bind(this));
		canvas.addEventListener('contextmenu', e => e.preventDefault());
	}

	handleKey(ev: KeyboardEvent, keydown: boolean) {
		if (!this.focused) return;
		let key = keyMap(ev.key);
		if (key) this.buttons[key] = keydown;
		this.buttons.shift = ev.shiftKey;
	}

	keydown(ev: KeyboardEvent) { this.handleKey(ev, true); }
	keyup(ev: KeyboardEvent) { this.handleKey(ev, false); }

	mousemove(ev: MouseEvent) {
		this.posX = ev.clientX;
		this.posY = ev.clientY;
	}

	update() {
		this.lastPosX = this.posX;
		this.lastPosY = this.posY;
	}

	mousedown(ev: MouseEvent) {
		ev.preventDefault();
		this.buttons[`mouse${ev.button as 0 | 1 | 2}`] = true;
	}

	mouseup(ev: MouseEvent) {
		ev.preventDefault();
		this.buttons[`mouse${ev.button as 0 | 1 | 2}`] = false;
	}

	mouseenter(_ev: MouseEvent) {
		this.focused = true;
	}

	mouseleave(_ev: MouseEvent) {
		this.focused = false;
		this.buttons = { ...defaultButtons };
	}
};
