# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI StoryBook Generator is a TypeScript/Node.js application that transforms text stories into illustrated storybooks using Google AI Studio and Replicate. It analyzes stories with Gemini, generates reference images with Google AI Studio, and creates final illustrations with Replicate.com.

## Common Commands

```bash
npm run dev        # Start development server with hot reload (port 3000)
npm run build      # Compile TypeScript to JavaScript
npm start          # Run production server
```

## Architecture

### Core Services (`src/services/`)
- **StoryAnalyzer**: Uses Google Gemini to break stories into scenes and extract visual elements (expressions, colors, lighting, composition)
- **GoogleAIStudioService**: Generates reference images with Imagen-3 and analyzes existing images for prompts
- **ReplicateService**: Creates final high-quality images using various AI models (Ideogram V3 Turbo, SDXL, Stable Diffusion, character-specific LoRAs)
- **StoryBookGenerator**: Orchestrates the entire pipeline from story analysis to HTML output

### API Layer (`src/routes/`)
- RESTful endpoints for story generation, analysis, and storybook management
- Key endpoints: `/api/generate-storybook`, `/api/analyze-story`, `/api/upload-reference`
- Handles async processing and error management

### Web Interface (`public/`)
- Single-page application with tabs for generation, library, and settings
- Real-time progress tracking during generation
- Style selection system with 5 built-in styles and custom upload support
- Responsive design for mobile and desktop

## Key Design Patterns

1. **Service Layer Pattern**: Each AI integration is encapsulated in its own service class
2. **Pipeline Architecture**: Story → Analysis → Reference → Generation → Output
3. **Factory Pattern**: StoryBookGenerator coordinates multiple services
4. **Async/Await**: All API calls and image generation use async patterns
5. **Type Safety**: Full TypeScript types for all data structures in `src/types/`

## Environment Configuration

Required API keys in `.env`:
- `GOOGLE_AI_STUDIO_API_KEY`: For story analysis (Gemini) and reference images (Imagen-3)
- `REPLICATE_API_TOKEN`: For final image generation with multiple model options

## Output Structure

Generated storybooks are saved in `output/{storybook-id}/`:
- `storybook.json`: Complete story data and metadata
- `storybook.html`: Standalone HTML viewer
- `images/`: Final generated images
- `references/`: Google AI Studio reference images (if enabled)

## Data Flow

1. **Input**: Story text + configuration options (style, model, dimensions)
2. **Analysis**: Gemini breaks story into structured scenes with visual details
3. **Reference**: Optional Imagen-3 reference generation for each scene
4. **Generation**: Replicate creates final illustrations using selected model
5. **Output**: JSON data + HTML viewer + organized file structure

## Advanced Features

### Character Consistency
- Auto-assigns "Nave" (male) or "Lia" (female) character names
- Replaces pronouns with character names for consistency
- Attempts character-specific LoRA models with automatic fallbacks

### Model Selection
- **Default**: `ideogram-ai/ideogram-v3-turbo` for general scenes
- **Character Models**: Custom LoRAs for Nave/Lia when detected
- **Fallback Chain**: Automatic fallback to working models on failure