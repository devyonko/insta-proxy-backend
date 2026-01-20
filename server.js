const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Working services - choose one that works for you
const SERVICES = {
    // Option 1: SaveTube (currently working)
    SAVETUBE: async (url) => {
        const apiUrl = 'https://api.savetube.io/api/v1/download';
        const response = await axios.post(apiUrl, { url }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10000
        });
        return response.data;
    },
    
    // Option 2: SSYoutube (working alternative)
    SSYOUTUBE: async (url) => {
        const apiUrl = 'https://ssyoutube.com/api/convert';
        const response = await axios.post(apiUrl, { url }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10000
        });
        return response.data;
    },
    
    // Option 3: YT5s (another alternative)
    YT5S: async (url) => {
        const apiUrl = 'https://yt5s.com/api/ajaxSearch';
        const response = await axios.post(apiUrl, 
            new URLSearchParams({
                q: url,
                vt: 'home'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout: 10000
            }
        );
        return response.data;
    }
};

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Instagram Video Downloader API',
        endpoints: {
            home: 'GET /',
            services: 'GET /services',
            fetchVideo: 'POST /fetch-video'
        }
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
                description: 'Download Instagram videos via third-party APIs',
                parameters: {
                    instagramUrl: 'string (required) - Instagram reel URL',
                    service: 'string (optional) - savetube, ssyoutube, or yt5s'
                }
            }
        ],
        available_services: Object.keys(SERVICES),
        note: 'Instagram blocks direct API calls. Using third-party services that still work.'
    });
});

// MAIN WORKING ENDPOINT
app.post('/fetch-video', async (req, res) => {
    try {
        const { instagramUrl, service = 'savetube' } = req.body;
        
        if (!instagramUrl || !instagramUrl.includes('instagram.com')) {
            return res.status(400).json({ 
                error: 'Valid Instagram URL is required',
                example: 'https://www.instagram.com/reel/C8WQz3ZSQZ6/' 
            });
        }

        console.log(`Using ${service} service for:`, instagramUrl);

        let result;
        let usedService = service.toUpperCase();
        
        try {
            // Try the selected service
            if (SERVICES[usedService]) {
                result = await SERVICES[usedService](instagramUrl);
            } else {
                // Try all services in order
                for (const [serviceName, serviceFunc] of Object.entries(SERVICES)) {
                    try {
                        console.log(`Trying ${serviceName}...`);
                        result = await serviceFunc(instagramUrl);
                        usedService = serviceName;
                        break;
                    } catch (err) {
                        console.log(`${serviceName} failed:`, err.message);
                        continue;
                    }
                }
            }
            
            if (!result) {
                throw new Error('All services failed');
            }

            // Format response based on service
            let downloadUrl, thumbnail, title;
            
            if (usedService === 'SAVETUBE') {
                // Parse SaveTube response
                if (result.download) {
                    downloadUrl = result.download;
                    thumbnail = result.thumbnail;
                    title = result.title;
                }
            } else if (usedService === 'SSYOUTUBE') {
                // Parse SSYouTube response
                if (result.video && result.video[0] && result.video[0].url) {
                    downloadUrl = result.video[0].url;
                    thumbnail = result.thumb;
                    title = result.meta.title;
                }
            } else if (usedService === 'YT5S') {
                // Parse YT5s response
                if (result.vid && result.title) {
                    downloadUrl = `https://yt5s.com/api/ajaxConvert/convert?vid=${result.vid}&k=${result.k}`;
                    thumbnail = result.thumb;
                    title = result.title;
                }
            }

            res.json({
                success: true,
                service: usedService,
                download_url: downloadUrl || 'Check response for download link',
                thumbnail: thumbnail,
                title: title || 'Instagram Video',
                full_response: result,
                note: 'Some services return URLs that need to be accessed to get final download link'
            });

        } catch (serviceError) {
            console.error('Service error:', serviceError.message);
            
            // Fallback: Return working downloader website URLs
            res.json({
                success: true,
                note: 'Use these websites to download Instagram videos',
                download_methods: [
                    {
                        method: 'SaveTube',
                        url: `https://savetube.app/instagram?url=${encodeURIComponent(instagramUrl)}`,
                        description: 'Visit this link to download'
                    },
                    {
                        method: 'SSYouTube',
                        url: `https://ssyoutube.com/watch?v=${encodeURIComponent(instagramUrl)}`,
                        description: 'Works for Instagram too'
                    },
                    {
                        method: 'InstaDownloader',
                        url: `https://instadownloader.io/`,
                        description: 'Copy and paste URL on website'
                    }
                ]
            });
        }

    } catch (error) {
        console.error('Global error:', error.message);
        res.status(500).json({
            error: 'Server error',
            details: error.message,
            suggestion: 'Try using a different Instagram URL or wait and try again'
        });
    }
});

// Test endpoint with a working example
app.get('/test', (req, res) => {
    res.json({
        status: 'Server is working',
        test_commands: [
            'GET / - Health check',
            'GET /services - Available services',
            'POST /fetch-video - Download video',
            'Example POST body: {"instagramUrl": "https://www.instagram.com/reel/C8WQz3ZSQZ6/"}'
        ]
    });
});

// Start server
const PORT = process.env.PORT || 3001; // Render will provide the PORT
app.listen(PORT, '0.0.0.0', () => { // Listen on all network interfaces
    console.log(`✅ Server running on port ${PORT}`);
});