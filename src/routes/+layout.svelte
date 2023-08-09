<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import Auth from '$lib/components/Auth.svelte';
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';
	import { getContext, setContext } from 'svelte';
	import type State from '$lib/State';
	import ApiClient from '$lib/ApiClient';
	import { trpc } from '$lib/trpc/client';
	import { browser } from '$app/environment';
	import transformer from '$lib/trpc/transformer';

	export let data;

	let state: State = transformer.parse(data.state);

	let primary = state.settings['background-color'] || '#413C58';
	let secondary = state.settings['text-color'] || '#FFF1D0';

	setContext('palette', { primary, secondary });

	if (browser) {
		let apiClient = getContext('apiClient');
		let trpcClient = trpc($page);
		if (!apiClient) {
			if (data.session?.user) {
				apiClient = new ApiClient(trpcClient, state);
			} else {
				// For unauthenticated, dont provide a trpc client.
				apiClient = new ApiClient(undefined, state);
			}
			setContext('apiClient', apiClient);
		}
	}
</script>

<div
	style="
            background-color: {primary};
            color: {secondary};
        "
	class="
            font-mmono
            min-h-screen
            h-fit
            w-full
        "
>
	<div class="flex p-7">
		<h1
			class="
            text-4xl
            pr-20
            font-bold
            cursor-pointer
            hover:underline
            "
			on:keyup={() => goto('/')}
			on:click={() => goto('/')}
		>
			HackLine.io
		</h1>
		<div class="flex gap-6 items-center">
			{#if data.session?.user && data.stripeInfo.paymentStatus !== 'inactive'}
				<Button text="Timeline" onClick={() => goto('/app/timeline')} />
				<Button text="Account" onClick={() => goto('/app/account')} />
			{/if}
			<Button text="Docs" onClick={() => goto('/docs')} />
			<Button text="Guides" onClick={() => goto('/guides')} />
			{#if !data.session?.user || data.stripeInfo.paymentStatus !== 'active'}
				<Button text="Pricing" onClick={() => goto('/pricing')} />
			{/if}
		</div>
		<div class="flex items-center justify-end basis-full gap-10">
			{#if !data.session?.user}
				<span
					on:keyup={() => goto('/login')}
					on:click={() => goto('/login')}
					class="
                    cursor-pointer
                    text-xl
                    font-bold
                    hover:underline
                "
				>
					Log in
				</span>
			{/if}
			<Auth />
		</div>
	</div>
	<slot />
</div>
