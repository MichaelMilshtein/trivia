# Nostalgic Decades Trivia — AI handoff and project guide

Last updated: 2026-05-10

## Purpose

This document is written primarily as an AI handoff prompt. When continuing this project, read this file first. Treat it as the current project memory, architecture guide, and implementation guardrail.

The project is not just a generic trivia app. It is becoming the public digital trivia/game extension of the **Lenny Lenski Nostalgic Decades** book/content brand.

---

## 1. Project identity

Public-facing name: **Nostalgic Decades Trivia**

Older/internal name: **Trivia Sandbox**. Do not use “Trivia Sandbox” publicly unless referring to internal development history.

Live public game:

```text
https://trivia.lennylenski.com
```

Live Admin:

```text
https://trivia.lennylenski.com/admin
```

Main Lenny Lenski website:

```text
http://www.lennylenski.com
```

GitHub repo:

```text
https://github.com/MichaelMilshtein/trivia
```

Local path:

```text
~/Documents/github/trivia
```

Hostinger deployment folder:

```text
domains/trivia.lennylenski.com/public_html
```

Deploy the **contents of `dist/`**, not the `dist` folder itself.

Expected deployed structure:

```text
public_html/
  index.html
  .htaccess
  assets/
  images/
  docs/
```

---

## 2. Current workflow

Current working workflow:

```text
ChatGPT = teacher / architect / reviewer
Codex = coding worker in GitHub repo
GitHub = source of truth
Local machine = build/test as needed
Hostinger = live published copy
Supabase = database/auth/backend-as-a-service
```

GitHub remains the source of truth. Hostinger is only the deployed copy.

Manual deployment is acceptable for now. GitHub Actions/FTP automation may be added later as a manual-trigger workflow, but should not be forced while development is still active.

Manual deployment:

```bash
cd ~/Documents/github/trivia
npm run build
```

Then upload the **contents** of:

```text
dist/
```

to:

```text
domains/trivia.lennylenski.com/public_html
```

Important: the live site will not change until `npm run build` is run and the updated `dist` output is uploaded.

---

## 3. SPA routing and `.htaccess`

Because this is a Vite single-page app, direct routes such as `/admin` require an Apache fallback.

File:

```text
public/.htaccess
```

Content:

```apache
RewriteEngine On
RewriteBase /

RewriteRule ^index\.html$ - [L]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

Vite copies `public/.htaccess` into `dist/.htaccess`. Make sure it is included in deployment.

---

## 4. Product structure

The app has two major sides.

### Public game

A polished public trivia game based on Lenny Lenski decade books.

Current public flow:

```text
Pick books → Choose areas of expertise → Select a challenge → Play → Results
```

Users can select:

- one or more books
- one or more public section/theme groups
- a challenge mode

The game supports mixed-book and mixed-section gameplay.

### Admin

A protected light-themed content-management workspace used by Michael to manage:

- book sources
- categories
- imported questions
- question editing
- active/inactive status
- question matrix/content diagnostics
- game debug settings

Admin is practical and functional, not public-style decorative.

---

## 5. Public navigation and header

Public navigation has been simplified.

Visible public nav items such as Home, Categories, Game, and Admin should not appear in the public game header.

Admin remains accessible directly at:

```text
/admin
```

Do not re-add a visible Admin button or Game button to the public game header.

The public header may include:

- branding/logo
- sound mute toggle
- small `lennylenski.com` pill/link to `http://www.lennylenski.com`

Browser tab title:

```text
Nostalgic Decades Trivia
```

Favicon is based on:

```text
public/images/brand/lenny-lenski-peek.png
```

If the favicon appears blurry, create a dedicated simplified square favicon later.

---

## 6. Public screen copy and behavior

### Books screen

Title:

```text
Pick your books
```

Instruction:

```text
Tap one or more covers to design your next challenge
```

Removed text:

```text
NOSTALGIC DECADES TRIVIA
STEP 1 · LIBRARY SHELF
```

Zero books selected button:

```text
Pick at least one book to continue
```

One or more books selected:

```text
Continue with 1 book
Continue with 2 books
...
```

### Sections screen

Title:

```text
Choose your areas of expertise
```

Instruction:

```text
Select one or more sections, then choose your challenge.
```

Removed text:

```text
NOSTALGIC DECADES TRIVIA
STEP 2 · PICK ANY TOPICS
```

The “NOW READING” section stays.

### Challenge screen

Title:

```text
Select a challenge
```

Removed text:

```text
NOSTALGIC DECADES TRIVIA
STEP 3 · LAST STEP
```

### Question screen

Removed text:

```text
NOSTALGIC DECADES TRIVIA
```

Separate feedback pill/box under answer choices was removed.

Feedback is integrated into the bottom button.

Correct:

```text
Correct!                       Next question →
```

Incorrect:

```text
Not quite!                     Next question →
```

If the incorrect answer loses the final life:

```text
Not quite!                     You are out of lives
```

“Next question” should be right-aligned near the arrow when used.

### Question metadata pills

The question card uses metadata pills.

Book/source pill:

- left-aligned
- longer/larger than other pills
- visually dominant
- color based on selected book/source dominant cover color
- indicates which book the current question came from, especially during mixed-book play

Category/difficulty pills:

- monochromatic/neutral
- right-aligned
- metadata only

Do not use a separate sentence like:

```text
This question comes from The Swinging 60s.
```

---

## 7. Lenny Lenski welcome/details pane

On the book selection screen, there is a welcome/details pane below the book selection area.

Asset:

```text
public/images/brand/lenny-lenski-avatar01.png
```

Behavior:

- default pane title: `Welcome to Nostalgic Decades Trivia`
- default body: `Pick one book, mix a few decades, or challenge yourself across the whole shelf. Lenny will guide you through the eras — one clever question at a time.`
- Lenny avatar appears on the right
- on book hover, pane shows that book’s information
- on book selection, pane stays on the most recently selected/hovered book
- if multiple books are selected, show the most recently selected/hovered book
- return to default only when no books are selected and no book is hovered
- pane body uses `sources.description`
- if description is missing/empty: `More details coming soon for this volume.`

---

## 8. Book cover images

Database stores the base image path only.

Example:

```text
/images/book-covers/70s-front.jpg
```

Code derives variants:

```text
/images/book-covers/70s-front-small.jpg
/images/book-covers/70s-front-medium.jpg
/images/book-covers/70s-front-large.jpg
```

Helper:

```text
getCoverVariantPath
```

The helper derives small/medium/large paths and falls back to the base path for unsupported or empty values.

Book selection cards use medium cover images with fallback to the stored base image URL.

Important preference: Michael is very sensitive to blurry/poorly scaled images. Use proper image variants when possible.

---

## 9. Public section/theme grouping

Raw database sections are preserved exactly as imported.

Public users see clean mapped themes, not duplicate raw section names.

Use this public mapping unless Michael changes it:

```text
World Events & Economy = World Events + Globalization & Economy
Culture & Lifestyle = Culture + Culture & Lifestyle
Entertainment & Media = Entertainment + Entertainment & Media
Food = Food
Technology & Innovation = Technology + Technology & Innovation
Mixed Bag = Bonus Pages + Decade Potpourri
```

Raw database sections may include:

```text
World Events
Culture
Culture & Lifestyle
Entertainment
Entertainment & Media
Food
Technology
Technology & Innovation
Globalization & Economy
Decade Potpourri
Bonus Pages
```

The public Sections page should show only mapped public themes.

Example: show `Culture & Lifestyle`, not both `Culture` and `Culture & Lifestyle`.

Counts combine all active questions from mapped raw sections across selected books.

When a user selects a public theme, gameplay loads questions from all raw sections mapped to that theme.

Admin Question Matrix remains raw-section based but includes a Section Mapping column.

---

## 10. Multi-book and multi-section gameplay

Public gameplay supports:

- selecting one or more books
- selecting one or more mapped public themes

Question loading should filter by:

```text
selected source/book IDs
AND any raw section mapped under selected public theme(s)
AND active questions only
```

Example: if user selects `Culture & Lifestyle` and `Mixed Bag`, load questions from:

```text
Culture
Culture & Lifestyle
Bonus Pages
Decade Potpourri
```

Across all selected books. Do not double-count.

---

## 11. Challenge and debug behavior

### Regular mode

Regular mode:

- Sprint uses 60 seconds
- correct answers are not shown before answering
- no debug hints/testing labels visible to public users

### Debug mode

Debug mode is controlled through Admin Game Settings, not by editing code.

Supabase table:

```text
game_settings
```

One row:

```text
id = default
```

Fields:

```text
id text primary key
debug_enabled boolean default false
sprint_seconds integer default 60
show_correct_answers boolean default false
updated_at timestamptz default now()
```

If settings fail to load, public game safely falls back to:

```text
debug_enabled = false
sprint_seconds = 60
show_correct_answers = false
```

Admin Game Settings allows:

- Debug mode toggle
- Sprint duration selection/input
- Show correct answers toggle
- Save button

Warning when debug is enabled:

```text
Debug mode is visible in the public game. Turn it off before release.
```

Before release verify:

```text
Debug mode = OFF
Sprint seconds = 60
Show correct answers = OFF
```

---

## 12. Sound behavior

Public game includes gentle sounds. Admin is silent.

Sound interactions may include:

- book card select
- section card select
- challenge card select
- continue/start buttons
- back/change buttons
- Play again
- Visit LennyLenski.com
- answer choice click
- next question
- correct/incorrect feedback

Sounds should be short, subtle, non-intrusive, and not annoying.

Implementation preference: browser Web Audio API, no audio files unless necessary.

Mute/unmute toggle in public game header applies to all game sounds. Admin remains silent regardless of mute state.

---

## 13. Results screen

Results screen is promotional, not a statistics report.

Old Books/Section/Challenge statistics table was removed.

Left side:

- Challenge complete
- stars
- percent score
- X of Y correct
- encouragement text
- Play again button

Right side:

- Lenny Lenski book promo grid
- show all active books
- book covers link to store/Amazon pages
- books used in the completed challenge show a small `PLAYED` badge

Promotional copy:

```text
This challenge is based on Lenny Lenski’s puzzle books — packed with trivia, word searches, crosswords, brain teasers, jokes, and more. Tap on each cover to learn more.
```

Play Again returns to the first setup screen / book selection.

---

## 14. Admin layout

Admin has a light theme.

Do not use the dark/purple public game styling in Admin.

Admin layout:

- full width
- light background
- readable dark text
- subtle borders/cards
- practical control-panel feel
- left navigation pane

Current Admin section order:

1. Dashboard / Overview
2. Game Settings
3. Book Sources
4. Categories
5. Question Import
6. Question List

Question Matrix is inside Dashboard / Overview, not a separate top-level section.

On load:

- Dashboard / Overview open
- other major sections closed

Clicking a nav item:

- opens selected section
- closes all other major sections
- highlights active item

Left nav supports icons and minimized/collapsed state.

- expanded: icons + labels
- minimized: icons only

---

## 15. Admin editing pattern

Admin editors exist for:

- Categories
- Book Sources / Sources / Books
- Questions

Preferred pattern:

- right-side sliding drawer/pane
- table/list stays in place
- Edit opens drawer populated
- New opens same drawer blank
- Save/Cancel closes drawer
- close X in top corner
- Esc closes drawer like Cancel
- closing without save should not change data
- after successful save, refresh/update relevant table/list

No more scrolling up/down to find edit forms.

---

## 16. Admin Question Import

The import workflow imports AI-generated JSON question batches.

Rules:

- top-level object with `questions` array
- every question must be standalone and read like normal trivia
- no puzzle-conversion wording
- no long copyrighted quotes/lyrics as question text
- correct answer must always be first item in `choices`
- `correct_index` must always be `0`
- `question_type` must be `mc_single`
- every question must include `section`, `category`, `difficulty`, and `is_active`
- category must be from the controlled category list
- section should be raw book section, not public mapped section
- for bonus content use `Bonus Pages`

Bad wording to avoid:

```text
from the puzzle
matches this clue
answer list
complete the blank
which word from the list
```

Correct JSON example:

```json
{
  "questions": [
    {
      "question_text": "Which decade is commonly associated with drive-ins, jukeboxes, and early rock and roll?",
      "category": "Youth Culture",
      "choices": [
        "The 1950s",
        "The 1970s",
        "The 1980s",
        "The 1990s"
      ],
      "correct_index": 0,
      "question_type": "mc_single",
      "section": "Bonus Pages",
      "difficulty": "easy",
      "is_active": true
    }
  ]
}
```

The Admin import selects the target source/book in the UI. Do not rely on `source_title` inside JSON unless importer explicitly supports it.

Batch section fallback was removed. Each JSON question should carry its own `section`.

---

## 17. Controlled categories

Use only these categories unless the database is intentionally updated:

```text
History
Movies
World Literature
Politics
Science
Economy
Environment
Geography
Fashion
Youth Culture
Advertising & Media
Music
Sports
TV & Radio
Food Culture
Technology
```

Examples of category descriptions:

```text
History — Questions about empires, wars, leaders, and historical oddities.
Movies — Questions about films, actors, directors, and famous scenes.
World Literature — Books, authors, classics, and literary oddities.
Politics — Political history, diplomacy, Cold War, scandals, and power struggles.
Science — Science, medicine, innovation, and discovery.
Economy — Economics, business, trade, growth, and postwar development.
Technology — Questions about computers, gadgets, software, the internet, gaming systems, and digital innovation.
```

---

## 18. Source/book records

Sources table is called:

```text
sources
```

Important: the table uses:

```text
short_title
```

There is no `title` column. Do not write SQL/code that assumes `sources.title`.

Known book short titles:

```text
The Booming 50s
The Swinging 60s
The Groovy 70s
The Neon 80s
The Mighty 90s
```

Known source IDs from debugging:

```text
The Booming 50s: 03f52a50-f7ee-49bc-8d7c-b2f5afe80d40
The Swinging 60s: a61796b4-c544-4feb-9d2d-aa81a905832d
The Groovy 70s: b0b96b5b-65d2-4e5e-89f5-fde30f2b8057
The Neon 80s: 82ee9b22-120e-484a-a4d1-73a20c46040a
The Mighty 90s: e5eea3aa-ad1c-44ab-bdc9-d4687bdb9501
```

Do not hardcode IDs except for temporary debugging.

### 70s source data

```text
short_title = The Groovy 70s
full_title = The Groovy '70s Word Puzzle Book: Engage with Word Searches, Crosswords, Brain Teasers, and Trivia—Featuring Quizzes, Jokes, and Games. For Adults and Seniors. (Nostalgic Decades)
front_cover_image_url = /images/book-covers/70s-front.jpg
back_cover_image_url = /images/book-covers/70s-back.jpg
store_url = https://www.amazon.com/dp/B0DBHZCPG1
author = Lenny Lenski
display_order = 3
```

### 80s source data

```text
short_title = The Neon 80s
full_title = The Neon ‘80s Word Puzzles: Challenge Your Mind with Themed Crosswords, Word Searches, Quizzes and Trivia. Ideal gift for Adults and Seniors in Large Print (Nostalgic Decades)
front_cover_image_url = /images/book-covers/80s-front.jpg
back_cover_image_url = /images/book-covers/80s-back.jpg
store_url = https://www.amazon.com/dp/B0DF7N54H4
author = Lenny Lenski
display_order = 4
```

### 90s source data

```text
short_title = The Mighty 90s
full_title = The Mighty ‘90s Word Puzzles: Ultimate Decade-Themed Crosswords, Word Searches, Quizzes, Jokes and Trivia - Large Print Relaxing Fun for Adults, Seniors and Tweens with Bonus Inside! (Nostalgic Decades)
front_cover_image_url = /images/book-covers/90s-front.jpg
back_cover_image_url = /images/book-covers/90s-back.jpg
store_url = https://www.amazon.com/dp/B0DH2M3LG1
author = Lenny Lenski
display_order = 5
```

A typo once used “The Mighty 80s” for 90s. Correct value is `The Mighty 90s`.

---

## 19. Current question counts

After imports and cleanup, approximate active counts:

```text
The Booming 50s: 313 + 55 Bonus Pages
The Swinging 60s: 307 + 126 Bonus Pages
The Groovy 70s: 825
The Neon 80s: 763
The Mighty 90s: 673
```

There is one inactive 50s test question retained for future testing.

Before adding 50s/60s Bonus Pages, matrix showed:

```text
The Booming 50s: 313
The Swinging 60s: 307
The Groovy 70s: 825
The Neon 80s: 763
The Mighty 90s: 673
Grand total: 2881
```

After adding 50s/60s Bonus Pages, expected active total:

```text
2881 + 55 + 126 = 3062
```

If the inactive test question is active, add 1.

---

## 20. Major content imports completed

### 90s — The Mighty 90s

```text
World Events — 88
Culture & Lifestyle — 88
Entertainment & Media — 92
Technology & Innovation — 83
Globalization & Economy — 98
Decade Potpourri — 118
Bonus Pages — 106
Total — 673
```

90s drove public section mapping because its raw sections differ from earlier books.

### 70s — The Groovy 70s

```text
World Events — 124
Culture — 149
Entertainment — 179
Food — 172
Technology — 112
Bonus Pages — 89
Total — 825
```

The first 70s World Events batch had bad mechanical clue wording and was regenerated. Avoid that mistake.

### 80s — The Neon 80s

```text
World Events — 130
Culture — 133
Entertainment — 132
Food — 111
Technology — 124
Bonus Pages — 133
Total — 763
```

80s Food was accidentally imported twice, producing 222 questions. It was fixed by deleting 80s/Food questions and reimporting once.

### 50s Bonus Pages

```text
The Booming 50s / Bonus Pages — 55 questions
```

### 60s Bonus Pages

```text
The Swinging 60s / Bonus Pages — 126 questions
```

---

## 21. Admin Question Matrix

Admin Dashboard / Overview includes:

```text
Question Matrix — Active Questions
```

It shows counts by raw book section and book/source.

Columns:

```text
Book Section
Section Mapping
The Booming 50s
The Swinging 60s
The Groovy 70s
The Neon 80s
The Mighty 90s
Total
```

Rows are raw database sections, not grouped public sections.

Matrix includes row totals, column totals, grand total, and zero-filled empty cells.

The matrix originally showed incorrect totals because it only read the first 1,000 rows due to Supabase default limits. It was fixed by paginating active questions in 1,000-row batches.

Any feature needing full counts/lists must avoid the Supabase 1,000-row cap.

---

## 22. Question List

Question List is the last Admin section.

It includes:

- New question button
- Fetch button
- Reset filters button
- full question table
- per-column filters under sortable headers

The old upper filter panel was removed.

Question List no longer loads all questions automatically when Admin opens. The table starts empty and prompts admins to use a filter or click Fetch to load questions. Changing a per-column filter loads questions from Supabase using the current filters; Fetch reloads the list using the current filters when data was changed outside the Admin UI. Reset filters clears every filter and returns the list to the initial empty state instead of loading all questions.

Question List also had the Supabase 1,000-row cap and was updated to load questions in paginated batches. Filter-triggered loading and the Fetch button continue to use that paginated loading approach.

Initial empty-state behavior:

- table headers and filter row remain visible
- show empty-state row inside table:
  ```text
  Use a filter or click Fetch to load questions.
  ```

No-results behavior after a fetch/filter returns no matches:

- table headers and filter row remain visible
- show empty-state row inside table:
  ```text
  No questions match the current filters.
  ```
- do not remove the whole table when filters produce no results

---

## 23. Supabase database structure

Main tables:

```text
categories
sources
questions
admin_users
game_settings
```

### categories

Known fields include:

```text
id
name
description
is_active
```

### sources

Known fields include:

```text
id
short_title
full_title
front_cover_image_url
back_cover_image_url
description
store_url
author
display_order
is_active
```

### questions

Known fields include:

```text
id
source_id
category_id
question_text
choice_a
choice_b
choice_c
choice_d
correct_index
question_type
section
difficulty
is_active
```

### admin_users

Used for RLS admin write control.

```sql
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
```

Michael admin email:

```text
michael.milshtein@gmail.com
```

### game_settings

Used for Admin-controlled debug settings.

```sql
create table if not exists public.game_settings (
  id text primary key,
  debug_enabled boolean not null default false,
  sprint_seconds integer not null default 60,
  show_correct_answers boolean not null default false,
  updated_at timestamptz not null default now()
);
```

Default row:

```text
id = default
```

---

## 24. Supabase Auth and RLS

Admin requires Supabase Auth login.

Google OAuth was attempted but not used because the Google provider was not enabled. Email/password login is used.

Admin is restricted in the app and at database level.

RLS is enabled on:

```text
categories
sources
questions
admin_users
game_settings
```

Public/anon users may read active public content only.

Admin writes are controlled by `public.admin_users`.

Do not restore broad policies such as:

```sql
using (true)
with check (true)
```

Those were flagged by Supabase Security Advisor and replaced.

Admin write policy pattern:

```sql
exists (
  select 1
  from public.admin_users au
  where au.user_id = auth.uid()
)
```

Important implementation detail: Admin requests must send the authenticated user access token:

```text
Authorization: Bearer <session.access_token>
```

Keep `apikey` as the anon key. Without the session token, RLS treats writes as anon and blocks them.

Remaining possible warning:

```text
Leaked Password Protection Disabled
```

This is separate and may require Supabase Pro. Use a strong unique Admin password.

---

## 25. Common debugging SQL

Active counts by source and section:

```sql
select
  s.id as source_id,
  s.short_title,
  s.is_active as source_active,
  q.section,
  q.is_active as question_active,
  count(*) as question_count
from questions q
left join sources s on s.id = q.source_id
group by
  s.id,
  s.short_title,
  s.is_active,
  q.section,
  q.is_active
order by
  s.short_title,
  q.section,
  q.is_active;
```

Active total:

```sql
select count(*) as active_question_total
from questions q
join sources s on s.id = q.source_id
where q.is_active = true
  and s.is_active = true;
```

Counts for one source, example The Neon 80s:

```sql
select
  section,
  count(*) as question_count
from questions
where source_id = '82ee9b22-120e-484a-a4d1-73a20c46040a'
  and is_active = true
group by section
order by section;
```

Delete an accidentally imported section, example 80s Food:

```sql
delete from questions
where source_id = '82ee9b22-120e-484a-a4d1-73a20c46040a'
  and section = 'Food';
```

Only do destructive SQL intentionally.

---

## 26. Prompt guidance for future JSON generation

Use this style when generating JSON from PDF extracts:

```text
Generate Admin import JSON for the trivia app.

Rules:
- Output a top-level object with a "questions" array.
- Each question must be standalone and read like normal trivia.
- Avoid puzzle-conversion wording such as “matches this clue,” “complete the blank,” “from the puzzle,” “from the word bank,” or “which word from the list.”
- Do not use long copyrighted lyrics, quotes, or movie dialogue directly as question text.
- Convert lyric/quote material into safer factual trivia when possible.
- Use exactly four choices.
- Correct answer must be first in choices.
- correct_index must be 0.
- question_type must be "mc_single".
- section must be the raw book section exactly, for example "World Events", "Culture", "Food", or "Bonus Pages".
- category must be one of the approved categories.
- difficulty should usually be "easy", "medium", or "hard".
- is_active must be true.
- Keep questions clean, factual, and suitable for general audiences.
```

Example:

```json
{
  "questions": [
    {
      "question_text": "Which 1970s scandal led to President Richard Nixon’s resignation?",
      "category": "Politics",
      "choices": [
        "Watergate",
        "Iran-Contra",
        "Teapot Dome",
        "Whitewater"
      ],
      "correct_index": 0,
      "question_type": "mc_single",
      "section": "World Events",
      "difficulty": "easy",
      "is_active": true
    }
  ]
}
```

---

## 27. Codex/AI guardrails

When making changes:

- Do not change database schema casually.
- Do not rename raw section values.
- Do not remove public section mapping.
- Do not re-add visible public Admin/Game/Home/Categories nav links.
- Do not break `/admin`.
- Do not disable RLS.
- Do not weaken `admin_users` policies.
- Do not fetch only first 1,000 rows where full counts/lists are needed.
- Do not introduce puzzle-clue wording in generated questions.
- Do not use long copyrighted quotes/lyrics as question text.
- Do not remove `.htaccess`.
- Do not upload raw source files to Hostinger; deploy `dist/` output.
- Do not use `sources.title`; use `sources.short_title`.

---

## 28. Michael’s preferences for this project

Michael prefers:

- short step-by-step coding guidance
- practical Codex prompts
- GitHub as source of truth
- Hostinger as deployment target only
- polished public design, not “sandboxy”
- Admin practical and efficient
- no sloppy/blurry images
- no giant unnecessary headings
- concise UI text
- natural standalone trivia questions
- no puzzle-clue phrasing

Michael dislikes:

- visible Admin/public dev nav in the game
- duplicate headers
- giant unnecessary titles
- blurry thumbnails/logos
- scrolling to find edit forms
- silent failures in Admin
- incorrect counts due to Supabase 1,000-row caps

---

## 29. Recommended next tasks

1. Add this document to repo:

```text
docs/TRIVIA_PROJECT_GUIDE.md
public/docs/TRIVIA_PROJECT_GUIDE.md
```

2. Add Admin link:

```text
Project guide / AI handoff notes
```

URL:

```text
/docs/TRIVIA_PROJECT_GUIDE.md
```

Open in a new tab.

3. Continue Admin error-visibility improvements if not fully done.

4. Continue public polish and mobile iframe testing.

5. Optional later: manual-trigger GitHub Action to build and FTP deploy to Hostinger.

---

## 30. One-sentence AI orientation

This is a Vite/Supabase static trivia app deployed to Hostinger as `trivia.lennylenski.com`, with a polished public Lenny Lenski “Nostalgic Decades Trivia” game and a protected light-themed Admin for managing book sources, categories, imported questions, debug settings, and content diagnostics; preserve raw database sections while mapping them into cleaner public themes, keep GitHub as source of truth, deploy `dist/` to Hostinger, and never break Supabase RLS/Admin auth or the JSON import rules.
