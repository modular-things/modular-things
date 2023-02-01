This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Project structure

This project's structure is based on a few libraries/systems I've found to work particularly well for building maintainable and extensible React applications that aren't too confusing to reason about.

- [`niue`](https://github.com/Merlin04/niue): a simple state management/event library for React that I built a while back. `lib/state.ts` contains the global state store which can be accessed and patched from anywhere in the React app. `lib/events.ts` contains some event definitions that components can subscribe to/dispatch to ease cross-component communication.
- [`theme-ui`](https://theme-ui.com): a library for styling React apps based on a global theme (in `ui/theme.ts`). This makes it easy to make changes to the look and feel of the app. It also has a set of default components to avoid reinventing the wheel, and has some nice-to-haves that plain CSS doesn't like easy responsive styles and various shorthands for CSS properties.
- TypeScript: I find that it helps me catch more bugs quicker and makes code more self-documenting.
- Next.js: A framework for React that provides reasonable defaults (very little configuration/setup necessary) plus many other features

In general, I put parts of the application in `components`, UI components that aren't tied to the rest of the app in `ui`, and files that don't contain React components in `lib`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
