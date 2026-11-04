export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  role: "admin" | "pilot";
  approved: boolean;
  created_at: string;
};

export type Aircraft = {
  id: number;
  registration: string;
  type: string;
  hours_override: number | null;
};

export type Reservation = {
  id: string;
  aircraft_id: number;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  pilot_name: string;
  purpose: string | null;
  note: string | null;
};

export type Flight = {
  id: string;
  aircraft_id: number;
  user_id: string;
  date: string;
  pilot: string;
  dep: string | null;
  dest: string | null;
  dep_time: string | null;
  arr_time: string | null;
  duration: number;
  landings: number;
  hobbs: number | null;
  note: string | null;
};

export type Severity = "gering" | "mittel" | "kritisch";
export type DefectStatus = "offen" | "bearbeitung" | "behoben";

export type Defect = {
  id: string;
  aircraft_id: number;
  user_id: string;
  date: string;
  description: string;
  severity: Severity;
  status: DefectStatus;
  reported_by: string | null;
  resolved_date: string | null;
};

export type Part = {
  id: string;
  aircraft_id: number;
  name: string;
  interval_type: "stunden" | "kalender";
  interval_value: number;
  last_value: string;
  note: string | null;
};

export type PartHistory = {
  id: string;
  part_id: string;
  done_date: string;
  done_hours: number | null;
  note: string | null;
  done_by: string | null;
  created_at: string;
};

export type PartStatus = {
  dueLabel: string;
  remainingLabel: string;
  percent: number;
  status: "ok" | "warn" | "overdue";
};
