import { App, Modal } from 'obsidian';
import LocalAnyFilesPlugin from './main';

export class ProcessModal extends Modal {
    private progressBar: HTMLDivElement;
    private progressFill: HTMLDivElement;
    private logsContainer: HTMLDivElement;
    private statsContainer: HTMLDivElement;
    private currentLogContainer: HTMLDivElement | null = null;
    private documentStats: Map<string, { links: number, success: number, failed: number }> = new Map();
    private progress = 0;
    private logs: string[] = [];
    private processCallback: () => Promise<void>;
    private plugin: LocalAnyFilesPlugin;
    private currentTask: Task | null = null;
    private taskDisplayNames: Record<Task, string> = {
        extract: 'Extract links',
        download: 'Download files',
        replace: 'Replace links'
    };
    private stats = {
        totalNotes: 0,
        processedNotes: 0,
        totalLinks: 0,
        downloadedFiles: 0,
        failedFiles: 0
    };

    constructor(app: App, plugin: LocalAnyFilesPlugin, processCallback: () => Promise<void>) {
        super(app);
        this.plugin = plugin;
        this.processCallback = processCallback;
        this.titleEl.setText('Local any files > Processing')
    }

    onOpen() {

        const {contentEl} = this;
        contentEl.empty();

        // Stats section
        this.statsContainer = contentEl.createDiv({cls: 'stats-container'});
        this.updateStats();

        // Progress section
        const progressSection = contentEl.createDiv({cls: 'custom-progress-section'});
        this.progressBar = progressSection.createDiv({cls: 'custom-progress-bar'});
        this.progressFill = this.progressBar.createDiv({cls: 'custom-progress-fill'});

        // Logs section
        this.logsContainer = contentEl.createDiv({cls: 'logs-container'});

        // Initialize progress
        this.updateProgress(0);

        // Start processing
        this.processCallback();
    }

    private createCopyableText(text: string, container: HTMLElement, className?: string) {
        const span = container.createSpan({
            cls: `copyable-text ${className || ''}`,
            text: text
        });

        span.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(text);
                span.addClass('copied');
                setTimeout(() => span.removeClass('copied'), 1000);
            } catch (err) {
                console.error('Failed to copy text:', err);
            }
        });

        return span;
    }

    private isTaskEnabled(task: Task): boolean {
        return this.plugin.settings.tasks.includes(task);
    }

    updateProgress(value: number) {
        this.progress = value;
        if (this.progressFill) {
            this.progressFill.style.setProperty('--progress-width', `${value}%`);
        }
    }

    updateStats(stats?: Partial<typeof this.stats>) {
        if (stats) {
            this.stats = { ...this.stats, ...stats };
        }

        if (this.statsContainer) {
            this.statsContainer.empty();
            
            const createStatItem = (value: number, label: string, type: string) => {
                const item = this.statsContainer.createDiv({cls: 'stat-item'});
                item.createDiv({cls: `stat-value stat-value-${type}`, text: value.toString()});
                item.createDiv({cls: 'stat-label', text: label});
            };

            createStatItem(this.stats.processedNotes, 'Notes Processed', 'processed');
            createStatItem(this.stats.totalNotes, 'Total Notes', 'total');
            createStatItem(this.stats.totalLinks, 'Links Found', 'found');
            createStatItem(this.stats.downloadedFiles, 'Downloads', 'downloads');
            createStatItem(this.stats.failedFiles, 'Failed', 'failed');
        }
    }

    startDocumentLog(docTitle: string) {
        // Create a new document container
        const container = this.logsContainer.createDiv({ cls: 'log-document-container' });
        
        // Create header with title and stats
        const header = container.createDiv({ cls: 'log-document-header' });
        header.createDiv({ cls: 'log-document-title', text: docTitle });
        header.createDiv({ cls: 'log-document-stats' });
        
        // Initialize stats for this document
        this.documentStats.set(docTitle, { links: 0, success: 0, failed: 0 });
        this.updateDocumentStats(docTitle);

        // Create content container
        const content = container.createDiv({ cls: 'log-document-content' });
        
        // Add click handler for collapsing
        header.addEventListener('click', () => {
            header.toggleClass('collapsed', !header.hasClass('collapsed'));
            content.toggleClass('collapsed', header.hasClass('collapsed'));
        });

        this.currentLogContainer = content;
        return content;
    }

    updateDocumentStats(docTitle: string, statsElement?: HTMLElement) {
        const stats = this.documentStats.get(docTitle);
        if (!stats) return;

        const statsText = `Links: ${stats.links} / Success: ${stats.success} / Failed: ${stats.failed}`;
        if (statsElement) {
            statsElement.setText(statsText);
        }
    }

    addLog(message: string, type: 'success' | 'error' | 'info' = 'info', task?: Task) {
        if (task && !this.isTaskEnabled(task)) {
            return;
        }

        this.logs.push(message);

        const container = this.currentLogContainer || this.logsContainer;
        const logDiv = container.createDiv({ cls: `log log-${type}` });

        // Check if the message contains a link or file path
        if (message.startsWith('Link: ')) {
            const link = message.substring(6);
            logDiv.createSpan({ text: 'Link: ' });
            this.createCopyableText(link, logDiv, 'log-url');
        } else if (message.startsWith('File: ')) {
            const file = message.substring(6);
            logDiv.createSpan({ text: 'File: ' });
            this.createCopyableText(file, logDiv, 'log-url');
        } else if (message.startsWith('SavedPath: ')) {
            const path = message.substring(message.indexOf(': ') + 2);
            logDiv.createSpan({ text: 'SavedPath: ' });
            this.createCopyableText(path.replace('✓ ', ''), logDiv, 'log-saved-path');
        } else {
            logDiv.setText(message);
        }

        container.scrollTop = container.scrollHeight;
    }

    updateDocumentProgress(docTitle: string, links: number, success: number, failed: number) {
        const stats = this.documentStats.get(docTitle);
        if (stats) {
            stats.links = links;
            stats.success = success;
            stats.failed = failed;
            this.updateDocumentStats(docTitle);
        }
    }

    addDivider(thick = false) {
        const container = this.currentLogContainer || this.logsContainer;
        container.createDiv({
            cls: `log-divider${thick ? ' thick' : ''}`
        });
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
