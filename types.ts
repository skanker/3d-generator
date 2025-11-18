export type GenerationStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export interface GenerationResult {
  modelUrl?: string;
  previewUrl?: string;
  error?: string;
  metadata?: {
    model_version?: string;
    style?: string;
    job_id?: string;
    [key: string]: any;
  };
}