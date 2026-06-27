'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

// ── SACS TAXONOMY MATRIX ─────────────────────────────────────
const SACS_SYSTEMS = [
  { code: 'JUD', label: 'Judicial / Authority Layer' },
  { code: 'OPS', label: 'Operations / Execution Layer' },
  { code: 'LOG', label: 'Logistics / Ledger Flow' },
  { code: 'SEC', label: 'Security / Perimeter Monitor' },
];
const SACS_DOMAINS = [
  { code: 'SUP', label: 'Supervisory Control' },
  { code: 'POL', label: 'Policy Enforcement' },
  { code: 'DAT', label: 'Data / Ledger Stratum' },
  { code: 'NET', label: 'Network / Communication' },
];
const SACS_ROLES = [
  { code: 'INV', label: 'Investigation / Audit' },
  { code: 'INI', label: 'Initialization / Anchor' },
  { code: 'VAL', label: 'Validation / Consensus' },
  { code: 'REP', label: 'Reporting / Broadcast' },
];
const SACS_FAILURES = [
  { code: 'C.AU', label: 'Critical - Authority Breach' },
  { code: 'M.DA', label: 'Major - Data Mutation' },
  { code: 'L.DL', label: 'Minor - Delay / Latency' },
  { code: 'C.EX', label: 'Critical - External Compromise' },
];

// ── TYPES ────────────────────────────────────────────────────
interface LedgerDocument {
  id: string; name: string; type: string; url: string; hash: string;
  collectionId?: string; tags: string[]; docType: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCLASSIFIED';
  dateAdded: string; description: string; isFlagged: boolean; isArchived: boolean;
}
interface CollectionItem {
  id: string; name: string; code: string; color: string;
  description: string; dateCreated: string;
}
interface SecurityIncident {
  id: string; sacsCode: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  xAxis: string; yAxis: string; zAxis: string; targetSubject: string;
  clearanceTier: string; scopeFlags: string; sensoryInput: string;
  perceptualPhenomenon: string; environmentalContext: string; status: string;
  timestamp: string; attachedDocIds: string[]; tags: string[]; isArchived: boolean;
}
interface IntelligenceBriefing {
  id: string; title: string; priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  classification: string; cycle: string; analyst: string; nutGraf: string;
  keyJudgments: string; headline: string; fact: string; implications: string;
  alternatives: string; sourceDocId: string; horizon: string; actionItems: string;
  timestamp: string; tags: string[]; isArchived: boolean;
}
interface CaseStudyRecord {
  id: string; caseNumber: string; cause: string; judge: string; parties: string;
  incarcerationDates: string; dispositionStatus: string;
  institutionalCompressionContext: string; evidentiaryMemoryGaps: string;
  technologicalVariables: string; proceduralAnalysisMarkdown: string;
  timestamp: string; attachedDocIds: string[]; tags: string[]; isArchived: boolean;
}
interface AuditEntry {
  id: string; timestamp: string; action: string; targetId: string;
  targetType: 'document' | 'incident' | 'briefing' | 'case' | 'collection'; detail: string;
}
interface DashboardMetrics {
  totalDocs: number; totalIncidents: number; totalBriefings: number;
  totalCases: number; openAlerts: number; highPriority: number;
  criticalPriority: number; integrityLoop: number; briefsPending: number;
}

// ── CONSTANTS ────────────────────────────────────────────────
const DOC_TYPES = [
  'Evidence', 'Legal Filing', 'Forensic Report', 'Intelligence Report',
  'Correspondence', 'Court Record', 'Media / Audio',
  'Technical Specification', 'Administrative Record', 'Other',
];
const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--accent)', HIGH: '#EA580C', MEDIUM: '#F59E0B', LOW: '#16A34A', UNCLASSIFIED: '#6B7280',
};
const COLLECTION_PALETTE = ['#066cf4', '#7c3aed', '#0891b2', '#16a34a', '#dc2626', '#ea580c', '#9333ea', '#0f766e'];
const DEFAULT_COLLECTIONS: CollectionItem[] = [
  { id: 'col-1', name: 'Operational Base Alpha', code: 'CTS-A', color: '#066cf4', description: 'Primary operational documents', dateCreated: '2026-01-01' },
  { id: 'col-2', name: 'King County Forensics', code: 'KCF-02', color: '#dc2626', description: 'Forensic and evidentiary records', dateCreated: '2026-01-01' },
];

const getSecureTimestamp = () => new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
const getDateStr = () => new Date().toISOString().split('T')[0];
const calculateSHA256 = async (file: File): Promise<string> => {
  const ab = await file.arrayBuffer();
  const hb = await crypto.subtle.digest('SHA-256', ab);
  return Array.from(new Uint8Array(hb)).map(b => b.toString(16).padStart(2, '0')).join('');
};
const priorityWeight = (p: string) => ({ CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, UNCLASSIFIED: 0 } as Record<string, number>)[p] ?? 0;

// ── VIEW METADATA ────────────────────────────────────────────
const viewMeta: Record<string, { title: string; eyebrow: string }> = {
  dashboard:  { title: 'Command Dashboard',           eyebrow: 'Phase I Prototype' },
  intake:     { title: 'Intelligence Intake',          eyebrow: 'IINP' },
  ledger:     { title: 'Provenance Ledger',            eyebrow: 'G-PCL' },
  vault:      { title: 'Document Vault',               eyebrow: 'Secure Manifest' },
  incidents:  { title: 'SACS Incident Logger',         eyebrow: 'S-SIE' },
  briefings:  { title: 'Intelligence Briefing Matrix', eyebrow: 'IBMx' },
  cases:      { title: 'Case Studies',                 eyebrow: 'ICGE' },
  sacs:       { title: 'SACS Compiler',                eyebrow: 'S-SIE' },
  fusion:     { title: 'Threat Fusion Cell',           eyebrow: 'MV-TFC' },
  risk:       { title: 'Systemic Risk',                eyebrow: 'SRPE' },
  zerotrust:  { title: 'Zero-Trust Monitor',           eyebrow: 'CL-ZTIM' },
  identity:   { title: 'Identity Shield',              eyebrow: 'BIV / PPIS' },
  roadmap:    { title: 'Deployment Roadmap',           eyebrow: '12-36 Month Build' },
  audit:      { title: 'Audit Trail',                  eyebrow: 'G-PCL' },
};

// ── PRIORITY BADGE ───────────────────────────────────────────
const PriorityBadge = ({ p }: { p: string }) => (
  <span className="pill" style={{ background: `${PRIORITY_COLORS[p] || '#6B7280'}22`, color: PRIORITY_COLORS[p] || '#6B7280' }}>
    {p}
  </span>
);

// ══════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function Page() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Registry
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [documentsVault, setDocumentsVault] = useState<LedgerDocument[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [briefingsArchive, setBriefingsArchive] = useState<IntelligenceBriefing[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudyRecord[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [initialHydration, setInitialHydration] = useState(false);

  // Vault filters
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState('ALL');
  const [vaultSearch, setVaultSearch] = useState('');
  const [vaultDocTypeFilter, setVaultDocTypeFilter] = useState('ALL');
  const [vaultPriorityFilter, setVaultPriorityFilter] = useState('ALL');
  const [vaultSortBy, setVaultSortBy] = useState<'date' | 'name' | 'priority' | 'type'>('date');
  const [vaultSortDir, setVaultSortDir] = useState<'asc' | 'desc'>('desc');
  const [showArchivedDocs, setShowArchivedDocs] = useState(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [vaultTagFilter, setVaultTagFilter] = useState('');

  // Incident filters
  const [incidentPriorityFilter, setIncidentPriorityFilter] = useState('ALL');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [showArchivedIncidents, setShowArchivedIncidents] = useState(false);

  // Briefing filters
  const [briefingSearch, setBriefingSearch] = useState('');
  const [showArchivedBriefings, setShowArchivedBriefings] = useState(false);

  // Case filters
  const [caseSearch, setCaseSearch] = useState('');
  const [showArchivedCases, setShowArchivedCases] = useState(false);

  // Active / selected
  const [activeDoc, setActiveDoc] = useState<LedgerDocument | null>(null);
  const [activeBrief, setActiveBrief] = useState<IntelligenceBriefing | null>(null);
  const [activeCaseStudy, setActiveCaseStudy] = useState<CaseStudyRecord | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Upload
  const [uploadCollectionTarget, setUploadCollectionTarget] = useState('CENTRAL');
  const [uploadDocType, setUploadDocType] = useState('Evidence');
  const [uploadPriority, setUploadPriority] = useState<LedgerDocument['priority']>('UNCLASSIFIED');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isHashing, setIsHashing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Collection modal
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);
  const [newColName, setNewColName] = useState('');
  const [newColCode, setNewColCode] = useState('');
  const [newColColor, setNewColColor] = useState(COLLECTION_PALETTE[0]);
  const [newColDescription, setNewColDescription] = useState('');

  // Bulk
  const [bulkTargetCollection, setBulkTargetCollection] = useState('CENTRAL');

  // Doc editing
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocTags, setEditDocTags] = useState('');
  const [editDocDescription, setEditDocDescription] = useState('');

  // SACS Incident form
  const [sacsSystem, setSacsSystem] = useState('JUD');
  const [sacsDomain, setSacsDomain] = useState('POL');
  const [sacsRole, setSacsRole] = useState('INI');
  const [sacsFunction, setSacsFunction] = useState('INV');
  const [sacsRisk, setSacsRisk] = useState('C');
  const [sacsFailure, setSacsFailure] = useState('AU');
  const [incPriority, setIncPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [zAxis, setZAxis] = useState('Category 4');
  const [targetSubject, setTargetSubject] = useState('');
  const [clearanceTier, setClearanceTier] = useState('TIER-3');
  const [scopeFlags, setScopeFlags] = useState('');
  const [sensoryInput, setSensoryInput] = useState('');
  const [perceptualPhenomenon, setPerceptualPhenomenon] = useState('');
  const [environmentalContext, setEnvironmentalContext] = useState('');
  const [incidentDocAttachments, setIncidentDocAttachments] = useState<string[]>([]);
  const [incidentTags, setIncidentTags] = useState('');

  // Briefing form
  const [briefTitle, setBriefTitle] = useState('');
  const [briefPriority, setBriefPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [briefClassification, setBriefClassification] = useState('SECRET // EYES ONLY');
  const [briefCycle, setBriefCycle] = useState('23 JUN 2026 / 0800 EDT / DAILY');
  const [briefAnalyst, setBriefAnalyst] = useState('CTS DEFENSE OPERATIONS CELL');
  const [briefNutGraf, setBriefNutGraf] = useState('');
  const [briefKeyJudgments, setBriefKeyJudgments] = useState('');
  const [briefHeadline, setBriefHeadline] = useState('');
  const [briefFact, setBriefFact] = useState('');
  const [briefImplications, setBriefImplications] = useState('');
  const [briefAlternatives, setBriefAlternatives] = useState('');
  const [briefSourceDocId, setBriefSourceDocId] = useState('');
  const [briefHorizon, setBriefHorizon] = useState('');
  const [briefActionItems, setBriefActionItems] = useState('');
  const [briefTags, setBriefTags] = useState('');

  // Case Study form
  const [csNumber, setCsNumber] = useState('');
  const [csCause, setCsCause] = useState('');
  const [csJudge, setCsJudge] = useState('');
  const [csParties, setCsParties] = useState('');
  const [csIncarceration, setCsIncarceration] = useState('');
  const [csDisposition, setCsDisposition] = useState('');
  const [csCompression, setCsCompression] = useState('');
  const [csMemoryGaps, setCsMemoryGaps] = useState('');
  const [csVariables, setCsVariables] = useState('');
  const [csAnalysis, setCsAnalysis] = useState('');
  const [csDocAttachments, setCsDocAttachments] = useState<string[]>([]);
  const [csTags, setCsTags] = useState('');

  // ── AUDIT LOG ──
  const addAudit = useCallback((action: string, targetId: string, targetType: AuditEntry['targetType'], detail: string) => {
    setAuditLog(prev => [{ id: `AUDIT-${Date.now()}`, timestamp: getSecureTimestamp(), action, targetId, targetType, detail }, ...prev].slice(0, 500));
  }, []);

  const parseTags = (raw: string): string[] => raw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

  // ── FETCH / HYDRATE ──
  useEffect(() => {
    async function hydrate() {
      try {
        const sc = localStorage.getItem('cts_collections_v2');
        const sd = localStorage.getItem('cts_docs_v2');
        const scc = localStorage.getItem('cts_cases_v2');
        const sa = localStorage.getItem('cts_audit');
        if (sc) setCollections(JSON.parse(sc));
        else { setCollections(DEFAULT_COLLECTIONS); localStorage.setItem('cts_collections_v2', JSON.stringify(DEFAULT_COLLECTIONS)); }
        if (sd) setDocumentsVault(JSON.parse(sd));
        if (scc) setCaseStudies(JSON.parse(scc));
        if (sa) setAuditLog(JSON.parse(sa));
      } catch (e) { console.error('Local hydration fault:', e); }

      try {
        const { data: dbBriefs } = await supabase.from('intelligence_briefings').select('*').order('created_at', { ascending: false });
        const { data: dbIncidents } = await supabase.from('sacs_incidents').select('*').order('created_at', { ascending: false });
        if (dbBriefs) {
          setBriefingsArchive(dbBriefs.map(b => ({
            id: b.id, title: b.title, priority: b.priority, classification: b.classification,
            cycle: b.cycle, analyst: b.analyst, nutGraf: b.nut_graf, keyJudgments: b.key_judgments,
            headline: b.headline, fact: b.fact, implications: b.implications, alternatives: b.alternatives,
            sourceDocId: b.source_doc_id, horizon: b.horizon, actionItems: b.action_items,
            tags: b.tags || [], isArchived: b.is_archived, timestamp: new Date(b.created_at).toLocaleString(),
          })));
        }
        if (dbIncidents) {
          const mapped = dbIncidents.map(i => ({
            id: i.id, sacsCode: i.sacs_code, priority: i.priority, xAxis: i.x_axis, yAxis: i.y_axis,
            zAxis: i.z_axis, targetSubject: i.target_subject, clearanceTier: i.clearance_tier,
            scopeFlags: i.scope_flags, sensoryInput: i.sensory_input, perceptualPhenomenon: i.perceptual_phenomenon,
            environmentalContext: i.environmental_context, status: i.status,
            attachedDocIds: i.attached_doc_ids || [], tags: i.tags || [], isArchived: i.is_archived,
            timestamp: new Date(i.created_at).toLocaleString(),
          }));
          setIncidents(mapped);
          const active = dbIncidents.filter((i: any) => !i.is_archived);
          setMetrics({
            totalDocs: 0, totalIncidents: active.length, totalBriefings: dbBriefs?.length || 0,
            totalCases: 0, openAlerts: active.filter((i: any) => i.status === 'Open').length,
            highPriority: active.filter((i: any) => i.priority === 'HIGH' || i.priority === 'CRITICAL').length,
            criticalPriority: active.filter((i: any) => i.priority === 'CRITICAL').length,
            integrityLoop: 0.018, briefsPending: 0,
          });
        }
      } catch (fault) { console.error('Cloud sync fault:', fault); }
      setInitialHydration(true);
      setIsLoading(false);
    }
    hydrate();
  }, []);

  useEffect(() => { if (initialHydration) localStorage.setItem('cts_docs_v2', JSON.stringify(documentsVault)); }, [documentsVault, initialHydration]);
  useEffect(() => { if (initialHydration) localStorage.setItem('cts_cases_v2', JSON.stringify(caseStudies)); }, [caseStudies, initialHydration]);
  useEffect(() => { if (initialHydration) localStorage.setItem('cts_audit', JSON.stringify(auditLog)); }, [auditLog, initialHydration]);
  useEffect(() => { if (initialHydration) localStorage.setItem('cts_collections_v2', JSON.stringify(collections)); }, [collections, initialHydration]);

  // ══════════════════════════════════════════════════════════
  // ── VAULT ACTIONS ──
  // ══════════════════════════════════════════════════════════
  const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsHashing(true);
    const uploadedDocs: LedgerDocument[] = [];
    try {
      for (const file of files) {
        const computedHash = await calculateSHA256(file);
        const fileExt = file.name.includes('.') ? file.name.split('.').pop()! : 'bin';
        const baseName = file.name.replace(new RegExp(`\\.${fileExt}$`), '');
        const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, '_') || 'document';
        const storagePath = `${Date.now()}_${cleanName}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('vault-documents').upload(storagePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('vault-documents').getPublicUrl(storagePath);
        const newDoc: LedgerDocument = {
          id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, type: file.type,
          url: urlData.publicUrl, hash: computedHash,
          collectionId: uploadCollectionTarget === 'CENTRAL' ? undefined : uploadCollectionTarget,
          tags: parseTags(uploadTags), docType: uploadDocType, priority: uploadPriority,
          dateAdded: getDateStr(), description: uploadDescription, isFlagged: false, isArchived: false,
        };
        uploadedDocs.push(newDoc);
        addAudit('UPLOAD_DOCUMENT', newDoc.id, 'document', `Stored "${file.name}" - SHA-256: ${computedHash.substring(0, 16)}...`);
      }
      setDocumentsVault(prev => [...uploadedDocs, ...prev]);
      setIncidentDocAttachments(prev => [...prev, ...uploadedDocs.map(d => d.id)]);
      if (uploadedDocs.length === 1) setActiveDoc(uploadedDocs[0]);
      setUploadTags(''); setUploadDescription('');
    } catch (err) {
      console.error('Vault transfer failed:', err);
      alert('File upload rejected. Check storage policies and bucket name.');
    } finally {
      setIsHashing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (batchFileInputRef.current) batchFileInputRef.current.value = '';
    }
  };

  const reallocateDocCollection = (docId: string, targetColId: string) => {
    const colName = targetColId === 'CENTRAL' ? 'Central Repository' : collections.find(c => c.id === targetColId)?.name || targetColId;
    setDocumentsVault(prev => prev.map(d => d.id === docId ? { ...d, collectionId: targetColId === 'CENTRAL' ? undefined : targetColId } : d));
    if (activeDoc?.id === docId) setActiveDoc(prev => prev ? { ...prev, collectionId: targetColId === 'CENTRAL' ? undefined : targetColId } : null);
    addAudit('REALLOCATE', docId, 'document', `Moved to collection: ${colName}`);
  };

  const toggleDocFlag = (docId: string) => {
    setDocumentsVault(prev => prev.map(d => d.id === docId ? { ...d, isFlagged: !d.isFlagged } : d));
    if (activeDoc?.id === docId) setActiveDoc(prev => prev ? { ...prev, isFlagged: !prev.isFlagged } : null);
  };

  const toggleDocArchive = (docId: string) => {
    setDocumentsVault(prev => prev.map(d => d.id === docId ? { ...d, isArchived: !d.isArchived } : d));
    if (activeDoc?.id === docId) setActiveDoc(null);
    addAudit('ARCHIVE_TOGGLE', docId, 'document', 'Archive status toggled');
  };

  const deleteDoc = (docId: string) => {
    if (!confirm('Permanently delete this document from the ledger?')) return;
    setDocumentsVault(prev => prev.filter(d => d.id !== docId));
    if (activeDoc?.id === docId) setActiveDoc(null);
    addAudit('DELETE', docId, 'document', 'Document permanently deleted');
  };

  const saveDocEdits = (docId: string) => {
    setDocumentsVault(prev => prev.map(d => d.id === docId ? { ...d, tags: parseTags(editDocTags), description: editDocDescription } : d));
    if (activeDoc?.id === docId) setActiveDoc(prev => prev ? { ...prev, tags: parseTags(editDocTags), description: editDocDescription } : null);
    setEditingDocId(null);
    addAudit('EDIT_METADATA', docId, 'document', 'Tags and description updated');
  };

  const toggleBulkSelect = (id: string) => setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAllFiltered = () => setSelectedDocIds(filteredAndSortedDocs.map(d => d.id));
  const clearSelection = () => setSelectedDocIds([]);

  const bulkReallocate = () => {
    const colName = bulkTargetCollection === 'CENTRAL' ? 'Central Repository' : collections.find(c => c.id === bulkTargetCollection)?.name || bulkTargetCollection;
    setDocumentsVault(prev => prev.map(d => selectedDocIds.includes(d.id) ? { ...d, collectionId: bulkTargetCollection === 'CENTRAL' ? undefined : bulkTargetCollection } : d));
    addAudit('BULK_REALLOCATE', selectedDocIds.join(','), 'document', `${selectedDocIds.length} docs moved to ${colName}`);
    setSelectedDocIds([]);
  };

  const bulkArchive = () => {
    setDocumentsVault(prev => prev.map(d => selectedDocIds.includes(d.id) ? { ...d, isArchived: true } : d));
    addAudit('BULK_ARCHIVE', selectedDocIds.join(','), 'document', `${selectedDocIds.length} docs archived`);
    setSelectedDocIds([]);
  };

  const bulkFlag = () => {
    setDocumentsVault(prev => prev.map(d => selectedDocIds.includes(d.id) ? { ...d, isFlagged: true } : d));
    setSelectedDocIds([]);
  };

  const exportVaultIndex = () => {
    const exportData = { exportedAt: getSecureTimestamp(), totalDocuments: documentsVault.length, collections, documents: documentsVault.map(d => ({ ...d, url: '[OBJECT URL - NOT EXPORTABLE]' })) };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `CTS_VaultIndex_${getDateStr()}.json`; a.click();
    addAudit('EXPORT', 'VAULT', 'document', 'Full vault index exported as JSON');
  };

  // ══════════════════════════════════════════════════════════
  // ── COLLECTION ACTIONS ──
  // ══════════════════════════════════════════════════════════
  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName || !newColCode) return;
    if (editingCollection) {
      setCollections(collections.map(c => c.id === editingCollection.id ? { ...c, name: newColName, code: newColCode.toUpperCase(), color: newColColor, description: newColDescription } : c));
      addAudit('EDIT_COLLECTION', editingCollection.id, 'collection', `Collection updated: ${newColName}`);
    } else {
      const nc: CollectionItem = { id: `col-${Date.now()}`, name: newColName, code: newColCode.toUpperCase(), color: newColColor, description: newColDescription, dateCreated: getDateStr() };
      setCollections(prev => [...prev, nc]);
      addAudit('CREATE_COLLECTION', nc.id, 'collection', `New collection: ${newColName} [${newColCode.toUpperCase()}]`);
    }
    setShowNewCollection(false); setEditingCollection(null);
    setNewColName(''); setNewColCode(''); setNewColColor(COLLECTION_PALETTE[0]); setNewColDescription('');
  };

  const openEditCollection = (col: CollectionItem) => {
    setEditingCollection(col); setNewColName(col.name); setNewColCode(col.code);
    setNewColColor(col.color); setNewColDescription(col.description); setShowNewCollection(true);
  };

  const deleteCollection = (colId: string) => {
    if (!confirm('Delete this collection? Documents will be moved to Central Repository.')) return;
    setCollections(prev => prev.filter(c => c.id !== colId));
    setDocumentsVault(prev => prev.map(d => d.collectionId === colId ? { ...d, collectionId: undefined } : d));
    if (selectedCollectionFilter === colId) setSelectedCollectionFilter('ALL');
    addAudit('DELETE_COLLECTION', colId, 'collection', 'Collection deleted; documents moved to Central');
  };

  // ══════════════════════════════════════════════════════════
  // ── INCIDENT ACTIONS ──
  // ══════════════════════════════════════════════════════════
  const handleLogIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    const runtimeCode = `${sacsSystem}.${sacsDomain}.${sacsRole}.${sacsFunction}.${sacsRisk}.${sacsFailure}`;
    const payload = {
      sacs_code: runtimeCode, priority: incPriority, clearance_tier: clearanceTier,
      target_subject: targetSubject, scope_flags: scopeFlags, x_axis: xAxis, y_axis: yAxis, z_axis: zAxis,
      sensory_input: sensoryInput, perceptual_phenomenon: perceptualPhenomenon,
      environmental_context: environmentalContext, status: 'Open',
      created_at: new Date().toISOString(),
      attached_doc_ids: incidentDocAttachments,
      tags: incidentTags.split(',').map(t => t.trim()).filter(Boolean),
      is_archived: false,
    };
    try {
      const { data, error } = await supabase.from('sacs_incidents').insert([payload]).select();
      if (error) throw error;
      if (data && data[0]) {
        const row = data[0];
        const clean: SecurityIncident = {
          id: row.id, sacsCode: row.sacs_code, priority: row.priority,
          xAxis: row.x_axis, yAxis: row.y_axis, zAxis: row.z_axis,
          targetSubject: row.target_subject, clearanceTier: row.clearance_tier,
          scopeFlags: row.scope_flags, sensoryInput: row.sensory_input,
          perceptualPhenomenon: row.perceptual_phenomenon, environmentalContext: row.environmental_context,
          status: row.status, timestamp: new Date(row.created_at).toLocaleString(),
          attachedDocIds: row.attached_doc_ids || [], tags: row.tags || [], isArchived: row.is_archived,
        };
        setIncidents(prev => [clean, ...prev]);
        addAudit('CREATE_INCIDENT', clean.id, 'incident', `SACS Entry: ${runtimeCode} [${incPriority}]`);
      }
      setXAxis(''); setYAxis(''); setTargetSubject(''); setScopeFlags(''); setSensoryInput('');
      setPerceptualPhenomenon(''); setIncidentDocAttachments([]); setIncidentTags('');
    } catch (err) {
      console.error('Error committing incident:', err);
      alert('Database transaction failed. Check terminal for connectivity errors.');
    }
  };

  const toggleIncidentArchive = (id: string) => setIncidents(prev => prev.map(i => i.id === id ? { ...i, isArchived: !i.isArchived } : i));

  // ══════════════════════════════════════════════════════════
  // ── BRIEFING ACTIONS ──
  // ══════════════════════════════════════════════════════════
  const handleCommitBriefing = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: briefTitle || `Untitled Briefing (${new Date().toLocaleDateString()})`,
      priority: briefPriority, classification: briefClassification, cycle: briefCycle,
      analyst: briefAnalyst, nut_graf: briefNutGraf, key_judgments: briefKeyJudgments,
      headline: briefHeadline, fact: briefFact, implications: briefImplications,
      alternatives: briefAlternatives, source_doc_id: briefSourceDocId,
      horizon: briefHorizon, action_items: briefActionItems,
      tags: parseTags(briefTags), is_archived: false,
    };
    const { data, error } = await supabase.from('intelligence_briefings').insert([payload]).select();
    if (error) { console.error('Database write rejection:', error); alert(`Transaction aborted: ${error.message}`); return; }
    if (data && data[0]) {
      const d = data[0];
      const rec: IntelligenceBriefing = {
        id: d.id, title: d.title, priority: d.priority, classification: d.classification,
        cycle: d.cycle, analyst: d.analyst, nutGraf: d.nut_graf, keyJudgments: d.key_judgments,
        headline: d.headline, fact: d.fact, implications: d.implications, alternatives: d.alternatives,
        sourceDocId: d.source_doc_id, horizon: d.horizon, actionItems: d.action_items,
        tags: d.tags || [], isArchived: d.is_archived, timestamp: new Date(d.created_at).toLocaleString(),
      };
      setBriefingsArchive(prev => [rec, ...prev]);
      setActiveBrief(rec);
      addAudit('CREATE_BRIEFING', rec.id, 'briefing', `Intelligence Briefing: "${rec.title}" committed securely.`);
      setBriefTitle(''); setBriefNutGraf(''); setBriefKeyJudgments(''); setBriefHeadline('');
      setBriefFact(''); setBriefImplications(''); setBriefAlternatives(''); setBriefHorizon('');
      setBriefActionItems(''); setBriefTags('');
    }
  };

  const toggleBriefingArchive = (id: string) => {
    setBriefingsArchive(prev => prev.map(b => b.id === id ? { ...b, isArchived: !b.isArchived } : b));
    if (activeBrief?.id === id) setActiveBrief(prev => prev ? { ...prev, isArchived: !prev.isArchived } : null);
  };

  // ══════════════════════════════════════════════════════════
  // ── CASE STUDY ACTIONS ──
  // ══════════════════════════════════════════════════════════
  const handleCreateCaseStudy = (e: React.FormEvent) => {
    e.preventDefault();
    const study: CaseStudyRecord = {
      id: `CS-${Date.now()}`, caseNumber: csNumber || 'N/A', cause: csCause || 'General Non-Inscription Analysis',
      judge: csJudge || 'Unassigned', parties: csParties || 'Unspecified Parties',
      incarcerationDates: csIncarceration || 'N/A', dispositionStatus: csDisposition || 'Pending Administrative Review',
      institutionalCompressionContext: csCompression, evidentiaryMemoryGaps: csMemoryGaps,
      technologicalVariables: csVariables, proceduralAnalysisMarkdown: csAnalysis,
      timestamp: getSecureTimestamp(), attachedDocIds: csDocAttachments,
      tags: parseTags(csTags), isArchived: false,
    };
    setCaseStudies(prev => [study, ...prev]);
    setActiveCaseStudy(study);
    addAudit('CREATE_CASE', study.id, 'case', `Case File No. ${study.caseNumber}: ${study.cause}`);
    setCsNumber(''); setCsCause(''); setCsJudge(''); setCsParties(''); setCsIncarceration('');
    setCsDisposition(''); setCsCompression(''); setCsMemoryGaps(''); setCsVariables('');
    setCsAnalysis(''); setCsDocAttachments([]); setCsTags('');
  };

  const toggleCaseArchive = (id: string) => setCaseStudies(prev => prev.map(c => c.id === id ? { ...c, isArchived: !c.isArchived } : c));

  // ══════════════════════════════════════════════════════════
  // ── FILTER & SORT LOGIC ──
  // ══════════════════════════════════════════════════════════
  const filteredAndSortedDocs = (() => {
    let docs = documentsVault.filter(d => {
      if (!showArchivedDocs && d.isArchived) return false;
      if (showFlaggedOnly && !d.isFlagged) return false;
      if (selectedCollectionFilter === 'CENTRAL' && d.collectionId) return false;
      if (selectedCollectionFilter !== 'ALL' && selectedCollectionFilter !== 'CENTRAL' && d.collectionId !== selectedCollectionFilter) return false;
      if (vaultDocTypeFilter !== 'ALL' && d.docType !== vaultDocTypeFilter) return false;
      if (vaultPriorityFilter !== 'ALL' && d.priority !== vaultPriorityFilter) return false;
      if (vaultTagFilter && !d.tags.some(t => t.includes(vaultTagFilter.toUpperCase()))) return false;
      if (vaultSearch) {
        const q = vaultSearch.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.hash.includes(q) || d.tags.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
    docs.sort((a, b) => {
      let cmp = 0;
      if (vaultSortBy === 'date') cmp = a.dateAdded.localeCompare(b.dateAdded);
      else if (vaultSortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (vaultSortBy === 'priority') cmp = priorityWeight(a.priority) - priorityWeight(b.priority);
      else if (vaultSortBy === 'type') cmp = a.docType.localeCompare(b.docType);
      return vaultSortDir === 'desc' ? -cmp : cmp;
    });
    return docs;
  })();

  const filteredIncidents = incidents.filter(i => {
    if (!showArchivedIncidents && i.isArchived) return false;
    if (incidentPriorityFilter !== 'ALL' && i.priority !== incidentPriorityFilter) return false;
    if (incidentSearch) {
      const q = incidentSearch.toLowerCase();
      return i.sacsCode.toLowerCase().includes(q) || i.targetSubject.toLowerCase().includes(q) || i.xAxis.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  }).sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));

  const filteredBriefings = briefingsArchive.filter(b => {
    if (!showArchivedBriefings && b.isArchived) return false;
    if (briefingSearch) {
      const q = briefingSearch.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.analyst.toLowerCase().includes(q) || b.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const filteredCases = caseStudies.filter(c => {
    if (!showArchivedCases && c.isArchived) return false;
    if (caseSearch) {
      const q = caseSearch.toLowerCase();
      return c.caseNumber.toLowerCase().includes(q) || c.cause.toLowerCase().includes(q) || c.parties.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const allVaultTags = Array.from(new Set(documentsVault.flatMap(d => d.tags))).sort();
  const toggleIncidentAttachment = (id: string) => setIncidentDocAttachments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleCaseAttachment = (id: string) => setCsDocAttachments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const triggerPrintProtocol = () => window.print();
  const meta = viewMeta[activeTab] || viewMeta.dashboard;

  const SortToggle = ({ col, label }: { col: typeof vaultSortBy; label: string }) => (
    <button className="btn-ghost" style={{ height: '26px', padding: '0 10px', fontSize: '10px' }}
      onClick={() => { if (vaultSortBy === col) setVaultSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setVaultSortBy(col); setVaultSortDir('desc'); } }}>
      {label}{vaultSortBy === col ? (vaultSortDir === 'desc' ? ' \u2193' : ' \u2191') : ''}
    </button>
  );

  // ══════════════════════════════════════════════════════════
  // ── RENDER ───────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  return (
    <div className="app-shell">
      {/* ── COLLECTION MODAL ── */}
      {showNewCollection && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowNewCollection(false); setEditingCollection(null); } }}>
          <form className="card" style={{ padding: '24px', width: '460px', maxHeight: '90vh', overflowY: 'auto' }} onSubmit={handleSaveCollection}>
            <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '16px', color: 'var(--accent)' }}>
              {editingCollection ? 'Edit Scope Collection' : 'Instantiate New Scope Collection'}
            </span>
            <div className="form-field" style={{ marginBottom: '12px' }}><label>Collection Name</label><input required value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="e.g. King County Forensics" /></div>
            <div className="form-field" style={{ marginBottom: '12px' }}><label>System Code Signature</label><input maxLength={8} required placeholder="e.g. SEA-V2K" value={newColCode} onChange={e => setNewColCode(e.target.value)} /></div>
            <div className="form-field" style={{ marginBottom: '12px' }}><label>Description</label><input value={newColDescription} onChange={e => setNewColDescription(e.target.value)} placeholder="Brief scope description" /></div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Collection Color</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {COLLECTION_PALETTE.map(c => (
                  <button key={c} type="button" onClick={() => setNewColColor(c)}
                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, border: newColColor === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-ghost" onClick={() => { setShowNewCollection(false); setEditingCollection(null); }}>Cancel</button>
              <button type="submit" className="btn-primary">{editingCollection ? 'Save Changes' : 'Commit Collection'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Image src="/logo.png" alt="CTS" width={32} height={32} /></div>
          <div className="brand-text">
            <strong>Central Trust Securities</strong>
            <span>Intelligence Core</span>
          </div>
        </div>
        <nav className="nav-list">
          <div className="nav-section-label">Operations</div>
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'intake' ? 'active' : ''}`} onClick={() => setActiveTab('intake')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>
            <span>Intake</span>
          </button>
          <button className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span>Ledger</span>
          </button>
          <button className={`nav-item ${activeTab === 'vault' ? 'active' : ''}`} onClick={() => setActiveTab('vault')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Document Vault</span>
          </button>
          <button className={`nav-item ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>Incidents</span>
          </button>
          <button className={`nav-item ${activeTab === 'briefings' ? 'active' : ''}`} onClick={() => setActiveTab('briefings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>Briefings</span>
          </button>

          <div className="nav-section-label">Analysis</div>
          <button className={`nav-item ${activeTab === 'cases' ? 'active' : ''}`} onClick={() => setActiveTab('cases')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <span>Case Studies</span>
          </button>
          <button className={`nav-item ${activeTab === 'sacs' ? 'active' : ''}`} onClick={() => setActiveTab('sacs')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/></svg>
            <span>SACS Compiler</span>
          </button>
          <button className={`nav-item ${activeTab === 'fusion' ? 'active' : ''}`} onClick={() => setActiveTab('fusion')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
            <span>Fusion Cell</span>
          </button>
          <button className={`nav-item ${activeTab === 'risk' ? 'active' : ''}`} onClick={() => setActiveTab('risk')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span>Systemic Risk</span>
          </button>

          <div className="nav-section-label">Security</div>
          <button className={`nav-item ${activeTab === 'zerotrust' ? 'active' : ''}`} onClick={() => setActiveTab('zerotrust')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Zero Trust</span>
          </button>
          <button className={`nav-item ${activeTab === 'identity' ? 'active' : ''}`} onClick={() => setActiveTab('identity')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Identity</span>
          </button>

          <div className="nav-section-label">Planning</div>
          <button className={`nav-item ${activeTab === 'roadmap' ? 'active' : ''}`} onClick={() => setActiveTab('roadmap')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span>Roadmap</span>
          </button>
          <button className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            <span>Audit Trail</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="status-card">
            <span className="status-pulse"></span>
            <div><strong>Live Connection</strong><p>Supabase synced</p></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', justifyContent: 'center' }}>
            <span>Docs: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{documentsVault.filter(d => !d.isArchived).length}</strong></span>
            <span>Inc: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{incidents.filter(i => !i.isArchived).length}</strong></span>
            <span>Brf: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{briefingsArchive.filter(b => !b.isArchived).length}</strong></span>
          </div>
          <div className="version-tag">v1.0.0</div>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ── */}
      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <p className="eyebrow">{meta.eyebrow}</p>
            <h1>{meta.title}</h1>
          </div>
          <div className="top-actions">
            <label className="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="search" placeholder="Search records..." />
            </label>
            <button className="btn-icon" title="Simulate new telemetry">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            </button>
            <button className="btn-primary" onClick={() => setActiveTab('intake')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
              New Intake
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && <DashboardView metrics={metrics} incidents={incidents} isLoading={isLoading} />}
        {activeTab === 'intake' && <IntakeView addAudit={addAudit} incidents={incidents} setIncidents={setIncidents} />}
        {activeTab === 'ledger' && <LedgerView incidents={incidents} documentsVault={documentsVault} briefingsArchive={briefingsArchive} />}
        {activeTab === 'sacs' && <SacsCompilerView />}
        {activeTab === 'fusion' && <FusionView incidents={incidents} />}
        {activeTab === 'risk' && <RiskView incidents={incidents} />}
        {activeTab === 'zerotrust' && <ZeroTrustView />}
        {activeTab === 'identity' && <IdentityView />}
        {activeTab === 'roadmap' && <RoadmapView />}

        {/* TAB: DOCUMENT VAULT */}
        {activeTab === 'vault' && (
          <div className="vault-split">
            {/* Vault sidebar: collections & filters */}
            <div className="vault-sidebar no-print">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="vault-sidebar-label" style={{ marginBottom: 0 }}>Scope Collections</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }} onClick={() => { setEditingCollection(null); setNewColName(''); setNewColCode(''); setNewColColor(COLLECTION_PALETTE[0]); setNewColDescription(''); setShowNewCollection(true); }}>+</button>
              </div>
              <button className={`vault-nav-btn ${selectedCollectionFilter === 'ALL' ? 'active' : ''}`} onClick={() => setSelectedCollectionFilter('ALL')}>
                <span>Global Ledger</span><span style={{ fontSize: '10px', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: '3px' }}>{documentsVault.filter(d => !d.isArchived).length}</span>
              </button>
              <button className={`vault-nav-btn ${selectedCollectionFilter === 'CENTRAL' ? 'active' : ''}`} onClick={() => setSelectedCollectionFilter('CENTRAL')}>
                <span>Central (Unassigned)</span><span style={{ fontSize: '10px' }}>{documentsVault.filter(d => !d.collectionId && !d.isArchived).length}</span>
              </button>
              {collections.map(col => (
                <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button className={`vault-nav-btn ${selectedCollectionFilter === col.id ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setSelectedCollectionFilter(col.id)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</span>
                    </span>
                    <span style={{ fontSize: '10px', flexShrink: 0 }}>{documentsVault.filter(d => d.collectionId === col.id && !d.isArchived).length}</span>
                  </button>
                  <button className="btn-icon" style={{ width: '24px', height: '24px', fontSize: '10px' }} title={`Edit ${col.name}`} onClick={() => openEditCollection(col)}>&#9998;</button>
                  <button className="btn-icon" style={{ width: '24px', height: '24px', fontSize: '10px', color: 'var(--accent)' }} title={`Delete ${col.name}`} onClick={() => deleteCollection(col.id)}>&#10005;</button>
                </div>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
              <span className="vault-sidebar-label">Quick Filters</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showFlaggedOnly} onChange={e => setShowFlaggedOnly(e.target.checked)} /> Flagged Only
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showArchivedDocs} onChange={e => setShowArchivedDocs(e.target.checked)} /> Show Archived
              </label>
              {allVaultTags.length > 0 && (
                <>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
                  <span className="vault-sidebar-label">Tag Filter</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {allVaultTags.map((tag, i) => (
                      <button key={`${tag}-${i}`} onClick={() => setVaultTagFilter(tag)} className="pill" style={{ cursor: 'pointer', border: 'none', background: vaultTagFilter === tag ? 'var(--accent)' : 'var(--surface-3)', color: vaultTagFilter === tag ? '#fff' : 'var(--text-secondary)' }}>{tag}</button>
                    ))}
                  </div>
                </>
              )}
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />
              <span className="vault-sidebar-label">Systemic Design Integrity</span>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <p style={{ margin: '0 0 6px 0' }}><strong>Shield:</strong> Perimeter Defense & Fiduciary Custody Enclosure.</p>
                <p style={{ margin: '0 0 6px 0' }}><strong>F·dr = 0:</strong> Closed-Loop Zero-Trust Boundary Auditing.</p>
                <p style={{ margin: 0 }}><strong>Central Axes:</strong> Multi-Context Vector Authentication.</p>
              </div>
            </div>

            {/* Vault main feed */}
            <div className="vault-feed">
              {/* Upload panel */}
              <div className="card" style={{ borderColor: 'var(--accent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Secure Manifest Intake -- SHA-256 Anchoring</span>
                  <button className="btn-primary" onClick={exportVaultIndex}>Export Vault Index</button>
                </div>
                <div className="form-grid" style={{ marginBottom: '8px' }}>
                  <div className="form-field"><label>Target Collection</label>
                    <select value={uploadCollectionTarget} onChange={e => setUploadCollectionTarget(e.target.value)}>
                      <option value="CENTRAL">Central Repository</option>
                      {collections.map(c => <option key={c.id} value={c.id}>{c.name} [{c.code}]</option>)}
                    </select>
                  </div>
                  <div className="form-field"><label>Document Type</label>
                    <select value={uploadDocType} onChange={e => setUploadDocType(e.target.value)}>
                      {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid" style={{ marginBottom: '8px' }}>
                  <div className="form-field"><label>Priority Level</label>
                    <select value={uploadPriority} onChange={e => setUploadPriority(e.target.value as LedgerDocument['priority'])}>
                      <option value="UNCLASSIFIED">UNCLASSIFIED</option><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div className="form-field"><label>Tags (comma-separated)</label>
                    <input placeholder="FORENSIC, EXHIBIT-A" value={uploadTags} onChange={e => setUploadTags(e.target.value)} />
                  </div>
                </div>
                <div className="form-field" style={{ marginBottom: '8px' }}><label>Description / Notes</label>
                  <input placeholder="Optional description or provenance note" value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="file" ref={fileInputRef} onChange={handleVaultUpload} style={{ display: 'none' }} />
                  <input type="file" ref={batchFileInputRef} onChange={handleVaultUpload} multiple style={{ display: 'none' }} />
                  <button className="btn-primary" style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}>
                    {isHashing ? 'Hashing...' : 'Upload & Anchor Document'}
                  </button>
                  <button className="btn-ghost" onClick={() => batchFileInputRef.current?.click()}>Batch Upload</button>
                </div>
              </div>

              {/* Filter bar */}
              <div className="card no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 16px' }}>
                <div className="search-box" style={{ width: '180px' }}>
                  <input placeholder="Search vault..." value={vaultSearch} onChange={e => setVaultSearch(e.target.value)} />
                </div>
                <select style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface-2)', fontSize: '11px', fontFamily: 'var(--font-sans)' }} value={vaultDocTypeFilter} onChange={e => setVaultDocTypeFilter(e.target.value)}>
                  <option value="ALL">All Doc Types</option>{DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface-2)', fontSize: '11px', fontFamily: 'var(--font-sans)' }} value={vaultPriorityFilter} onChange={e => setVaultPriorityFilter(e.target.value)}>
                  <option value="ALL">All Priorities</option>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNCLASSIFIED'].map(p => <option key={p}>{p}</option>)}
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Sort:</span>
                  <SortToggle col="date" label="Date" />
                  <SortToggle col="name" label="Name" />
                  <SortToggle col="priority" label="Priority" />
                  <SortToggle col="type" label="Type" />
                </div>
              </div>

              {/* Bulk actions */}
              {filteredAndSortedDocs.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }} className="no-print">
                  <input type="checkbox" checked={selectedDocIds.length === filteredAndSortedDocs.length && filteredAndSortedDocs.length > 0} onChange={e => e.target.checked ? selectAllFiltered() : clearSelection()} />
                  <span style={{ color: 'var(--muted)' }}>{selectedDocIds.length > 0 ? `${selectedDocIds.length} selected` : 'Select all'}</span>
                  {selectedDocIds.length > 0 && (
                    <>
                      <span style={{ color: 'var(--border)' }}>|</span>
                      <span style={{ color: 'var(--muted)' }}>Move to:</span>
                      <select style={{ padding: '3px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-sans)' }} value={bulkTargetCollection} onChange={e => setBulkTargetCollection(e.target.value)}>
                        <option value="CENTRAL">Central Repository</option>
                        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button className="btn-primary" style={{ height: '26px', fontSize: '10px' }} onClick={bulkReallocate}>Move</button>
                      <button className="btn-ghost" style={{ height: '26px', fontSize: '10px', color: '#EA580C' }} onClick={bulkFlag}>Flag</button>
                      <button className="btn-ghost" style={{ height: '26px', fontSize: '10px' }} onClick={bulkArchive}>Archive</button>
                      <button className="btn-ghost" style={{ height: '26px', fontSize: '10px' }} onClick={clearSelection}>Clear</button>
                    </>
                  )}
                  <span style={{ marginLeft: 'auto', color: 'var(--quiet)' }}>{filteredAndSortedDocs.length} records</span>
                </div>
              )}

              {/* Document cards */}
              {filteredAndSortedDocs.map(doc => (
                <div key={doc.id}
                  className={`vault-doc-card ${doc.id === activeDoc?.id ? 'selected' : selectedDocIds.includes(doc.id) ? 'bulk-selected' : ''}`}
                  style={{ opacity: doc.isArchived ? 0.7 : 1 }}
                  onClick={() => { setActiveDoc(doc); setEditingDocId(null); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <input type="checkbox" checked={selectedDocIds.includes(doc.id)} onChange={e => { e.stopPropagation(); toggleBulkSelect(doc.id); }} onClick={e => e.stopPropagation()} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{doc.isFlagged ? '[F] ' : ''}{doc.name}</span>
                          {doc.isArchived && <span className="pill">ARCHIVED</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>
                          {doc.description && <span>{doc.description} · </span>}Added {doc.dateAdded}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                      <PriorityBadge p={doc.priority} />
                      <span className="pill">{doc.docType}</span>
                      {(() => { const col = collections.find(c => c.id === doc.collectionId); return col ? <span className="pill" style={{ background: `${col.color}18`, color: col.color }}>{col.code}</span> : <span className="pill">CENTRAL</span>; })()}
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--muted)' }}>
                    <span><strong>ID:</strong> {doc.id}</span>
                    <span><strong>SHA-256:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{doc.hash ? doc.hash.substring(0, 20) : 'Calculating...'}...</span></span>
                  </div>
                  {(doc.tags?.length ?? 0) > 0 && (
                    <div style={{ marginTop: '6px' }}>{doc.tags?.map(t => <span key={t} className="pill" style={{ marginRight: '4px' }}>{t}</span>)}</div>
                  )}
                </div>
              ))}

              {filteredAndSortedDocs.length === 0 && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--quiet)', padding: '40px' }}>
                  No documents match the current filter criteria. Upload a document or adjust filters.
                </div>
              )}
            </div>

            {/* Vault viewer panel */}
            <div className="vault-viewer">
              {activeDoc ? (
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>Provenance Verification</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn-icon" title={activeDoc.isFlagged ? 'Remove Flag' : 'Flag for Review'} onClick={() => toggleDocFlag(activeDoc.id)} style={activeDoc.isFlagged ? { color: '#EA580C' } : {}}>[F]</button>
                      <button className="btn-icon" title={activeDoc.isArchived ? 'Restore' : 'Archive'} onClick={() => toggleDocArchive(activeDoc.id)}>[A]</button>
                      <button className="btn-icon" title="Delete" onClick={() => deleteDoc(activeDoc.id)} style={{ color: 'var(--accent)' }}>[D]</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{activeDoc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>Added {activeDoc.dateAdded} · {activeDoc.docType}</div>

                  <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Reallocate to Collection</label>
                    <select style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface)', fontSize: '12px', fontFamily: 'var(--font-sans)' }} value={activeDoc.collectionId || 'CENTRAL'} onChange={e => reallocateDocCollection(activeDoc.id, e.target.value)}>
                      <option value="CENTRAL">Central Ledger (Unassigned)</option>
                      {collections.map(c => <option key={c.id} value={c.id}>{c.name} [{c.code}]</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: 'var(--surface-2)', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                      <div style={{ color: 'var(--muted)', marginBottom: '3px' }}>PRIORITY</div><PriorityBadge p={activeDoc.priority} />
                    </div>
                    <div style={{ background: 'var(--surface-2)', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                      <div style={{ color: 'var(--muted)', marginBottom: '3px' }}>DOC TYPE</div><span style={{ fontWeight: 600 }}>{activeDoc.docType}</span>
                    </div>
                  </div>

                  {editingDocId === activeDoc.id ? (
                    <div style={{ background: 'var(--accent-soft)', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                      <div className="form-field" style={{ marginBottom: '8px' }}><label>Tags</label><input value={editDocTags} onChange={e => setEditDocTags(e.target.value)} /></div>
                      <div className="form-field" style={{ marginBottom: '8px' }}><label>Description</label><input value={editDocDescription} onChange={e => setEditDocDescription(e.target.value)} /></div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-primary" onClick={() => saveDocEdits(activeDoc.id)}>Save</button>
                        <button className="btn-ghost" onClick={() => setEditingDocId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tags & Metadata</span>
                        <button className="btn-ghost" style={{ height: '24px', fontSize: '10px', color: 'var(--accent)' }} onClick={() => { setEditingDocId(activeDoc.id); setEditDocTags(activeDoc.tags?.join(', ') ?? ''); setEditDocDescription(activeDoc.description ?? ''); }}>Edit</button>
                      </div>
                      {activeDoc.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{activeDoc.description}</div>}
                      <div>
                        {(activeDoc?.tags?.length ?? 0) > 0
                          ? activeDoc.tags.map((t, i) => <span key={`${t}-${i}`} className="pill" style={{ marginRight: '4px' }}>{t}</span>)
                          : <span style={{ fontSize: '11px', color: 'var(--quiet)' }}>No tags assigned</span>}
                      </div>
                    </div>
                  )}

                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: '4px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: '200px' }}>
                    <iframe src={activeDoc.url} style={{ width: '100%', height: '100%', border: 'none' }} title="Document viewer" sandbox="allow-same-origin" />
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '8px', borderRadius: '4px', fontSize: '10px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginTop: '10px' }}>
                    <strong>INTEGRITY STAMP:</strong> {activeDoc.hash}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--quiet)', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
                  Select an archive record to review properties, reassign collections, or edit metadata
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SACS INCIDENT LOGGER */}
        {activeTab === 'incidents' && (
          <div className="incident-split">
            <form onSubmit={handleLogIncident} className="incident-form card no-print" style={{ height: 'fit-content' }}>
              <div className="card-header"><div><p className="eyebrow">S-SIE</p><h2>Instantiate SACS Entry</h2></div></div>
              <div className="form-grid">
                <div className="form-field"><label>Macro System</label>
                  <select value={sacsSystem} onChange={e => setSacsSystem(e.target.value)}><option value="JUD">JUD (Judicial)</option><option value="EXE">EXE (Executive)</option><option value="LEG">LEG (Legislative)</option><option value="MIL">MIL (Military)</option></select>
                </div>
                <div className="form-field"><label>Domain Class</label>
                  <select value={sacsDomain} onChange={e => setSacsDomain(e.target.value)}><option value="POL">POL (Tactical)</option><option value="CRT">CRT (Courts)</option><option value="FSC">FSC (Fiscal)</option><option value="SIG">SIG (Signals)</option></select>
                </div>
                <div className="form-field"><label>Role Directive</label>
                  <select value={sacsRole} onChange={e => setSacsRole(e.target.value)}><option value="INI">INI (Initialization)</option><option value="VAL">VAL (Validation)</option><option value="SUP">SUP (Supervisory)</option></select>
                </div>
                <div className="form-field"><label>Functional Layer</label>
                  <select value={sacsFunction} onChange={e => setSacsFunction(e.target.value)}><option value="INV">INV (Investigation)</option><option value="REP">REP (Reporting)</option><option value="AUD">AUD (Audit)</option></select>
                </div>
                <div className="form-field"><label>Risk Tier</label>
                  <select value={sacsRisk} onChange={e => setSacsRisk(e.target.value)}><option value="C">C (Critical)</option><option value="M">M (Major)</option><option value="L">L (Minor)</option></select>
                </div>
                <div className="form-field"><label>Failure Mode</label>
                  <select value={sacsFailure} onChange={e => setSacsFailure(e.target.value)}><option value="AU">AU (Authority Breach)</option><option value="DA">DA (Data Mutation)</option><option value="EX">EX (Compromise)</option></select>
                </div>
              </div>
              <div style={{ background: 'var(--accent-soft)', borderRadius: '4px', padding: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', border: '1px solid var(--border)', margin: '8px 0' }}>
                Generated Code: <strong>{sacsSystem}.{sacsDomain}.{sacsRole}.{sacsFunction}.{sacsRisk}.{sacsFailure}</strong>
              </div>
              <div className="form-grid">
                <div className="form-field"><label>Priority Rank</label>
                  <select value={incPriority} onChange={e => setIncPriority(e.target.value as any)}>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p}>{p}</option>)}</select>
                </div>
                <div className="form-field"><label>Clearance Tier</label>
                  <select value={clearanceTier} onChange={e => setClearanceTier(e.target.value)}><option value="TIER-3">TIER-3 (Secret)</option><option value="TIER-4">TIER-4 (Top Secret)</option><option value="TIER-5">TIER-5 (SCI)</option></select>
                </div>
              </div>
              <div className="form-field"><label>Target Node Reference</label><input value={targetSubject} onChange={e => setTargetSubject(e.target.value)} /></div>
              <div className="form-field"><label>Scope Flags</label><input value={scopeFlags} onChange={e => setScopeFlags(e.target.value)} /></div>
              <div className="form-field"><label>X-Axis (Temporal / Location)</label><input value={xAxis} onChange={e => setXAxis(e.target.value)} /></div>
              <div className="form-field"><label>Y-Axis (Institutional / Geographic)</label><input value={yAxis} onChange={e => setYAxis(e.target.value)} /></div>
              <div className="form-field"><label>Z-Axis (Governance Classification)</label><input value={zAxis} onChange={e => setZAxis(e.target.value)} /></div>
              <div className="form-field"><label>Sensory Narrative Log</label><input value={sensoryInput} onChange={e => setSensoryInput(e.target.value)} /></div>
              <div className="form-field"><label>Signal / Perceptual Phenomenon</label><input value={perceptualPhenomenon} onChange={e => setPerceptualPhenomenon(e.target.value)} /></div>
              <div className="form-field"><label>Tags (comma-separated)</label><input placeholder="SEATTLE, DIGITAL-BIO, V2K" value={incidentTags} onChange={e => setIncidentTags(e.target.value)} /></div>
              <div className="form-field full"><label>Anchor Evidentiary Vault Logs</label>
                <div style={{ maxHeight: '80px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px', background: 'var(--surface-2)' }}>
                  {documentsVault.filter(d => !d.isArchived).map(d => (
                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                      <input type="checkbox" checked={incidentDocAttachments.includes(d.id)} onChange={() => toggleIncidentAttachment(d.id)} /><span>{d.name}</span>
                    </label>
                  ))}
                  {documentsVault.filter(d => !d.isArchived).length === 0 && <span style={{ fontSize: '11px', color: 'var(--quiet)' }}>No vault documents available</span>}
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: '36px' }}>Commit Entry to SACS Ledger</button>
            </form>

            <div className="incident-list">
              <div className="card no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 16px' }}>
                <div className="search-box" style={{ width: '200px' }}><input placeholder="Search incidents..." value={incidentSearch} onChange={e => setIncidentSearch(e.target.value)} /></div>
                <select style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--surface-2)', fontSize: '11px' }} value={incidentPriorityFilter} onChange={e => setIncidentPriorityFilter(e.target.value)}>
                  <option value="ALL">All Priorities</option>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p}>{p}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showArchivedIncidents} onChange={e => setShowArchivedIncidents(e.target.checked)} /> Show Archived
                </label>
                <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={triggerPrintProtocol}>Print Log</button>
              </div>

              <div className="printable-incident-report" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredIncidents.map(inc => (
                  <div key={inc.id} className="incident-card-item" style={{ opacity: inc.isArchived ? 0.75 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="pill accent">{inc.sacsCode}</span>
                        <PriorityBadge p={inc.priority} />
                        <span className="pill">{inc.clearanceTier}</span>
                        {inc.isArchived && <span className="pill">ARCHIVED</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{inc.timestamp}</span>
                        <button className="btn-icon no-print" style={{ width: '24px', height: '24px', fontSize: '10px' }} onClick={() => toggleIncidentArchive(inc.id)} title={inc.isArchived ? 'Restore' : 'Archive'}>[A]</button>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: '170px 1fr', gap: '4px' }}>
                      <strong>Target Subject:</strong><span>{inc.targetSubject || 'N/A'}</span>
                      <strong>X-Axis Coordinates:</strong><span>{inc.xAxis || 'N/A'}</span>
                      <strong>Y-Axis Correlation:</strong><span>{inc.yAxis || 'N/A'}</span>
                      <strong>Scope Flags:</strong><span>{inc.scopeFlags || 'N/A'}</span>
                      <strong>Sensory Data:</strong><span>{inc.sensoryInput || 'N/A'}</span>
                      <strong>Signal / Perceptual:</strong><span>{inc.perceptualPhenomenon || 'N/A'}</span>
                    </div>
                    {inc.tags.length > 0 && <div style={{ marginTop: '6px' }}>{inc.tags.map(t => <span key={t} className="pill" style={{ marginRight: '4px' }}>{t}</span>)}</div>}
                    {inc.attachedDocIds?.length > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>LINKED VAULT SIGNATURES: </span>
                        {inc.attachedDocIds.map(dId => (
                          <span key={dId} className="pill" style={{ marginLeft: '4px' }}>{documentsVault.find(doc => doc.id === dId)?.name || dId}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {filteredIncidents.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', color: 'var(--quiet)', padding: '30px' }}>No tracked incidents matching the specified filters.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: INTELLIGENCE BRIEFING MATRIX */}
        {activeTab === 'briefings' && (
          <div className="briefing-split">
            <form onSubmit={handleCommitBriefing} className="briefing-form card no-print" style={{ overflowY: 'auto' }}>
              <div className="card-header"><div><p className="eyebrow">IBMx</p><h2>Compile Intelligence Briefing</h2></div></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Brief Title / Operation Name</label><input value={briefTitle} onChange={e => setBriefTitle(e.target.value)} placeholder="Operation Designation" /></div>
              <div className="form-grid" style={{ marginBottom: '8px' }}>
                <div className="form-field"><label>Priority</label>
                  <select value={briefPriority} onChange={e => setBriefPriority(e.target.value as any)}>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p}>{p}</option>)}</select>
                </div>
                <div className="form-field"><label>Classification</label>
                  <select value={briefClassification} onChange={e => setBriefClassification(e.target.value)}>
                    <option>SECRET // EYES ONLY</option><option>TOP SECRET // SCI</option><option>CONFIDENTIAL</option><option>UNCLASSIFIED // FOUO</option>
                  </select>
                </div>
              </div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Analyst Cell</label><input value={briefAnalyst} onChange={e => setBriefAnalyst(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Intel Cycle</label><input value={briefCycle} onChange={e => setBriefCycle(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Nut Graf (Executive Summary)</label><textarea value={briefNutGraf} onChange={e => setBriefNutGraf(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Key Judgments (one per line)</label><textarea value={briefKeyJudgments} onChange={e => setBriefKeyJudgments(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Headline Vector</label><input value={briefHeadline} onChange={e => setBriefHeadline(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Core Fact / Evidence Anchor</label><textarea value={briefFact} onChange={e => setBriefFact(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Implications Trace</label><textarea value={briefImplications} onChange={e => setBriefImplications(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Alternative Perspectives</label><textarea value={briefAlternatives} onChange={e => setBriefAlternatives(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Horizon Scanning / Early Warnings</label><textarea value={briefHorizon} onChange={e => setBriefHorizon(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Action Items & Directives</label><textarea value={briefActionItems} onChange={e => setBriefActionItems(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Tags (comma-separated)</label><input placeholder="SIGNALS, JUDICIAL, EXHIBIT" value={briefTags} onChange={e => setBriefTags(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Grounding Source Document</label>
                <select value={briefSourceDocId} onChange={e => setBriefSourceDocId(e.target.value)}>
                  <option value="">-- No source document --</option>
                  {documentsVault.filter(d => !d.isArchived).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: '36px' }}>Commit Briefing to Archive</button>
            </form>

            <div style={{ flex: 1, display: 'flex', gap: '16px', minWidth: 0 }}>
              {/* Briefing archive list */}
              <div className="card no-print" style={{ width: '260px', flexShrink: 0, overflowY: 'auto' }}>
                <span className="vault-sidebar-label">BRIEFING ARCHIVE</span>
                <div className="search-box" style={{ width: '100%', marginBottom: '8px' }}><input placeholder="Search..." value={briefingSearch} onChange={e => setBriefingSearch(e.target.value)} /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={showArchivedBriefings} onChange={e => setShowArchivedBriefings(e.target.checked)} /> Show Archived
                </label>
                {filteredBriefings.map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <button className={`vault-nav-btn ${activeBrief?.id === b.id ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setActiveBrief(b)}>
                      <div><div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{b.title}</div><div style={{ fontSize: '10px', color: 'var(--muted)' }}><PriorityBadge p={b.priority} /></div></div>
                    </button>
                    <button className="btn-icon" style={{ width: '24px', height: '24px', fontSize: '10px' }} onClick={() => toggleBriefingArchive(b.id)} title={b.isArchived ? 'Restore' : 'Archive'}>[A]</button>
                  </div>
                ))}
                {filteredBriefings.length === 0 && <span style={{ fontSize: '11px', color: 'var(--quiet)' }}>No briefings on record</span>}
              </div>

              {/* Briefing paper */}
              <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                <div id="printable-briefing-sheet" className="briefing-paper">
                  <div style={{ borderBottom: '2px solid var(--text)', paddingBottom: '12px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Central Trust Securities -- Intelligence Brief</div>
                          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0', color: 'var(--text)' }}>{activeBrief ? activeBrief.title : briefTitle || 'Draft Briefing'}</h1>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            CYCLE: {activeBrief ? activeBrief.cycle : briefCycle} · ANALYST: {activeBrief ? activeBrief.analyst : briefAnalyst}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span className="pill" style={{ background: '#DC2626', color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>{activeBrief ? activeBrief.classification : briefClassification}</span>
                        {activeBrief && <PriorityBadge p={activeBrief.priority} />}
                        {activeBrief && activeBrief.tags.length > 0 && <div>{activeBrief.tags.map(t => <span key={t} className="pill" style={{ marginRight: '4px' }}>{t}</span>)}</div>}
                      </div>
                    </div>
                  </div>

                  {[
                    { title: '1. The Nut Graf -- Executive Summary', content: activeBrief ? activeBrief.nutGraf : briefNutGraf },
                    { title: '2. Key Judgments', content: activeBrief ? activeBrief.keyJudgments : briefKeyJudgments, monospace: true },
                    { title: '3. Headline Vector', content: activeBrief ? activeBrief.headline : briefHeadline },
                    { title: '4. Core Evidence / Fact Anchor', content: activeBrief ? activeBrief.fact : briefFact },
                    { title: '5. Implications Trace', content: activeBrief ? activeBrief.implications : briefImplications },
                    { title: '6. Alternative Perspectives', content: activeBrief ? activeBrief.alternatives : briefAlternatives },
                    { title: '7. Horizon Scanning / Early Warnings', content: activeBrief ? activeBrief.horizon : briefHorizon },
                    { title: '8. Action Items & Directives', content: activeBrief ? activeBrief.actionItems : briefActionItems, monospace: true },
                  ].map(({ title, content, monospace }) => (
                    <div key={title} className="briefing-section">
                      <h3>{title}</h3>
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', ...(monospace ? { fontFamily: 'var(--font-mono)', background: 'var(--surface-2)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--accent)' } : {}) }}>
                        {content || <span style={{ color: 'var(--quiet)' }}>[Not populated]</span>}
                      </div>
                    </div>
                  ))}

                  {(activeBrief?.sourceDocId || briefSourceDocId) && (
                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>
                      GROUNDING RECORD ANCHOR: {documentsVault.find(x => x.id === (activeBrief ? activeBrief.sourceDocId : briefSourceDocId))?.name}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center', marginTop: '12px' }} className="no-print">
                  <button className="btn-primary" onClick={triggerPrintProtocol}>Execute Print Formatter</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CASE STUDIES */}
        {activeTab === 'cases' && (
          <div className="case-split">
            <form onSubmit={handleCreateCaseStudy} className="case-form card no-print" style={{ overflowY: 'auto' }}>
              <div className="card-header"><div><p className="eyebrow">ICGE</p><h2>Compile Institutional Case File</h2></div></div>
              <div className="form-grid" style={{ marginBottom: '8px' }}>
                <div className="form-field"><label>Case/File No.</label><input placeholder="658931" value={csNumber} onChange={e => setCsNumber(e.target.value)} /></div>
                <div className="form-field"><label>Arbitrating Judge</label><input value={csJudge} onChange={e => setCsJudge(e.target.value)} /></div>
              </div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Cause / Litigation Subject</label><input value={csCause} onChange={e => setCsCause(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Parties of Record</label><input value={csParties} onChange={e => setCsParties(e.target.value)} /></div>
              <div className="form-grid" style={{ marginBottom: '8px' }}>
                <div className="form-field"><label>Incarceration Window</label><input value={csIncarceration} onChange={e => setCsIncarceration(e.target.value)} /></div>
                <div className="form-field"><label>Disposition / Status</label><input value={csDisposition} onChange={e => setCsDisposition(e.target.value)} /></div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>SYSTEMIC STRATIGRAPHIC CRITERIA</span>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Institutional Compression Factors</label><textarea value={csCompression} onChange={e => setCsCompression(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Evidentiary Gaps (Non-Inscription)</label><textarea value={csMemoryGaps} onChange={e => setCsMemoryGaps(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Technological Variables</label><textarea value={csVariables} onChange={e => setCsVariables(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Core Analysis Narrative</label><textarea value={csAnalysis} onChange={e => setCsAnalysis(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Tags (comma-separated)</label><input placeholder="SEATTLE, KING-COUNTY, CRIMINAL" value={csTags} onChange={e => setCsTags(e.target.value)} /></div>
              <div className="form-field" style={{ marginBottom: '8px' }}><label>Anchor Evidentiary Vault Logs</label>
                <div style={{ maxHeight: '80px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '6px', background: 'var(--surface-2)' }}>
                  {documentsVault.filter(d => !d.isArchived).map(d => (
                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '4px' }}>
                      <input type="checkbox" checked={csDocAttachments.includes(d.id)} onChange={() => toggleCaseAttachment(d.id)} /><span>{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: '36px' }}>Commit Case File to Ledger</button>
            </form>

            <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
              <div className="card no-print" style={{ width: '240px', flexShrink: 0, overflowY: 'auto' }}>
                <span className="vault-sidebar-label">ACTIVE ARCHIVE STACKS</span>
                <div className="search-box" style={{ width: '100%', marginBottom: '8px' }}><input placeholder="Search cases..." value={caseSearch} onChange={e => setCaseSearch(e.target.value)} /></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={showArchivedCases} onChange={e => setShowArchivedCases(e.target.checked)} /> Show Archived
                </label>
                {filteredCases.map(cs => (
                  <div key={cs.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <button className={`vault-nav-btn ${activeCaseStudy?.id === cs.id ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setActiveCaseStudy(cs)}>
                      <div><div style={{ fontWeight: 600 }}>No. {cs.caseNumber}</div><div style={{ fontSize: '10px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{cs.cause}</div></div>
                    </button>
                    <button className="btn-icon" style={{ width: '24px', height: '24px', fontSize: '10px' }} onClick={() => toggleCaseArchive(cs.id)} title={cs.isArchived ? 'Restore' : 'Archive'}>[A]</button>
                  </div>
                ))}
                {filteredCases.length === 0 && <span style={{ fontSize: '11px', color: 'var(--quiet)' }}>No case files on record</span>}
              </div>

              <div className="case-viewer">
                {activeCaseStudy ? (
                  <div>
                    <div style={{ borderBottom: '1px solid var(--text)', paddingBottom: '10px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>CASE ANALYSIS</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{activeCaseStudy.timestamp}</span>
                          <button className="btn-primary no-print" style={{ height: '28px', fontSize: '10px' }} onClick={triggerPrintProtocol}>Print</button>
                        </div>
                      </div>
                      <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 600 }}>{activeCaseStudy.parties}</h2>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>File: {activeCaseStudy.caseNumber} · Judge: {activeCaseStudy.judge}</div>
                      {activeCaseStudy.tags.length > 0 && <div style={{ marginTop: '6px' }}>{activeCaseStudy.tags.map(t => <span key={t} className="pill" style={{ marginRight: '4px' }}>{t}</span>)}</div>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: 'var(--surface-2)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', marginBottom: '16px' }}>
                      <div><strong>Litigation Cause:</strong> {activeCaseStudy.cause}</div>
                      <div><strong>Disposition Status:</strong> <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{activeCaseStudy.dispositionStatus}</span></div>
                      <div><strong>Incarceration Window:</strong> {activeCaseStudy.incarcerationDates}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: '1.5' }}>
                      {[
                        { label: 'A. Institutional Compression', value: activeCaseStudy.institutionalCompressionContext },
                        { label: 'B. Non-Inscription Patterns', value: activeCaseStudy.evidentiaryMemoryGaps },
                        { label: 'C. Technological Variables', value: activeCaseStudy.technologicalVariables },
                        { label: 'D. Analytical Annotations', value: activeCaseStudy.proceduralAnalysisMarkdown },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <strong style={{ fontSize: '11px', color: 'var(--accent)', textTransform: 'uppercase', display: 'block' }}>{label}</strong>
                          <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{value || <span style={{ color: 'var(--quiet)' }}>[Not populated]</span>}</p>
                        </div>
                      ))}
                      {activeCaseStudy.attachedDocIds?.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px' }}>
                          <strong style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>BOUND SYSTEM ARCHIVE ATTACHMENTS</strong>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {activeCaseStudy.attachedDocIds.map(dId => (
                              <span key={dId} className="pill accent">{documentsVault.find(doc => doc.id === dId)?.name || dId}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--quiet)', fontSize: '12px' }}>Select an active stack file to review data entries</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>System Audit Trail</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Immutable log of all system actions and data operations · {auditLog?.length ?? 0} entries
                </p>
              </div>
              <button className="btn-primary" onClick={() => {
                const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `CTS_AuditLog_${getDateStr()}.json`; a.click();
              }}>Export Audit Log</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(auditLog?.length ?? 0) === 0 && (
                <div className="card" style={{ textAlign: 'center', color: 'var(--quiet)', padding: '40px' }}>
                  No audit events recorded yet. All future actions will appear here.
                </div>
              )}
              {auditLog?.map((entry, i) => (
                <div key={`${entry.id}-${i}`} className="audit-entry">
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', flexShrink: 0, paddingTop: '2px' }}>{entry.timestamp}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px' }}>
                      <span className="pill accent">{entry.action}</span>
                      <span className="pill">{entry.targetType?.toUpperCase()}</span>
                      <span style={{ fontSize: '10px', color: 'var(--quiet)', fontFamily: 'var(--font-mono)' }}>{entry.targetId?.substring(0, 20)}...</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{entry.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── DASHBOARD VIEW ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function DashboardView({ metrics, incidents, isLoading }: { metrics: DashboardMetrics | null; incidents: SecurityIncident[]; isLoading: boolean }) {
  if (isLoading || !metrics) {
    return <div className="card"><p style={{ color: 'var(--muted)' }}>Loading live data from Supabase...</p></div>;
  }
  const recentIncidents = incidents.slice(0, 5);
  return (
    <>
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon accent"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></div>
          <div className="metric-body"><span className="metric-label">Ledger Entries</span><strong>{metrics.totalIncidents}</strong><small className="metric-delta">{metrics.totalDocs} documents anchored</small></div>
        </article>
        <article className="metric-card">
          <div className="metric-icon dark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div>
          <div className="metric-body"><span className="metric-label">Open Alerts</span><strong>{metrics.openAlerts}</strong><small className="metric-delta">{metrics.highPriority} high priority</small></div>
        </article>
        <article className="metric-card">
          <div className="metric-icon accent"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg></div>
          <div className="metric-body"><span className="metric-label">Integrity Loop</span><strong>{metrics.integrityLoop.toFixed(3)}</strong><small className="metric-delta">Within threshold</small></div>
        </article>
        <article className="metric-card">
          <div className="metric-icon dark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg></div>
          <div className="metric-body"><span className="metric-label">Briefings</span><strong>{metrics.totalBriefings}</strong><small className="metric-delta">{metrics.briefsPending} pending review</small></div>
        </article>
      </div>
      <div className="dashboard-grid">
        <article className="card span-2">
          <div className="card-header"><div><p className="eyebrow">End-to-End Flow</p><h2>Intelligence Core Pipeline</h2></div></div>
          <div className="pipeline">
            {[{ n: 1, t: 'Ingest', s: 'Documents, telemetry, statements' }, { n: 2, t: 'Hash', s: 'SHA-256 cryptographic anchor' }, { n: 3, t: 'SACS', s: 'Authority-stratum classification' }, { n: 4, t: 'Ledger', s: 'Immutable provenance trail' }, { n: 5, t: 'Fusion', s: 'Multi-vector threat convergence' }, { n: 6, t: 'Brief', s: 'Intelligence matrix output' }].map((step, i, arr) => (
              <React.Fragment key={step.n}>
                <div className="pipeline-step"><div className="step-number">{step.n}</div><strong>{step.t}</strong><small>{step.s}</small></div>
                {i < arr.length - 1 && <div className="pipeline-connector"></div>}
              </React.Fragment>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '12px', lineHeight: 1.5 }}>
            This pipeline shows the data flow from intake through analysis to briefing. Log incidents in the SACS Incident Logger to populate the metrics and recent activity feed.
          </p>
        </article>
        
        {/* Threat Radar - NEW */}
        <article className="card">
          <div className="card-header"><div><p className="eyebrow">Vector Mix</p><h2>Threat Domains</h2></div></div>
          <div className="threat-radar" aria-label="Threat domain visualization">
            <svg viewBox="0 0 200 200" className="radar-svg">
              <polygon points="100,20 176,60 176,140 100,180 24,140 24,60" fill="none" stroke="var(--border)" strokeWidth="0.5"/>
              <polygon points="100,40 156,68 156,132 100,160 44,132 44,68" fill="none" stroke="var(--border)" strokeWidth="0.5"/>
              <polygon points="100,60 136,76 136,124 100,140 64,124 64,76" fill="none" stroke="var(--border)" strokeWidth="0.5"/>
              <line x1="100" y1="20" x2="100" y2="180" stroke="var(--border)" strokeWidth="0.3"/>
              <line x1="24" y1="60" x2="176" y2="140" stroke="var(--border)" strokeWidth="0.3"/>
              <line x1="176" y1="60" x2="24" y2="140" stroke="var(--border)" strokeWidth="0.3"/>
              <polygon points="100,32 162,66 148,138 52,130 36,72" fill="var(--accent)" fillOpacity="0.15" stroke="var(--accent)" strokeWidth="1.5"/>
              <circle cx="100" cy="32" r="3" fill="var(--accent)"/>
              <circle cx="162" cy="66" r="3" fill="var(--accent)"/>
              <circle cx="148" cy="138" r="3" fill="var(--accent)"/>
              <circle cx="52" cy="130" r="3" fill="var(--accent)"/>
              <circle cx="36" cy="72" r="3" fill="var(--accent)"/>
            </svg>
            <div className="radar-labels">
              <span className="rl-top">Cyber</span>
              <span className="rl-right">EM/RF</span>
              <span className="rl-bottom-right">Institutional</span>
              <span className="rl-bottom-left">Physical</span>
              <span className="rl-left">Identity</span>
            </div>
          </div>
        </article>
        
        {/* Recent Activity */}
        <article className="card">
          <div className="card-header"><div><p className="eyebrow">Recent Activity</p><h2>Latest Incidents</h2></div></div>
          <ul className="feed-list">
            {recentIncidents.map(inc => (
              <li key={inc.id} className={`feed-item ${inc.priority === 'CRITICAL' ? 'accent' : ''}`}>
                <div>
                  <strong>{inc.priority} — {inc.targetSubject}</strong>
                  <span>{inc.sacsCode} · {new Date(inc.timestamp).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
            {recentIncidents.length === 0 && <li className="feed-item"><span>No incidents recorded yet. Use the SACS Incident Logger to create entries.</span></li>}
          </ul>
        </article>
        
        {/* Convergence Watch - NEW */}
        <article className="card">
          <div className="card-header"><div><p className="eyebrow">Current Alerts</p><h2>Convergence Watch</h2></div></div>
          <ul className="alert-feed">
            <li className="high">
              <div>
                <strong>High Priority</strong>
                <span>Repeated authority-stratum gap across related case packets</span>
              </div>
            </li>
            <li>
              <div>
                <strong>Moderate Priority</strong>
                <span>Cyber vector score rose after new device log intake</span>
              </div>
            </li>
            <li className="high">
              <div>
                <strong>High Priority</strong>
                <span>Institutional compression factor exceeds mock watch threshold</span>
              </div>
            </li>
          </ul>
        </article>
        
        <article className="card span-2">
          <div className="card-header"><div><p className="eyebrow">Operations</p><h2>Division Readiness</h2></div></div>
          <div className="readiness-grid">
            <div className="readiness-item"><div className="readiness-info"><strong>Protective Intelligence</strong><span>58%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: '58%' }}></div></div><small style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>Threat assessments, counter-influence analysis, identity protection</small></div>
            <div className="readiness-item"><div className="readiness-info"><strong>Custodial Governance</strong><span>72%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: '72%' }}></div></div><small style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>Ledger integrity, SACS enforcement, provenance validation</small></div>
            <div className="readiness-item"><div className="readiness-info"><strong>Continuum Security</strong><span>43%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: '43%' }}></div></div><small style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>EM spectrum defense, cybersecurity, zero-trust enforcement</small></div>
          </div>
        </article>
        
        {/* Activity Feed - NEW */}
        <article className="card">
          <div className="card-header"><div><p className="eyebrow">Activity</p><h2>Recent Events</h2></div></div>
          <div className="activity-feed">
            <div className="activity-item">
              <div className="activity-dot"></div>
              <span>Ledger anchor created for document packet</span>
              <time>2m ago</time>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <span>SACS code compiled: CTS-GOV-AUTH-RESP-C2</span>
              <time>8m ago</time>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <span>Fusion cell recalculation complete</span>
              <time>14m ago</time>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <span>New intake from external agency report</span>
              <time>22m ago</time>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <span>Zero-trust loop balanced</span>
              <time>31m ago</time>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <span>Briefing matrix draft published</span>
              <time>45m ago</time>
            </div>
          </div>
        </article>
      </div>
        </article>
        <article className="card">
          <div className="card-header"><div><p className="eyebrow">Recent Activity</p><h2>Latest Incidents</h2></div></div>
          <ul className="feed-list">
            {recentIncidents.map(inc => (
              <li key={inc.id} className={`feed-item ${inc.priority === 'CRITICAL' ? 'accent' : ''}`}>
                <div><strong>{inc.priority}</strong><span>{inc.sacsCode}</span></div>
              </li>
            ))}
            {recentIncidents.length === 0 && <li className="feed-item"><span>No incidents recorded</span></li>}
          </ul>
        </article>
        <article className="card span-2">
          <div className="card-header"><div><p className="eyebrow">Operations</p><h2>Division Readiness</h2></div></div>
          <div className="readiness-grid">
            <div className="readiness-item"><div className="readiness-info"><strong>Protective Intelligence</strong><span>58%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: '58%' }}></div></div></div>
            <div className="readiness-item"><div className="readiness-info"><strong>Custodial Governance</strong><span>72%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: '72%' }}></div></div></div>
            <div className="readiness-item"><div className="readiness-info"><strong>Continuum Security</strong><span>43%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: '43%' }}></div></div></div>
          </div>
        </article>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// ── SACS COMPILER VIEW ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function SacsCompilerView() {
  const [system, setSystem] = useState('JUD');
  const [domain, setDomain] = useState('POL');
  const [role, setRole] = useState('INI');
  const [func, setFunc] = useState('INV');
  const [risk, setRisk] = useState('C');
  const [failure, setFailure] = useState('AU');
  const code = `${system}.${domain}.${role}.${func}.${risk}.${failure}`;
  return (
    <div className="split-layout">
      <article className="card">
        <div className="card-header"><div><p className="eyebrow">S-SIE</p><h2>SACS Compiler</h2></div></div>
        <div className="form-grid">
          <div className="form-field"><label>System</label><select value={system} onChange={e => setSystem(e.target.value)}><option value="JUD">JUD (Judicial)</option><option value="OPS">OPS (Operations)</option><option value="LOG">LOG (Logistics)</option><option value="SEC">SEC (Security)</option></select></div>
          <div className="form-field"><label>Domain</label><select value={domain} onChange={e => setDomain(e.target.value)}><option value="SUP">SUP (Supervisory)</option><option value="POL">POL (Policy)</option><option value="DAT">DAT (Data)</option><option value="NET">NET (Network)</option></select></div>
          <div className="form-field"><label>Role</label><select value={role} onChange={e => setRole(e.target.value)}><option value="INV">INV (Investigation)</option><option value="INI">INI (Initialization)</option><option value="VAL">VAL (Validation)</option><option value="REP">REP (Reporting)</option></select></div>
          <div className="form-field"><label>Function</label><select value={func} onChange={e => setFunc(e.target.value)}><option value="INV">INV (Investigation)</option><option value="REP">REP (Reporting)</option><option value="AUD">AUD (Audit)</option></select></div>
          <div className="form-field"><label>Risk</label><select value={risk} onChange={e => setRisk(e.target.value)}><option value="C">C (Critical)</option><option value="M">M (Major)</option><option value="L">L (Minor)</option></select></div>
          <div className="form-field"><label>Failure Mode</label><select value={failure} onChange={e => setFailure(e.target.value)}><option value="AU">AU (Authority Breach)</option><option value="DA">DA (Data Mutation)</option><option value="EX">EX (Compromise)</option></select></div>
        </div>
      </article>
      <article className="card">
        <div className="card-header"><div><p className="eyebrow">Output</p><h2>Generated Code</h2></div></div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: 'var(--accent)', padding: '12px 14px', borderRadius: '4px', background: 'var(--accent-soft)', border: '1px solid rgba(6, 108, 244, 0.2)', marginBottom: '12px', wordBreak: 'break-all' }}>{code}</div>
        <p style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '12px' }}>This deterministic code links case material, ledger entries, risk flags, and briefing outputs.</p>
        <div style={{ padding: '10px 12px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)' }}>
          <strong style={{ display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: '3px' }}>Routing</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Custodial Governance review, SRPE watchlist</span>
        </div>
      </article>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── FUSION VIEW ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function FusionView({ incidents }: { incidents: SecurityIncident[] }) {
  const vectors = [
    { name: 'Cyber', count: incidents.filter(i => i.sacsCode.includes('NET') || i.tags.some(t => t.includes('CYBER'))).length },
    { name: 'EM/RF', count: incidents.filter(i => i.tags.some(t => t.includes('EM') || t.includes('RF'))).length },
    { name: 'Institutional', count: incidents.filter(i => i.sacsCode.includes('JUD') || i.sacsCode.includes('POL')).length },
    { name: 'Physical', count: incidents.filter(i => i.tags.some(t => t.includes('PHYS'))).length },
    { name: 'Identity', count: incidents.filter(i => i.tags.some(t => t.includes('ID') || t.includes('IDENT'))).length },
  ];
  const maxCount = Math.max(...vectors.map(v => v.count), 1);
  return (
    <div className="card">
      <div className="card-header"><div><p className="eyebrow">MV-TFC</p><h2>Multi-Vector Threat Fusion Cell</h2></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
        {vectors.map(v => (
          <div key={v.name} style={{ padding: '12px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <strong style={{ fontSize: '11px', fontWeight: 700 }}>{v.name}</strong>
              <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{v.count}</span>
            </div>
            <span style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', marginBottom: '8px' }}>Active signals</span>
            <div style={{ height: '3px', borderRadius: '2px', background: 'var(--surface-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '2px', background: 'var(--accent)', width: `${(v.count / maxCount) * 100}%`, transition: 'width 0.4s ease' }}></div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 14px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)' }}>
        <strong style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px', display: 'block' }}>Threat Convergence Profile</strong>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {vectors.filter(v => v.count > 0).length > 0
            ? `${vectors.sort((a, b) => b.count - a.count)[0].name} vector shows highest activity with ${vectors.sort((a, b) => b.count - a.count)[0].count} signals.`
            : 'No active threat vectors detected. System monitoring continues.'}
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── RISK VIEW ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function RiskView({ incidents }: { incidents: SecurityIncident[] }) {
  const [highOnly, setHighOnly] = useState(false);

  // Dynamic pattern detection based on actual incidents
  const criticalCount = incidents.filter(i => i.priority === 'CRITICAL').length;
  const highCount = incidents.filter(i => i.priority === 'HIGH').length;
  const judicialIncidents = incidents.filter(i => i.sacsCode.includes('JUD')).length;
  const cyberIncidents = incidents.filter(i => i.tags.some(t => t.includes('CYBER') || t.includes('NET'))).length;

  const patterns = [
    { title: 'Critical Authority Escalation', level: 'High', body: `${criticalCount} critical-priority incidents detected requiring immediate review.` },
    { title: 'High-Priority Cluster', level: highCount > 2 ? 'High' : 'Medium', body: `${highCount} high-priority incidents in active monitoring queue.` },
    { title: 'Judicial System Pattern', level: judicialIncidents > 1 ? 'High' : 'Low', body: `${judicialIncidents} incidents involving judicial authority layer.` },
    { title: 'Cyber-Network Convergence', level: cyberIncidents > 0 ? 'Medium' : 'Low', body: `${cyberIncidents} cyber/network vectors identified in threat fusion.` },
    { title: 'Evidence Integrity Check', level: 'Medium', body: 'Verifying all ledger entries have corresponding documentation.' },
    { title: 'Temporal Pattern Analysis', level: 'Low', body: 'Monitoring incident frequency for anomalous clustering.' },
  ].filter(p => !highOnly || p.level === 'High');
  return (
    <div className="card">
      <div className="card-header">
        <div><p className="eyebrow">SRPE</p><h2>Systemic-Risk Pattern Engine</h2></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={highOnly} onChange={e => setHighOnly(e.target.checked)} /> High priority only
        </label>
      </div>
      <div className="risk-board">
        {patterns.map((p, i) => (
          <article key={i} className="risk-card" data-level={p.level}>
            <strong>{p.title}</strong>
            <span className={`pill ${p.level === 'High' ? 'accent' : ''}`} style={{ marginBottom: '6px' }}>{p.level}</span>
            <span>{p.body}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── ZERO TRUST VIEW ──────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function ZeroTrustView() {
  const events = [
    { title: 'Continuous verification', detail: 'All sessions refreshed within policy window.' },
    { title: 'Micro-segmentation', detail: 'No lateral movement path detected.' },
    { title: 'Context authentication', detail: 'Role revalidation complete.' },
    { title: 'Contour delta', detail: 'Loop imbalance below alert threshold.' },
  ];
  return (
    <div className="card">
      <div className="card-header"><div><p className="eyebrow">CL-ZTIM</p><h2>Closed-Loop Zero-Trust Integrity Monitor</h2></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'center' }}>
        <div style={{ position: 'relative', aspectRatio: '1', display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border)" strokeWidth="0.5"/>
            <circle cx="100" cy="100" r="70" fill="none" stroke="var(--accent)" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4"/>
            <circle cx="100" cy="100" r="50" fill="none" stroke="var(--text)" strokeWidth="0.5" strokeOpacity="0.3"/>
            <circle cx="100" cy="100" r="30" fill="var(--surface)" stroke="var(--border)" strokeWidth="1"/>
          </svg>
          <div style={{ position: 'absolute', width: '70px', height: '70px', display: 'grid', placeItems: 'center', textAlign: 'center', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <strong style={{ display: 'block', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>0.018</strong>
            <span style={{ fontSize: '8px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>delta</span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '6px' }}>
          {events.map((e, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <strong style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '2px' }}>{e.title}</strong>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{e.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── IDENTITY VIEW ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function IdentityView() {
  return (
    <div className="dashboard-grid">
      <article className="card">
        <div className="card-header"><div><p className="eyebrow">BIV</p><h2>Biometric Identity Vault</h2></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', borderRadius: '4px', background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'var(--text)', color: '#FFFFFF', fontSize: '16px', fontWeight: 800 }}>SL</div>
          <strong style={{ fontSize: '13px', fontWeight: 600 }}>Protected Person Profile</strong>
          <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Tokenized identity only</span>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Shield Posture</span>
            <strong style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>Elevated</strong>
          </div>
        </div>
      </article>
      <article className="card span-2">
        <div className="card-header"><div><p className="eyebrow">PPIS</p><h2>Protected-Person Intelligence Shield</h2></div></div>
        <div className="protection-grid">
          {['Threat scoring', 'Device exploitation watch', 'Identity-continuum lock', 'Institutional manipulation alert', 'Counter-surveillance', 'Emergency lockdown drill'].map((item, i) => (
            <button key={i} className={`protection ${i === 0 ? 'active' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              {item}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── ROADMAP VIEW ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function RoadmapView() {
  return (
    <div className="card">
      <div className="card-header"><div><p className="eyebrow">12-36 Month Build</p><h2>Deployment Roadmap</h2></div></div>
      <div className="timeline">
        <div className="phase">
          <div className="phase-marker"></div><span>0-6 months</span><strong>Foundation</strong>
          <ul className="phase-list"><li>G-PCL ledger operational</li><li>SACS Compiler deployed</li><li>Zero-Trust baseline</li><li>PID initial standup</li><li>Intelligence Matrix v1</li></ul>
        </div>
        <div className="phase">
          <div className="phase-marker"></div><span>6-18 months</span><strong>Expansion</strong>
          <ul className="phase-list"><li>Full MV-TFC activation</li><li>Identity Vault operational</li><li>Systemic-Risk Engine</li><li>Multi-vector telemetry</li><li>Cross-case pattern detection</li></ul>
        </div>
        <div className="phase">
          <div className="phase-marker"></div><span>18-36 months</span><strong>Sovereign Integration</strong>
          <ul className="phase-list"><li>UN Passport Alliance node</li><li>Maritime/Aviation security</li><li>Digital Continuum Vault</li><li>Global custodial operations</li><li>International intel exchange</li></ul>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── INTAKE VIEW ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function IntakeView({ addAudit, incidents, setIncidents }: { 
  addAudit: (action: string, targetId: string, targetType: string, detail: string) => void;
  incidents: SecurityIncident[];
  setIncidents: React.Dispatch<React.SetStateAction<SecurityIncident[]>>;
}) {
  const [sourceType, setSourceType] = useState('Vault document');
  const [subject, setSubject] = useState('Institutional response anomaly');
  const [vector, setVector] = useState('Institutional');
  const [riskLevel, setRiskLevel] = useState('Moderate');
  const [notes, setNotes] = useState('Mock source packet received for normalization and routing.');
  const [packetResult, setPacketResult] = useState<any>(null);

  const handleIntake = (e: React.FormEvent) => {
    e.preventDefault();
    const riskCode = riskLevel === 'Critical' ? 'C4' : riskLevel === 'High' ? 'C3' : riskLevel === 'Low' ? 'C1' : 'C2';
    const vectorCode = vector.slice(0, 3).toUpperCase();
    const sacsCode = `CTS-${vectorCode}-EXT-ROUTE-${riskCode}-FM-GAP`;
    const hash = Math.random().toString(36).substring(2, 12);
    const marker = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

    const newIncident: SecurityIncident = {
      id: `INC-${Date.now()}`,
      sacsCode,
      priority: riskLevel === 'Critical' ? 'CRITICAL' : riskLevel === 'High' ? 'HIGH' : riskLevel === 'Low' ? 'LOW' : 'MEDIUM',
      xAxis: marker,
      yAxis: vector,
      zAxis: sourceType,
      targetSubject: subject,
      clearanceTier: 'TIER-3',
      scopeFlags: vector.toUpperCase(),
      sensoryInput: 'Intake pipeline',
      perceptualPhenomenon: notes,
      environmentalContext: 'System intake',
      status: 'Open',
      timestamp: marker,
      attachedDocIds: [],
      tags: [vector.toUpperCase()],
      isArchived: false,
    };

    setIncidents(prev => [newIncident, ...prev]);
    addAudit('CREATE_INTAKE', newIncident.id, 'incident', `Intake created: ${subject} [${sacsCode}]`);

    setPacketResult({
      subject,
      source: sourceType,
      hash: `${hash.slice(0, 6)}...${hash.slice(6)}`,
      sacsCode,
      marker,
      route: riskLevel === 'Critical' ? 'Director escalation' : 'Fusion cell analyst queue',
    });
  };

  return (
    <div className="split-layout">
      <article className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">IINP</p>
            <h2>New Intelligence Intake</h2>
          </div>
        </div>
        <form onSubmit={handleIntake} className="form-grid">
          <div className="form-field">
            <label>Source Type</label>
            <select value={sourceType} onChange={e => setSourceType(e.target.value)}>
              <option>Vault document</option>
              <option>SACS incident log</option>
              <option>EM/RF scan</option>
              <option>Device log</option>
              <option>External agency report</option>
              <option>Witness statement</option>
            </select>
          </div>
          <div className="form-field">
            <label>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Threat Vector</label>
            <select value={vector} onChange={e => setVector(e.target.value)}>
              <option>Institutional</option>
              <option>Cyber</option>
              <option>EM/RF</option>
              <option>Identity</option>
              <option>Physical</option>
              <option>Psychological</option>
            </select>
          </div>
          <div className="form-field">
            <label>Risk Level</label>
            <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
              <option>Moderate</option>
              <option>High</option>
              <option>Critical</option>
              <option>Low</option>
            </select>
          </div>
          <div className="form-field full">
            <label>Analyst Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary full">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Run Intake Pipeline
          </button>
        </form>
      </article>
      
      <article className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Pipeline Result</p>
            <h2>Normalized Packet</h2>
          </div>
        </div>
        <div className="packet-result">
          {packetResult ? (
            <>
              <div className="packet-row"><span>Subject</span><strong>{packetResult.subject}</strong></div>
              <div className="packet-row"><span>Source</span><strong>{packetResult.source}</strong></div>
              <div className="packet-row"><span>SHA-256 Anchor</span><strong>{packetResult.hash}</strong></div>
              <div className="packet-row"><span>SACS Code</span><strong style={{ color: 'var(--accent)' }}>{packetResult.sacsCode}</strong></div>
              <div className="packet-row"><span>Ledger Marker</span><strong>{packetResult.marker}</strong></div>
              <div className="packet-row"><span>Route</span><strong>{packetResult.route}</strong></div>
            </>
          ) : (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>Submit the form to generate a mock hash, SACS code, ledger anchor, and routing decision.</p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── LEDGER VIEW ──────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function LedgerView({ incidents, documentsVault, briefingsArchive }: {
  incidents: SecurityIncident[];
  documentsVault: LedgerDocument[];
  briefingsArchive: IntelligenceBriefing[];
}) {
  const [filter, setFilter] = useState<'all' | 'Document' | 'Incident' | 'Brief'>('all');

  const ledgerEntries = [
    ...documentsVault.map(d => ({
      marker: d.dateAdded,
      type: 'Document' as const,
      sacsCode: d.tags[0] || 'N/A',
      hash: d.hash ? `${d.hash.slice(0, 6)}...${d.hash.slice(6, 12)}` : 'N/A',
      status: 'Anchored',
    })),
    ...incidents.map(i => ({
      marker: i.timestamp,
      type: 'Incident' as const,
      sacsCode: i.sacsCode,
      hash: 'N/A',
      status: i.status,
    })),
    ...briefingsArchive.map(b => ({
      marker: b.timestamp,
      type: 'Brief' as const,
      sacsCode: b.tags[0] || 'N/A',
      hash: 'N/A',
      status: 'Published',
    })),
  ].sort((a, b) => new Date(b.marker).getTime() - new Date(a.marker).getTime());

  const filtered = filter === 'all' ? ledgerEntries : ledgerEntries.filter(e => e.type === filter);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">G-PCL</p>
          <h2>Global Provenance & Custodial Ledger</h2>
        </div>
        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'Document' ? 'active' : ''} onClick={() => setFilter('Document')}>Documents</button>
          <button className={filter === 'Incident' ? 'active' : ''} onClick={() => setFilter('Incident')}>Incidents</button>
          <button className={filter === 'Brief' ? 'active' : ''} onClick={() => setFilter('Brief')}>Briefs</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>UTC Marker</th>
              <th>Type</th>
              <th>SACS Code</th>
              <th>Hash</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((entry, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{entry.marker}</td>
                  <td>{entry.type}</td>
                  <td><span className="pill">{entry.sacsCode}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{entry.hash}</td>
                  <td>{entry.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px' }}>
                  No records match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

