import { WHAT_IS_SR_ORIGINS_REPLY_TEXT } from "@shared/onboarding-opening";
import { TypewriterText } from "./TypewriterText";

type WhatIsSrOriginsBlockProps = {
  messageKey: string;
  onTypewriterProgress?: () => void;
};

export function WhatIsSrOriginsBlock({
  messageKey,
  onTypewriterProgress,
}: WhatIsSrOriginsBlockProps) {
  return (
    <div className="animate-sr-fade-in space-y-5 text-left pr-8">
      <p className="text-sm font-normal tracking-normal leading-relaxed break-words whitespace-pre-line text-foreground">
        <TypewriterText
          text={WHAT_IS_SR_ORIGINS_REPLY_TEXT}
          messageKey={messageKey}
          msPerChar={3}
          onProgress={onTypewriterProgress}
        />
      </p>
    </div>
  );
}
