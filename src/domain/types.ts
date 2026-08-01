export type Availability = "available" | "low" | "sold_out" | "uncertain";
export type QueueLevel = "low" | "medium" | "high" | "unknown";
export type StationStatus = "green" | "orange" | "red" | "grey";
export type DietTag =
  | "vegan"
  | "vegetarian"
  | "gluten_free"
  | "halal"
  | "high_protein";
export type DietFilter = "all" | "vegan" | "vegetarian" | "gluten_free" | "halal";
export type IssueType =
  | "low_stock"
  | "sold_out"
  | "queue"
  | "closure"
  | "resolved"
  | "other";
export type Priority = "low" | "medium" | "high" | "urgent";

export type Dish = {
  id: string;
  name: string;
  allergens: string[] | null;
  dietTags: DietTag[];
  visible: string[];
  image: string;
};

export type StationDish = {
  dishId: string;
  availability: Availability;
};

export type Station = {
  id: string;
  name: string;
  location: string;
  status: StationStatus;
  queueLevel: QueueLevel;
  dishes: StationDish[];
  lastUpdatedAt: string;
};

export type Alert = {
  id: string;
  stationId: string;
  dishId: string | null;
  issueType: IssueType;
  priority: Priority;
  message: string;
  recommendedAction: string;
  createdAt: string;
  active: boolean;
};

export type ReplenishmentTask = {
  id: string;
  stationId: string;
  dishId: string | null;
  title: string;
  priority: Priority;
  status: "open" | "completed";
  createdAt: string;
  completedAt: string | null;
};

export type Incentive = {
  active: boolean;
  text: string;
  appliesToStationId: string;
  authorizedBy: "event_organiser";
  expiresAt: string;
};

export type FeedbackExtraction = {
  dishId: string;
  leftoverAmount: "none" | "some" | "most" | "unknown";
  reason:
    | "portion_too_large"
    | "not_tasty"
    | "dietary_mismatch"
    | "other"
    | "unknown";
  reportedFacts: string[];
  aiInferences: string[];
  confidence: number;
};

export type FeedbackRecord = FeedbackExtraction & {
  id: string;
  transcript: string;
  createdAt: string;
};

export type Extraction = {
  stationId: string;
  stationName: string;
  dishId: string;
  dishName: string;
  availability: Availability;
  queueLevel: QueueLevel;
  reportedGuestCount: number | null;
  issueType: IssueType;
  priority: Priority;
  reportedFacts: readonly string[];
  aiInferences: readonly string[];
  recommendedAction: string;
  recommendedAlternativeStationId: string | null;
  guestAnnouncement: string;
  confidence: number;
};

export type BonaFlowState = {
  event: {
    id: string;
    name: string;
    venue: string;
    lunchWindow: string;
    dataDate: string;
  };
  dishes: Dish[];
  stations: Station[];
  alerts: Alert[];
  tasks: ReplenishmentTask[];
  incentive: Incentive;
  staffUpdateCount: number;
  recommendations: Record<DietFilter, string | null>;
  feedback: FeedbackRecord[];
};
