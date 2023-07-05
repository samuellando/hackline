<script lang="ts">
	import moment from 'moment';
	import { toDateTimeString } from '$lib/timePrint';

	export let primary: string = 'white';
	export let secondary: string = 'black';

	type option = {
		title: string;
		unit: moment.unitOfTime.StartOf;
		moveBack: number;
		width: number;
	};
	const options: option[] = [
		{ title: 'today', unit: 'day', moveBack: 0, width: 1 },
		{ title: 'yesterday', unit: 'day', moveBack: 1, width: 1 },
		{ title: 'this week', unit: 'isoWeek', moveBack: 0, width: 1 },
		{ title: 'last week', unit: 'isoWeek', moveBack: 1, width: 1 },
		{ title: 'last 7 days', unit: 'day', moveBack: 0, width: 7 },
		{ title: 'this month', unit: 'month', moveBack: 0, width: 1 },
		{ title: 'last month', unit: 'month', moveBack: 1, width: 1 },
		{ title: 'last 30 days', unit: 'day', moveBack: 0, width: 30 },
		{ title: 'this quarter', unit: 'quarter', moveBack: 0, width: 1 },
		{ title: 'last quarter', unit: 'quarter', moveBack: 1, width: 1 },
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

<div id="range-selector" style="--primary: {primary}; --secondary: {secondary}">
	<div id="top">
		<button
			on:click={() => {
				[rangeStartM, rangeEndM] = getRange(options[selected]);
				live = options[selected].moveBack == 0;
			}}
			style={match ? 'color:' + primary + '; background-color:' + secondary + ';' : null}
		>
			{options[selected].title}
		</button>
		<button
			on:click={() => {
				dropdown = dropdown ? false : true;
			}}
			style={match ? 'color:' + primary + '; background-color:' + secondary + ';' : null}>▼</button
		>
	</div>
	{#if dropdown}
		<div id="selector">
			{#each options as option, i}
				<button
					on:click={() => {
						[rangeStartM, rangeEndM] = getRange(option);
						dropdown = false;
						selected = i;
						live = option.moveBack == 0;
					}}
				>
					{option.title}
				</button>
			{/each}
			<div>
				custom
				<input
					type="datetime-local"
					bind:value={rangeStart}
					on:input={updateRange}
					on:change={() => (dropdown = false)}
				/>
				<input
					type="datetime-local"
					bind:value={rangeEnd}
					on:input={updateRange}
					on:change={() => (dropdown = false)}
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	button {
		padding: 10px;
		border-style: solid;
		border-width: 1px;
		height: 50px;
		border-color: var(--secondary);
		color: var(--secondary);
		background-color: var(--primary);
	}
	button:hover {
		cursor: pointer;
		color: var(--primary);
		background-color: var(--secondary);
	}

	#top {
		display: inline-flex;
	}
	#top:hover button {
		cursor: pointer;
		color: var(--primary);
		background-color: var(--secondary);
	}
	#top button:nth-of-type(1) {
		border-radius: 100px 0 0 100px;
		border-right: none;
		width: 75px;
	}
	#top button:nth-of-type(2) {
		border-radius: 0 100px 100px 0;
		border-left: none;
		width: 25px;
	}

	#range-selector {
		width: 100px;
	}

	#selector {
		position: absolute;
	}
	#selector > * {
		display: block;
		width: 100px;
	}
	#selector div > * {
		display: block;
		width: 100px;
	}
	#selector div {
		border-color: var(--secondary);
	}
	#selector div input {
		color: var(--secondary);
		background-color: var(--primary);
		border-color: var(--secondary);
		color: var(--secondary);
		background-color: var(--primary);
		border-width: 0 0 1px 0;
	}
	::-webkit-calendar-picker-indicator {
		background-color: var(--secondary) !important;
	}
</style>
