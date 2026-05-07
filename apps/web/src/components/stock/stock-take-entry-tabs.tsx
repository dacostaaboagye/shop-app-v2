"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  StockTakeDetailResponse,
  StockTakeImportDryRunRequest,
  StockTakeImportDryRunResponse,
  StockTakePortal,
} from "@/lib/react-query/stock-takes";
import { StockTakeCountEntryPanel } from "./stock-take-count-entry-panel";
import { StockTakeImportPanel } from "./stock-take-import-panel";

type StockTakeEntryTabsProps = {
  detail: StockTakeDetailResponse;
  onDryRun: (input: {
    dryRun: StockTakeImportDryRunResponse;
    fileSignature: string;
    request: StockTakeImportDryRunRequest;
  }) => void;
  onFileSignatureChange: (fileSignature: string | null) => void;
  onPreviewReset: () => void;
  portal: StockTakePortal;
  reference: string;
};

export function StockTakeEntryTabs({
  detail,
  onDryRun,
  onFileSignatureChange,
  onPreviewReset,
  portal,
  reference,
}: StockTakeEntryTabsProps) {
  return (
    <Tabs defaultValue="upload">
      <TabsList className="w-full">
        <TabsTrigger value="upload">Upload sheet</TabsTrigger>
        <TabsTrigger value="in-app">Enter counts in app</TabsTrigger>
      </TabsList>
      <TabsContent className="mt-4" value="upload">
        <StockTakeImportPanel
          onDryRun={onDryRun}
          onFileSignatureChange={onFileSignatureChange}
          onPreviewReset={onPreviewReset}
          portal={portal}
          reference={reference}
        />
      </TabsContent>
      <TabsContent className="mt-4" value="in-app">
        <StockTakeCountEntryPanel
          detail={detail}
          onDryRun={onDryRun}
          onFileSignatureChange={onFileSignatureChange}
          onPreviewReset={onPreviewReset}
          portal={portal}
        />
      </TabsContent>
    </Tabs>
  );
}
