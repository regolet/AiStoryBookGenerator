import { StoryAnalyzer } from './storyAnalyzer';
import { GoogleAIStudioService } from './googleAIStudio';
import { ReplicateService } from './replicateService';
import { StoryBook, StoryScene, GenerationOptions, StoryAnalysisRequest } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class StoryBookGenerator {
  private storyAnalyzer: StoryAnalyzer;
  private googleAI: GoogleAIStudioService;
  private replicate: ReplicateService;
  private outputDir: string;

  constructor(
    googleKey: string,
    replicateToken: string,
    outputDir: string = './output'
  ) {
    this.storyAnalyzer = new StoryAnalyzer(googleKey);
    this.googleAI = new GoogleAIStudioService(googleKey);
    this.replicate = new ReplicateService(replicateToken);
    this.outputDir = outputDir;
  }

  async generateStoryBook(
    request: StoryAnalysisRequest,
    options: GenerationOptions = { useGoogleReference: true }
  ): Promise<StoryBook> {
    const storyBookId = uuidv4();
    const storyBook: StoryBook = {
      id: storyBookId,
      title: this.extractTitle(request.story),
      scenes: [],
      createdAt: new Date(),
      style: request.style || 'realistic',
      status: 'analyzing'
    };

    try {
      console.log('Step 1: Analyzing story...');
      const scenes = await this.storyAnalyzer.analyzeStory(
        request.story,
        request.style || 'realistic',
        request.targetAudience || 'general'
      );
      
      storyBook.scenes = scenes;
      storyBook.status = 'generating-images';

      console.log(`Step 2: Generating images for ${scenes.length} scenes...`);
      
      for (let i = 0; i < scenes.length; i++) {
        console.log(`Generating image for scene ${i + 1}/${scenes.length}...`);
        const scene = scenes[i];
        
        try {
          let referenceImageUrl: string | undefined;
          
          if (options.useGoogleReference) {
            console.log('  - Generating reference with Google AI Studio...');
            const referenceData = await this.googleAI.generateReferenceImage(
              scene.analysis,
              request.style || 'realistic'
            );
            
            const googleImage = await this.googleAI.generateImageWithImagen(
              scene.analysis.imagePrompt,
              request.style || 'realistic'
            );
            
            if (googleImage) {
              const refPath = path.join(this.outputDir, storyBookId, 'references', `scene_${i + 1}_ref.png`);
              await this.saveImage(googleImage, refPath);
              referenceImageUrl = refPath;
              scene.referenceImage = refPath;
            }
          }
          
          console.log('  - Generating final image with Replicate...');
          const imagePrompt = this.replicate.buildPromptFromAnalysis(
            scene.analysis,
            request.style || 'realistic'
          );
          
          // Get style reference image path if uploaded
          let styleReferenceImage: string | undefined;
          if (request.style === 'upload' && request.referenceImagePath) {
            // Convert local file path to full URL for Replicate
            styleReferenceImage = `http://localhost:3000/${request.referenceImagePath.replace(/\\/g, '/')}`;
          }

          const imageUrl = await this.replicate.generateImage(
            imagePrompt,
            referenceImageUrl,
            {
              model: options.replicateModel,
              width: options.imageWidth || 1024,
              height: options.imageHeight || 1024,
              numInferenceSteps: options.numInferenceSteps || 50,
              guidanceScale: options.guidanceScale || 7.5,
              aspectRatio: options.aspectRatio || '1:1',
              gender: scene.analysis.characterGender,
              characterName: scene.analysis.characterName,
              styleReferenceImage: styleReferenceImage
            }
          );
          
          const imagePath = path.join(this.outputDir, storyBookId, 'images', `scene_${i + 1}.png`);
          await this.replicate.downloadImage(imageUrl, imagePath);
          scene.generatedImage = imagePath;
          
          console.log(`  ✓ Scene ${i + 1} complete`);
        } catch (error) {
          console.error(`  ✗ Error generating image for scene ${i + 1}:`, error);
          scene.generatedImage = undefined;
        }
      }

      storyBook.status = 'completed';
      
      await this.saveStoryBook(storyBook);
      console.log('Step 3: Generating HTML output...');
      await this.generateHTMLOutput(storyBook);
      
      return storyBook;
    } catch (error) {
      storyBook.status = 'error';
      console.error('Error generating storybook:', error);
      throw error;
    }
  }

  private extractTitle(story: string): string {
    const lines = story.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
      const firstLine = lines[0].replace(/^(Title:|#|\*\*)/gi, '').trim();
      if (firstLine.length < 100) {
        return firstLine;
      }
    }
    return 'Untitled Story';
  }

  private async saveImage(imageBuffer: Buffer, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, imageBuffer);
  }

  private async saveStoryBook(storyBook: StoryBook): Promise<void> {
    const outputPath = path.join(this.outputDir, storyBook.id, 'storybook.json');
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(storyBook, null, 2));
  }

  private async generateHTMLOutput(storyBook: StoryBook): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${storyBook.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header .meta {
            font-size: 1.1em;
            opacity: 0.9;
        }
        .scenes {
            padding: 40px;
        }
        .scene {
            margin-bottom: 60px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            align-items: center;
            padding: 40px;
            background: #f8f9fa;
            border-radius: 15px;
        }
        .scene:nth-child(even) {
            background: #fff;
        }
        .scene:nth-child(even) .scene-image {
            order: 2;
        }
        .scene:nth-child(even) .scene-content {
            order: 1;
        }
        .scene-image {
            width: 100%;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }
        .scene-image:hover {
            transform: scale(1.05);
        }
        .scene-content {
            padding: 20px;
        }
        .scene-number {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
        .scene-text {
            font-size: 1.3em;
            line-height: 1.8;
            color: #333;
            margin-bottom: 20px;
        }
        .scene-details {
            background: white;
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .scene-details h4 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .detail-item {
            margin: 8px 0;
            font-size: 0.95em;
            color: #666;
        }
        .detail-item strong {
            color: #333;
        }
        @media (max-width: 768px) {
            .scene {
                grid-template-columns: 1fr;
            }
            .scene:nth-child(even) .scene-image {
                order: 1;
            }
            .scene:nth-child(even) .scene-content {
                order: 2;
            }
        }
        .no-image {
            width: 100%;
            height: 400px;
            background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
            color: #999;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${storyBook.title}</h1>
            <div class="meta">
                <p>Style: ${storyBook.style} | Created: ${new Date(storyBook.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="scenes">
            ${storyBook.scenes.map((scene, index) => `
                <div class="scene">
                    <div class="scene-image-container">
                        ${scene.generatedImage 
                            ? `<img src="${path.basename(scene.generatedImage)}" alt="Scene ${index + 1}" class="scene-image">`
                            : '<div class="no-image">Image Generation Failed</div>'
                        }
                    </div>
                    <div class="scene-content">
                        <span class="scene-number">Scene ${index + 1}</span>
                        <div class="scene-text">${scene.text}</div>
                        <div class="scene-details">
                            <h4>Visual Details</h4>
                            <div class="detail-item"><strong>Tone:</strong> ${scene.analysis.tone}</div>
                            <div class="detail-item"><strong>Environment:</strong> ${scene.analysis.environment}</div>
                            <div class="detail-item"><strong>Lighting:</strong> ${scene.analysis.lighting}</div>
                            <div class="detail-item"><strong>Colors:</strong> ${scene.analysis.colorScheme.primary.join(', ')}</div>
                            <div class="detail-item"><strong>Mood:</strong> ${scene.analysis.colorScheme.mood}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const outputPath = path.join(this.outputDir, storyBook.id, 'storybook.html');
    await fs.writeFile(outputPath, html);
    
    const imagesDir = path.join(this.outputDir, storyBook.id, 'images');
    const htmlDir = path.join(this.outputDir, storyBook.id);
    
    try {
      const images = await fs.readdir(imagesDir);
      for (const image of images) {
        await fs.copyFile(
          path.join(imagesDir, image),
          path.join(htmlDir, image)
        );
      }
    } catch (error) {
      console.log('No images to copy');
    }
  }

  async loadStoryBook(id: string): Promise<StoryBook> {
    const filePath = path.join(this.outputDir, id, 'storybook.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async listStoryBooks(): Promise<{ id: string; title: string; createdAt: Date }[]> {
    try {
      const dirs = await fs.readdir(this.outputDir);
      const storyBooks = [];
      
      for (const dir of dirs) {
        try {
          const storyBook = await this.loadStoryBook(dir);
          storyBooks.push({
            id: storyBook.id,
            title: storyBook.title,
            createdAt: storyBook.createdAt
          });
        } catch (error) {
          console.log(`Skipping invalid directory: ${dir}`);
        }
      }
      
      return storyBooks;
    } catch (error) {
      return [];
    }
  }
}