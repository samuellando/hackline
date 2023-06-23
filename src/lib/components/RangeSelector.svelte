<script lang="ts">
	import moment from 'moment';
	import { toDateTimeString } from '$lib/timePrint';

	type option = {
		title: string;
		unit: moment.unitOfTime.StartOf;
		moveBack: number;
		width: number;
	};
	const options: option[] = [
		{ title: 'today', unit: 'day', moveBack: 0, width: 1 },
		{ title: 'yeasterday', unit: 'day', moveBack: 1, width: 1 },
		{ title: 'this week', unit: 'isoWeek', moveBack: 0, width: 1 },
		{ title: 'last week', unit: 'isoWeek', moveBack: 1, width: 1 },
		{ title: 'last 7 days', unit: 'day', moveBack: 0, width: 7 },
		{ title: 'this month', unit: 'month', moveBack: 0, width: 1 },
		{ title: 'last month', unit: 'month', moveBack: 1, width: 1 },
		{ title: 'last 30 days', unit: 'day', moveBack: 0, width: 30 },
		{ title: 'this quarter', unit: 'quarter', moveBack: 0, width: 1 },
		{ title: 'last quater', unit: 'quarter', moveBack: 1, width: 1 },
		{ title: 'last 90 days', unit: 'day', moveBack: 0, width: 90 },
		{ title: 'this year', unit: 'year', moveBack: 0, width: 1 },
		{ title: 'last year', unit: 'year', moveBack: 1, width: 1 }
	];

	function getRange(o: option) {
		let now = moment();

		let start;
		let end;
		if (o.moveBack == 0) {
			end = now;
			start = now
				.clone()
				.startOf(o.unit)
				.subtract(o.width - 1, (o.unit + 's') as moment.unitOfTime.DurationConstructor);
		} else {
			end = now
				.clone()
				.startOf(o.unit)
				.subtract(o.moveBack - 1, (o.unit + 's') as moment.unitOfTime.DurationConstructor);
			start = end
				.clone()
				.subtract(o.width, (o.unit + 's') as moment.unitOfTime.DurationConstructor);
		}
		return [start.valueOf(), end.valueOf()];
	}

	export let rangeStartM = moment().startOf('day').valueOf();
	export let rangeEndM = moment().valueOf();
	export let live = true;

	let dropdown = false;
	let selected = 0;
	$: match =
		rangeStartM == getRange(options[selected])[0] &&
		(rangeEndM == getRange(options[selected])[1] || live);

	$: rangeStart = toDateTimeString(rangeStartM);
	$: rangeEnd = toDateTimeString(rangeEndM);

	function updateRange() {
		rangeStartM = Date.parse(rangeStart);
		rangeEndM = Date.parse(rangeEnd);
		//rangeStartM = Math.max(rangeStartM, logs[0].start);
		rangeStartM = Math.max(rangeStartM);
		rangeEndM = Math.min(rangeEndM, new Date().getTime());
	}
</script>

<div
	on:click={() => {
		[rangeStartM, rangeEndM] = getRange(options[selected]);
	}}
>
	{options[selected].title}
</div>
<button
	on:click={() => {
		dropdown = true;
	}}>V</button
>
{#if match}
	MARTH
{/if}
{#if dropdown}
	<div>
		{#each options as option, i}
			<div
				on:click={() => {
					[rangeStartM, rangeEndM] = getRange(option);
					dropdown = false;
					selected = i;
					live = option.moveBack == 0;
				}}
			>
				{option.title}
			</div>
		{/each}
		<div>
			custom
			<input type="datetime-local" bind:value={rangeStart} on:change={updateRange} />
			<input type="datetime-local" bind:value={rangeEnd} on:change={updateRange} />
		</div>
	</div>
{/if}
