<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { auth } from '../Auth';
	import type { User } from '@auth0/auth0-spa-js';
	import { ApiClient } from '../Api';
	import type { log } from '../types';

	let apiUrl = '';

	var isAuthenticated: boolean;
	var accessToken: string;

	var apiClient: ApiClient;

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		let a = await auth();
		if (a === undefined) return;
		accessToken = a.accessToken;
		apiClient = new ApiClient(apiUrl, accessToken);
	});

	afterUpdate(() => {
		if (isAuthenticated === false) {
			window.location.pathname = '/';
		}
	});

	function toDateTimeString(now: Date) {
		let month = '' + (now.getMonth() + 1);
		let day = '' + now.getDate();
		let year = now.getFullYear();

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;

		return [year, month, day].join('-') + 'T' + now.toLocaleTimeString();
	}
</script>

<h1>Test</h1>
