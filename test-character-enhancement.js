const Replicate = require("replicate");
const { writeFile } = require("fs/promises");
const dotenv = require('dotenv');

dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

async function testCharacterEnhancement() {
    try {
        console.log('Testing Character Enhancement with Ideogram...');
        
        // Test 1: Male character (Nave)
        console.log('\n1. Testing Male Character Enhancement (Nave)...');
        
        const malePrompt = "Nave, a brave young man, standing heroically in a magical forest, confident expression, adventure gear";
        
        const maleInput = {
            prompt: malePrompt,
            aspect_ratio: "3:2"
        };

        console.log('Generating male character image...');
        console.log('Prompt:', malePrompt);
        
        const maleOutput = await replicate.run("ideogram-ai/ideogram-v3-turbo", { input: maleInput });
        
        let maleImageUrl;
        if (Array.isArray(maleOutput) && maleOutput.length > 0) {
            maleImageUrl = maleOutput[0];
        } else if (typeof maleOutput === 'string') {
            maleImageUrl = maleOutput;
        } else if (maleOutput && typeof maleOutput.url === 'function') {
            maleImageUrl = maleOutput.url();
        } else if (maleOutput && maleOutput.url) {
            maleImageUrl = maleOutput.url;
        }

        console.log('Male character image URL:', maleImageUrl);

        // Test 2: Female character (Lia)
        console.log('\n2. Testing Female Character Enhancement (Lia)...');
        
        const femalePrompt = "Lia, a graceful young woman, dancing in an enchanted garden, elegant dress, gentle smile";
        
        const femaleInput = {
            prompt: femalePrompt,
            aspect_ratio: "3:2"
        };

        console.log('Generating female character image...');
        console.log('Prompt:', femalePrompt);
        
        const femaleOutput = await replicate.run("ideogram-ai/ideogram-v3-turbo", { input: femaleInput });
        
        let femaleImageUrl;
        if (Array.isArray(femaleOutput) && femaleOutput.length > 0) {
            femaleImageUrl = femaleOutput[0];
        } else if (typeof femaleOutput === 'string') {
            femaleImageUrl = femaleOutput;
        } else if (femaleOutput && typeof femaleOutput.url === 'function') {
            femaleImageUrl = femaleOutput.url();
        } else if (femaleOutput && femaleOutput.url) {
            femaleImageUrl = femaleOutput.url;
        }

        console.log('Female character image URL:', femaleImageUrl);

        // Download both images
        if (maleImageUrl) {
            try {
                const maleResponse = await fetch(maleImageUrl);
                const maleBuffer = await maleResponse.arrayBuffer();
                await writeFile("test-nave-enhanced.png", Buffer.from(maleBuffer));
                console.log('✅ Nave enhanced image saved as test-nave-enhanced.png');
            } catch (error) {
                console.error('Error downloading male character image:', error.message);
            }
        }

        if (femaleImageUrl) {
            try {
                const femaleResponse = await fetch(femaleImageUrl);
                const femaleBuffer = await femaleResponse.arrayBuffer();
                await writeFile("test-lia-enhanced.png", Buffer.from(femaleBuffer));
                console.log('✅ Lia enhanced image saved as test-lia-enhanced.png');
            } catch (error) {
                console.error('Error downloading female character image:', error.message);
            }
        }

        console.log('\n🎉 Character enhancement testing completed!');
        
    } catch (error) {
        console.error('❌ Error testing character enhancement:', error.message);
        console.error('Full error:', error);
    }
}

testCharacterEnhancement();