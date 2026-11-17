# SEO and analytics

The island is a full-screen WebGL canvas, so search engines read the server-rendered copy in `app/page.jsx` and `app/projects/[id]/page.jsx`, the page metadata, `app/sitemap.js` and the JSON-LD on the home page and each project page (`lib/jsonld.js`). The canonical origin is `SITE_URL` in `lib/site.js`. `public/llms.txt` lists every project page for AI assistants, and `public/humans.txt` names the site's tools.

## Owner steps

1. Set `NEXT_PUBLIC_CLARITY_ID` in the Vercel project (Microsoft Clarity). `NEXT_PUBLIC_*` values are inlined at build time: redeploy after changing it, or the build keeps the old value.
2. In Google Search Console, submit `https://www.evilseal.si/sitemap.xml`. `app/robots.js` already points crawlers there.
