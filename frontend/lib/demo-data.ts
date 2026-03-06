// SchemaShift — Realistic Demo Data
// Used when the Python backend is unavailable (e.g., Vercel-only deployment)

import {
  Source,
  Scan,
  Recipe,
  DriftEvent,
  ColumnSchema,
  FormatInfo,
  Session,
} from './types';

// ---------------------------------------------------------------------------
// Stable IDs & timestamps
// ---------------------------------------------------------------------------

const SESSION_ID = 'demo-session-00000000-0000-0000-0000-000000000001';

const SOURCE_IDS = {
  stripe: 'src_4a1e7c3b-8d2f-4e5a-9b0c-1d3e5f7a9b0d',
  crm: 'src_8f2d6e4c-1a3b-5c7d-9e0f-2b4d6e8f0a1c',
  inventory: 'src_c3b5d7e9-0f1a-2b3c-4d5e-6f7a8b9c0d1e',
} as const;

const SCAN_IDS = {
  stripe: [
    'scn_a1b2c3d4-e5f6-7890-abcd-ef0123456789',
    'scn_b2c3d4e5-f6a7-8901-bcde-f01234567890',
    'scn_c3d4e5f6-a7b8-9012-cdef-012345678901',
    'scn_d4e5f6a7-b8c9-0123-defa-123456789012',
    'scn_e5f6a7b8-c9d0-1234-efab-234567890123',
  ],
  crm: [
    'scn_f6a7b8c9-d0e1-2345-fabc-345678901234',
    'scn_a7b8c9d0-e1f2-3456-abcd-456789012345',
    'scn_b8c9d0e1-f2a3-4567-bcde-567890123456',
    'scn_c9d0e1f2-a3b4-5678-cdef-678901234567',
  ],
  inventory: [
    'scn_d0e1f2a3-b4c5-6789-defa-789012345678',
    'scn_e1f2a3b4-c5d6-7890-efab-890123456789',
    'scn_f2a3b4c5-d6e7-8901-fabc-901234567890',
  ],
};

// Timestamps spread over the last 3 months
function ts(daysAgo: number, hoursAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Stripe Payouts Export — 8 columns
// ---------------------------------------------------------------------------

const stripeSchema: ColumnSchema[] = [
  {
    name: 'payout_id',
    inferredType: 'uuid',
    confidence: 0.98,
    nullRate: 0.0,
    cardinality: 1842,
    sampleValues: ['po_3N1kL2eB5O6p7Q8r', 'po_9S0tU1vW2X3y4Z5a', 'po_6B7cD8eF9G0h1I2j'],
    stats: null,
  },
  {
    name: 'amount',
    inferredType: 'currency',
    confidence: 0.95,
    nullRate: 0.0,
    cardinality: 1247,
    sampleValues: ['4250.00', '189.50', '12750.75'],
    stats: { mean: 3842.17, std: 5210.33, min: 0.5, max: 98500.0, q25: 425.0, q50: 1850.0, q75: 4500.0 },
  },
  {
    name: 'currency',
    inferredType: 'categorical',
    confidence: 0.99,
    nullRate: 0.0,
    cardinality: 4,
    sampleValues: ['usd', 'eur', 'gbp', 'cad'],
    stats: null,
  },
  {
    name: 'created_at',
    inferredType: 'datetime',
    confidence: 0.97,
    nullRate: 0.0,
    cardinality: 1842,
    sampleValues: ['2026-01-15T08:23:41Z', '2026-02-03T14:05:19Z', '2026-02-28T22:17:08Z'],
    stats: null,
  },
  {
    name: 'status',
    inferredType: 'categorical',
    confidence: 0.99,
    nullRate: 0.0,
    cardinality: 4,
    sampleValues: ['paid', 'pending', 'in_transit', 'failed'],
    stats: null,
  },
  {
    name: 'bank_account',
    inferredType: 'free_text',
    confidence: 0.82,
    nullRate: 0.02,
    cardinality: 12,
    sampleValues: ['ba_****4532', 'ba_****8891', 'ba_****2207'],
    stats: null,
  },
  {
    name: 'fee',
    inferredType: 'currency',
    confidence: 0.94,
    nullRate: 0.0,
    cardinality: 980,
    sampleValues: ['12.75', '0.57', '38.25'],
    stats: { mean: 11.53, std: 15.63, min: 0.01, max: 295.5, q25: 1.28, q50: 5.55, q75: 13.5 },
  },
  {
    name: 'net',
    inferredType: 'currency',
    confidence: 0.94,
    nullRate: 0.0,
    cardinality: 1245,
    sampleValues: ['4237.25', '188.93', '12712.50'],
    stats: { mean: 3830.64, std: 5198.7, min: 0.49, max: 98204.5, q25: 423.72, q50: 1844.45, q75: 4486.5 },
  },
];

const stripeFormat: FormatInfo = {
  delimiter: ',',
  encoding: 'utf-8',
  quoteChar: '"',
  hasHeader: true,
  lineEnding: '\\n',
  rowCount: 1842,
};

// ---------------------------------------------------------------------------
// CRM Contact List — 10 columns
// ---------------------------------------------------------------------------

const crmSchema: ColumnSchema[] = [
  {
    name: 'id',
    inferredType: 'integer',
    confidence: 0.99,
    nullRate: 0.0,
    cardinality: 5420,
    sampleValues: ['10001', '10002', '10003'],
    stats: { mean: 12710, std: 1567, min: 10001, max: 15420, q25: 11355, q50: 12710, q75: 14065 },
  },
  {
    name: 'first_name',
    inferredType: 'free_text',
    confidence: 0.91,
    nullRate: 0.003,
    cardinality: 2891,
    sampleValues: ['Sarah', 'James', 'Priya'],
    stats: null,
  },
  {
    name: 'last_name',
    inferredType: 'free_text',
    confidence: 0.92,
    nullRate: 0.005,
    cardinality: 4102,
    sampleValues: ['Chen', 'Williams', 'Patel'],
    stats: null,
  },
  {
    name: 'email',
    inferredType: 'email',
    confidence: 0.97,
    nullRate: 0.012,
    cardinality: 5380,
    sampleValues: ['s.chen@acmecorp.io', 'jwilliams@globex.com', 'priya.p@initech.dev'],
    stats: null,
  },
  {
    name: 'phone',
    inferredType: 'phone',
    confidence: 0.85,
    nullRate: 0.18,
    cardinality: 4450,
    sampleValues: ['+1-415-555-0142', '+44-20-7946-0958', '+91-98765-43210'],
    stats: null,
  },
  {
    name: 'company',
    inferredType: 'free_text',
    confidence: 0.88,
    nullRate: 0.04,
    cardinality: 1230,
    sampleValues: ['Acme Corp', 'Globex International', 'Initech'],
    stats: null,
  },
  {
    name: 'title',
    inferredType: 'free_text',
    confidence: 0.83,
    nullRate: 0.15,
    cardinality: 340,
    sampleValues: ['VP Engineering', 'Product Manager', 'Staff Software Engineer'],
    stats: null,
  },
  {
    name: 'created_at',
    inferredType: 'datetime',
    confidence: 0.96,
    nullRate: 0.0,
    cardinality: 5420,
    sampleValues: ['2025-06-12T09:15:33Z', '2025-09-23T16:42:01Z', '2026-01-08T11:30:55Z'],
    stats: null,
  },
  {
    name: 'updated_at',
    inferredType: 'datetime',
    confidence: 0.96,
    nullRate: 0.0,
    cardinality: 5418,
    sampleValues: ['2026-02-15T14:22:10Z', '2026-03-01T08:45:29Z', '2026-03-04T19:10:44Z'],
    stats: null,
  },
  {
    name: 'status',
    inferredType: 'categorical',
    confidence: 0.99,
    nullRate: 0.0,
    cardinality: 5,
    sampleValues: ['active', 'churned', 'prospect', 'trial', 'suspended'],
    stats: null,
  },
];

const crmFormat: FormatInfo = {
  delimiter: ',',
  encoding: 'utf-8',
  quoteChar: '"',
  hasHeader: true,
  lineEnding: '\\r\\n',
  rowCount: 5420,
};

// ---------------------------------------------------------------------------
// Inventory Feed — 7 columns
// ---------------------------------------------------------------------------

const inventorySchema: ColumnSchema[] = [
  {
    name: 'sku',
    inferredType: 'free_text',
    confidence: 0.90,
    nullRate: 0.0,
    cardinality: 3150,
    sampleValues: ['WH-ELC-00412', 'WH-FRN-01287', 'WH-APP-00089'],
    stats: null,
  },
  {
    name: 'product_name',
    inferredType: 'free_text',
    confidence: 0.93,
    nullRate: 0.0,
    cardinality: 3148,
    sampleValues: ['USB-C Hub 7-in-1', 'Ergonomic Desk Chair Pro', 'Cotton Hoodie (Navy, L)'],
    stats: null,
  },
  {
    name: 'category',
    inferredType: 'categorical',
    confidence: 0.97,
    nullRate: 0.0,
    cardinality: 28,
    sampleValues: ['Electronics', 'Furniture', 'Apparel', 'Kitchen', 'Sports'],
    stats: null,
  },
  {
    name: 'quantity',
    inferredType: 'integer',
    confidence: 0.98,
    nullRate: 0.0,
    cardinality: 412,
    sampleValues: ['142', '8', '530'],
    stats: { mean: 187.4, std: 245.6, min: 0, max: 2500, q25: 22, q50: 95, q75: 260 },
  },
  {
    name: 'price',
    inferredType: 'currency',
    confidence: 0.96,
    nullRate: 0.0,
    cardinality: 890,
    sampleValues: ['29.99', '349.00', '42.50'],
    stats: { mean: 78.42, std: 112.3, min: 0.99, max: 1299.99, q25: 14.99, q50: 39.99, q75: 89.99 },
  },
  {
    name: 'warehouse',
    inferredType: 'categorical',
    confidence: 0.99,
    nullRate: 0.0,
    cardinality: 5,
    sampleValues: ['US-WEST-1', 'US-EAST-2', 'EU-CENTRAL-1', 'APAC-SOUTH-1', 'US-CENTRAL-1'],
    stats: null,
  },
  {
    name: 'last_updated',
    inferredType: 'datetime',
    confidence: 0.95,
    nullRate: 0.01,
    cardinality: 3100,
    sampleValues: ['2026-03-04T06:15:00Z', '2026-03-03T22:30:00Z', '2026-03-04T14:45:00Z'],
    stats: null,
  },
];

const inventoryFormat: FormatInfo = {
  delimiter: '\\t',
  encoding: 'utf-8',
  quoteChar: '"',
  hasHeader: true,
  lineEnding: '\\n',
  rowCount: 3150,
};

// ---------------------------------------------------------------------------
// Demo Sources
// ---------------------------------------------------------------------------

export const DEMO_SESSION: Session = {
  sessionId: SESSION_ID,
  scanCount: 12,
  sourcesCount: 3,
  plan: 'free',
  createdAt: ts(90),
  lastSeenAt: ts(0, 1),
};

export const DEMO_SOURCES: Source[] = [
  {
    id: SOURCE_IDS.stripe,
    sessionId: SESSION_ID,
    name: 'Stripe Payouts Export',
    description: 'Monthly payout reconciliation file from Stripe Dashboard',
    fingerprint: 'fp_stripe_payouts_v2',
    baselineSchema: stripeSchema,
    formatInfo: stripeFormat,
    columnCount: 8,
    scanCount: 5,
    driftScore: 0.23,
    qualityScore: 0.91,
    firstSeenAt: ts(85),
    lastSeenAt: ts(2),
    tags: ['payments', 'finance', 'stripe'],
    isDemo: true,
    createdAt: ts(85),
    updatedAt: ts(2),
  },
  {
    id: SOURCE_IDS.crm,
    sessionId: SESSION_ID,
    name: 'CRM Contact List',
    description: 'Nightly CRM export of active and churned contacts',
    fingerprint: 'fp_crm_contacts_v3',
    baselineSchema: crmSchema,
    formatInfo: crmFormat,
    columnCount: 10,
    scanCount: 4,
    driftScore: 0.35,
    qualityScore: 0.84,
    firstSeenAt: ts(75),
    lastSeenAt: ts(5),
    tags: ['crm', 'contacts', 'sales'],
    isDemo: true,
    createdAt: ts(75),
    updatedAt: ts(5),
  },
  {
    id: SOURCE_IDS.inventory,
    sessionId: SESSION_ID,
    name: 'Inventory Feed',
    description: 'Real-time warehouse inventory sync (TSV format)',
    fingerprint: 'fp_inventory_feed_v1',
    baselineSchema: inventorySchema,
    formatInfo: inventoryFormat,
    columnCount: 7,
    scanCount: 3,
    driftScore: 0.12,
    qualityScore: 0.95,
    firstSeenAt: ts(45),
    lastSeenAt: ts(1),
    tags: ['inventory', 'warehouse', 'supply-chain'],
    isDemo: true,
    createdAt: ts(45),
    updatedAt: ts(1),
  },
];

// ---------------------------------------------------------------------------
// Scan History
// ---------------------------------------------------------------------------

export const DEMO_SCANS: Record<string, Scan[]> = {
  [SOURCE_IDS.stripe]: [
    {
      id: SCAN_IDS.stripe[0],
      sourceId: SOURCE_IDS.stripe,
      sessionId: SESSION_ID,
      filename: 'payouts_jan_2026.csv',
      fileSizeBytes: 245_780,
      rowCount: 1842,
      columnCount: 8,
      schemaSnapshot: stripeSchema,
      formatInfo: stripeFormat,
      driftReport: null,
      anomalyReport: null,
      qualityScore: 0.97,
      recipesApplied: [],
      isNewSource: true,
      createdAt: ts(85),
    },
    {
      id: SCAN_IDS.stripe[1],
      sourceId: SOURCE_IDS.stripe,
      sessionId: SESSION_ID,
      filename: 'payouts_jan_week3.csv',
      fileSizeBytes: 198_420,
      rowCount: 1510,
      columnCount: 8,
      schemaSnapshot: stripeSchema,
      formatInfo: { ...stripeFormat, rowCount: 1510 },
      driftReport: { hasChanges: false, addedColumns: [], removedColumns: [], renamedColumns: [], typeChanges: [], distributionShifts: [], summary: 'No schema drift detected.' },
      anomalyReport: { anomalies: [], overallScore: 0.98 },
      qualityScore: 0.96,
      recipesApplied: [],
      isNewSource: false,
      createdAt: ts(70),
    },
    {
      id: SCAN_IDS.stripe[2],
      sourceId: SOURCE_IDS.stripe,
      sessionId: SESSION_ID,
      filename: 'payouts_feb_2026.csv',
      fileSizeBytes: 312_100,
      rowCount: 2105,
      columnCount: 9,
      schemaSnapshot: [
        ...stripeSchema,
        {
          name: 'destination_type',
          inferredType: 'categorical',
          confidence: 0.97,
          nullRate: 0.0,
          cardinality: 3,
          sampleValues: ['bank_account', 'card', 'crypto_wallet'],
          stats: null,
        },
      ],
      formatInfo: { ...stripeFormat, rowCount: 2105 },
      driftReport: {
        hasChanges: true,
        addedColumns: ['destination_type'],
        removedColumns: [],
        renamedColumns: [],
        typeChanges: [],
        distributionShifts: [
          { column: 'amount', metric: 'mean', oldValue: 3842.17, newValue: 4210.55, severity: 'low' },
        ],
        summary: 'New column "destination_type" added. Minor distribution shift in "amount" (mean +9.6%).',
      },
      anomalyReport: { anomalies: [], overallScore: 0.94 },
      qualityScore: 0.93,
      recipesApplied: ['rcp_stripe_parse_dates'],
      isNewSource: false,
      createdAt: ts(45),
    },
    {
      id: SCAN_IDS.stripe[3],
      sourceId: SOURCE_IDS.stripe,
      sessionId: SESSION_ID,
      filename: 'payouts_feb_week4.csv',
      fileSizeBytes: 287_650,
      rowCount: 1980,
      columnCount: 9,
      schemaSnapshot: [
        ...stripeSchema.map(c =>
          c.name === 'bank_account'
            ? { ...c, name: 'destination_account', nullRate: 0.05 }
            : c
        ),
        {
          name: 'destination_type',
          inferredType: 'categorical',
          confidence: 0.97,
          nullRate: 0.0,
          cardinality: 3,
          sampleValues: ['bank_account', 'card', 'crypto_wallet'],
          stats: null,
        },
      ],
      formatInfo: { ...stripeFormat, rowCount: 1980 },
      driftReport: {
        hasChanges: true,
        addedColumns: [],
        removedColumns: [],
        renamedColumns: [{ oldName: 'bank_account', newName: 'destination_account', confidence: 0.89 }],
        typeChanges: [],
        distributionShifts: [],
        summary: 'Column "bank_account" appears to have been renamed to "destination_account" (89% confidence). Null rate increased to 5%.',
      },
      anomalyReport: {
        anomalies: [
          {
            column: 'destination_account',
            type: 'null_rate_spike',
            description: 'Null rate for "destination_account" jumped from 2% to 5%',
            severity: 'medium',
            currentValue: 0.05,
            baselineValue: 0.02,
          },
        ],
        overallScore: 0.88,
      },
      qualityScore: 0.91,
      recipesApplied: ['rcp_stripe_parse_dates'],
      isNewSource: false,
      createdAt: ts(20),
    },
    {
      id: SCAN_IDS.stripe[4],
      sourceId: SOURCE_IDS.stripe,
      sessionId: SESSION_ID,
      filename: 'payouts_mar_2026.csv',
      fileSizeBytes: 301_200,
      rowCount: 2040,
      columnCount: 9,
      schemaSnapshot: [
        ...stripeSchema.map(c => {
          if (c.name === 'bank_account') return { ...c, name: 'destination_account', nullRate: 0.04 };
          if (c.name === 'amount') return { ...c, inferredType: 'float' as const, confidence: 0.90 };
          return c;
        }),
        {
          name: 'destination_type',
          inferredType: 'categorical',
          confidence: 0.97,
          nullRate: 0.0,
          cardinality: 3,
          sampleValues: ['bank_account', 'card', 'crypto_wallet'],
          stats: null,
        },
      ],
      formatInfo: { ...stripeFormat, rowCount: 2040 },
      driftReport: {
        hasChanges: true,
        addedColumns: [],
        removedColumns: [],
        renamedColumns: [],
        typeChanges: [{ column: 'amount', oldType: 'currency', newType: 'float' }],
        distributionShifts: [
          { column: 'fee', metric: 'mean', oldValue: 11.53, newValue: 14.82, severity: 'medium' },
        ],
        summary: 'Column "amount" type changed from currency to float. Fee amounts trending upward (+28.5%).',
      },
      anomalyReport: {
        anomalies: [
          {
            column: 'fee',
            type: 'distribution_shift',
            description: 'Mean fee increased by 28.5%, possibly due to new pricing tier',
            severity: 'medium',
            currentValue: 14.82,
            baselineValue: 11.53,
          },
        ],
        overallScore: 0.85,
      },
      qualityScore: 0.89,
      recipesApplied: ['rcp_stripe_parse_dates'],
      isNewSource: false,
      createdAt: ts(2),
    },
  ],

  [SOURCE_IDS.crm]: [
    {
      id: SCAN_IDS.crm[0],
      sourceId: SOURCE_IDS.crm,
      sessionId: SESSION_ID,
      filename: 'contacts_export_20260101.csv',
      fileSizeBytes: 1_245_000,
      rowCount: 5420,
      columnCount: 10,
      schemaSnapshot: crmSchema,
      formatInfo: crmFormat,
      driftReport: null,
      anomalyReport: null,
      qualityScore: 0.94,
      recipesApplied: [],
      isNewSource: true,
      createdAt: ts(75),
    },
    {
      id: SCAN_IDS.crm[1],
      sourceId: SOURCE_IDS.crm,
      sessionId: SESSION_ID,
      filename: 'contacts_export_20260201.csv',
      fileSizeBytes: 1_312_400,
      rowCount: 5680,
      columnCount: 10,
      schemaSnapshot: crmSchema.map(c =>
        c.name === 'phone' ? { ...c, nullRate: 0.22 } : c
      ),
      formatInfo: { ...crmFormat, rowCount: 5680 },
      driftReport: {
        hasChanges: true,
        addedColumns: [],
        removedColumns: [],
        renamedColumns: [],
        typeChanges: [],
        distributionShifts: [
          { column: 'phone', metric: 'null_rate', oldValue: 0.18, newValue: 0.22, severity: 'medium' },
        ],
        summary: 'Phone null rate increased from 18% to 22%. 260 new contacts added.',
      },
      anomalyReport: {
        anomalies: [
          {
            column: 'phone',
            type: 'null_rate_spike',
            description: 'Phone numbers increasingly missing in new imports',
            severity: 'medium',
            currentValue: 0.22,
            baselineValue: 0.18,
          },
        ],
        overallScore: 0.90,
      },
      qualityScore: 0.90,
      recipesApplied: ['rcp_crm_strip_email'],
      isNewSource: false,
      createdAt: ts(50),
    },
    {
      id: SCAN_IDS.crm[2],
      sourceId: SOURCE_IDS.crm,
      sessionId: SESSION_ID,
      filename: 'contacts_export_20260220.csv',
      fileSizeBytes: 1_450_800,
      rowCount: 5910,
      columnCount: 11,
      schemaSnapshot: [
        ...crmSchema.map(c =>
          c.name === 'phone' ? { ...c, nullRate: 0.25 } : c
        ),
        {
          name: 'lead_score',
          inferredType: 'integer',
          confidence: 0.94,
          nullRate: 0.30,
          cardinality: 100,
          sampleValues: ['85', '42', '91', '67'],
          stats: { mean: 58.3, std: 24.1, min: 1, max: 100, q25: 38, q50: 60, q75: 79 },
        },
      ],
      formatInfo: { ...crmFormat, rowCount: 5910 },
      driftReport: {
        hasChanges: true,
        addedColumns: ['lead_score'],
        removedColumns: [],
        renamedColumns: [],
        typeChanges: [],
        distributionShifts: [
          { column: 'phone', metric: 'null_rate', oldValue: 0.22, newValue: 0.25, severity: 'high' },
        ],
        summary: 'New column "lead_score" added (30% null — partially populated). Phone null rate continues climbing to 25%.',
      },
      anomalyReport: {
        anomalies: [
          {
            column: 'phone',
            type: 'null_rate_spike',
            description: 'Phone null rate climbing steadily: 18% -> 22% -> 25%',
            severity: 'high',
            currentValue: 0.25,
            baselineValue: 0.18,
          },
          {
            column: 'lead_score',
            type: 'high_null_rate',
            description: 'New column "lead_score" is 30% null — data may be incomplete',
            severity: 'medium',
            currentValue: 0.30,
            baselineValue: 0.0,
          },
        ],
        overallScore: 0.82,
      },
      qualityScore: 0.84,
      recipesApplied: ['rcp_crm_strip_email'],
      isNewSource: false,
      createdAt: ts(18),
    },
    {
      id: SCAN_IDS.crm[3],
      sourceId: SOURCE_IDS.crm,
      sessionId: SESSION_ID,
      filename: 'contacts_export_20260301.csv',
      fileSizeBytes: 1_520_300,
      rowCount: 6100,
      columnCount: 11,
      schemaSnapshot: [
        ...crmSchema.map(c => {
          if (c.name === 'phone') return { ...c, nullRate: 0.28 };
          if (c.name === 'email') return { ...c, inferredType: 'free_text' as const, confidence: 0.78 };
          return c;
        }),
        {
          name: 'lead_score',
          inferredType: 'integer',
          confidence: 0.94,
          nullRate: 0.12,
          cardinality: 100,
          sampleValues: ['85', '42', '91', '67'],
          stats: { mean: 58.3, std: 24.1, min: 1, max: 100, q25: 38, q50: 60, q75: 79 },
        },
      ],
      formatInfo: { ...crmFormat, rowCount: 6100 },
      driftReport: {
        hasChanges: true,
        addedColumns: [],
        removedColumns: [],
        renamedColumns: [],
        typeChanges: [{ column: 'email', oldType: 'email', newType: 'free_text' }],
        distributionShifts: [
          { column: 'phone', metric: 'null_rate', oldValue: 0.25, newValue: 0.28, severity: 'high' },
        ],
        summary: 'Email column type degraded from "email" to "free_text" (malformed addresses detected). Phone null rate at 28%.',
      },
      anomalyReport: {
        anomalies: [
          {
            column: 'email',
            type: 'type_degradation',
            description: 'Email validation now fails on 22% of entries — possible import corruption',
            severity: 'high',
            currentValue: 0.78,
            baselineValue: 0.97,
          },
          {
            column: 'phone',
            type: 'null_rate_spike',
            description: 'Phone null rate at 28%, trend shows consistent increase',
            severity: 'high',
            currentValue: 0.28,
            baselineValue: 0.18,
          },
        ],
        overallScore: 0.76,
      },
      qualityScore: 0.79,
      recipesApplied: ['rcp_crm_strip_email'],
      isNewSource: false,
      createdAt: ts(5),
    },
  ],

  [SOURCE_IDS.inventory]: [
    {
      id: SCAN_IDS.inventory[0],
      sourceId: SOURCE_IDS.inventory,
      sessionId: SESSION_ID,
      filename: 'inventory_sync_20260120.tsv',
      fileSizeBytes: 485_200,
      rowCount: 3150,
      columnCount: 7,
      schemaSnapshot: inventorySchema,
      formatInfo: inventoryFormat,
      driftReport: null,
      anomalyReport: null,
      qualityScore: 0.98,
      recipesApplied: [],
      isNewSource: true,
      createdAt: ts(45),
    },
    {
      id: SCAN_IDS.inventory[1],
      sourceId: SOURCE_IDS.inventory,
      sessionId: SESSION_ID,
      filename: 'inventory_sync_20260215.tsv',
      fileSizeBytes: 502_800,
      rowCount: 3280,
      columnCount: 7,
      schemaSnapshot: inventorySchema.map(c =>
        c.name === 'quantity'
          ? { ...c, stats: { ...c.stats!, min: -5, mean: 192.1 } }
          : c
      ),
      formatInfo: { ...inventoryFormat, rowCount: 3280 },
      driftReport: {
        hasChanges: true,
        addedColumns: [],
        removedColumns: [],
        renamedColumns: [],
        typeChanges: [],
        distributionShifts: [
          { column: 'quantity', metric: 'min', oldValue: 0, newValue: -5, severity: 'medium' },
        ],
        summary: 'Negative quantity values detected (min = -5). Possible data entry error or returns not reconciled.',
      },
      anomalyReport: {
        anomalies: [
          {
            column: 'quantity',
            type: 'value_range',
            description: 'Negative inventory quantities found (-5). Should quantity ever be negative?',
            severity: 'medium',
            currentValue: -5,
            baselineValue: 0,
          },
        ],
        overallScore: 0.92,
      },
      qualityScore: 0.95,
      recipesApplied: ['rcp_inv_parse_dates'],
      isNewSource: false,
      createdAt: ts(20),
    },
    {
      id: SCAN_IDS.inventory[2],
      sourceId: SOURCE_IDS.inventory,
      sessionId: SESSION_ID,
      filename: 'inventory_sync_20260304.tsv',
      fileSizeBytes: 510_600,
      rowCount: 3310,
      columnCount: 7,
      schemaSnapshot: inventorySchema.map(c => {
        if (c.name === 'quantity') return { ...c, stats: { ...c.stats!, min: -12, mean: 195.8 } };
        if (c.name === 'last_updated') return { ...c, nullRate: 0.03 };
        return c;
      }),
      formatInfo: { ...inventoryFormat, rowCount: 3310 },
      driftReport: {
        hasChanges: true,
        addedColumns: [],
        removedColumns: [],
        renamedColumns: [],
        typeChanges: [],
        distributionShifts: [
          { column: 'quantity', metric: 'min', oldValue: -5, newValue: -12, severity: 'high' },
          { column: 'last_updated', metric: 'null_rate', oldValue: 0.01, newValue: 0.03, severity: 'low' },
        ],
        summary: 'Negative quantities worsening (min = -12). last_updated null rate tripled but still low (3%).',
      },
      anomalyReport: {
        anomalies: [
          {
            column: 'quantity',
            type: 'value_range',
            description: 'Negative quantities worsening: -5 -> -12. Investigate returns pipeline.',
            severity: 'high',
            currentValue: -12,
            baselineValue: 0,
          },
        ],
        overallScore: 0.88,
      },
      qualityScore: 0.93,
      recipesApplied: ['rcp_inv_parse_dates'],
      isNewSource: false,
      createdAt: ts(1),
    },
  ],
};

// ---------------------------------------------------------------------------
// Drift Events
// ---------------------------------------------------------------------------

export const DEMO_DRIFT_EVENTS: Record<string, DriftEvent[]> = {
  [SOURCE_IDS.stripe]: [
    {
      id: 'evt_s1',
      sourceId: SOURCE_IDS.stripe,
      scanId: SCAN_IDS.stripe[2],
      eventType: 'column_added',
      details: { column: 'destination_type', inferredType: 'categorical', cardinality: 3 },
      severity: 'medium',
      createdAt: ts(45),
    },
    {
      id: 'evt_s2',
      sourceId: SOURCE_IDS.stripe,
      scanId: SCAN_IDS.stripe[2],
      eventType: 'distribution_shift',
      details: { column: 'amount', metric: 'mean', oldValue: 3842.17, newValue: 4210.55, changePercent: 9.6 },
      severity: 'low',
      createdAt: ts(45),
    },
    {
      id: 'evt_s3',
      sourceId: SOURCE_IDS.stripe,
      scanId: SCAN_IDS.stripe[3],
      eventType: 'column_renamed',
      details: { oldName: 'bank_account', newName: 'destination_account', confidence: 0.89 },
      severity: 'high',
      createdAt: ts(20),
    },
    {
      id: 'evt_s4',
      sourceId: SOURCE_IDS.stripe,
      scanId: SCAN_IDS.stripe[3],
      eventType: 'anomaly_detected',
      details: { column: 'destination_account', type: 'null_rate_spike', oldValue: 0.02, newValue: 0.05 },
      severity: 'medium',
      createdAt: ts(20),
    },
    {
      id: 'evt_s5',
      sourceId: SOURCE_IDS.stripe,
      scanId: SCAN_IDS.stripe[4],
      eventType: 'type_changed',
      details: { column: 'amount', oldType: 'currency', newType: 'float' },
      severity: 'high',
      createdAt: ts(2),
    },
    {
      id: 'evt_s6',
      sourceId: SOURCE_IDS.stripe,
      scanId: SCAN_IDS.stripe[4],
      eventType: 'distribution_shift',
      details: { column: 'fee', metric: 'mean', oldValue: 11.53, newValue: 14.82, changePercent: 28.5 },
      severity: 'medium',
      createdAt: ts(2),
    },
  ],

  [SOURCE_IDS.crm]: [
    {
      id: 'evt_c1',
      sourceId: SOURCE_IDS.crm,
      scanId: SCAN_IDS.crm[1],
      eventType: 'distribution_shift',
      details: { column: 'phone', metric: 'null_rate', oldValue: 0.18, newValue: 0.22, changePercent: 22.2 },
      severity: 'medium',
      createdAt: ts(50),
    },
    {
      id: 'evt_c2',
      sourceId: SOURCE_IDS.crm,
      scanId: SCAN_IDS.crm[2],
      eventType: 'column_added',
      details: { column: 'lead_score', inferredType: 'integer', nullRate: 0.30 },
      severity: 'medium',
      createdAt: ts(18),
    },
    {
      id: 'evt_c3',
      sourceId: SOURCE_IDS.crm,
      scanId: SCAN_IDS.crm[2],
      eventType: 'anomaly_detected',
      details: { column: 'phone', type: 'null_rate_spike', oldValue: 0.22, newValue: 0.25, trend: 'increasing' },
      severity: 'high',
      createdAt: ts(18),
    },
    {
      id: 'evt_c4',
      sourceId: SOURCE_IDS.crm,
      scanId: SCAN_IDS.crm[3],
      eventType: 'type_changed',
      details: { column: 'email', oldType: 'email', newType: 'free_text', reason: 'malformed_addresses' },
      severity: 'high',
      createdAt: ts(5),
    },
    {
      id: 'evt_c5',
      sourceId: SOURCE_IDS.crm,
      scanId: SCAN_IDS.crm[3],
      eventType: 'anomaly_detected',
      details: { column: 'phone', type: 'null_rate_spike', oldValue: 0.25, newValue: 0.28, trend: 'increasing' },
      severity: 'high',
      createdAt: ts(5),
    },
  ],

  [SOURCE_IDS.inventory]: [
    {
      id: 'evt_i1',
      sourceId: SOURCE_IDS.inventory,
      scanId: SCAN_IDS.inventory[1],
      eventType: 'anomaly_detected',
      details: { column: 'quantity', type: 'value_range', description: 'Negative values detected', min: -5 },
      severity: 'medium',
      createdAt: ts(20),
    },
    {
      id: 'evt_i2',
      sourceId: SOURCE_IDS.inventory,
      scanId: SCAN_IDS.inventory[2],
      eventType: 'distribution_shift',
      details: { column: 'quantity', metric: 'min', oldValue: -5, newValue: -12, changePercent: 140 },
      severity: 'high',
      createdAt: ts(1),
    },
    {
      id: 'evt_i3',
      sourceId: SOURCE_IDS.inventory,
      scanId: SCAN_IDS.inventory[2],
      eventType: 'distribution_shift',
      details: { column: 'last_updated', metric: 'null_rate', oldValue: 0.01, newValue: 0.03, changePercent: 200 },
      severity: 'low',
      createdAt: ts(1),
    },
  ],
};

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export const DEMO_RECIPES: Record<string, Recipe[]> = {
  [SOURCE_IDS.stripe]: [
    {
      id: 'rcp_stripe_parse_dates',
      sourceId: SOURCE_IDS.stripe,
      name: 'Parse ISO dates',
      description: 'Normalize created_at to YYYY-MM-DD format for downstream systems',
      operations: [
        { type: 'parse_date', column: 'created_at', params: { format: 'YYYY-MM-DD' } },
      ],
      isActive: true,
      executionOrder: 1,
      createdAt: ts(80),
      updatedAt: ts(80),
    },
    {
      id: 'rcp_stripe_fill_bank',
      sourceId: SOURCE_IDS.stripe,
      name: 'Fill missing bank accounts',
      description: 'Replace null bank_account/destination_account with "UNKNOWN"',
      operations: [
        { type: 'fill_null', column: 'bank_account', params: { value: 'UNKNOWN' } },
      ],
      isActive: true,
      executionOrder: 2,
      createdAt: ts(60),
      updatedAt: ts(20),
    },
  ],

  [SOURCE_IDS.crm]: [
    {
      id: 'rcp_crm_strip_email',
      sourceId: SOURCE_IDS.crm,
      name: 'Strip whitespace from emails',
      description: 'Remove leading/trailing whitespace and normalize case for email column',
      operations: [
        { type: 'strip_whitespace', column: 'email', params: {} },
        { type: 'standardize_case', column: 'email', params: { case: 'lower' } },
      ],
      isActive: true,
      executionOrder: 1,
      createdAt: ts(70),
      updatedAt: ts(70),
    },
    {
      id: 'rcp_crm_dedup',
      sourceId: SOURCE_IDS.crm,
      name: 'Deduplicate by email',
      description: 'Remove duplicate rows based on email address, keeping latest updated_at',
      operations: [
        { type: 'deduplicate', column: 'email', params: { keepStrategy: 'last', orderBy: 'updated_at' } },
      ],
      isActive: true,
      executionOrder: 2,
      createdAt: ts(65),
      updatedAt: ts(65),
    },
    {
      id: 'rcp_crm_phone_format',
      sourceId: SOURCE_IDS.crm,
      name: 'Standardize phone numbers',
      description: 'Extract and normalize phone numbers to E.164 format',
      operations: [
        { type: 'extract_pattern', column: 'phone', params: { pattern: '[\\d\\+\\-\\s\\(\\)]+', output: 'phone_clean' } },
      ],
      isActive: false,
      executionOrder: 3,
      createdAt: ts(55),
      updatedAt: ts(55),
    },
  ],

  [SOURCE_IDS.inventory]: [
    {
      id: 'rcp_inv_parse_dates',
      sourceId: SOURCE_IDS.inventory,
      name: 'Parse warehouse timestamps',
      description: 'Normalize last_updated to consistent ISO-8601 format',
      operations: [
        { type: 'parse_date', column: 'last_updated', params: { format: 'ISO-8601' } },
      ],
      isActive: true,
      executionOrder: 1,
      createdAt: ts(40),
      updatedAt: ts(40),
    },
    {
      id: 'rcp_inv_zero_clamp',
      sourceId: SOURCE_IDS.inventory,
      name: 'Clamp negative quantities',
      description: 'Replace negative quantity values with 0 to prevent downstream errors',
      operations: [
        { type: 'custom_transform', column: 'quantity', params: { expression: 'max(value, 0)', description: 'Clamp to zero' } },
      ],
      isActive: false,
      executionOrder: 2,
      createdAt: ts(15),
      updatedAt: ts(15),
    },
  ],
};
