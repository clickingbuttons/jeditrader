import { Mat4 } from '@jeditrader/linalg';
import { Input } from './input.js';

export class Node {
	model = Mat4.identity();

	nodes: Node[] = [];

	update(dt: DOMHighResTimeStamp, input: Input) {
		this.nodes.forEach(n => n.update(dt, input));
	}

	render(pass: GPURenderPassEncoder): void {
		this.nodes.forEach(c => c.render(pass));
	}

	destroy() {
		this.nodes.forEach(c => c.destroy());
	}

	toggleWireframe() {
		this.nodes.forEach(c => c.toggleWireframe());
	}
}
