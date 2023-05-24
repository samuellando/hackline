<script lang="ts">
	import type { log } from './types';
	import { get } from './Api';
	import { onMount } from 'svelte';

	export let apiUrl: string;
	export let accessToken: string;

	onMount(() => {
		updateRunning();
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

	let data: any;
	let running: log;
	async function getRunning() {
		get(apiUrl, 'run', null, accessToken).then((value) => {
			running = value;
		});
	}

	let c = 0;
	function updateRunning() {
		if (running === undefined) {
			getRunning();
			return;
		}
		if (c % 60 == 0) {
			c = 1;
			getRunning();
		} else {
			c++;
		}
		let t = new Date().getTime();
		running['duration'] = t - running['start'];
	}
</script>

{#if running}
	<h1>Running:</h1>
	<h2>{running.title}</h2>
	{#if !running.running}
		<h3>{msToHMS(running.end - running.start - running.duration)} remaining</h3>
	{:else}
		<h3>{msToHMS(running.duration)}</h3>
	{/if}
{/if}
