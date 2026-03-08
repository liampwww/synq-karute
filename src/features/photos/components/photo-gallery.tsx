"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Plus,
  X,
  Loader2,
  Image as ImageIcon,
  Maximize2,
} from "lucide-react";

import type { Tables, PhotoType } from "@/types/database";
import { useAuthStore } from "@/stores/auth-store";
import {
  getCustomerPhotos,
  uploadCustomerPhoto,
  deleteCustomerPhoto,
  getPhotoSignedUrl,
} from "@/features/photos/api";
import { createTimelineEvent } from "@/features/timeline/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: "ビフォー",
  after: "アフター",
  progress: "経過",
  general: "一般",
  form: "フォーム",
};

interface PhotoGalleryProps {
  customerId: string;
  onPhotoAdded?: () => void;
}

export function PhotoGallery({ customerId, onPhotoAdded }: PhotoGalleryProps) {
  const organization = useAuthStore((s) => s.organization);
  const staff = useAuthStore((s) => s.staff);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Tables<"customer_photos">[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<PhotoType>("general");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerPhotos(customerId);
      setPhotos(data);
      const urls = new Map<string, string>();
      await Promise.all(
        data.map(async (p) => {
          try {
            const url = await getPhotoSignedUrl(p.storage_path);
            urls.set(p.id, url);
          } catch {
            // skip
          }
        })
      );
      setPhotoUrls(urls);
    } catch {
      toast.error("写真の読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !organization) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const photo = await uploadCustomerPhoto(
          file,
          customerId,
          organization.id,
          { photoType: selectedType }
        );

        await createTimelineEvent({
          customer_id: customerId,
          org_id: organization.id,
          staff_id: staff?.id ?? null,
          event_type: "photo",
          source: "manual",
          title: `写真を追加 (${PHOTO_TYPE_LABELS[selectedType]})`,
          description: null,
          structured_data: {
            photo_count: 1,
            photo_type: selectedType,
          } as unknown as Tables<"timeline_events">["structured_data"],
          event_date: new Date().toISOString(),
        });

        const url = await getPhotoSignedUrl(photo.storage_path);
        setPhotoUrls((prev) => new Map(prev).set(photo.id, url));
      }

      toast.success(`${files.length}枚の写真をアップロードしました`);
      fetchPhotos();
      onPhotoAdded?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "アップロードに失敗しました"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (photo: Tables<"customer_photos">) => {
    try {
      await deleteCustomerPhoto(photo.id, photo.storage_path);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast.success("写真を削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  };

  const openLightbox = (photoId: string, caption: string | null) => {
    const url = photoUrls.get(photoId);
    if (url) {
      setLightboxUrl(url);
      setLightboxCaption(caption);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-lg bg-muted/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">写真ギャラリー</span>
          <Badge variant="secondary" className="text-xs">
            {photos.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as PhotoType)}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PHOTO_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" data-icon="inline-start" />
            )}
            {isUploading ? "アップロード中..." : "写真追加"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <ImageIcon className="size-8 opacity-30" />
          <p className="text-xs">写真がまだありません</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="size-3.5" data-icon="inline-start" />
            最初の写真を追加
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((photo) => {
            const url = photoUrls.get(photo.id);
            return (
              <div key={photo.id} className="group relative aspect-square">
                {url ? (
                  <img
                    src={url}
                    alt={photo.caption || "customer photo"}
                    className="size-full rounded-lg object-cover cursor-pointer transition-opacity group-hover:opacity-80"
                    onClick={() => openLightbox(photo.id, photo.caption)}
                  />
                ) : (
                  <div className="size-full rounded-lg bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="size-6 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                <Badge
                  variant="secondary"
                  className="absolute bottom-1 left-1 text-[9px] px-1 py-0 opacity-80"
                >
                  {PHOTO_TYPE_LABELS[photo.photo_type as PhotoType] ?? photo.photo_type}
                </Badge>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openLightbox(photo.id, photo.caption)}
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <Maximize2 className="size-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(photo)}
                    className="rounded-full bg-black/50 p-1 text-white hover:bg-red-500"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>写真プレビュー</DialogTitle>
          </DialogHeader>
          {lightboxUrl && (
            <div className="space-y-2">
              <img
                src={lightboxUrl}
                alt={lightboxCaption || "photo"}
                className="w-full rounded-lg object-contain max-h-[70vh]"
              />
              {lightboxCaption && (
                <p className="text-sm text-center text-muted-foreground">
                  {lightboxCaption}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
