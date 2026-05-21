import { PDF_WORKER_SRC, PDF_RENDER_SCALE, VENDOR_KEYWORDS, DATE_PATTERNS, TOTAL_PATTERNS } from '$lib/config/constants.js';

export interface OcrResult {
	vendor: string | null;
	date: string | null;
	total: number | null;
	currency: string | null;
	line_items: { description: string | null; quantity: number | null; unit_price: number | null; amount: number | null }[];
}

async function toImageBlob(input: Blob | string): Promise<Blob> {
	if (typeof input === 'string') {
		const res = await fetch(input);
		input = await res.blob();
	}

	if (input.type === 'application/pdf') {
		const pdfjsLib = await import('pdfjs-dist');
		pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
		const buf = await input.arrayBuffer();
		const pdf = await pdfjsLib.getDocument(buf).promise;
		const page = await pdf.getPage(1);
		const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
		const canvas = document.createElement('canvas');
		canvas.width = viewport.width;
		canvas.height = viewport.height;
		await page.render({ canvas, viewport }).promise;
		return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
	}

	return input;
}

export async function ocrRawText(file: File | Blob | null, imageUrl?: string): Promise<string> {
	let input: Blob | string;
	if (file) {
		input = file;
	} else if (imageUrl) {
		input = imageUrl;
	} else {
		throw new Error('Either file or imageUrl is required');
	}

	const imageBlob = await toImageBlob(input);

	const Tesseract = await import('tesseract.js');
	const { data } = await Tesseract.default.recognize(imageBlob, 'eng', {
		logger: () => {}
	});

	return data.text;
}

export async function ocrImage(file: File | Blob | null, imageUrl?: string): Promise<OcrResult> {
	const text = await ocrRawText(file, imageUrl);
	return parseInvoiceText(text);
}

function parseInvoiceText(text: string): OcrResult {
	const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

	const vendor = findVendor(lines);
	const date = findDate(text);
	const total = findTotal(text);
	const currency = findCurrency(text);
	const lineItems = parseLineItems(lines);

	return { vendor, date, total, currency, line_items: lineItems };
}

function findVendor(lines: string[]): string | null {
	for (const line of lines.slice(0, 15)) {
		const lower = line.toLowerCase();
		for (const kw of VENDOR_KEYWORDS) {
			if (lower.includes(kw)) {
				const parts = line.split(/[:]\s*/);
				if (parts.length > 1) return parts[1].trim();
			}
		}
	}
	return lines[0] ?? null;
}

function findDate(text: string): string | null {
	for (const p of DATE_PATTERNS) {
		const m = text.match(p);
		if (m) return m[1];
	}
	return null;
}

function findTotal(text: string): number | null {
	for (const p of TOTAL_PATTERNS) {
		const m = text.match(p);
		if (m) return parseFloat(m[1].replace(/,/g, ''));
	}
	const nums = text.match(/[$€£Rp.]+\s*([\d,]+\.\d{2})/g);
	if (nums) {
		const last = nums[nums.length - 1].match(/[$€£Rp.]+\s*([\d,]+\.\d{2})/);
		if (last) return parseFloat(last[1].replace(/,/g, ''));
	}
	return null;
}

function findCurrency(text: string): string | null {
	if (/[Rr][Pp]/.test(text)) return 'IDR';
	if (/[$]/.test(text)) return 'USD';
	if (/[€]/.test(text)) return 'EUR';
	if (/[£]/.test(text)) return 'GBP';
	return null;
}

function parseLineItems(lines: string[]): { description: string | null; quantity: number | null; unit_price: number | null; amount: number | null }[] {
	const items: { description: string | null; quantity: number | null; unit_price: number | null; amount: number | null }[] = [];
	let inItems = false;

	for (const line of lines) {
		const lower = line.toLowerCase();
		if (/^(qty|quantity|desc|item|product)/.test(lower)) {
			inItems = true;
			continue;
		}
		if (inItems && /^(total|subtotal|tax|grand)/.test(lower)) {
			break;
		}
		if (!inItems) continue;

		const nums = line.match(/[\d,]+\.?\d*/g);
		if (nums && nums.length >= 1) {
			const amounts = nums.map(n => parseFloat(n.replace(/,/g, '')));
			const desc = line.replace(/[\d,]+\.?\d*/g, '').trim();

			if (desc && amounts.length > 0) {
				items.push({
					description: desc || null,
					quantity: amounts.length >= 2 ? amounts[0] : null,
					unit_price: amounts.length >= 2 ? amounts[1] : amounts[0],
					amount: amounts.length >= 3 ? amounts[2] : (amounts.length >= 2 ? amounts[1] * amounts[0] : amounts[0])
				});
			}
		}
	}

	return items;
}
