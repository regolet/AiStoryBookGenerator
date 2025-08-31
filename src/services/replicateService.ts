import Replicate from 'replicate';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { SceneAnalysis } from '../types';

export class ReplicateService {
  private replicate: Replicate;
  
  constructor(apiToken: string) {
    this.replicate = new Replicate({
      auth: apiToken
    });
  }

  async generateImage(
    prompt: string,
    referenceImageUrl?: string,
    options: {
      model?: string;
      width?: number;
      height?: number;
      numInferenceSteps?: number;
      guidanceScale?: number;
      negativePrompt?: string;
      scheduler?: string;
      aspectRatio?: string;
      gender?: 'male' | 'female' | 'neutral';
      characterName?: string;
      styleReferenceImage?: string;
    } = {}
  ): Promise<string> {
    try {
      let model = options.model || 'ideogram-ai/ideogram-v3-turbo';
      
      // Auto-select gender-specific models if character is detected
      // For now, use ideogram with character-specific prompts until we find working character models
      if (model === 'auto-character') {
        model = 'ideogram-ai/ideogram-v3-turbo';
      } else if (model === 'prithivmlmods/nave-lora-flux-character' || model === 'prithivmlmods/lia-lora-flux-character') {
        // Fallback to ideogram if character models don't exist
        console.warn('Character LoRA models not available, falling back to Ideogram with character prompt');
        model = 'ideogram-ai/ideogram-v3-turbo';
      }
      
      let input: any;
      
      // Handle different model input formats
      if (model.includes('ideogram')) {
        // Ideogram models use aspect_ratio instead of width/height
        // Enhance prompt with character information if available
        let enhancedPrompt = prompt;
        if (options.characterName && options.gender) {
          const characterName = options.characterName;
          const characterDesc = options.gender === 'male' 
            ? `${characterName}, a brave young man` 
            : `${characterName}, a graceful young woman`;
          enhancedPrompt = prompt.replace(/\b(he|she|him|her|boy|girl|man|woman|character|protagonist)\b/gi, characterName);
          enhancedPrompt = `${characterDesc}, ${enhancedPrompt}`;
        }
        
        input = {
          prompt: enhancedPrompt,
          aspect_ratio: options.aspectRatio || '1:1'
        };

        // Add style reference image if provided
        if (options.styleReferenceImage) {
          input.style_reference_image = options.styleReferenceImage;
          input.style_reference_weight = 0.5; // Adjust as needed (0.0 - 1.0)
        }
      } else if (model.includes('nave-lora') || model.includes('lia-lora')) {
        // Character LoRA models - use character name in prompt
        const characterPrompt = options.characterName 
          ? prompt.replace(/\b(he|she|him|her|boy|girl|man|woman)\b/gi, options.characterName)
          : prompt;
        
        input = {
          prompt: `${characterPrompt}, ${options.characterName || (options.gender === 'male' ? 'Nave' : 'Lia')} character`,
          width: options.width || 1024,
          height: options.height || 1024,
          num_inference_steps: options.numInferenceSteps || 28,
          guidance_scale: options.guidanceScale || 3.5,
          seed: Math.floor(Math.random() * 1000000)
        };
      } else {
        // SDXL and other models use traditional parameters
        input = {
          prompt: prompt,
          width: options.width || 1024,
          height: options.height || 1024,
          num_inference_steps: options.numInferenceSteps || 50,
          guidance_scale: options.guidanceScale || 7.5,
          scheduler: options.scheduler || 'K_EULER',
          negative_prompt: options.negativePrompt || 'ugly, deformed, noisy, blurry, distorted, grainy, low quality'
        };

        if (referenceImageUrl) {
          input.image = referenceImageUrl;
          input.prompt_strength = 0.8;
        }
      }

      console.log('Generating image with Replicate:', { model, prompt: prompt.substring(0, 100) });
      
      const output = await this.replicate.run(model as `${string}/${string}:${string}`, { input });
      
      // Handle different output formats
      let imageUrl: string;
      
      if (Array.isArray(output) && output.length > 0) {
        imageUrl = output[0] as string;
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (output && typeof output.url === 'function') {
        imageUrl = output.url();
      } else if (output && output.url) {
        imageUrl = output.url;
      } else if (output instanceof ReadableStream) {
        // Handle ReadableStream response from newer models
        const response = new Response(output);
        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
      } else {
        throw new Error('Unexpected output format from Replicate');
      }
      
      return imageUrl;
    } catch (error) {
      console.error('Error generating image with Replicate:', error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateImageWithControlNet(
    prompt: string,
    referenceImageUrl: string,
    controlType: 'canny' | 'depth' | 'pose' | 'scribble' = 'canny'
  ): Promise<string> {
    try {
      const model = 'jagilley/controlnet-canny:aff48af9c68d162388d230a2ab003f68d2638d88307bdaf1c2f1ac95079c9613';
      
      const input = {
        image: referenceImageUrl,
        prompt: prompt,
        num_samples: 1,
        image_resolution: 512,
        ddim_steps: 20,
        guess_mode: false,
        strength: 1,
        scale: 7.5,
        seed: null,
        eta: 0,
        a_prompt: 'best quality, extremely detailed, masterpiece',
        n_prompt: 'longbody, lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality'
      };

      const output = await this.replicate.run(model as `${string}/${string}:${string}`, { input });
      
      if (Array.isArray(output) && output.length > 0) {
        return output[0] as string;
      } else if (typeof output === 'string') {
        return output;
      } else {
        throw new Error('Unexpected output format from ControlNet');
      }
    } catch (error) {
      console.error('Error generating image with ControlNet:', error);
      throw new Error(`Failed to generate image with ControlNet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadImage(imageUrl: string, outputPath: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(outputPath, response.data);
      return outputPath;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  buildPromptFromAnalysis(analysis: SceneAnalysis, style: string): string {
    const styleModifiers: Record<string, string> = {
      'realistic': 'photorealistic, highly detailed, professional photography, 8k uhd',
      'cartoon': 'cartoon illustration, vibrant colors, animated style, child-friendly',
      'anime': 'anime art style, manga illustration, cel shaded, studio ghibli inspired',
      'watercolor': 'watercolor painting, soft brushstrokes, artistic, traditional media',
      'oil-painting': 'oil painting, classical art, museum quality, renaissance style'
    };

    const modifier = styleModifiers[style] || styleModifiers['realistic'];
    const colors = analysis.colorScheme.primary.join(', ');
    
    return `${analysis.imagePrompt}, ${modifier}, ${analysis.lighting} lighting, 
            ${analysis.cameraAngle} angle, color palette: ${colors}, 
            ${analysis.colorScheme.mood} mood, ${analysis.environment} setting`;
  }

  async upscaleImage(imageUrl: string): Promise<string> {
    try {
      const model = 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b';
      
      const input = {
        image: imageUrl,
        scale: 4,
        face_enhance: false
      };

      const output = await this.replicate.run(model as `${string}/${string}:${string}`, { input });
      
      if (typeof output === 'string') {
        return output;
      } else {
        throw new Error('Unexpected output format from upscaler');
      }
    } catch (error) {
      console.error('Error upscaling image:', error);
      throw new Error(`Failed to upscale image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}