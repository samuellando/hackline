<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';
	import type ApiClient from '$lib/ApiClient';
	import { trpc } from '$lib/trpc/client';
	import { page } from '$app/stores';
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';

	export let data;
	let stripeInfo = data.stripeInfo;

	let apiClient: ApiClient;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
	}

	let loading = true;

	import { JSONEditor, Mode } from 'svelte-jsoneditor';
	import type { Content, TextContent, JSONContent, ContentErrors } from 'svelte-jsoneditor';

	let apiKey: string;
	onMount(async () => {
		await apiClient.getReadyQueue();
		let trpcClient = trpc($page);
		apiKey = await trpcClient.getApiKey.query();
		content = { json: apiClient.getSettings() } as JSONContent;
		loading = false;
	});

	async function reset() {
		let trpcClient = trpc($page);
		await trpcClient.deleteApiKey.mutate();
		apiKey = await trpcClient.getApiKey.query();
	}

	let content: Content;

	let errors: ContentErrors | null = null;

	function save() {
		let newSettings;
		if (errors == null) {
			if ('text' in content) {
				newSettings = JSON.parse((content as TextContent).text);
			} else {
				newSettings = (content as JSONContent).json;
			}

			apiClient.setSettings(newSettings);
		}
	}
</script>

<div class="flex flex-col min-h-screen">
	<div class="basis-36" />
	{#if !loading}
		<p>Api Key: {apiKey}</p>
		<Button onClick={reset} text="Reset" />
		{#if stripeInfo.customerId && stripeInfo.paymentStatus == 'active'}
			<form action="/app/payment?/dashboard" method="POST">
				<button type="submit">Billing</button>
			</form>
		{:else}
			<Button onClick={() => goto('/#pricing')} text="Subscribe" />
		{/if}
		<div>
			<JSONEditor
				bind:content
				mode={Mode.text}
				onChange={(_b, _a, { contentErrors }) => {
					errors = contentErrors;
				}}
			/>
		</div>

		{#if errors == null}
			<div class="pt-5">
				<Button onClick={save} text="Save" />
			</div>
		{/if}
	{/if}
</div>
