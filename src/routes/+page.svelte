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
	import Nav from '$lib/components/Nav.svelte';
	import { goto } from '$app/navigation';

	export let data;

	let rangeStartM = moment().startOf('day').valueOf();
	let rangeEndM = moment().valueOf();

	let live = true;

	let loading = true;
	let showTip = true;
	onMount(() => {
		loading = false;
	});
</script>

<div id="top" class="flex flex-col min-h-screen">
	<div class="basis-72" />
	<div class="flex gap-20 justify-end flex-col lg:flex-row px-10 lg:px-28">
		<p
			class="
    text-3xl
    lg:text-6xl
    text-center
    lg:text-left
    w-full
    lg:w-1/4
    "
		>
			Hackline is a <b>minimalist</b> and <b>extensible</b> time tracking tool designed for
			<b>power users</b>.
		</p>
		<div
			class="
    w-full
    lg:w-1/2
    flex
    flex-col
    gap-10
    text-center
    lg:text-left
    "
		>
			<p class="text-2xl lg:text-4xl">It's just a timeline.</p>
			<img src="/images/timeline.png" alt="timeline" />
			<p class="text-2xl lg:text-2xl w-full lg:w-1/2">
				With a <b>RestAPI</b>, so you can build <b>integrations</b>,
				<b>notebooks</b>, <b>dashboards</b>, and set up <b>automations</b>.
			</p>
			<div class="flex flex-row gap-5 items-center justify-center lg:justify-start">
				{#if !data.session?.user}
					<Button text="Demo it" onClick={() => goto('/#demo')} />
					<Nav text="Read more" onClick={() => goto('/#readmore')} />
				{:else}
					<Button text="Read more" onClick={() => goto('/#readmore')} />
				{/if}
			</div>
		</div>
	</div>
	<div class="grow" />
</div>
{#if !data.session?.user}
	<div id="demo" class="flex flex-col h-screen">
		<div class="basis-36" />
		<p
			class="
text-center text-5xl mt-
"
		>
			Live Demo
		</p>
		{#if showTip}
			<div class="relative">
				<div
					class="absolute p-5 bg-[var(--primary)] top-0 left-10 rounded border-[var(--secondary)] border"
				>
					<div class="absolute top-2 right-5">
						<Nav
							className="text-xl"
							text="X"
							onClick={() => {
								showTip = false;
							}}
						/>
					</div>
					<p><b>Tips:</b></p>
					<p>- Click on an interval to edit it.</p>
					<p>- Scroll over the timeline to zoom in and out.</p>
					<p>- SHIFT + Scroll over the timeline pan side to side.</p>
					<p>- SHIFT + drag over the timeline quick add an interval.</p>
				</div>
			</div>
		{/if}
		{#if !loading}
			<div class="flex justify-center">
				<Running />
			</div>

			<div class="flex justify-between px-20">
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
			<div class="h-96 flex justify-center">
				<div class="w-fit overflow-y-auto">
					<Summary bind:rangeStartM bind:rangeEndM />
				</div>
			</div>
		{:else}
			Loading...
		{/if}
		<div class="grow" />
	</div>
{/if}

<div id="readmore" class="flex flex-col min-h-screen">
	<div class="basis-36" />
	<p class="text-center text-5xl">How it works</p>
	<p>
		Hackline is a time tracking tool that allows you to track your time in a timeline. It's designed
		to be minimalistic and extensible. It's minimalistic because it's just a timeline. It's
		extensible because it has a REST API, so you can build integrations, notebooks, dashboards, and
		set up automations.
	</p>
	<div id="docs" class="basis-36" />
	<p class="text-center text-5xl">Docs</p>
	<p>
		<b>How to use the timeline</b>
		<br />
		<br />
		<b>How to use the editor</b>
		<br />
		<br />
		<b>How to test the API</b>
		<br />
		<br />
		<b>How to use the API</b>
		<br />
		<br />
		<b>How to use the API with Python</b>
		<br />
		<br />
		<b>How to use the API with Javascript</b>
		<br />
		<br />
		<b>How to use the API with Go</b>
		<br />
		<br />
	</p>
	<div id="guides" class="basis-36" />
	<p class="text-center text-5xl">Guides</p>
	<p>
		<b>How to use the timeline</b>
		<br />
		<br />
		<b>How to use the editor</b>
		<br />
		<br />
		<b>How to test the API</b>
		<br />
		<br />
		<b>How to use the API</b>
		<br />
		<br />
		<b>How to use the API with Python</b>
		<br />
		<br />
		<b>How to use the API with Javascript</b>
		<br />
		<br />
		<b>How to use the API with Go</b>
		<br />
		<br />
	</p>
	<div id="pricing" class="basis-36" />
	<p class="text-center text-5xl pl-36">Pricing</p>
	<p>
		Hackline is free for personal use.
		<br />
		<br />
		Hackline is free for open source projects.
		<br />
		<br />
		Hackline is free for non-profit organizations.
		<br />
		<br />
		Hackline is free for students.
		<br />
		<br />
		Hackline is free for teachers.
		<br />
	</p>
	<div class="h-96" />
</div>
