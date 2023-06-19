<script lang="ts">
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { auth } from '../Auth';
	import { ApiClient } from '../Api';
	import type { authDef } from '../types';

	let apiUrl: string;
	let apiClient: ApiClient;
	let authDef: authDef;

	let loading = true;

	import { JSONEditor, Mode } from 'svelte-jsoneditor';
	import type { Content, TextContent, JSONContent } from 'svelte-jsoneditor';

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		let authDef = await auth();
		if (authDef === undefined) return;
		apiClient = new ApiClient(apiUrl, authDef.accessToken);
		content = { json: apiClient.getSettings() } as JSONContent;
		loading = false;
	});

	onDestroy(() => {
		if (apiClient === undefined) return;
		apiClient.close();
	});

	afterUpdate(() => {
		if (
			typeof authDef !== 'undefined' &&
			typeof authDef.authClient !== 'undefined' &&
			authDef.isAuthenticated === false
		) {
			window.location.pathname = '/';
		}
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
	<a href="/timeline">back</a>

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
