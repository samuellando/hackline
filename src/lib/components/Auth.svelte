<script lang="ts">
	import Button from '$lib/components/Button.svelte';
    import { page } from '$app/stores';
	import { signIn, signOut } from '@auth/sveltekit/client';
</script>

{#if $page.data.session?.user}
	<Button onClick={signOut} text="Sign Out" />
{:else}
	<Button onClick={() => signIn("auth0")} text="Sign In" />
{/if}
