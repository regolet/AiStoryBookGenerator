const Replicate = require("replicate");
const { writeFile } = require("fs/promises");
const dotenv = require('dotenv');

dotenv.config();

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

async function testCharacterModels() {
    try {
        console.log('Testing Character LoRA Models...');
        
        // Test Nave (Male) model
        console.log('\n1. Testing Nave (Male) Character Model...');
        
        const naveInput = {
            prompt: "Nave, a brave young adventurer standing in a magical forest, confident pose, heroic expression, detailed character art, high quality",
            width: 1024,
            height: 1024,
            num_inference_steps: 28,
            guidance_scale: 3.5,
            seed: 12345
        };

        console.log('Generating Nave image...');
        const naveOutput = await replicate.run("prithivmlmods/nave-lora-flux-character", { input: naveInput });

        let naveImageUrl;
        if (Array.isArray(naveOutput) && naveOutput.length > 0) {
            naveImageUrl = naveOutput[0];
        } else if (typeof naveOutput === 'string') {
            naveImageUrl = naveOutput;
        } else {
            console.log('Nave output format:', typeof naveOutput, naveOutput);
            naveImageUrl = naveOutput;
        }

        console.log('Nave image URL:', naveImageUrl);

        // Test Lia (Female) model
        console.log('\n2. Testing Lia (Female) Character Model...');
        
        const liaInput = {
            prompt: "Lia, a graceful young woman in an enchanted garden, elegant pose, gentle smile, detailed character art, high quality",
            width: 1024,
            height: 1024,
            num_inference_steps: 28,
            guidance_scale: 3.5,
            seed: 54321
        };

        console.log('Generating Lia image...');
        const liaOutput = await replicate.run("prithivmlmods/lia-lora-flux-character", { input: liaInput });

        let liaImageUrl;
        if (Array.isArray(liaOutput) && liaOutput.length > 0) {
            liaImageUrl = liaOutput[0];
        } else if (typeof liaOutput === 'string') {
            liaImageUrl = liaOutput;
        } else {
            console.log('Lia output format:', typeof liaOutput, liaOutput);
            liaImageUrl = liaOutput;
        }

        console.log('Lia image URL:', liaImageUrl);

        // Download both images
        if (naveImageUrl) {
            try {
                const naveResponse = await fetch(naveImageUrl);
                const naveBuffer = await naveResponse.arrayBuffer();
                await writeFile("test-nave.png", Buffer.from(naveBuffer));
                console.log('✅ Nave image saved as test-nave.png');
            } catch (error) {
                console.error('Error downloading Nave image:', error.message);
            }
        }

        if (liaImageUrl) {
            try {
                const liaResponse = await fetch(liaImageUrl);
                const liaBuffer = await liaResponse.arrayBuffer();
                await writeFile("test-lia.png", Buffer.from(liaBuffer));
                console.log('✅ Lia image saved as test-lia.png');
            } catch (error) {
                console.error('Error downloading Lia image:', error.message);
            }
        }

        console.log('\n🎉 Character model testing completed!');
        
    } catch (error) {
        console.error('❌ Error testing character models:', error.message);
        console.error('Full error:', error);
    }
}

testCharacterModels();