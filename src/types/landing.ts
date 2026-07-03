export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  content: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  organization: string;
  verdictScore: number;
}

export interface Interrogator {
  id: string;
  name: string;
  initial: string;
  color: string;
  domain: string;
  quote: string;
  vector: string;
  impactRate: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: "SUBSCRIBER_JOIN" | "FEEDBACK_RECEIVED" | "MAILCHIMP_API_CALL" | "SYSTEM_LOG";
  status: "SUCCESS" | "WARNING" | "CRITICAL";
  message: string;
  payload?: any;
}
