<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
    import { browser } from '$app/environment';
    import { getContext } from 'svelte';
    import type  ApiClient from '$lib/ApiClient';
    import {trpc} from '$lib/trpc/client';
    import {page} from '$app/stores';

    let apiClient: ApiClient;
    if (browser) {
        apiClient = getContext('apiClient') as ApiClient;
    }

	let loading = true;

	import { JSONEditor, Mode } from 'svelte-jsoneditor';
	import type { Content, TextContent, JSONContent } from 'svelte-jsoneditor';

    let apiKey: string;
	onMount(async () => {
		await apiClient.getReadyQueue();
		let trpcClient = trpc($page);
        apiKey = await trpcClient.getApiKey.query();
		content = { json: apiClient.getSettings() } as JSONContent;
		loading = false;
	});

	let content: Content;

	let errors: any | null = null;

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

	onMount(async () => {});

	afterUpdate(() => {});
</script>

{#if !loading}
    <p>Api Key: {apiKey}</p>
	<div>
		<JSONEditor
			bind:content
			mode={Mode.text}
			onChange={(updatedContent, previousContent, { contentErrors, patchResult }) => {
				errors = contentErrors;
			}}
		/>
	</div>

	{#if errors == null}
		<button on:click={save}>save</button>
	{/if}
{/if}
