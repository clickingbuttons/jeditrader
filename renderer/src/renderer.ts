import { Scene, TickerScene } from './scenes/index.js';
import { debounce } from './helpers.js';
import { Signal, signal } from '@preact/signals-core';
import { Input } from './input.js';
import { Polygon, Clickhouse } from '@jeditrader/providers';

export interface RendererFlags {
	rerender: boolean;
}

function growCanvas(canvas: HTMLCanvasElement) {
	const { width, height } = canvas.getBoundingClientRect();
	canvas.width = width;
	canvas.height = height;
}

export function drawMessage(canvas: HTMLCanvasElement, msg: string, font = '64px sans') {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.font = font;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.fillText(msg, ctx.canvas.width / 2, ctx.canvas.height / 2);
}

function getContext(canvas: HTMLCanvasElement) {
	const res = canvas.getContext('2d');
	if (res) return res;
	throw new Error('Cannot get 2d context for ' + canvas);
}

function apiKey(name: string) {
	const stored = localStorage.getItem(name);
	if (stored) return stored;
	let key;
	while (!key) key = window.prompt(`Enter ${name} API key`);
	localStorage.setItem(name, key);
	return key;
}

export class Renderer {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	canvasUI: HTMLCanvasElement;
	contextUI: CanvasRenderingContext2D;
	input: Input;

	lastTime = performance.now();
	flags: RendererFlags = {
		rerender: true,
	};

	settings = {};

	width: Signal<number>;
	height: Signal<number>;
	scene: Scene;

	private constructor(canvas: HTMLCanvasElement, canvasUI: HTMLCanvasElement) {
		this.canvas = canvas;
		this.canvasUI = canvasUI;
		this.context = getContext(canvas);
		this.contextUI = getContext(canvasUI);
		this.input = new Input(canvasUI);
		this.width = signal(canvas.width);
		this.height = signal(canvas.height);
		new ResizeObserver(debounce(this.onResize.bind(this))).observe(canvasUI);

		const key = apiKey('Polygon');
		const provider = new Polygon(key);
		// const provider = new Clickhouse('http://localhost:8123');
		this.scene = new TickerScene(this, 'F', provider);
	}

	onResize(ev: any) {
		growCanvas(this.canvas);
		growCanvas(this.canvasUI);

		this.width.value = this.canvas.width;
		this.height.value = this.canvas.height;

		this.flags.rerender = true;
	}

	frame(time: DOMHighResTimeStamp): void {
		const dt = time - this.lastTime;
		this.scene.update(dt, this.input);
		this.input.update();

		if (this.flags.rerender) {
			this.context.clearRect(0, 0, this.width.value, this.height.value);
			this.contextUI.clearRect(0, 0, this.width.value, this.height.value);
			this.scene.render(this.context, this.contextUI);
			this.flags.rerender = false;
		}

		this.lastTime = time;
		requestAnimationFrame(this.frame.bind(this));
	}

	run() {
		requestAnimationFrame(this.frame.bind(this));
	}

	static async init(canvas: HTMLCanvasElement, canvasUI: HTMLCanvasElement) {
		// Init may take a while. Let's show a nice loading screen...
		growCanvas(canvas);
		growCanvas(canvasUI);
		drawMessage(canvasUI, 'initializing renderer...');
		try {
			return new Renderer(canvas, canvasUI);
		} catch (error) {
			drawMessage(canvasUI, '' + error);
			throw error;
		}
	}
};

