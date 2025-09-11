import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TaskImageUploadProps {
  onImagesChange: (images: File[]) => void;
  existingImages?: string[];
  maxImages?: number;
}

const TaskImageUpload: React.FC<TaskImageUploadProps> = ({
  onImagesChange,
  existingImages = [],
  maxImages = 5
}) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Check file types
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: `${file.name} is not a valid image file`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (selectedImages.length + validFiles.length > maxImages) {
      toast({
        title: "Too Many Images",
        description: `You can only upload up to ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    // Create preview URLs
    const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
    
    const updatedImages = [...selectedImages, ...validFiles];
    const updatedPreviews = [...previewUrls, ...newPreviewUrls];
    
    setSelectedImages(updatedImages);
    setPreviewUrls(updatedPreviews);
    onImagesChange(updatedImages);
  };

  const removeImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    
    // Clean up URL object
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(updatedImages);
    setPreviewUrls(updatedPreviews);
    onImagesChange(updatedImages);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Attachments</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={triggerFileInput}
          disabled={selectedImages.length >= maxImages}
          className="border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Images
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">Existing attachments:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {existingImages.map((url, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-2">
                  <div className="relative aspect-square">
                    <img
                      src={url}
                      alt={`Existing attachment ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">New attachments:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {previewUrls.map((url, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-2">
                  <div className="relative aspect-square">
                    <img
                      src={url}
                      alt={`Selected image ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {selectedImages[index]?.name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {selectedImages.length === 0 && existingImages.length === 0 && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            No images attached yet. Click "Upload Images" to add attachments.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        You can upload up to {maxImages} images. Supported formats: JPG, PNG, GIF, WebP
      </p>
    </div>
  );
};

export default TaskImageUpload;
