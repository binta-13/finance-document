export interface InvoiceLineItem {
	id?: string;
	description: string | null;
	quantity: number | null;
	unit_price: number | null;
	amount: number | null;
}

export interface InvoiceCsvData {
	id: string;
	filename: string;
	status: string;
	created_at: string;
	vendor: string | null;
	date: string | null;
	total: number | null;
	currency: string | null;
	is_reviewed: boolean;
	line_items: InvoiceLineItem[];
}

function esc(val: unknown): string {
	const s = val?.toString() ?? '';
	if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

function row(values: (string | null | number | undefined)[]): string {
	return values.map(v => esc(v)).join(',');
}

export function generateInvoiceCsv(data: InvoiceCsvData): string {
	const cur = data.currency ? ` (${data.currency})` : '';

	const lines: string[] = [];

	// Section: Metadata
	lines.push(row(['INVOICE METADATA']));
	lines.push(row(['Invoice ID', 'Filename', 'Status', 'Created At']));
	lines.push(row([data.id, data.filename, data.status, data.created_at]));
	lines.push('');

	// Section: Details
	lines.push(row(['INVOICE DETAILS']));
	lines.push(row(['Vendor', 'Date', 'Total', 'Currency', 'Is Reviewed']));
	lines.push(row([data.vendor, data.date, data.total, data.currency, data.is_reviewed ? 'Yes' : 'No']));
	lines.push('');

	// Section: Line Items
	lines.push(row(['LINE ITEMS']));
	lines.push(row(['Item ID', 'Description', 'Quantity', `Unit Price${cur}`, `Amount${cur}`]));

	if (data.line_items.length) {
		for (const item of data.line_items) {
			lines.push(row([item.id ?? '', item.description, item.quantity, item.unit_price, item.amount]));
		}
	} else {
		lines.push(row(['', 'No line items found', '', '', '']));
	}

	lines.push('');
	const sum = Math.round(data.line_items.reduce((a, i) => a + (i.amount ?? 0), 0));
	lines.push(row(['', '', '', 'TOTAL AMOUNT', sum || 0]));

	return lines.join('\r\n');
}

export function generateInvoiceCsvTemplate(): string {
	const lines: string[] = [];

	// Section: Metadata
	lines.push(row(['INVOICE METADATA']));
	lines.push(row(['Invoice ID', 'Filename', 'Status', 'Created At']));
	lines.push(row(['', '', '', '']));
	lines.push('');

	// Section: Details
	lines.push(row(['INVOICE DETAILS']));
	lines.push(row(['Vendor', 'Date', 'Total', 'Currency', 'Is Reviewed']));
	lines.push(row(['', '', '', '', 'No']));
	lines.push('');

	// Section: Line Items
	lines.push(row(['LINE ITEMS']));
	lines.push(row(['Item ID', 'Description', 'Quantity', 'Unit Price (CUR)', 'Amount (CUR)']));
	lines.push(row(['', '', '', '', '']));
	lines.push('');
	lines.push(row(['', '', '', 'TOTAL AMOUNT', '']));

	return lines.join('\r\n');
}
