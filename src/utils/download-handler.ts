import { App, Notice, TFile } from 'obsidian';
import { OptionsModal } from 'src/options-modal';
import LocalAnyFilesPlugin from '../main';
import { ProcessModal } from '../process-modal';
import { SettingsBuilder } from '../settings-builder';
import { FileDownloader } from './file-downloader';
import { LinkExtractor } from './link-extractor';
import { LinkReplacer } from './link-replacer';
import { generatePathVariables } from './variables-helper';

export class DownloadHandler {
    constructor(
        private plugin: LocalAnyFilesPlugin,
        private app: App
    ) {}

    async handleDownloadWithOptions(defaultScope?: 'currentFile' | 'currentFolder' | 'allFiles') {
        new OptionsModal(
            this.app,
            this.plugin,
            () => this.handleDownload(),
            defaultScope
        ).open();
    }

    async handleDownload() {
        const validationResult = SettingsBuilder.validateSettings(this.plugin.settings);
        if (!validationResult.isValid) {
            new Notice('Please fix the following issues:\n' + validationResult.errors.join('\n'), 5000);
            return;
        }

        const modal = new ProcessModal(this.app, this.plugin, async () => {
            try {
                // Get files to process based on scope
                let documents: TFile[] = [];
                const activeDocument = this.app.workspace.getActiveFile();
                
                switch (this.plugin.settings.scope) {
                    case 'currentFile':
                        documents = activeDocument ? [activeDocument] : [];
                        break;
                    case 'allFiles':
                        documents = this.app.vault.getMarkdownFiles();
                        break;
                    case 'currentFolder':
                        if (activeDocument) {
                            const currentFolder = activeDocument.parent?.path || '';
                            documents = this.app.vault.getMarkdownFiles()
                                .filter(document => document.parent?.path === currentFolder);
                        }
                        break;
                }

                let processedDocuments = 0;
                const totalDocuments = documents.length;

                if (totalDocuments === 0) {
                    modal.addLog('No documents found in the selected scope.', 'error');
                    return;
                }

                // Initialize stats
                modal.updateStats({
                    totalNotes: totalDocuments,
                    processedNotes: 0,
                    totalLinks: 0,
                    downloadedFiles: 0,
                    failedFiles: 0
                });

                let totalLinks = 0;
                let downloadedFiles = 0;
                let failedFiles = 0;

                for (const document of documents) {
                    modal.startDocumentLog(document.path);
                    const content = await this.app.vault.read(document);

                    // Extract links
                    const extractor = new LinkExtractor(
                        this.plugin.getFinalProcessingExtensions(),
                        this.plugin.settings.presetExtensions
                    );
                    const links = extractor.extractFromText(content);
                    totalLinks += links.length;
                    modal.addLog(`Found ${links.length} links in ${document.path}`, 'success', 'extract');

                    // If only extract task is enabled, display each found link
                    if (this.plugin.settings.tasks.length === 1 && this.plugin.settings.tasks.includes('extract')) {
                        for (const link of links) {
                            modal.addLog(`Link: ${link.originalLink}`, 'info', 'extract');
                            modal.addDivider();
                        }
                        modal.updateDocumentProgress(document.path, links.length, links.length, 0);
                    }

                    // Download files
                    if (this.plugin.settings.tasks.includes('download')) {
                        let fileSuccessCount = 0;
                        let fileFailedCount = 0;

                        const downloadResults = new Map<string, string>();
                        for (const link of links) {
                            const downloader = new FileDownloader(
                                this.plugin,
                                this.plugin.settings.storePath,
                                generatePathVariables(document.path),
                                this.plugin.settings.storeFileName
                            );

                            modal.addDivider();
                            modal.addLog(`File: ${link.originalLink}`, 'info', 'download');
                            
                            const result = await downloader.downloadFile(
                                link.originalLink,
                                link.fileName,
                                link.isMarkdownImage
                            );

                            if (result.success) {
                                modal.addLog(`Status: ✓ Success`, 'success', 'download');
                                modal.addLog(`SavedPath: ${result.localPath}`, 'success', 'download');
                                downloadedFiles++;
                                fileSuccessCount++;
                                downloadResults.set(link.originalLink, result.localPath);
                            } else {
                                modal.addLog(`Status: ✗ Failed`, 'error', 'download');
                                modal.addLog(`Error: ${result.error}`, 'error', 'download');
                                failedFiles++;
                                fileFailedCount++;
                            }

                            modal.updateDocumentProgress(document.path, links.length, fileSuccessCount, fileFailedCount);

                            // Update stats after each download
                            modal.updateStats({
                                totalLinks,
                                downloadedFiles,
                                failedFiles
                            });
                        }

                        // Replace links
                        if (this.plugin.settings.tasks.includes('replace') && downloadResults.size > 0) {
                            modal.addDivider();
                            const replacer = new LinkReplacer();
                            const newContent = replacer.replaceInText(content, downloadResults);
                            
                            // Use the processor API to modify the file content
                            await this.app.fileManager.processFrontMatter(document, (frontmatter) => {
                                // Keep the frontmatter unchanged
                            });
                            
                            await this.app.vault.modify(document, newContent);
                            
                            modal.addLog(`Updated links in ${document.path}`, 'success', 'replace');
                        }
                    }

                    processedDocuments++;
                    modal.updateProgress((processedDocuments / totalDocuments) * 100);
                    modal.updateStats({ processedNotes: processedDocuments });
                }

                modal.addDivider();
                modal.addLog('Processing current document complete!', 'success');
            } catch (error) {
                modal.addLog(`Error: ${error.message}`, 'error');
            }
        });
        modal.open();
    }

    async handleSingleDownload(documentPath: string) {
        // Set scope to singleItem before opening modal
        this.plugin.settings.scope = 'singleItem';
        await this.plugin.saveSettings();
        
        const validationResult = SettingsBuilder.validateSettings(this.plugin.settings);
        if (!validationResult.isValid) {
            new Notice('Please fix the following issues:\n' + validationResult.errors.join('\n'), 5000);
            return;
        }

        const modal = new ProcessModal(this.app, this.plugin, async () => {
            modal.startDocumentLog(documentPath);
            const downloader = new FileDownloader(
                this.plugin,
                this.plugin.settings.storePath,
                generatePathVariables(documentPath),
                this.plugin.settings.storeFileName
            );

            try {
                // Extract links to verify if it's a valid target
                const extractor = new LinkExtractor(
                    this.plugin.getFinalProcessingExtensions(),
                    this.plugin.settings.presetExtensions
                );
                const links = extractor.extractFromText(documentPath);
                const totalLinks = links.length;

                if (totalLinks === 0) {
                    modal.addLog(`Status: ✗ Failed`, 'error');
                    modal.addLog(`Error: No valid links found with target extensions`, 'error');
                    modal.updateDocumentProgress(documentPath, 0, 0, 0);
                    modal.updateStats({
                        totalNotes: 1,
                        processedNotes: 1,
                        totalLinks: 0,
                        downloadedFiles: 0,
                        failedFiles: 0
                    });
                    return;
                }

                const result = await downloader.downloadFile(documentPath, documentPath.split('/').pop() || 'untitled');
                
                if (result.success) {
                    modal.addLog(`Status: ✓ Success`, 'success');
                    modal.addLog(`SavedPath: ✓ ${result.localPath}`, 'success');
                    modal.updateDocumentProgress(documentPath, totalLinks, 1, 0);
                    modal.updateStats({
                        totalNotes: 1,
                        processedNotes: 1,
                        totalLinks,
                        downloadedFiles: 1,
                        failedFiles: 0
                    });
                } else {
                    modal.addLog(`Status: ✗ Failed`, 'error');
                    modal.addLog(`Error: ${result.error}`, 'error');
                    modal.updateDocumentProgress(documentPath, totalLinks, 0, 1);
                    modal.updateStats({
                        totalNotes: 1,
                        processedNotes: 1,
                        totalLinks,
                        downloadedFiles: 0,
                        failedFiles: 1
                    });
                }
            } catch (error) {
                modal.addLog(`Error downloading attachment: ${error.message}`, 'error');
                modal.updateStats({
                    totalNotes: 1,
                    processedNotes: 1,
                    totalLinks: 0,
                    downloadedFiles: 0,
                    failedFiles: 1
                });
            }
        });
        modal.open();
    }
}
