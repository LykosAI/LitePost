import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'LitePost',
  description: 'A lightweight, cross-platform API testing application',
  // Deployed to an Azure Static Web App at https://litepost.lykos.ai
  head: [['link', { rel: 'icon', href: '/logo.png' }]],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/getting-started' },
      {
        text: 'Features',
        items: [
          { text: 'Making Requests', link: '/making-requests' },
          { text: 'Authentication', link: '/authentication' },
          { text: 'Responses', link: '/responses' },
          { text: 'Collections', link: '/collections' },
          { text: 'Environments', link: '/environments' },
          { text: 'Testing', link: '/testing' },
        ],
      },
      { text: 'Contributing', link: '/contributing' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Making Requests', link: '/making-requests' },
        ],
      },
      {
        text: 'Core Features',
        items: [
          { text: 'Authentication', link: '/authentication' },
          { text: 'Responses', link: '/responses' },
          { text: 'Collections', link: '/collections' },
          { text: 'Environments', link: '/environments' },
          { text: 'Testing', link: '/testing' },
        ],
      },
      {
        text: 'Advanced',
        items: [
          { text: 'Pre-Request Scripts', link: '/pre-request-scripts' },
          { text: 'Response Extraction', link: '/response-extraction' },
          { text: 'SSE Streaming', link: '/streaming' },
          { text: 'GraphQL', link: '/graphql' },
          { text: 'cURL Import', link: '/curl-import' },
          { text: 'Code Snippets', link: '/code-snippets' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Settings', link: '/settings' },
          { text: 'Contributing', link: '/contributing' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/LykosAI/LitePost' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the AGPL-3.0 License.',
      copyright: 'Copyright 2025-present LykosAI',
    },
  },
})
