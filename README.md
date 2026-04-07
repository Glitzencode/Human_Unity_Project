# Human Unity — Website

A fully functional static site for the Human Unity project. Ready to deploy on GitHub Pages.

## File Structure

```
human-unity/
├── index.html              ← Landing page
├── problem.html            ← The problem diagnosis
├── framework.html          ← The Human Unity Framework
├── initiatives.html        ← All initiatives overview
├── get-involved.html       ← Join / chapter finder / skills form (Priority #1)
├── resources.html          ← Full resource library
├── vision.html             ← The 5-year vision
├── about.html              ← About, philosophy, FAQ
├── start-a-chapter.html    ← Chapter registration form
├── css/
│   └── main.css            ← All styles (DM Serif Display + DM Sans)
├── js/
│   ├── main.js             ← Nav, counter, forms, chapter finder
│   └── partials.js         ← Shared nav, ticker, footer (inject into all pages)
├── initiatives/
│   ├── community-ground.html
│   ├── conflict-bridge.html
│   ├── leadership-lab.html
│   ├── coordination-layer.html  ← stub (ready to expand)
│   └── common-story.html        ← stub (ready to expand)
└── images/                 ← DROP YOUR PHOTOS HERE
    (see photo placeholders on each page for exact filenames)
```

## Deploy to GitHub Pages

### Step 1: Create a GitHub repository
1. Go to github.com → New repository
2. Name it `human-unity` (or anything you want)
3. Set to Public
4. Do NOT initialize with README (you already have one)

### Step 2: Upload the files
**Option A — Drag and drop (easiest):**
1. On your new repo page, click "uploading an existing file"
2. Drag the entire `human-unity/` folder contents into the upload area
3. Commit changes

**Option B — Git command line:**
```bash
cd human-unity
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repo → Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)
4. Click Save
5. Your site will be live at: `https://YOUR_USERNAME.github.io/REPO_NAME/`

### Step 4: Custom domain (optional)
1. In Settings → Pages → Custom domain
2. Enter your domain (e.g. humanunity.org)
3. Add a CNAME file to your repo root with your domain
4. Update your DNS with your domain registrar

---

## Adding Your Photos

Every page has photo placeholders with the exact filename to use.
Drop your photos into the `/images/` folder with these names:

| Placeholder | Filename |
|-------------|----------|
| Homepage event 1 | `images/event-1.jpg` |
| Homepage event 2 | `images/event-2.jpg` |
| Homepage event 3 | `images/event-3.jpg` |
| Community Ground | `images/community-ground.jpg` |
| Community Ground detail 1 | `images/cg-event-1.jpg` |
| Community Ground detail 2 | `images/cg-event-2.jpg` |
| Conflict Bridge | `images/conflict-bridge.jpg` |
| Conflict Bridge detail | `images/conflict-bridge-1.jpg` |
| Leadership Lab cohort | `images/leadership-lab.jpg` |
| Lab detail | `images/lab-cohort.jpg` |
| Coordination Layer | `images/coordination-layer.jpg` |
| Common Story | `images/common-story.jpg` |

**Replace placeholders with images:**
Find the photo-placeholder div and replace with:
```html
<img src="images/your-photo.jpg" alt="Description" style="width:100%;border-radius:var(--radius);aspect-ratio:16/9;object-fit:cover">
```

---

## Email Integration

The signup forms currently store emails in localStorage (for demo).
To capture real emails, replace the form submit handler in `js/main.js` with a POST to:

- **Mailchimp**: Use their embedded form API
- **Buttondown**: Simple POST to their API
- **ConvertKit**: Their form embed
- **Formspree**: Zero-backend form handler — just change `action` attribute

**Quickest integration (Formspree — free tier):**
1. Sign up at formspree.io
2. Create a form, get your endpoint
3. In `get-involved.html`, change the skills form action:
```html
<form action="https://formspree.io/f/YOUR_ID" method="POST">
```

---

## What's Ready to Build Next

- [ ] Coordination-layer.html full initiative page
- [ ] Common-story.html full initiative page  
- [ ] Admin dashboard for email signups
- [ ] Chapter map (Mapbox or Google Maps embed)
- [ ] Blog / updates section
- [ ] Member portal (requires backend)
