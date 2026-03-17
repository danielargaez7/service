import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-compliance',
  template: `
    <div class="page-placeholder">
      <h2>Compliance Risk Dashboard</h2>
      <p>Monitor labor law compliance and risk indicators.</p>
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
export class CompliancePage {}
