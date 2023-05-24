<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import Auth from '../Auth.svelte';
	import type { User } from '@auth0/auth0-spa-js';
	import { get, post, patch, put, del, getApiKey, deleteApiKey } from '../Api';
	import type { log } from '../types';
	import Timeline from '../Timeline.svelte';
	import Running from '../Running.svelte';
	import Summary from '../Summary.svelte';

	let apiUrl = '';

	var isAuthenticated: boolean;
	var userProfile: User | undefined;
	var accessToken: string;

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		var logsS = localStorage.getItem('logs');
		if (logsS != null) {
			logs = JSON.parse(logsS);
		}
		setInterval(getNewData, 30000);
	});

	afterUpdate(() => {
		if (isAuthenticated === false) {
			window.location.pathname = '/';
		}
	});

	var apikey = '';
	async function wGetApiKey() {
		apikey = (await getApiKey(apiUrl, accessToken))['api-key'];
	}

	async function wDeleteApiKey() {
		await deleteApiKey(apiUrl, accessToken);
		apikey = '';
	}

	function toDateTimeString(now: Date) {
		let month = '' + (now.getMonth() + 1);
		let day = '' + now.getDate();
		let year = now.getFullYear();

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;

		return [year, month, day].join('-') + 'T' + now.toLocaleTimeString();
	}

	var rangeStartM: number;
	var rangeEndM: number;

	setRangeToday();

	$: rangeStart = toDateTimeString(new Date(rangeStartM));
	$: rangeEnd = toDateTimeString(new Date(rangeEndM));

	function updateRange() {
		rangeStartM = Date.parse(rangeStart);
		rangeEndM = Date.parse(rangeEnd);
		rangeStartM = Math.max(rangeStartM, logs[0].start);
		rangeEndM = Math.min(rangeEndM, new Date().getTime());
	}

	function setRangeToday() {
		var rangeStartD = new Date();
		rangeStartD.setHours(0, 0, 0, 0);
		var rangeEndD = new Date();

		rangeStartM = rangeStartD.getTime();
		rangeEndM = rangeEndD.getTime();
	}

	function setRangeYesterday() {
		let diff = 24 * 60 * 60 * 1000;
		setRangeToday();
		rangeStartM -= diff;
		rangeEndM = rangeStartM + diff;
	}

	function setRangeThisWeek() {
		var rangeStartD = new Date();
		rangeStartD.setHours(0, 0, 0, 0);
		var day = rangeStartD.getDay(),
			diff = rangeStartD.getDate() - day + (day == 0 ? -6 : 1);
		rangeStartD.setDate(diff);
		var rangeEndD = new Date();

		rangeStartM = rangeStartD.getTime();
		rangeEndM = rangeEndD.getTime();
	}

	function setRangeLastWeek() {
		let diff = 7 * 24 * 60 * 60 * 1000;
		setRangeThisWeek();
		rangeStartM -= diff;
		rangeEndM = rangeStartM + diff;
	}

	var logs: log[] = [];

	async function getData() {
		logs = await get(apiUrl, 'timeline', null, accessToken);
		localStorage.setItem('logs', JSON.stringify(logs));
	}

	async function getNewData() {
		let lastEnd = logs[logs.length - 1].end;
		let newLogs = await get(apiUrl, 'timeline', { start: lastEnd + 1 }, accessToken);
		let last = logs[logs.length - 1];
		if (newLogs.length == 1 && newLogs[0].title == last.title) {
			last.end = newLogs[0].end;
			last.duration = newLogs[0].end - last.start;
		} else {
			logs = logs.concat(newLogs);
		}
		localStorage.setItem('logs', JSON.stringify(logs));
	}

	var colormap: any;
</script>

<h1>Time Logger</h1>
<p>Backend URL is : {apiUrl}</p>
<p>API key is : {apikey}</p>
<button on:click={wGetApiKey}>get</button>
<button on:click={wDeleteApiKey}>delete</button><br />

<Auth bind:accessToken bind:userProfile bind:isAuthenticated /> <br />

<a href="/settings">settings</a>

<Running {apiUrl} {accessToken} />

<h1>Data</h1>
<input type="datetime-local" bind:value={rangeStart} on:change={updateRange} />
<input type="datetime-local" bind:value={rangeEnd} on:change={updateRange} />
<button on:click={setRangeToday}>Today</button>
<button on:click={setRangeYesterday}>Yesterday</button>
<button on:click={setRangeThisWeek}>This Week</button>
<button on:click={setRangeLastWeek}>Last Week</button>

<button on:click={getData}>get</button><br />

<Timeline
	{logs}
	bind:apiUrl
	bind:accessToken
	bind:rangeStartM
	bind:rangeEndM
	live={true}
	bind:colormap
/>

<h2>Summary</h2>
<Summary {logs} {rangeStartM} {rangeEndM} {colormap} />
