<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import Auth from '../Auth.svelte';
	import { auth } from '../Auth';
	import { ApiClient } from '../Api';
	import type { authDef } from '../types';
	import Timeline from '../Timeline.svelte';
	import Summary from '../Summary.svelte';
	import Running from '../Running.svelte';

	let apiUrl: string;
	let apiClient: ApiClient;
	let authDef: authDef;

	let loading = true;

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		authDef = await auth();
		apiClient = new ApiClient(apiUrl, authDef.accessToken);
		loading = false;
	});

	onDestroy(() => {
		if (apiClient === undefined) return;
		apiClient.close();
	});

	afterUpdate(() => {
		if (
			typeof authDef !== 'undefined' &&
			typeof authDef.authClient !== 'undefined' &&
			!authDef.isAuthenticated
		) {
			window.location.pathname = '/';
		}
	});

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
		//rangeStartM = Math.max(rangeStartM, logs[0].start);
		rangeStartM = Math.max(rangeStartM);
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
</script>

<h1>Time Logger</h1>
{#if loading}
	<h2>loading</h2>
{:else}
	<p>Backend URL is : {apiUrl}</p>

	<Auth {authDef} /> <br />

	<a href="/settings">settings</a>

	<h1>Data</h1>
	<Running bind:apiClient />

	<input type="datetime-local" bind:value={rangeStart} on:change={updateRange} />
	<input type="datetime-local" bind:value={rangeEnd} on:change={updateRange} />
	<button on:click={setRangeToday}>Today</button>
	<button on:click={setRangeYesterday}>Yesterday</button>
	<button on:click={setRangeThisWeek}>This Week</button>
	<button on:click={setRangeLastWeek}>Last Week</button>

	<Timeline bind:apiClient bind:rangeStartM bind:rangeEndM live={true} />

	<h2>Summary</h2>
	<Summary bind:apiClient bind:rangeStartM bind:rangeEndM />
{/if}
