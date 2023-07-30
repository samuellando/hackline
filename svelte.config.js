import { vitePreprocess } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [vitePreprocess()],
    // Consult https://kit.svelte.dev/docs/integrations#preprocessors
    // for more information about preprocessors
    kit: {
        adapter: adapter()
    }
};

export default config;
