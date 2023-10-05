import { Input } from '../input.js';

export interface Controller {
	update(dt: DOMHighResTimeStamp, input: Input): void;
}
