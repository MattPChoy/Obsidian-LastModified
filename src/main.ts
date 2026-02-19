import { Plugin, TFile } from 'obsidian';

export default class ModifiedDateTrackerPlugin extends Plugin {
  private processingFiles = new Set<string>();

  async onload() {
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

        if (!fm.Modified) {
          fm.Modified = [];
        } else if (!Array.isArray(fm.Modified)) {
          fm.Modified = [String(fm.Modified)];
        }

        const dates: string[] = fm.Modified.map((d: unknown) => String(d));
        if (dates.includes(today)) return; // no-op → no file write → no re-trigger

        fm.Modified = [...dates, today];
      })
      .catch((err) => {
        // Clean up guard if write failed so future saves aren't silently skipped
        this.processingFiles.delete(file.path);
        console.error('[modified-date-tracker] frontmatter update failed:', err);
      });
  }
}
