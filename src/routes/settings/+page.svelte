<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { ApiClient } from '$lib/Api';

	let apiUrl: string;
	let apiClient: ApiClient;

	let loading = true;

	import { JSONEditor, Mode } from 'svelte-jsoneditor';
	import type { Content, TextContent, JSONContent } from 'svelte-jsoneditor';

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		apiClient = new ApiClient(apiUrl);
		await apiClient.ready();
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
