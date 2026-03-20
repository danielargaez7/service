import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../../environments/environment';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: { title: string; url: string }[];
}

interface ChatResponse {
  reply: string;
  conversationId: string;
  sources?: { title: string; url: string }[];
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
  selector: 'app-chat-widget',
  template: `
    <div class="chat-panel" @if (visible) { } >
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-text">
          <h3>ServiceCore AI</h3>
          <span class="chat-subtitle">Payroll &middot; Compliance &middot; Scheduling</span>
        </div>
        <button class="chat-close-btn" (click)="close()" title="Close chat">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Messages -->
      <div class="chat-messages" #messagesContainer>
        @for (msg of messages(); track msg.timestamp) {
          <div class="chat-bubble-row" [class.user-row]="msg.role === 'user'" [class.assistant-row]="msg.role === 'assistant'">
            <div class="chat-bubble" [class.user-bubble]="msg.role === 'user'" [class.assistant-bubble]="msg.role === 'assistant'">
              {{ msg.content }}
              @if (msg.sources && msg.sources.length > 0) {
                <div class="chat-sources">
                  @for (source of msg.sources; track source.url) {
                    <a [href]="source.url" target="_blank" rel="noopener noreferrer" class="chat-source-link">
                      <i class="pi pi-external-link"></i> {{ source.title }}
                    </a>
                  }
                </div>
              }
            </div>
            <span class="chat-timestamp">{{ msg.timestamp | date:'shortTime' }}</span>
          </div>
        }

        @if (loading()) {
          <div class="chat-bubble-row assistant-row">
            <div class="chat-bubble assistant-bubble loading-bubble">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="chat-input-area">
        <input
          type="text"
          pInputText
          class="chat-input"
          placeholder="Ask a question..."
          [(ngModel)]="userInput"
          (keydown.enter)="send()"
          [disabled]="loading()"
        />
        <button
          pButton
          icon="pi pi-send"
          class="chat-send-btn"
          [disabled]="!userInput.trim() || loading()"
          (click)="send()"
        ></button>
      </div>
    </div>
  `,
  styles: [`
    .chat-panel {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 380px;
      max-height: 520px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
      z-index: 999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.25s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Header */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff;
      flex-shrink: 0;
    }

    .chat-header-text h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .chat-subtitle {
      font-size: 0.72rem;
      opacity: 0.85;
    }

    .chat-close-btn {
      background: rgba(255, 255, 255, 0.18);
      border: none;
      color: #fff;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .chat-close-btn:hover {
      background: rgba(255, 255, 255, 0.32);
    }

    /* Messages */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 360px;
    }

    .chat-bubble-row {
      display: flex;
      flex-direction: column;
      max-width: 85%;
    }

    .chat-bubble-row.user-row {
      align-self: flex-end;
      align-items: flex-end;
    }

    .chat-bubble-row.assistant-row {
      align-self: flex-start;
      align-items: flex-start;
    }

    .chat-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 0.88rem;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .user-bubble {
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff;
      border-bottom-right-radius: 4px;
    }

    .assistant-bubble {
      background: #f1f5f9;
      color: #1e293b;
      border-bottom-left-radius: 4px;
    }

    .chat-timestamp {
      font-size: 0.68rem;
      color: #94a3b8;
      margin-top: 4px;
      padding: 0 4px;
    }

    .chat-sources {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .chat-source-link {
      font-size: 0.76rem;
      color: #2563eb;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .chat-source-link:hover {
      text-decoration: underline;
    }

    .chat-source-link i {
      font-size: 0.68rem;
    }

    /* Loading dots */
    .loading-bubble {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 14px 18px;
    }

    .typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      animation: typingBounce 1.2s ease-in-out infinite;
    }

    .typing-dot:nth-child(2) {
      animation-delay: 0.15s;
    }

    .typing-dot:nth-child(3) {
      animation-delay: 0.3s;
    }

    @keyframes typingBounce {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-6px);
        opacity: 1;
      }
    }

    /* Input area */
    .chat-input-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #e2e8f0;
      flex-shrink: 0;
      background: #fff;
    }

    .chat-input {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 0.88rem;
      outline: none;
      font-family: inherit;
    }

    .chat-input:focus {
      border-color: #f97316;
      box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.12);
    }

    .chat-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      flex-shrink: 0;
    }
  `],
})
export class ChatWidgetComponent implements AfterViewChecked {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);

  messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your ServiceCore AI assistant. I can help with employee hours, overtime calculations, compliance status, scheduling, and payroll questions. What do you need?",
      timestamp: new Date(),
    },
  ]);

  loading = signal(false);
  userInput = '';
  private conversationId: string | null = null;
  private shouldScroll = false;

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  send(): void {
    const text = this.userInput.trim();
    if (!text || this.loading()) return;

    this.userInput = '';

    this.messages.update((msgs) => [
      ...msgs,
      { role: 'user', content: text, timestamp: new Date() },
    ]);
    this.shouldScroll = true;

    this.loading.set(true);

    const body: Record<string, string> = { message: text };
    if (this.conversationId) {
      body['conversationId'] = this.conversationId;
    }

    this.http
      .post<ChatResponse>(`${environment.apiUrl}/api/ai/chat`, body)
      .subscribe({
        next: (res) => {
          this.conversationId = res.conversationId;
          this.messages.update((msgs) => [
            ...msgs,
            {
              role: 'assistant',
              content: res.reply,
              timestamp: new Date(),
              sources: res.sources,
            },
          ]);
          this.loading.set(false);
          this.shouldScroll = true;
        },
        error: () => {
          this.messages.update((msgs) => [
            ...msgs,
            {
              role: 'assistant',
              content:
                'Sorry, I encountered an error. Please try again in a moment.',
              timestamp: new Date(),
            },
          ]);
          this.loading.set(false);
          this.shouldScroll = true;
        },
      });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // ignore
    }
  }
}
