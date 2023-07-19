<script lang="ts">
	export let onClick: Function;
	export let text: string;
	export let primary: string = 'black';
	export let secondary: string = 'white';
</script>

<div style="--primary: {primary}; --secondary: {secondary}">
    <button class="
    border rounded-full
    p-1 text-sm w-14 min-w-fit h-10 
    font-mono 
    text-[var(--secondary)] hover:text-[var(--primary)] 
    bg-[var(--primary)] hover:bg-[var(--secondary)]
    " on:click={() => onClick()}>{text} </button>
</div>
