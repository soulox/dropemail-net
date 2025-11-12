# SafeCleanEmails.com - Email Header Analyzer

A modern, clean email header analyzer that parses .eml files and raw email headers to display security, routing, and authentication information.

This is a [Next.js](https://nextjs.org/) project deployed on Cloudflare Workers using [OpenNext](https://opennext.js.org/) via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare).

## Features

- Parse .eml files and raw email headers
- Analyze SPF, DKIM, DMARC, and ARC authentication
- Visualize email routing and hop information
- Security analysis and spam scoring
- Modern, responsive UI with dark mode support
- Privacy-focused: All processing done client-side

## Getting Started

First, run:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Then run the development server (using the package manager of your choice):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Configure Google Analytics (Optional)

To enable traffic tracking:

1. Get your Google Analytics 4 (GA4) Measurement ID (format: `G-XXXXXXXXXX`)
2. Create a `.env.local` file in the root directory
3. Add your Measurement ID:
   ```env
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
4. Restart the development server

Google Analytics will automatically track page views and user interactions.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Deploying To Production

| Command                           | Action                                       |
| :-------------------------------- | :------------------------------------------- |
| `npm run build`                   | Build your production site                   |
| `npm run preview`                 | Preview your build locally, before deploying |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare    |
| `npm wrangler tail`               | View real-time logs for all Workers          |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
