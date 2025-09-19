require('dotenv').config();

console.log('Environment Variables Test:');
console.log('GROK_API_KEY:', process.env.GROK_API_KEY ? 'Set (' + process.env.GROK_API_KEY.substring(0, 8) + '...)' : 'Not set');
console.log('XAI_API_KEY:', process.env.XAI_API_KEY ? 'Set (' + process.env.XAI_API_KEY.substring(0, 8) + '...)' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('PORT:', process.env.PORT || 'Not set');
