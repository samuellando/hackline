<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import Auth from '$lib/components/Auth.svelte';
	import Nav from '$lib/components/Nav.svelte';
	import { goto } from '$app/navigation';
	import { getContext, setContext } from 'svelte';
	import type State from '$lib/State';
	import ApiClient from '$lib/ApiClient';
	import { trpc } from '$lib/trpc/client';
	import { browser } from '$app/environment';
	import transformer from '$lib/trpc/transformer';

	export let data;

	let state: State = transformer.parse(data.state);

	let primary = state.settings['background-color'] || '#413C58';
	let secondary = state.settings['text-color'] || '#FFF1D0';

	setContext('palette', { primary, secondary });

	if (browser) {
		let apiClient = getContext('apiClient');
		let trpcClient = trpc($page);
		if (!apiClient) {
			if (data.session?.user) {
				apiClient = new ApiClient(trpcClient, state);
			} else {
				// For unauthenticated, dont provide a trpc client.
				apiClient = new ApiClient(undefined, state);
			}
			setContext('apiClient', apiClient);
		}
	}

	let y = 0;
	let dropdown = false;

	function scroll(e: Event) {
		y = (e.target as HTMLElement).scrollTop;
	}
</script>

<div
	style="
    --primary: {primary};
    --secondary: {secondary};
"
>
	<div
		on:scroll={scroll}
		class="
            scroll-smooth
            font-mmono
            min-h-screen
            h-screen
            overflow-auto
            w-screen
            bg-[var(--primary)]
            text-[var(--secondary)]
            border-b-1
            border-[var(--secondary)]
        "
	>
		<div
			class="
        fixed
        w-full
        {y > 0 ? 'bg-[var(--primary)] border-b' : ''}
        border-[var(--secondary)]
        z-10
        "
		>
			<div class="flex pt-3 pb-2 px-7 items-center">
				<Nav
					className="
            text-4xl
            lg:mr-20
            "
					onClick={() => goto('/#top')}
					text="HackLine.io"
				/>
				<div
					class={(dropdown ? 'flex' : 'hidden') +
						` 
                    lg:flex 
                    fixed 
                    lg:static 
                    -z-10
                    lg:z-0
                    gap-6 
                    items-center 
                    flex-col 
                    lg:flex-row 
                    top-10 
                    left-0
                    justify-center 
                    lg:justify-left
                    w-full 
                    lg:w-fit 
                    border-b
                    lg:border-0
                    p-2
                    pt-10
                    lg:p-0
                    bg-[var(--primary)]
                    `}
				>
					{#if data.session?.user}
						<Nav
							text="Timeline"
							onClick={() => {
								dropdown = false;
								goto('/app/timeline');
							}}
						/>
						<Nav
							text="Account"
							onClick={() => {
								dropdown = false;
								goto('/app/account');
							}}
						/>
					{/if}
					<Nav
						text="Docs"
						onClick={() => {
							dropdown = false;
							goto('/#docs');
						}}
					/>
					<Nav
						text="Guides"
						onClick={() => {
							dropdown = false;
							goto('/#guides');
						}}
					/>
					{#if !data.session?.user || data.stripeInfo.paymentStatus !== 'active' || $page.url.pathname == '/'}
						<Nav
							text="Pricing"
							onClick={() => {
								dropdown = false;
								goto('/#pricing');
							}}
						/>
					{/if}
					<div class="lg:hidden inline">
						<Auth />
					</div>
				</div>
				<div class="basis-full lg:inline hidden">
					<Auth />
				</div>
				<div class="basis-full flex justify-end lg:hidden inline">
					<Nav
						text={dropdown ? 'X' : '☰'}
						className="text-5xl"
						onClick={() => {
							dropdown = !dropdown;
						}}
					/>
				</div>
			</div>
		</div>
		<slot />
	</div>
</div>
