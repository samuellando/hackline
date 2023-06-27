<script lang="ts">
	export let onClick: Function;
	export let text: string;
	export let primary: string = 'white';
	export let secondary: string = 'black';
</script>

<div style="--primary: {primary}; --secondary: {secondary};">
	<button on:click={() => onClick()}>{text} </button>
</div>

<style>
	button {
		padding: 10px;
		border-radius: 100px;
		border-style: solid;
		border-width: 1px;
		height: 50px;
		background-color: var(--primary);
		color: var(--secondary);
		border-color: var(--secondary);
	}

	button:hover {
		cursor: pointer;
		background-color: var(--secondary);
		color: var(--primary);
	}
</style>
