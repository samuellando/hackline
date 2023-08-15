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
		if (!confirm('Are you sure? this will break any applications using this key!')) {
			return;
		}
		let trpcClient = trpc($page);
		await trpcClient.deleteApiKey.mutate();
		apiKey = await trpcClient.getApiKey.query();
	}

	let content: Content;

	let errors: ContentErrors | null = null;

	async function save() {
		let newSettings;
		if (errors == null) {
			if ('text' in content) {
				newSettings = JSON.parse((content as TextContent).text);
			} else {
				newSettings = (content as JSONContent).json;
			}

			await apiClient.setSettings(newSettings);
		}
	}
</script>

<div class="flex flex-col min-h-screen">
	<div class="basis-36" />
	{#if !loading}
		<p class="text-5xl pb-5 text-center">Settings</p>
		<hr class="pb-5" />
		<div class="flex flex-col items-center">
			{#if errors == null}
				<div class="px-5 pb-5">
					<Button onClick={save} text="Save" />
				</div>
			{:else}
				<div class="px-5 pb-5">
					<Button
						onClick={() => {
							alert("Can't save with errors");
						}}
						text="Save"
					/>
				</div>
			{/if}
			<div class="my-json-editor lg:w-1/2">
				<JSONEditor
					bind:content
					mode={Mode.text}
					onChange={(_b, _a, { contentErrors }) => {
						errors = contentErrors;
					}}
				/>
			</div>
		</div>

		<p class="text-5xl py-5 text-center">Billing</p>
		<hr class="pb-5" />
		<div class="flex flex-col items-center">
			{#if stripeInfo.customerId && stripeInfo.paymentStatus == 'active'}
				<form action="/app/payment?/dashboard" method="POST">
					<button type="submit">Billing</button>
				</form>
			{:else}
				<Button onClick={() => goto('/#pricing')} text="Subscribe" />
			{/if}
		</div>

		<p class="text-5xl py-5 text-center">API key</p>
		<hr class="pb-5" />
		<div class="flex flex-col items-center h-screen gap-2 px-5">
			<p class="text-xl">
				This is your API key. It is used to authenticate your requests to the API, it will only show
				once, so be sure to copy it!
			</p>
			<p class="text-2xl">Api Key: {apiKey}</p>
			<Button onClick={reset} text="Reset" />
		</div>
	{/if}
</div>

<style>
	.my-json-editor {
		/* define a custom theme color */
		--jse-theme-color: var(--primary);
		--jse-theme-color-highlight: var(--secondary);
	}
</style>
