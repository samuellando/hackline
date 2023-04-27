<script lang="ts">
	import type { log } from './types';
	import { get } from './Api';
	import { onMount } from 'svelte';

	export let running: log;
	let fallback: log;
	export let logs: log[];
	export let apiUrl: string;
	export let accessToken: string;

	onMount(() => {
		var runningS = localStorage.getItem('running');
		if (runningS != null) {
			running = JSON.parse(runningS);
		}
		setInterval(updateRunning, 1000);
	});

	function msToHMS(ms: number) {
		// 1- Convert to seconds:
		let seconds = parseInt('' + ms / 1000);
		// 2- Extract hours:
		const hours = parseInt('' + seconds / 3600); // 3,600 seconds in 1 hour
		seconds = seconds % 3600; // seconds remaining after extracting hours
		// 3- Extract minutes:
		const minutes = parseInt('' + seconds / 60); // 60 seconds in 1 minute
		// 4- Keep only seconds not extracted to minutes:
		seconds = seconds % 60;
		return hours + ':' + minutes + ':' + seconds;
	}

	async function getRunning() {
		fallback = Object.values(await get(apiUrl, 'run', null, accessToken))[0] as log;
		if (logs.length == 0 || logs[logs.length - 1].end < new Date().getTime()) {
			running = fallback;
			if (logs.length > 0) {
				let last = JSON.parse(JSON.stringify(logs[logs.length - 1]));
				if (last.title == running.title) {
					running.start = last.start;
				} else {
					running.start = last.end;
				}
			}
			running.end = -1;
		} else {
			let last = JSON.parse(JSON.stringify(logs[logs.length - 1]));
			running = last;
		}
		localStorage.setItem('running', JSON.stringify(running));
	}

	function updateRunning() {
		if (running) {
			if (new Date().getTime() > running.end && running.end > 0) {
				getRunning();
			}
			running.duration = new Date().getTime() - running.start;
		}
	}
</script>

{#if running}
	<h1>Running:</h1>
	<h2>{running.title}</h2>
	{#if running.end > 0}
		<h3>{msToHMS(running.end - running.start - running.duration)} remaining</h3>
	{:else}
		<h3>{msToHMS(running.duration)}</h3>
	{/if}
{/if}
