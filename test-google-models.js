const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listAvailableModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY);
        
        console.log('Testing Google AI Studio API...');
        console.log('API Key:', process.env.GOOGLE_AI_STUDIO_API_KEY ? 'Found' : 'Missing');
        
        // Test basic model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = "Hello, this is a test. Please respond with 'Test successful!'";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Model test successful!');
        console.log('Response:', text);
        
        return true;
    } catch (error) {
        console.error('❌ Error testing models:', error.message);
        
        // Try alternative models
        const modelsToTry = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            'gemini-2.5-flash'
        ];
        
        console.log('\nTrying alternative models...');
        
        for (const modelName of modelsToTry) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const result = await model.generateContent('Test');
                console.log(`✅ ${modelName} works!`);
                return modelName;
            } catch (err) {
                console.log(`❌ ${modelName} failed: ${err.message}`);
            }
        }
        
        return false;
    }
}

listAvailableModels();