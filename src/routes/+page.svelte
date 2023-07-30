<script lang="ts">
	import { onMount } from 'svelte';
	import moment from 'moment';
	import Timeline from '$lib/components/Timeline.svelte';
	import RangeSelector from '$lib/components/RangeSelector.svelte';
	import Live from '$lib/components/Live.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Running from '$lib/components/Running.svelte';
	let rangeStartM = moment().startOf('day').valueOf();
	let rangeEndM = moment().valueOf();

	let live = true;

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
		<Running />
	</div>

	<div class="mt-10 flex justify-between px-20">
		<Live bind:live />
		<RangeSelector bind:rangeStartM bind:rangeEndM bind:live />
	</div>

	<div class="flex justify-center mt-5">
		<Timeline bind:rangeStartM bind:rangeEndM bind:live />
	</div>

	<div class="flex justify-center">
		<Editor />
	</div>

	<h1 class="text-2xl text-center">Summary</h1>
	<div class="flex justify-center">
		<Summary bind:rangeStartM bind:rangeEndM />
	</div>
    {:else}
    Loading...
    {/if}
