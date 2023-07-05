<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import Auth from '$lib/components/Auth.svelte';
	import { auth } from '$lib/Auth';
	import type { authDef } from '$lib/types';
	import moment from 'moment';
	import Timeline from '$lib/components/Timeline.svelte';
	import RangeSelector from '$lib/components/RangeSelector.svelte';
	import Live from '$lib/components/Live.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Running from '$lib/components/Running.svelte';
	import { DemoApiClient } from '$lib/DemoApi';

	var authDef: authDef = {
		authClient: undefined,
		isAuthenticated: false,
		userProfile: undefined,
		accessToken: undefined
	};

	var loading = true;

	onMount(async () => {
		authDef = await auth();
		loading = false;
	});

	afterUpdate(() => {
		if (authDef.isAuthenticated) {
			window.location.pathname = '/timeline';
		}
	});

	let rangeStartM = moment().startOf('day').valueOf();
	let rangeEndM = moment().valueOf();

	let apiClient = new DemoApiClient(new Date().getTime());
	let live = true;

	let primary = apiClient.getSetting('background-color') || '#b3b0ad';
	let secondary = apiClient.getSetting('text-color') || '#FFF1D0';
</script>

<div
	style="
background-color: {primary};
color: {secondary};
font-family: {apiClient.getSetting('text-font') || 'courier, monospace'};
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
text-align: center;
"
>
	<div id="title-container">
		<h1>Hackline</h1>
		<div id="navigation-container">
			<Auth {primary} {secondary} {authDef} />
		</div>
	</div>

	<p>Hackline is a extensible time tracking tool designed for power users.
    <br />
        <br />
	Use the simple and customizable web UI and automate with the API,
    <br />
        <br />
	This is currently a rough minimal viable product, check out the live demo below.</p>

	<h1>Live Demo</h1>
	{#if loading}
		<h2>loading</h2>
	{:else}
        <p>
        scroll on the timeline to zoom in and out.
        <br />
        <br />
        SHIFT + scroll to pan.
        <br />
        <br />
        Shift + click and drag to add a new interval.
        </p>
		<div
			id="timeline-container"
			style="
background-color: {primary};
color: {secondary};
font-family: {apiClient.getSetting('text-font') || 'courier, monospace'};
"
		>
			<div id="running">
				<Running bind:apiClient />
			</div>
			<div id="top-of-timeline">
				<div id="live">
					<Live bind:live />
				</div>

				<div id="range-selector">
					<RangeSelector bind:rangeStartM bind:rangeEndM bind:live {primary} {secondary} />
				</div>
			</div>

			<Timeline bind:apiClient bind:rangeStartM bind:rangeEndM bind:live />

			<h2>Summary</h2>
			<Summary bind:apiClient bind:rangeStartM bind:rangeEndM {primary} {secondary} />
		</div>
	{/if}
</div>

<style>
    h1 {
        font-size: 40px;
        margin: 0;
        padding-top: 50px;
    }
	#running {
		margin-top: 100px;
	}

	#top-of-timeline {
		display: grid;
		grid-template-columns: 200px auto 200px;
		grid-template-rows: 50px;
		margin-bottom: 10px;
	}
	#top-of-timeline #range-selector {
		grid-column-start: 3;
	}

	#timeline-container {
		padding-bottom: 50vh;
		width: 100%;
		position: relative;
		top: 0px;
		left: 0px;
		text-align: center;
	}

	#title-container {
		display: grid;
		grid-template-columns: 200px auto 200px;
		grid-template-rows: 50px;
		padding: 10px;
		margin-top: 10px;
	}
	#title-container h1 {
		font-size: 50px;
        padding: 0px;
		margin: 0;
		width: auto;
		grid-column-start: 2;
		grid-row-start: 2;
	}
	#navigation-container {
		grid-column-start: 3;
	}
</style>
