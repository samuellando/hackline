<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import Auth from '$lib/components/Auth.svelte';
	import { auth } from '$lib/Auth';
	import { ApiClient } from '$lib/Api';
	import type { authDef } from '$lib/types';
	import Timeline from '$lib/components/Timeline.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Running from '$lib/components/Running.svelte';
	import { toDateTimeString } from '$lib/timePrint';

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
		await apiClient.ready();
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

	var rangeStartM: number;
	var rangeEndM: number;

	let live = true;
	setRangeToday();

	$: rangeStart = toDateTimeString(rangeStartM);
	$: rangeEnd = toDateTimeString(rangeEndM);

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
		live = true;
	}

	function setRangeYesterday() {
		let diff = 24 * 60 * 60 * 1000;
		setRangeToday();
		rangeStartM -= diff;
		rangeEndM = rangeStartM + diff;
		live = false;
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
		live = false;
	}

	function setRangeLastWeek() {
		let diff = 7 * 24 * 60 * 60 * 1000;
		setRangeThisWeek();
		rangeStartM -= diff;
		rangeEndM = rangeStartM + diff;
		live = false;
	}
</script>

<h1>HackLine.io</h1>
{#if loading}
	<h2>loading</h2>
{:else}
	<Auth {authDef} /> <br />

	<a href="/settings">settings</a>

	<Running bind:apiClient />

	<input type="datetime-local" bind:value={rangeStart} on:change={updateRange} />
	<input type="datetime-local" bind:value={rangeEnd} on:change={updateRange} />
	<button on:click={setRangeToday}>Today</button>
	<button on:click={setRangeYesterday}>Yesterday</button>
	<button on:click={setRangeThisWeek}>This Week</button>
	<button on:click={setRangeLastWeek}>Last Week</button>

	<Timeline bind:apiClient bind:rangeStartM bind:rangeEndM bind:live />

	<h2>Summary</h2>
	<Summary bind:apiClient bind:rangeStartM bind:rangeEndM />
{/if}
