"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import Image from "next/image";
import { ONBOARDING_STEPS, recommendPersona } from "@/constants/onboarding";
import { completeOnboarding } from "@/lib/actions/onboarding.actions";
import type { Persona, PersonaId } from "@/types/PersonaData.d";
import type {
  UserIntent,
  UserChallenge,
  UserExpectation,
  UserCommunicationStyle,
} from "@/types/UserData.d";

interface OnboardingWizardProps {
  personas: Persona[];
  allowedPersonaIds?: PersonaId[];
  trialPersonaIds?: PersonaId[];
}

interface OnboardingAnswers {
  intent: UserIntent | null;
  challenge: UserChallenge | null;
  expectation: UserExpectation | null;
  communicationStyle: UserCommunicationStyle | null;
}

const TOTAL_QUIZ_STEPS = ONBOARDING_STEPS.length;
const PERSONA_STEP = TOTAL_QUIZ_STEPS;
const CONFIRMATION_STEP = TOTAL_QUIZ_STEPS + 1;
const TOTAL_STEPS = CONFIRMATION_STEP + 1;

export default function OnboardingWizard({
  personas,
  allowedPersonaIds,
  trialPersonaIds = [],
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    intent: null,
    challenge: null,
    expectation: null,
    communicationStyle: null,
  });
  const [selectedPersonaId, setSelectedPersonaId] = useState<PersonaId | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedSet = useMemo(
    () => new Set(allowedPersonaIds ?? []),
    [allowedPersonaIds],
  );
  const trialSet = useMemo(() => new Set(trialPersonaIds), [trialPersonaIds]);

  const recommendedPersonaId = useMemo(() => {
    if (answers.intent && answers.challenge) {
      return recommendPersona(answers.intent, answers.challenge);
    }
    return null;
  }, [answers.intent, answers.challenge]);

  const handleQuizAnswer = useCallback((stepId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [stepId]: value }));
    setTimeout(() => setCurrentStep((s) => s + 1), 300);
  }, []);

  const handlePersonaSelect = useCallback((personaId: PersonaId) => {
    setSelectedPersonaId(personaId);
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const handlePersonaContinue = useCallback(() => {
    if (selectedPersonaId) {
      setCurrentStep(CONFIRMATION_STEP);
    }
  }, [selectedPersonaId]);

  const handleComplete = useCallback(async () => {
    if (
      !answers.intent ||
      !answers.challenge ||
      !answers.expectation ||
      !answers.communicationStyle ||
      !selectedPersonaId
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await completeOnboarding({
        intent: answers.intent,
        challenge: answers.challenge,
        expectation: answers.expectation,
        communicationStyle: answers.communicationStyle,
        defaultPersonaId: selectedPersonaId,
      });

      if (result?.success) {
        router.push(`/app?persona=${selectedPersonaId}`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, selectedPersonaId, router]);

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId),
    [personas, selectedPersonaId],
  );

  const progressPercent = Math.round(((currentStep + 1) / TOTAL_STEPS) * 100);

  return (
    <section className="OnboardingWizard mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs opacity-60">
          <span>
            Step {currentStep + 1} of {TOTAL_STEPS}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-lavenderHaze-200/30 dark:bg-nightIndigo-800/50">
          <div
            className="h-full rounded-full bg-limeAccent-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quiz steps */}
      {currentStep < TOTAL_QUIZ_STEPS && (
        <QuizStep
          step={ONBOARDING_STEPS[currentStep]}
          selectedValue={
            answers[ONBOARDING_STEPS[currentStep].id as keyof OnboardingAnswers]
          }
          onSelect={(value) =>
            handleQuizAnswer(ONBOARDING_STEPS[currentStep].id, value)
          }
          onBack={currentStep > 0 ? handleBack : undefined}
        />
      )}

      {/* Persona selection step */}
      {currentStep === PERSONA_STEP && (
        <PersonaStep
          personas={personas}
          selectedPersonaId={selectedPersonaId}
          recommendedPersonaId={recommendedPersonaId}
          allowedSet={allowedSet}
          trialSet={trialSet}
          onSelect={handlePersonaSelect}
          onContinue={handlePersonaContinue}
          onBack={handleBack}
        />
      )}

      {/* Confirmation step */}
      {currentStep === CONFIRMATION_STEP && (
        <ConfirmationStep
          answers={answers}
          selectedPersona={selectedPersona ?? null}
          isSubmitting={isSubmitting}
          error={error}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      )}
    </section>
  );
}

/* ─── Quiz Step ─── */

interface QuizStepProps {
  step: (typeof ONBOARDING_STEPS)[number];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  onBack?: () => void;
}

function QuizStep({ step, selectedValue, onSelect, onBack }: QuizStepProps) {
  return (
    <div className="OnboardingQuizStep flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h2 className="heading-3 text-2xl font-bold">{step.title}</h2>
        <p className="text-sm opacity-60">{step.subtitle}</p>
      </div>

      <div
        className="flex flex-col gap-3"
        role="radiogroup"
        aria-label={step.title}
      >
        {step.options.map((option) => {
          const isSelected = selectedValue === option.value;
          const optionClass = classNames(
            "group flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-all duration-200",
            isSelected
              ? "border-limeAccent-500 bg-limeAccent-500/10"
              : "border-transparent bg-lavenderHaze-100/50 hover:border-lavenderHaze-300 dark:bg-nightIndigo-900/50 dark:hover:border-nightIndigo-600",
          );

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={optionClass}
              onClick={() => onSelect(option.value)}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="text-sm opacity-60">{option.description}</span>
            </button>
          );
        })}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm opacity-60 transition-opacity hover:opacity-100"
        >
          <i className="bi bi-arrow-left mr-2" aria-hidden="true" />
          Back
        </button>
      )}
    </div>
  );
}

/* ─── Persona Step ─── */

interface PersonaStepProps {
  personas: Persona[];
  selectedPersonaId: PersonaId | null;
  recommendedPersonaId: PersonaId | null;
  allowedSet: Set<PersonaId>;
  trialSet: Set<PersonaId>;
  onSelect: (personaId: PersonaId) => void;
  onContinue: () => void;
  onBack: () => void;
}

function PersonaStep({
  personas,
  selectedPersonaId,
  recommendedPersonaId,
  allowedSet,
  trialSet,
  onSelect,
  onContinue,
  onBack,
}: PersonaStepProps) {
  return (
    <div className="OnboardingPersonaStep flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h2 className="heading-3 text-2xl font-bold">
          Meet your Droplet partner.
        </h2>
        <p className="text-sm opacity-60">
          Pick the one that fits your work best. You can always pick a different
          persona when starting a new conversation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => {
          const isSelected = selectedPersonaId === persona.id;
          const isRecommended = recommendedPersonaId === persona.id;
          const isAllowed = allowedSet.has(persona.id);
          const isTrial = trialSet.has(persona.id);

          const cardClass = classNames(
            "OnboardingPersonaCard relative flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-4 transition-all duration-200",
            isSelected
              ? "border-limeAccent-500 bg-limeAccent-500/10 shadow-lg"
              : "border-transparent bg-lavenderHaze-100/50 hover:border-lavenderHaze-300 dark:bg-nightIndigo-900/50 dark:hover:border-nightIndigo-600",
          );

          return (
            <button
              key={persona.id}
              type="button"
              className={cardClass}
              data-allowed={isAllowed}
              onClick={() => onSelect(persona.id)}
              aria-pressed={isSelected}
              aria-label={`Select ${persona.label} persona`}
            >
              {isRecommended && (
                <span className="absolute -top-2 right-3 rounded-full bg-limeAccent-500 px-2.5 py-0.5 text-xxs font-bold text-nightIndigo-950">
                  Recommended
                </span>
              )}

              {isTrial && (
                <span className="absolute -top-2 left-3 rounded-full bg-dustyBlue-500 px-2.5 py-0.5 text-xxs font-bold text-white">
                  Trial
                </span>
              )}

              <div className="flex items-center gap-3">
                {persona.heroImage && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={persona.heroImage}
                      alt={persona.label}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                )}
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-bold">{persona.label}</span>
                  <span className="text-xxs opacity-50">
                    {persona.category}
                  </span>
                </div>
              </div>

              <p className="text-left text-sm opacity-70">{persona.tagline}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm opacity-60 transition-opacity hover:opacity-100"
        >
          <i className="bi bi-arrow-left mr-2" aria-hidden="true" />
          Back
        </button>

        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedPersonaId}
          className={classNames(
            "btn btn-contained rounded-full px-6 py-2 text-sm font-semibold transition-all",
            selectedPersonaId ? "opacity-100" : "cursor-not-allowed opacity-40",
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* ─── Confirmation Step ─── */

const ANSWER_LABELS: Record<string, string> = {
  productivity: "Get work done faster",
  learning: "Learn and understand better",
  creative: "Creative projects",
  technical: "Code and technical work",
  career: "Career guidance",
  decisions: "Making decisions",
  content: "Writing and producing content",
  software: "Building software",
  wellness: "Focus and stress management",
  direct: "Straight answers",
  guided: "Step-by-step guidance",
  challenger: "Challenge my thinking",
  explorer: "Brainstorm and explore",
  concise: "Short and sharp",
  detailed: "Detailed with examples",
  structured: "Structured output",
  conversational: "Conversational",
};

interface ConfirmationStepProps {
  answers: OnboardingAnswers;
  selectedPersona: Persona | null;
  isSubmitting: boolean;
  error: string | null;
  onComplete: () => void;
  onBack: () => void;
}

function ConfirmationStep({
  answers,
  selectedPersona,
  isSubmitting,
  error,
  onComplete,
  onBack,
}: ConfirmationStepProps) {
  const summaryItems = [
    { label: "Focus", value: answers.intent },
    { label: "Challenge", value: answers.challenge },
    { label: "Expectation", value: answers.expectation },
    { label: "Style", value: answers.communicationStyle },
  ];

  return (
    <div className="OnboardingConfirmation flex flex-col gap-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h2 className="heading-3 text-2xl font-bold">You&#39;re set.</h2>
        <p className="text-sm opacity-60">
          Here&#39;s what we know. You can update your preferences in Settings
          anytime.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-lavenderHaze-100/50 p-6 dark:bg-nightIndigo-900/50">
        {selectedPersona && (
          <div className="flex items-center gap-3 pb-4">
            {selectedPersona.heroImage && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={selectedPersona.heroImage}
                  alt={selectedPersona.label}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-bold">{selectedPersona.label}</span>
              <span className="text-sm opacity-60">Your Droplet partner</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {summaryItems.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span className="text-xxs font-semibold uppercase opacity-40">
                {item.label}
              </span>
              <span className="text-sm font-medium">
                {item.value ? (ANSWER_LABELS[item.value] ?? item.value) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm opacity-60 transition-opacity hover:opacity-100"
          disabled={isSubmitting}
        >
          <i className="bi bi-arrow-left mr-2" aria-hidden="true" />
          Back
        </button>

        <button
          type="button"
          onClick={onComplete}
          disabled={isSubmitting}
          className="btn btn-contained rounded-full px-8 py-3 text-sm font-bold transition-all"
        >
          {isSubmitting ? "Setting up..." : "Start your first conversation"}
        </button>
      </div>
    </div>
  );
}
