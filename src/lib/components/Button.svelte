<script lang="ts">
	import { getContext } from 'svelte';
	import type { palette } from '$lib/types';

	export let onClick: () => void;
	export let text: string;
	let primary: string = (getContext('palette') as palette).primary;
	let secondary: string = (getContext('palette') as palette).secondary;
</script>

<div style="--primary: {primary}; --secondary: {secondary}">
	<button
		class="
    whitespace-nowrap
    inline-flex
    items-center
    p-3 text-base
    border rounded-full
    font-mono
    text-[var(--secondary)] hover:text-[var(--primary)]
    bg-[var(--primary)] hover:bg-[var(--secondary)]
    "
		on:click={() => onClick()}
		>{text}
	</button>
</div>
