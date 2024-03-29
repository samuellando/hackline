<script lang="ts">
	import { onMount } from 'svelte';
	import TimelineUI from '$lib/components/TimelineUI.svelte';
	import Button from '$lib/components/Button.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import { goto } from '$app/navigation';

	export let data;

	let loading = true;
	let showTip = true;
	onMount(() => {
		loading = false;
	});
</script>

<div id="top" class="flex flex-col min-h-screen">
	<div class="basis-36 lg:basis-72" />
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
		<div class="relative">
			<div class="absolute left-1/2 -translate-x-1/2 top-36 text-center">
				<p class="text-5xl">Live Demo</p>
			</div>
		</div>
		{#if showTip}
			<div class="relative hidden lg:inline">
				<div
					class="absolute p-5 bg-[var(--primary)] top-56 left-10 rounded border-[var(--secondary)] border"
				>
					<div class="absolute top-5 right-5">
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
			<div class="relative inline lg:hidden">
				<div
					class="absolute left-1/2 transform -translate-x-1/2 p-5 bg-[var(--primary)] top-56 rounded border-[var(--secondary)] border"
				>
					<div class="absolute top-5 right-5">
						<Nav
							className="text-xl"
							text="X"
							onClick={() => {
								showTip = false;
							}}
						/>
					</div>
					<p><b>Note:</b></p>
					<p>
						The application's UI is beter suited for Desktop, however you can still view the summary
						on mobile.
					</p>
				</div>
			</div>
		{/if}
		<TimelineUI />
	</div>
{/if}

<div id="readmore" class="flex flex-col min-h-screen">
	<div class="basis-36" />
	<p class="text-center text-5xl">Principles</p>
	<div class="flex flex-col lg:flex-row gap-10 justify-center">
		<div class="w-full lg:w-1/2">
			<p class="px-5 pt-10 text-lg">
				Hackline is a <a href="https://github.com/samuellando/hackline" class="underline">
					open source
				</a> time tracking tool designed for personal time tracking.
			</p>
			<p class="px-5 pt-5 text-lg">
				<b>It will always remain open source</b>. You are free to deploy your own instance, or you
				can use the hosted version, and support the project.
			</p>
			<p class="px-5 pt-5 text-lg">
				Hackline is "opinionated" in the sense that it is designed for personal time tracking to
				help you measure how productive you really are. It is not designed to be used for team time
				tracking, or for billing clients, but for independent professionals and students who want to
				track their time.
			</p>
			<p class="px-5 pt-5 text-lg">There are a few principles that guide the design of Hackline:</p>
			<ol class="px-10 py-5 list-decimal text-lg">
				<li>
					Follow the <a href="https://en.wikipedia.org/wiki/Unix_philosophy" class="underline"
						>Uinx Philosophy</a
					>
					<ol class="list-disc list-inside">
						<li>Do one thing and do it well</li>
						<li>Work together with other programs</li>
					</ol>
				</li>
				<li>you do one thing at a time, so it tracks one thing at a time</li>
				<li>you are not a robot, tracking should be as automated as possible.</li>
				<li>You should be able to quickly build around Hackline and add features that you need.</li>
			</ol>
		</div>
	</div>
	<p class="text-center text-5xl">How it works</p>
	<p class="text-center text-3xl pb-5">Track one thing at a time</p>
	<div class="px-5 flex justify-center items-center flex-col lg:flex-row gap-5">
		<div>
			<p class="text-lg w-full lg:w-1/2 pb-5">
				It tracks your time in non overlapping intervals of time, and displays everything in a nice
				timeline view.
			</p>
			<ol class="list-decimal px-10 text-xl">
				<li>Intervals with later start times take priority.</li>
				<li>Intervals with earlier start times can be cut off or spliced by other intervals.</li>
				<li>There is always a background running interval.</li>
			</ol>
		</div>
		<p class="p-10 float-left text-2xl">
			Before:
			<img src="/before.png" alt="before" />

			After:
			<img src="/after.png" alt="after" />
		</p>
	</div>

	<p class="text-center text-3xl pb-5">Fully customizable</p>
	<div class="px-5 flex justify-center items-center flex-col lg:flex-row gap-5">
		<div class="">
			<img src="/settings.png" alt="settings page screenshot" />
		</div>
		<div class="w-full lg:w-1/4 pb-5">
			<p class="text-xl pb-5">
				The web interface is designed to be fully customizable! Almost everything is a parameter
				that can be changed in the settings.
			</p>
		</div>
	</div>

	<div id="pricing" class="basis-36" />
	<p class="text-center text-5xl">Pricing</p>
	{#if data.session?.user && data.stripeInfo.paymentStatus == 'inactive'}
		<p class="text-xl text-center">You must support in order to maintain access.</p>
	{/if}
	{#if data.session?.user && data.stripeInfo.paymentStatus == 'trial'}
		<p class="text-xl text-center">You are in the 7 day free trial.</p>
	{/if}
	<p class="text-xl text-center py-10">
		After the 7 day free trial, there are currently two ways to maintain access
	</p>
	<div class="text-md lg:text-lg flex flex-row gap-2 lg:gap-20 justify-center">
		<div class="border w-2/5 lg:w-1/4 border-[var(--secondary)] text-center p-5">
			<p class="text-lg lg:text-2xl">Early Adopter</p>
			<hr />
			<p><b>Pay what you want</b></p>
			<p><b>Starting at $5</b></p>
			<p>Limited time offer</p>
			<p>Access to all future features</p>
			{#if data.session?.user && data.stripeInfo.paymentStatus != 'active'}
				<form action="/payment?/adopt" method="POST">
					<button type="submit" class="underline">Adopt</button>
				</form>
			{/if}
		</div>
		<div class="border w-2/5 lg:w-1/4 border-[var(--secondary)] text-center p-5">
			<p class="text-center text-lg lg:text-2xl">Subscription</p>
			<hr />
			<p><b>$1 a month</b></p>
			<p>Limited time offer</p>
			<p>Access to all future features</p>
			<p>Cancel any time</p>
			{#if data.session?.user && data.stripeInfo.paymentStatus != 'active'}
				<form action="/payment?/subscribe" method="POST">
					<button type="submit" class="underline">Subscribe</button>
				</form>
			{/if}
		</div>
	</div>
	{#if data.session?.user && data.stripeInfo.paymentStatus == 'active'}
		<p class="text-lg pt-10 text-center">You are already subscribed, thank you for your support!</p>
		<div class="w-screen flex justify-center">
			<Nav text="Manage Subscription" onClick={() => goto('/app/account')} />
		</div>
	{:else}
		<p class="text-lg pt-10 text-center">All payments are handled by stripe, and are secure.</p>
	{/if}
	<p class="text-lg pt-10 text-center">
		If you open a accepted issue or feature request on the <a
			href="https://github.com/samuellando/hackline/issues"
			class="underline">github</a
		> I will reach out to you and give you a free access forever.
	</p>

	<div id="docs" class="basis-36" />
	<p class="text-center text-5xl">Docs</p>
	<p class="text-center text-2xl">
		<a
			class="underline"
			href="https://hackline.stoplight.io/docs/hackline-io/branches/main/iax31zjanhgrc-rest-api"
			>API Reference</a
		>
	</p>

	<div class="h-96" />
</div>
