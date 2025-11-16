-- Create crop detections table to store analysis history
CREATE TABLE public.crop_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_type TEXT NOT NULL,
  defects JSONB NOT NULL,
  severity TEXT NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.crop_detections ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read detections (for public display)
CREATE POLICY "Anyone can view crop detections" 
ON public.crop_detections 
FOR SELECT 
USING (true);

-- Create policy to allow anyone to insert detections (for public submission)
CREATE POLICY "Anyone can create crop detections" 
ON public.crop_detections 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_crop_detections_created_at ON public.crop_detections(created_at DESC);