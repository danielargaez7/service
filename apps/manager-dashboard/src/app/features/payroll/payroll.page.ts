import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-payroll',
  template: `
    <div class="page-placeholder">
      <h2>Payroll Reports</h2>
      <p>Generate and export payroll data for all employees.</p>
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
export class PayrollPage {}
