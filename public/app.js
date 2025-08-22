// Attorney YouTube Video Finder - Modern UI JavaScript

// DOM elements
const keywordsInput = document.getElementById("keywords");
const categorySelect = document.getElementById("category");
const gameNameInput = document.getElementById("gameName");
const channelWhitelistInput = document.getElementById("channelWhitelist");
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const summarySection = document.getElementById("summarySection");
const resultsSection = document.getElementById("resultsSection");
const resultsContainer = document.getElementById("resultsContainer");
const copyStrike10Btn = document.getElementById("copyStrike10Btn");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

// Mode switching
const modeBtns = document.querySelectorAll(".mode-btn");
const searchModes = document.querySelectorAll(".search-mode");

let currentMode = "general";

// Event listeners
analyzeBtn.addEventListener("click", performAnalysis);
if (copyStrike10Btn) {
  copyStrike10Btn.addEventListener("click", copyFirst10Links);
}

// Mode switching
modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    currentMode = mode;

    // Update buttons
    modeBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Update search modes
    searchModes.forEach((m) => m.classList.remove("active"));
    document.getElementById(`${mode}SearchMode`).classList.add("active");

    // Clear inputs when switching
    clearInputs();
    hideError();
  });
});

function clearInputs() {
  keywordsInput.value = "";
  categorySelect.value = "";
  gameNameInput.value = "";
}

// Helper function to show/hide error
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove("hidden");
  errorMessage.classList.add("fade-in");
}

function hideError() {
  errorMessage.classList.add("hidden");
}

// Update header stats
let totalVideosScanned = 0;
let totalInfringementsFound = 0;

function updateHeaderStats() {
  document.getElementById("videosScanned").textContent =
    totalVideosScanned.toLocaleString();
  document.getElementById("infringementsFound").textContent =
    totalInfringementsFound.toLocaleString();
}

// Progress tracking helper
function initProgressTracking() {
  const progressSection = document.getElementById("progressSection");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const progressPercentage = document.getElementById("progressPercentage");
  const currentStep = document.getElementById("currentStep");
  const videoCount = document.getElementById("videoCount");
  const analyzedCount = document.getElementById("analyzedCount");
  const totalCount = document.getElementById("totalCount");
  const currentVideo = document.getElementById("currentVideo");
  const videoTitle = document.getElementById("videoTitle");

  // Show progress section
  loadingOverlay.classList.add("hidden");
  progressSection.classList.remove("hidden");
  progressSection.classList.add("fade-in");

  // Connect to SSE endpoint
  const eventSource = new EventSource("/api/analyze/progress");

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Update progress bar
    progressBar.style.width = `${data.progress}%`;
    progressPercentage.textContent = `${data.progress}%`;
    progressText.textContent = data.message;

    // Update step details
    switch (data.step) {
      case "keyword_research":
      case "searching":
        currentStep.innerHTML = `<i class="fas fa-search"></i><span>${data.message}</span>`;
        videoCount.classList.add("hidden");
        currentVideo.classList.add("hidden");
        break;

      case "search_complete":
      case "filter_complete":
        currentStep.innerHTML = `<i class="fas fa-filter"></i><span>${data.message}</span>`;
        if (data.totalVideos) {
          totalCount.textContent = data.totalVideos;
          videoCount.classList.remove("hidden");
        }
        break;

      case "analyzing":
        currentStep.innerHTML = `<i class="fas fa-robot"></i><span>Analyzing videos for copyright infringement...</span>`;
        if (data.current && data.total) {
          analyzedCount.textContent = data.current;
          totalCount.textContent = data.total;
          videoCount.classList.remove("hidden");
        }
        if (data.currentVideo) {
          videoTitle.textContent = data.currentVideo;
          currentVideo.classList.remove("hidden");
        }
        break;
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return eventSource;
}

// Main analysis function
async function performAnalysis() {
  if (currentMode === "game") {
    await performGameAnalysis();
  } else {
    await performGeneralAnalysis();
  }
}

// Perform general analysis
async function performGeneralAnalysis() {
  const keywords = keywordsInput.value.trim();
  const category = categorySelect.value;
  const whitelist = parseWhitelist(channelWhitelistInput.value);

  if (!keywords && !category) {
    showError("Please enter keywords or select a category");
    return;
  }

  // Reset UI
  hideError();
  resultsContainer.innerHTML = "";
  summarySection.classList.add("hidden");
  resultsSection.classList.add("hidden");

  // Show loading
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i><span>Analyzing...</span>';
  loadingOverlay.classList.remove("hidden");

  // Start progress tracking
  const eventSource = initProgressTracking();

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        keywords,
        category,
        maxResults: 50,
        channelWhitelist: whitelist,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Display results
    displayResults(data);
  } catch (error) {
    console.error("Analysis error:", error);
    showError(error.message || "Failed to analyze videos. Please try again.");
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML =
      '<i class="fas fa-play"></i><span>Start Analysis</span>';
    loadingOverlay.classList.add("hidden");
    eventSource.close();
    // Hide progress after a delay
    setTimeout(() => {
      document.getElementById("progressSection").classList.add("hidden");
    }, 2000);
  }
}

// Perform game cheat analysis
async function performGameAnalysis() {
  const gameName = gameNameInput.value.trim();
  const whitelist = parseWhitelist(channelWhitelistInput.value);

  if (!gameName) {
    showError("Please enter a game name");
    return;
  }

  // Reset UI
  hideError();
  resultsContainer.innerHTML = "";
  summarySection.classList.add("hidden");
  resultsSection.classList.add("hidden");

  // Show loading
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i><span>Analyzing...</span>';
  loadingOverlay.classList.remove("hidden");

  // Start progress tracking
  const eventSource = initProgressTracking();

  try {
    const response = await fetch("/api/analyze-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameName,
        channelWhitelist: whitelist,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // Display game results
    displayGameResults(data);
  } catch (error) {
    console.error("Game analysis error:", error);
    showError(
      error.message || "Failed to analyze game videos. Please try again."
    );
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML =
      '<i class="fas fa-play"></i><span>Start Analysis</span>';
    loadingOverlay.classList.add("hidden");
    eventSource.close();
    // Hide progress after a delay
    setTimeout(() => {
      document.getElementById("progressSection").classList.add("hidden");
    }, 2000);
  }
}

// Parse whitelist field into normalized list of channel names
function parseWhitelist(text) {
  if (!text) return [];
  return text
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^Channel:\s*/i, ""))
    .map((s) => s.replace(/^"|"$/g, ""));
}

// Display analysis results
function displayResults(data) {
  const { analyses, report } = data;

  if (!analyses || analyses.length === 0) {
    showError("No videos found to analyze");
    return;
  }

  // Update header stats
  totalVideosScanned += analyses.length;
  updateHeaderStats();

  // Show summary report
  if (report) {
    displaySummaryReport(report);
  }

  // Filter and display only infringing videos
  const infringingVideos = analyses.filter((a) => a.isLikelyInfringing);
  // Keep for copy-first-10 utility
  window.currentInfringingAnalyses = infringingVideos;
  totalInfringementsFound += infringingVideos.length;
  updateHeaderStats();

  if (infringingVideos.length === 0) {
    resultsContainer.innerHTML = `
      <div class="glass-card fade-in" style="background: rgba(38, 217, 111, 0.1); border-color: rgba(38, 217, 111, 0.2);">
        <div class="flex items-center gap-3">
          <div class="text-3xl text-green-400">
            <i class="fas fa-check-circle"></i>
          </div>
          <div>
            <p class="font-semibold text-lg mb-1">No copyright infringement detected</p>
            <p class="text-sm opacity-80">None of the analyzed videos appear to be infringing copyright.</p>
          </div>
        </div>
      </div>
    `;
  } else {
    infringingVideos.forEach((video, index) => {
      resultsContainer.appendChild(createVideoCard(video, index + 1));
    });
  }

  resultsSection.classList.remove("hidden");
  resultsSection.classList.add("fade-in");
}

// Display summary report
function displaySummaryReport(report) {
  document.getElementById("totalAnalyzed").textContent =
    report.summary.totalAnalyzed;
  document.getElementById("likelyInfringing").textContent =
    report.summary.likelyInfringing;
  document.getElementById("highConfidence").textContent =
    report.summary.highConfidence;
  document.getElementById("infringementRate").textContent =
    report.summary.percentageInfringing + "%";

  summarySection.classList.remove("hidden");
  summarySection.classList.add("fade-in");
}

// Create video card element
function createVideoCard(analysis, number) {
  const card = document.createElement("div");
  card.className = "result-card fade-in";

  const confidenceClass =
    analysis.confidenceScore >= 80 ? "confidence-high" : "confidence-medium";

  // Extract video metadata with fallbacks
  const getDuration = () => {
    const duration = analysis.duration || analysis.lengthSeconds;
    if (!duration || duration === 0) return "N/A";
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getViewCount = () => {
    const views = analysis.viewCount || analysis.views;
    if (!views || views === 0) return "N/A";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const getPublishDate = () => {
    const publishDate = analysis.publishedAt || analysis.publishedText || analysis.uploadedDate;
    if (!publishDate) return "Unknown date";
    
    // If it's already a relative time string, use it
    if (typeof publishDate === 'string' && (
      publishDate.includes('ago') || 
      publishDate.includes('day') || 
      publishDate.includes('week') || 
      publishDate.includes('month') || 
      publishDate.includes('year')
    )) {
      return publishDate;
    }
    
    try {
      const date = new Date(publishDate);
      if (isNaN(date.getTime())) return "Unknown date";
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 1) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return "Unknown date";
    }
  };

  // Extract description if available
  const description = analysis.description
    ? `<div class="result-description">
      <p>${escapeHtml(analysis.description).substring(0, 150)}${
        analysis.description.length > 150 ? "..." : ""
      }</p>
    </div>`
    : "";

  card.innerHTML = `
    <div class="result-header">
      <div class="result-info">
        <div class="result-number">RESULT #${number}</div>
        <h3 class="result-title">${escapeHtml(analysis.videoTitle)}</h3>
        <div class="result-channel">
          <i class="fas fa-user"></i>
          ${escapeHtml(analysis.channelName)}
        </div>
      </div>
      <div class="confidence-badge ${confidenceClass}">
        <i class="fas fa-exclamation-triangle"></i>
        ${analysis.confidenceScore}% Confidence
      </div>
    </div>
    
    <div class="result-meta">
      <div class="meta-item">
        <i class="fas fa-tag"></i>
        ${capitalizeFirst(analysis.copyrightType || "content")}
      </div>
      <div class="meta-item">
        <i class="fas fa-clock"></i>
        ${getDuration()}
      </div>
      <div class="meta-item">
        <i class="fas fa-eye"></i>
        ${getViewCount()} views
      </div>
      <div class="meta-item">
        <i class="fas fa-calendar"></i>
        ${getPublishDate()}
      </div>
    </div>

    ${description}
    
    <div class="result-reasons">
      <div class="reasons-label">Reasons for Detection</div>
      <div class="reasons-list">
        ${
          analysis.reasons && analysis.reasons.length > 0
            ? analysis.reasons
                .map(
                  (reason) =>
                    `<span class="reason-tag">${escapeHtml(reason)}</span>`
                )
                .join("")
            : '<span class="reason-tag">Copyright infringement detected</span>'
        }
      </div>
    </div>
    
    ${
      analysis.fairUseFactors && analysis.fairUseFactors.length > 0
        ? `
      <div class="result-reasons">
        <div class="reasons-label">Potential Fair Use Factors</div>
        <div class="reasons-list">
          ${analysis.fairUseFactors
            .map(
              (factor) =>
                `<span class="reason-tag fair-use-tag">${escapeHtml(
                  factor
                )}</span>`
            )
            .join("")}
        </div>
      </div>
    `
        : ""
    }

    ${
      analysis.keyword
        ? `
      <div class="result-keyword">
        <i class="fas fa-search"></i>
        Found with: "${escapeHtml(analysis.keyword)}"
      </div>
    `
        : ""
    }
    
    <div class="result-actions">
      <a href="https://www.youtube.com/watch?v=${analysis.videoId}" 
         target="_blank" 
         class="result-link">
        <i class="fas fa-external-link-alt"></i>
        View on YouTube
      </a>
      <button class="action-btn-small" onclick="copyVideoLink('${
        analysis.videoId
      }')" title="Copy link">
        <i class="fas fa-copy"></i>
      </button>
    </div>
  `;

  return card;
}

// Display game analysis results
function displayGameResults(data) {
  const {
    strikableVideos,
    keywords,
    totalVideosAnalyzed,
    strikableVideosCount,
    gameName,
  } = data;

  // Update header stats
  totalVideosScanned += totalVideosAnalyzed;
  totalInfringementsFound += strikableVideosCount;
  updateHeaderStats();

  // Create custom summary for game results
  const summaryData = {
    summary: {
      totalAnalyzed: totalVideosAnalyzed,
      likelyInfringing: strikableVideosCount,
      highConfidence: strikableVideos.filter((v) => v.confidenceScore >= 80)
        .length,
      percentageInfringing: (
        (strikableVideosCount / totalVideosAnalyzed) *
        100
      ).toFixed(1),
    },
  };
  displaySummaryReport(summaryData);

  // Add keyword info
  const keywordInfo = document.createElement("div");
  keywordInfo.className = "glass-card fade-in mb-4";
  keywordInfo.innerHTML = `
    <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
      <i class="fas fa-key text-accent-primary"></i>
      Keywords Used for ${escapeHtml(gameName)}
    </h3>
    <div class="flex flex-wrap gap-2">
      <span class="px-3 py-1 rounded-md text-sm font-medium" style="background: var(--accent-gradient); color: white;">
        ${escapeHtml(keywords.mainKeyword)}
      </span>
      ${keywords.topKeywords
        .slice(0, 5)
        .map(
          (k) => `
        <span class="px-3 py-1 rounded-md text-sm" style="background: var(--glass-bg); border: 1px solid var(--glass-border);">
          ${escapeHtml(
            k.keyword
          )} <span class="opacity-60">(${k.monthlySearches.toLocaleString()}/mo)</span>
        </span>
      `
        )
        .join("")}
    </div>
  `;
  summarySection.appendChild(keywordInfo);

  // Display strikable videos
  if (strikableVideos.length === 0) {
    resultsContainer.innerHTML = `
      <div class="glass-card fade-in" style="background: rgba(38, 217, 111, 0.1); border-color: rgba(38, 217, 111, 0.2);">
        <div class="flex items-center gap-3">
          <div class="text-3xl text-green-400">
            <i class="fas fa-check-circle"></i>
          </div>
          <div>
            <p class="font-semibold text-lg mb-1">No strikable videos found</p>
            <p class="text-sm opacity-80">None of the analyzed videos appear to be clear copyright infringement.</p>
          </div>
        </div>
      </div>
    `;
  } else {

    // Display each video
    strikableVideos.forEach((video, index) => {
      const analysis = {
        videoId: video.url.split("v=")[1],
        videoTitle: video.title,
        channelName: video.channel,
        isLikelyInfringing: true,
        confidenceScore: video.confidenceScore,
        reasons: video.reasons || ['Found with: "' + video.keyword + '"'],
        copyrightType: "game",
        analysisTimestamp: new Date().toISOString(),
        duration: video.duration || video.lengthSeconds,
        viewCount: video.viewCount || video.views,
        publishedAt: video.publishedAt || video.publishDate,
        description: video.description,
        keyword: video.keyword
      };
      resultsContainer.appendChild(createVideoCard(analysis, index + 1));
    });

    // Store data for export functions
    window.currentStrikableVideos = strikableVideos;
    window.currentGameName = gameName;
  }

  resultsSection.classList.remove("hidden");
  resultsSection.classList.add("fade-in");
}

// Copy single link to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show temporary success message
    const toast = document.createElement("div");
    toast.className = "fixed bottom-4 right-4 glass-card px-4 py-2 fade-in";
    toast.style.background = "rgba(88, 101, 242, 0.9)";
    toast.innerHTML = '<i class="fas fa-check mr-2"></i>Link copied!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });
}

// Copy first 10 links from the infringing list
function copyFirst10Links() {
  const list = Array.isArray(window.currentInfringingAnalyses)
    ? window.currentInfringingAnalyses
    : [];
  if (list.length === 0) {
    showError("No infringing videos available to copy");
    return;
  }
  const first10 = list.slice(0, 10);
  const links = first10
    .map((a) => `https://www.youtube.com/watch?v=${a.videoId}`)
    .join("\n");
  copyToClipboard(links);
}

// Copy all links to clipboard
function copyAllLinks() {
  if (window.currentStrikableVideos) {
    const links = window.currentStrikableVideos.map((v) => v.url).join("\n");
    copyToClipboard(links);
  }
}

// Export results as CSV
function exportToCSV() {
  if (
    !window.currentStrikableVideos ||
    window.currentStrikableVideos.length === 0
  )
    return;

  const csv = [
    ["Title", "Channel", "URL", "Confidence", "Keyword", "Reasons"],
    ...window.currentStrikableVideos.map((v) => [
      v.title,
      v.channel,
      v.url,
      v.confidenceScore + "%",
      v.keyword,
      v.reasons.join("; "),
    ]),
  ]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${window.currentGameName}_strikable_videos_${
    new Date().toISOString().split("T")[0]
  }.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Capitalize first letter
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Copy single video link
function copyVideoLink(videoId) {
  const link = `https://www.youtube.com/watch?v=${videoId}`;
  navigator.clipboard.writeText(link).then(() => {
    // Show a brief success message
    const btn = event.target.closest("button");
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.style.color = "var(--accent-primary)";
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.color = "";
    }, 1500);
  });
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  updateHeaderStats();
});
