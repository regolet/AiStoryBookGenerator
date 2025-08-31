export interface StoryScene {
  sceneNumber: number;
  text: string;
  analysis: SceneAnalysis;
  referenceImage?: string;
  generatedImage?: string;
}

export interface SceneAnalysis {
  description: string;
  facialExpressions: string[];
  tone: string;
  colorScheme: {
    primary: string[];
    mood: string;
  };
  subjectPosition: string;
  pose: string;
  environment: string;
  lighting: string;
  cameraAngle: string;
  imagePrompt: string;
  characterGender?: 'male' | 'female' | 'neutral';
  characterName?: string;
}

export interface StoryAnalysisRequest {
  story: string;
  style?: 'realistic' | 'cartoon' | 'anime' | 'watercolor' | 'oil-painting' | 'upload';
  targetAudience?: 'children' | 'young-adult' | 'adult';
  referenceImagePath?: string;
}

export interface StoryBook {
  id: string;
  title: string;
  author?: string;
  scenes: StoryScene[];
  createdAt: Date;
  style: string;
  status: 'analyzing' | 'generating-images' | 'completed' | 'error';
}

export interface GenerationOptions {
  useGoogleReference: boolean;
  replicateModel?: string;
  imageWidth?: number;
  imageHeight?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  aspectRatio?: string;
}