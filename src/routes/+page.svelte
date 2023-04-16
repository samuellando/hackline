<script lang="ts">
	import { onMount } from 'svelte';
	import Auth from './Auth.svelte';
	import type { User } from '@auth0/auth0-spa-js';
	import { get, post, patch, put, del } from './Api';
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

	let path: string = 'test';
	let method = 'GET';
	let data: string = '{"message": "test"}';

	function call() {
		let d = JSON.parse(data);
		switch (method) {
			case 'GET':
				get(apiUrl, path, accessToken);
				break;
			case 'POST':
				post(apiUrl, path, d, accessToken);
				break;
			case 'PATCH':
				patch(apiUrl, path, d, accessToken);
				break;
			case 'PUT':
				put(apiUrl, path, d, accessToken);
				break;
			case 'DELETE':
				del(apiUrl, path, accessToken);
				break;
		}
	}
</script>

<h1>Bootstrap</h1>
<p>Backend URL is : {apiUrl}</p>
<Auth bind:accessToken bind:userProfile bind:isAuthenticated /> <br />
<label>path: <input bind:value={path} /></label><br />
<label
	>path: <select bind:value={method}>
		<option value="GET">GET</option>
		<option value="POST">POST</option>
		<option value="PATCH">PUT</option>
		<option value="PUT">PUT</option>
		<option value="DELETE">DELETE</option>
	</select><br />
</label><br />
<label>data: <input bind:value={data} /></label><br />
<button on:click={call}>call</button>
