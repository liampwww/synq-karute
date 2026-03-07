"use client";

import { type FormEvent, type KeyboardEvent, useCallback, useState } from "react";
import { X } from "lucide-react";

import type { Tables } from "@/types/database";
import { useI18n } from "@/lib/i18n/context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface CustomerFormData {
  name: string;
  name_kana: string;
  phone: string;
  email: string;
  notes: string;
  tags: string[];
}

interface CustomerFormProps {
  initialData?: Tables<"customers">;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
}

export function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const { t } = useI18n();

  const [name, setName] = useState(initialData?.name ?? "");
  const [nameKana, setNameKana] = useState(initialData?.name_kana ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [nameError, setNameError] = useState(false);

  const handleAddTag = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const value = tagInput.trim();
      if (value && !tags.includes(value)) {
        setTags((prev) => [...prev, value]);
      }
      setTagInput("");
    },
    [tagInput, tags]
  );

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setNameError(true);
        return;
      }

      setNameError(false);
      onSubmit({
        name: name.trim(),
        name_kana: nameKana.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        tags,
      });
    },
    [name, nameKana, phone, email, notes, tags, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-name">{t("customers.name")}</Label>
        <Input
          id="customer-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError(false);
          }}
          aria-invalid={nameError || undefined}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-name-kana">{t("customers.nameKana")}</Label>
        <Input
          id="customer-name-kana"
          value={nameKana}
          onChange={(e) => setNameKana(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-phone">{t("customers.phone")}</Label>
          <Input
            id="customer-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-email">{t("customers.email")}</Label>
          <Input
            id="customer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-tags">{t("customers.tags")}</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="rounded-full p-0.5 transition-colors hover:bg-foreground/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          id="customer-tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Enter to add"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-notes">{t("customers.notes")}</Label>
        <Textarea
          id="customer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit">{t("common.save")}</Button>
      </div>
    </form>
  );
}
