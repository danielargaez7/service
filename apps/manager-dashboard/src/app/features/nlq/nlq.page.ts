import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-nlq',
  template: `
    <div class="page-placeholder">
      <h2>Natural Language Query</h2>
      <p>Ask questions about your workforce data in plain English.</p>
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
export class NlqPage {}
