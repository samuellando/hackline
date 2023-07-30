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
				apiClient = new ApiClient(null, state);
			}
			setContext('apiClient', apiClient);
		}
	}

	// Set up the API cleint
	// - If the user is not authenticated, don't provide a trpc cleint, and dia
	// Get the color pallete for the user.
	// Update $page.data
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
	<div class="pt-5 pr-10 flex gap-10 justify-end">
		{#if data.session?.user}
			{#if $page.url.pathname == '/timeline'}
				<Button text="Settings" onClick={() => goto('/settings')} />
			{:else}
				<Button text="Back" onClick={() => goto('/timeline')} />
			{/if}
		{/if}
		<Auth />
	</div>
	<h1
		class="
        mt-10
        text-6xl
        text-center
   "
	>
		HackLine.io
	</h1>
	<slot />
</div>
