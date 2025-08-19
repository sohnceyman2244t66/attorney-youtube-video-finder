# Attorney YouTube Video Finder

A tool for attorneys to efficiently identify potentially infringing YouTube videos using AI-powered analysis.

## Features

- **Keyword Search**: Search YouTube videos by keywords with AI-powered copyright infringement detection
- **Game Cheat Detection**: Specialized search for game cheat content using VidIQ keyword research
- **AI Analysis**: Uses OpenAI GPT-3.5 Turbo to analyze video titles for potential copyright infringement
- **Pre-filtering**: Smart filtering to reduce API costs by focusing on high-priority videos
- **Real-time Progress**: Live progress updates during analysis
- **Batch Processing**: Analyzes up to 25 videos simultaneously for faster results
- **Export Options**: Export results as CSV or copy all links at once

## Setup

1. Clone the repository:
```bash
git clone https://github.com/sohnceyman2244t66/attorney-youtube-video-finder.git
cd attorney-youtube-video-finder
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser to http://localhost:3000

## Configuration

The application uses environment variables for API keys. You can modify them in `src/config.js`:
- OpenAI API key for AI analysis
- Port configuration (default: 3000)

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/analyze` - Analyze videos by keywords or category
- `POST /api/analyze-game` - Search and analyze game cheat videos
- `GET /api/analyze/progress` - Server-sent events for progress updates
- `GET /api/categories` - Get available categories
- `GET /api/video/:videoId` - Get video details

## Technology Stack

- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-3.5 Turbo
- **Video Search**: yt-dlp (YouTube data extraction)
- **Frontend**: HTML, JavaScript, Tailwind CSS
- **Keyword Research**: VidIQ API integration

## Deployment

The application is configured for easy deployment on Railway.app with automatic yt-dlp installation.

## License

ISC