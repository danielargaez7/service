import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { environment } from '../../../environments/environment';

interface PayrollIssue {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string;
  actualEnd: string;
  issueType: 'MISSED_CLOCKOUT' | 'LONG_SHIFT' | 'GPS_MISMATCH' | 'OT_ANOMALY' | 'EARLY_CLOCKIN';
  summary: string;
  explanation: string;
  suggestedAction: string;
  resolved: boolean;
  resolution?: string;
  correctedEnd?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SelectModule],
  selector: 'app-payroll-issues',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="issues-page">
      <!-- Progress Bar -->
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progressPercent()"></div>
      </div>

      <div class="issues-header">
        <button class="back-btn" (click)="goBack()">
          <i class="pi pi-arrow-left"></i> Back to Payroll
        </button>
        <div class="header-center">
          <h2>Payroll Issue Review</h2>
          <p>{{ resolvedCount() }} of {{ issues().length }} resolved</p>
        </div>
        <button class="done-btn" [disabled]="resolvedCount() < issues().length" (click)="finishReview()">
          Finish Review
        </button>
      </div>

      @if (currentIssue()) {
        <div class="issue-card">
          <!-- Issue Counter -->
          <div class="issue-counter">
            <span>Issue {{ currentIndex() + 1 }} of {{ issues().length }}</span>
            <div class="issue-type-badge" [class]="'type-' + currentIssue()!.issueType">
              {{ issueTypeLabel(currentIssue()!.issueType) }}
            </div>
          </div>

          <!-- Employee Info -->
          <div class="issue-employee">
            <div class="emp-avatar">{{ currentIssue()!.employeeName.split(' ').map(n => n[0]).join('') }}</div>
            <div>
              <h3>{{ currentIssue()!.employeeName }}</h3>
              <span>{{ currentIssue()!.date }}</span>
            </div>
          </div>

          <!-- The Problem (plain English) -->
          <div class="issue-explanation">
            <div class="explanation-icon"><i class="pi pi-info-circle"></i></div>
            <div>
              <strong>What happened</strong>
              <p>{{ currentIssue()!.explanation }}</p>
            </div>
          </div>

          <!-- Schedule vs Actual -->
          <div class="time-comparison">
            <div class="time-block scheduled">
              <span class="time-label">Scheduled</span>
              <span class="time-value">{{ currentIssue()!.scheduledStart }} – {{ currentIssue()!.scheduledEnd }}</span>
            </div>
            <div class="time-arrow"><i class="pi pi-arrow-right"></i></div>
            <div class="time-block actual" [class.flagged]="true">
              <span class="time-label">Actual</span>
              <span class="time-value">{{ currentIssue()!.actualStart }} – {{ currentIssue()!.actualEnd }}</span>
            </div>
          </div>

          <!-- Suggested Action -->
          <div class="suggested-action">
            <i class="pi pi-lightbulb"></i>
            <span>{{ currentIssue()!.suggestedAction }}</span>
          </div>

          <!-- Resolution Actions -->
          @if (!currentIssue()!.resolved) {
            <div class="resolution-section">
              <h4>How would you like to resolve this?</h4>
              <div class="resolution-options">
                <button class="resolution-btn accept" (click)="resolveAs('CORRECTED', currentIssue()!.scheduledEnd)">
                  <i class="pi pi-check"></i>
                  <div>
                    <strong>Correct to scheduled time</strong>
                    <span>Set clock-out to {{ currentIssue()!.scheduledEnd }}</span>
                  </div>
                </button>
                <button class="resolution-btn approve" (click)="resolveAs('APPROVED', currentIssue()!.actualEnd)">
                  <i class="pi pi-thumbs-up"></i>
                  <div>
                    <strong>Approve as-is</strong>
                    <span>Accept the actual hours worked</span>
                  </div>
                </button>
                <button class="resolution-btn custom" (click)="showCustom.set(true)">
                  <i class="pi pi-pencil"></i>
                  <div>
                    <strong>Set custom time</strong>
                    <span>Enter the correct clock-out time manually</span>
                  </div>
                </button>
              </div>

              @if (showCustom()) {
                <div class="custom-input">
                  <label>Corrected clock-out time</label>
                  <div class="custom-row">
                    <input pInputText type="time" [(ngModel)]="customTime" />
                    <button class="apply-btn" (click)="resolveAs('CUSTOM', customTime)" [disabled]="!customTime">Apply</button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="resolved-banner">
              <i class="pi pi-check-circle"></i>
              <span>Resolved: {{ currentIssue()!.resolution }}</span>
            </div>
          }

          <!-- Navigation -->
          <div class="issue-nav">
            <button class="nav-btn" [disabled]="currentIndex() === 0" (click)="prev()">
              <i class="pi pi-chevron-left"></i> Previous
            </button>
            <div class="nav-dots">
              @for (issue of issues(); track issue.id; let i = $index) {
                <button class="nav-dot" [class.active]="i === currentIndex()" [class.done]="issue.resolved" (click)="goTo(i)"></button>
              }
            </div>
            <button class="nav-btn" [disabled]="currentIndex() >= issues().length - 1" (click)="next()">
              Next <i class="pi pi-chevron-right"></i>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .issues-page { max-width: 700px; margin: 0 auto; }

    .progress-bar {
      height: 4px; background: #e2e8f0; border-radius: 4px; margin-bottom: 20px; overflow: hidden;
    }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #f97316, #10b981); transition: width 0.4s ease; border-radius: 4px; }

    .issues-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px;
    }
    .header-center { text-align: center; }
    .header-center h2 { margin: 0 0 4px; font-size: 1.2rem; font-weight: 700; color: var(--sc-text-primary); }
    .header-center p { margin: 0; font-size: 0.82rem; color: var(--sc-text-secondary); }
    .back-btn {
      border: none; background: none; color: var(--sc-text-secondary); font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; font-weight: 600;
    }
    .back-btn:hover { color: var(--sc-text-primary); }
    .done-btn {
      padding: 8px 20px; border: none; border-radius: 8px;
      background: #10b981; color: #fff; font-weight: 700; font-size: 0.85rem;
      cursor: pointer; font-family: inherit;
    }
    .done-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .issue-card {
      background: var(--sc-card-bg); border: 1px solid var(--sc-border); border-radius: 16px;
      padding: 28px 32px; display: flex; flex-direction: column; gap: 20px;
    }

    .issue-counter {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.78rem; color: var(--sc-text-secondary); font-weight: 600;
    }
    .issue-type-badge {
      padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .type-MISSED_CLOCKOUT { background: #fef2f2; color: #dc2626; }
    .type-LONG_SHIFT { background: #fffbeb; color: #d97706; }
    .type-GPS_MISMATCH { background: #eff6ff; color: #2563eb; }
    .type-OT_ANOMALY { background: #fef2f2; color: #dc2626; }
    .type-EARLY_CLOCKIN { background: #f0fdf4; color: #16a34a; }

    .issue-employee { display: flex; align-items: center; gap: 14px; }
    .emp-avatar {
      width: 48px; height: 48px; border-radius: 12px; background: #f97316; color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem;
    }
    .issue-employee h3 { margin: 0 0 2px; font-size: 1.1rem; color: var(--sc-text-primary); }
    .issue-employee span { font-size: 0.82rem; color: var(--sc-text-secondary); }

    .issue-explanation {
      display: flex; gap: 14px; padding: 16px 18px; background: #f0f9ff; border: 1px solid #bae6fd;
      border-radius: 12px;
    }
    .explanation-icon { color: #0284c7; font-size: 1.2rem; flex-shrink: 0; margin-top: 2px; }
    .issue-explanation strong { display: block; font-size: 0.85rem; color: #0c4a6e; margin-bottom: 4px; }
    .issue-explanation p { margin: 0; font-size: 0.85rem; color: #0369a1; line-height: 1.5; }

    .time-comparison {
      display: flex; align-items: center; gap: 12px; justify-content: center;
    }
    .time-block {
      flex: 1; padding: 14px 18px; border-radius: 10px; text-align: center;
      display: flex; flex-direction: column; gap: 4px;
    }
    .time-block.scheduled { background: #f1f5f9; border: 1px solid #e2e8f0; }
    .time-block.flagged { background: #fef2f2; border: 2px solid #fca5a5; }
    .time-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--sc-text-secondary); }
    .time-value { font-size: 1.1rem; font-weight: 700; color: var(--sc-text-primary); }
    .time-arrow { color: var(--sc-text-secondary); font-size: 1rem; }

    .suggested-action {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px;
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
      font-size: 0.84rem; color: #92400e;
    }
    .suggested-action i { color: #f59e0b; }

    .resolution-section { display: flex; flex-direction: column; gap: 12px; }
    .resolution-section h4 { margin: 0; font-size: 0.9rem; color: var(--sc-text-primary); }
    .resolution-options { display: flex; flex-direction: column; gap: 8px; }
    .resolution-btn {
      display: flex; align-items: center; gap: 14px; padding: 14px 18px;
      border: 1px solid var(--sc-border); border-radius: 10px; background: #fff;
      cursor: pointer; font-family: inherit; text-align: left; transition: all 0.15s ease; width: 100%;
    }
    .resolution-btn:hover { transform: translateX(3px); }
    .resolution-btn.accept:hover { border-color: #10b981; background: #f0fdf4; }
    .resolution-btn.approve:hover { border-color: #3b82f6; background: #eff6ff; }
    .resolution-btn.custom:hover { border-color: #f97316; background: #fff7ed; }
    .resolution-btn i { font-size: 1.1rem; flex-shrink: 0; }
    .resolution-btn.accept i { color: #10b981; }
    .resolution-btn.approve i { color: #3b82f6; }
    .resolution-btn.custom i { color: #f97316; }
    .resolution-btn strong { display: block; font-size: 0.88rem; color: var(--sc-text-primary); }
    .resolution-btn span { font-size: 0.78rem; color: var(--sc-text-secondary); }

    .custom-input { display: flex; flex-direction: column; gap: 6px; }
    .custom-input label { font-size: 0.82rem; font-weight: 600; color: var(--sc-text-secondary); }
    .custom-row { display: flex; gap: 8px; }
    .custom-row input { flex: 1; }
    .apply-btn {
      padding: 8px 20px; border: none; border-radius: 8px;
      background: #f97316; color: #fff; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .apply-btn:disabled { opacity: 0.4; }

    .resolved-banner {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
      color: #15803d; font-weight: 600; font-size: 0.9rem;
    }
    .resolved-banner i { font-size: 1.2rem; }

    .issue-nav {
      display: flex; justify-content: space-between; align-items: center; padding-top: 8px;
      border-top: 1px solid var(--sc-border);
    }
    .nav-btn {
      border: none; background: none; color: var(--sc-text-secondary); font-size: 0.85rem;
      cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit; font-weight: 600;
    }
    .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .nav-btn:hover:not(:disabled) { color: var(--sc-text-primary); }
    .nav-dots { display: flex; gap: 6px; }
    .nav-dot {
      width: 10px; height: 10px; border-radius: 50%; border: 2px solid #cbd5e1;
      background: transparent; cursor: pointer; padding: 0; transition: all 0.15s ease;
    }
    .nav-dot.active { border-color: #f97316; background: #f97316; }
    .nav-dot.done { border-color: #10b981; background: #10b981; }

    @media (max-width: 640px) {
      .issue-card { padding: 20px 16px; }
      .time-comparison { flex-direction: column; }
      .time-arrow { transform: rotate(90deg); }
    }
  `],
})
export class PayrollIssuesPage implements OnInit {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly issues = signal<PayrollIssue[]>([]);
  readonly currentIndex = signal(0);
  readonly showCustom = signal(false);
  customTime = '';

  readonly currentIssue = computed(() => this.issues()[this.currentIndex()] ?? null);
  readonly resolvedCount = computed(() => this.issues().filter((i) => i.resolved).length);
  readonly progressPercent = computed(() =>
    this.issues().length > 0 ? (this.resolvedCount() / this.issues().length) * 100 : 0
  );

  ngOnInit(): void {
    // Generate realistic issues from seed data patterns
    this.issues.set([
      {
        id: 'issue-1', employeeName: 'Mike Chen', employeeId: 'emp-chen',
        date: 'Tuesday, March 17, 2026',
        scheduledStart: '5:30 AM', scheduledEnd: '2:00 PM',
        actualStart: '5:30 AM', actualEnd: '4:00 AM (next day)',
        issueType: 'MISSED_CLOCKOUT', resolved: false,
        summary: 'Missed clock-out — 22.5 hour shift recorded',
        explanation: 'Mike Chen was scheduled for a Roll-Off Delivery shift from 5:30 AM to 2:00 PM, but no clock-out was recorded. The system shows a 22.5 hour shift which suggests he forgot to clock out. His typical shift on this route averages 8.2 hours.',
        suggestedAction: 'Correct clock-out to 2:00 PM (scheduled end time). This matches his typical 8.5h shift pattern for Roll-Off routes.',
      },
      {
        id: 'issue-2', employeeName: 'Tom Garcia', employeeId: 'emp-garcia',
        date: 'Monday, March 16, 2026',
        scheduledStart: '6:00 AM', scheduledEnd: '2:00 PM',
        actualStart: '6:00 AM', actualEnd: '4:45 PM',
        issueType: 'LONG_SHIFT', resolved: false,
        summary: 'Shift 2.75 hours over schedule',
        explanation: 'Tom Garcia clocked out at 4:45 PM on a shift scheduled to end at 2:00 PM. This is 10.75 hours total — 2.75 hours over his scheduled 8-hour septic route. His Teamsters CBA (Local 455) requires manager approval for shifts exceeding 9 hours.',
        suggestedAction: 'Verify with Tom whether the extra hours were authorized. If yes, approve as-is. His CBA rate for OT is $54/hr.',
      },
      {
        id: 'issue-3', employeeName: 'Anna Kowalski', employeeId: 'emp-kowalski',
        date: 'Wednesday, March 18, 2026',
        scheduledStart: '7:00 AM', scheduledEnd: '3:00 PM',
        actualStart: '7:00 AM', actualEnd: '3:00 PM',
        issueType: 'GPS_MISMATCH', resolved: false,
        summary: 'GPS location doesn\'t match assigned yard',
        explanation: 'Anna Kowalski\'s clock-in GPS shows her 2.3 miles from the Commerce City yard where she was scheduled for Yard Maintenance. She may have reported to the wrong depot or the GPS had poor accuracy (recorded accuracy: 145m).',
        suggestedAction: 'Hours look correct (8h). GPS accuracy was low — likely a signal issue, not a location mismatch. Approve the timesheet.',
      },
      {
        id: 'issue-4', employeeName: 'Tony Ramirez', employeeId: 'emp-ramirez',
        date: 'Thursday, March 19, 2026',
        scheduledStart: '6:00 AM', scheduledEnd: '2:00 PM',
        actualStart: '6:00 AM', actualEnd: '2:00 PM',
        issueType: 'OT_ANOMALY', resolved: false,
        summary: '18.5 OT hours this period — 2.4x team average',
        explanation: 'Tony Ramirez has logged 18.5 overtime hours this pay period, which is 2.4 times the team average of 7.7 hours. His Teamsters CBA (Local 117) OT rate is $55.50/hr. Total OT cost: $1,026.75 this period alone.',
        suggestedAction: 'Review route assignments. Tony may need workload redistribution. His septic routes consistently run long — consider splitting the South route.',
      },
      {
        id: 'issue-5', employeeName: 'DeShawn Carter', employeeId: 'emp-carter',
        date: 'Friday, March 14, 2026',
        scheduledStart: '6:00 AM', scheduledEnd: '2:30 PM',
        actualStart: '4:15 AM', actualEnd: '2:30 PM',
        issueType: 'EARLY_CLOCKIN', resolved: false,
        summary: 'Clocked in 1h 45min before scheduled start',
        explanation: 'DeShawn Carter clocked in at 4:15 AM, nearly 2 hours before his 6:00 AM scheduled start. This adds 1.75 hours to his daily total (10.25h). If unauthorized, the early clock-in shouldn\'t be paid. If he was asked to start early, the time should be approved.',
        suggestedAction: 'Verify with the dispatcher whether an early start was requested. If not, correct clock-in to 6:00 AM.',
      },
    ]);
  }

  issueTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      MISSED_CLOCKOUT: 'Missed Clock-Out',
      LONG_SHIFT: 'Long Shift',
      GPS_MISMATCH: 'GPS Mismatch',
      OT_ANOMALY: 'Overtime Anomaly',
      EARLY_CLOCKIN: 'Early Clock-In',
    };
    return labels[type] ?? type;
  }

  resolveAs(resolution: string, correctedTime: string): void {
    const idx = this.currentIndex();
    this.issues.update((issues) =>
      issues.map((issue, i) =>
        i === idx
          ? { ...issue, resolved: true, resolution: `${resolution} — corrected to ${correctedTime}`, correctedEnd: correctedTime }
          : issue
      )
    );
    this.showCustom.set(false);

    // Auto-advance to next unresolved
    setTimeout(() => {
      const nextUnresolved = this.issues().findIndex((issue, i) => i > idx && !issue.resolved);
      if (nextUnresolved >= 0) this.currentIndex.set(nextUnresolved);
    }, 600);
  }

  prev(): void { this.currentIndex.update((i) => Math.max(0, i - 1)); this.showCustom.set(false); }
  next(): void { this.currentIndex.update((i) => Math.min(this.issues().length - 1, i + 1)); this.showCustom.set(false); }
  goTo(i: number): void { this.currentIndex.set(i); this.showCustom.set(false); }
  goBack(): void { this.router.navigateByUrl('/payroll'); }

  finishReview(): void {
    this.router.navigateByUrl('/payroll');
  }
}
