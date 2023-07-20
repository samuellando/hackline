<script lang="ts">
	import { page } from '$app/stores';
	import { trpc } from '$lib/trpc/client';
	import type { PageData } from './$types';
	import ApiClient from '$lib/ApiClient';
	import { onMount } from 'svelte';
	import { State } from '$lib/types';

	export let data: PageData;

	let greeting = data.greeting;
	let loading = false;
	let trpcClient = trpc($page);
	let apiClient: ApiClient;

	onMount(async () => {
		let state;
		if ('state' in data) {
            state = State.fromSerializable(JSON.parse(data.state));
		} else {
            state = undefined;
        }
		apiClient = new ApiClient(trpcClient, state);
	});

	const loadData = async () => {
		loading = true;
		greeting = await trpcClient.greeting.query('Load');

		loading = false;
	};
</script>

<h6>Loading data in<br /><code>+page.svelte</code></h6>

<a
	href="#load"
	role="button"
	class="secondary"
	aria-busy={loading}
	on:click|preventDefault={loadData}>Load</a
>
<p>{greeting}</p>
