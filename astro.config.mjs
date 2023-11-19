import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact'

export default defineConfig({
	integrations: [ preact() ],
	site: 'https://modular-things.github.io',
	base: "."
})