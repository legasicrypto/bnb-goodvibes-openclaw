# Deploy (Vercel)

This project is deployed on Vercel.

## Production deploy

**Important:** the Next.js app lives in `app/`.

From repo root:

```bash
cd app
npx vercel link
npx vercel deploy --prod
```

## Notes

- If Vercel can't detect Next.js, check the Project "Root Directory" setting is `app/`.
- If you deploy from the repo root, Vercel may not detect `next` because it's not in the root `package.json`.
