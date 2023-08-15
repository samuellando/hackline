<script lang="ts">
	import moment from 'moment';
	import { toDateTimeString } from '$lib/timePrint';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import type { palette } from '$lib/types';

	let primary: string;
	let secondary: string;
	if (browser) {
		primary = (getContext('palette') as palette).primary;
		secondary = (getContext('palette') as palette).secondary;
	}

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
		return [start.toDate(), end.toDate()];
	}

	export let rangeStart: Date = moment().startOf('day').toDate();
	export let rangeEnd: Date = moment().toDate();
	export let live = true;

	let dropdown = false;
	let selected = 0;
	$: match =
		rangeStart.getTime() == getRange(options[selected])[0].getTime() &&
		(rangeEnd.getTime() == getRange(options[selected])[1].getTime() || live);

	$: rangeStartString = toDateTimeString(rangeStart);
	$: rangeEndString = toDateTimeString(rangeEnd);

	function updateRange() {
		rangeStart = new Date(rangeStart);
		rangeEnd = new Date(rangeEnd);
		//rangeStartM = Math.max(rangeStartM, logs[0].start);
		rangeEnd = new Date(Math.min(rangeEnd.getTime(), Date.now()));
	}
</script>

<div id="range-selector" style="--primary: {primary}; --secondary: {secondary}">
	<button
		class="
                border-l border-y rounded-l-full
                p-1 text-sm min-w-fit h-10
                font-mono
                text-[var(--secondary)] hover:text-[var(--primary)]
                bg-[var(--primary)] hover:bg-[var(--secondary)]
            "
		on:click={() => {
			[rangeStart, rangeEnd] = getRange(options[selected]);
			live = options[selected].moveBack == 0;
		}}
		style={match ? 'color:' + primary + '; background-color:' + secondary + ';' : null}
	>
		{options[selected].title}
	</button><button
		class="
                border-r border-y rounded-r-full
                p-1 text-sm min-w-fit h-10
                font-mono
                text-[var(--secondary)] hover:text-[var(--primary)]
                bg-[var(--primary)] hover:bg-[var(--secondary)]
            "
		on:click={() => {
			dropdown = dropdown ? false : true;
		}}
		style={match ? 'color:' + primary + '; background-color:' + secondary + ';' : null}>▼</button
	>
	{#if dropdown}
		<div class="relative">
			<div
				class="
                border rounded
                p-1 text-sm min-w-fit min-h-fit
                font-mono
                bg-[var(--primary)]
                absolute
                text-center
                -translate-x-3/4
        "
			>
				{#each options as option, i}
					<button
						class="
                        border rounded-r
                        p-1 text-sm w-96 h-10
                        font-mono
                        text-[var(--secondary)] hover:text-[var(--primary)]
                        bg-[var(--primary)] hover:bg-[var(--secondary)]
                    "
						on:click={() => {
							[rangeStart, rangeEnd] = getRange(option);
							dropdown = false;
							selected = i;
							live = option.moveBack == 0;
						}}
					>
						{option.title}
					</button>
				{/each}
				<div>
					custom<br />
					<input
						class="
                        border rounded-r
                        p-1 text-sm w-40 h-10
                        font-mono
                        text-[var(--secondary)] hover:text-[var(--primary)]
                        bg-[var(--primary)] hover:bg-[var(--secondary)]
                    "
						type="datetime-local"
						bind:value={rangeStartString}
						on:input={updateRange}
						on:change={() => (dropdown = false)}
					/>
					<input
						class="
                        border rounded-r
                        p-1 text-sm w-40 h-10
                        font-mono
                        text-[var(--secondary)] hover:text-[var(--primary)]
                        bg-[var(--primary)] hover:bg-[var(--secondary)]
                    "
						type="datetime-local"
						bind:value={rangeEndString}
						on:input={updateRange}
						on:change={() => (dropdown = false)}
					/>
				</div>
			</div>
		</div>
	{/if}
</div>
