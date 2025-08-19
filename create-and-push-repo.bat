@echo off
echo Creating GitHub repository and pushing code...
echo.
echo Please follow these steps:
echo.
echo 1. Go to: https://github.com/new
echo 2. Repository name: attorney-youtube-video-finder
echo 3. Description: Tool for attorneys to find infringing YouTube videos using AI
echo 4. Keep it Public or Private as you prefer
echo 5. DON'T initialize with README (we already have one)
echo 6. Click "Create repository"
echo.
echo Press any key when you've created the repository...
pause > nul

echo.
echo Pushing code to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Success! Your code is now on GitHub at:
    echo https://github.com/sohnceyman2244t66/attorney-youtube-video-finder
) else (
    echo.
    echo Push failed. Make sure you created the repository with the exact name:
    echo attorney-youtube-video-finder
    echo.
    echo You can also try creating it with a different name and update the remote:
    echo git remote set-url origin https://github.com/sohnceyman2244t66/YOUR-REPO-NAME.git
)