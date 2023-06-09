<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import Auth from './Auth.svelte';
	import { auth } from './Auth';
	import type { authDef } from './types';

	let apiUrl = '';

	var authDef: authDef = {
		authClient: undefined,
		isAuthenticated: false,
		userProfile: undefined,
		accessToken: undefined
	};

	onMount(async () => {
		apiUrl = window.location.origin;
		if (import.meta.env.DEV) {
			apiUrl = 'http://localhost:8080';
		}
		authDef = await auth();
		console.log(authDef);
	});

	afterUpdate(() => {
		if (authDef.isAuthenticated) {
			window.location.pathname = '/timeline';
		}
	});
</script>

<h1>Time Logger</h1>
<p>Backend URL is : {apiUrl}</p>

<h2>This is the landing page...</h2>

<Auth bind:authDef /> <br />
