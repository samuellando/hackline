<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import { page } from '$app/stores';
	import { signIn, signOut } from '@auth/sveltekit/client';
</script>

<div class="flex items-center justify-end gap-10">
	{#if $page.data.session?.user}
		<Nav onClick={() => signOut({ callbackUrl: '/' })} text="Sign Out" />
	{:else}
		<Nav onClick={() => signIn('auth0', { callbackUrl: '/app/timeline' })} text="Log in" />
		<Button
			onClick={() => signIn('auth0', { callbackUrl: '/app/timeline' }, { screen_hint: 'signup' })}
			text="Try It"
		/>
	{/if}
</div>
