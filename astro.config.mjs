import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact'

export default defineConfig({
	integrations: [preact()],
	output: 'server',
	site: 'https://modular-things.github.io',
  base: '/modular-things',
})