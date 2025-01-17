import { App, Modal, Notice, Setting } from 'obsidian';
import LocalAnyFilesPlugin from "./main";
import { SettingsBuilder } from "./settings-builder";
import { SettingsValidator } from "./utils/settings-validator";

export class OptionsModal extends Modal {
    private settingsBuilder: SettingsBuilder;

    constructor(
        app: App,
        private plugin: LocalAnyFilesPlugin,
        private onSubmit: () => void,
        private defaultScope?: 'currentFile' | 'currentFolder' | 'allFiles'
    ) {
        super(app);
        this.settingsBuilder = new SettingsBuilder(this.contentEl, this.plugin, this.defaultScope);
        this.titleEl.setText('Local anything > Options');
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        // Processing
        new Setting(contentEl).setName('Processing').setHeading();
        this.settingsBuilder.addScopeDropdown();
        this.settingsBuilder.addTasksDropdown();

        // File extensions
        new Setting(contentEl).setName('File extensions').setHeading();
        this.settingsBuilder.addPresetExtensions();
        this.settingsBuilder.addCustomExtensions();
        this.settingsBuilder.addFinalExtensionsDisplay();

        // Storage
        new Setting(contentEl).setName('Storage').setHeading().setDesc('Available variables: ${originalName}, ${random}, ${notename}, ${date}, ${time}, ${extension}, ${year} , ${month}, ${day}, ${hour}, ${minute}, ${second}.');
        this.settingsBuilder.addStorePath();

        // Add submit button
        const submitButton = contentEl.createEl('button', {
            text: 'Start processing',
            cls: 'mod-cta'
        });
        submitButton.addEventListener('click', () => {
            this.handleSubmit();
        });
    }

    private async handleSubmit() {
        const validationResult = SettingsValidator.validateSettings(this.plugin.settings);
        if (!validationResult.isValid) {
            new Notice('Please fix the following issues:\n' + validationResult.errors.join('\n'), 5000);
            return;
        }
        this.close();
        this.onSubmit();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
