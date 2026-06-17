# BigQuery Release Notes Tracker

A sleek, responsive web application that fetches, structures, and displays the latest **Google Cloud BigQuery release notes**. The application provides an elegant, interactive dashboard to search and filter release entries, and compose draft posts to share updates directly on X (formerly Twitter).

Built using a lightweight **Python Flask** backend and a custom, vanilla **HTML5 / CSS3 / JS** glassmorphic frontend.

---

## Key Features

- **Atom Feed Parser**: Automatically fetches and parses Google Cloud's BigQuery RSS feed.
- **Granular Updates**: Automatically splits day-level release notes into individual cards grouped by type (e.g. *Features*, *Issues*, *Announcements*, *Deprecations*).
- **Advanced Filters & Live Search**: Filter updates in real-time by category, or perform full-text search across descriptions and titles.
- **Smart URL Normalization**: Resolves relative links inside GCP release logs to working absolute URLs.
- **Custom X/Twitter Composer**:
  - Click any card's share icon to launch an interactive post composer modal.
  - Preview drafts in a mock-up card styled like a post on X.
  - Dynamically tracks character counts using an SVG radial progress ring.
  - Limits and warns you if drafts exceed X's standard 280-character limit.
- **In-Memory Caching**: Caches feed results for 5 minutes to optimize performance and respect Google's feed limits.
- **Responsive Glassmorphism Styling**: Styled using deep slate hues, dynamic glow details, and a responsive grid layout optimized for both desktop and mobile viewports.

---

## Tech Stack

- **Backend**: Python 3.12+, Flask, Requests, BeautifulSoup4
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Backdrop Blurs), Vanilla JS (ES6, Native `<dialog>`)
- **Assets**: Google Fonts (Inter, Outfit), FontAwesome (Iconography)

---

## Local Setup & Installation

Follow these steps to run the project locally on your machine:

### Prerequisites

Make sure you have the following installed:
- **Python 3.12** or higher
- **pip** (Python package installer)
- **Git**

### 1. Clone the Repository & Navigate

```bash
git clone https://github.com/conradwt/big-query-release-notes-fetcher.git
cd big-query-release-notes-fetcher
```

### 2. Set Up a Virtual Environment

It is recommended to use a virtual environment to manage dependencies locally:

```bash
# Create the virtual environment
python3 -m venv .venv

# Activate it (macOS/Linux)
source .venv/bin/activate

# Activate it (Windows Command Prompt)
.venv\Scripts\activate.bat

# Activate it (Windows PowerShell)
.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 4. Run the Application

Start the Flask development server:

```bash
python app.py
```

By default, the application runs on port `5001`.

### 5. Access the Web App

Open your browser and navigate to:
[**http://127.0.0.1:5001/**](http://127.0.0.1:5001/)

---

## Project Structure

```text
big-query-release-notes-fetcher/
│
├── app.py                 # Flask server application
├── requirements.txt       # Python package dependencies
├── .gitignore             # Git ignore settings
│
├── templates/
│   └── index.html         # Main dashboard layout
│
└── static/
    ├── css/
    │   └── styles.css     # UI glassmorphism layout & theme styles
    └── js/
        └── app.js         # Reactive filters, modal control & progress ring calculations
```
