// DOM elements
const keywordsInput = document.getElementById("keywords");
const categorySelect = document.getElementById("category");
const gameNameInput = document.getElementById("gameName");
const analyzeBtn = document.getElementById("analyzeBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const summaryReport = document.getElementById("summaryReport");
const resultsSection = document.getElementById("resultsSection");
const resultsContainer = document.getElementById("resultsContainer");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");

// Tab elements
const generalTab = document.getElementById("generalTab");
const gameTab = document.getElementById("gameTab");
const generalSearch = document.getElementById("generalSearch");
const gameSearch = document.getElementById("gameSearch");

let currentTab = "general";

// Event listeners
analyzeBtn.addEventListener("click", performAnalysis);

// Tab switching
generalTab.addEventListener("click", () => switchTab("general"));
gameTab.addEventListener("click", () => switchTab("game"));

function switchTab(tab) {
  currentTab = tab;

  if (tab === "general") {
    generalTab.classList.add("active");
    gameTab.classList.remove("active");
    generalSearch.classList.remove("hidden");
    gameSearch.classList.add("hidden");
  } else {
    gameTab.classList.add("active");
    generalTab.classList.remove("active");
    gameSearch.classList.remove("hidden");
    generalSearch.classList.add("hidden");
  }

  // Clear previous errors
  hideError();
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
  progressSection.classList.remove("hidden");

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
        currentStep.textContent = data.message;
        videoCount.classList.add("hidden");
        currentVideo.classList.add("hidden");
        break;

      case "search_complete":
      case "filter_complete":
        currentStep.textContent = data.message;
        if (data.totalVideos) {
          totalCount.textContent = data.totalVideos;
          videoCount.classList.remove("hidden");
        }
        break;

      case "analyzing":
        currentStep.textContent =
          "Analyzing videos for copyright infringement...";
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

// Perform analysis
async function performAnalysis() {
  if (currentTab === "general") {
    performGeneralAnalysis();
  } else {
    performGameAnalysis();
  }
}

// Perform general analysis
async function performGeneralAnalysis() {
  const keywords = keywordsInput.value.trim();
  const category = categorySelect.value;

  if (!keywords && !category) {
    showError("Please enter keywords or select a category");
    return;
  }

  // Reset UI
  hideError();
  resultsContainer.innerHTML = "";
  summaryReport.classList.add("hidden");
  resultsSection.classList.add("hidden");

  // Show loading
  analyzeBtn.disabled = true;
  loadingIndicator.classList.remove("hidden");

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
    loadingIndicator.classList.add("hidden");
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

  if (!gameName) {
    showError("Please enter a game name");
    return;
  }

  // Reset UI
  hideError();
  resultsContainer.innerHTML = "";
  summaryReport.classList.add("hidden");
  resultsSection.classList.add("hidden");

  // Show loading
  analyzeBtn.disabled = true;
  loadingIndicator.classList.remove("hidden");

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
    loadingIndicator.classList.add("hidden");
    eventSource.close();
    // Hide progress after a delay
    setTimeout(() => {
      document.getElementById("progressSection").classList.add("hidden");
    }, 2000);
  }
}

// Display analysis results
function displayResults(data) {
  const { analyses, report } = data;

  if (!analyses || analyses.length === 0) {
    showError("No videos found to analyze");
    return;
  }

  // Show summary report
  if (report) {
    displaySummaryReport(report);
  }

  // Filter and display only infringing videos
  const infringingVideos = analyses.filter((a) => a.isLikelyInfringing);

  if (infringingVideos.length === 0) {
    resultsContainer.innerHTML = `
            <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                <p class="font-medium">No copyright infringement detected</p>
                <p class="text-sm">None of the analyzed videos appear to be infringing copyright.</p>
            </div>
        `;
  } else {
    infringingVideos.forEach((video) => {
      resultsContainer.appendChild(createVideoCard(video));
    });
  }

  resultsSection.classList.remove("hidden");
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

  summaryReport.classList.remove("hidden");
}

// Create video card element
function createVideoCard(analysis) {
  const card = document.createElement("div");
  card.className =
    "bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow p-6";

  const confidenceColor =
    analysis.confidenceScore >= 80
      ? "red"
      : analysis.confidenceScore >= 60
      ? "orange"
      : "yellow";

  card.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 mb-1">${escapeHtml(
                  analysis.videoTitle
                )}</h3>
                <p class="text-sm text-gray-600">Channel: ${escapeHtml(
                  analysis.channelName
                )}</p>
            </div>
            <div class="ml-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${confidenceColor}-100 text-${confidenceColor}-800">
                    ${analysis.confidenceScore}% Confidence
                </span>
            </div>
        </div>
        
        <div class="mb-4">
            <p class="text-sm font-medium text-gray-700 mb-1">Copyright Type:</p>
            <span class="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                ${capitalizeFirst(analysis.copyrightType)}
            </span>
        </div>
        
        <div class="mb-4">
            <p class="text-sm font-medium text-gray-700 mb-1">Reasons for Detection:</p>
            <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                ${analysis.reasons
                  .map((reason) => `<li>${escapeHtml(reason)}</li>`)
                  .join("")}
            </ul>
        </div>
        
        ${
          analysis.fairUseFactors && analysis.fairUseFactors.length > 0
            ? `
        <div class="mb-4">
            <p class="text-sm font-medium text-gray-700 mb-1">Potential Fair Use Factors:</p>
            <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                ${analysis.fairUseFactors
                  .map((factor) => `<li>${escapeHtml(factor)}</li>`)
                  .join("")}
            </ul>
        </div>
        `
            : ""
        }
        
        <div class="flex gap-2 mt-4">
            <a href="https://www.youtube.com/watch?v=${analysis.videoId}" 
               target="_blank" 
               class="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                View on YouTube
                <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
            </a>
        </div>
    `;

  return card;
}

// Show error message
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove("hidden");
}

// Hide error message
function hideError() {
  errorMessage.classList.add("hidden");
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

// Display game analysis results
function displayGameResults(data) {
  const {
    strikableVideos,
    keywords,
    totalVideosAnalyzed,
    strikableVideosCount,
    gameName,
  } = data;

  // Show summary report
  const summaryHtml = `
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 class="text-2xl font-semibold mb-4">Game Cheat Analysis: ${escapeHtml(
        gameName
      )}</h2>
      
      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <div class="bg-gray-50 p-4 rounded">
          <p class="text-sm text-gray-600">Total Videos Analyzed</p>
          <p class="text-2xl font-bold text-gray-900">${totalVideosAnalyzed}</p>
        </div>
        <div class="bg-red-50 p-4 rounded">
          <p class="text-sm text-gray-600">Strikable Videos Found</p>
          <p class="text-2xl font-bold text-red-600">${strikableVideosCount}</p>
        </div>
        <div class="bg-blue-50 p-4 rounded">
          <p class="text-sm text-gray-600">Keywords Searched</p>
          <p class="text-2xl font-bold text-blue-600">${
            keywords.topKeywords.length + 1
          }</p>
        </div>
      </div>
      
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-2">Keywords Used:</h3>
        <div class="flex flex-wrap gap-2">
          <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">
            ${escapeHtml(keywords.mainKeyword)}
          </span>
          ${keywords.topKeywords
            .slice(0, 5)
            .map(
              (k) => `
            <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm">
              ${escapeHtml(
                k.keyword
              )} (${k.monthlySearches.toLocaleString()} searches/mo)
            </span>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;

  summaryReport.innerHTML = summaryHtml;
  summaryReport.classList.remove("hidden");

  // Display strikable videos
  if (strikableVideos.length === 0) {
    resultsContainer.innerHTML = `
      <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
        <p class="font-medium">No strikable videos found</p>
        <p class="text-sm">None of the analyzed videos appear to be clear copyright infringement.</p>
      </div>
    `;
  } else {
    // Create link list
    const linkListHtml = `
      <div class="bg-white rounded-lg shadow-sm p-6">
        <h3 class="text-lg font-semibold mb-4">Strikable Videos (${
          strikableVideos.length
        })</h3>
        <p class="text-sm text-gray-600 mb-4">
          Below are YouTube videos that likely infringe on ${gameName} copyright:
        </p>
        
        <div class="space-y-3">
          ${strikableVideos
            .map(
              (video, index) => `
            <div class="border-l-4 border-red-500 pl-4 py-2">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <p class="font-medium text-gray-900">${
                    index + 1
                  }. ${escapeHtml(video.title)}</p>
                  <p class="text-sm text-gray-600">Channel: ${escapeHtml(
                    video.channel
                  )} | Confidence: ${video.confidenceScore}%</p>
                  <p class="text-sm text-gray-500">Found with: "${escapeHtml(
                    video.keyword
                  )}"</p>
                  <a href="${video.url}" 
                     target="_blank" 
                     class="text-blue-600 hover:text-blue-800 text-sm break-all">
                    ${video.url}
                  </a>
                </div>
                <button onclick="copyToClipboard('${video.url}')" 
                        class="ml-4 p-2 text-gray-500 hover:text-gray-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z">
                    </path>
                  </svg>
                </button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        
        <div class="mt-6 flex gap-3">
          <button onclick="copyAllLinks()" 
                  class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm">
            Copy All Links
          </button>
          <button onclick="exportToCSV()" 
                  class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
            Export as CSV
          </button>
        </div>
      </div>
    `;

    resultsContainer.innerHTML = linkListHtml;

    // Store data for export functions
    window.currentStrikableVideos = strikableVideos;
    window.currentGameName = gameName;
  }

  resultsSection.classList.remove("hidden");
}

// Copy single link to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show temporary success message
    const toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg";
    toast.textContent = "Link copied!";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });
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
