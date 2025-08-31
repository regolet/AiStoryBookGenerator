import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { StoryBookGenerator } from '../services/storyBookGenerator';
import { StoryAnalysisRequest, GenerationOptions } from '../types';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

let generator: StoryBookGenerator | null = null;

const initializeGenerator = () => {
  if (!generator) {
    const googleKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    if (!googleKey || !replicateToken) {
      throw new Error('Missing required API keys. Please check your .env file.');
    }

    generator = new StoryBookGenerator(
      googleKey,
      replicateToken,
      './output'
    );
  }
  return generator;
};

// File upload endpoint
router.post('/upload-reference', upload.single('referenceImage'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    res.json({
      success: true,
      filePath: req.file.path,
      fileName: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

router.post('/generate-storybook', async (req, res) => {
  try {
    const gen = initializeGenerator();
    
    const request: StoryAnalysisRequest = {
      story: req.body.story,
      style: req.body.style || 'realistic',
      targetAudience: req.body.targetAudience || 'children',
      referenceImagePath: req.body.referenceImagePath
    };

    const options: GenerationOptions = {
      useGoogleReference: req.body.useGoogleReference !== false,
      replicateModel: req.body.replicateModel,
      imageWidth: req.body.imageWidth || 1024,
      imageHeight: req.body.imageHeight || 1024,
      numInferenceSteps: req.body.numInferenceSteps || 50,
      guidanceScale: req.body.guidanceScale || 7.5,
      aspectRatio: req.body.aspectRatio || '1:1'
    };

    console.log('Received storybook generation request:', {
      style: request.style,
      targetAudience: request.targetAudience,
      storyLength: request.story.length
    });

    const storyBook = await gen.generateStoryBook(request, options);
    
    res.json({
      success: true,
      storyBook,
      htmlUrl: `/output/${storyBook.id}/storybook.html`
    });
  } catch (error) {
    console.error('Error generating storybook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

router.post('/analyze-story', async (req, res) => {
  try {
    const gen = initializeGenerator();
    const { story, style, targetAudience } = req.body;

    if (!story) {
      return res.status(400).json({
        success: false,
        error: 'Story text is required'
      });
    }

    const analyzer = (gen as any).storyAnalyzer;
    const scenes = await analyzer.analyzeStory(story, style, targetAudience);

    res.json({
      success: true,
      scenes
    });
  } catch (error) {
    console.error('Error analyzing story:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

router.get('/storybooks', async (req, res) => {
  try {
    const gen = initializeGenerator();
    const storyBooks = await gen.listStoryBooks();
    
    res.json({
      success: true,
      storyBooks
    });
  } catch (error) {
    console.error('Error listing storybooks:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

router.get('/storybook/:id', async (req, res) => {
  try {
    const gen = initializeGenerator();
    const storyBook = await gen.loadStoryBook(req.params.id);
    
    res.json({
      success: true,
      storyBook
    });
  } catch (error) {
    console.error('Error loading storybook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

router.get('/health', (req, res) => {
  const hasGoogle = !!process.env.GOOGLE_AI_STUDIO_API_KEY;
  const hasReplicate = !!process.env.REPLICATE_API_TOKEN;

  res.json({
    status: 'ok',
    apiKeys: {
      google: hasGoogle,
      replicate: hasReplicate
    },
    ready: hasGoogle && hasReplicate
  });
});

export { router as storyRoutes };