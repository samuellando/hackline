<script lang="ts">
	import { getContext } from 'svelte';
	import type { palette } from '$lib/types';

	export let onClick: () => void;
	export let text: string;
	export let className = '';
	let secondary: string = (getContext('palette') as palette).secondary;
</script>

<div style="--secondary: {secondary}">
	<button
		class={`
    whitespace-nowrap
    inline-flex
    items-center
    font-mono
    font-bold
    text-[var(--secondary)] hover:underline ` + className}
		on:click={() => onClick()}
		>{text}
	</button>
</div>
