import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { MarkdownEditor } from "@workspace/ui/composed/editor/markdown";
import {
  ProTable,
  type ProTableActions,
} from "@workspace/ui/composed/pro-table/pro-table";
import {
  getTutorialDetail,
  getTutorialList,
  updateTutorial,
} from "@workspace/ui/services/admin/tutorial";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function TutorialPage() {
  const { t } = useTranslation("document");
  const ref = useRef<ProTableActions>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<API.GetTutorialDetailResponse | null>(
    null
  );

  const loadDetail = useMutation({
    mutationFn: async (path: string) => {
      const { data } = await getTutorialDetail({ path });
      return data.data;
    },
    onSuccess: (data) => {
      if (!data) return;
      setCurrent(data);
      setOpen(true);
    },
    onError: () => {
      toast.error(t("error", "Error"));
    },
  });

  return (
    <>
      <ProTable<
        API.TutorialItem,
        { lang: string; group: string; search: string }
      >
        action={ref}
        actions={{
          render(row) {
            return [
              <Button
                key="edit"
                onClick={() => loadDetail.mutate(row.path)}
                variant="default"
              >
                {t("edit", "Edit")}
              </Button>,
            ];
          },
        }}
        columns={[
          {
            accessorKey: "show",
            header: t("show", "Show"),
            cell: ({ row }) => (
              <Switch
                checked={!!row.original.show}
                onCheckedChange={async (checked) => {
                  await updateTutorial({
                    path: row.original.path,
                    show: checked,
                  });
                  toast.success(t("updateSuccess", "Updated successfully"));
                  ref.current?.refresh();
                }}
              />
            ),
          },
          {
            accessorKey: "title",
            header: t("title", "Title"),
          },
          {
            accessorKey: "lang",
            header: t("language", "Language"),
          },
          {
            accessorKey: "group",
            header: t("group", "Group"),
          },
          {
            accessorKey: "path",
            header: t("path", "Path"),
          },
        ]}
        header={{
          title: t("Tutorial Management", "Tutorial Management"),
        }}
        params={[
          {
            key: "search",
            placeholder: t("search", "Search"),
          },
          {
            key: "lang",
            placeholder: t("language", "Language"),
          },
          {
            key: "group",
            placeholder: t("group", "Group"),
          },
        ]}
        request={async (pagination, filter) => {
          const { data } = await getTutorialList();
          let list = data.data?.list || [];
          if (filter.lang) {
            const kw = filter.lang.toLowerCase();
            list = list.filter((v) => v.lang.toLowerCase().includes(kw));
          }
          if (filter.group) {
            const kw = filter.group.toLowerCase();
            list = list.filter((v) => v.group.toLowerCase().includes(kw));
          }
          if (filter.search) {
            const kw = filter.search.toLowerCase();
            list = list.filter(
              (v) =>
                v.title.toLowerCase().includes(kw) ||
                v.path.toLowerCase().includes(kw)
            );
          }

          const page = Number(pagination?.page || 1);
          const size = Number(pagination?.size || 10);
          const start = (page - 1) * size;
          const end = start + size;
          const pageList = list.slice(start, end);

          return { list: pageList, total: list.length };
        }}
      />

      <Sheet onOpenChange={setOpen} open={open}>
        <SheetContent className="w-[80vw] max-w-[80vw]">
          <SheetHeader>
            <SheetTitle>
              {current?.title || ""} ({current?.lang || ""})
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-[calc(100vh-180px)] overflow-auto">
            <MarkdownEditor
              onChange={(value) => {
                setCurrent((prev) =>
                  prev ? { ...prev, content: value || "" } : prev
                );
              }}
              value={current?.content || ""}
            />
          </div>
          <SheetFooter className="pt-4">
            <Button onClick={() => setOpen(false)} variant="outline">
              {t("cancel", "Cancel")}
            </Button>
            <Button
              disabled={saving || !current}
              onClick={async () => {
                if (!current) return;
                setSaving(true);
                try {
                  await updateTutorial({
                    path: current.path,
                    content: current.content,
                    show: current.show,
                  });
                  toast.success(t("updateSuccess", "Updated successfully"));
                  setOpen(false);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {t("confirm", "Confirm")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
