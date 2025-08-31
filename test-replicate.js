const { writeFile } = require("fs/promises");
const Replicate = require("replicate");
const dotenv = require('dotenv');

dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

async function testReplicate() {
    try {
        console.log('Testing Replicate with Ideogram V3 Turbo...');
        console.log('API Token:', process.env.REPLICATE_API_TOKEN ? 'Found' : 'Missing');
        
        const input = {
            prompt: "The text \"V3 Turbo\" in the center middle. A color film-inspired portrait of a young man looking to the side with a shallow depth of field that blurs the surrounding elements, drawing attention to his eye. The fine grain and cast suggest a high ISO film stock, while the wide aperture lens creates a motion blur effect, enhancing the candid and natural documentary style.",
            aspect_ratio: "3:2"
        };

        console.log('Generating image...');
        const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", { input });

        // Check the output format
        console.log('Output type:', typeof output);
        console.log('Output:', output);

        // Handle different output formats
        let imageUrl;
        if (Array.isArray(output) && output.length > 0) {
            imageUrl = output[0];
        } else if (typeof output === 'string') {
            imageUrl = output;
        } else if (output && typeof output.url === 'function') {
            imageUrl = output.url();
        } else if (output && output.url) {
            imageUrl = output.url;
        } else {
            throw new Error('Unexpected output format');
        }

        console.log('Generated image URL:', imageUrl);

        // Download and save the image
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        await writeFile("test-output.png", Buffer.from(buffer));
        
        console.log('✅ Image saved as test-output.png');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    }
}

testReplicate();