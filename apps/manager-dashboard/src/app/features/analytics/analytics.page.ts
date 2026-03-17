import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-analytics',
  template: `
    <div class="page-placeholder">
      <h2>Analytics & Charts</h2>
      <p>Workforce productivity trends, labor cost analysis, and more.</p>
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
export class AnalyticsPage {}
