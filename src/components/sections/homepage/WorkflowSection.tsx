import PublicSection from "@/components/public/PublicSection";
import {
  getDefaultLandingContent,
  LandingHowItWorksStep,
  LandingWorkflowCopy,
} from "@/constants/landing-data";

interface WorkflowSectionProps {
  id: string;
  howItWorksSteps?: LandingHowItWorksStep[];
  workflowCopy?: LandingWorkflowCopy;
}

export default function WorkflowSection({
  id,
  howItWorksSteps = getDefaultLandingContent().howItWorksSteps,
  workflowCopy = getDefaultLandingContent().workflow,
}: WorkflowSectionProps) {
  return (
    <PublicSection
      id={id}
      sectionClass="workflow-section"
      wrapperClass="workflow-wrapper"
    >
      <div className="content-card">
        <p className="eyebrow">{workflowCopy.eyebrow}</p>
        <h2 className="heading-4 mt-3 leading-tight">{workflowCopy.title}</h2>
        <p className="body-2 mt-4 max-w-2xl text-sm md:text-base">
          {workflowCopy.description}
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {howItWorksSteps.map((step) => (
            <article key={step.step} className="workflow-article">
              <div className="flex items-start gap-4">
                <span className="workflow-article-step heading-5">
                  {step.step}
                </span>
                <div>
                  <h3 className="heading-6">{step.title}</h3>
                  <p className="body-2 mt-2 text-sm">{step.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="content-card">
        <p className="eyebrow">{workflowCopy.rhythmEyebrow}</p>
        <div className="mt-5 flex flex-col gap-4">
          {workflowCopy.rhythmCards.map((card, index) => (
            <article
              key={`${card.label}-${index}`}
              className="workflow-article"
            >
              <p className="eyebrow">{card.label}</p>
              <p className="body-2 mt-2 text-sm">{card.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </PublicSection>
  );
}
