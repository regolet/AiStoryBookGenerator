import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { SceneAnalysis } from '../types';

export class GoogleAIStudioService {
  private genAI: GoogleGenerativeAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateReferenceImage(
    sceneAnalysis: SceneAnalysis,
    style: string,
    outputPath?: string
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const imagePrompt = this.buildImagePrompt(sceneAnalysis, style);
      
      const imagePart = {
        inlineData: {
          data: '', 
          mimeType: 'image/png'
        }
      };

      const textPrompt = `Generate a reference image based on this description: ${imagePrompt}
      
      Style requirements:
      - Art style: ${style}
      - Colors: ${sceneAnalysis.colorScheme.primary.join(', ')}
      - Mood: ${sceneAnalysis.colorScheme.mood}
      - Lighting: ${sceneAnalysis.lighting}
      - Camera angle: ${sceneAnalysis.cameraAngle}
      
      Please create a detailed visual representation suitable for a storybook illustration.`;

      const result = await model.generateContent([textPrompt]);
      const response = await result.response;
      const text = response.text();
      
      if (outputPath) {
        await this.saveReferenceData(text, outputPath);
      }
      
      return text;
    } catch (error) {
      console.error('Error generating reference with Google AI Studio:', error);
      throw new Error(`Failed to generate reference image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImageWithImagen(
    prompt: string,
    style: string
  ): Promise<Buffer | null> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'imagen-3' });
      
      const fullPrompt = `${prompt}, ${style} style, high quality, detailed`;
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
        },
      });

      const response = await result.response;
      
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if ('inlineData' in part && part.inlineData) {
              const imageData = part.inlineData.data;
              return Buffer.from(imageData, 'base64');
            }
          }
        }
      }
      
      console.log('No image data in response, using text-based reference instead');
      return null;
    } catch (error) {
      console.error('Error with Imagen:', error);
      return null;
    }
  }

  private buildImagePrompt(sceneAnalysis: SceneAnalysis, style: string): string {
    const facialExpressions = sceneAnalysis.facialExpressions.length > 0 
      ? `Characters showing ${sceneAnalysis.facialExpressions.join(', ')} expressions.`
      : '';

    return `${sceneAnalysis.description}. ${facialExpressions} 
            Scene tone: ${sceneAnalysis.tone}. 
            Environment: ${sceneAnalysis.environment}. 
            Subject position: ${sceneAnalysis.subjectPosition}. 
            Pose: ${sceneAnalysis.pose}.
            Art style: ${style}.`;
  }

  private async saveReferenceData(data: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, data, 'utf-8');
  }

  async analyzeImageForPrompt(imagePath: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const imageData = await fs.readFile(imagePath);
      const base64Image = imageData.toString('base64');
      
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/png'
        }
      };

      const prompt = `Analyze this image and create a detailed description that could be used to recreate a similar image. 
      Include details about:
      - Main subjects and their positions
      - Facial expressions and emotions
      - Colors and lighting
      - Background and environment
      - Art style and mood
      - Any text or special elements
      
      Format the response as a single detailed prompt for image generation.`;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}