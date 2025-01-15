import { requestUrl, RequestUrlResponse } from "obsidian";
import LocalAttachmentsPlugin from "src/main";
import { simpleHash } from "./link-extractor";

export interface DownloadResult {
	success: boolean;
	localPath: string;
	error?: string;
}

export class FileDownloader {
	private storePath: string;
	private variables: Record<string, string>;
	private storeFileName: string;
	private plugin: LocalAttachmentsPlugin;

	constructor(plugin: LocalAttachmentsPlugin, storePath: string, variables: Record<string, string>, storeFileName: string) {
		this.plugin = plugin;
		this.storePath = storePath;
		this.variables = variables;
		this.storeFileName = storeFileName || '${originalName}';
	}

	private getCleanFileName(url: string): string {
		try {
			// Parse the URL and get the pathname
			const urlObj = new URL(url);
			const pathname = urlObj.pathname;
			
			// Get the filename from the last segment of the path
			let filename = pathname.split('/').pop() || '';
			
			// Remove query parameters if present in the filename
			filename = filename.split('?')[0];
			
			// If no filename found, use a hash of the full URL
			if (!filename) {
				filename = simpleHash(url);
			}
			
			return filename;
		} catch (error) {
			// If URL parsing fails, use a hash of the URL
			return simpleHash(url);
		}
	}

	private getExtension(fileName: string): string {
		const lastDotIndex = fileName.lastIndexOf('.');
		if (lastDotIndex === -1) return '';
		return fileName.slice(lastDotIndex).toLowerCase();
	}

	private getExtensionFromContentType(contentType: string): string {
		const mimeToExt: { [key: string]: string } = {
			'image/jpeg': '.jpg',
			'image/jpg': '.jpg',
			'image/png': '.png',
			'image/gif': '.gif',
			'image/webp': '.webp',
			'image/svg+xml': '.svg',
			'image/bmp': '.bmp',
			'image/tiff': '.tiff',
			'application/pdf': '.pdf',
			'video/mp4': '.mp4',
			'video/webm': '.webm',
			'audio/mpeg': '.mp3',
			'audio/wav': '.wav',
			'audio/webm': '.weba',
		};

		// Get the base MIME type without parameters
		const baseMimeType = contentType.split(';')[0].trim().toLowerCase();
		return mimeToExt[baseMimeType] || '.unknown';
	}

	private async getLocalPath(originalUrl: string, fileName: string, extension: string): Promise<string> {
		let path = this.storePath;
		const cleanFileName = this.getCleanFileName(originalUrl);

		// Replace variables in path
		Object.entries(this.variables).forEach(([key, value]) => {
			path = path.replace(`\${${key}}`, this.sanitizePath(value));
		});

		// Generate the filename using the pattern
		let generatedFileName = this.storeFileName;
		const fileVariables = {
			...this.variables,
			originalName: cleanFileName,
			md5: simpleHash(originalUrl)
		};

		Object.entries(fileVariables).forEach(([key, value]) => {
			generatedFileName = generatedFileName.replace(`\${${key}}`, this.sanitizePath(value));
		});

		// Ensure the filename has the correct extension
		if (!generatedFileName.endsWith(extension)) {
			generatedFileName += extension;
		}

		// Sanitize the final path
		path = this.sanitizePath(path);
		generatedFileName = this.sanitizePath(generatedFileName);

		return `${path}/${generatedFileName}`;
	}

	async downloadFile(url: string, fileName: string, isMarkdownImage = false): Promise<DownloadResult> {
		try {
			const response = await requestUrl({ url });

			if (response.status !== 200) {
				return {
					success: false,
					error: `Failed to download file: ${response.status} ${response.text}`,
					localPath: ''
				};
			}

			let extension = this.getExtension(fileName);
			
			// Only use content-type for markdown images without a clear extension
			if (isMarkdownImage && (!extension || extension === '.unknown')) {
				const contentType = response.headers['content-type'];
				if (contentType) {
					extension = this.getExtensionFromContentType(contentType);
				}
			}

			const localPath = await this.getLocalPath(url, fileName, extension);

			// Ensure the directory exists before saving
			const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
			await this.plugin.app.vault.adapter.mkdir(dirPath);

			// Save the file
			await this.saveFile(response, localPath);

			return {
				success: true,
				error: '',
				localPath: localPath
			};
		} catch (error) {
			return {
				success: false,
				error: `Error downloading file: ${error}`,
				localPath: ''
			};
		}
	}

	private sanitizePath(path: string): string {
		// Replace spaces and other common illegal characters with underscores
		return path.replace(/[\s<>:"\\|?*]/g, '_');
	}

	private async saveFile(response: RequestUrlResponse, path: string): Promise<void> {
		if (!this.plugin?.app?.vault?.adapter) {
			throw new Error('App vault adapter not found');
		}

		// Convert array buffer to binary string if needed
		let data: ArrayBuffer;
		if (response.arrayBuffer) {
			data = response.arrayBuffer;
		} else if (response.text) {
			// Convert text to ArrayBuffer if that's what we got
			const encoder = new TextEncoder();
			data = encoder.encode(response.text).buffer;
		} else {
			throw new Error('No valid data found in response');
		}

		await this.plugin.app.vault.adapter.writeBinary(path, data);
	}
}