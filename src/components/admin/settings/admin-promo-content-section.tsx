"use client";

import { updateAdminSettingAction } from "@/lib/actions/admin.actions";
import { AdminFormSubmitButton } from "@/components/admin/admin-form-submit-button";
import { AdminManagedForm } from "@/components/admin/admin-managed-form";
import { PromoContentSettingsFormValue } from "@/components/admin/settings/types";

interface AdminPromoContentSectionProps {
  promoContentValue: PromoContentSettingsFormValue;
}

export function AdminPromoContentSection({
  promoContentValue,
}: AdminPromoContentSectionProps) {
  return (
    <AdminManagedForm
      action={updateAdminSettingAction}
      className="AdminPromoContentSection admin-form-surface"
    >
      <input type="hidden" name="key" value="admin.promoContent" />
      <input type="hidden" name="category" value="features" />

      <h2 className="heading-6">Promo Content</h2>
      <p className="admin-muted-text">
        Configure upgrade, suspension, and plan promo messaging used across the
        app shell, profile, personas, and end-of-conversation actions.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Pro Promo Title</span>
          <input
            type="text"
            name="promoTitlePro"
            defaultValue={promoContentValue.promoTitlePro}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Premium Promo Title</span>
          <input
            type="text"
            name="promoTitlePremium"
            defaultValue={promoContentValue.promoTitlePremium}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Pro Promo Description</span>
          <textarea
            name="promoDescriptionPro"
            defaultValue={promoContentValue.promoDescriptionPro}
            rows={3}
            required
            aria-required="true"
            className="form-textarea-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Premium Promo Description</span>
          <textarea
            name="promoDescriptionPremium"
            defaultValue={promoContentValue.promoDescriptionPremium}
            rows={3}
            required
            aria-required="true"
            className="form-textarea-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Upgrade CTA Label</span>
          <input
            type="text"
            name="promoUpgradeCta"
            defaultValue={promoContentValue.promoUpgradeCta}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Contact Support CTA Label</span>
          <input
            type="text"
            name="promoContactSupportCta"
            defaultValue={promoContentValue.promoContactSupportCta}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Admin Label</span>
          <input
            type="text"
            name="promoAdminLabel"
            defaultValue={promoContentValue.promoAdminLabel}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Admin Description</span>
          <input
            type="text"
            name="promoAdminDescription"
            defaultValue={promoContentValue.promoAdminDescription}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Suspension Title</span>
          <input
            type="text"
            name="promoSuspensionTitle"
            defaultValue={promoContentValue.promoSuspensionTitle}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Suspension Description</span>
          <input
            type="text"
            name="promoSuspensionDescription"
            defaultValue={promoContentValue.promoSuspensionDescription}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Free Plan Badge Label</span>
          <input
            type="text"
            name="promoFreeLabel"
            defaultValue={promoContentValue.promoFreeLabel}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Current Plan Badge Label</span>
          <input
            type="text"
            name="promoCurrentPlanLabel"
            defaultValue={promoContentValue.promoCurrentPlanLabel}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <label className="form-field">
        <span className="font-medium">Generic Upgrade Message</span>
        <textarea
          name="promoUpgradeMessage"
          defaultValue={promoContentValue.promoUpgradeMessage}
          rows={3}
          required
          aria-required="true"
          className="form-textarea-input"
        />
      </label>

      <label className="form-field">
        <span className="font-medium">Trial Persona Message</span>
        <textarea
          name="promoTrialLabel"
          defaultValue={promoContentValue.promoTrialLabel}
          rows={3}
          required
          aria-required="true"
          className="form-textarea-input"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">
            Persona Upgrade Template (use {"{plan}"})
          </span>
          <textarea
            name="promoPersonaUpgrade"
            defaultValue={promoContentValue.promoPersonaUpgrade}
            rows={3}
            required
            aria-required="true"
            className="form-textarea-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Persona Upgrade Fallback</span>
          <textarea
            name="promoPersonaUpgradeFallback"
            defaultValue={promoContentValue.promoPersonaUpgradeFallback}
            rows={3}
            required
            aria-required="true"
            className="form-textarea-input"
          />
        </label>
      </div>

      <h3 className="heading-6 text-base">Conversation End Messaging</h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">End Notice Label</span>
          <input
            type="text"
            name="chatConversationEndedLabel"
            defaultValue={promoContentValue.chatConversationEndedLabel}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Start New Conversation CTA</span>
          <input
            type="text"
            name="chatStartConversationCta"
            defaultValue={promoContentValue.chatStartConversationCta}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Upgrade Plan CTA</span>
          <input
            type="text"
            name="chatUpgradePlanCta"
            defaultValue={promoContentValue.chatUpgradePlanCta}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Contact Support CTA</span>
          <input
            type="text"
            name="chatContactSupportCta"
            defaultValue={promoContentValue.chatContactSupportCta}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <h3 className="heading-6 text-base">Chat Intro And Plans Labels</h3>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Chat Intro Subheading</span>
          <input
            type="text"
            name="chatIntroSubheading"
            defaultValue={promoContentValue.chatIntroSubheading}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Chat Input Placeholder</span>
          <input
            type="text"
            name="chatInputPlaceholder"
            defaultValue={promoContentValue.chatInputPlaceholder}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="form-field">
          <span className="font-medium">Plans Subscribe CTA</span>
          <input
            type="text"
            name="plansSubscribeCta"
            defaultValue={promoContentValue.plansSubscribeCta}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>

        <label className="form-field">
          <span className="font-medium">Plan Popular Badge</span>
          <input
            type="text"
            name="planPopularBadge"
            defaultValue={promoContentValue.planPopularBadge}
            required
            aria-required="true"
            className="form-text-input"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <AdminFormSubmitButton
          label="Save Promo Content"
          pendingLabel="Saving promo content..."
        />
      </div>
    </AdminManagedForm>
  );
}
