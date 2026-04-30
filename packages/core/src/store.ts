import type { Dashboard } from "./schema/dashboard";
import type { DataRecord } from "./schema/data_record";
import type { DataSource } from "./schema/data_source";
import type { Panel } from "./schema/panel";

export type DashboardInput = Omit<Dashboard, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type PanelInput = Omit<Panel, "created_at" | "updated_at"> & { id?: string };
export type DataSourceInput = Omit<DataSource, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
export type DataRecordInput = Omit<DataRecord, "id" | "created_at"> & { id?: string };

export interface RecordQuery {
  dataSourceId: string;
  since?: string;
  until?: string;
  filter?: Record<string, unknown>;
  limit?: number;
  orderBy?: "recorded_at_asc" | "recorded_at_desc";
}

export interface TilerStore {
  // dashboards
  listDashboards(): Promise<Dashboard[]>;
  getDashboard(slug: string): Promise<Dashboard | null>;
  upsertDashboard(input: DashboardInput): Promise<Dashboard>;
  deleteDashboard(id: string): Promise<void>;

  // panels
  listPanels(dashboardId: string): Promise<Panel[]>;
  upsertPanel(input: PanelInput): Promise<Panel>;
  deletePanel(id: string): Promise<void>;

  // data sources
  listDataSources(): Promise<DataSource[]>;
  getDataSource(slug: string): Promise<DataSource | null>;
  getDataSourceByToken(token: string): Promise<DataSource | null>;
  upsertDataSource(input: DataSourceInput): Promise<DataSource>;
  deleteDataSource(id: string): Promise<void>;

  // records
  insertRecord(input: DataRecordInput): Promise<DataRecord>;
  insertRecordsBatch(inputs: DataRecordInput[]): Promise<number>;
  queryRecords(opts: RecordQuery): Promise<DataRecord[]>;
  pruneRecords(opts: { olderThan: string }): Promise<number>;

  // lifecycle
  migrate(): Promise<void>;
  close(): Promise<void>;
}
