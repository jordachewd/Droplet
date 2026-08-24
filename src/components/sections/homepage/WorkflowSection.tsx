import ContentCard from "@/components/layout/ContentCard";
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
      <ContentCard
        eyebrow={workflowCopy.eyebrow}
        title={workflowCopy.title}
        description={workflowCopy.description}
      >
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
      </ContentCard>

      <ContentCard eyebrow={workflowCopy.rhythmEyebrow}>
        <div className="mt-5 flex flex-col gap-4">
          {workflowCopy.rhythmCards.map((card, index) => (
            <article
              key={`${card.label}-${index}`}
              className="workflow-article"
            >
              <p className="card-eyebrow">{card.label}</p>
              <p className="body-2 mt-2 text-sm">{card.detail}</p>
            </article>
          ))}
        </div>
      </ContentCard>
    </PublicSection>
  );
}
