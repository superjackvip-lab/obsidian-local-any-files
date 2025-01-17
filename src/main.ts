import { MarkdownView, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, EXTENSION_PRESETS } from "./config";
import { LocalAnyFilesSettingTab } from "./settings-tab";
import { SingleItemModal } from './single-item-modal';
import { DownloadHandler } from './utils/download-handler';

export default class LocalAnyFilesPlugin extends Plugin {
    settings: LocalAnyFilesSettings;
    private downloadHandler: DownloadHandler;

    async onload() {
        await this.loadSettings();
        
        this.downloadHandler = new DownloadHandler(this, this.app);

        // Add commands
        this.addCommand({
            id: 'local-anything',
            name: 'Download attachments from links',
            callback: () => this.downloadHandler.handleDownloadWithOptions()
        });

        this.addCommand({
            id: 'local-anything-use-previous-options',
            name: 'Download attachments from links (use previous options)',
            callback: () => this.downloadHandler.handleDownload()
        });

        // Register context menu events

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor, view) => {
                if (view instanceof MarkdownView) {
                    const pos = editor.getCursor();
                    const line = editor.getLine(pos.line);
                    const linkMatch = line.match(/\[([^\]]*)\]\(([^)]+)\)/);
                    const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                    
                    if (linkMatch || imageMatch) {
                        const match = linkMatch || imageMatch;
                        if (match) {
                            const url = match[2];
                            // Extract extension from URL, handling query parameters and paths
                            let ext = '';
                            try {
                                const urlObj = new URL(url);
                                const pathname = urlObj.pathname;
                                // Remove query parameters and hash fragments
                                const cleanPath = pathname.split(/[?#]/)[0];
                                // Get the last segment of the path and extract extension
                                const lastSegment = cleanPath.split('/').pop() || '';
                                const matches = lastSegment.match(/\.([^.]+)$/);
                                ext = matches ? '.' + matches[1].toLowerCase() : '';
                            } catch {
                                // If not a valid URL, try basic extension extraction
                                ext = '.' + (url.split('.').pop() || '').toLowerCase().split(/[?#]/)[0];
                            }
                            
                            // Check if it's an image URL or matches preset extensions
                            const isImage = EXTENSION_PRESETS.image.includes(ext);
                            const finalExtensions = this.getFinalProcessingExtensions();
                            const isPresetExtension = finalExtensions && finalExtensions.includes(ext);

                            console.debug('URL:', url, 'Extension:', ext, 'Is Image:', isImage, 'Is Preset:', isPresetExtension);
                            
                            if (isImage || isPresetExtension) {
                                menu.addItem((item) => {
                                    item
                                        .setTitle('Download to local')
                                        .setIcon('download')
                                        .onClick(async () => {
                                            if (this.settings) {
                                                new SingleItemModal(this.app, this, url, async () => {
                                                    await this.downloadHandler.handleSingleDownload(url);
                                                }).open();
                                            }
                                        });
                                });
                            }
                        }
                    }
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                // Only show the option for markdown files
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item) => {
                        item
                            .setTitle('Download files (current note)')
                            .setIcon('download')
                            .onClick(() => this.downloadHandler.handleDownloadWithOptions('currentFile'));
                    });
                }
            })
        );

        // Add settings tab
        this.addSettingTab(new LocalAnyFilesSettingTab(this.app, this));
    }

    async loadSettings() {
        const data = await this.loadData();
        this.settings = {
            ...DEFAULT_SETTINGS,
            ...data,
            // Ensure scope always has a valid value
            scope: data?.scope || DEFAULT_SETTINGS.scope || 'currentFile'
        };
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getFinalProcessingExtensions(): string[] {
        const presetExts = this.settings.presetExtensions
            .flatMap(preset => EXTENSION_PRESETS[preset]);
        return [...new Set([...presetExts, ...this.settings.customExtensions])];
    }
}
