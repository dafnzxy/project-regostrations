export type FieldType =
  | "text"
  | "textarea"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "number"
  | "date";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for dropdown, radio, checkbox
}

export type EventStatus = "DRAFT" | "OPEN" | "CLOSED" | "COMPLETED";
export type RsvpMode = "MANUAL" | "AUTO";
export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHECKED_IN";

export interface EventWithCounts {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date | null;
  registrationDeadline: Date | null;
  quota: number;
  status: string;
  posterUrl: string | null;
  formSchema: string;
  rsvpMode: string;
  autoSendConfirmed: boolean;
  emailSubject: string | null;
  emailBody: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    registrations: number;
    prizes: number;
  };
}
