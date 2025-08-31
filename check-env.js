require('dotenv').config();

console.log('=== Environment Check ===');
console.log('Google API Key exists:', !!process.env.GOOGLE_AI_STUDIO_API_KEY);
console.log('Google API Key length:', process.env.GOOGLE_AI_STUDIO_API_KEY?.length);
console.log('Google API Key starts with:', process.env.GOOGLE_AI_STUDIO_API_KEY?.substring(0, 10));

console.log('Replicate Token exists:', !!process.env.REPLICATE_API_TOKEN);
console.log('Replicate Token length:', process.env.REPLICATE_API_TOKEN?.length);
console.log('Replicate Token starts with:', process.env.REPLICATE_API_TOKEN?.substring(0, 10));

console.log('\n=== Expected vs Actual ===');
console.log('Google key should start with "AIzaSy" but starts with:', process.env.GOOGLE_AI_STUDIO_API_KEY?.substring(0, 6));
console.log('Replicate token should start with "r8_" and starts with:', process.env.REPLICATE_API_TOKEN?.substring(0, 3));