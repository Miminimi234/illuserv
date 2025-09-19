const fs = require('fs');
const path = require('path');

console.log('🔧 Grok API Setup Helper\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    
    // Read current .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if GROK_API_KEY is set
    if (envContent.includes('GROK_API_KEY=') && !envContent.includes('GROK_API_KEY=your_grok_api_key_here')) {
        console.log('✅ GROK_API_KEY appears to be configured');
    } else {
        console.log('❌ GROK_API_KEY not properly configured');
        console.log('Please edit the .env file and set your actual Grok API key');
    }
    
    // Check if XAI_API_KEY is set
    if (envContent.includes('XAI_API_KEY=') && !envContent.includes('XAI_API_KEY=your_grok_api_key_here')) {
        console.log('✅ XAI_API_KEY appears to be configured');
    } else {
        console.log('❌ XAI_API_KEY not properly configured');
        console.log('Please edit the .env file and set your actual Grok API key');
    }
    
} else {
    console.log('❌ .env file not found');
    console.log('Creating .env file from template...');
    
    if (fs.existsSync(envExamplePath)) {
        // Copy from env.example
        const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        fs.writeFileSync(envPath, envExampleContent);
        console.log('✅ Created .env file from env.example');
        console.log('⚠️  Please edit .env file and set your actual API keys');
    } else {
        console.log('❌ env.example file not found');
    }
}

console.log('\n📋 Next steps:');
console.log('1. Get your Grok API key from: https://console.x.ai/');
console.log('2. Edit the .env file and replace "your_grok_api_key_here" with your actual API key');
console.log('3. Set both GROK_API_KEY and XAI_API_KEY to the same value');
console.log('4. Run: node test-grok-api.js to test the API key');
console.log('5. Restart your server to apply the changes');

console.log('\n🔍 Current environment variables:');
console.log('GROK_API_KEY:', process.env.GROK_API_KEY ? 'Set (' + process.env.GROK_API_KEY.substring(0, 8) + '...)' : 'Not set');
console.log('XAI_API_KEY:', process.env.XAI_API_KEY ? 'Set (' + process.env.XAI_API_KEY.substring(0, 8) + '...)' : 'Not set');
