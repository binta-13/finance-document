export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const DASHBOARD_DOCUMENT_LIMIT = 50;
export const DOCUMENT_POLL_INTERVAL = 3000;
export const PDF_RENDER_SCALE = 2;

export const STATUS_PENDING = 'pending';
export const STATUS_PROCESSING = 'processing';
export const STATUS_COMPLETED = 'completed';
export const STATUS_FAILED = 'failed';

export const VENDOR_KEYWORDS = ['vendor', 'supplier', 'from:', 'bill from', 'company'];
export const DATE_PATTERNS = [
	/(\d{4}[-/]\d{2}[-/]\d{2})/,
	/(\d{2}[-/]\d{2}[-/]\d{4})/,
	/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
];
export const TOTAL_PATTERNS = [
	/total[:\s]*[$€£Rp.]*\s*([\d,]+\.?\d*)/i,
	/amount[:\s]*[$€£Rp.]*\s*([\d,]+\.?\d*)/i,
	/sum[:\s]*[$€£Rp.]*\s*([\d,]+\.?\d*)/i,
	/grand[:\s]*[$€£Rp.]*\s*([\d,]+\.?\d*)/i,
];

export const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';
export const CLOUDINARY_UPLOAD_URL = (cloudName: string, resourceType: string) =>
	`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODELS = ['openai/gpt-4o', 'google/gemini-2.0-flash-001'];

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'application/pdf'];
export const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp)/i;
