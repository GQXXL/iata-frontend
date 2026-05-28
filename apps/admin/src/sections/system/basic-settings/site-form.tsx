import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { JSONEditor } from "@workspace/ui/composed/editor/json";
import { EnhancedInput } from "@workspace/ui/composed/enhanced-input";
import { Icon } from "@workspace/ui/composed/icon";
import { UploadImage } from "@workspace/ui/composed/upload-image";
import {
  getSiteConfig,
  updateSiteConfig,
} from "@workspace/ui/services/admin/system";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

const siteSchema = z.object({
  site_logo: z.string().optional(),
  site_name: z.string().min(1),
  site_desc: z.string().optional(),
  keywords: z.string().optional(),
  custom_html: z.string().optional(),
  host: z.string().optional(),
  custom_data: z.any().optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface SiteCustomData {
  features?: {
    show_server_status_menu?: boolean;
  };
  [key: string]: unknown;
}

function parseCustomData(value: unknown): SiteCustomData {
  try {
    let parsed: unknown = value;
    for (let i = 0; i < 3; i++) {
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed || "{}");
        continue;
      }
      break;
    }
    if (parsed && typeof parsed === "object") return parsed as SiteCustomData;
    return {};
  } catch {
    return {};
  }
}

function stringifyCustomData(value: SiteCustomData): string {
  try {
    return JSON.stringify(value || {});
  } catch {
    return "{}";
  }
}

export default function SiteConfig() {
  const { t } = useTranslation("system");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showServerStatusMenu, setShowServerStatusMenu] = useState(true);

  const { data, refetch } = useQuery({
    queryKey: ["getSiteConfig"],
    queryFn: async () => {
      const { data } = await getSiteConfig();
      return data.data;
    },
    enabled: open,
  });

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      site_logo: "",
      site_name: "",
      site_desc: "",
      keywords: "",
      custom_html: "",
      host: "",
      custom_data: {},
    },
  });

  useEffect(() => {
    if (data) {
      form.reset(data);
      const parsed = parseCustomData(data.custom_data);
      setShowServerStatusMenu(
        parsed?.features?.show_server_status_menu !== false
      );
    }
  }, [data, form]);

  async function onSubmit(values: SiteFormData) {
    setLoading(true);
    try {
      const currentCustomData = parseCustomData(values.custom_data);
      const payloadCustomData: SiteCustomData = {
        ...currentCustomData,
        features: {
          ...(currentCustomData.features || {}),
          show_server_status_menu: showServerStatusMenu,
        },
      };

      const payload: API.SiteConfig = {
        ...(values as API.SiteConfig),
        custom_data: stringifyCustomData(payloadCustomData),
      };
      await updateSiteConfig(payload);
      toast.success(t("common.saveSuccess", "Save Successful"));
      refetch();
      setOpen(false);
    } catch (_error) {
      toast.error(t("common.saveFailed", "Save Failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <div className="flex cursor-pointer items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" icon="mdi:web" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {t("site.title", "Site Configuration")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t(
                  "site.description",
                  "Configure basic site information, logo, domain and other settings"
                )}
              </p>
            </div>
          </div>
          <Icon className="size-6" icon="mdi:chevron-right" />
        </div>
      </SheetTrigger>
      <SheetContent className="w-[600px] max-w-full md:max-w-screen-md">
        <SheetHeader>
          <SheetTitle>{t("site.title", "Site Configuration")}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-48px-36px-36px-24px-env(safe-area-inset-top))] px-6">
          <Form {...form}>
            <form
              className="space-y-2 pt-4"
              id="site-form"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="site_logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("site.logo", "Site Logo")}</FormLabel>
                    <FormControl>
                      <EnhancedInput
                        onValueChange={field.onChange}
                        placeholder={t(
                          "site.logoPlaceholder",
                          "Enter the URL of the logo, without ending with '/'"
                        )}
                        suffix={
                          <UploadImage
                            className="h-9 rounded-none border-none bg-muted px-2"
                            onChange={(value) => {
                              field.onChange(value);
                            }}
                          />
                        }
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "site.logoDescription",
                        "Used for displaying the logo in designated locations"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="site_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("site.siteName", "Site Name")}</FormLabel>
                    <FormControl>
                      <EnhancedInput
                        onValueChange={field.onChange}
                        placeholder={t(
                          "site.siteNamePlaceholder",
                          "Enter site name"
                        )}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "site.siteNameDescription",
                        "Used for displaying the site name in designated locations"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="site_desc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("site.siteDesc", "Site Description")}
                    </FormLabel>
                    <FormControl>
                      <EnhancedInput
                        onValueChange={field.onChange}
                        placeholder={t(
                          "site.siteDescPlaceholder",
                          "Enter site description"
                        )}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "site.siteDescDescription",
                        "Used for displaying the site description in designated locations"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("site.keywords", "Keywords")}</FormLabel>
                    <FormControl>
                      <EnhancedInput
                        onValueChange={field.onChange}
                        placeholder={t(
                          "site.keywordsPlaceholder",
                          "keyword1, keyword2, keyword3"
                        )}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("site.keywordsDescription", "Used for SEO purposes")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="custom_html"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("site.customHtml", "Custom HTML")}</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-32"
                        placeholder={t(
                          "site.customHtmlDescription",
                          "Custom HTML code to be injected into the bottom of the site's body tag"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "site.customHtmlDescription",
                        "Custom HTML code to be injected into the bottom of the site's body tag"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("site.siteDomain", "Site Domain")}</FormLabel>
                    <FormControl>
                      <Textarea
                        className="h-32"
                        placeholder={`${t("site.siteDomainPlaceholder", "Please enter the domain address. For multiple domains, please enter one per line.")}\nexample.com\nwww.example.com`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        "site.siteDomainDescription",
                        "Domain address of the current website, e.g., used in emails"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="custom_data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("site.customData", "Custom Data")}</FormLabel>
                    <FormControl>
                      <JSONEditor
                        onBlur={(value) => {
                          const editorData = parseCustomData(value);
                          const next: SiteCustomData = {
                            ...editorData,
                            features: {
                              ...(editorData.features || {}),
                            },
                          };
                          next.features = {
                            ...(next.features || {}),
                            show_server_status_menu: showServerStatusMenu,
                          };
                          field.onChange(stringifyCustomData(next));
                        }}
                        schema={{
                          type: "object",
                          additionalProperties: true,
                          properties: {
                            website: { type: "string", title: "Website" },
                            contacts: {
                              type: "object",
                              title: "Contacts",
                              additionalProperties: true,
                              properties: {
                                email: { type: "string", title: "Email" },
                                telephone: {
                                  type: "string",
                                  title: "Telephone",
                                },
                                address: { type: "string", title: "Address" },
                              },
                            },
                            community: {
                              type: "object",
                              title: "Community",
                              additionalProperties: true,
                              properties: {
                                telegram: { type: "string", title: "Telegram" },
                                twitter: { type: "string", title: "Twitter" },
                                discord: { type: "string", title: "Discord" },
                                instagram: {
                                  type: "string",
                                  title: "Instagram",
                                },
                                linkedin: { type: "string", title: "Linkedin" },
                                facebook: { type: "string", title: "Facebook" },
                                github: { type: "string", title: "Github" },
                              },
                            },
                          },
                        }}
                        value={field.value}
                      />
                    </FormControl>
                    <div className="mt-3 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">
                            {t(
                              "site.showServerStatusMenu",
                              "Show User Node Status Menu"
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {t(
                              "site.showServerStatusMenuDescription",
                              "Control whether the user-side 'Node Status' menu is displayed"
                            )}
                          </p>
                        </div>
                        <Switch
                          checked={showServerStatusMenu}
                          onCheckedChange={(checked) => {
                            setShowServerStatusMenu(checked);
                            const current = parseCustomData(field.value);
                            const next = {
                              ...current,
                              features: {
                                ...(current.features || {}),
                                show_server_status_menu: checked,
                              },
                            };
                            field.onChange(stringifyCustomData(next));
                          }}
                        />
                      </div>
                    </div>
                    <FormDescription>
                      {t(
                        "site.customDataDescription",
                        "Custom data for website customization"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        <SheetFooter className="flex-row justify-end gap-2 pt-3">
          <Button
            disabled={loading}
            onClick={() => setOpen(false)}
            variant="outline"
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button disabled={loading} form="site-form" type="submit">
            {loading && (
              <Icon className="mr-2 animate-spin" icon="mdi:loading" />
            )}
            {t("common.save", "Save Settings")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
