// Test script for the Attorney YouTube Video Finder API
import axios from "axios";

const API_URL = "http://localhost:3000";

// Test functions
async function testHealth() {
  console.log("\n📍 Testing Health Endpoint...");
  try {
    const response = await axios.get(`${API_URL}/api/health`);
    console.log("✅ Health check passed:", response.data);
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
  }
}

async function testGeneralSearch() {
  console.log("\n🔍 Testing General Search...");
  try {
    console.log('Searching for: "fortnite cheat" (5 videos)');
    const response = await axios.post(`${API_URL}/api/analyze`, {
      keywords: "fortnite cheat",
      maxResults: 5,
    });

    console.log(`✅ Found ${response.data.videos} videos`);
    console.log(`📊 Analyzed ${response.data.analyses.length} videos`);
    console.log("\n🎯 High confidence infringements:");

    response.data.analyses
      .filter((a) => a.confidenceScore >= 70)
      .forEach((a, i) => {
        console.log(
          `${i + 1}. ${a.videoTitle} (${a.confidenceScore}% confidence)`
        );
        console.log(`   Reasons: ${a.reasons.join(", ")}`);
      });
  } catch (error) {
    console.error("❌ Search failed:", error.response?.data || error.message);
  }
}

async function testGameCheatSearch() {
  console.log("\n🎮 Testing Game Cheat Search...");
  try {
    console.log('Searching for game: "valorant"');
    const response = await axios.post(`${API_URL}/api/analyze-game`, {
      gameName: "valorant",
    });

    console.log(`✅ Found ${response.data.totalVideosAnalyzed} total videos`);
    console.log(
      `🚨 ${response.data.strikableVideosCount} strikable videos detected`
    );

    console.log("\n📋 Top keywords searched:");
    response.data.keywords.topKeywords.slice(0, 3).forEach((kw) => {
      console.log(
        `   - ${
          kw.keyword
        } (${kw.monthlySearches.toLocaleString()} searches/month)`
      );
    });

    console.log("\n⚠️  Top 5 strikable videos:");
    response.data.strikableVideos.slice(0, 5).forEach((v, i) => {
      console.log(`${i + 1}. ${v.title}`);
      console.log(`   ${v.url}`);
      console.log(`   Confidence: ${v.confidenceScore}%`);
      console.log("");
    });
  } catch (error) {
    console.error(
      "❌ Game search failed:",
      error.response?.data || error.message
    );
  }
}

// Quick test function
async function quickTest() {
  console.log("\n⚡ Running Quick Test (2 videos only)...");
  try {
    const response = await axios.post(`${API_URL}/api/analyze`, {
      keywords: "fortnite aimbot hack",
      maxResults: 2,
    });

    console.log("✅ Quick test completed!");
    console.log(`Found ${response.data.analyses.length} videos`);
    response.data.analyses.forEach((a) => {
      console.log(
        `- ${a.videoTitle}: ${
          a.isLikelyInfringing ? "🚨 INFRINGING" : "✅ OK"
        } (${a.confidenceScore}%)`
      );
    });
  } catch (error) {
    console.error("❌ Quick test failed:", error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log("🧪 Attorney YouTube Video Finder API Test Suite");
  console.log("==============================================");

  await testHealth();
  await quickTest();

  console.log(
    "\n\nWant to run full tests? These take longer but test more features."
  );
  console.log("Run: node test-api.js full");
}

// Check command line arguments
const args = process.argv.slice(2);
if (args[0] === "full") {
  runAllTests().then(async () => {
    await testGeneralSearch();
    await testGameCheatSearch();
    console.log("\n✅ All tests completed!");
  });
} else if (args[0] === "game") {
  testGameCheatSearch();
} else if (args[0] === "search") {
  testGeneralSearch();
} else if (args[0] === "quick") {
  quickTest();
} else {
  runAllTests();
}
