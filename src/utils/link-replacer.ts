export class LinkReplacer {
	replaceInText(text: string, replacements: Map<string, string>): string {
		let newText = text;
		for (const [originalLink, localPath] of replacements.entries()) {
			// Extract just the filename from the full path
			const fileName = localPath.split('/').pop() || localPath;
			
			// Check if the link is part of an image syntax
			const imagePattern = new RegExp(`!\\[([^\\]]*)\\]\\(${this.escapeRegExp(originalLink)}\\)`, 'g');
			// Check if the link is part of a regular markdown link syntax
			const linkPattern = new RegExp(`(?<!!)\\[([^\\]]*)\\]\\(${this.escapeRegExp(originalLink)}\\)`, 'g');
			
			if (imagePattern.test(newText)) {
				// If it's an image link, replace while preserving any alt text
				newText = newText.replace(imagePattern, `![$1](${fileName})`);
			} else if (linkPattern.test(newText)) {
				// If it's a regular link, replace while preserving the link text
				newText = newText.replace(linkPattern, `[$1](${fileName})`);
			} else {
				// If it's a direct URL, convert it to a regular markdown link
				newText = newText.replace(originalLink, `[${fileName}](${fileName})`);
			}
		}
		return newText;
	}

	private escapeRegExp(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
