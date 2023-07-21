<script lang="ts">
	import { onMount } from 'svelte';
	import moment from 'moment';
	import Timeline from '$lib/components/Timeline.svelte';
	import RangeSelector from '$lib/components/RangeSelector.svelte';
	import Live from '$lib/components/Live.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Running from '$lib/components/Running.svelte';
	import { DemoApiClient } from '$lib/DemoApi';
	let rangeStartM = moment().startOf('day').valueOf();
	let rangeEndM = moment().valueOf();

	let apiClient = new DemoApiClient(new Date().getTime());
	let live = true;

	let primary = '#413C58';
	let secondary = '#FFF1D0';

    let loading = true;
	onMount(() => {
        loading = false;
	});
</script>

	<p class="text-center mt-20">
		Hackline is a extensible time tracking tool designed for power users.
		<br />
		<br />
		Use the simple and customizable web UI and automate with the API,
		<br />
		<br />
		This is currently a rough minimal viable product, check out the live demo below.
	</p>

	<h1 class="text-center text-4xl mt-20">Live Demo</h1>
	<p class="text-center mt-10 mb-20">
		scroll on the timeline to zoom in and out.
		<br />
		<br />
		SHIFT + scroll to pan.
		<br />
		<br />
		Shift + click and drag to add a new interval.
	</p>
    {#if !loading}
	<div class="mt-10 flex justify-center">
		<Running bind:apiClient />
	</div>

	<div class="mt-10 flex justify-between px-20">
		<Live bind:live />
		<RangeSelector bind:rangeStartM bind:rangeEndM bind:live {primary} {secondary} />
	</div>

	<div class="flex justify-center mt-5">
		<Timeline bind:apiClient bind:rangeStartM bind:rangeEndM bind:live />
	</div>

	<div class="flex justify-center">
		<Editor bind:apiClient {primary} {secondary} />
	</div>

	<h1 class="text-2xl text-center">Summary</h1>
	<div class="flex justify-center">
		<Summary bind:apiClient bind:rangeStartM bind:rangeEndM {primary} {secondary} />
	</div>
    {:else}
    Loading...
    {/if}
