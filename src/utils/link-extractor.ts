// utils/link-extractor.ts
// utils/file-downloader.ts
import { requestUrl, RequestUrlResponse } from 'obsidian';
import LocalAttachmentsPlugin from '../main';


// Simple hash function that works in any JavaScript environment
export function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive hex string and take first 8 characters
    return Math.abs(hash).toString(16).substring(0, 8);
}

export interface ExtractedLink {
	originalLink: string;
	fileExtension: string;
	fileName: string;
	position: {
		start: number;
		end: number;
	};
	isMarkdownImage?: boolean;
}

export class LinkExtractor {
	private extensions: string[];
	private allowImages: boolean;

	constructor(extensions: string[], presetExtensions: string[] = []) {
		// Ensure all extensions are lowercase for case-insensitive comparison
		this.extensions = extensions.map(ext => ext.toLowerCase());
		this.allowImages = presetExtensions.includes('image');
	}

	extractFromText(text: string): ExtractedLink[] {
		const links: ExtractedLink[] = [];
		const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
		const markdownLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
		const directLinkRegex = /(https?:\/\/[^\s<>)"]+)/g;
		const processedUrls = new Set<string>();

		// Helper function to check if URL is external
		const isExternalUrl = (url: string): boolean => {
			return url.startsWith('http://') || url.startsWith('https://');
		};

		// Process markdown image links only if image preset is enabled
		let match;
		if (this.allowImages) {
			while ((match = markdownImageRegex.exec(text)) !== null) {
				const [fullMatch, , imgUrl] = match;
				if (!processedUrls.has(imgUrl) && isExternalUrl(imgUrl)) {
					processedUrls.add(imgUrl);
					links.push({
						originalLink: imgUrl,
						fileExtension: this.getExtension(imgUrl),
						fileName: this.getFileName(imgUrl),
						position: {
							start: match.index,
							end: match.index + fullMatch.length
						},
						isMarkdownImage: true
					});
				}
			}
		}
		
		// Process markdown links (excluding those that were already processed as images)
		while ((match = markdownLinkRegex.exec(text)) !== null) {
			const [fullMatch, title, url] = match;
		
			// Skip if this is an image link (starts with !) or if we've already processed this URL
			// or if it's not an external URL
			if (!fullMatch.startsWith('!') && !processedUrls.has(url) && isExternalUrl(url)) {
				processedUrls.add(url);
				const extension = this.getExtension(url).toLowerCase();

				if (this.extensions.includes(extension)) {
					links.push({
						originalLink: url,
						fileExtension: extension,
						fileName: title || this.getFileName(url),
						position: {
							start: match.index,
							end: match.index + fullMatch.length
						},
						isMarkdownImage: false
					});
				}
			}
		}

		// Extract direct links
		while ((match = directLinkRegex.exec(text)) !== null) {
			const [url] = match;
			if (!processedUrls.has(url) && isExternalUrl(url)) {
				const extension = this.getExtension(url).toLowerCase();
				if (this.extensions.includes(extension)) {
					processedUrls.add(url);
					links.push({
						originalLink: url,
						fileExtension: extension,
						fileName: this.getFileName(url),
						position: {
							start: match.index,
							end: match.index + url.length
						},
						isMarkdownImage: false
					});
				}
			}
		}

		return links;
	}

	private hasValidExtension(url: string): boolean {
		const urlLower = url.toLowerCase();
		return this.extensions.some(ext => urlLower.endsWith(ext));
	}

	private getExtension(url: string): string {
		try {
			// Parse the URL and get the pathname
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			
			// Get the filename from the last segment of the path
			let filename = pathname.split('/').pop() || '';
			
			// Remove query parameters if present in the filename
			filename = filename.split('?')[0];
			
			// Extract just the extension
			const matches = filename.match(/\.([^.]+)$/);
			return matches ? '.' + matches[1].toLowerCase() : '';
		} catch (error) {
			// If URL parsing fails, try to extract extension directly from the string
			const lastDotIndex = url.lastIndexOf('.');
			if (lastDotIndex === -1) return '';
			return url.slice(lastDotIndex).toLowerCase();
		}
	}

	private getFileName(url: string): string {
		try {
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			
			// Get the filename from the last segment of the path
			const lastSegment = pathname.split('/').pop() || '';
			
			// Remove any query parameters or hash if present
			const filename = lastSegment.split(/[?#]/)[0];
			
			if (!filename) return 'untitled';
			
			// Generate a clean filename by:
			// 1. Removing any problematic characters
			// 2. Preserving the extension we detected
			const extension = this.getExtension(url);
			const nameWithoutExt = filename.substring(0, filename.length - extension.length);
			const cleanName = nameWithoutExt
				.replace(/[^a-zA-Z0-9-_]/g, '_') // Replace invalid characters with underscore
				.replace(/_+/g, '_') // Replace multiple underscores with single one
				.replace(/^_|_$/g, ''); // Remove leading/trailing underscores
			
			return cleanName + extension;
		} catch (error) {
			// Fallback for malformed URLs
			const segments = url.split('/');
			const lastSegment = segments[segments.length - 1] || 'untitled';
			const extension = this.getExtension(url);
			const nameWithoutExt = lastSegment.substring(0, lastSegment.length - extension.length);
			
			return nameWithoutExt
				.replace(/[^a-zA-Z0-9-_]/g, '_')
				.replace(/_+/g, '_')
				.replace(/^_|_$/g, '') + extension;
		}
	}
}