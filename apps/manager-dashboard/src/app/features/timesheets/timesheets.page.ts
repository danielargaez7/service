import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-timesheets',
  template: `
    <div class="page-placeholder">
      <h2>Timesheet Approval Queue</h2>
      <p>Review and approve employee timesheets.</p>
    </div>
  `,
  styles: [`
    .page-placeholder {
      text-align: center;
      padding: 80px 20px;
      color: var(--sc-text-secondary, #64748b);
    }
    h2 { color: var(--sc-text-primary, #1e293b); margin-bottom: 8px; }
  `],
})
export class TimesheetsPage {}
