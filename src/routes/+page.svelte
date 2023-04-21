<script lang="ts">
	import { onMount } from 'svelte';
	import Auth from './Auth.svelte';
	import type { User } from '@auth0/auth0-spa-js';
	import { get, post, patch, put, del, getApiKey, deleteApiKey } from './Api';

	let apiUrl = '';

	var isAuthenticated: boolean;
	var userProfile: User | undefined;
	var accessToken: string;

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		/*var logsS = localStorage.getItem('logs');
		if (logsS != null) {
			logs = JSON.parse(logsS);
		}*/
	});

	var apikey = '';
	async function wGetApiKey() {
		apikey = (await getApiKey(apiUrl, accessToken))['api-key'];
	}

	async function wDeleteApiKey() {
		await deleteApiKey(apiUrl, accessToken);
		apikey = '';
	}

	var start = new Date().toISOString().slice(0, -1);
	var end = new Date(new Date().getTime() + 30 * 60000).toISOString().slice(0, -1);
	var duration = 25;
	var title = 'productive';

	function startLog() {
		const data = {
			title: title
		};
		post(apiUrl, 'run', data, accessToken);
	}

	function enterLog() {
		const data = {
			start: Date.parse(start),
			end: Date.parse(end),
			title: title
		};
		post(apiUrl, 'logs', data, accessToken);
	}

	function enterDurationLog() {
		const data = {
			duration: duration * 60 * 1000,
			title: title
		};
		post(apiUrl, 'logs', data, accessToken);
	}

	var logs: log[] = [];

	interface log {
		title: string;
		start: number;
		duration: number;
		end: number;
		id: string;
		color?: string;
		percent?: number;
	}

	var summary: any[] = [];
	function getSummary(logs: log[]) {
		let s: any = {};
		logs.forEach((log) => {
			if (log.title in s) {
				s[log.title]['time'] += log.end - log.start;
			} else {
				s[log.title] = {};
				s[log.title]['time'] = log.end - log.start;
				s[log.title]['title'] = log.title;
			}
		});
		return Object.values(s);
	}

	function getTimeline(logs: log[]) {
		var total = rangeEndM - rangeStartM;
		console.log(total, logs.length);

		var colors = ['red', 'green'];
		var i = 0;
		var colormap: any = {};

		return logs.map((e) => {
			if (!(e.title in colormap)) {
				colormap[e.title] = colors[i++];
			}
			e.color = colormap[e.title];
			e.percent = (e.duration / total) * 100;
			return e;
		});
	}

	var rangeStartD = new Date();
	rangeStartD.setHours(0, 0, 0, 0);
	var rangeEndD = new Date(rangeStartD.getTime() + 24 * 60 * 60 * 1000);

	function toDateTimeString(now: Date) {
		let month = '' + (now.getMonth() + 1);
		let day = '' + now.getDate();
		let year = now.getFullYear();

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;

		return [year, month, day].join('-') + 'T' + now.toLocaleTimeString();
	}

	var rangeStart = toDateTimeString(rangeStartD);
	var rangeEnd = toDateTimeString(rangeEndD);

	var rangeStartM = Date.parse(rangeStart);
	var rangeEndM = Date.parse(rangeEnd);

	function rangeScroll(e: WheelEvent) {
		e.preventDefault();
		rangeStartM -= 100 * e.deltaY;
		rangeEndM += 100 * e.deltaY;
	}

	$: rangeStart = toDateTimeString(new Date(rangeStartM));
	$: rangeEnd = toDateTimeString(new Date(rangeEndM));

	async function getData() {
		console.log(rangeStartM, rangeEndM);
		logs = await get(apiUrl, 'timeline', { start: rangeStartM, end: rangeEndM }, accessToken);
		localStorage.setItem('logs', JSON.stringify(logs));
	}

	$: summary = getSummary(logs);
	$: timeline = getTimeline(logs);
</script>

<h1>Time Logger</h1>
<p>Backend URL is : {apiUrl}</p>
<p>API key is : {apikey}</p>
<button on:click={wGetApiKey}>get</button>
<button on:click={wDeleteApiKey}>delete</button><br />

<Auth bind:accessToken bind:userProfile bind:isAuthenticated /> <br />

<input type="text" bind:value={title} />
<input type="datetime-local" bind:value={start} />
<input type="datetime-local" bind:value={end} />
<button on:click={startLog}>start</button><br />
<button on:click={enterLog}>enter</button><br />
<input type="number" bind:value={duration} />
<button on:click={enterDurationLog}>enter</button><br />

<h1>Data</h1>
<input type="datetime-local" bind:value={rangeStart} />
<input type="datetime-local" bind:value={rangeEnd} />

<button on:click={getData}>get</button><br />

<div
	style="background-color: grey; height: 100px; display: flex"
	on:mousewheel={(e) => {
		rangeScroll(e);
		getTimeline(logs);
	}}
>
	{#each timeline as e}
		<div style="background-color: {e.color}; height: 100px; width: {e.percent}%" class="event">
			<span>
				{e.title} <br />
				{new Date(e.start).toLocaleTimeString()} - {new Date(e.end).toLocaleTimeString()} <br />
				{Math.round(e.duration / 60000)} mins
			</span>
		</div>
	{/each}
</div>

<h2>Summary</h2>
{#each summary as log}
	<h3>
		{log.title}
	</h3>
	<p>time: {log.time / 3600000} hours</p>
{/each}

<h2>Logs</h2>

{#each logs as log}
	<h3>
		{log.title}
	</h3>
	<p>start: {new Date(log.start)}</p>
	<p>
		end: {new Date(log.end)}
	</p>
	<p>duration: {(log.end - log.start) / 60000} minutes</p>
	{#if log.id}
		<button on:click={() => del(apiUrl, 'logs/' + log.id, accessToken)}>delete</button><br />
	{/if}
{/each}

<style>
	/* Tooltip container */
	.event {
		position: relative;
		display: inline-block;
		border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
	}

	/* Tooltip text */
	.event span {
		visibility: hidden;
		width: 120px;
		background-color: black;
		color: #fff;
		text-align: center;
		padding: 5px 0;
		border-radius: 6px;

		/* Position the tooltip text - see examples below! */
		position: absolute;
		z-index: 1;
		bottom: 100%;
		left: 50%;
		margin-left: -60px; /* Use half of the width (120/2 = 60), to center the tooltip */
	}

	/* Show the tooltip text when you mouse over the tooltip container */
	.event:hover span {
		visibility: visible;
	}
</style>
