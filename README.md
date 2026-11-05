# 🐛 Earworm Log

A tiny static site that tracks every song stuck in my head. It's plain HTML, CSS and JS, so it deploys to GitHub Pages without a build step.

## Adding an earworm

All data lives in **`earworms.csv`**:

| column        | what goes in it                                                        |
|---------------|------------------------------------------------------------------------|
| `date`        | `YYYY-MM-DD`                                                           |
| `song`        | Song title                                                             |
| `artist`      | Who sings it                                                           |
| `lyric`       | The line looping in your head                                          |
| `youtube_url` | A YouTube link. Real `watch?v=` / `youtu.be` links get a thumbnail and play on the page |
| `type`        | `wakeup` (woke up with it) or `stuck` (got stuck during the day)       |
| `notes`       | Optional: where it came from                                           |

Wrap a field in double quotes if it contains a comma, for example `"Daisy, Daisy"`. Row order doesn't matter because the site sorts by date.

You can also use the **Log a new earworm** form at the bottom of the site. It builds the CSV line for you and links to the GitHub editor for `earworms.csv`.

The starter rows are public-domain examples. Delete them once you've added your own.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment**.
3. Set Source to **Deploy from a branch**, Branch to **master**, and folder to **/ (root)**.
4. The site appears at `https://<your-username>.github.io/earworm/`.

## Running locally

`fetch()` can't read files when you open the page with `file://`, so start a local server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
