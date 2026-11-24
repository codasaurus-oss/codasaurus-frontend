import { useState } from "react"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { Finding } from "@/lib/api/schemas"

type FindingsByFileProps = {
  findings: Finding[]
  canDismiss: boolean
  dismissing: boolean
  onDismiss: (finding: Finding, message: string) => void
}

function severityTone(severity: string) {
  if (severity === "blocking") {
    return "destructive"
  }
  if (severity === "warning") {
    return "warning"
  }
  return "default"
}

function FindingRow({
  finding,
  canDismiss,
  dismissing,
  onDismiss,
}: {
  finding: Finding
  canDismiss: boolean
  dismissing: boolean
  onDismiss: (finding: Finding, message: string) => void
}) {
  const [message, setMessage] = useState("")
  const [confirming, setConfirming] = useState(false)

  return (
    <TableRow>
      <TableCell className="align-top">
        <StatusBadge
          label={finding.severity}
          tone={severityTone(finding.severity)}
        />
      </TableCell>
      <TableCell className="align-top">
        <div className="font-medium">{finding.detector}</div>
        {finding.rule_id ? (
          <div className="font-mono text-xs text-muted-foreground">
            {finding.rule_id}
          </div>
        ) : null}
      </TableCell>
      <TableCell className="max-w-md align-top whitespace-normal">
        <p>{finding.message}</p>
        {finding.code_snippet ? (
          <ScrollArea className="mt-2 max-h-32 rounded-md bg-muted">
            <pre className="p-2 font-mono text-xs whitespace-pre-wrap">
              {finding.code_snippet}
            </pre>
          </ScrollArea>
        ) : null}
        {finding.suggested_fix ? (
          <p className="mt-2 text-xs">
            <span className="font-medium">Suggested fix: </span>
            <span className="font-mono">{finding.suggested_fix}</span>
          </p>
        ) : null}
        {finding.judge_rationale ? (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Rationale: </span>
            {finding.judge_rationale}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="align-top tabular-nums">
        {finding.confidence ?? "—"}
      </TableCell>
      <TableCell className="align-top text-right">
        {canDismiss ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!finding.fingerprint || dismissing}
            title={
              finding.fingerprint
                ? undefined
                : "This finding has no fingerprint, so it cannot be dismissed."
            }
            aria-label={`Dismiss ${finding.rule_id ?? finding.detector}`}
            onClick={() => setConfirming(true)}
          >
            Dismiss
          </Button>
        ) : null}
        <ConfirmDialog
          open={confirming}
          onOpenChange={(open) => {
            setConfirming(open)
            if (!open) {
              setMessage("")
            }
          }}
          title="Dismiss finding"
          description="Dismissing records this finding as a false positive in the learning store."
          onConfirm={() => onDismiss(finding, message)}
        >
          <label className="flex flex-col gap-1 text-sm">
            Message (optional)
            <Textarea
              value={message}
              placeholder="Why is this a false positive?"
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
        </ConfirmDialog>
      </TableCell>
    </TableRow>
  )
}

function FindingsByFile({
  findings,
  canDismiss,
  dismissing,
  onDismiss,
}: FindingsByFileProps) {
  const groups = new Map<string, Finding[]>()
  for (const finding of findings) {
    const existing = groups.get(finding.file_path)
    if (existing) {
      existing.push(finding)
    } else {
      groups.set(finding.file_path, [finding])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {[...groups.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([file, fileFindings]) => (
          <Collapsible
            key={file}
            defaultOpen
            className="rounded-xl ring-1 ring-foreground/10"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-3 text-left">
              <span className="font-mono text-sm">{file}</span>
              <span className="text-xs text-muted-foreground">
                {fileFindings.length}{" "}
                {fileFindings.length === 1 ? "finding" : "findings"}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Detector</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileFindings.map((finding) => (
                    <FindingRow
                      key={finding.id}
                      finding={finding}
                      canDismiss={canDismiss}
                      dismissing={dismissing}
                      onDismiss={onDismiss}
                    />
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        ))}
    </div>
  )
}

export { FindingsByFile }
