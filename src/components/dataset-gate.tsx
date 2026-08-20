"use client";

import { useDataset } from "./dataset-provider";
import { PageHeader } from "./ui";
import { UploadPanel } from "./upload-panel";

/**
 * What a page renders instead of its content when there is no dataset yet.
 * Rather than bouncing to a separate upload route, the upload panel is shown
 * in place, so whatever link brought you here still works once files are in.
 */
export function DatasetPending() {
  const { status, files } = useDataset();

  if (status === "loading") {
    return (
      <div className="py-16 text-center text-sm text-muted" role="status">
        Loading your sheets…
      </div>
    );
  }

  const partial = Object.keys(files).length > 0;

  return (
    <>
      <PageHeader
        title={partial ? "One more file needed" : "Load your sheets"}
        lead={
          partial
            ? "us_sheet.html is the backbone of the dataset — the app needs it before it can show anything. Add it below and every page fills in."
            : "This app ships with no data. Upload the Google Sheets HTML exports and everything — personas, user stories, tags and statistics — is built from them."
        }
      />
      <UploadPanel />
    </>
  );
}

/**
 * Convenience for pages: returns the dataset, or null when the caller should
 * render `<DatasetPending />` instead.
 */
export function useGatedDataset() {
  return useDataset().dataset;
}
