import type { FormQuestionType } from "@/lib/types";

/**
 * Pre-made templates for the Forms page (Frantz, 2026-11-26): one
 * customer form and one visit-note template for each industry the
 * platform serves. Using one creates the business's own editable
 * copy; nothing here is shared or live until the owner picks it.
 * Questions use only the existing question types, kept short and in
 * plain words. The law form is the original ready-made law firm
 * form, unchanged.
 */
export interface TemplateQuestion {
  label: string;
  type: FormQuestionType;
  required: boolean;
  options?: string[];
}

export interface IndustryTemplates {
  category: string;
  industry: string;
  form: {
    name: string;
    description: string;
    line: string;
    questions: TemplateQuestion[];
  };
  note: {
    name: string;
    line: string;
    discussed: string;
    actions: string;
  };
}

export const INDUSTRY_TEMPLATES: IndustryTemplates[] = [
  {
    category: "law-offices",
    industry: "Law offices",
    form: {
      name: "Law firm client form",
      description: "Tell us about your case before your consultation.",
      line: "Case type, a description of the matter, the opposing party, and documents.",
      questions: [
        {
          label: "What type of case is this?",
          type: "multiple_choice",
          required: true,
          options: [
            "Family law",
            "Criminal defense",
            "Immigration",
            "Personal injury",
            "Business / contracts",
            "Real estate",
            "Other",
          ],
        },
        { label: "Please describe your matter", type: "long_text", required: true },
        {
          label: "Opposing party (the other side, used for our conflict check)",
          type: "short_text",
          required: false,
        },
        { label: "Documents (anything that helps us review your case)", type: "file", required: false },
      ],
    },
    note: {
      name: "Consultation notes",
      line: "Starter text for notes after a consultation.",
      discussed: "We reviewed the client's matter, the key facts, and the timeline.",
      actions: "The client decided how to proceed. Next steps and any deadlines were agreed.",
    },
  },
  {
    category: "doctors-clinics",
    industry: "Doctors and clinics",
    form: {
      name: "Patient visit form",
      description: "Tell us about your visit before you come in.",
      line: "Reason for the visit, new or returning patient, symptoms, and when they started.",
      questions: [
        { label: "What is the reason for your visit?", type: "long_text", required: true },
        {
          label: "Are you a new or returning patient?",
          type: "multiple_choice",
          required: true,
          options: ["New patient", "Returning patient"],
        },
        { label: "Any symptoms we should note?", type: "long_text", required: false },
        { label: "When did the symptoms start?", type: "date", required: false },
        { label: "Anything else we should know?", type: "long_text", required: false },
      ],
    },
    note: {
      name: "Visit notes",
      line: "Starter text for notes after a patient visit.",
      discussed: "We reviewed the reason for the visit, the symptoms, and the patient's history.",
      actions: "The patient agreed to the plan discussed. Follow up steps were explained.",
    },
  },
  {
    category: "dental-offices",
    industry: "Dental offices",
    form: {
      name: "Dental visit form",
      description: "Tell us about your teeth before your visit.",
      line: "Reason for the visit, when the last visit was, and any pain right now.",
      questions: [
        {
          label: "What is the reason for your visit?",
          type: "multiple_choice",
          required: true,
          options: ["Checkup and cleaning", "Tooth pain", "A broken tooth", "Whitening", "Something else"],
        },
        {
          label: "When was your last dental visit?",
          type: "multiple_choice",
          required: true,
          options: ["Less than 6 months ago", "6 to 12 months ago", "Over a year ago", "First visit"],
        },
        { label: "Any pain or sensitivity right now?", type: "long_text", required: false },
        { label: "Anything else we should know?", type: "long_text", required: false },
      ],
    },
    note: {
      name: "Dental visit notes",
      line: "Starter text for notes after a dental visit.",
      discussed: "We checked the patient's teeth and gums and talked through what we found.",
      actions: "The patient decided on the treatment discussed. The next visit was planned.",
    },
  },
  {
    category: "barbershops",
    industry: "Barbershops",
    form: {
      name: "Barber visit form",
      description: "Tell your barber what you want before you sit down.",
      line: "What they are getting done, anything the barber should know, and a photo of the style.",
      questions: [
        {
          label: "What are you getting done?",
          type: "multiple_choice",
          required: true,
          options: ["Haircut", "Cut and beard", "Beard trim", "Kids cut", "Something else"],
        },
        { label: "Anything your barber should know?", type: "long_text", required: false },
        { label: "Do you have a photo of the style you want?", type: "file", required: false },
      ],
    },
    note: {
      name: "Cut notes",
      line: "Starter text for notes after a haircut.",
      discussed: "We talked through the style the client wanted and what suits them.",
      actions: "The client was happy with the finish. The timing for the next cut was suggested.",
    },
  },
  {
    category: "hair-salons",
    industry: "Hair salons",
    form: {
      name: "Salon visit form",
      description: "Tell your stylist what you are hoping for.",
      line: "What they would like done, recent color history, and a photo of the look.",
      questions: [
        {
          label: "What would you like done?",
          type: "multiple_choice",
          required: true,
          options: ["Cut", "Color", "Cut and color", "Blowout", "Treatment", "Something else"],
        },
        { label: "Have you colored your hair in the last year?", type: "yes_no", required: false },
        { label: "Anything your stylist should know?", type: "long_text", required: false },
        { label: "Do you have a photo of the look you want?", type: "file", required: false },
      ],
    },
    note: {
      name: "Salon visit notes",
      line: "Starter text for notes after a salon visit.",
      discussed: "We talked through the look the client wants and the condition of their hair.",
      actions: "The client decided on the style and color discussed. Care tips were shared.",
    },
  },
  {
    category: "nail-salons-spas",
    industry: "Nail salons and spas",
    form: {
      name: "Nails and spa form",
      description: "Tell us what you would like before your appointment.",
      line: "What they are booking, allergies or sensitive skin, and anything else to know.",
      questions: [
        {
          label: "What are you booking?",
          type: "multiple_choice",
          required: true,
          options: ["Manicure", "Pedicure", "Manicure and pedicure", "Facial", "Massage", "Something else"],
        },
        { label: "Any allergies or sensitive skin we should know about?", type: "long_text", required: true },
        { label: "Anything else we should know?", type: "long_text", required: false },
      ],
    },
    note: {
      name: "Spa visit notes",
      line: "Starter text for notes after a nails or spa visit.",
      discussed: "We talked through what the client wanted and any sensitivities.",
      actions: "The client chose the treatment and finish discussed. Aftercare was explained.",
    },
  },
  {
    category: "pet-groomers",
    industry: "Pet groomers",
    form: {
      name: "Pet grooming form",
      description: "Tell us about your pet before their groom.",
      line: "What the pet needs, breed and size, anything to know, and vaccinations.",
      questions: [
        {
          label: "What does your pet need?",
          type: "multiple_choice",
          required: true,
          options: ["Bath and tidy", "Full groom", "Nail trim", "Deshedding", "Something else"],
        },
        { label: "Your pet's breed and size", type: "short_text", required: true },
        {
          label: "Anything about your pet we should know? (behavior, health, sensitivities)",
          type: "long_text",
          required: false,
        },
        { label: "Is your pet up to date on vaccinations?", type: "yes_no", required: false },
      ],
    },
    note: {
      name: "Groom notes",
      line: "Starter text for notes after a groom.",
      discussed: "We talked through the groom the pet needed and how the pet did today.",
      actions: "The owner was happy with the groom. The timing for the next groom was suggested.",
    },
  },
  {
    category: "auto-repair",
    industry: "Auto repair",
    form: {
      name: "Auto repair form",
      description: "Tell us about your car before you come in.",
      line: "What the car is doing, the car's details, when it started, and if it is safe to drive.",
      questions: [
        { label: "What is the car doing, or what do you need?", type: "long_text", required: true },
        { label: "Car year, make, and model", type: "short_text", required: true },
        { label: "When did it start?", type: "date", required: false },
        { label: "Is the car safe to drive right now?", type: "yes_no", required: false },
        { label: "Anything else we should know?", type: "long_text", required: false },
      ],
    },
    note: {
      name: "Repair notes",
      line: "Starter text for notes after a repair visit.",
      discussed: "We talked through what we found and the work the car needs.",
      actions: "The customer decided which repairs to go ahead with. Costs and timing were explained.",
    },
  },
];
