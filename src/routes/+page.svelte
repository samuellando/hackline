<script lang="ts">
	import { onMount } from 'svelte';
	import moment from 'moment';
	import Timeline from '$lib/components/Timeline.svelte';
	import RangeSelector from '$lib/components/RangeSelector.svelte';
	import Live from '$lib/components/Live.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Running from '$lib/components/Running.svelte';
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';

	let rangeStartM = moment().startOf('day').valueOf();
	let rangeEndM = moment().valueOf();

	let live = true;

	let loading = true;
	onMount(() => {
		loading = false;
	});
</script>

<div class="flex flex-col h-screen">
	<div class="flex mt-20 gap-20 justify-end flex-col sm:flex-row px-10 sm:px-28">
		<p
			class="
    text-3xl
    sm:text-6xl
    text-center
    sm:text-left
    w-full
    sm:w-1/4
    "
		>
			Hackline is a <b>minimalist</b> and <b>extensible</b> time tracking tool designed for
			<b>power users</b>.
		</p>
		<div
			class="
    w-full
    sm:w-1/2
    flex
    flex-col
    gap-10
    text-center
    sm:text-left
    "
		>
			<p class="text-2xl sm:text-4xl">It's just a timeline.</p>
			<img src="/images/timeline.png" alt="timeline" />
			<p class="text-2xl sm:text-2xl w-full sm:w-1/2">
				With a <b>RestAPI</b>, so you can build <b>integrations</b>,
				<b>notebooks</b>, <b>dashboards</b>, and set up <b>automations</b>.
			</p>
			<div class="flex flex-row gap-5 items-center justify-center sm:justify-start">
				<Button text="Demo it" onClick={() => goto('/#demo')} />
				<span
					on:click={() => goto('/#readmore')}
					on:keyup={() => goto('/#readmore')}
					class="cursor-pointer text-xl font-bold hover:underline">Read more ></span
				>
			</div>
		</div>
	</div>

	<div class="flex flex-grow bg-red" />
</div>

<h1
	id="demo"
	class="
text-center text-5xl mt-
"
>
	Live Demo
</h1>

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

<div id="readmore" class="flex flex-col h-screen">
	<h1 id="demo" class="text-center text-5xl mt-28">How it works</h1>
</div>
