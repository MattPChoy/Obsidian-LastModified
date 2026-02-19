import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface ModifiedDateSettings {
  propertyName: string;
}

const DEFAULT_SETTINGS: ModifiedDateSettings = {
  propertyName: 'Modified',
};

export default class ModifiedDateTrackerPlugin extends Plugin {
  settings: ModifiedDateSettings;
  private processingFiles = new Set<string>();

  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new ModifiedDateSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.handleModify(file);
        }
      })
    );
  }

  private handleModify(file: TFile): void {
    // Guard against infinite loop: processFrontMatter writes back to disk,
    // which fires 'modify' again. Skip that internally-triggered event.
    if (this.processingFiles.has(file.path)) {
      this.processingFiles.delete(file.path);
      return;
    }

    this.processingFiles.add(file.path);

    this.app.fileManager
      .processFrontMatter(file, (fm) => {
        const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        const prop = this.settings.propertyName;

        if (!fm[prop]) {
          fm[prop] = [];
        } else if (!Array.isArray(fm[prop])) {
          fm[prop] = [String(fm[prop])];
        }

        const dates: string[] = fm[prop].map((d: unknown) => String(d));
        if (dates.includes(today)) return; // no-op → no file write → no re-trigger

        fm[prop] = [...dates, today];
      })
      .catch((err) => {
        // Clean up guard if write failed so future saves aren't silently skipped
        this.processingFiles.delete(file.path);
        console.error('[modified-date-tracker] frontmatter update failed:', err);
      });
  }
}

class ModifiedDateSettingTab extends PluginSettingTab {
  plugin: ModifiedDateTrackerPlugin;

  constructor(app: App, plugin: ModifiedDateTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName('Frontmatter property name')
      .setDesc('The YAML key where modified dates are stored (default: Modified)')
      .addText(text => text
        .setPlaceholder('Modified')
        .setValue(this.plugin.settings.propertyName)
        .onChange(async (value) => {
          this.plugin.settings.propertyName = value.trim() || 'Modified';
          await this.plugin.saveData(this.plugin.settings);
        }));
  }
}
