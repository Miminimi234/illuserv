const fetch = require('node-fetch');
require('dotenv').config();

// Test function to verify Grok API key functionality
async function testGrokAPI() {
    console.log('🧪 Testing Grok API functionality...\n');
    
    // Check if API key is provided
    const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
    
    if (!apiKey) {
        console.log('❌ No Grok API key found!');
        console.log('Please set either GROK_API_KEY or XAI_API_KEY environment variable');
        console.log('\nTo set the API key, you can:');
        console.log('1. Create a .env file in the server directory with:');
        console.log('   GROK_API_KEY=your_actual_api_key_here');
        console.log('2. Or set it as an environment variable:');
        console.log('   export GROK_API_KEY=your_actual_api_key_here');
        console.log('3. Or pass it when running the server:');
        console.log('   GROK_API_KEY=your_key npm run dev');
        return;
    }
    
    console.log('✅ API key found:', apiKey.substring(0, 8) + '...');
    
    // Test the API call
    try {
        console.log('🔄 Making test API call to Grok...');
        
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'grok-3',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant. Respond with a simple greeting.'
                    },
                    {
                        role: 'user',
                        content: 'Hello! Can you say "API test successful" if you receive this message?'
                    }
                ],
                temperature: 0.3,
                max_tokens: 50
            })
        });
        
        console.log('📡 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ API Error Response:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('✅ API Response received successfully!');
        console.log('🤖 Grok Response:', data.choices?.[0]?.message?.content || 'No content in response');
        console.log('\n🎉 Grok API is working correctly!');
        
    } catch (error) {
        console.log('❌ Error testing Grok API:', error.message);
        console.log('This could be due to:');
        console.log('- Invalid API key');
        console.log('- Network connectivity issues');
        console.log('- API service temporarily unavailable');
    }
}

// Run the test
testGrokAPI();
