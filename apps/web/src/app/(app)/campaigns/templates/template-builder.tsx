"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";
import { extractVariables, TemplatePreview } from "./template-preview";

type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

interface ButtonDraft {
  type: ButtonType;
  text: string;
  url: string;
  phoneNumber: string;
}

const EMPTY_BUTTON: ButtonDraft = { type: "QUICK_REPLY", text: "", url: "", phoneNumber: "" };

export function TemplateBuilder({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [category, setCategory] = useState("marketing");
  const [headerFormat, setHeaderFormat] = useState<"NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT">("NONE");
  const [headerText, setHeaderText] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<ButtonDraft[]>([]);

  const variables = extractVariables(body);

  const save = useMutation({
    mutationFn: () =>
      api.post("/templates", {
        name: name.trim().toLowerCase().replace(/\s+/g, "_"),
        language,
        category,
        components: {
          ...(headerFormat !== "NONE" && {
            header: {
              format: headerFormat,
              ...(headerFormat === "TEXT" && { text: headerText }),
            },
          }),
          body: {
            text: body,
            // Meta requires one sample value per placeholder at review time.
            examples: variables.map((n) => `Sample ${n}`),
          },
          ...(footer.trim() && { footer: { text: footer.trim() } }),
          ...(buttons.length > 0 && {
            buttons: buttons.map((button) =>
              button.type === "URL"
                ? { type: "URL", text: button.text, url: button.url }
                : button.type === "PHONE_NUMBER"
                  ? { type: "PHONE_NUMBER", text: button.text, phoneNumber: button.phoneNumber }
                  : { type: "QUICK_REPLY", text: button.text },
            ),
          }),
        },
      }),
    onSuccess: () => {
      toast.success("Template saved as a draft");
      reset();
      onSaved();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : "Could not save the template",
      ),
  });

  const reset = () => {
    setName("");
    setLanguage("en");
    setCategory("marketing");
    setHeaderFormat("NONE");
    setHeaderText("");
    setBody("");
    setFooter("");
    setButtons([]);
  };

  const updateButton = (index: number, patch: Partial<ButtonDraft>) =>
    setButtons((current) =>
      current.map((button, i) => (i === index ? { ...button, ...patch } : button)),
    );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1 bg-black/40" />

      <aside className="flex h-full w-full max-w-3xl flex-col border-l bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-bold">New template</h2>
            <p className="text-sm text-muted-foreground">
              Saved as a draft. Submit it to Meta when you&apos;re ready for review.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="grid flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-2">
            <div className="space-y-5">
              <Field
                label="Template name"
                required
                hint="Lowercase letters, numbers and underscores only."
              >
                {({ id }) => (
                  <Input
                    id={id}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="order_confirmation"
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" required>
                  {({ id }) => (
                    <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="marketing">Marketing</option>
                      <option value="utility">Utility</option>
                      <option value="authentication">Authentication</option>
                    </Select>
                  )}
                </Field>

                <Field label="Language" required>
                  {({ id }) => (
                    <Select id={id} value={language} onChange={(e) => setLanguage(e.target.value)}>
                      <option value="en">English</option>
                      <option value="en_US">English (US)</option>
                      <option value="hi">Hindi</option>
                      <option value="mr">Marathi</option>
                      <option value="gu">Gujarati</option>
                      <option value="ta">Tamil</option>
                      <option value="te">Telugu</option>
                      <option value="bn">Bengali</option>
                    </Select>
                  )}
                </Field>
              </div>

              <Field label="Header">
                {({ id }) => (
                  <Select
                    id={id}
                    value={headerFormat}
                    onChange={(e) => setHeaderFormat(e.target.value as typeof headerFormat)}
                  >
                    <option value="NONE">None</option>
                    <option value="TEXT">Text</option>
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                    <option value="DOCUMENT">Document</option>
                  </Select>
                )}
              </Field>

              {headerFormat === "TEXT" && (
                <Field label="Header text">
                  {({ id }) => (
                    <Input
                      id={id}
                      maxLength={60}
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder="Your order is confirmed"
                    />
                  )}
                </Field>
              )}

              <Field
                label="Body"
                required
                hint="Use {{1}}, {{2}} for values filled in at send time."
              >
                {({ id }) => (
                  <Textarea
                    id={id}
                    required
                    maxLength={1024}
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Hi {{1}}, your order {{2}} has been shipped."
                  />
                )}
              </Field>

              {variables.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Detected {variables.length}{" "}
                  {variables.length === 1 ? "variable" : "variables"}:{" "}
                  {variables.map((v) => `{{${v}}}`).join(", ")}
                </p>
              )}

              <Field label="Footer">
                {({ id }) => (
                  <Input
                    id={id}
                    maxLength={60}
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="Reply STOP to opt out"
                  />
                )}
              </Field>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Buttons</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={buttons.length >= 10}
                    onClick={() => setButtons((current) => [...current, { ...EMPTY_BUTTON }])}
                  >
                    <Plus size={14} />
                    Add button
                  </Button>
                </div>

                {buttons.map((button, index) => (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="flex gap-2">
                      <Select
                        className="w-40"
                        value={button.type}
                        onChange={(e) => updateButton(index, { type: e.target.value as ButtonType })}
                      >
                        <option value="QUICK_REPLY">Quick reply</option>
                        <option value="URL">Visit website</option>
                        <option value="PHONE_NUMBER">Call phone</option>
                      </Select>
                      <Input
                        maxLength={25}
                        placeholder="Button text"
                        value={button.text}
                        onChange={(e) => updateButton(index, { text: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove button"
                        onClick={() =>
                          setButtons((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>

                    {button.type === "URL" && (
                      <Input
                        type="url"
                        placeholder="https://example.com/orders"
                        value={button.url}
                        onChange={(e) => updateButton(index, { url: e.target.value })}
                      />
                    )}
                    {button.type === "PHONE_NUMBER" && (
                      <Input
                        placeholder="+919266806659"
                        value={button.phoneNumber}
                        onChange={(e) => updateButton(index, { phoneNumber: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:sticky lg:top-0 lg:self-start">
              <p className="mb-2 text-sm font-medium">Preview</p>
              <TemplatePreview
                draft={{
                  ...(headerFormat !== "NONE" && {
                    header: { format: headerFormat, text: headerText },
                  }),
                  body,
                  footer: footer || undefined,
                  buttons: buttons.map((b) => ({ type: b.type, text: b.text })),
                }}
              />
            </div>
          </div>

          <footer className="flex gap-3 border-t p-5">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={save.isPending}>
              Save draft
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
