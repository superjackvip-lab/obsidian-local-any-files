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
        new Setting(containerEl).setName('处理设置').setHeading();
        builder.addScopeDropdown();
        builder.addTasksDropdown();

        // File Extensions
        new Setting(containerEl).setName('文件扩展名').setHeading();
        builder.addPresetExtensions();
        builder.addCustomExtensions();
        builder.addFinalExtensionsDisplay();

        // Storage
        new Setting(containerEl).setName('存储设置').setHeading().setDesc(builder.getStorageSectionHeaderDesc());
        builder.addStorePath();
    }
}
