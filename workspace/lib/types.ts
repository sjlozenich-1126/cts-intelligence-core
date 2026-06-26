// ── Types aligned with Supabase schema ──────────────────────

export interface LedgerDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  hash: string;
  collectionId?: string;
  tags: string[];
  docType: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCLASSIFIED';
  dateAdded: string;
  description: string;
  isFlagged: boolean;
  isArchived: boolean;
}

export interface CollectionItem {
  id: string;
  name: string;
  code: string;
  color: string;
  description: string;
  dateCreated: string;
}

export interface SecurityIncident {
  id: string;
  sacsCode: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  xAxis: string;
  yAxis: string;
  zAxis: string;
  targetSubject: string;
  clearanceTier: string;
  scopeFlags: string;
  sensoryInput: string;
  perceptualPhenomenon: string;
  environmentalContext: string;
  status: string;
  timestamp: string;
  attachedDocIds: string[];
  tags: string[];
  isArchived: boolean;
}

export interface IntelligenceBriefing {
  id: string;
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  classification: string;
  cycle: string;
  analyst: string;
  nutGraf: string;
  keyJudgments: string;
  headline: string;
  fact: string;
  implications: string;
  alternatives: string;
  sourceDocId: string;
  horizon: string;
  actionItems: string;
  timestamp: string;
  tags: string[];
  isArchived: boolean;
}

export interface CaseStudyRecord {
  id: string;
  caseNumber: string;
  cause: string;
  judge: string;
  parties: string;
  incarcerationDates: string;
  dispositionStatus: string;
  institutionalCompressionContext: string;
  evidentiaryMemoryGaps: string;
  technologicalVariables: string;
  proceduralAnalysisMarkdown: string;
  timestamp: string;
  attachedDocIds: string[];
  tags: string[];
  isArchived: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  targetId: string;
  targetType: 'document' | 'incident' | 'briefing' | 'case' | 'collection';
  detail: string;
}

// ── Dashboard metrics ────────────────────────────────────────

export interface DashboardMetrics {
  totalDocs: number;
  totalIncidents: number;
  totalBriefings: number;
  totalCases: number;
  openAlerts: number;
  highPriority: number;
  criticalPriority: number;
  integrityLoop: number;
  briefsPending: number;
}