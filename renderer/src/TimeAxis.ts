import type { Renderer } from './renderer.js';
import { Duration, DurationUnit, ms_to_nanos } from '@jeditrader/providers';
import { Signal} from '@preact/signals';
import { format as formatTime } from 'date-fns';
import { lods } from './lods.js';
import { TimeRange } from './TimeRange.js';

import { Axis, Side } from './axis.js';

export class TimeAxis extends Axis {
	declare range: Signal<TimeRange>;
	declare step: Signal<Duration>;
	declare ticks: Signal<bigint[] | BigInt64Array>;

	crosshairDuration: Signal<Duration> | undefined;

	constructor(
		renderer: Renderer,
		range: TimeRange,
		side: Side,
	) {
		super(renderer, range, side);
	}

	percentUsage(duration: Duration) {
		const px = this.getPx();
		const range = this.range.value as TimeRange;
		const nTicks = (range.end - range.start) / duration.ns();
		if (nTicks == 0n) return 0;
		const pxPer = BigInt(px) / nTicks;
		return this.minPxBetweenTicks / Number(pxPer);
	}

	getStep(): Duration {
		const start = this.range.value.start;
		const end = this.range.value.end;
		const duration = Duration.fromInterval(start, end);
		const duration_ms = duration.ms();

		let lodIndex = Math.max(lods.findIndex(l => duration_ms >= l.ms), 0);
		while (this.percentUsage(lods[lodIndex].step) > 1 && lodIndex > 0) lodIndex--;
		const step = lods[lodIndex].step;
		return step;
	}

	timeLabelFormat(duration: DurationUnit, isFirst: boolean) {
		switch (duration) {
			case 'year': {
				const bc = BigInt(new Date(-1, 0).getTime()) * ms_to_nanos;
				if (this.range.value.start < bc) return 'yyyy GG';
				return 'yyyy';
			}
			case 'month': return 'yyyy-MM';
			case 'week':
			case 'day': return 'yyyy-MM-dd';
			case 'hour':
			case 'minute': return isFirst ? 'yyyy-MM-dd' : 'HH:mm';
			case 'second': return isFirst ? 'yyyy-MM-dd HH:mm' : ':ss';
			case 'millisecond': return isFirst ? 'yyyy-MM-dd HH:mm:ss' : '.SSS';
			case 'microsecond': return isFirst ? 'yyyy-MM-dd HH:mm:ss.SSS' : 'microseconds';
			case 'nanosecond': return isFirst ? 'yyyy-MM-dd HH:mm:ss.SSS' : 'nanoseconds';
		}
	}

	label(n: bigint, isFirst: boolean, isCrosshair: boolean): string {
		const duration = (isCrosshair && this.crosshairDuration?.value) || this.step.value;
		const format = this.timeLabelFormat(duration.unit, isFirst);

		if (format === 'microseconds' || format === 'nanoseconds') return (n % ms_to_nanos).toString();
		return formatTime(Number(n / ms_to_nanos), format);
	}
}
