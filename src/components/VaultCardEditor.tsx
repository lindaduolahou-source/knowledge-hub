"use client";

import { ModuleShareCardLauncher } from "@/components/ModuleShareCardLauncher";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/zh";
import { moduleIntroKey } from "@/lib/module-content";
import { resolveModuleConfig } from "@/lib/module-layout";
import { isBuiltinModuleId } from "@/lib/modules";
import type { ShareCardFieldDef } from "@/lib/share-card";
import type { VaultCard } from "@/lib/share-card-vault";

interface VaultCardEditorProps {
  locale: Locale;
  dict: Dictionary;
  card: VaultCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  backLabel?: string;
  onBack?: () => void;
}

export function VaultCardEditor({
  locale,
  dict,
  card,
  open,
  onOpenChange,
  onSaved,
  backLabel,
  onBack,
}: VaultCardEditorProps) {
  const mod = resolveModuleConfig(card.moduleId);
  const titleDefault = isBuiltinModuleId(card.moduleId)
    ? dict.modules[card.moduleId].title
    : dict.home.newModuleTitle;
  const introDefault = isBuiltinModuleId(card.moduleId)
    ? dict.modules[card.moduleId].description
    : dict.home.newModuleDescription;

  const baseFields: ShareCardFieldDef[] = [
    {
      id: "intro",
      contentKey: moduleIntroKey(card.moduleId),
      label: dict.shareCard.fieldIntro,
      defaultText: introDefault,
    },
  ];

  return (
    <ModuleShareCardLauncher
      locale={locale}
      dict={dict}
      moduleId={card.moduleId}
      moduleIcon={card.moduleIcon || mod.icon}
      titleDefault={titleDefault}
      baseFields={baseFields}
      hideTrigger
      controlledOpen={open}
      onControlledOpenChange={onOpenChange}
      vaultCardId={card.id}
      onVaultSaved={onSaved}
      backLabel={backLabel}
      onBack={onBack}
    />
  );
}
