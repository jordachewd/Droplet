"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import {
  AboutContentSettingsFormValue,
  FaqContentSettingsFormValue,
  HeroContentSettingsFormValue,
  HomepageCopySettingsFormValue,
  HomepageFeaturedPersonasSettingsFormValue,
  LandingContentSettingsFormValue,
} from "@/components/admin/settings/types";
import { PersonaId } from "@/types/PersonaData.d";

type HomepagePersonaOption = {
  id: PersonaId;
  label: string;
};

interface AdminWebsiteContentSectionProps {
  faqContentValue: FaqContentSettingsFormValue;
  heroContentValue: HeroContentSettingsFormValue;
  homepageCopyValue: HomepageCopySettingsFormValue;
  homepageFeaturedPersonasValue: HomepageFeaturedPersonasSettingsFormValue;
  homepagePersonaOptions: HomepagePersonaOption[];
  landingContentValue: LandingContentSettingsFormValue;
  aboutContentValue: AboutContentSettingsFormValue;
}

export function AdminWebsiteContentSection({
  faqContentValue,
  heroContentValue,
  homepageCopyValue,
  homepageFeaturedPersonasValue,
  homepagePersonaOptions,
  landingContentValue,
  aboutContentValue,
}: AdminWebsiteContentSectionProps) {
  const defaultFeaturedPersonaIds = homepagePersonaOptions
    .slice(0, 3)
    .map((persona) => persona.id);
  const featuredPersonaFieldValues = [0, 1, 2].map(
    (index) =>
      homepageFeaturedPersonasValue[index] ??
      defaultFeaturedPersonaIds[index] ??
      homepagePersonaOptions[0]?.id ??
      "strategist",
  );

  return (
    <div className="AdminWebsiteContentSection flex flex-col gap-6">
      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface flex flex-col gap-4"
      >
        <input type="hidden" name="key" value="admin.faqContent" />
        <input type="hidden" name="category" value="features" />

        <h2 className="heading-6">FAQ Content</h2>
        <p className="text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Update question and answer copy used on plans pages.
        </p>

        <div className="grid grid-cols-1 gap-4">
          {faqContentValue.map((faqEntry) => (
            <div
              key={faqEntry.id}
              className="rounded-2xl border border-slate-300 bg-lavenderHaze-100/60 p-4 dark:border-slate-500 dark:bg-nightIndigo-1000/50"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
                FAQ #{faqEntry.id + 1}
              </p>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Question</span>
                <input
                  type="text"
                  name={`faqQuestion_${faqEntry.id}`}
                  defaultValue={faqEntry.question}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Answer</span>
                <textarea
                  name={`faqAnswer_${faqEntry.id}`}
                  defaultValue={faqEntry.answer}
                  required
                  aria-required="true"
                  rows={4}
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <AdminFormSubmitButton
            label="Save FAQ Content"
            pendingLabel="Saving FAQ content..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface flex flex-col gap-4"
      >
        <input type="hidden" name="key" value="admin.homepageCopy" />
        <input type="hidden" name="category" value="features" />

        <h2 className="heading-6">Homepage CTA and Spotlight Copy</h2>
        <p className="text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Configure CTA banner and persona spotlight text shown on the homepage.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">CTA Heading</span>
          <textarea
            name="homepageCtaHeading"
            defaultValue={homepageCopyValue.ctaHeading}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">CTA Description</span>
          <textarea
            name="homepageCtaDescription"
            defaultValue={homepageCopyValue.ctaDescription}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Primary CTA Label</span>
          <input
            type="text"
            name="homepageCtaPrimaryLabel"
            defaultValue={homepageCopyValue.ctaPrimaryLabel}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Secondary CTA Label</span>
          <input
            type="text"
            name="homepageCtaSecondaryLabel"
            defaultValue={homepageCopyValue.ctaSecondaryLabel}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Spotlight Eyebrow</span>
          <input
            type="text"
            name="homepageSpotlightLabel"
            defaultValue={homepageCopyValue.spotlightLabel}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Spotlight Heading</span>
          <input
            type="text"
            name="homepageSpotlightHeading"
            defaultValue={homepageCopyValue.spotlightHeading}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Spotlight Description</span>
          <textarea
            name="homepageSpotlightDescription"
            defaultValue={homepageCopyValue.spotlightDescription}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <div className="flex justify-end">
          <AdminFormSubmitButton
            label="Save Homepage CTA and Spotlight Copy"
            pendingLabel="Saving homepage copy..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface flex flex-col gap-4"
      >
        <input
          type="hidden"
          name="key"
          value="admin.homepageFeaturedPersonas"
        />
        <input type="hidden" name="category" value="features" />

        <h2 className="heading-6">Homepage Featured Personas</h2>
        <p className="text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Select and order the three persona cards highlighted on the homepage.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {featuredPersonaFieldValues.map((selectedPersonaId, index) => (
            <label
              key={`homepage-featured-persona-${index}`}
              className="flex flex-col gap-1 text-sm"
            >
              <span className="font-medium">Featured Persona #{index + 1}</span>
              <select
                name="homepageFeaturedPersonaIds"
                defaultValue={selectedPersonaId}
                required
                aria-required="true"
                className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
              >
                {homepagePersonaOptions.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <AdminFormSubmitButton
            label="Save Homepage Featured Personas"
            pendingLabel="Saving featured personas..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface flex flex-col gap-4"
      >
        <input type="hidden" name="key" value="admin.heroContent" />
        <input type="hidden" name="category" value="features" />

        <h2 className="heading-6">Hero Copy</h2>
        <p className="text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Configure homepage hero heading, subtitle, CTA label, and image alt
          text.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Heading</span>
          <textarea
            name="heroHeading"
            defaultValue={heroContentValue.heading}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Subtitle</span>
          <textarea
            name="heroSubheading"
            defaultValue={heroContentValue.subheading}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">CTA Label</span>
          <input
            type="text"
            name="heroCtaLabel"
            defaultValue={heroContentValue.ctaLabel}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Hero Image Alt Text</span>
          <input
            type="text"
            name="heroImageAlt"
            defaultValue={heroContentValue.imageAlt}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <div className="flex justify-end">
          <AdminFormSubmitButton
            label="Save Hero Copy"
            pendingLabel="Saving hero copy..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface flex flex-col gap-4"
      >
        <input type="hidden" name="key" value="admin.landingContent" />
        <input type="hidden" name="category" value="features" />

        <h2 className="heading-6">Landing Content</h2>
        <p className="text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Configure feature cards and how-it-works copy on the homepage.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <h3 className="heading-6 text-base">Feature Cards</h3>
          {landingContentValue.featureCards.map((featureCard, index) => (
            <div
              key={`feature-${index}`}
              className="rounded-2xl border border-slate-300 bg-lavenderHaze-100/60 p-4 dark:border-slate-500 dark:bg-nightIndigo-1000/50"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
                Card #{index + 1}
              </p>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Icon Class</span>
                <input
                  type="text"
                  name={`featureIcon_${index}`}
                  defaultValue={featureCard.icon}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Title</span>
                <input
                  type="text"
                  name={`featureTitle_${index}`}
                  defaultValue={featureCard.title}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Description</span>
                <textarea
                  name={`featureDescription_${index}`}
                  defaultValue={featureCard.description}
                  rows={3}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
            </div>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">How It Works Eyebrow</span>
          <input
            type="text"
            name="workflowEyebrow"
            defaultValue={landingContentValue.workflow.eyebrow}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">How It Works Title</span>
          <input
            type="text"
            name="workflowTitle"
            defaultValue={landingContentValue.workflow.title}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">How It Works Description</span>
          <textarea
            name="workflowDescription"
            defaultValue={landingContentValue.workflow.description}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <div className="grid grid-cols-1 gap-4">
          <h3 className="heading-6 text-base">How It Works Steps</h3>
          {landingContentValue.howItWorksSteps.map((step, index) => (
            <div
              key={`how-step-${index}`}
              className="rounded-2xl border border-slate-300 bg-lavenderHaze-100/60 p-4 dark:border-slate-500 dark:bg-nightIndigo-1000/50"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
                Step #{index + 1}
              </p>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Step Number</span>
                <input
                  type="text"
                  name={`howStep_${index}`}
                  defaultValue={step.step}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Title</span>
                <input
                  type="text"
                  name={`howTitle_${index}`}
                  defaultValue={step.title}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Description</span>
                <textarea
                  name={`howDescription_${index}`}
                  defaultValue={step.description}
                  rows={3}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
            </div>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Conversation Rhythm Eyebrow</span>
          <input
            type="text"
            name="workflowRhythmEyebrow"
            defaultValue={landingContentValue.workflow.rhythmEyebrow}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <div className="grid grid-cols-1 gap-4">
          <h3 className="heading-6 text-base">Conversation Rhythm Cards</h3>
          {landingContentValue.workflow.rhythmCards.map((card, index) => (
            <div
              key={`rhythm-card-${index}`}
              className="rounded-2xl border border-slate-300 bg-lavenderHaze-100/60 p-4 dark:border-slate-500 dark:bg-nightIndigo-1000/50"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
                Rhythm Card #{index + 1}
              </p>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Label</span>
                <input
                  type="text"
                  name={`rhythmLabel_${index}`}
                  defaultValue={card.label}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Message</span>
                <textarea
                  name={`rhythmDetail_${index}`}
                  defaultValue={card.detail}
                  rows={3}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <AdminFormSubmitButton
            label="Save Landing Content"
            pendingLabel="Saving landing content..."
          />
        </div>
      </AdminManagedForm>

      <AdminManagedForm
        action={updateAdminSettingAction}
        className="admin-surface flex flex-col gap-4"
      >
        <input type="hidden" name="key" value="admin.aboutContent" />
        <input type="hidden" name="category" value="features" />

        <h2 className="heading-6">About Page Copy</h2>
        <p className="text-sm text-midnightBlue-600 dark:text-lavenderHaze-600">
          Configure About page heading, section copy, and footer call-to-action
          text.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Page Title</span>
          <input
            type="text"
            name="aboutPageTitle"
            defaultValue={aboutContentValue.pageTitle}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Page Subtitle</span>
          <textarea
            name="aboutPageSubtitle"
            defaultValue={aboutContentValue.pageSubtitle}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <div className="grid grid-cols-1 gap-4">
          <h3 className="heading-6 text-base">About Sections</h3>
          {aboutContentValue.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-slate-300 bg-lavenderHaze-100/60 p-4 dark:border-slate-500 dark:bg-nightIndigo-1000/50"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-midnightBlue-700 dark:text-lavenderHaze-700">
                {section.id}
              </p>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Eyebrow</span>
                <input
                  type="text"
                  name={`aboutEyebrow_${section.id}`}
                  defaultValue={section.eyebrow}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Title</span>
                <input
                  type="text"
                  name={`aboutTitle_${section.id}`}
                  defaultValue={section.title}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="mb-3 flex flex-col gap-1 text-sm">
                <span className="font-medium">Paragraph 1</span>
                <textarea
                  name={`aboutParagraph1_${section.id}`}
                  defaultValue={section.paragraphs[0] ?? ""}
                  rows={3}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Paragraph 2</span>
                <textarea
                  name={`aboutParagraph2_${section.id}`}
                  defaultValue={section.paragraphs[1] ?? ""}
                  rows={3}
                  required
                  aria-required="true"
                  className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
                />
              </label>
            </div>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Bottom CTA Title</span>
          <input
            type="text"
            name="aboutCtaTitle"
            defaultValue={aboutContentValue.ctaTitle}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Bottom CTA Description</span>
          <textarea
            name="aboutCtaDescription"
            defaultValue={aboutContentValue.ctaDescription}
            rows={3}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Primary CTA Label</span>
          <input
            type="text"
            name="aboutCtaPrimaryLabel"
            defaultValue={aboutContentValue.ctaPrimaryLabel}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Secondary CTA Label</span>
          <input
            type="text"
            name="aboutCtaSecondaryLabel"
            defaultValue={aboutContentValue.ctaSecondaryLabel}
            required
            aria-required="true"
            className="w-full rounded-lg border border-slate-400 bg-lavenderHaze-100 px-3 py-2 text-sm dark:border-slate-500 dark:bg-nightIndigo-1000"
          />
        </label>

        <div className="flex justify-end">
          <AdminFormSubmitButton
            label="Save About Copy"
            pendingLabel="Saving about copy..."
          />
        </div>
      </AdminManagedForm>
    </div>
  );
}
