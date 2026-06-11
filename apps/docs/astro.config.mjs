// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'FlowScript Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/prashantpaidi/flowscript-code' }],
			sidebar: [
				{
					label: 'Introduction',
					items: [
						{ label: 'Overview', slug: 'intro/overview' },
						{ label: 'Architecture (MV3)', slug: 'intro/architecture' },
						{ label: 'Tutorial: Your First Script', slug: 'intro/tutorial' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Keyboard & Expander Triggers', slug: 'guides/triggers' },
						{ label: 'Native CDP Actions', slug: 'guides/cdp-actions' },
						{ label: 'Prompt Engineering', slug: 'guides/prompt-engineering' },
					],
				},
				{
					label: 'Scripting Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});
