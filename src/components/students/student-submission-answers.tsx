/**
 * Everything a student sent through the form, in the order the form asks it.
 *
 * Presentational. Answers are untrusted text from a public form: they are
 * rendered as text only. A link is shown as a link only when the whole answer
 * is a plain https URL (file-upload questions arrive as Google Drive links).
 */

import { formatDateTime } from "@/lib/format";
import { Panel } from "@/components/panel";
import type { StudentSubmission } from "@/types/workspace";

function Answer({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">Not answered</span>;
  const links = value.split(", ");
  if (links.every((link) => /^https:\/\/[^\s]+$/.test(link))) {
    return (
      <span className="flex flex-col gap-1">
        {links.map((link) => (
          <a key={link} href={link} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">
            {link}
          </a>
        ))}
      </span>
    );
  }
  return <>{value}</>;
}

export function StudentSubmissionAnswers({ submission }: { submission: StudentSubmission }) {
  return (
    <Panel title="Form answers" description={`Sent ${formatDateTime(submission.submitted_at)} UTC`}>
      <dl className="grid gap-5 sm:grid-cols-2">
        {submission.answers.map((item, index) => (
          <div key={index} className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground">{item.question}</dt>
            <dd className="text-sm break-words whitespace-pre-line">
              <Answer value={item.answer} />
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
