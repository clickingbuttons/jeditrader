import type { Renderer } from '../renderer.js';
import { Duration, DurationUnit, ms_to_nanos } from '@jeditrader/providers';
import { Signal} from '@preact/signals';
import { format as formatTime } from 'date-fns';
import { lods } from '../lods.js';
import { TimeRange } from '../range/TimeRange.js';

import { Axis, Side } from './axis.js';

export class TimeAxis extends Axis<bigint, Duration> {
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

	timeLabelFormat(duration: DurationUnit, isCtx: boolean) {
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
			case 'minute': return isCtx ? 'yyyy-MM-dd' : 'HH:mm';
			case 'second': return isCtx ? 'yyyy-MM-dd HH:mm' : ':ss';
			case 'millisecond': return isCtx ? 'yyyy-MM-dd HH:mm:ss' : '.SSS';
			case 'microsecond': return isCtx ? 'yyyy-MM-dd HH:mm:ss.SSS' : 'microseconds';
			case 'nanosecond': return isCtx ? 'yyyy-MM-dd HH:mm:ss.SSS' : 'nanoseconds';
		}
	}

	formatTime(n: bigint, format: string) {
		if (format === 'microseconds' || format === 'nanoseconds') return (n % ms_to_nanos).toString();
		return formatTime(Number(n / ms_to_nanos), format);
	}

	label(n: bigint, isFirst: boolean, isCrosshair: boolean): string {
		if (isCrosshair && this.crosshairDuration) {
			const unit = this.crosshairDuration.value.unit;
			switch (unit) {
				case 'year':
				case 'month':
				case 'week':
				case 'day': return this.formatTime(n, this.timeLabelFormat(unit, true));
				case 'hour':
				case 'minute':
				case 'second':
				case 'millisecond':
				case 'microsecond':
				case 'nanosecond': {
					var res = this.formatTime(n, this.timeLabelFormat(unit, true));
					if (unit == 'hour' || unit == 'minute') res += ' ';
					res += this.formatTime(n, this.timeLabelFormat(unit, false));
					return res;
				}
			}
		}

		const format = this.timeLabelFormat(this.step.value.unit, isFirst);
		return this.formatTime(n, format);
	}
}
