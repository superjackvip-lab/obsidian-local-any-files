import { App, PluginSettingTab, Setting } from 'obsidian';
import LocalAnyFilesPlugin from './main';
import { SettingsBuilder } from "./settings-builder";

export class LocalAnyFilesSettingTab extends PluginSettingTab {
    plugin: LocalAnyFilesPlugin;

    constructor(app: App, plugin: LocalAnyFilesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        // Create settings builder
        const builder = new SettingsBuilder(containerEl, this.plugin);

        // Processing
        new Setting(containerEl).setName('Processing').setHeading();
        builder.addScopeDropdown();
        builder.addTasksDropdown();

        // File Extensions
        new Setting(containerEl).setName('File extensions').setHeading();
        builder.addPresetExtensions();
        builder.addCustomExtensions();
        builder.addFinalExtensionsDisplay();

        // Storage
        new Setting(containerEl).setName('Storage').setHeading();
        builder.addStorePath();
    }
}
