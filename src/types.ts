export interface PluginItem {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  owner_avatar_url: string;
  url: string;
  homepage: string | null;
  description: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  language: string | null;
  license: string | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface SnapshotMeta {
  schema_version: number;
  topic: string;
  source: string;
  topic_url: string;
  query: string;
  fetched_at: string;
  total_count: number;
  complete: boolean;
}

export interface Snapshot {
  meta: SnapshotMeta;
  items: PluginItem[];
}
