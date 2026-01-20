const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000; // Render provides PORT via env variable

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Instagram Proxy Backend Running',
        endpoints: {
            home: 'GET /',
            services: 'GET /services',
            fetchVideo: 'POST /fetch-video',
            test: 'GET /test'
        },
        deployed: true,
        timestamp: new Date().toISOString()
    });
});

// Services endpoint
app.get('/services', (req, res) => {
    res.json({
        services: [
            {
                name: 'fetch-video',
                method: 'POST',
                endpoint: '/fetch-video',
                description: 'Fetch Instagram video using third-party services',
                parameters: {
                    instagramUrl: 'string (required) - Instagram reel URL'
                }
            }
        ]
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        status: 'Server is working',
        timestamp: new Date().toISOString(),
        note: 'Instagram blocks direct API calls. This server provides alternative download methods.'
    });
});

// Main Instagram video download endpoint
app.post('/fetch-video', async (req, res) => {
    try {
        console.log('📥 Received request for Instagram video');
        
        const { instagramUrl } = req.body;
        
        if (!instagramUrl || !instagramUrl.includes('instagram.com')) {
            return res.status(400).json({ 
                error: 'Valid Instagram URL is required',
                example: 'https://www.instagram.com/reel/C1qN2wXsjJG/' 
            });
        }

        console.log('🔗 Processing URL:', instagramUrl);

        // Extract shortcode from URL
        const shortcode = instagramUrl.split('/').filter(Boolean).pop();
        console.log('🔑 Shortcode:', shortcode);

        // Return download options (since direct APIs are blocked)
        res.json({
            success: true,
            url: instagramUrl,
            shortcode: shortcode,
            note: 'Instagram blocks direct API access. Use these services:',
            download_methods: [
                {
                    service: 'SaveTube',
                    link: `https://savetube.app/instagram?url=${encodeURIComponent(instagramUrl)}`,
                    instructions: 'Visit this link and click download'
                },
                {
                    service: 'Instagram Video Downloader',
                    link: 'https://instadownloader.io/',
                    instructions: 'Paste your URL on this website'
                },
                {
                    service: 'SSYoutube (works for Instagram)',
                    link: `https://ssyoutube.com/watch?v=${encodeURIComponent(instagramUrl)}`,
                    instructions: 'Works for Instagram videos too'
                }
            ],
            alternative: 'For development, consider using Instagram Official API with business account',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            error: 'Server error',
            details: error.message
        });
    }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        available_endpoints: ['GET /', 'GET /services', 'POST /fetch-video', 'GET /test']
    });
});

// CRITICAL FOR RENDER: Listen on 0.0.0.0 and use PORT from environment
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🚀 Ready for Render deployment`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});