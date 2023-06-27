<script lang="ts">
	export let live: boolean;
</script>

{#if live}
	<p>&#11044; Live</p>
{:else}
	<p>&nbsp;</p>
{/if}

<style>
	p {
		color: red;
	}
</style>
