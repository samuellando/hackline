<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import Auth from '../Auth.svelte';
	import type { User } from '@auth0/auth0-spa-js';

	let apiUrl = '';

	var isAuthenticated: boolean;
	var userProfile: User | undefined;
	var accessToken: string;

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
	});

	afterUpdate(() => {
		if (isAuthenticated === false) {
			window.location.pathname = '/';
		}
	});
</script>

<h1>Time Logger</h1>
<p>Backend URL is : {apiUrl}</p>

<h2>This is the settings page...</h2>

<a href="/timeline">back</a>

<Auth bind:accessToken bind:userProfile bind:isAuthenticated /> <br />
