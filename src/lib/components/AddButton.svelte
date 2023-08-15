<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import type ApiClient from '$lib/ApiClient';
	import { browser } from '$app/environment';
	import { getContext } from 'svelte';

	let apiClient: ApiClient;
	if (browser) {
		apiClient = getContext('apiClient') as ApiClient;
	}
	export let rangeStart: Date;
	export let rangeEnd: Date;

	function addDefault() {
		let title = apiClient.getSettingString('default-title');
		let start = new Date((rangeStart.getTime() + rangeEnd.getTime()) / 2);
		let end = new Date(start.getTime() + 15 * 60 * 1000);
		let interval = { id: -3, title: title, start: start, end: end };
		apiClient.previewAdd(interval);
	}
</script>

<Nav text="Add" onClick={addDefault} />
