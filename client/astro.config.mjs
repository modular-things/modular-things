import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact'

export default defineConfig({
	integrations: [preact()],
	output: 'server',
	site: 'https://astronaut.github.io',
  base: '/my-repo',
})