export interface LineItem {
	id?: string;
	description: string | null;
	quantity: number | string | null;
	unit_price: number | string | null;
	amount: number | string | null;
}

export interface Extraction {
	id?: string;
	vendor?: string | null;
	date?: string | null;
	total?: number | null;
	currency?: string | null;
	raw_json?: string | null;
	confidence_json?: string | null;
	edited_json?: string | null;
	is_reviewed?: number;
	line_items?: LineItem[];
}

export interface Document {
	id: string;
	filename: string;
	file_url: string;
	cloudinary_public_id?: string;
	status: string;
	created_at?: string;
	vendor?: string | null;
	date?: string | null;
	total?: number | null;
	currency?: string | null;
	extraction_id?: string | null;
	extraction?: Extraction | null;
}
