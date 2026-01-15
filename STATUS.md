# HiveMind AR - Project Status

## Current Subscription Tiers (Individual Artists)

| Tier | Slug | Price | Artworks |
|------|------|-------|----------|
| Free | free | $0 | 3 |
| Artist | artist | $12 | 10 |
| Established | established | $19 | 25 |
| Professional | professional | $29 | 75 |

## Completed Work

### Subscription & Pricing
- [x] Added Gallery tier (now renamed to "Established")
- [x] Reduced artwork limits across all tiers (was 5/25/50/9999, now 3/10/25/75)
- [x] Renamed "Gallery" tier to "Established" to avoid confusion with gallery businesses
- [x] Updated upgrade.html to mark Established as recommended

### AR Branding
- [x] Free tier AR views show "Powered by HiveMind AR" badge (artist.html)
- [x] Dashboard shows branding note for free tier users
- [x] Upgrade page explains branding difference between free and paid

### SQL Migrations Run
- [x] sql/add-gallery-tier.sql
- [x] sql/update-artwork-limits.sql
- [x] sql/rename-gallery-to-established.sql

## Pending / Future Work

### Gallery Business Accounts (v2)
Schema designed but NOT implemented yet:
- sql/gallery-accounts-schema.sql (DO NOT RUN - for future use)

Gallery tiers planned:
| Tier | Price | Artworks | Artist Profiles |
|------|-------|----------|-----------------|
| Gallery | $49 | 100 | 5 |
| Gallery Pro | $99 | 300 | 15 |

Features needed:
- [ ] Account type selection during signup (individual vs gallery)
- [ ] Gallery dashboard to manage multiple artists
- [ ] Artist profile CRUD for gallery owners
- [ ] Gallery public page with artist listings
- [ ] URL structure: /gallery/{gallery-slug}/{artist-slug}

### Payments
- [ ] PayPal integration - plan IDs need to be created in PayPal Dashboard
- [ ] Airwallex integration - waiting for API credentials from Manila partner

### Other
- [ ] Custom domain support for Professional tier
- [ ] Featured artist listings for Professional tier

## Key Files

- `pages/subscriber/upgrade.html` - Subscription upgrade page
- `pages/subscriber/dashboard.html` - Subscriber dashboard
- `pages/gallery/artist.html` - Public artist gallery (shows AR branding for free tier)
- `sql/` - Database migrations

## Recent Commits

```
eb4d779 Rename Gallery tier to Established, add gallery business schema
5a440fd Update artwork limits to more conservative values
a656401 Add Gallery tier subscription plan ($19/month)
8499d76 Add AR branding communication for free tier subscribers
```
