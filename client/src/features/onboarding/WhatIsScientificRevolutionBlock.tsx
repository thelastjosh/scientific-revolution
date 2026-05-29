import {
  HELP_ME_ONBOARD_PROMPT,
  INTERVIEW_ENTRY_MCQ,
  WHAT_IS_SR_REPLY_TEXT,
} from "@shared/onboarding-opening";
import { TypewriterText } from "./TypewriterText";

type WhatIsScientificRevolutionBlockProps = {
  messageKey: string;
  disabled?: boolean;
  onHelpMeOnboard: () => void;
  onSelectInterviewOption: (value: string) => void;
  onTypewriterProgress?: () => void;
};

export function WhatIsScientificRevolutionBlock({
  messageKey,
  disabled = false,
  onHelpMeOnboard,
  onSelectInterviewOption,
  onTypewriterProgress,
}: WhatIsScientificRevolutionBlockProps) {
  const actionButtonClass =
    "border border-border bg-background px-3 py-2 text-left text-xs font-medium leading-snug transition-colors hover:bg-foreground hover:text-background focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div className="animate-sr-fade-in space-y-5 text-left pr-8">
      <p className="text-sm font-normal tracking-normal leading-relaxed break-words whitespace-pre-line text-foreground">
        <TypewriterText
          text={WHAT_IS_SR_REPLY_TEXT}
          messageKey={messageKey}
          msPerChar={3}
          onProgress={onTypewriterProgress}
        />
      </p>

      <button
        type="button"
        disabled={disabled}
        onClick={onHelpMeOnboard}
        className={actionButtonClass}
      >
        {HELP_ME_ONBOARD_PROMPT}
      </button>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {INTERVIEW_ENTRY_MCQ.question}
        </p>
        <div className="flex flex-col gap-2 max-w-md">
          {INTERVIEW_ENTRY_MCQ.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onSelectInterviewOption(opt.value)}
              className={actionButtonClass}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
