import { GoogleGenerativeAI } from '@google/generative-ai';
import { SceneAnalysis, StoryScene } from '../types';

export class StoryAnalyzer {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeStory(
    story: string,
    style: string = 'realistic',
    targetAudience: string = 'general'
  ): Promise<StoryScene[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `You are an expert story analyzer and visual director for children's books and illustrated stories. 
      Analyze the given story and break it down into scenes suitable for illustration.
      For each scene, provide detailed visual direction including:
      - Facial expressions of characters
      - Scene description and environment
      - Tone and mood
      - Color scheme suggestions
      - Subject positioning and composition
      - Character poses and body language
      - Lighting and atmosphere
      - Camera angle and perspective
      
      Consider the target audience (${targetAudience}) and art style (${style}) in your analysis.
      
      You MUST return your analysis as a valid JSON object with a "scenes" key containing an array.
      Each scene in the array must have this exact structure:
      {
        "sceneNumber": number,
        "text": "The text for this scene",
        "analysis": {
          "description": "Detailed scene description",
          "facialExpressions": ["expression1", "expression2"],
          "tone": "emotional tone",
          "colorScheme": {
            "primary": ["color1", "color2"],
            "mood": "color mood description"
          },
          "subjectPosition": "positioning description",
          "pose": "pose description",
          "environment": "environment description",
          "lighting": "lighting description",
          "cameraAngle": "camera angle description",
          "imagePrompt": "A detailed prompt for image generation",
          "characterGender": "male, female, or neutral (if main character is present)",
          "characterName": "suggested name for the main character (Nave for male, Lia for female)"
        }
      }
      
      Return ONLY the JSON object, no other text.
      
      Story to analyze:
      ${story}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from the response
      let jsonStr = text;
      
      // Try to find JSON in the response if it's wrapped in other text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      // Remove any markdown code blocks
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      const parsed = JSON.parse(jsonStr);
      const scenes = parsed.scenes || parsed;
      
      return Array.isArray(scenes) ? scenes : [scenes];
    } catch (error) {
      console.error('Error analyzing story with Google AI:', error);
      throw new Error(`Failed to analyze story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  generateImagePrompt(scene: SceneAnalysis, style: string): string {
    const styleModifiers = {
      'realistic': 'photorealistic, highly detailed, 8k resolution',
      'cartoon': 'cartoon style, animated, colorful, playful',
      'anime': 'anime style, manga inspired, vibrant colors',
      'watercolor': 'watercolor painting, soft edges, artistic',
      'oil-painting': 'oil painting style, classical art, textured brushstrokes'
    };

    const modifier = styleModifiers[style as keyof typeof styleModifiers] || styleModifiers['realistic'];
    
    return `${scene.imagePrompt}, ${modifier}, ${scene.lighting}, ${scene.cameraAngle}, 
            color palette: ${scene.colorScheme.primary.join(', ')}, mood: ${scene.colorScheme.mood}`;
  }
}