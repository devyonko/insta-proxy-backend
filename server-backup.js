// server.js - COMPLETE STEP 2 WITH ROTATION LOGIC
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS for your Vercel app
app.use(cors({
  origin: ['https://instavault.vercel.app', 'http://localhost:3000', 'http://localhost:5173']
}));

app.use(express.json());

// ==================== INSTAGRAM DOWNLOADER SERVICES ====================
const DOWNLOADER_SERVICES = [
  {
    name: 'SaveFrom',
    url: 'https://en.savefrom.net/download-from-instagram',
    method: 'POST',
    selector: 'a.download-link',
    linkAttr: 'href'
  },
  {
    name: 'InstaSave',
    url: 'https://instasave.website/download',
    method: 'POST',
    selector: 'a.download-button',
    linkAttr: 'href'
  },
  {
    name: 'igram.io',
    url: 'https://igram.io/dl/',
    method: 'GET',
    paramKey: 'url',
    selector: 'a.download',
    linkAttr: 'href'
  },
  {
    name: 'DownloadGram',
    url: 'https://downloadgram.com/',
    method: 'POST',
    selector: 'a.download_link',
    linkAttr: 'href'
  }
];

// ==================== HELPER FUNCTION ====================
async function tryDownloadService(instagramUrl, service) {
  try {
    let response;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };

    if (service.method === 'POST') {
      const formData = new URLSearchParams();
      formData.append('url', instagramUrl);
      response = await axios.post(service.url, formData, { headers, timeout: 10000 });
    } else {
      const params = { [service.paramKey]: instagramUrl };
      response = await axios.get(service.url, { params, headers, timeout: 10000 });
    }

    const $ = cheerio.load(response.data);
    const downloadLink = $(service.selector).first();

    if (downloadLink.length && downloadLink.attr(service.linkAttr)) {
      let videoUrl = downloadLink.attr(service.linkAttr);
      
      if (videoUrl && !videoUrl.startsWith('http')) {
        const baseUrl = new URL(service.url);
        videoUrl = baseUrl.origin + videoUrl;
      }
      
      return { success: true, source: service.name, videoUrl: videoUrl };
    }
    
    return { success: false, source: service.name, error: 'Download link not found' };
    
  } catch (error) {
    return { success: false, source: service.name, error: error.message };
  }
}

// ==================== ROUTES ====================

// MAIN ENDPOINT for your Vercel app
app.post('/fetch-video', async (req, res) => {
  const { instagramUrl } = req.body;
  
  console.log(`📥 Received request for: ${instagramUrl}`);
  
  if (!instagramUrl || !instagramUrl.includes('instagram.com')) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid Instagram URL'
    });
  }
  
  // Try each service
  for (const service of DOWNLOADER_SERVICES) {
    console.log(`🔄 Trying ${service.name}...`);
    const result = await tryDownloadService(instagramUrl, service);
    
    if (result.success) {
      console.log(`✅ Success with ${service.name}!`);
      return res.json({
        success: true,
        videoUrl: result.videoUrl,
        source: result.source,
        message: `Video fetched via ${result.source}`
      });
    }
    
    console.log(`❌ ${service.name} failed: ${result.error}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
  }
  
  res.status(500).json({
    success: false,
    error: 'All download services failed. Try a different link.',
    tried: DOWNLOADER_SERVICES.map(s => s.name)
  });
});

// Homepage
app.get('/', (req, res) => {
  res.json({
    message: '✅ InstaVault Backend - Step 2 Complete!',
    status: 'Rotation logic active',
    services: DOWNLOADER_SERVICES.length,
    endpoints: {
      main: 'POST /fetch-video',
      services: 'GET /services',
      test: 'GET /test',
      health: 'GET /health'
    }
  });
});

// List all services
app.get('/services', (req, res) => {
  res.json({
    services: DOWNLOADER_SERVICES.map(s => ({
      name: s.name,
      method: s.method,
      url: s.url
    }))
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    testUrl: 'https://www.instagram.com/p/Cz8BWKavX7Z/',
    curlCommand: `curl -X POST http://localhost:${PORT}/fetch-video -H "Content-Type: application/json" -d '{"instagramUrl":"https://www.instagram.com/p/Cz8BWKavX7Z/"}'`
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 STEP 2 COMPLETE: Rotation Backend Ready!');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🌐 Your Vercel app: https://instavault.vercel.app`);
  console.log('='.repeat(60));
  console.log('\n📋 TEST IMMEDIATELY:');
  console.log('1. Open browser to http://localhost:3000');
  console.log('2. Test http://localhost:3000/services');
  console.log('3. Copy test URL from http://localhost:3000/test');
  console.log('='.repeat(60));
});