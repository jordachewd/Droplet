import { featureCards } from "@/constants/landing-data";
import classNames from "classnames";

export default function FeaturesSection() {
  return (
    <section className="Features mx-auto grid w-full max-w-screen-2xl gap-4 px-4 lg:grid-cols-3">
      {featureCards.map((card) => (
        <article
          key={card.title}
          className={classNames(
            "rounded-2xl px-6 py-8 shadow-sm bg-lavenderHaze-100/78 dark:bg-nightIndigo-900/82",
          )}
        >
          <div className="inline-flex rounded-full bg-lavenderHaze-100 px-3 py-2 text-lg dark:bg-nightIndigo-900/50">
            <i className={card.icon} aria-hidden="true"></i>
          </div>
          <h2 className="heading-5 mt-5">{card.title}</h2>
          <p className="body-2 mt-3 text-sm md:text-base">{card.description}</p>
        </article>
      ))}
    </section>
  );
}
