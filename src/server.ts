import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { storyRoutes } from './routes/storyRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/output', express.static(path.join(__dirname, '../output')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', storyRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 AI StoryBook Generator is ready!`);
  console.log(`\nMake sure you have set up your API keys in the .env file:`);
  console.log(`- GOOGLE_AI_STUDIO_API_KEY (for story analysis and reference images)`);
  console.log(`- REPLICATE_API_TOKEN (for final image generation)`);
});